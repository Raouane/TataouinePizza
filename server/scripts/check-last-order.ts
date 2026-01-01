/**
 * Script pour vérifier la dernière commande créée
 * Usage: npm run tsx server/scripts/check-last-order.ts
 */

import "dotenv/config";
import { storage } from "../storage.js";

async function checkLastOrder() {
  try {
    console.log("========================================");
    console.log("🔍 VÉRIFICATION DE LA DERNIÈRE COMMANDE");
    console.log("========================================");

    const allOrders = await storage.getAllOrders();
    
    if (allOrders.length === 0) {
      console.log("❌ Aucune commande trouvée dans la base de données");
      process.exit(0);
    }

    // Trier par date de création décroissante (les plus récentes en premier)
    const sortedOrders = allOrders.sort((a, b) => {
      const dateA = new Date(a.createdAt || 0).getTime();
      const dateB = new Date(b.createdAt || 0).getTime();
      return dateB - dateA;
    });

    console.log(`📊 Total de commandes: ${allOrders.length}`);
    console.log(`\n📋 Les 5 dernières commandes:\n`);

    sortedOrders.slice(0, 5).forEach((order, index) => {
      console.log(`${index + 1}. Commande ${order.id.slice(0, 8)}...`);
      console.log(`   👤 Client: ${order.customerName}`);
      console.log(`   📞 Téléphone: ${order.phone}`);
      console.log(`   📊 Statut: ${order.status}`);
      console.log(`   🏪 Restaurant: ${order.restaurantId}`);
      console.log(`   👨‍✈️ Livreur: ${order.driverId || 'Aucun'}`);
      console.log(`   💰 Prix: ${order.totalPrice} TND`);
      console.log(`   📅 Créée: ${order.createdAt}`);
      console.log(`   🔄 Mise à jour: ${order.updatedAt}`);
      console.log("");
    });

    // Vérifier les commandes avec statut "received"
    const receivedOrders = allOrders.filter(o => o.status === 'received');
    console.log(`\n📊 Commandes avec statut "received": ${receivedOrders.length}`);
    
    if (receivedOrders.length > 0) {
      console.log(`\n📋 Détails des commandes "received":\n`);
      receivedOrders.forEach((order, index) => {
        console.log(`${index + 1}. ${order.id.slice(0, 8)}... - ${order.customerName} - ${order.totalPrice} TND`);
        console.log(`   Créée: ${order.createdAt}`);
      });
    }

    process.exit(0);
  } catch (error: any) {
    console.error("❌ Erreur:", error.message);
    console.error("Stack:", error.stack);
    process.exit(1);
  }
}

checkLastOrder();
