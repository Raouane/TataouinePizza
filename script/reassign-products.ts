import "dotenv/config";
import { db } from "../server/db";
import { restaurants, pizzas } from "../shared/schema";
import { eq, sql } from "drizzle-orm";

async function reassignProducts() {
  console.log("🔧 Réassignation des produits aux restaurants...\n");

  try {
    // Mapping des IDs fixes vers les noms de restaurants
    const restaurantMapping: Record<string, string> = {
      "resto-001": "Pizza del Sol",
      "resto-002": "Sahara Grill",
      "resto-003": "Tataouine Pizza",
      "resto-004": "Le Jardin Salades",
      "resto-005": "Burger House",
    };

    // Récupérer tous les restaurants
    const allRestaurants = await db.select().from(restaurants);
    console.log(`📋 ${allRestaurants.length} restaurants trouvés\n`);

    // Pour chaque restaurant du mapping
    for (const [oldId, restaurantName] of Object.entries(restaurantMapping)) {
      // Trouver le restaurant par son nom
      const restaurant = allRestaurants.find(r => r.name === restaurantName);
      
      if (!restaurant) {
        console.log(`⚠️  Restaurant "${restaurantName}" non trouvé, ignoré`);
        continue;
      }

      // Si le restaurant a déjà le bon ID, pas besoin de réassigner
      if (restaurant.id === oldId) {
        console.log(`✅ ${restaurantName} a déjà le bon ID (${oldId})`);
        continue;
      }

      // Trouver tous les produits assignés à l'ancien ID
      const productsToReassign = await db.select()
        .from(pizzas)
        .where(eq(pizzas.restaurantId, oldId));

      if (productsToReassign.length === 0) {
        console.log(`ℹ️  Aucun produit à réassigner pour ${restaurantName}`);
        continue;
      }

      console.log(`\n🔄 Réassignation de ${productsToReassign.length} produits pour ${restaurantName}:`);
      console.log(`   Ancien ID: ${oldId}`);
      console.log(`   Nouveau ID: ${restaurant.id}`);

      // Réassigner les produits
      for (const product of productsToReassign) {
        await db.update(pizzas)
          .set({ restaurantId: restaurant.id })
          .where(eq(pizzas.id, product.id));
        console.log(`   ✅ ${product.name} réassigné`);
      }
    }

    // Afficher le résumé final
    console.log("\n📊 Résumé final par restaurant:\n");
    for (const restaurant of allRestaurants) {
      const restaurantProducts = await db.select()
        .from(pizzas)
        .where(eq(pizzas.restaurantId, restaurant.id));
      console.log(`  ${restaurant.name}: ${restaurantProducts.length} produits`);
    }

    console.log("\n✨ Réassignation terminée !");
  } catch (error) {
    console.error("❌ Erreur lors de la réassignation:", error);
    process.exit(1);
  }
}

reassignProducts();

