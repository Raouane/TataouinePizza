/**
 * Routes publiques pour les pizzas
 */

import type { Express, Request, Response } from "express";
import { storage } from "../../storage";

/**
 * Enregistre les routes publiques pour les pizzas
 * 
 * Routes :
 * - GET /api/pizzas - Liste de toutes les pizzas (avec recherche optionnelle)
 * - GET /api/pizzas/:id - Détails d'une pizza
 */
export function registerPizzasRoutes(app: Express): void {
  /**
   * GET /api/pizzas
   * Liste de toutes les pizzas avec leurs prix
   * Query param: ?search=terme - Recherche par nom, description ou catégorie
   */
  app.get("/api/pizzas", async (req: Request, res: Response) => {
    try {
      const searchQuery = req.query.search as string | undefined;
      console.log(`[API] GET /api/pizzas - search: "${searchQuery}"`);
      
      let allPizzas = await storage.getAllPizzas();
      console.log(`[API] ${allPizzas.length} pizzas récupérées`);
      
      if (searchQuery && searchQuery.trim().length > 0) {
        const query = searchQuery.toLowerCase();
        allPizzas = allPizzas.filter(pizza => 
          pizza.name.toLowerCase().includes(query) ||
          pizza.description?.toLowerCase().includes(query) ||
          pizza.category?.toLowerCase().includes(query)
        );
        console.log(`[API] ${allPizzas.length} pizzas après filtrage`);
      }
      
      const pizzasWithPrices = await Promise.all(
        allPizzas.map(async (pizza) => {
          try {
            const prices = await storage.getPizzaPrices(pizza.id);
            return { ...pizza, prices };
          } catch (priceError: any) {
            console.error(`[API] Erreur récupération prix pour ${pizza.id}:`, priceError.message);
            return { ...pizza, prices: [] };
          }
        })
      );
      
      console.log(`[API] ✅ Retour de ${pizzasWithPrices.length} pizzas avec prix`);
      res.json(pizzasWithPrices);
    } catch (error: any) {
      console.error("[API] ❌ Erreur GET /api/pizzas:", error);
      console.error("[API] Stack:", error.stack);
      res.status(500).json({ 
        error: "Failed to fetch pizzas",
        message: error.message || "Unknown error"
      });
    }
  });

  /**
   * GET /api/pizzas/:id
   * Détails d'une pizza spécifique avec ses prix
   */
  app.get("/api/pizzas/:id", async (req: Request, res: Response) => {
    try {
      const pizza = await storage.getPizzaById(req.params.id);
      if (!pizza) return res.status(404).json({ error: "Pizza not found" });
      const prices = await storage.getPizzaPrices(pizza.id);
      res.json({ ...pizza, prices });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch pizza" });
    }
  });
}
