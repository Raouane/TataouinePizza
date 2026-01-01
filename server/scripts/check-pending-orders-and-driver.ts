/**
 * Script pour vérifier les commandes en attente et le statut du livreur
 * Usage: npm run tsx server/scripts/check-pending-orders-and-driver.ts
 */

import "dotenv/config";
import { storage } from "../storage.js";

async function checkPendingOrdersAndDriver() {
  try {
    console.log("========================================");
    console.log("🔍 VÉRIFICATION COMMANDES EN ATTENTE ET LIVREUR");
    console.log("========================================");
    console.log("");

    // 1. Récupérer toutes les commandes non livrées
    const allOrders = await storage.getAllOrders();
    
    const pendingOrders = allOrders.filter(order => 
      order.status !== 'delivered' && 
      order.status !== 'rejected' && 
      order.status !== 'cancelled'
    );

    const receivedOrders = allOrders.filter(order => order.status === 'received');
    const acceptedOrders = allOrders.filter(order => order.status === 'accepted');
    const readyOrders = allOrders.filter(order => order.status === 'ready');
    const deliveryOrders = allOrders.filter(order => order.status === 'delivery');
    const deliveredOrders = allOrders.filter(order => order.status === 'delivered');

    console.log("📊 STATISTIQUES DES COMMANDES");
    console.log("========================================");
    console.log(`Total commandes: ${allOrders.length}`);
    console.log(`Commandes en attente (non livrées): ${pendingOrders.length}`);
    console.log(`  - received: ${receivedOrders.length}`);
    console.log(`  - accepted: ${acceptedOrders.length}`);
    console.log(`  - ready: ${readyOrders.length}`);
    console.log(`  - delivery: ${deliveryOrders.length}`);
    console.log(`  - delivered: ${deliveredOrders.length}`);
    console.log("");

    // 2. Afficher les commandes en attente
    if (pendingOrders.length > 0) {
      console.log("📦 COMMANDES EN ATTENTE");
      console.log("========================================");
      pendingOrders.forEach((order, index) => {
        console.log(`${index + 1}. Commande #${order.id.substring(0, 8)}...`);
        console.log(`   Statut: ${order.status}`);
        console.log(`   Client: ${order.customerName}`);
        console.log(`   Téléphone: ${order.phone}`);
        console.log(`   Adresse: ${order.address}`);
        console.log(`   Prix: ${order.totalPrice} TND`);
        console.log(`   Livreur assigné: ${order.driverId || 'AUCUN'}`);
        console.log(`   Créée le: ${order.createdAt}`);
        console.log("");
      });
    } else {
      console.log("✅ Aucune commande en attente");
      console.log("");
    }

    // 3. Vérifier les livreurs
    console.log("👤 STATUT DES LIVREURS");
    console.log("========================================");
    const drivers = await storage.getAllDrivers();
    
    if (drivers.length === 0) {
      console.log("❌ Aucun livreur trouvé dans la base de données");
      return;
    }

    drivers.forEach((driver, index) => {
      const driverOrders = pendingOrders.filter(order => order.driverId === driver.id);
      console.log(`${index + 1}. ${driver.name}`);
      console.log(`   ID: ${driver.id}`);
      console.log(`   Téléphone: ${driver.phone}`);
      console.log(`   Statut: ${driver.status || 'non défini'}`);
      console.log(`   Telegram ID: ${driver.telegramId || 'NON CONFIGURÉ'}`);
      console.log(`   Commandes actives: ${driverOrders.length}`);
      if (driverOrders.length > 0) {
        driverOrders.forEach(order => {
          console.log(`     - Commande #${order.id.substring(0, 8)}... (${order.status})`);
        });
      }
      console.log("");
    });

    // 4. Vérifier les commandes sans livreur
    const ordersWithoutDriver = pendingOrders.filter(order => !order.driverId);
    if (ordersWithoutDriver.length > 0) {
      console.log("⚠️ COMMANDES SANS LIVREUR ASSIGNÉ");
      console.log("========================================");
      ordersWithoutDriver.forEach((order, index) => {
        console.log(`${index + 1}. Commande #${order.id.substring(0, 8)}...`);
        console.log(`   Statut: ${order.status}`);
        console.log(`   Client: ${order.customerName}`);
        console.log(`   Créée le: ${order.createdAt}`);
        console.log("");
      });
    }

    // 5. Vérifier la configuration Telegram
    console.log("🤖 CONFIGURATION TELEGRAM");
    console.log("========================================");
    const telegramBotToken = process.env.TELEGRAM_BOT_TOKEN;
    if (telegramBotToken) {
      console.log(`✅ TELEGRAM_BOT_TOKEN configuré (${telegramBotToken.substring(0, 10)}...)`);
    } else {
      console.log("❌ TELEGRAM_BOT_TOKEN non configuré");
    }
    console.log("");

    // 6. Vérifier les livreurs disponibles
    const availableDrivers = drivers.filter(driver => 
      (driver.status === 'available' || driver.status === 'on_delivery') &&
      driver.telegramId
    );
    
    console.log("✅ LIVREURS DISPONIBLES POUR NOTIFICATIONS");
    console.log("========================================");
    if (availableDrivers.length > 0) {
      availableDrivers.forEach((driver, index) => {
        const activeOrders = pendingOrders.filter(order => order.driverId === driver.id);
        const canReceiveNewOrders = activeOrders.length < 2; // MAX_ACTIVE_ORDERS_PER_DRIVER
        
        console.log(`${index + 1}. ${driver.name}`);
        console.log(`   Statut: ${driver.status}`);
        console.log(`   Telegram ID: ${driver.telegramId}`);
        console.log(`   Commandes actives: ${activeOrders.length}/2`);
        console.log(`   Peut recevoir nouvelles commandes: ${canReceiveNewOrders ? '✅ OUI' : '❌ NON (2 commandes max)'}`);
        console.log("");
      });
    } else {
      console.log("❌ Aucun livreur disponible pour recevoir des notifications");
      console.log("   Raisons possibles:");
      console.log("   - Aucun livreur avec status 'available' ou 'on_delivery'");
      console.log("   - Aucun livreur avec telegramId configuré");
      console.log("");
    }

    // 7. Recommandations
    console.log("💡 RECOMMANDATIONS");
    console.log("========================================");
    if (ordersWithoutDriver.length > 0 && availableDrivers.length === 0) {
      console.log("⚠️ PROBLÈME DÉTECTÉ:");
      console.log(`   - ${ordersWithoutDriver.length} commande(s) en attente sans livreur`);
      console.log("   - Aucun livreur disponible pour recevoir des notifications");
      console.log("");
      console.log("🔧 ACTIONS À FAIRE:");
      console.log("   1. Vérifier qu'au moins un livreur a:");
      console.log("      - status = 'available' ou 'on_delivery'");
      console.log("      - telegramId configuré");
      console.log("   2. Utiliser le script: npm run set:driver:available");
      console.log("   3. Vérifier que TELEGRAM_BOT_TOKEN est configuré");
      console.log("");
    } else if (ordersWithoutDriver.length > 0) {
      console.log("⚠️ PROBLÈME DÉTECTÉ:");
      console.log(`   - ${ordersWithoutDriver.length} commande(s) en attente sans livreur`);
      console.log(`   - ${availableDrivers.length} livreur(s) disponible(s)`);
      console.log("");
      console.log("🔧 ACTIONS À FAIRE:");
      console.log("   1. Vérifier que les notifications Telegram sont bien envoyées");
      console.log("   2. Vérifier les logs du serveur pour voir si notifyDriversOfNewOrder() est appelé");
      console.log("   3. Tester avec: npm run test:order:1");
      console.log("");
    } else {
      console.log("✅ Tout semble correct");
      console.log("   - Pas de commandes en attente sans livreur");
      console.log("   - Livreurs disponibles pour nouvelles commandes");
      console.log("");
    }

    process.exit(0);
  } catch (error: any) {
    console.error("❌ Erreur:", error.message);
    console.error("Stack:", error.stack);
    process.exit(1);
  }
}

checkPendingOrdersAndDriver();
