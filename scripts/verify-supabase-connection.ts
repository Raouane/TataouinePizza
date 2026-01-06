/**
 * Script de vérification de la connexion Supabase
 * 
 * Usage: npx tsx scripts/verify-supabase-connection.ts
 */

import "dotenv/config";
import { Pool } from "pg";
import dns from "dns";

dns.setDefaultResultOrder('ipv4first');

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error("❌ DATABASE_URL n'est pas défini dans .env");
  process.exit(1);
}

console.log("🔍 Vérification de la configuration Supabase...\n");

// Masquer le mot de passe dans les logs
const maskedUrl = DATABASE_URL.replace(/:([^:@]+)@/, ':****@');
console.log("📋 DATABASE_URL (masqué):", maskedUrl);
console.log("📋 Longueur:", DATABASE_URL.length);
console.log("📋 Contient 'supabase':", DATABASE_URL.includes('supabase'));
console.log("📋 Contient 'pooler':", DATABASE_URL.includes('pooler'));
console.log("📋 Port:", DATABASE_URL.match(/:(\d+)\//)?.[1] || 'non spécifié');
console.log("📋 SSL mode:", DATABASE_URL.includes('sslmode=') ? 'configuré' : 'non configuré');

// Configurer le pool
const isSupabase = DATABASE_URL.includes('supabase');
const poolConfig: any = {
  connectionString: DATABASE_URL,
};

if (isSupabase) {
  poolConfig.ssl = {
    rejectUnauthorized: false,
  };
  console.log("\n✅ Configuration SSL Supabase appliquée");
}

const pool = new Pool(poolConfig);

async function verifyConnection() {
  try {
    console.log("\n🔌 Test de connexion...");
    
    const result = await pool.query("SELECT version(), current_database(), current_user");
    const version = result.rows[0].version;
    const database = result.rows[0].current_database;
    const user = result.rows[0].current_user;
    
    console.log("✅ Connexion réussie !");
    console.log("📊 Base de données:", database);
    console.log("👤 Utilisateur:", user);
    console.log("📦 Version PostgreSQL:", version.split(' ')[0], version.split(' ')[1]);
    
    // Vérifier les tables
    console.log("\n📋 Vérification des tables...");
    const tablesResult = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `);
    
    const tables = tablesResult.rows.map(row => row.table_name);
    console.log(`✅ ${tables.length} table(s) trouvée(s):`);
    tables.forEach(table => {
      console.log(`   - ${table}`);
    });
    
    // Tables requises
    const requiredTables = [
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
    
    const missingTables = requiredTables.filter(table => !tables.includes(table));
    
    if (missingTables.length > 0) {
      console.log("\n⚠️  Tables manquantes:");
      missingTables.forEach(table => {
        console.log(`   - ${table}`);
      });
      console.log("\n💡 Solution: Redémarrez l'application pour exécuter les migrations automatiques");
    } else {
      console.log("\n✅ Toutes les tables requises sont présentes !");
    }
    
    // Compter les lignes dans chaque table
    console.log("\n📊 Statistiques des tables:");
    for (const table of tables) {
      try {
        const countResult = await pool.query(`SELECT COUNT(*) as count FROM ${table}`);
        const count = parseInt(countResult.rows[0].count);
        console.log(`   - ${table}: ${count} ligne(s)`);
      } catch (e) {
        console.log(`   - ${table}: erreur lors du comptage`);
      }
    }
    
    await pool.end();
    console.log("\n✅ Vérification terminée avec succès !");
    process.exit(0);
    
  } catch (error: any) {
    console.error("\n❌ Erreur de connexion:", error.message);
    
    if (error.message.includes('SSL')) {
      console.error("\n💡 Solution: Ajoutez ?sslmode=require à la fin de DATABASE_URL");
    } else if (error.message.includes('password')) {
      console.error("\n💡 Solution: Vérifiez que le mot de passe est correct et encodé si nécessaire");
    } else if (error.message.includes('timeout')) {
      console.error("\n💡 Solution: Vérifiez votre connexion internet et le firewall");
    }
    
    await pool.end();
    process.exit(1);
  }
}

verifyConnection();
