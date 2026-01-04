/**
 * Routes publiques pour les restaurants
 */

import type { Express, Request, Response } from "express";
import { storage } from "../../storage";
import { checkRestaurantStatus } from "../../utils/restaurant-status";

/**
 * Enregistre les routes publiques pour les restaurants
 * 
 * Routes :
 * - GET /api/restaurants - Liste de tous les restaurants
 * - GET /api/restaurants/:id - Détails d'un restaurant
 * - GET /api/restaurants/:id/menu - Menu d'un restaurant
 */
export function registerRestaurantsRoutes(app: Express): void {
  /**
   * GET /api/restaurants
   * Liste de tous les restaurants avec leur statut calculé
   */
  app.get("/api/restaurants", async (req: Request, res: Response) => {
    try {
      const restaurants = await storage.getAllRestaurants();
      
      // Enrichir avec le statut calculé côté serveur pour cohérence
      const restaurantsWithStatus = restaurants.map(restaurant => {
        const status = checkRestaurantStatus(restaurant);
        
        const normalized = {
          id: restaurant.id,
          name: restaurant.name,
          phone: restaurant.phone,
          address: restaurant.address,
          description: restaurant.description || null,
          imageUrl: restaurant.imageUrl || null,
          categories: Array.isArray(restaurant.categories) 
            ? restaurant.categories 
            : (typeof restaurant.categories === 'string' 
                ? (() => { try { return JSON.parse(restaurant.categories); } catch { return null; } })()
                : null),
          isOpen: Boolean(restaurant.isOpen),
          openingHours: restaurant.openingHours || null,
          deliveryTime: restaurant.deliveryTime || 30,
          minOrder: restaurant.minOrder || "0",
          rating: restaurant.rating || "4.5",
          createdAt: restaurant.createdAt,
          updatedAt: restaurant.updatedAt,
          computedStatus: status
        };
        
        return normalized;
      });
      
      res.json(restaurantsWithStatus);
    } catch (error) {
      console.error("[API] Erreur GET /api/restaurants:", error);
      res.status(500).json({ error: "Failed to fetch restaurants" });
    }
  });
  
  /**
   * GET /api/restaurants/:id
   * Détails d'un restaurant spécifique
   */
  app.get("/api/restaurants/:id", async (req: Request, res: Response) => {
    try {
      const restaurant = await storage.getRestaurantById(req.params.id);
      if (!restaurant) return res.status(404).json({ error: "Restaurant not found" });
      
      const restaurantWithStatus = {
        ...restaurant,
        computedStatus: checkRestaurantStatus(restaurant)
      };
      
      res.json(restaurantWithStatus);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch restaurant" });
    }
  });
  
  /**
   * GET /api/restaurants/:id/menu
   * Menu d'un restaurant (pizzas avec prix)
   */
  app.get("/api/restaurants/:id/menu", async (req: Request, res: Response) => {
    try {
      const restaurantId = req.params.id;
      if (process.env.NODE_ENV !== "production") {
        console.log(`[API] Récupération du menu pour le restaurant: ${restaurantId}`);
      }
      
      const pizzas = await storage.getPizzasByRestaurant(restaurantId);
      if (process.env.NODE_ENV !== "production") {
        console.log(`[API] ${pizzas.length} produits trouvés pour le restaurant ${restaurantId}`);
      }
      
      const pizzasWithPrices = await Promise.all(
        pizzas.map(async (pizza) => {
          const prices = await storage.getPizzaPrices(pizza.id);
          const productWithPrices = { ...pizza, prices };
          
          if (process.env.NODE_ENV !== "production") {
            const hasImage = !!(pizza.imageUrl && pizza.imageUrl.trim() !== '');
            if (hasImage) {
              console.log(`[API] ✅ Produit "${pizza.name}" - imageUrl: ${pizza.imageUrl}`);
            } else {
              console.log(`[API] ❌ Produit "${pizza.name}" - PAS D'IMAGE (imageUrl: ${pizza.imageUrl || 'null'})`);
            }
          }
          
          return productWithPrices;
        })
      );
      
      if (process.env.NODE_ENV !== "production") {
        const withImages = pizzasWithPrices.filter(p => p.imageUrl && p.imageUrl.trim() !== '').length;
        const withoutImages = pizzasWithPrices.filter(p => !p.imageUrl || p.imageUrl.trim() === '').length;
        
        console.log(`[API] ========================================`);
        console.log(`[API] 📊 MENU ENVOYÉ: ${pizzasWithPrices.length} produits`);
        console.log(`[API] ✅ Avec images: ${withImages}`);
        console.log(`[API] ❌ Sans images: ${withoutImages}`);
        console.log(`[API] ========================================`);
      }
      
      res.json(pizzasWithPrices);
    } catch (error) {
      console.error("[API] Erreur lors de la récupération du menu:", error);
      res.status(500).json({ error: "Failed to fetch menu" });
    }
  });
}
