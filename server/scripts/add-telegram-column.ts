import "dotenv/config";
import { db } from "../db.js";
import { sql } from "drizzle-orm";

async function addTelegramColumn() {
  console.log("========================================");
  console.log("🔧 AJOUT COLONNE telegram_id");
  console.log("========================================");

  try {
    await db.execute(sql`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'drivers' AND column_name = 'telegram_id'
        ) THEN
          ALTER TABLE drivers ADD COLUMN telegram_id TEXT;
          RAISE NOTICE 'Colonne telegram_id ajoutée à drivers';
        END IF;
      END $$;
    `);
    console.log("✅ Colonne telegram_id vérifiée/ajoutée");
  } catch (error: any) {
    console.error("❌ Erreur:", error.message);
    process.exit(1);
  }

  process.exit(0);
}

addTelegramColumn();

