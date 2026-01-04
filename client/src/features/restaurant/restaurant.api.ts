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
  const res = await fetch(`${API_BASE}/restaurants`);
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || "Failed to fetch restaurants");
  }
  return res.json();
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
