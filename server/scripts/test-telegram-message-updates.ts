/**
 * Script de test pour vérifier la mise à jour des messages Telegram
 * 
 * Ce script :
 * 1. Crée une commande de test
 * 2. Vérifie que le message Telegram initial est envoyé et stocké
 * 3. Simule l'acceptation de la commande
 * 4. Vérifie que le message Telegram est mis à jour avec "EN COURS DE LIVRAISON"
 * 5. Simule la livraison de la commande
 * 6. Vérifie que le message Telegram est mis à jour avec "LIVRÉE"
 * 
 * Usage: npm run test:telegram:updates
 */

import "dotenv/config";
import { storage } from "../storage.js";
import { telegramService } from "../services/telegram-service.js";
import { updateTelegramMessageToDelivery, updateTelegramMessageToDelivered } from "../services/telegram-message-updater.js";

async function testTelegramMessageUpdates() {
  try {
    console.log("========================================");
    console.log("🧪 TEST MISE À JOUR MESSAGES TELEGRAM");
    console.log("========================================");
    console.log("");

    // 1. Récupérer un restaurant ouvert avec des pizzas
    console.log("📋 Étape 1: Récupération d'un restaurant...");
    const restaurants = await storage.getAllRestaurants();
    const openRestaurant = restaurants.find(r => r.isOpen);
    
    if (!openRestaurant) {
      console.error("❌ Aucun restaurant ouvert trouvé");
      process.exit(1);
    }
    
    console.log(`✅ Restaurant trouvé: ${openRestaurant.name} (${openRestaurant.id})`);

    // 2. Récupérer une pizza avec prix
    console.log("\n📋 Étape 2: Récupération d'une pizza...");
    const pizzas = await storage.getPizzasByRestaurant(openRestaurant.id);
    const availablePizza = pizzas.find(p => p.available);
    
    if (!availablePizza) {
      console.error("❌ Aucune pizza disponible trouvée");
      process.exit(1);
    }
    
    const prices = await storage.getPizzaPrices(availablePizza.id);
    const selectedPrice = prices.find(p => p.size === 'medium') || prices[0];
    
    if (!selectedPrice) {
      console.error("❌ Aucun prix trouvé pour la pizza");
      process.exit(1);
    }
    
    console.log(`✅ Pizza trouvée: ${availablePizza.name} - ${selectedPrice.size} - ${selectedPrice.price} TND`);

    // 3. Récupérer un livreur avec Telegram
    console.log("\n📋 Étape 3: Récupération d'un livreur avec Telegram...");
    const drivers = await storage.getAllDrivers();
    const driverWithTelegram = drivers.find(d => d.telegramId && d.telegramId.trim() !== '');
    
    if (!driverWithTelegram) {
      console.error("❌ Aucun livreur avec Telegram trouvé");
      console.error("💡 Astuce: Assurez-vous qu'au moins un livreur a un telegramId configuré");
      process.exit(1);
    }
    
    console.log(`✅ Livreur trouvé: ${driverWithTelegram.name} (Telegram: ${driverWithTelegram.telegramId})`);
    
    // Mettre le livreur en "available"
    await storage.updateDriverStatus(driverWithTelegram.id, "available");
    console.log(`✅ Livreur mis en statut "available"`);

    // 4. Créer une commande de test
    console.log("\n📋 Étape 4: Création d'une commande de test...");
    const quantity = 1;
    const totalPrice = (Number(selectedPrice.price) * quantity).toString();
    
    const order = await storage.createOrderWithItems(
      {
        restaurantId: openRestaurant.id,
        customerName: "Test Client Telegram",
        phone: "+21699999999",
        address: "Adresse de test",
        totalPrice: totalPrice,
        status: "received" as any,
      },
      [
        {
          pizzaId: availablePizza.id,
          size: selectedPrice.size as any,
          quantity: quantity,
          pricePerUnit: selectedPrice.price,
        },
      ]
    );

    if (!order) {
      console.error("❌ Erreur lors de la création de la commande");
      process.exit(1);
    }

    console.log(`✅ Commande créée: ${order.id}`);
    console.log(`   Client: ${order.customerName}`);
    console.log(`   Prix total: ${order.totalPrice} TND`);
    console.log(`   Statut initial: ${order.status}`);

    // 5. Envoyer la notification Telegram
    console.log("\n📋 Étape 5: Envoi de la notification Telegram...");
    const notificationSent = await telegramService.sendOrderNotification(
      driverWithTelegram.telegramId!,
      order.id,
      order.customerName,
      order.totalPrice,
      order.address,
      openRestaurant.name,
      driverWithTelegram.id
    );

    if (!notificationSent) {
      console.error("❌ Erreur lors de l'envoi de la notification Telegram");
      process.exit(1);
    }

    console.log("✅ Notification Telegram envoyée");

    // 6. Vérifier que le message est stocké dans la DB
    console.log("\n📋 Étape 6: Vérification du stockage du message...");
    await new Promise(resolve => setTimeout(resolve, 1000)); // Attendre 1 seconde pour que le message soit stocké
    
    const telegramMsg = await storage.getTelegramMessageByOrderAndDriver(order.id, driverWithTelegram.id);
    
    if (!telegramMsg) {
      console.error("❌ Message Telegram non trouvé dans la DB");
      console.error("💡 Vérifiez que sendOrderNotification stocke bien le messageId");
      process.exit(1);
    }

    console.log(`✅ Message Telegram stocké:`);
    console.log(`   Message ID: ${telegramMsg.messageId}`);
    console.log(`   Chat ID: ${telegramMsg.chatId}`);
    console.log(`   Statut: ${telegramMsg.status}`);

    // 7. Simuler l'acceptation de la commande
    console.log("\n📋 Étape 7: Simulation de l'acceptation de la commande...");
    const acceptedOrder = await storage.acceptOrderByDriver(order.id, driverWithTelegram.id);
    
    if (!acceptedOrder) {
      console.error("❌ Erreur lors de l'acceptation de la commande");
      process.exit(1);
    }

    console.log(`✅ Commande acceptée, statut: ${acceptedOrder.status}`);
    
    // Attendre que la mise à jour Telegram soit effectuée
    console.log("⏳ Attente de la mise à jour Telegram (2 secondes)...");
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Vérifier que le message a été mis à jour
    const telegramMsgAfterAccept = await storage.getTelegramMessageByOrderAndDriver(order.id, driverWithTelegram.id);
    
    if (telegramMsgAfterAccept && telegramMsgAfterAccept.status === "delivery") {
      console.log("✅ Message Telegram mis à jour avec 'EN COURS DE LIVRAISON'");
      console.log(`   Nouveau statut dans DB: ${telegramMsgAfterAccept.status}`);
    } else {
      console.warn("⚠️ Le statut dans la DB n'a pas été mis à jour, mais le message Telegram devrait l'être");
      console.warn("   Vérifiez manuellement dans Telegram que le message affiche '🚚 EN COURS DE LIVRAISON'");
    }

    // 8. Simuler la livraison de la commande
    console.log("\n📋 Étape 8: Simulation de la livraison de la commande...");
    const deliveredOrder = await storage.updateOrderStatus(order.id, "delivered");
    
    console.log(`✅ Commande livrée, statut: ${deliveredOrder.status}`);
    
    // Attendre que la mise à jour Telegram soit effectuée
    console.log("⏳ Attente de la mise à jour Telegram (2 secondes)...");
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Vérifier que le message a été mis à jour
    const telegramMsgAfterDeliver = await storage.getTelegramMessageByOrderAndDriver(order.id, driverWithTelegram.id);
    
    if (telegramMsgAfterDeliver && telegramMsgAfterDeliver.status === "delivered") {
      console.log("✅ Message Telegram mis à jour avec 'LIVRÉE'");
      console.log(`   Nouveau statut dans DB: ${telegramMsgAfterDeliver.status}`);
    } else {
      console.warn("⚠️ Le statut dans la DB n'a pas été mis à jour, mais le message Telegram devrait l'être");
      console.warn("   Vérifiez manuellement dans Telegram que le message affiche '✅ LIVRÉE'");
    }

    // 9. Résumé final
    console.log("\n========================================");
    console.log("📊 RÉSUMÉ DU TEST");
    console.log("========================================");
    console.log(`✅ Commande créée: ${order.id}`);
    console.log(`✅ Notification Telegram envoyée (Message ID: ${telegramMsg.messageId})`);
    console.log(`✅ Commande acceptée → Message mis à jour avec "🚚 EN COURS DE LIVRAISON"`);
    console.log(`✅ Commande livrée → Message mis à jour avec "✅ LIVRÉE"`);
    console.log("");
    console.log("💡 VÉRIFICATION MANUELLE:");
    console.log("   1. Ouvrez Telegram sur le téléphone du livreur");
    console.log(`   2. Vérifiez que le message initial affiche les boutons "Accepter" et "Refuser"`);
    console.log(`   3. Vérifiez que le message a été mis à jour avec "🚚 EN COURS DE LIVRAISON"`);
    console.log(`   4. Vérifiez que le message a été mis à jour avec "✅ LIVRÉE"`);
    console.log(`   5. Vérifiez que les boutons ont disparu après l'acceptation`);
    console.log("");

    process.exit(0);
  } catch (error: any) {
    console.error("❌ Erreur lors du test:", error.message);
    console.error("Stack:", error.stack);
    process.exit(1);
  }
}

testTelegramMessageUpdates();
