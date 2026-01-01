/**
 * Storage layer pour le module Order (V2)
 * Couche d'accès aux données - SQL/ORM uniquement
 * Pas de logique métier ici
 */

import { storage } from "../../../storage";
import type { Order, OrderItem, orders } from "@shared/schema";
import type { CreateOrderInput } from "./order.types";

export class OrderStorage {
  /**
   * Crée une commande avec ses items (transactionnel)
   */
  static async createOrderWithItems(
    orderData: typeof orders.$inferInsert,
    items: Array<{
      pizzaId: string;
      size: "small" | "medium" | "large";
      quantity: number;
      pricePerUnit: string;
    }>,
    duplicateCheck?: {
      phone: string;
      restaurantId: string;
      totalPrice: string;
      withinSeconds: number;
    }
  ): Promise<Order | null> {
    return storage.createOrderWithItems(orderData, items, duplicateCheck);
  }

  /**
   * Récupère une commande par ID
   */
  static async getById(orderId: string): Promise<Order | undefined> {
    return storage.getOrderById(orderId);
  }

  /**
   * Récupère une commande par clientOrderId
   */
  static async getByClientOrderId(clientOrderId: string): Promise<Order | undefined> {
    return storage.getOrderByClientOrderId(clientOrderId);
  }

  /**
   * Récupère les commandes d'un client par téléphone
   */
  static async getByPhone(phone: string): Promise<Order[]> {
    return storage.getOrdersByPhone(phone);
  }

  /**
   * Récupère les items d'une commande
   */
  static async getItems(orderId: string): Promise<OrderItem[]> {
    return storage.getOrderItems(orderId);
  }

  /**
   * Met à jour le statut d'une commande
   */
  static async updateStatus(orderId: string, status: string): Promise<Order> {
    return storage.updateOrderStatus(orderId, status);
  }

  /**
   * Assigne une commande à un livreur
   */
  static async assignToDriver(orderId: string, driverId: string): Promise<Order> {
    return storage.assignOrderToDriver(orderId, driverId);
  }

  /**
   * Récupère une commande dupliquée récente
   */
  static async getRecentDuplicate(
    phone: string,
    restaurantId: string,
    totalPrice: string,
    withinSeconds: number
  ): Promise<Order | undefined> {
    return storage.getRecentDuplicateOrder(phone, restaurantId, totalPrice, withinSeconds);
  }
}
