/**
 * API Client pour le feature Restaurant
 * Toutes les requêtes API liées aux restaurants
 */

import type { Restaurant } from "./restaurant.types";

const API_BASE = "/api";

/**
 * Récupère tous les restaurants
 */
export async function getRestaurants(): Promise<Restaurant[]> {
  try {
    const res = await fetch(`${API_BASE}/restaurants`);
    if (!res.ok) {
      const error = await res.json().catch(() => ({ error: `HTTP ${res.status}: ${res.statusText}` }));
      console.error('[Restaurant API] ❌ Erreur lors de la récupération des restaurants:', error);
      throw new Error(error.error || `Failed to fetch restaurants: ${res.status} ${res.statusText}`);
    }
    const data = await res.json();
    console.log('[Restaurant API] ✅ Restaurants récupérés:', data.length);
    return data;
  } catch (err) {
    console.error('[Restaurant API] ❌ Exception lors de la récupération des restaurants:', err);
    throw err;
  }
}

/**
 * Récupère un restaurant par ID
 */
export async function getRestaurantById(restaurantId: string): Promise<Restaurant> {
  const res = await fetch(`${API_BASE}/restaurants/${restaurantId}`);
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || "Failed to fetch restaurant");
  }
  return res.json();
}
