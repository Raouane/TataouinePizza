/**
 * Script pour marquer toutes les commandes comme "delivered" (livrées)
 * 
 * Usage:
 *   npm run tsx server/scripts/mark-all-orders-delivered.ts
 * 
 * Ou via ts-node:
 *   npx ts-node server/scripts/mark-all-orders-delivered.ts
 */

import "dotenv/config";
import { db } from "../db.js";
import { orders } from "@shared/schema";
import { sql, ne, and } from "drizzle-orm";

async function markAllOrdersDelivered() {
  try {
    console.log("[Script] 🔄 Début du script de marquage des commandes comme livrées...");
    
    // Compter les commandes qui ne sont pas déjà "delivered" ou "cancelled"
    const countResult = await db.execute(sql`
      SELECT COUNT(*) as count
      FROM orders
      WHERE status NOT IN ('delivered', 'cancelled')
    `);
    
    const count = Number(countResult.rows[0]?.count || 0);
    console.log(`[Script] 📊 ${count} commande(s) à marquer comme "delivered"`);
    
    if (count === 0) {
      console.log("[Script] ✅ Toutes les commandes sont déjà livrées ou annulées");
      return;
    }
    
    // Afficher un résumé des statuts actuels
    const statusSummary = await db.execute(sql`
      SELECT status, COUNT(*) as count
      FROM orders
      WHERE status NOT IN ('delivered', 'cancelled')
      GROUP BY status
      ORDER BY status
    `);
    
    console.log("[Script] 📋 Résumé des statuts actuels:");
    statusSummary.rows.forEach((row: any) => {
      console.log(`[Script]   - ${row.status}: ${row.count} commande(s)`);
    });
    
    // Demander confirmation (optionnel - pour production, on peut le retirer)
    console.log("[Script] ⚠️  ATTENTION: Toutes les commandes non-livrées seront marquées comme 'delivered'");
    console.log("[Script] 🔄 Mise à jour en cours...");
    
    // Mettre à jour toutes les commandes (sauf "delivered" et "cancelled")
    const result = await db
      .update(orders)
      .set({ 
        status: 'delivered',
        updatedAt: new Date()
      })
      .where(
        and(
          ne(orders.status, 'delivered'),
          ne(orders.status, 'cancelled')
        )
      );
    
    console.log("[Script] ✅ Mise à jour terminée");
    
    // Vérifier le résultat
    const finalCount = await db.execute(sql`
      SELECT COUNT(*) as count
      FROM orders
      WHERE status = 'delivered'
    `);
    
    const deliveredCount = Number(finalCount.rows[0]?.count || 0);
    console.log(`[Script] 📊 Total de commandes "delivered": ${deliveredCount}`);
    
    console.log("[Script] ✅ Script terminé avec succès");
    
  } catch (error: any) {
    console.error("[Script] ❌ Erreur lors de l'exécution du script:", error);
    console.error("[Script] ❌ Stack:", error.stack);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

// Exécuter le script
markAllOrdersDelivered();
