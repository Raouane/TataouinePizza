import "dotenv/config";
import { db } from "../server/db";
import { restaurants, pizzas } from "../shared/schema";
import { eq, sql } from "drizzle-orm";

async function fixRestaurantProducts() {
  console.log("🔧 Vérification et correction des produits assignés aux restaurants...\n");

  try {
    // Récupérer tous les restaurants
    const allRestaurants = await db.select().from(restaurants);
    console.log(`📋 ${allRestaurants.length} restaurants trouvés\n`);

    if (allRestaurants.length === 0) {
      console.log("⚠️  Aucun restaurant trouvé. Créez d'abord des restaurants.");
      return;
    }

    // Récupérer tous les produits
    const allProducts = await db.select().from(pizzas);
    console.log(`📦 ${allProducts.length} produits trouvés\n`);

    // Vérifier les produits sans restaurantId ou avec un restaurantId invalide
    const productsWithoutRestaurant = allProducts.filter(p => !p.restaurantId);
    const productsWithInvalidRestaurant = [];

    for (const product of allProducts) {
      if (product.restaurantId) {
        const restaurant = allRestaurants.find(r => r.id === product.restaurantId);
        if (!restaurant) {
          productsWithInvalidRestaurant.push(product);
        }
      }
    }

    console.log(`❌ Produits sans restaurantId: ${productsWithoutRestaurant.length}`);
    console.log(`❌ Produits avec restaurantId invalide: ${productsWithInvalidRestaurant.length}\n`);

    // Assigner les produits orphelins au premier restaurant disponible
    if (productsWithoutRestaurant.length > 0 || productsWithInvalidRestaurant.length > 0) {
      const firstRestaurant = allRestaurants[0];
      console.log(`🔗 Assignation des produits orphelins au restaurant: ${firstRestaurant.name} (${firstRestaurant.id})\n`);

      const orphanProducts = [...productsWithoutRestaurant, ...productsWithInvalidRestaurant];
      
      for (const product of orphanProducts) {
        await db.update(pizzas)
          .set({ restaurantId: firstRestaurant.id })
          .where(eq(pizzas.id, product.id));
        console.log(`✅ ${product.name} assigné à ${firstRestaurant.name}`);
      }
    }

    // Afficher le résumé par restaurant
    console.log("\n📊 Résumé par restaurant:\n");
    for (const restaurant of allRestaurants) {
      const restaurantProducts = allProducts.filter(p => p.restaurantId === restaurant.id);
      console.log(`  ${restaurant.name}: ${restaurantProducts.length} produits`);
    }

    console.log("\n✨ Vérification terminée !");
  } catch (error) {
    console.error("❌ Erreur lors de la vérification:", error);
    process.exit(1);
  } finally {
    // Ne pas fermer la connexion
  }
}

fixRestaurantProducts();


