/**
 * Script pour mettre à jour les imageUrl des restaurants
 * Utilise des images locales ou des URLs par défaut
 * 
 * Usage: npx tsx scripts/update-restaurant-images.ts
 */

import "dotenv/config";
// Forcer la configuration SSL avant d'importer db
if (process.env.DATABASE_URL?.includes('supabase')) {
  process.env.PGSSLMODE = 'no-verify';
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
}
import { db } from "../server/db";
import { restaurants } from "../shared/schema";
import { eq } from "drizzle-orm";
import { sql } from "drizzle-orm";

async function updateRestaurantImages() {
  console.log("🖼️  Mise à jour des images des restaurants...\n");

  try {
    // Récupérer tous les restaurants
    const allRestaurants = await db.select().from(restaurants);
    console.log(`📋 ${allRestaurants.length} restaurant(s) trouvé(s)\n`);

    // Images par défaut selon le nom du restaurant
    const defaultImages: Record<string, string> = {
      "Pizza del Sol": "/logo.jpeg", // Utiliser le logo local
      "Sahara Grill": "/logo.jpeg",
      "Tataouine Pizza": "/logo.jpeg",
      "BAB EL HARA": "/logo.jpeg",
      "Pâtisserie EL BACHA": "/logo.jpeg",
    };

    let updatedCount = 0;
    let skippedCount = 0;

    for (const restaurant of allRestaurants) {
      // Vérifier si le restaurant a déjà une image
      if (restaurant.imageUrl && restaurant.imageUrl.trim() !== "") {
        console.log(`✓ ${restaurant.name} a déjà une image: ${restaurant.imageUrl}`);
        skippedCount++;
        continue;
      }

      // Trouver une image appropriée
      const imageUrl = defaultImages[restaurant.name] || "/logo.jpeg";

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

  } catch (error: any) {
    console.error("❌ Erreur:", error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

updateRestaurantImages();
