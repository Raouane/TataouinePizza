import "dotenv/config";
import { db } from "../server/db";
import { restaurants, pizzas } from "../shared/schema";
import { eq } from "drizzle-orm";

async function debugRestaurants() {
  console.log("🔍 Diagnostic des restaurants et produits...\n");

  try {
    // Récupérer tous les restaurants
    const allRestaurants = await db.select().from(restaurants);
    console.log(`📋 ${allRestaurants.length} restaurants trouvés:\n`);

    for (const restaurant of allRestaurants) {
      console.log(`\n🏪 ${restaurant.name}`);
      console.log(`   ID: ${restaurant.id}`);
      console.log(`   Téléphone: ${restaurant.phone}`);
      
      // Récupérer les produits de ce restaurant
      const products = await db.select()
        .from(pizzas)
        .where(eq(pizzas.restaurantId, restaurant.id));
      
      console.log(`   Produits: ${products.length}`);
      if (products.length > 0) {
        products.forEach(p => {
          console.log(`      - ${p.name} (ID: ${p.id}, restaurantId: ${p.restaurantId})`);
        });
      }
    }

    // Afficher tous les produits orphelins
    console.log("\n\n🔍 Produits avec restaurantId qui ne correspond à aucun restaurant:");
    const allProducts = await db.select().from(pizzas);
    for (const product of allProducts) {
      if (product.restaurantId) {
        const restaurant = allRestaurants.find(r => r.id === product.restaurantId);
        if (!restaurant) {
          console.log(`   ⚠️  ${product.name} (ID: ${product.id}) -> restaurantId: ${product.restaurantId} (N'EXISTE PAS)`);
        }
      } else {
        console.log(`   ⚠️  ${product.name} (ID: ${product.id}) -> restaurantId: NULL`);
      }
    }

    console.log("\n✨ Diagnostic terminé !");
  } catch (error) {
    console.error("❌ Erreur:", error);
    process.exit(1);
  }
}

debugRestaurants();




