/**
 * WebSocket events pour le module Order (V2)
 * Gère uniquement les événements WebSocket liés aux commandes
 */

import { notifyDriversOfNewOrder } from "../../../websocket";
import type { OrderNotificationPayload } from "./order.types";

export class OrderWebSocket {
  /**
   * Notifie les livreurs d'une nouvelle commande
   */
  static async notifyDrivers(payload: OrderNotificationPayload): Promise<void> {
    try {
      await notifyDriversOfNewOrder(payload);
    } catch (error) {
      console.error("[OrderWebSocket] Erreur notification WebSocket:", error);
      // Non-bloquant : on continue même si WebSocket échoue
    }
  }
}
