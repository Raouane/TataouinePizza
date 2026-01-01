/**
 * Types pour le module Order (V2)
 * Contrats partagés entre routes, services et storage
 */

import type { Order } from "@shared/schema";
import type { OrderStatus } from "../../../types/order-status";

export interface CreateOrderInput {
  restaurantId: string;
  customerName: string;
  phone: string;
  address: string;
  addressDetails?: string;
  customerLat?: number;
  customerLng?: number;
  clientOrderId?: string;
  items: Array<{
    pizzaId: string;
    size: "small" | "medium" | "large";
    quantity: number;
  }>;
  paymentMethod?: string;
  notes?: string;
}

export interface CreateOrderResult {
  orderId: string;
  totalPrice: number;
  duplicate?: boolean;
}

export interface OrderWithItems extends Order {
  items?: Array<{
    id: string;
    pizzaId: string;
    pizza?: {
      id: string;
      name: string;
      description?: string;
      imageUrl?: string;
    };
    size: string;
    quantity: number;
    pricePerUnit: string;
  }>;
}

export interface OrderNotificationPayload {
  type: "new_order";
  orderId: string;
  restaurantName: string;
  customerName: string;
  address: string;
  customerLat?: string | number;
  customerLng?: string | number;
  totalPrice: string;
  items: Array<{ name: string; size: string; quantity: number }>;
}

export interface OrderActor {
  type: "restaurant" | "driver" | "admin" | "webhook";
  id?: string;
}

export interface UpdateOrderStatusInput {
  orderId: string;
  newStatus: OrderStatus | string;
  actor: OrderActor;
}
