/**
 * Service pour mettre à jour les messages Telegram avec les statuts de commande
 */

import { storage } from "../storage.js";
import { telegramService } from "./telegram-service.js";

/**
 * Met à jour le message Telegram pour afficher "🚚 EN COURS DE LIVRAISON"
 * Appelé quand la commande passe au statut "delivery"
 */
export async function updateTelegramMessageToDelivery(orderId: string, driverId: string): Promise<void> {
  try {
    console.log(`[TelegramUpdater] 🔄 Mise à jour message Telegram pour commande ${orderId} (driver: ${driverId}) -> EN COURS DE LIVRAISON`);
    
    // Récupérer le message Telegram stocké
    const telegramMsg = await storage.getTelegramMessageByOrderAndDriver(orderId, driverId);
    
    if (!telegramMsg) {
      console.log(`[TelegramUpdater] ⚠️ Aucun message Telegram trouvé pour commande ${orderId} et driver ${driverId}`);
      return;
    }

    // Récupérer les détails de la commande
    const order = await storage.getOrderById(orderId);
    if (!order) {
      console.error(`[TelegramUpdater] ❌ Commande ${orderId} non trouvée`);
      return;
    }

    // Récupérer les détails du restaurant
    const restaurant = await storage.getRestaurantById(order.restaurantId);
    if (!restaurant) {
      console.error(`[TelegramUpdater] ❌ Restaurant non trouvé pour commande ${orderId}`);
      return;
    }

    // Récupérer les items de la commande
    const items = await storage.getOrderItems(orderId);
    const pizzas = await storage.getPizzasByIds(items.map(item => item.pizzaId));
    const pizzaMap = new Map(pizzas.map(p => [p.id, p]));

    const DRIVER_COMMISSION_RATE = 0.15;
    const gain = (Number(order.totalPrice) * DRIVER_COMMISSION_RATE).toFixed(2);

    // Construire le message avec badge VISIBLE "EN COURS DE LIVRAISON"
    let restaurantAddress = restaurant.address || "";
    
    const message = `━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🟡 <b>EN COURS DE LIVRAISON</b> 🟡
━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📋 <b>Commande #${orderId.slice(0, 8).toUpperCase()}</b>

<b>👤 ${order.customerName}</b> - <b>💰 +${gain} TND</b>

🏪 <b>${restaurant.name}</b>
${restaurantAddress ? `📍 ${restaurantAddress}` : ''}

👤 <b>${order.customerName}</b>
📍 ${order.address}

<i>⏱️ Commande en cours de livraison</i>`;

    // Désactiver les boutons (la commande est déjà acceptée)
    const replyMarkup = {
      inline_keyboard: [] // Pas de boutons
    };

    // Modifier le message
    const result = await telegramService.editMessageText(
      telegramMsg.chatId,
      telegramMsg.messageId,
      message,
      {
        parseMode: 'HTML',
        replyMarkup: replyMarkup
      }
    );

    if (result.success) {
      // Mettre à jour le statut dans la DB
      await storage.updateTelegramMessageStatus(orderId, driverId, "delivery");
      console.log(`[TelegramUpdater] ✅ Message Telegram mis à jour avec succès (EN COURS DE LIVRAISON)`);
    } else {
      console.error(`[TelegramUpdater] ❌ Erreur mise à jour message:`, result.error);
    }
  } catch (error: any) {
    console.error(`[TelegramUpdater] ❌ Erreur updateTelegramMessageToDelivery:`, error);
  }
}

/**
 * Met à jour le message Telegram pour afficher "✅ LIVRÉE"
 * Appelé quand la commande passe au statut "delivered"
 */
export async function updateTelegramMessageToDelivered(orderId: string, driverId: string): Promise<void> {
  try {
    console.log(`[TelegramUpdater] 🔄 Mise à jour message Telegram pour commande ${orderId} (driver: ${driverId}) -> LIVRÉE`);
    
    // Récupérer le message Telegram stocké
    const telegramMsg = await storage.getTelegramMessageByOrderAndDriver(orderId, driverId);
    
    if (!telegramMsg) {
      console.log(`[TelegramUpdater] ⚠️ Aucun message Telegram trouvé pour commande ${orderId} et driver ${driverId}`);
      return;
    }

    // Récupérer les détails de la commande
    const order = await storage.getOrderById(orderId);
    if (!order) {
      console.error(`[TelegramUpdater] ❌ Commande ${orderId} non trouvée`);
      return;
    }

    // Récupérer les détails du restaurant
    const restaurant = await storage.getRestaurantById(order.restaurantId);
    if (!restaurant) {
      console.error(`[TelegramUpdater] ❌ Restaurant non trouvé pour commande ${orderId}`);
      return;
    }

    const DRIVER_COMMISSION_RATE = 0.15;
    const gain = (Number(order.totalPrice) * DRIVER_COMMISSION_RATE).toFixed(2);

    // Construire le message avec badge VISIBLE "✅ LIVRÉE"
    let restaurantAddress = restaurant.address || "";
    
    const message = `━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🟢 <b>✅ LIVRÉE</b> 🟢
━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📋 <b>Commande #${orderId.slice(0, 8).toUpperCase()}</b>

<b>👤 ${order.customerName}</b> - <b>💰 +${gain} TND</b>

🏪 <b>${restaurant.name}</b>
${restaurantAddress ? `📍 ${restaurantAddress}` : ''}

👤 <b>${order.customerName}</b>
📍 ${order.address}

<i>✅ Commande livrée avec succès</i>`;

    // Désactiver les boutons (la commande est livrée)
    const replyMarkup = {
      inline_keyboard: [] // Pas de boutons
    };

    // Modifier le message
    const result = await telegramService.editMessageText(
      telegramMsg.chatId,
      telegramMsg.messageId,
      message,
      {
        parseMode: 'HTML',
        replyMarkup: replyMarkup
      }
    );

    if (result.success) {
      // Mettre à jour le statut dans la DB
      await storage.updateTelegramMessageStatus(orderId, driverId, "delivered");
      console.log(`[TelegramUpdater] ✅ Message Telegram mis à jour avec succès (LIVRÉE)`);
    } else {
      console.error(`[TelegramUpdater] ❌ Erreur mise à jour message:`, result.error);
    }
  } catch (error: any) {
    console.error(`[TelegramUpdater] ❌ Erreur updateTelegramMessageToDelivered:`, error);
  }
}
