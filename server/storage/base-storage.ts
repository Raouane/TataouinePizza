import type { Restaurant } from "@shared/schema";

/**
 * Classe de base pour les modules de storage
 * Contient les méthodes helper communes utilisées par tous les modules
 */
export abstract class BaseStorage {
  /**
   * Logger avec niveaux (skip debug en production)
   */
  protected log(level: 'debug' | 'info' | 'error', message: string, data?: any): void {
    if (process.env.NODE_ENV === "production" && level === 'debug') {
      return; // Skip debug logs in production
    }
    const prefix = `[DB] ${level.toUpperCase()}`;
    if (data) {
      console[level === 'error' ? 'error' : 'log'](`${prefix} ${message}`, data);
    } else {
      console[level === 'error' ? 'error' : 'log'](`${prefix} ${message}`);
    }
  }

  /**
   * Parse isOpen depuis raw SQL (gère bug Neon HTTP)
   */
  protected parseIsOpen(rawValue: any, restaurantName?: string): boolean {
    try {
      if (rawValue === 'true' || rawValue === 't' || rawValue === true || rawValue === 1) {
        return true;
      } else if (rawValue === 'false' || rawValue === 'f' || rawValue === false || rawValue === 0) {
        return false;
      } else {
        if (process.env.NODE_ENV !== "production") {
          this.log('debug', `Valeur is_open_text inattendue${restaurantName ? ` pour ${restaurantName}` : ''}: "${rawValue}", défaut à true`);
        }
        return true;
      }
    } catch (e) {
      this.log('error', `Erreur parsing is_open${restaurantName ? ` pour ${restaurantName}` : ''}`, e);
      return true; // Par défaut, considérer ouvert
    }
  }

  /**
   * Parse categories depuis raw SQL (support JSONB + string JSON)
   */
  protected parseCategories(rawCategories: any, restaurantName?: string): string[] | null {
    try {
      if (!rawCategories) return null;
      
      if (Array.isArray(rawCategories)) {
        return rawCategories;
      } else if (typeof rawCategories === 'string') {
        const parsed = JSON.parse(rawCategories);
        return Array.isArray(parsed) ? parsed : null;
      } else if (typeof rawCategories === 'object') {
        return Array.isArray(rawCategories) ? rawCategories : null;
      }
      
      return null;
    } catch (e) {
      if (process.env.NODE_ENV !== "production") {
        this.log('debug', `Erreur parsing categories${restaurantName ? ` pour ${restaurantName}` : ''}`, e);
      }
      return null;
    }
  }

  /**
   * Parse openingHours depuis raw SQL
   */
  protected parseOpeningHours(rawValue: any): string | null {
    try {
      if (!rawValue) return null;
      
      if (typeof rawValue === 'string') {
        const trimmed = rawValue.trim();
        return trimmed === '' ? null : trimmed;
      } else {
        const str = String(rawValue).trim();
        return str === '' ? null : str;
      }
    } catch (e) {
      return null;
    }
  }

  /**
   * Construire un Restaurant depuis raw SQL row
   */
  protected buildRestaurantFromRow(row: any): Restaurant {
    console.log("[BUILD] 🏗️ buildRestaurantFromRow - Début construction restaurant");
    console.log("[BUILD] 📋 Row reçue:", {
      id: row.id,
      name: row.name,
      phone: row.phone,
      hasPassword: !!row.password,
      passwordType: typeof row.password,
      passwordValue: row.password ? row.password.substring(0, 20) + "..." : "NULL",
      allKeys: Object.keys(row)
    });
    
    const categories = this.parseCategories(row.categories, row.name);
    const isOpen = this.parseIsOpen(row.is_open_text, row.name);
    const openingHours = this.parseOpeningHours(row.opening_hours);
    
    const passwordValue = row.password || null;
    console.log("[BUILD] 🔐 Password extrait:", {
      hasPassword: !!passwordValue,
      passwordType: typeof passwordValue,
      passwordValue: passwordValue ? passwordValue.substring(0, 20) + "..." : "NULL"
    });

    const restaurant = {
      id: row.id,
      name: row.name,
      phone: row.phone,
      password: passwordValue,
      address: row.address,
      description: row.description || null,
      imageUrl: row.image_url || null,
      categories: categories || null,
      isOpen: Boolean(isOpen),
      openingHours: openingHours,
      deliveryTime: row.delivery_time || 30,
      minOrder: row.min_order || "0",
      rating: row.rating || "4.5",
      orderType: row.order_type || "online",
      lat: row.lat ? (typeof row.lat === 'string' ? parseFloat(row.lat) : row.lat) : null,
      lng: row.lng ? (typeof row.lng === 'string' ? parseFloat(row.lng) : row.lng) : null,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    } as Restaurant;
    
    console.log("[BUILD] ✅ Restaurant construit:", {
      id: restaurant.id,
      name: restaurant.name,
      phone: restaurant.phone,
      hasPassword: !!restaurant.password,
      passwordType: typeof restaurant.password,
      passwordValue: restaurant.password ? restaurant.password.substring(0, 20) + "..." : "NULL"
    });
    
    return restaurant;
  }
}
