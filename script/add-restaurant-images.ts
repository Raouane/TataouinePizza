import "dotenv/config";
import { db } from "../server/db";
import { restaurants } from "../shared/schema";
import { eq, isNull, or } from "drizzle-orm";
import { sql } from "drizzle-orm";

async function addRestaurantImages() {
  console.log("🖼️  Ajout d'images aux restaurants sans photo...\n");

  try {
    // Récupérer tous les restaurants
    const allRestaurants = await db.select().from(restaurants);
    
    console.log(`📋 ${allRestaurants.length} restaurant(s) trouvé(s)\n`);

    // Images par défaut selon le type de restaurant
    const defaultImages: Record<string, string> = {
      // Supermarchés
      "carrefour": "https://images.unsplash.com/photo-1556910103-2c02749b8eff?w=800",
      "supermarket": "https://images.unsplash.com/photo-1556910103-2c02749b8eff?w=800",
      "grocery": "https://images.unsplash.com/photo-1556910103-2c02749b8eff?w=800",
      
      // Restaurants tunisiens/traditionnels
      "aziza": "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=800",
      "tunisian": "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=800",
      "traditional": "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=800",
      
      // Boucheries
      "boucherie": "https://images.unsplash.com/photo-1603048297172-c92544798d5a?w=800",
      "butcher": "https://images.unsplash.com/photo-1603048297172-c92544798d5a?w=800",
      "brahim": "https://images.unsplash.com/photo-1603048297172-c92544798d5a?w=800",
      
      // Volailles
      "volaille": "https://images.unsplash.com/photo-1604503468506-a8da13d82791?w=800",
      "poultry": "https://images.unsplash.com/photo-1604503468506-a8da13d82791?w=800",
      "othman": "https://images.unsplash.com/photo-1604503468506-a8da13d82791?w=800",
      
      // Bijouteries
      "bijouterie": "https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=800",
      "jewelry": "https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=800",
      "ziyad": "https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=800",
      
      // Pizzas
      "pizza": "https://images.unsplash.com/photo-1513104890138-7c749659a591?w=800",
      "pizza del sol": "https://images.unsplash.com/photo-1513104890138-7c749659a591?w=800",
      "tataouine pizza": "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=800",
      "bab el hara": "https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=800",
      
      // Grills
      "grill": "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=800",
      "sahara": "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=800",
      
      // Par défaut
      "default": "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800",
    };

    let updatedCount = 0;
    let skippedCount = 0;

    for (const restaurant of allRestaurants) {
      // Vérifier si le restaurant n'a pas d'image ou a une image vide
      if (restaurant.imageUrl && restaurant.imageUrl.trim() !== "") {
        console.log(`✓ ${restaurant.name} a déjà une image`);
        skippedCount++;
        continue;
      }

      // Trouver une image appropriée selon le nom ou les catégories
      let imageUrl = defaultImages.default;
      const nameLower = restaurant.name.toLowerCase();
      const categories = restaurant.categories ? JSON.parse(restaurant.categories as string) : [];

      // Chercher par nom
      for (const [key, url] of Object.entries(defaultImages)) {
        if (nameLower.includes(key)) {
          imageUrl = url;
          break;
        }
      }

      // Si pas trouvé par nom, chercher par catégories
      if (imageUrl === defaultImages.default && categories.length > 0) {
        for (const category of categories) {
          const catLower = category.toLowerCase();
          if (defaultImages[catLower]) {
            imageUrl = defaultImages[catLower];
            break;
          }
        }
      }

      // Mettre à jour le restaurant
      await db
        .update(restaurants)
        .set({ 
          imageUrl: imageUrl,
          updatedAt: sql`NOW()`
        })
        .where(eq(restaurants.id, restaurant.id));

      console.log(`✅ Image ajoutée pour: ${restaurant.name}`);
      console.log(`   → ${imageUrl}`);
      updatedCount++;
    }

    console.log(`\n✨ ${updatedCount} restaurant(s) mis à jour !`);
    if (skippedCount > 0) {
      console.log(`⚠️  ${skippedCount} restaurant(s) avaient déjà une image`);
    }
    console.log("\n🎉 Terminé !");

  } catch (error) {
    console.error("❌ Erreur:", error);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

addRestaurantImages();



