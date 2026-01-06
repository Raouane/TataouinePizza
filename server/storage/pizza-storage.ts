import { db } from "../db.js";
import { pizzas, pizzaPrices, type Pizza, type PizzaPrice, type InsertPizzaPrice, insertPizzaPriceSchema } from "../../shared/schema.js";
import { eq, and, inArray, sql } from "drizzle-orm";
import { randomUUID } from "crypto";
import type { z } from "zod";
import { BaseStorage } from "./base-storage.js";

/**
 * Storage pour les pizzas et leurs prix
 * Gère les opérations CRUD pour les pizzas et leurs prix
 */
export class PizzaStorage extends BaseStorage {
  async getAllPizzas(): Promise<Pizza[]> {
    try {
      // Ne retourner que les produits disponibles (available = true ou NULL considéré comme disponible)
      // Utiliser sql pour gérer les valeurs NULL
      return await db.select()
        .from(pizzas)
        .where(sql`${pizzas.available} IS NULL OR ${pizzas.available} = true`);
    } catch (error: any) {
      this.log('error', 'Erreur getAllPizzas', error);
      // En cas d'erreur, retourner un tableau vide plutôt que de planter
      return [];
    }
  }

  async getPizzaById(id: string): Promise<Pizza | undefined> {
    const result = await db.select().from(pizzas).where(eq(pizzas.id, id));
    return result[0];
  }

  /**
   * Batch fetch pizzas by IDs to avoid N+1 queries
   */
  async getPizzasByIds(ids: string[]): Promise<Pizza[]> {
    if (ids.length === 0) return [];
    return await db.select().from(pizzas).where(inArray(pizzas.id, ids));
  }

  async getPizzasByRestaurant(restaurantId: string): Promise<Pizza[]> {
    try {
      // Ne retourner que les produits disponibles (available = true)
      const result = await db.select()
        .from(pizzas)
        .where(and(
          eq(pizzas.restaurantId, restaurantId),
          eq(pizzas.available, true)
        ));
      this.log('debug', `getPizzasByRestaurant(${restaurantId}): ${result.length} produits disponibles trouvés`);
      return result;
    } catch (error) {
      this.log('error', `Erreur getPizzasByRestaurant(${restaurantId})`, error);
      return [];
    }
  }

  async createPizza(pizza: z.infer<typeof import("../../shared/schema.js").insertPizzaSchema>): Promise<Pizza> {
    const pizzaId = randomUUID();
    const pizzaWithId = { ...pizza, id: pizzaId };
    
    await db.insert(pizzas).values(pizzaWithId);
    
    const result = await db.select().from(pizzas).where(eq(pizzas.id, pizzaId));
    if (!result || !result[0]) {
      throw new Error("Failed to retrieve created pizza");
    }
    return result[0];
  }

  async updatePizza(id: string, pizza: Partial<z.infer<typeof import("../../shared/schema.js").insertPizzaSchema>>): Promise<Pizza> {
    await db.update(pizzas).set({ ...pizza, updatedAt: new Date() }).where(eq(pizzas.id, id));
    const result = await db.select().from(pizzas).where(eq(pizzas.id, id));
    if (!result || !result[0]) {
      throw new Error("Failed to retrieve updated pizza");
    }
    return result[0];
  }

  async deletePizza(id: string): Promise<void> {
    await db.delete(pizzaPrices).where(eq(pizzaPrices.pizzaId, id));
    await db.delete(pizzas).where(eq(pizzas.id, id));
  }

  // ============ PIZZA PRICES ============
  async getPizzaPrices(pizzaId: string): Promise<PizzaPrice[]> {
    return await db.select().from(pizzaPrices).where(eq(pizzaPrices.pizzaId, pizzaId));
  }

  /**
   * Batch fetch pizza prices by pizza IDs to avoid N+1 queries
   * Returns all prices for the given pizza IDs
   */
  async getPizzaPricesByPizzaIds(pizzaIds: string[]): Promise<PizzaPrice[]> {
    if (pizzaIds.length === 0) return [];
    return await db.select().from(pizzaPrices).where(inArray(pizzaPrices.pizzaId, pizzaIds));
  }

  async createPizzaPrice(price: z.infer<typeof insertPizzaPriceSchema>): Promise<PizzaPrice> {
    const priceId = randomUUID();
    // Convertir price en string car la DB attend numeric (string)
    const priceWithId = { 
      ...price, 
      id: priceId,
      price: typeof price.price === 'number' ? price.price.toString() : price.price
    };
    
    await db.insert(pizzaPrices).values(priceWithId);
    
    const result = await db.select().from(pizzaPrices).where(eq(pizzaPrices.id, priceId));
    if (!result || !result[0]) {
      throw new Error("Failed to retrieve created pizza price");
    }
    return result[0];
  }
}
