import "dotenv/config";
import { db } from "../server/db";
import { restaurants, pizzas, pizzaPrices } from "../shared/schema";
import { eq } from "drizzle-orm";

async function checkProduct() {
  console.log("🔍 Vérification du produit pour BAB EL HARA...\n");

  try {
    // Trouver le restaurant BAB EL HARA
    const restaurant = await db.select()
      .from(restaurants)
      .where(eq(restaurants.name, "BAB EL HARA"))
      .limit(1);

    if (restaurant.length === 0) {
      console.log("❌ Restaurant BAB EL HARA non trouvé");
      return;
    }

    const resto = restaurant[0];
    console.log(`✅ Restaurant trouvé: ${resto.name} (ID: ${resto.id})\n`);

    // Trouver les produits de ce restaurant
    const products = await db.select()
      .from(pizzas)
      .where(eq(pizzas.restaurantId, resto.id));

    console.log(`📦 ${products.length} produit(s) trouvé(s):\n`);

    for (const product of products) {
      console.log(`\n🍕 ${product.name}`);
      console.log(`   ID: ${product.id}`);
      console.log(`   restaurantId: ${product.restaurantId}`);
      console.log(`   category: ${product.category || "NULL"}`);
      console.log(`   productType: ${product.productType || "NULL"}`);
      console.log(`   available: ${product.available}`);
      console.log(`   description: ${product.description || "NULL"}`);
      console.log(`   imageUrl: ${product.imageUrl || "NULL"}`);

      // Vérifier les prix
      const prices = await db.select()
        .from(pizzaPrices)
        .where(eq(pizzaPrices.pizzaId, product.id));

      console.log(`   Prix: ${prices.length} trouvé(s)`);
      if (prices.length > 0) {
        prices.forEach(p => {
          console.log(`      - ${p.size}: ${p.price} TND`);
        });
      } else {
        console.log(`      ⚠️  AUCUN PRIX TROUVÉ - C'est probablement le problème !`);
      }
    }

    console.log("\n✨ Vérification terminée !");
  } catch (error) {
    console.error("❌ Erreur:", error);
    process.exit(1);
  }
}

checkProduct();




