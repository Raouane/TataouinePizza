import "dotenv/config";
import { db } from "../db.js";
import { drivers, restaurants } from "@shared/schema";
import { isNull, eq } from "drizzle-orm";
import { sql } from "drizzle-orm";

/**
 * Script pour définir les mots de passe par défaut pour les livreurs et restaurants
 * qui n'en ont pas encore
 * Usage: npm run script:set-default-passwords
 */
async function setDefaultPasswords() {
  const defaultPassword = "1234"; // Mot de passe par défaut simple

  try {
    const { hashPassword } = await import("../auth.js");
    const hashedPassword = await hashPassword(defaultPassword);

    console.log("========================================");
    console.log("🔐 DÉFINITION DES MOTS DE PASSE PAR DÉFAUT");
    console.log("========================================");
    console.log(`Mot de passe par défaut: ${defaultPassword}`);
    console.log("");

    // Ajouter la colonne password aux restaurants si elle n'existe pas
    console.log("🔧 Vérification de la colonne password pour restaurants...");
    try {
      await db.execute(sql`
        DO $$ 
        BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'restaurants' AND column_name = 'password'
          ) THEN
            ALTER TABLE restaurants ADD COLUMN password TEXT;
            RAISE NOTICE 'Colonne password ajoutée à restaurants';
          END IF;
        END $$;
      `);
      console.log("✅ Colonne password vérifiée pour restaurants");
    } catch (error: any) {
      console.log("⚠️  Erreur lors de la vérification de la colonne (peut-être déjà existante):", error.message);
    }

    // Mettre à jour les livreurs sans mot de passe
    const driversWithoutPassword = await db
      .select()
      .from(drivers)
      .where(isNull(drivers.password));

    console.log(`📋 ${driversWithoutPassword.length} livreur(s) sans mot de passe trouvé(s)`);

    for (const driver of driversWithoutPassword) {
      await db
        .update(drivers)
        .set({ password: hashedPassword })
        .where(eq(drivers.id, driver.id));

      console.log(`✅ Mot de passe défini pour livreur: ${driver.name} (${driver.phone})`);
    }

    // Mettre à jour les restaurants sans mot de passe
    const restaurantsWithoutPassword = await db
      .select()
      .from(restaurants)
      .where(isNull(restaurants.password));

    console.log(`📋 ${restaurantsWithoutPassword.length} restaurant(s) sans mot de passe trouvé(s)`);

    for (const restaurant of restaurantsWithoutPassword) {
      await db
        .update(restaurants)
        .set({ password: hashedPassword })
        .where(eq(restaurants.id, restaurant.id));

      console.log(`✅ Mot de passe défini pour restaurant: ${restaurant.name} (${restaurant.phone})`);
    }

    console.log("");
    console.log("========================================");
    console.log("✅ TERMINÉ");
    console.log("========================================");
    console.log(`📝 Tous les utilisateurs peuvent maintenant se connecter avec:`);
    console.log(`   Téléphone: leur numéro`);
    console.log(`   Mot de passe: ${defaultPassword}`);
    console.log("");
    console.log("⚠️  IMPORTANT: Changez ces mots de passe en production !");

    process.exit(0);
  } catch (error: any) {
    console.error("❌ Erreur:", error.message);
    console.error("Stack:", error.stack);
    process.exit(1);
  }
}

setDefaultPasswords();

