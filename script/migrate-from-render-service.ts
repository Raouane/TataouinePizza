/**
 * Script de migration à exécuter DEPUIS Render
 * Ce script utilise l'URL interne de Render (accessible depuis les services Render)
 * et migre vers Supabase
 * 
 * Usage sur Render:
 * 1. Créer un service "One-off" ou utiliser un service temporaire
 * 2. Définir DATABASE_URL (Supabase) dans les variables d'environnement
 * 3. Exécuter: npm run script:migrate-from-render-service
 */

import "dotenv/config";
import { Pool } from "pg";
import dns from "dns";

dns.setDefaultResultOrder('ipv4first');

// Sur Render, DATABASE_URL pointe vers Render, on doit utiliser une variable différente
const RENDER_DB_URL = process.env.DATABASE_URL; // URL Render (interne)
const SUPABASE_DB_URL = process.env.SUPABASE_DATABASE_URL; // URL Supabase

if (!RENDER_DB_URL) {
  console.error("❌ DATABASE_URL (Render) n'est pas défini");
  process.exit(1);
}

if (!SUPABASE_DB_URL) {
  console.error("❌ SUPABASE_DATABASE_URL n'est pas défini");
  console.error("💡 Définissez SUPABASE_DATABASE_URL dans Render avec l'URL Supabase complète");
  process.exit(1);
}

// Configurer SSL pour Supabase
const supabasePoolConfig: any = {
  connectionString: SUPABASE_DB_URL,
};

if (SUPABASE_DB_URL.includes('supabase')) {
  supabasePoolConfig.ssl = { rejectUnauthorized: false };
}

// Créer les pools
const renderPool = new Pool({ connectionString: RENDER_DB_URL });
const supabasePool = new Pool(supabasePoolConfig);

const TABLES = [
  'admin_users',
  'restaurants',
  'drivers',
  'pizzas',
  'pizza_prices',
  'customers',
  'orders',
  'order_items',
  'otp_codes',
  'idempotency_keys',
  'telegram_messages',
  'cash_handovers'
];

const BATCH_SIZE = 500;

async function testConnection(pool: Pool, name: string): Promise<boolean> {
  try {
    const result = await pool.query("SELECT 1 as test, version() as version");
    const version = result.rows[0]?.version || 'unknown';
    console.log(`   ✅ Connexion à ${name} OK`);
    console.log(`   📊 Version PostgreSQL: ${version.split(' ')[0]} ${version.split(' ')[1]}`);
    return true;
  } catch (error: any) {
    console.error(`   ❌ Erreur de connexion à ${name}:`, error.message);
    return false;
  }
}

async function resetSequences(tableName: string, idColumn: string = 'id') {
  try {
    const maxResult = await supabasePool.query(`SELECT MAX(${idColumn}) as max_id FROM ${tableName}`);
    const maxId = maxResult.rows[0]?.max_id;
    if (!maxId) return;
    
    const columnInfo = await supabasePool.query(`
      SELECT data_type 
      FROM information_schema.columns 
      WHERE table_name = $1 AND column_name = $2
    `, [tableName, idColumn]);
    
    if (columnInfo.rows[0]?.data_type === 'integer' || columnInfo.rows[0]?.data_type === 'bigint') {
      const sequenceName = `${tableName}_${idColumn}_seq`;
      await supabasePool.query(`SELECT setval('${sequenceName}', (SELECT MAX(${idColumn}) FROM ${tableName}), true)`);
      console.log(`   🔄 Séquence ${sequenceName} réinitialisée à ${maxId}`);
    }
  } catch (error: any) {
    if (!error.message.includes('does not exist')) {
      console.log(`   ⚠️  Impossible de réinitialiser la séquence pour ${tableName}: ${error.message}`);
    }
  }
}

async function migrateTable(tableName: string) {
  console.log(`\n📦 Migration de la table: ${tableName}`);
  
  try {
    const result = await renderPool.query(`SELECT * FROM ${tableName} ORDER BY id`);
    const rows = result.rows;
    
    if (rows.length === 0) {
      console.log(`   ⏭️  Table ${tableName} est vide, skip`);
      return { migrated: 0, skipped: 0 };
    }
    
    console.log(`   📥 ${rows.length} lignes à migrer`);
    
    const tableExists = await supabasePool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = $1
      )
    `, [tableName]);
    
    if (!tableExists.rows[0].exists) {
      console.log(`   ⚠️  Table ${tableName} n'existe pas dans Supabase, skip`);
      return { migrated: 0, skipped: rows.length };
    }
    
    let migrated = 0;
    let skipped = 0;
    const totalBatches = Math.ceil(rows.length / BATCH_SIZE);
    
    for (let i = 0; i < rows.length; i += BATCH_SIZE) {
      const batch = rows.slice(i, i + BATCH_SIZE);
      const batchNum = Math.floor(i / BATCH_SIZE) + 1;
      
      for (const row of batch) {
        try {
          const columns = Object.keys(row).filter(key => row[key] !== undefined && row[key] !== null);
          const values = columns.map((_, idx) => `$${idx + 1}`);
          const valuesArray = columns.map(col => row[col]);
          
          const insertQuery = `
            INSERT INTO ${tableName} (${columns.join(', ')})
            VALUES (${values.join(', ')})
            ON CONFLICT DO NOTHING
          `;
          
          await supabasePool.query(insertQuery, valuesArray);
          migrated++;
        } catch (error: any) {
          if (error.code === '23505') {
            skipped++;
          } else {
            console.error(`   ❌ Erreur lors de l'insertion:`, error.message);
            skipped++;
          }
        }
      }
      
      if (totalBatches > 1) {
        const progress = Math.round((batchNum / totalBatches) * 100);
        console.log(`   📊 Progression: ${progress}% (batch ${batchNum}/${totalBatches})`);
      }
    }
    
    await resetSequences(tableName);
    
    console.log(`   ✅ ${migrated} lignes migrées, ${skipped} ignorées (doublons)`);
    return { migrated, skipped };
    
  } catch (error: any) {
    console.error(`   ❌ Erreur lors de la migration de ${tableName}:`, error.message);
    return { migrated: 0, skipped: 0 };
  }
}

async function migrateAll() {
  console.log("========================================");
  console.log("🚀 MIGRATION DEPUIS RENDER VERS SUPABASE");
  console.log("========================================");
  console.log(`📥 Source: Render PostgreSQL (URL interne)`);
  console.log(`📤 Destination: Supabase`);
  
  try {
    console.log("\n🔍 Test des connexions...");
    const renderConnected = await testConnection(renderPool, "Render");
    if (!renderConnected) throw new Error("Impossible de se connecter à Render");
    
    const supabaseConnected = await testConnection(supabasePool, "Supabase");
    if (!supabaseConnected) throw new Error("Impossible de se connecter à Supabase");
    
    console.log(`\n📋 Tables à migrer (${TABLES.length}):`);
    for (const table of TABLES) {
      try {
        const count = await renderPool.query(`SELECT COUNT(*) as count FROM ${table}`);
        const rowCount = parseInt(count.rows[0]?.count || "0");
        console.log(`   - ${table}: ${rowCount} lignes`);
      } catch (e) {
        console.log(`   - ${table}: table inexistante`);
      }
    }
    
    console.log(`\n⚠️  La migration va commencer dans 3 secondes...`);
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    let totalMigrated = 0;
    let totalSkipped = 0;
    const startTime = Date.now();
    
    for (const table of TABLES) {
      const result = await migrateTable(table);
      totalMigrated += result.migrated;
      totalSkipped += result.skipped;
    }
    
    const duration = Math.round((Date.now() - startTime) / 1000);
    
    console.log("\n========================================");
    console.log("✨ MIGRATION TERMINÉE");
    console.log("========================================");
    console.log(`✅ Total migré: ${totalMigrated} lignes`);
    console.log(`⏭️  Total ignoré: ${totalSkipped} lignes (doublons)`);
    console.log(`⏱️  Durée: ${duration} secondes`);
    console.log("========================================");
    
  } catch (error: any) {
    console.error("\n❌ Erreur fatale:", error.message);
    process.exit(1);
  } finally {
    await renderPool.end();
    await supabasePool.end();
    process.exit(0);
  }
}

migrateAll();
