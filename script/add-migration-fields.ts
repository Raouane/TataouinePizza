import "dotenv/config";
import { Pool } from "pg";
import * as fs from "fs";
import * as path from "path";

async function runMigration() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    console.log("🔄 Running migration: add_driver_order_fields...");

    // Add last_seen to drivers
    await pool.query(`
      ALTER TABLE drivers 
      ADD COLUMN IF NOT EXISTS last_seen TIMESTAMP DEFAULT NOW();
    `);
    console.log("✅ Added last_seen to drivers");

    // Add assigned_at to orders
    await pool.query(`
      ALTER TABLE orders 
      ADD COLUMN IF NOT EXISTS assigned_at TIMESTAMP;
    `);
    console.log("✅ Added assigned_at to orders");

    // Update existing drivers
    await pool.query(`
      UPDATE drivers 
      SET last_seen = NOW() 
      WHERE last_seen IS NULL;
    `);
    console.log("✅ Updated existing drivers");

    console.log("🎉 Migration completed successfully!");
  } catch (error) {
    console.error("❌ Migration failed:", error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runMigration();


