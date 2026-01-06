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
      console.log(`\n[API] 🏪 ========================================`);
      console.log(`[API] 🏪 RÉCUPÉRATION DES RESTAURANTS`);
      console.log(`[API] 🏪 ========================================`);
      
      const restaurants = await storage.getAllRestaurants();
      console.log(`[API] 📦 ${restaurants.length} restaurants trouvés dans la base de données`);
      
      // Enrichir avec le statut calculé côté serveur pour cohérence
      const restaurantsWithStatus = restaurants.map(restaurant => {
        const status = checkRestaurantStatus(restaurant);
        
        // Logs pour chaque restaurant
        const hasImage = !!(restaurant.imageUrl && restaurant.imageUrl.trim() !== '');
        if (hasImage) {
          console.log(`[API] ✅ Restaurant "${restaurant.name}"`);
          console.log(`[API]    ID: ${restaurant.id}`);
          console.log(`[API]    imageUrl: ${restaurant.imageUrl}`);
        } else {
          console.log(`[API] ❌ Restaurant "${restaurant.name}" - PAS D'IMAGE`);
          console.log(`[API]    ID: ${restaurant.id}`);
          console.log(`[API]    imageUrl: ${restaurant.imageUrl || 'null'}`);
        }
        
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
      
      const withImages = restaurantsWithStatus.filter(r => r.imageUrl && r.imageUrl.trim() !== '').length;
      const withoutImages = restaurantsWithStatus.filter(r => !r.imageUrl || r.imageUrl.trim() === '').length;
      
      console.log(`[API] 🏪 ========================================`);
      console.log(`[API] 📊 RÉSUMÉ RESTAURANTS ENVOYÉS:`);
      console.log(`[API]    Total restaurants: ${restaurantsWithStatus.length}`);
      console.log(`[API]    ✅ Avec images: ${withImages}`);
      console.log(`[API]    ❌ Sans images: ${withoutImages}`);
      console.log(`[API] 🏪 ========================================\n`);
      
      res.json(restaurantsWithStatus);
    } catch (error) {
      console.error("[API] ❌ ERREUR GET /api/restaurants:", error);
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
      console.log(`\n[API] 🍕 ========================================`);
      console.log(`[API] 🍕 RÉCUPÉRATION DU MENU`);
      console.log(`[API] 🍕 Restaurant ID: ${restaurantId}`);
      console.log(`[API] 🍕 ========================================`);
      
      const pizzas = await storage.getPizzasByRestaurant(restaurantId);
      console.log(`[API] 📦 ${pizzas.length} produits trouvés dans la base de données`);
      
      if (pizzas.length === 0) {
        console.log(`[API] ⚠️  AUCUN PRODUIT TROUVÉ pour le restaurant ${restaurantId}`);
      }
      
      const pizzasWithPrices = await Promise.all(
        pizzas.map(async (pizza) => {
          const prices = await storage.getPizzaPrices(pizza.id);
          const productWithPrices = { ...pizza, prices };
          
          // Logs détaillés pour chaque produit
          const hasImage = !!(pizza.imageUrl && pizza.imageUrl.trim() !== '');
          if (hasImage) {
            console.log(`[API] ✅ Produit "${pizza.name}"`);
            console.log(`[API]    ID: ${pizza.id}`);
            console.log(`[API]    imageUrl: ${pizza.imageUrl}`);
            console.log(`[API]    Prix: ${prices.length} tailles`);
          } else {
            console.log(`[API] ❌ Produit "${pizza.name}" - PAS D'IMAGE`);
            console.log(`[API]    ID: ${pizza.id}`);
            console.log(`[API]    imageUrl: ${pizza.imageUrl || 'null'}`);
            console.log(`[API]    Prix: ${prices.length} tailles`);
          }
          
          return productWithPrices;
        })
      );
      
      const withImages = pizzasWithPrices.filter(p => p.imageUrl && p.imageUrl.trim() !== '').length;
      const withoutImages = pizzasWithPrices.filter(p => !p.imageUrl || p.imageUrl.trim() === '').length;
      
      console.log(`[API] 🍕 ========================================`);
      console.log(`[API] 📊 RÉSUMÉ MENU ENVOYÉ:`);
      console.log(`[API]    Total produits: ${pizzasWithPrices.length}`);
      console.log(`[API]    ✅ Avec images: ${withImages}`);
      console.log(`[API]    ❌ Sans images: ${withoutImages}`);
      console.log(`[API] 🍕 ========================================\n`);
      
      res.json(pizzasWithPrices);
    } catch (error) {
      console.error(`[API] ❌ ERREUR lors de la récupération du menu pour ${req.params.id}:`, error);
      res.status(500).json({ error: "Failed to fetch menu" });
    }
  });
}
