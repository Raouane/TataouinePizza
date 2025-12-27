/**
 * Service centralisé pour l'enrichissement des commandes
 * Centralise la récupération des restaurants/drivers et la conversion GPS
 * pour éviter les duplications et améliorer les performances
 */

import { storage } from "../storage";
import { parseGpsCoordinate } from "../utils/gps-utils";
import type { Order } from "@shared/schema";
import type { Restaurant } from "@shared/schema";
import type { Driver } from "@shared/schema";

export interface EnrichedOrder extends Omit<Order, 'customerLat' | 'customerLng'> {
  restaurantName?: string;
  restaurantAddress?: string;
  driverName?: string;
  customerLat?: number | null | undefined;
  customerLng?: number | null | undefined;
}

/**
 * Cache simple pour éviter les requêtes répétées de restaurants
 * TTL: 5 minutes
 */
class RestaurantCache {
  private cache = new Map<string, { restaurant: Restaurant; timestamp: number }>();
  private readonly TTL = 5 * 60 * 1000; // 5 minutes

  get(restaurantId: string): Restaurant | null {
    const cached = this.cache.get(restaurantId);
    if (!cached) return null;
    
    const isExpired = Date.now() - cached.timestamp > this.TTL;
    if (isExpired) {
      this.cache.delete(restaurantId);
      return null;
    }
    
    return cached.restaurant;
  }

  set(restaurantId: string, restaurant: Restaurant): void {
    this.cache.set(restaurantId, {
      restaurant,
      timestamp: Date.now(),
    });
  }

  clear(): void {
    this.cache.clear();
  }
}

const restaurantCache = new RestaurantCache();

export class OrderEnrichmentService {
  /**
   * Convertit une coordonnée GPS (string ou number) en number
   * @deprecated Utiliser parseGpsCoordinate de gps-utils.ts directement
   * Conservé pour compatibilité ascendante
   */
  static parseGpsCoordinate(value: string | number | null | undefined): number | null {
    return parseGpsCoordinate(value);
  }

  /**
   * Enrichit une commande avec les informations du restaurant
   * @param order Commande à enrichir
   * @returns Commande enrichie avec restaurantName et restaurantAddress
   */
  static async enrichWithRestaurant(order: Order): Promise<EnrichedOrder> {
    // Vérifier le cache d'abord
    let restaurant = restaurantCache.get(order.restaurantId);
    
    if (!restaurant) {
      restaurant = (await storage.getRestaurantById(order.restaurantId)) || null;
      if (restaurant) {
        restaurantCache.set(order.restaurantId, restaurant);
      }
    }

    return {
      ...order,
      restaurantName: restaurant?.name || "Restaurant",
      restaurantAddress: restaurant?.address || "",
      customerLat: parseGpsCoordinate(order.customerLat),
      customerLng: parseGpsCoordinate(order.customerLng),
    };
  }

  /**
   * Enrichit une commande avec les informations du livreur
   * @param order Commande à enrichir
   * @returns Commande enrichie avec driverName
   */
  static async enrichWithDriver(order: Order): Promise<EnrichedOrder> {
    let driver: Driver | undefined;
    
    if (order.driverId) {
      driver = await storage.getDriverById(order.driverId);
    }

    return {
      ...order,
      driverName: driver?.name || undefined,
      customerLat: parseGpsCoordinate(order.customerLat),
      customerLng: parseGpsCoordinate(order.customerLng),
    };
  }

  /**
   * Enrichit une commande avec restaurant ET livreur
   * @param order Commande à enrichir
   * @returns Commande enrichie complètement
   */
  static async enrichOrder(order: Order): Promise<EnrichedOrder> {
    // Enrichir avec restaurant
    const enriched = await this.enrichWithRestaurant(order);
    
    // Enrichir avec driver si présent
    if (order.driverId) {
      const driver = await storage.getDriverById(order.driverId);
      enriched.driverName = driver?.name;
    }

    return enriched;
  }

  /**
   * Enrichit plusieurs commandes avec les restaurants (optimisé)
   * Utilise un cache et récupère tous les restaurants en une seule fois
   * @param orders Commandes à enrichir
   * @returns Commandes enrichies
   */
  static async enrichOrders(orders: Order[]): Promise<EnrichedOrder[]> {
    // Récupérer tous les restaurants nécessaires (avec cache)
    const restaurantIds = Array.from(new Set(orders.map(o => o.restaurantId).filter(Boolean) as string[]));
    const restaurantsMap = new Map<string, Restaurant>();

    // Récupérer les restaurants (en utilisant le cache quand possible)
    for (const restaurantId of restaurantIds) {
      let restaurant = restaurantCache.get(restaurantId);
      if (!restaurant) {
        restaurant = (await storage.getRestaurantById(restaurantId)) || null;
        if (restaurant) {
          restaurantCache.set(restaurantId, restaurant);
        }
      }
      if (restaurant) {
        restaurantsMap.set(restaurantId, restaurant);
      }
    }

    // Enrichir chaque commande
    return orders.map(order => {
      const restaurant = restaurantsMap.get(order.restaurantId);
      return {
        ...order,
        restaurantName: restaurant?.name || "Restaurant",
        restaurantAddress: restaurant?.address || "",
        customerLat: this.parseGpsCoordinate(order.customerLat),
        customerLng: this.parseGpsCoordinate(order.customerLng),
      };
    });
  }

  /**
   * Vide le cache des restaurants (utile pour les tests ou après modifications)
   */
  static clearCache(): void {
    restaurantCache.clear();
  }
}

