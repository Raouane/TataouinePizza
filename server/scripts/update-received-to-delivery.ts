/**
 * Script pour mettre à jour les commandes "received" déjà assignées à un livreur
 * vers le statut "delivery" (conformément au nouveau workflow simplifié)
 */

import { storage } from "../storage.js";

async function updateReceivedToDelivery() {
  try {
    console.log("========================================");
    console.log("🔄 MISE À JOUR COMMANDES 'received' → 'delivery'");
    console.log("========================================");

    // Récupérer toutes les commandes avec statut "received" qui ont un driverId
    const allOrders = await storage.getAllOrders();
    const receivedOrders = allOrders.filter(
      (o) => o.status === "received" && o.driverId !== null && o.driverId !== ""
    );

    console.log(`📊 Commandes "received" avec livreur assigné: ${receivedOrders.length}`);

    if (receivedOrders.length === 0) {
      console.log("✅ Aucune commande à mettre à jour");
      return;
    }

    // Afficher les détails des commandes à mettre à jour
    console.log("\n📋 Commandes à mettre à jour:");
    receivedOrders.forEach((order, index) => {
      console.log(
        `  ${index + 1}. Commande #${order.id.slice(0, 8)}... - Client: ${order.customerName || "N/A"} - Livreur: ${order.driverId?.slice(0, 8) || "N/A"}`
      );
    });

    // Mettre à jour chaque commande
    let updatedCount = 0;
    let errorCount = 0;

    for (const order of receivedOrders) {
      try {
        await storage.updateOrderStatus(order.id, "delivery");
        updatedCount++;
        console.log(`✅ Commande #${order.id.slice(0, 8)}... mise à jour vers "delivery"`);
      } catch (error: any) {
        errorCount++;
        console.error(
          `❌ Erreur mise à jour commande #${order.id.slice(0, 8)}...:`,
          error.message
        );
      }
    }

    console.log("\n========================================");
    console.log("📊 RÉSUMÉ:");
    console.log(`  ✅ Mises à jour réussies: ${updatedCount}`);
    console.log(`  ❌ Erreurs: ${errorCount}`);
    console.log(`  📦 Total traité: ${receivedOrders.length}`);
    console.log("========================================");
  } catch (error: any) {
    console.error("❌ Erreur lors de la mise à jour:", error);
    process.exit(1);
  }
}

// Exécuter le script
updateReceivedToDelivery()
  .then(() => {
    console.log("\n✅ Script terminé avec succès");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ Erreur fatale:", error);
    process.exit(1);
  });
