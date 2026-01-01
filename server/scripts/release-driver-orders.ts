/**
 * Script pour libérer les commandes assignées à un livreur (retirer le driverId)
 * Usage: npx tsx server/scripts/release-driver-orders.ts [driverId]
 */

import "dotenv/config";
import { storage } from "../storage.js";
import { db } from "../db.js";
import { orders } from "@shared/schema";
import { eq } from "drizzle-orm";

async function releaseDriverOrders() {
  try {
    const driverId = process.argv[2];
    
    if (!driverId) {
      console.error("❌ Usage: npx tsx server/scripts/release-driver-orders.ts [driverId]");
      console.error("💡 Exemple: npx tsx server/scripts/release-driver-orders.ts 2d780c33-f2f5-47e1-8f15-0d40875c878e");
      process.exit(1);
    }

    console.log("========================================");
    console.log("🔄 LIBÉRATION DES COMMANDES DU LIVREUR");
    console.log("========================================");
    console.log(`📋 Driver ID: ${driverId}`);
    console.log("");

    // Récupérer le livreur
    const driver = await storage.getDriverById(driverId);
    if (!driver) {
      console.error(`❌ Livreur ${driverId} non trouvé`);
      process.exit(1);
    }

    console.log(`👤 Nom: ${driver.name}`);
    console.log(`📞 Téléphone: ${driver.phone}`);
    console.log("");

    // Récupérer toutes les commandes assignées à ce livreur avec statut "received"
    const driverOrders = await storage.getOrdersByDriver(driverId);
    const receivedOrders = driverOrders.filter(o => o.status === 'received');

    console.log(`📊 Commandes en "received" assignées: ${receivedOrders.length}`);
    
    if (receivedOrders.length === 0) {
      console.log("✅ Aucune commande à libérer");
      process.exit(0);
    }

    console.log("");
    console.log("📋 Commandes à libérer:");
    receivedOrders.forEach((order, index) => {
      console.log(`   ${index + 1}. Commande #${order.id.substring(0, 8)}... - ${order.customerName} - ${order.totalPrice} TND`);
    });
    console.log("");

    // Demander confirmation
    console.log("⚠️  ATTENTION: Cette action va retirer le driverId de ces commandes.");
    console.log("   Elles redeviendront disponibles pour tous les livreurs.");
    console.log("");

    // Libérer les commandes (retirer le driverId)
    let releasedCount = 0;
    for (const order of receivedOrders) {
      await db
        .update(orders)
        .set({ driverId: null })
        .where(eq(orders.id, order.id));
      releasedCount++;
      console.log(`✅ Commande #${order.id.substring(0, 8)}... libérée`);
    }

    console.log("");
    console.log("========================================");
    console.log(`✅ ${releasedCount} commande(s) libérée(s) avec succès`);
    console.log("========================================");
    console.log("");
    console.log("💡 Le livreur peut maintenant recevoir de nouvelles notifications");
    console.log("💡 Les commandes libérées sont maintenant disponibles pour tous les livreurs");

    process.exit(0);
  } catch (error: any) {
    console.error("❌ Erreur:", error.message);
    console.error("Stack:", error.stack);
    process.exit(1);
  }
}

releaseDriverOrders();
