/**
 * API Client pour le feature Order (V2)
 * Toutes les requêtes API liées aux commandes
 */

import type { Order } from "@shared/schema";
import type { CreateOrderInput, CreateOrderResult } from "./order.types";

const API_BASE = "/api";

/**
 * Crée une nouvelle commande
 */
export async function createOrder(input: CreateOrderInput): Promise<CreateOrderResult> {
  console.log('[Order API] 🚀 createOrder appelé avec:', {
    restaurantId: input.restaurantId,
    itemsCount: input.items.length,
    customerName: input.customerName,
    phone: input.phone
  });

  try {
    const url = `${API_BASE}/orders`;
    console.log('[Order API] 📡 Envoi POST vers:', url);

    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });

    console.log('[Order API] 📡 Réponse reçue:', {
      status: res.status,
      statusText: res.statusText,
      ok: res.ok
    });

    if (!res.ok) {
      const error = await res.json();
      console.error('[Order API] ❌ Erreur création commande:', error);
      throw new Error(error.error || "Failed to create order");
    }

    const result = await res.json();
    console.log('[Order API] ✅ Commande créée avec succès:', result);
    return result;
  } catch (error: any) {
    console.error('[Order API] ❌ Exception lors de la création:', error);
    throw error;
  }
}

/**
 * Récupère une commande par ID
 */
export async function getOrder(orderId: string): Promise<Order> {
  const res = await fetch(`${API_BASE}/orders/${orderId}`);
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || "Failed to fetch order");
  }
  return res.json();
}

/**
 * Récupère les commandes d'un client par téléphone
 */
export async function getCustomerOrders(phone: string): Promise<Order[]> {
  const res = await fetch(`${API_BASE}/orders/customer/${phone}`);
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || "Failed to fetch orders");
  }
  return res.json();
}
