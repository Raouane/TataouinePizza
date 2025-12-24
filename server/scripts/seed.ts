/**
 * Script de seed pour initialiser la base de données avec des données de démonstration
 * Utilisé au démarrage de l'application si la base est vide
 */

import { storage } from "../storage";
import { hashPassword } from "../auth";

/**
 * Seed la base de données avec des données de démonstration
 * Ne seed que si aucun restaurant n'existe déjà
 * @returns true si le seed a été effectué, false sinon
 */
export async function seedDatabase(): Promise<boolean> {
  try {
    let existingRestaurants: any[] = [];
    try {
      existingRestaurants = await storage.getAllRestaurants();
    } catch (e) {
      console.log("[SEED] Could not get restaurants, will try to seed:", e);
      existingRestaurants = [];
    }
    
    if (!existingRestaurants || existingRestaurants.length === 0) {
      console.log("[SEED] Seeding database with demo data...");
      
      // Create demo restaurants
      const restaurant1 = await storage.createRestaurant({
        name: "Tataouine Pizza",
        phone: "21611111111",
        address: "Avenue Habib Bourguiba, Tataouine",
        description: "Les meilleures pizzas de Tataouine avec des recettes traditionnelles tunisiennes",
        imageUrl: null,
        category: "pizza",
      });
      
      const restaurant2 = await storage.createRestaurant({
        name: "Pizza del Sol",
        phone: "21622222222",
        address: "Rue de la Liberté, Tataouine",
        description: "Pizzas italiennes authentiques cuites au feu de bois",
        imageUrl: null,
        category: "pizza",
      });
      
      const restaurant3 = await storage.createRestaurant({
        name: "Sahara Grill",
        phone: "21633333333",
        address: "Boulevard de l'Environnement, Tataouine",
        description: "Grillades et spécialités du sud tunisien",
        imageUrl: null,
        category: "grill",
      });
      
      // Pizzas for restaurant 1
      const pizzas1 = [
        { name: "Margherita", description: "Sauce tomate, mozzarella di bufala, basilic frais", category: "classic", restaurantId: restaurant1.id },
        { name: "La Tunisienne", description: "Thon, olives, œuf, harissa, fromage", category: "special", restaurantId: restaurant1.id },
        { name: "Tataouine Spéciale", description: "Merguez, poivrons grillés, œuf, olives", category: "special", restaurantId: restaurant1.id },
      ];
      
      // Pizzas for restaurant 2
      const pizzas2 = [
        { name: "Pepperoni", description: "Double pepperoni, mozzarella, origan", category: "classic", restaurantId: restaurant2.id },
        { name: "4 Fromages", description: "Mozzarella, Gorgonzola, Parmesan, Chèvre", category: "classic", restaurantId: restaurant2.id },
        { name: "Vegetarian", description: "Poivrons, champignons, olives, tomates", category: "vegetarian", restaurantId: restaurant2.id },
      ];
      
      // Pizzas for restaurant 3 (grill items)
      const pizzas3 = [
        { name: "Mechoui", description: "Agneau grillé aux épices du sud", category: "special", restaurantId: restaurant3.id },
        { name: "Brochettes Mixtes", description: "Bœuf, poulet, merguez grillés", category: "special", restaurantId: restaurant3.id },
      ];
      
      for (const pizza of [...pizzas1, ...pizzas2, ...pizzas3]) {
        const created = await storage.createPizza(pizza);
        for (const [size, price] of [["small", "10"], ["medium", "15"], ["large", "18"]]) {
          await storage.createPizzaPrice({ pizzaId: created.id, size, price });
        }
      }
      
      // Create demo drivers (only if they don't exist)
      const demoDrivers = [
        { name: "Mohamed", phone: "21612345678", password: await hashPassword("driver123") },
        { name: "Ahmed", phone: "21698765432", password: await hashPassword("driver123") },
        { name: "Fatima", phone: "21625874123", password: await hashPassword("driver123") },
      ];
      for (const driver of demoDrivers) {
        const existing = await storage.getDriverByPhone(driver.phone);
        if (!existing) {
          await storage.createDriver(driver);
        }
      }
      
      console.log("[SEED] Demo data seeded successfully!");
      return true;
    }
    
    return false;
  } catch (e) {
    console.error("[SEED] Error seeding data:", e);
    throw e;
  }
}

