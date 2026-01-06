/**
 * Script de migration pour ajouter les colonnes lat et lng à la table restaurants
 * 
 * Usage: npx tsx script/migrate-restaurant-coordinates.ts
 */

import "dotenv/config";
// Forcer la configuration SSL avant d'importer db
if (process.env.DATABASE_URL?.includes('supabase')) {
  process.env.PGSSLMODE = 'no-verify';
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
}
import { db } from "../server/db";
import { sql } from "drizzle-orm";

async function migrateRestaurantCoordinates() {
  console.log("🔄 Migration : Ajout des colonnes lat et lng à la table restaurants...\n");

  try {
    // Ajouter les colonnes lat et lng si elles n'existent pas
    await db.execute(sql`
      DO $$ 
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'restaurants' AND column_name = 'lat'
        ) THEN
          ALTER TABLE restaurants ADD COLUMN lat NUMERIC(10, 7);
          RAISE NOTICE 'Colonne lat ajoutée à restaurants';
        ELSE
          RAISE NOTICE 'Colonne lat existe déjà';
        END IF;
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'restaurants' AND column_name = 'lng'
        ) THEN
          ALTER TABLE restaurants ADD COLUMN lng NUMERIC(10, 7);
          RAISE NOTICE 'Colonne lng ajoutée à restaurants';
        ELSE
          RAISE NOTICE 'Colonne lng existe déjà';
        END IF;
      END $$;
    `);
    
    console.log("✅ Migration terminée avec succès !");
    console.log("✅ Colonnes lat et lng ajoutées/vérifiées pour restaurants\n");

  } catch (error: any) {
    console.error("❌ Erreur lors de la migration:", error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

migrateRestaurantCoordinates();
