import "dotenv/config";
import { db } from "../server/db";
import { restaurants } from "../shared/schema";
import { eq } from "drizzle-orm";

async function addPatisserieElBacha() {
  console.log("🍰 Ajout de la Pâtisserie EL BACHA...\n");

  try {
    const restaurant = {
      name: "Pâtisserie EL BACHA",
      phone: "21698765437",
      address: "Avenue Habib Bourguiba, Centre-ville, Tataouine",
      description: "Pâtisseries orientales et françaises de qualité - Spécialités tunisiennes et gâteaux artisanaux",
      imageUrl: "https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=800",
      categories: JSON.stringify(["dessert", "patisserie", "bakery", "sweets", "drink"]),
      isOpen: true,
      openingHours: "20:00-06:00|Vendredi", // Ouvert la nuit, fermé le vendredi
      deliveryTime: 30,
      minOrder: "15.00",
      rating: "4.9",
    };

    // Vérifier si le restaurant existe déjà (par téléphone)
    const existing = await db.select()
      .from(restaurants)
      .where(eq(restaurants.phone, restaurant.phone))
      .limit(1);

    if (existing.length > 0) {
      console.log(`⚠️  Restaurant "${restaurant.name}" existe déjà (téléphone: ${restaurant.phone})`);
      console.log("Mise à jour des informations...");
      
      // Mettre à jour le restaurant existant
      await db.update(restaurants)
        .set({
          name: restaurant.name,
          address: restaurant.address,
          description: restaurant.description,
          imageUrl: restaurant.imageUrl,
          categories: restaurant.categories,
          openingHours: restaurant.openingHours,
          deliveryTime: restaurant.deliveryTime,
          minOrder: restaurant.minOrder,
          rating: restaurant.rating,
        })
        .where(eq(restaurants.phone, restaurant.phone));
      
      console.log(`✅ Restaurant "${restaurant.name}" mis à jour !`);
    } else {
      // Insérer le restaurant
      await db.insert(restaurants).values(restaurant);
      console.log(`✅ Restaurant créé: ${restaurant.name}`);
    }

    console.log("\n🎉 Terminé !");
    console.log(`📋 Détails:`);
    console.log(`   - Nom: ${restaurant.name}`);
    console.log(`   - Horaires: ${restaurant.openingHours}`);
    console.log(`   - Ouvert la nuit (20h-6h)`);
    console.log(`   - Jour de repos: Vendredi`);

  } catch (error: any) {
    console.error("❌ Erreur:", error);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

addPatisserieElBacha();




