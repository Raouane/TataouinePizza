/**
 * Service de gestion des commandes
 * Centralise la logique de mise à jour de statut pour éviter les duplications
 * 
 * Workflow MVP simplifié:
 * - PENDING → ACCEPTED (restaurant accepte)
 * - ACCEPTED → READY (restaurant marque prêt)
 * - READY → DELIVERY (livreur récupère)
 * - DELIVERY → DELIVERED (livreur livre)
 */

import { storage } from "../storage";
import { errorHandler } from "../errors";
import { OrderStatus, ORDER_STATUS_RULES, canTransitionTo } from "../types/order-status";
import { sendN8nWebhook } from "../webhooks/n8n-webhook";
import { OrderEnrichmentService } from "./order-enrichment-service";
import type { Order } from "@shared/schema";

export interface OrderActor {
  type: "restaurant" | "driver" | "admin" | "webhook";
  id?: string;
}

export class OrderService {
  /**
   * Met à jour le statut d'une commande avec validation complète
   * @param orderId ID de la commande
   * @param newStatus Nouveau statut
   * @param actor Acteur effectuant la transition (rôle + ID optionnel)
   * @returns Commande mise à jour
   */
  static async updateStatus(
    orderId: string,
    newStatus: OrderStatus | string,
    actor: OrderActor
  ): Promise<Order> {
    console.log(`\n[OrderService] 🔄 ========================================`);
    console.log(`[OrderService] 🔄 MISE À JOUR STATUT VIA OrderService`);
    console.log(`[OrderService]    Order ID: ${orderId}`);
    console.log(`[OrderService]    Nouveau statut: ${newStatus}`);
    console.log(`[OrderService]    Acteur: ${actor.type}${actor.id ? ` (ID: ${actor.id})` : ''}`);
    
    // 1. Vérifier l'existence de la commande
    const order = await storage.getOrderById(orderId);
    if (!order) {
      console.log(`[OrderService] ❌ Commande non trouvée`);
      console.log(`[OrderService] ========================================\n`);
      throw errorHandler.notFound("Order not found");
    }

    console.log(`[OrderService] ✅ Commande trouvée`);
    console.log(`[OrderService]    Statut actuel: ${order.status}`);
    console.log(`[OrderService]    Driver ID: ${order.driverId || 'NULL'}`);

    // 2. Valider la transition selon le rôle
    const currentStatus = order.status || OrderStatus.PENDING;
    console.log(`[OrderService]    Validation transition: ${currentStatus} → ${newStatus} (acteur: ${actor.type})`);
    
    if (!canTransitionTo(currentStatus, newStatus, actor.type)) {
      console.log(`[OrderService] ❌ Transition invalide`);
      console.log(`[OrderService] ========================================\n`);
      throw errorHandler.badRequest(
        `Invalid status transition: cannot change from '${currentStatus}' to '${newStatus}' as ${actor.type}`
      );
    }

    console.log(`[OrderService] ✅ Transition validée`);

    // 3. Vérifier l'appartenance (si nécessaire)
    if (actor.type === "restaurant") {
      if (!actor.id) {
        throw errorHandler.unauthorized("Restaurant ID required");
      }
      if (order.restaurantId !== actor.id) {
        throw errorHandler.forbidden("Order not for this restaurant");
      }
    }

    if (actor.type === "driver") {
      if (!actor.id) {
        throw errorHandler.unauthorized("Driver ID required");
      }
      if (order.driverId && order.driverId !== actor.id) {
        throw errorHandler.forbidden("Order not assigned to you");
      }
    }

    // 4. Mettre à jour le statut
    console.log(`[OrderService]    Appel storage.updateOrderStatus...`);
    const updatedOrder = await storage.updateOrderStatus(orderId, newStatus);

    console.log(`[OrderService] ✅ Statut mis à jour`);
    console.log(`[OrderService]    Statut final: ${updatedOrder.status}`);
    
    // ⚠️ ALERTE si le statut passe directement à "delivered" sans passer par "delivery"
    if (newStatus === 'delivered' && currentStatus !== 'delivery' && currentStatus !== 'delivered') {
      console.error(`\n[OrderService] ⚠️⚠️⚠️ ALERTE: STATUT PASSE DIRECTEMENT À "delivered" ⚠️⚠️⚠️`);
      console.error(`[OrderService]    Ancien statut: ${currentStatus}`);
      console.error(`[OrderService]    Nouveau statut: ${newStatus}`);
      console.error(`[OrderService]    ⚠️ Le statut devrait passer par "delivery" avant "delivered" !`);
      console.error(`[OrderService] ⚠️⚠️⚠️ ========================================\n`);
    }

    // 5. Déclencher les webhooks si nécessaire (non-bloquant)
    this.triggerWebhooks(updatedOrder, newStatus as OrderStatus).catch((error) => {
      console.error("[OrderService] Erreur webhook (non-bloquant):", error);
    });

    console.log(`[OrderService] ========================================\n`);
    return updatedOrder;
  }

  /**
   * Déclenche les webhooks n8n selon le statut
   * @private
   */
  private static async triggerWebhooks(
    order: Order,
    status: OrderStatus
  ): Promise<void> {
    if (status === OrderStatus.READY) {
      // Utiliser le service d'enrichissement pour éviter les duplications
      const enrichedOrder = await OrderEnrichmentService.enrichWithRestaurant(order);
      await sendN8nWebhook("order-ready", {
        orderId: order.id,
        restaurantId: order.restaurantId,
        restaurantName: enrichedOrder.restaurantName || "Restaurant",
        restaurantAddress: enrichedOrder.restaurantAddress || "",
        client: {
          name: order.customerName,
          phone: order.phone,
          address: order.address,
          lat: enrichedOrder.customerLat,
          lng: enrichedOrder.customerLng,
        },
        total: order.totalPrice.toString(),
      });
    } else if (status === OrderStatus.DELIVERY) {
      // Utiliser le service d'enrichissement pour éviter les duplications
      const enrichedOrder = await OrderEnrichmentService.enrichWithDriver(order);
      await sendN8nWebhook("order-picked-up", {
        orderId: order.id,
        driverId: order.driverId || "",
        driverName: enrichedOrder.driverName || "Livreur",
        client: {
          name: order.customerName,
          phone: order.phone,
          address: order.address,
        },
      });
    } else if (status === OrderStatus.DELIVERED) {
      // Utiliser le service d'enrichissement pour éviter les duplications
      const enrichedOrder = await OrderEnrichmentService.enrichWithDriver(order);
      await sendN8nWebhook("order-delivered", {
        orderId: order.id,
        driverId: order.driverId || "",
        driverName: enrichedOrder.driverName || "Livreur",
        total: order.totalPrice.toString(),
        client: {
          name: order.customerName,
          phone: order.phone,
        },
      });
    }
  }
}

