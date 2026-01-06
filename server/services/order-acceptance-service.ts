/**
 * Service centralisé pour l'acceptation de commandes par les livreurs
 * Centralise la logique métier pour éviter les duplications entre routes et websocket
 */

import { storage } from "../storage";
import { errorHandler } from "../errors";
import { sendN8nWebhook } from "../webhooks/n8n-webhook";
import type { Order } from "@shared/schema";

export interface AcceptOrderResult {
  order: Order;
  wasAlreadyAssigned: boolean;
}

export class OrderAcceptanceService {
  /**
   * Accepte une commande pour un livreur (atomique)
   * @param orderId ID de la commande
   * @param driverId ID du livreur
   * @returns Commande acceptée ou null si déjà assignée
   */
  static async acceptOrder(
    orderId: string,
    driverId: string
  ): Promise<Order | null> {
    console.log(`\n[OrderAcceptanceService] 📋 ========================================`);
    console.log(`[OrderAcceptanceService] 📋 DÉBUT ACCEPTATION COMMANDE`);
    console.log(`[OrderAcceptanceService]    Order ID: ${orderId}`);
    console.log(`[OrderAcceptanceService]    Driver ID: ${driverId}`);
    
    // 1. Vérifier l'existence de la commande
    const order = await storage.getOrderById(orderId);
    if (!order) {
      console.log(`[OrderAcceptanceService] ❌ Commande non trouvée`);
      console.log(`[OrderAcceptanceService] ========================================\n`);
      throw errorHandler.notFound("Order not found");
    }

    console.log(`[OrderAcceptanceService] ✅ Commande trouvée`);
    console.log(`[OrderAcceptanceService]    Statut actuel: ${order.status}`);
    console.log(`[OrderAcceptanceService]    Driver ID actuel: ${order.driverId || 'NULL'}`);

    // 2. Vérifier que le livreur existe
    const driver = await storage.getDriverById(driverId);
    if (!driver) {
      console.log(`[OrderAcceptanceService] ❌ Livreur non trouvé`);
      console.log(`[OrderAcceptanceService] ========================================\n`);
      throw errorHandler.notFound("Driver not found");
    }

    console.log(`[OrderAcceptanceService] ✅ Livreur trouvé: ${driver.name}`);

    // 3. Vérifier que la commande est disponible (received, accepted ou ready)
    if (order.status !== "received" && order.status !== "accepted" && order.status !== "ready") {
      console.log(`[OrderAcceptanceService] ❌ Statut invalide: ${order.status}`);
      console.log(`[OrderAcceptanceService]    Statuts acceptés: received, accepted, ready`);
      console.log(`[OrderAcceptanceService] ========================================\n`);
      throw errorHandler.badRequest(
        `Order status must be 'received', 'accepted' or 'ready', got '${order.status}'`
      );
    }

    // 4. Vérifier que la commande n'est pas déjà assignée à un autre livreur
    if (order.driverId && order.driverId !== driverId) {
      console.log(`[OrderAcceptanceService] ❌ Commande déjà assignée à un autre livreur`);
      console.log(`[OrderAcceptanceService]    Driver ID actuel: ${order.driverId}`);
      console.log(`[OrderAcceptanceService] ========================================\n`);
      throw errorHandler.badRequest(
        "Cette commande a déjà été prise par un autre livreur"
      );
    }

    console.log(`[OrderAcceptanceService] ✅ Validation OK, appel acceptOrderByDriver...`);

    // 5. Assigner la commande au livreur (atomique)
    const acceptedOrder = await storage.acceptOrderByDriver(orderId, driverId);

    if (!acceptedOrder) {
      console.log(`[OrderAcceptanceService] ❌ acceptOrderByDriver a retourné null`);
      console.log(`[OrderAcceptanceService]    La commande a peut-être été prise entre-temps`);
      console.log(`[OrderAcceptanceService] ========================================\n`);
      // La commande a été prise entre-temps par un autre livreur
      return null;
    }

    console.log(`[OrderAcceptanceService] ✅ Commande acceptée avec succès`);
    console.log(`[OrderAcceptanceService]    Statut final: ${acceptedOrder.status}`);
    console.log(`[OrderAcceptanceService]    Driver ID final: ${acceptedOrder.driverId}`);
    
    // ⚠️ ALERTE si le statut n'est pas "delivery"
    if (acceptedOrder.status !== 'delivery') {
      console.error(`[OrderAcceptanceService] ⚠️⚠️⚠️ ALERTE: Le statut devrait être "delivery" !`);
      console.error(`[OrderAcceptanceService]    Statut obtenu: ${acceptedOrder.status}`);
      console.error(`[OrderAcceptanceService]    Statut attendu: "delivery"`);
    }

    // 6. Déclencher les webhooks si nécessaire (non-bloquant)
    this.notifyOrderAccepted(acceptedOrder, driver).catch((error) => {
      console.error("[OrderAcceptanceService] Erreur notification (non-bloquant):", error);
    });

    console.log(`[OrderAcceptanceService] ========================================\n`);
    return acceptedOrder;
  }

  /**
   * Notifie les autres livreurs qu'une commande a été acceptée
   * @private
   */
  private static async notifyOrderAccepted(
    order: Order,
    driver: { id: string; name: string }
  ): Promise<void> {
    // Notifier les autres livreurs via WebSocket (si nécessaire)
    // Cette logique peut être étendue pour envoyer des notifications WebSocket
    // Pour l'instant, on se contente des webhooks n8n

    // Webhook n8n pour notification (optionnel, selon besoins)
    try {
      await sendN8nWebhook("order-accepted-by-driver", {
        orderId: order.id,
        driverId: driver.id,
        driverName: driver.name,
        restaurantId: order.restaurantId,
        customerName: order.customerName,
        address: order.address,
      });
    } catch (error) {
      // Non-bloquant, on log juste l'erreur
      console.error("[OrderAcceptanceService] Erreur webhook order-accepted:", error);
    }
  }
}

