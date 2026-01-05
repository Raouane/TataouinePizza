import "dotenv/config";
import { Pool } from "pg";
import dns from "dns";

// Forcer IPv4 pour éviter les problèmes ENETUNREACH
dns.setDefaultResultOrder('ipv4first');

// Configuration des deux bases de données
// SOURCE: Render (ancienne DB avec vos données)
// DESTINATION: Supabase (nouvelle DB vide)
const OLD_DB_URL = process.env.OLD_DATABASE_URL || "postgresql://tataouine_pizza_db_user:GcE7XAoz1gArWXTgtpk7beVnN3SrgKFC@dpg-d54ost5actks73aj2760-a.frankfurt-postgres.render.com/tataouine_pizza_db";

if (!OLD_DB_URL) {
  console.error("❌ OLD_DATABASE_URL n'est pas défini");
  console.error("💡 Définissez OLD_DATABASE_URL dans .env avec l'URL Render EXTERNE complète");
  process.exit(1);
}

let oldDbUrl = OLD_DB_URL;
// Si l'URL n'a pas de port, ne pas en ajouter (utiliser le port par défaut PostgreSQL)
// Les URLs externes de Render incluent généralement déjà le port
if (!oldDbUrl.match(/:\d+\//)) {
  console.log("⚠️  Aucun port spécifié dans l'URL, utilisation du port par défaut PostgreSQL (5432)");
  // Ne pas modifier l'URL, laisser PostgreSQL utiliser le port par défaut
}

const NEW_DB_URL = process.env.DATABASE_URL; // Supabase

if (!NEW_DB_URL) {
  console.error("❌ DATABASE_URL (Supabase) n'est pas défini dans .env");
  process.exit(1);
}

// Configurer SSL pour Supabase
const newPoolConfig: any = {
  connectionString: NEW_DB_URL,
};

if (NEW_DB_URL.includes('supabase')) {
  newPoolConfig.ssl = { rejectUnauthorized: false };
}

// Configurer SSL pour Render également
const oldPoolConfig: any = {
  connectionString: oldDbUrl,
};

// Render peut nécessiter SSL pour les connexions externes
if (oldDbUrl.includes('render.com')) {
  oldPoolConfig.ssl = { rejectUnauthorized: false };
}

// Créer les pools de connexion
const oldPool = new Pool(oldPoolConfig);
const newPool = new Pool(newPoolConfig);

// Ordre d'importation (respect des foreign keys)
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

// Taille des batches pour les grandes tables
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
    if (error.code === 'ENOTFOUND') {
      console.error(`\n💡 L'URL semble incorrecte ou inaccessible depuis votre machine.`);
      console.error(`   Vérifiez que vous utilisez l'URL EXTERNE de Render (pas l'URL interne).`);
      console.error(`   Dans Render Dashboard > Database > Info, copiez "External Database URL"`);
    }
    return false;
  }
}

async function resetSequences(tableName: string, idColumn: string = 'id') {
  try {
    // Récupérer la valeur max de l'ID dans la table
    const maxResult = await newPool.query(`SELECT MAX(${idColumn}) as max_id FROM ${tableName}`);
    const maxId = maxResult.rows[0]?.max_id;
    
    if (!maxId) return; // Table vide, pas besoin de réinitialiser
    
    // Trouver la séquence associée (pour les colonnes avec DEFAULT gen_random_uuid(), pas de séquence)
    // Mais pour les colonnes auto-incrément, on peut avoir besoin de réinitialiser
    // Ici, on vérifie si c'est un UUID (varchar) ou un integer
    const columnInfo = await newPool.query(`
      SELECT data_type 
      FROM information_schema.columns 
      WHERE table_name = $1 AND column_name = $2
    `, [tableName, idColumn]);
    
    if (columnInfo.rows[0]?.data_type === 'integer' || columnInfo.rows[0]?.data_type === 'bigint') {
      // Pour les colonnes integer, réinitialiser la séquence
      const sequenceName = `${tableName}_${idColumn}_seq`;
      await newPool.query(`SELECT setval('${sequenceName}', (SELECT MAX(${idColumn}) FROM ${tableName}), true)`);
      console.log(`   🔄 Séquence ${sequenceName} réinitialisée à ${maxId}`);
    }
  } catch (error: any) {
    // Ignorer les erreurs de séquence (certaines tables n'en ont pas)
    if (!error.message.includes('does not exist')) {
      console.log(`   ⚠️  Impossible de réinitialiser la séquence pour ${tableName}: ${error.message}`);
    }
  }
}

async function migrateTable(tableName: string) {
  console.log(`\n📦 Migration de la table: ${tableName}`);
  
  try {
    // 1. Récupérer toutes les données de l'ancienne DB
    const result = await oldPool.query(`SELECT * FROM ${tableName} ORDER BY id`);
    const rows = result.rows;
    
    if (rows.length === 0) {
      console.log(`   ⏭️  Table ${tableName} est vide, skip`);
      return { migrated: 0, skipped: 0 };
    }
    
    console.log(`   📥 ${rows.length} lignes à migrer`);
    
    // 2. Vérifier si la table existe dans la nouvelle DB
    const tableExists = await newPool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = $1
      )
    `, [tableName]);
    
    if (!tableExists.rows[0].exists) {
      console.log(`   ⚠️  Table ${tableName} n'existe pas dans la nouvelle DB, skip`);
      return { migrated: 0, skipped: rows.length };
    }
    
    // 3. Insérer les données par batches pour les grandes tables
    let migrated = 0;
    let skipped = 0;
    const totalBatches = Math.ceil(rows.length / BATCH_SIZE);
    
    for (let i = 0; i < rows.length; i += BATCH_SIZE) {
      const batch = rows.slice(i, i + BATCH_SIZE);
      const batchNum = Math.floor(i / BATCH_SIZE) + 1;
      
      for (const row of batch) {
        try {
          // Construire dynamiquement la requête INSERT
          const columns = Object.keys(row).filter(key => row[key] !== undefined && row[key] !== null);
          const values = columns.map((_, idx) => `$${idx + 1}`);
          const valuesArray = columns.map(col => row[col]);
          
          const insertQuery = `
            INSERT INTO ${tableName} (${columns.join(', ')})
            VALUES (${values.join(', ')})
            ON CONFLICT DO NOTHING
          `;
          
          await newPool.query(insertQuery, valuesArray);
          migrated++;
        } catch (error: any) {
          if (error.code === '23505') { // Duplicate key
            skipped++;
          } else {
            console.error(`   ❌ Erreur lors de l'insertion d'une ligne:`, error.message);
            skipped++;
          }
        }
      }
      
      // Afficher la progression pour les grandes tables
      if (totalBatches > 1) {
        const progress = Math.round((batchNum / totalBatches) * 100);
        console.log(`   📊 Progression: ${progress}% (batch ${batchNum}/${totalBatches})`);
      }
    }
    
    // 4. Réinitialiser les séquences si nécessaire
    await resetSequences(tableName);
    
    console.log(`   ✅ ${migrated} lignes migrées, ${skipped} ignorées (doublons)`);
    return { migrated, skipped };
    
  } catch (error: any) {
    console.error(`   ❌ Erreur lors de la migration de ${tableName}:`, error.message);
    if (error.code === '42P01') {
      console.error(`   💡 La table ${tableName} n'existe pas dans la source (Render)`);
    }
    return { migrated: 0, skipped: 0 };
  }
}

async function migrateAll() {
  console.log("========================================");
  console.log("🚀 MIGRATION DE RENDER VERS SUPABASE");
  console.log("========================================");
  console.log(`📥 Source: Render PostgreSQL`);
  console.log(`📤 Destination: Supabase`);
  console.log(`\n⚠️  IMPORTANT: Utilisez l'URL EXTERNE de Render (pas l'URL interne)`);
  console.log(`   Dans Render Dashboard > Database > Info > External Database URL`);
  
  try {
    // Test des connexions avec health check
    console.log("\n🔍 Test des connexions (Health Check)...");
    console.log(`   📥 Tentative de connexion à Render...`);
    console.log(`   URL (masquée): ${oldDbUrl.replace(/:([^:@]+)@/, ':****@')}`);
    
    const renderConnected = await testConnection(oldPool, "Render");
    if (!renderConnected) {
      throw new Error("Impossible de se connecter à Render");
    }
    
    console.log(`\n   📤 Tentative de connexion à Supabase...`);
    const supabaseConnected = await testConnection(newPool, "Supabase");
    if (!supabaseConnected) {
      throw new Error("Impossible de se connecter à Supabase");
    }
    
    // Afficher un résumé des tables à migrer
    console.log(`\n📋 Tables à migrer (${TABLES.length}):`);
    for (const table of TABLES) {
      try {
        const count = await oldPool.query(`SELECT COUNT(*) as count FROM ${table}`);
        const rowCount = parseInt(count.rows[0]?.count || "0");
        console.log(`   - ${table}: ${rowCount} lignes`);
      } catch (e) {
        console.log(`   - ${table}: table inexistante ou inaccessible`);
      }
    }
    
    // Demander confirmation
    console.log(`\n⚠️  La migration va commencer dans 3 secondes...`);
    console.log(`   Appuyez sur Ctrl+C pour annuler`);
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Migrer chaque table dans l'ordre
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
    
    // Vérification finale
    console.log("\n🔍 Vérification finale...");
    for (const table of TABLES) {
      try {
        const oldCount = await oldPool.query(`SELECT COUNT(*) as count FROM ${table}`);
        const newCount = await newPool.query(`SELECT COUNT(*) as count FROM ${table}`);
        const oldRows = parseInt(oldCount.rows[0]?.count || "0");
        const newRows = parseInt(newCount.rows[0]?.count || "0");
        if (oldRows > 0) {
          const percentage = Math.round((newRows / oldRows) * 100);
          console.log(`   ${table}: ${oldRows} → ${newRows} (${percentage}%)`);
        }
      } catch (e) {
        // Ignorer les erreurs de vérification
      }
    }
    
  } catch (error: any) {
    console.error("\n❌ Erreur fatale:", error.message);
    if (error.code === 'ENOTFOUND') {
      console.error("\n💡 SOLUTION:");
      console.error("   1. Allez dans Render Dashboard > Database > Info");
      console.error("   2. Copiez l'URL EXTERNE (External Database URL)");
      console.error("   3. Ajoutez-la dans .env comme OLD_DATABASE_URL");
      console.error("   4. Vérifiez que votre IP est autorisée dans Access Control");
    }
    process.exit(1);
  } finally {
    await oldPool.end();
    await newPool.end();
    process.exit(0);
  }
}

migrateAll();
