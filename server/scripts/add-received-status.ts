/**
 * Script de migration: Ajout du statut "received" à l'enum order_status
 * 
 * IMPORTANT: Cette migration doit être exécutée manuellement car
 * ALTER TYPE ... ADD VALUE ne peut pas être dans une transaction.
 * 
 * Usage:
 *   npm run tsx server/scripts/add-received-status.ts
 * 
 * Ou via ts-node:
 *   npx ts-node server/scripts/add-received-status.ts
 */

import "dotenv/config";
import { db } from "../db.js";
import { sql } from "drizzle-orm";

async function addReceivedStatus() {
  try {
    console.log("[Migration] 🔄 Vérification du type de la colonne 'status'...");
    
    // Vérifier le type de la colonne status
    const columnInfo = await db.execute(sql`
      SELECT 
        column_name, 
        data_type, 
        udt_name
      FROM information_schema.columns 
      WHERE table_name = 'orders' 
      AND column_name = 'status'
    `);
    
    if (!columnInfo.rows || columnInfo.rows.length === 0) {
      console.error("[Migration] ❌ La colonne 'status' n'existe pas dans la table 'orders'");
      process.exit(1);
      return;
    }
    
    const columnType = columnInfo.rows[0] as { column_name: string; data_type: string; udt_name: string };
    console.log(`[Migration] 📋 Type de colonne détecté: ${columnType.data_type} (${columnType.udt_name})`);
    
    // Si c'est un enum PostgreSQL
    if (columnType.udt_name === 'order_status') {
      console.log("[Migration] 🔄 Type enum détecté, ajout de la valeur 'received'...");
      
      // Vérifier si "received" existe déjà
      const checkResult = await db.execute(sql`
        SELECT 
          enumlabel as status_value
        FROM pg_enum 
        WHERE enumlabel = 'received' 
        AND enumtypid = (
          SELECT oid 
          FROM pg_type 
          WHERE typname = 'order_status'
        )
      `);
      
      if (checkResult.rows && checkResult.rows.length > 0) {
        console.log("[Migration] ✅ Le statut 'received' existe déjà dans l'enum order_status");
      } else {
        // Ajouter la valeur "received" à l'enum
        // Note: Cette commande ne peut pas être dans une transaction
        await db.execute(sql`ALTER TYPE order_status ADD VALUE 'received'`);
        console.log("[Migration] ✅ Statut 'received' ajouté avec succès à l'enum order_status");
      }
      
      // Afficher tous les statuts disponibles
      const allStatuses = await db.execute(sql`
        SELECT 
          enumlabel as status_value,
          enumsortorder as sort_order
        FROM pg_enum 
        WHERE enumtypid = (
          SELECT oid 
          FROM pg_type 
          WHERE typname = 'order_status'
        )
        ORDER BY enumsortorder
      `);
      
      console.log("\n[Migration] 📋 Statuts disponibles dans order_status:");
      if (allStatuses.rows) {
        allStatuses.rows.forEach((row: any) => {
          console.log(`  - ${row.status_value} (ordre: ${row.sort_order})`);
        });
      }
    } else {
      // Si c'est un type TEXT ou VARCHAR
      console.log("[Migration] ℹ️ La colonne 'status' utilise le type TEXT/VARCHAR, pas d'enum PostgreSQL");
      console.log("[Migration] ✅ Le statut 'received' peut être utilisé directement sans migration");
      console.log("[Migration] ℹ️ Aucune action nécessaire - la base de données accepte déjà n'importe quelle valeur texte");
    }
    
    console.log("\n[Migration] 🎉 Migration terminée avec succès!");
  } catch (error: any) {
    if (error.message?.includes('already exists') || error.message?.includes('duplicate')) {
      console.log("[Migration] ✅ Le statut 'received' existe déjà dans l'enum order_status");
    } else if (error.message?.includes('does not exist')) {
      console.log("[Migration] ℹ️ L'enum 'order_status' n'existe pas - la colonne utilise probablement TEXT/VARCHAR");
      console.log("[Migration] ✅ Le statut 'received' peut être utilisé directement sans migration");
    } else {
      console.error("[Migration] ❌ Erreur lors de la migration:", error.message);
      console.error("[Migration] ❌ Stack:", error.stack);
      process.exit(1);
    }
  } finally {
    process.exit(0);
  }
}

// Exécuter la migration
addReceivedStatus();
