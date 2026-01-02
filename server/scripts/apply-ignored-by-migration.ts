/**
 * Script de migration automatique : Ajouter la colonne ignored_by à la table orders
 * 
 * Usage:
 *   npx tsx server/scripts/apply-ignored-by-migration.ts
 * 
 * Ce script :
 * 1. Vérifie si la colonne ignored_by existe déjà
 * 2. Si elle n'existe pas, l'ajoute avec ALTER TABLE
 * 3. Affiche un message de succès ou d'erreur
 */

import { db } from "../db.js";
import { sql } from "drizzle-orm";

async function applyIgnoredByMigration() {
  console.log("========================================");
  console.log("🔧 MIGRATION : Ajout colonne ignored_by");
  console.log("========================================");

  try {
    // 1. Vérifier si la colonne existe déjà
    console.log("📋 Étape 1: Vérification de l'existence de la colonne ignored_by...");
    
    const checkColumnQuery = sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'orders' 
        AND column_name = 'ignored_by'
    `;
    
    const checkResult = await db.execute(checkColumnQuery);
    const columnExists = checkResult.rows && checkResult.rows.length > 0;

    if (columnExists) {
      console.log("✅ La colonne ignored_by existe déjà dans la table orders");
      console.log("✅ Migration non nécessaire");
      return;
    }

    console.log("⚠️ La colonne ignored_by n'existe pas encore");
    console.log("📋 Étape 2: Ajout de la colonne ignored_by...");

    // 2. Ajouter la colonne
    const addColumnQuery = sql`
      ALTER TABLE orders 
      ADD COLUMN IF NOT EXISTS ignored_by text
    `;

    await db.execute(addColumnQuery);

    console.log("✅ Colonne ignored_by ajoutée avec succès !");

    // 3. Ajouter un commentaire pour documenter
    console.log("📋 Étape 3: Ajout du commentaire de documentation...");
    
    try {
      const commentQuery = sql`
        COMMENT ON COLUMN orders.ignored_by IS 'JSON array des driverId qui ont refusé cette commande (ex: ["driver-id-1", "driver-id-2"])'
      `;
      await db.execute(commentQuery);
      console.log("✅ Commentaire ajouté avec succès");
    } catch (commentError: any) {
      // Le commentaire est optionnel, on continue même en cas d'erreur
      console.log("⚠️ Impossible d'ajouter le commentaire (non-bloquant):", commentError?.message);
    }

    // 4. Vérification finale
    console.log("📋 Étape 4: Vérification finale...");
    const verifyResult = await db.execute(checkColumnQuery);
    const verified = verifyResult.rows && verifyResult.rows.length > 0;

    if (verified) {
      console.log("========================================");
      console.log("✅✅✅ MIGRATION RÉUSSIE ✅✅✅");
      console.log("========================================");
      console.log("La colonne ignored_by est maintenant disponible dans la table orders");
      console.log("Le système peut maintenant utiliser cette colonne pour exclure les livreurs ayant refusé");
    } else {
      console.log("========================================");
      console.log("⚠️⚠️⚠️ PROBLÈME LORS DE LA VÉRIFICATION ⚠️⚠️⚠️");
      console.log("========================================");
      console.log("La colonne semble avoir été ajoutée mais n'est pas visible lors de la vérification");
      console.log("Veuillez vérifier manuellement dans votre base de données");
    }

  } catch (error: any) {
    console.error("========================================");
    console.error("❌❌❌ ERREUR LORS DE LA MIGRATION ❌❌❌");
    console.error("========================================");
    console.error("Type d'erreur:", error?.constructor?.name || typeof error);
    console.error("Message:", error?.message || error?.toString());
    console.error("Code:", error?.code);
    console.error("Stack:", error?.stack || 'Pas de stack trace');
    
    if (error?.code === '42P07') {
      console.error("\n💡 Suggestion: La table orders n'existe peut-être pas encore");
    } else if (error?.code === '3D000') {
      console.error("\n💡 Suggestion: La base de données n'existe pas");
    } else if (error?.code === '28P01') {
      console.error("\n💡 Suggestion: Vérifiez vos identifiants de connexion PostgreSQL");
    }
    
    process.exit(1);
  } finally {
    // Fermer la connexion
    process.exit(0);
  }
}

// Exécuter la migration
applyIgnoredByMigration().catch((error) => {
  console.error("Erreur fatale:", error);
  process.exit(1);
});
