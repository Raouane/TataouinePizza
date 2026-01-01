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
    // 1. Vérifier l'existence de la commande
    const order = await storage.getOrderById(orderId);
    if (!order) {
      throw errorHandler.notFound("Order not found");
    }

    // 2. Vérifier que le livreur existe
    const driver = await storage.getDriverById(driverId);
    if (!driver) {
      throw errorHandler.notFound("Driver not found");
    }

    // 3. Vérifier que la commande est disponible (received, accepted ou ready)
    if (order.status !== "received" && order.status !== "accepted" && order.status !== "ready") {
      throw errorHandler.badRequest(
        `Order status must be 'received', 'accepted' or 'ready', got '${order.status}'`
      );
    }

    // 4. Vérifier que la commande n'est pas déjà assignée à un autre livreur
    if (order.driverId && order.driverId !== driverId) {
      throw errorHandler.badRequest(
        "Cette commande a déjà été prise par un autre livreur"
      );
    }

    // 5. Assigner la commande au livreur (atomique)
    const acceptedOrder = await storage.acceptOrderByDriver(orderId, driverId);

    if (!acceptedOrder) {
      // La commande a été prise entre-temps par un autre livreur
      return null;
    }

    // 6. Déclencher les webhooks si nécessaire (non-bloquant)
    this.notifyOrderAccepted(acceptedOrder, driver).catch((error) => {
      console.error("[OrderAcceptanceService] Erreur notification (non-bloquant):", error);
    });

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

