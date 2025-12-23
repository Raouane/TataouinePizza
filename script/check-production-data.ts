import "dotenv/config";
import { db } from "../server/db";
import { restaurants, pizzas } from "../shared/schema";
import { eq } from "drizzle-orm";

async function checkProductionData() {
  console.log("🔍 Vérification des données en production...\n");

  try {
    // Vérifier la connexion
    if (!process.env.DATABASE_URL) {
      console.error("❌ DATABASE_URL non définie");
      process.exit(1);
    }

    console.log(`📊 Connexion à la base de données...\n`);

    // Récupérer tous les restaurants
    const allRestaurants = await db.select().from(restaurants);
    console.log(`📋 ${allRestaurants.length} restaurant(s) trouvé(s) en base\n`);

    if (allRestaurants.length === 0) {
      console.log("❌ Aucun restaurant en base de données !");
      process.exit(1);
    }

    // Afficher les détails de chaque restaurant
    for (const restaurant of allRestaurants) {
      console.log(`\n🏪 ${restaurant.name}`);
      console.log(`   ID: ${restaurant.id}`);
      console.log(`   Téléphone: ${restaurant.phone}`);
      console.log(`   Ouvert: ${restaurant.isOpen ? "✅ OUI" : "❌ NON"}`);
      console.log(`   Image: ${restaurant.imageUrl ? "✅ OUI" : "❌ NON"}`);
      console.log(`   Catégories: ${restaurant.categories || "Aucune"}`);
      
      // Compter les produits
      const products = await db.select()
        .from(pizzas)
        .where(eq(pizzas.restaurantId, restaurant.id));
      
      console.log(`   Produits: ${products.length}`);
      
      if (products.length > 0) {
        console.log(`   Exemples: ${products.slice(0, 3).map(p => p.name).join(", ")}`);
      }
    }

    // Statistiques
    const openRestaurants = allRestaurants.filter(r => r.isOpen);
    const restaurantsWithImages = allRestaurants.filter(r => r.imageUrl && r.imageUrl.trim() !== "");
    const restaurantsWithProducts = await Promise.all(
      allRestaurants.map(async (r) => {
        const products = await db.select()
          .from(pizzas)
          .where(eq(pizzas.restaurantId, r.id));
        return { restaurant: r, productCount: products.length };
      })
    );

    const restaurantsWithProductsCount = restaurantsWithProducts.filter(r => r.productCount > 0).length;

    console.log(`\n\n📊 Statistiques:`);
    console.log(`   Total restaurants: ${allRestaurants.length}`);
    console.log(`   Restaurants ouverts: ${openRestaurants.length}`);
    console.log(`   Restaurants avec images: ${restaurantsWithImages.length}`);
    console.log(`   Restaurants avec produits: ${restaurantsWithProductsCount}`);

    // Vérifier les problèmes potentiels
    console.log(`\n\n⚠️  Problèmes détectés:`);
    
    const closedRestaurants = allRestaurants.filter(r => !r.isOpen);
    if (closedRestaurants.length > 0) {
      console.log(`   ❌ ${closedRestaurants.length} restaurant(s) fermé(s):`);
      closedRestaurants.forEach(r => console.log(`      - ${r.name}`));
    }

    const restaurantsWithoutImages = allRestaurants.filter(r => !r.imageUrl || r.imageUrl.trim() === "");
    if (restaurantsWithoutImages.length > 0) {
      console.log(`   ⚠️  ${restaurantsWithoutImages.length} restaurant(s) sans image:`);
      restaurantsWithoutImages.forEach(r => console.log(`      - ${r.name}`));
    }

    const restaurantsWithoutProducts = restaurantsWithProducts.filter(r => r.productCount === 0);
    if (restaurantsWithoutProducts.length > 0) {
      console.log(`   ⚠️  ${restaurantsWithoutProducts.length} restaurant(s) sans produits:`);
      restaurantsWithoutProducts.forEach(r => console.log(`      - ${r.name}`));
    }

    if (closedRestaurants.length === 0 && restaurantsWithoutImages.length === 0 && restaurantsWithoutProducts.length === 0) {
      console.log(`   ✅ Aucun problème détecté !`);
    }

    console.log(`\n\n💡 Recommandations:`);
    if (closedRestaurants.length > 0) {
      console.log(`   - Ouvrir les restaurants fermés pour qu'ils apparaissent sur le site`);
    }
    if (restaurantsWithoutImages.length > 0) {
      console.log(`   - Exécuter: npm run add-restaurant-images`);
    }
    if (restaurantsWithoutProducts.length > 0) {
      console.log(`   - Ajouter des produits aux restaurants vides`);
    }

  } catch (error: any) {
    console.error("❌ Erreur:", error.message);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

checkProductionData();

