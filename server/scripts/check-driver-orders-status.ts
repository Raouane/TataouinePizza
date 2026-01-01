/**
 * Script pour vérifier les statuts des commandes d'un livreur
 * Usage: npx tsx server/scripts/check-driver-orders-status.ts [driverId]
 */

import "dotenv/config";
import { storage } from "../storage.js";

async function checkDriverOrdersStatus() {
  try {
    const driverId = process.argv[2] || "2d780c33-f2f5-47e1-8f15-0d40875c878e"; // Raouane par défaut
    
    console.log("========================================");
    console.log("🔍 VÉRIFICATION STATUTS COMMANDES LIVREUR");
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
    console.log(`📊 Statut: ${driver.status}`);
    console.log("");

    // Récupérer toutes les commandes du livreur
    const allOrders = await storage.getOrdersByDriver(driverId);
    console.log(`📦 Total commandes: ${allOrders.length}`);
    console.log("");

    // Compter par statut
    const statusCounts: Record<string, number> = {};
    allOrders.forEach(order => {
      statusCounts[order.status] = (statusCounts[order.status] || 0) + 1;
    });

    console.log("📊 RÉPARTITION PAR STATUT:");
    console.log("========================================");
    Object.entries(statusCounts)
      .sort((a, b) => b[1] - a[1])
      .forEach(([status, count]) => {
        console.log(`  ${status}: ${count} commande(s)`);
      });
    console.log("");

    // Commandes actives (celles qui devraient être affichées)
    const activeOrders = allOrders.filter(o => 
      ["received", "accepted", "ready", "delivery"].includes(o.status)
    );

    console.log("✅ COMMANDES ACTIVES (à afficher):");
    console.log("========================================");
    console.log(`Total: ${activeOrders.length} commande(s)`);
    console.log("");

    if (activeOrders.length > 0) {
      console.log("📋 Détails des commandes actives:");
      activeOrders.slice(0, 10).forEach((order, index) => {
        console.log(`  ${index + 1}. Commande #${order.id.substring(0, 8)}...`);
        console.log(`     Statut: ${order.status}`);
        console.log(`     Client: ${order.customerName}`);
        console.log(`     Prix: ${order.totalPrice} TND`);
        console.log(`     Créée: ${order.createdAt}`);
        console.log("");
      });
      if (activeOrders.length > 10) {
        console.log(`  ... et ${activeOrders.length - 10} autre(s) commande(s)`);
      }
    } else {
      console.log("❌ Aucune commande active trouvée");
      console.log("");
      console.log("💡 RAISONS POSSIBLES:");
      console.log("  1. Toutes les commandes sont déjà livrées (delivered)");
      console.log("  2. Toutes les commandes sont annulées (rejected/cancelled)");
      console.log("  3. Les commandes sont dans un autre statut non géré");
      console.log("");
      
      // Afficher quelques exemples de statuts
      if (allOrders.length > 0) {
        console.log("📋 Exemples de statuts trouvés:");
        const uniqueStatuses = [...new Set(allOrders.map(o => o.status))];
        uniqueStatuses.forEach(status => {
          const count = statusCounts[status] || 0;
          console.log(`  - ${status}: ${count} commande(s)`);
        });
      }
    }

    // Commandes livrées
    const deliveredOrders = allOrders.filter(o => o.status === "delivered");
    console.log("");
    console.log("✅ COMMANDES LIVRÉES:");
    console.log("========================================");
    console.log(`Total: ${deliveredOrders.length} commande(s)`);
    console.log("");

    process.exit(0);
  } catch (error: any) {
    console.error("❌ Erreur:", error.message);
    console.error("Stack:", error.stack);
    process.exit(1);
  }
}

checkDriverOrdersStatus();
