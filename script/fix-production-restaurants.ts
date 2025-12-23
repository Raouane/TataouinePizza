import "dotenv/config";
import { db } from "../server/db";
import { restaurants } from "../shared/schema";
import { eq } from "drizzle-orm";

async function fixProductionRestaurants() {
  console.log("🔧 Correction des restaurants en production...\n");

  if (!process.env.DATABASE_URL) {
    console.error("❌ DATABASE_URL non définie");
    process.exit(1);
  }

  try {
    // Récupérer tous les restaurants
    const allRestaurants = await db.select().from(restaurants);
    console.log(`📋 ${allRestaurants.length} restaurant(s) trouvé(s)\n`);

    // Images par défaut pour chaque restaurant
    const defaultImages: Record<string, string> = {
      "GAZELLES": "https://images.unsplash.com/photo-1513104890138-7c749659a591?w=800",
      "Pizza del Sol": "https://images.unsplash.com/photo-1513104890138-7c749659a591?w=800",
      "Sahara Grill": "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=800",
      "Tataouine Pizza": "https://images.unsplash.com/photo-1513104890138-7c749659a591?w=800",
    };

    let updated = 0;

    for (const restaurant of allRestaurants) {
      // Vérifier si le restaurant a besoin d'une image
      if (!restaurant.imageUrl || restaurant.imageUrl.trim() === "") {
        const imageUrl = defaultImages[restaurant.name] || "https://images.unsplash.com/photo-1513104890138-7c749659a591?w=800";
        
        await db.update(restaurants)
          .set({ imageUrl })
          .where(eq(restaurants.id, restaurant.id));
        
        console.log(`✅ Image ajoutée pour: ${restaurant.name}`);
        updated++;
      }
    }

    console.log(`\n✨ ${updated} restaurant(s) mis à jour avec des images\n`);

    // Maintenant, ajouter les restaurants manquants
    console.log("🏪 Ajout des restaurants manquants...\n");

    const restaurantsToAdd = [
      {
        name: "Carrefour",
        phone: "21698765432",
        address: "Centre Commercial, Avenue Habib Bourguiba, Tataouine",
        description: "Supermarché et hypermarché - Tout pour vos courses quotidiennes",
        imageUrl: "https://images.unsplash.com/photo-1556910103-2c02749b8eff?w=800",
        categories: JSON.stringify(["supermarket", "grocery", "drink", "snacks"]),
        isOpen: true,
        openingHours: "08:00-22:00",
        deliveryTime: 25,
        minOrder: "10.00",
        rating: "4.6",
      },
      {
        name: "Aziza",
        phone: "21698765433",
        address: "Rue de la République, Tataouine",
        description: "Restaurant traditionnel tunisien - Spécialités locales et plats du jour",
        imageUrl: "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=800",
        categories: JSON.stringify(["tunisian", "traditional", "grill", "couscous"]),
        isOpen: true,
        openingHours: "11:00-23:00",
        deliveryTime: 35,
        minOrder: "15.00",
        rating: "4.8",
      },
      {
        name: "Boucherie Brahim",
        phone: "21698765434",
        address: "Marché Central, Rue du Marché, Tataouine",
        description: "Boucherie traditionnelle - Viande fraîche de qualité, découpe sur place",
        imageUrl: "https://images.unsplash.com/photo-1603048297172-c92544798d5a?w=800",
        categories: JSON.stringify(["butcher", "meat", "beef", "lamb"]),
        isOpen: true,
        openingHours: "07:00-19:00",
        deliveryTime: 20,
        minOrder: "25.00",
        rating: "4.7",
      },
      {
        name: "Volaille Othman",
        phone: "21698765435",
        address: "Marché Central, Avenue de la République, Tataouine",
        description: "Spécialiste en volaille fraîche - Poulet, dinde, canard et œufs",
        imageUrl: "https://images.unsplash.com/photo-1604503468506-a8da13d82791?w=800",
        categories: JSON.stringify(["poultry", "chicken", "eggs", "fresh"]),
        isOpen: true,
        openingHours: "06:00-18:00",
        deliveryTime: 20,
        minOrder: "20.00",
        rating: "4.9",
      },
      {
        name: "Bijouterie Ziyad",
        phone: "21698765436",
        address: "Rue des Bijoutiers, Centre-ville, Tataouine",
        description: "Bijouterie traditionnelle - Or, argent, bijoux artisanaux tunisiens",
        imageUrl: "https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=800",
        categories: JSON.stringify(["jewelry", "gold", "silver", "handmade"]),
        isOpen: true,
        openingHours: "09:00-19:00",
        deliveryTime: 30,
        minOrder: "50.00",
        rating: "4.5",
      },
      {
        name: "BAB EL HARA",
        phone: "21699999999",
        address: "6 Place De L'Abbaye, Tataouine",
        description: "Pizzas et spécialités tunisiennes",
        imageUrl: "https://images.unsplash.com/photo-1513104890138-7c749659a591?w=800",
        categories: JSON.stringify(["pizza", "burger", "drink", "dessert"]),
        isOpen: true,
        openingHours: "10:00-23:00",
        deliveryTime: 30,
        minOrder: "15.00",
        rating: "4.5",
      },
    ];

    let added = 0;
    let skipped = 0;

    for (const restaurant of restaurantsToAdd) {
      try {
        // Vérifier si le restaurant existe déjà (par téléphone)
        const existing = await db.select()
          .from(restaurants)
          .where(eq(restaurants.phone, restaurant.phone))
          .limit(1);

        if (existing.length > 0) {
          console.log(`⚠️  Restaurant "${restaurant.name}" existe déjà`);
          skipped++;
          continue;
        }

        // Insérer le restaurant
        await db.insert(restaurants).values(restaurant);
        console.log(`✅ Restaurant créé: ${restaurant.name}`);
        added++;
      } catch (error: any) {
        if (error.code === '23505') {
          console.log(`⚠️  Restaurant "${restaurant.name}" existe déjà (doublon)`);
          skipped++;
        } else {
          console.error(`❌ Erreur pour "${restaurant.name}":`, error.message);
        }
      }
    }

    console.log(`\n📊 Résumé:`);
    console.log(`   - Images ajoutées: ${updated}`);
    console.log(`   - Restaurants ajoutés: ${added}`);
    console.log(`   - Restaurants ignorés: ${skipped}`);
    console.log(`\n🎉 Terminé !`);

  } catch (error: any) {
    console.error("❌ Erreur:", error.message);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

fixProductionRestaurants();



