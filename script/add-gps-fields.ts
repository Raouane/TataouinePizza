import "dotenv/config";
import { Pool } from "pg";

async function runMigration() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    console.log("🔄 Running migration: add_gps_fields_to_orders...");
    
    // Ajouter les colonnes customer_lat et customer_lng
    await pool.query(`
      ALTER TABLE orders 
      ADD COLUMN IF NOT EXISTS customer_lat NUMERIC(10, 7);
    `);
    console.log("✅ Added customer_lat to orders");
    
    await pool.query(`
      ALTER TABLE orders 
      ADD COLUMN IF NOT EXISTS customer_lng NUMERIC(10, 7);
    `);
    console.log("✅ Added customer_lng to orders");
    
    console.log("🎉 Migration completed successfully!");
  } catch (error) {
    console.error("❌ Migration failed:", error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runMigration();





