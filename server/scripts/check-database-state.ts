import "dotenv/config";
import { db } from "../db.js";
import { restaurants, pizzas } from "@shared/schema";
import { sql, eq } from "drizzle-orm";

async function checkDatabaseState() {
  console.log("========================================");
  console.log("🔍 VÉRIFICATION DÉTAILLÉE DE LA BASE DE DONNÉES");
  console.log("========================================");

  try {
    // Vérifier les restaurants
    const restaurantsCount = await db.execute(sql`
      SELECT COUNT(*) as count FROM restaurants
    `);
    const restaurantsCountNum = parseInt(restaurantsCount.rows[0]?.count || "0");
    console.log(`\n📊 RESTAURANTS: ${restaurantsCountNum}`);

    const allRestaurants = await db.select({
      id: restaurants.id,
      name: restaurants.name,
      phone: restaurants.phone,
    }).from(restaurants);

    if (allRestaurants.length > 0) {
      console.log("\n   Liste des restaurants:");
      for (const r of allRestaurants) {
        // Compter les produits pour chaque restaurant
        const productsCount = await db.execute(sql`
          SELECT COUNT(*) as count FROM pizzas WHERE restaurant_id = ${r.id}
        `);
        const productsNum = parseInt(productsCount.rows[0]?.count || "0");
        console.log(`   - ${r.name} (${r.phone}) → ${productsNum} produits`);
      }
    }

    // Vérifier les produits par restaurant
    const pizzasCount = await db.execute(sql`
      SELECT COUNT(*) as count FROM pizzas
    `);
    const pizzasCountNum = parseInt(pizzasCount.rows[0]?.count || "0");
    console.log(`\n📊 PRODUITS TOTAUX: ${pizzasCountNum}`);

    if (pizzasCountNum > 0 && allRestaurants.length > 0) {
      console.log("\n   Produits par restaurant:");
      for (const r of allRestaurants) {
        const restaurantProducts = await db.select({
          id: pizzas.id,
          name: pizzas.name,
        }).from(pizzas).where(eq(pizzas.restaurantId, r.id));
        
        if (restaurantProducts.length > 0) {
          console.log(`\n   ${r.name} (${restaurantProducts.length} produits):`);
          restaurantProducts.slice(0, 5).forEach((p) => {
            console.log(`     - ${p.name}`);
          });
          if (restaurantProducts.length > 5) {
            console.log(`     ... et ${restaurantProducts.length - 5} autres`);
          }
        } else {
          console.log(`\n   ⚠️  ${r.name}: AUCUN PRODUIT`);
        }
      }
    }

    // Vérifier les prix
    const pricesCount = await db.execute(sql`
      SELECT COUNT(*) as count FROM pizza_prices
    `);
    const pricesCountNum = parseInt(pricesCount.rows[0]?.count || "0");
    console.log(`\n📊 PRIX: ${pricesCountNum}`);

    // Vérifier les restaurants attendus
    const expectedRestaurants = [
      { name: "Pizza del Sol", phone: "21622222222" },
      { name: "Sahara Grill", phone: "21633333333" },
      { name: "Tataouine Pizza", phone: "21611111111" },
      { name: "Le Jardin Salades", phone: "21644444444" },
      { name: "Burger House", phone: "21655555555" },
      { name: "BAB EL HARA", phone: "21699999999" },
    ];

    console.log("\n========================================");
    console.log("🔍 VÉRIFICATION DES RESTAURANTS ATTENDUS");
    console.log("========================================");
    
    const missingRestaurants: string[] = [];
    for (const expected of expectedRestaurants) {
      const found = allRestaurants.find(r => r.phone === expected.phone);
      if (found) {
        console.log(`✅ ${expected.name} (${expected.phone}) - PRÉSENT`);
      } else {
        console.log(`❌ ${expected.name} (${expected.phone}) - MANQUANT`);
        missingRestaurants.push(expected.name);
      }
    }

    console.log("\n========================================");
    if (restaurantsCountNum === 0 || pizzasCountNum === 0 || missingRestaurants.length > 0) {
      console.log("⚠️  BASE DE DONNÉES INCOMPLÈTE");
      if (missingRestaurants.length > 0) {
        console.log(`\n❌ Restaurants manquants: ${missingRestaurants.join(", ")}`);
      }
      if (pizzasCountNum === 0) {
        console.log("\n❌ Aucun produit dans la base de données");
      }
      console.log("\n💡 Pour restaurer les données manquantes:");
      console.log("   1. Exécutez: npm run db:seed");
      console.log("   2. Ou utilisez l'API admin: POST /api/admin/restaurants/seed-test-data");
    } else {
      console.log("✅ BASE DE DONNÉES COMPLÈTE");
    }
    console.log("========================================");

  } catch (error: any) {
    console.error("❌ Erreur:", error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

checkDatabaseState();
