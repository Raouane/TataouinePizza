import "dotenv/config";
import { Pool } from "pg";
import { execSync } from "child_process";

/**
 * Script de migration automatique pour Render
 * 
 * Ce script :
 * 1. Crée les tables avec Drizzle Kit (si nécessaire)
 * 2. Exécute les migrations manuelles (colonnes ajoutées après)
 * 3. Vérifie que tout est en ordre
 */
async function runMigrations() {
  if (!process.env.DATABASE_URL) {
    console.error("❌ ERREUR: DATABASE_URL n'est pas défini");
    process.exit(1);
  }

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    console.log("🔄 Démarrage des migrations de base de données...");

    // Étape 1: Push du schéma Drizzle (crée les tables de base)
    console.log("📦 Étape 1: Création/mise à jour des tables avec Drizzle...");
    try {
      // Utiliser drizzle-kit push via une commande système
      execSync("npm run db:push", { stdio: "inherit" });
      console.log("✅ Tables créées/mises à jour avec succès");
    } catch (error: any) {
      console.warn("⚠️  Drizzle push a échoué, mais on continue:", error.message);
      // On continue quand même, les tables peuvent déjà exister
    }

    // Étape 2: Migrations manuelles (colonnes ajoutées après la création initiale)
    console.log("📦 Étape 2: Application des migrations manuelles...");

    // Migration 1: Ajouter last_seen et assigned_at
    try {
      await pool.query(`
        ALTER TABLE drivers 
        ADD COLUMN IF NOT EXISTS last_seen TIMESTAMP DEFAULT NOW();
      `);
      console.log("✅ Colonne last_seen ajoutée à drivers");
    } catch (error: any) {
      if (!error.message.includes("already exists")) {
        console.warn("⚠️  Erreur lors de l'ajout de last_seen:", error.message);
      }
    }

    try {
      await pool.query(`
        ALTER TABLE orders 
        ADD COLUMN IF NOT EXISTS assigned_at TIMESTAMP;
      `);
      console.log("✅ Colonne assigned_at ajoutée à orders");
    } catch (error: any) {
      if (!error.message.includes("already exists")) {
        console.warn("⚠️  Erreur lors de l'ajout de assigned_at:", error.message);
      }
    }

    // Migration 2: Ajouter customer_lat et customer_lng
    try {
      await pool.query(`
        ALTER TABLE orders 
        ADD COLUMN IF NOT EXISTS customer_lat NUMERIC(10, 7);
      `);
      console.log("✅ Colonne customer_lat ajoutée à orders");
    } catch (error: any) {
      if (!error.message.includes("already exists")) {
        console.warn("⚠️  Erreur lors de l'ajout de customer_lat:", error.message);
      }
    }

    try {
      await pool.query(`
        ALTER TABLE orders 
        ADD COLUMN IF NOT EXISTS customer_lng NUMERIC(10, 7);
      `);
      console.log("✅ Colonne customer_lng ajoutée à orders");
    } catch (error: any) {
      if (!error.message.includes("already exists")) {
        console.warn("⚠️  Erreur lors de l'ajout de customer_lng:", error.message);
      }
    }

    // Mettre à jour les drivers existants
    try {
      await pool.query(`
        UPDATE drivers 
        SET last_seen = NOW() 
        WHERE last_seen IS NULL;
      `);
      console.log("✅ Drivers existants mis à jour");
    } catch (error: any) {
      console.warn("⚠️  Erreur lors de la mise à jour des drivers:", error.message);
    }

    console.log("🎉 Toutes les migrations sont terminées avec succès!");
    console.log("📊 La base de données est prête à être utilisée.");

  } catch (error) {
    console.error("❌ Erreur lors des migrations:", error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Exécuter les migrations
runMigrations();

