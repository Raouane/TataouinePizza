/**
 * Script pour ajouter les coordonnées GPS aux restaurants
 * Coordonnées sur la rue Habib Bourguiba, Tataouine 3200
 * 
 * Usage: npx tsx script/add-restaurant-coordinates.ts
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

// Coordonnées GPS sur la rue Habib Bourguiba, Tataouine 3200
const restaurantCoordinates: Record<string, { lat: number; lng: number }> = {
  "BAB EL HARA": { lat: 32.9295, lng: 10.4510 },
  "Sahara Grill": { lat: 32.9298, lng: 10.4512 },
  "Tataouine Pizza": { lat: 32.9297, lng: 10.4511 },
  "Pizza del Sol": { lat: 32.9296, lng: 10.4513 },
};

async function addRestaurantCoordinates() {
  console.log("📍 Ajout des coordonnées GPS aux restaurants...\n");
  console.log("📍 Rue Habib Bourguiba, Tataouine 3200\n");

  try {
    // Récupérer tous les restaurants
    const allRestaurants = await db.select().from(restaurants);
    console.log(`📋 ${allRestaurants.length} restaurant(s) trouvé(s)\n`);

    let updatedCount = 0;
    let skippedCount = 0;
    let notFoundCount = 0;

    for (const restaurant of allRestaurants) {
      // Vérifier si le restaurant a déjà des coordonnées
      if (restaurant.lat && restaurant.lng) {
        console.log(`✓ ${restaurant.name} a déjà des coordonnées: ${restaurant.lat}, ${restaurant.lng}`);
        skippedCount++;
        continue;
      }

      // Trouver les coordonnées pour ce restaurant
      const coords = restaurantCoordinates[restaurant.name];
      
      if (!coords) {
        console.log(`⚠️  ${restaurant.name} : pas de coordonnées définies dans le script`);
        notFoundCount++;
        continue;
      }

      // Mettre à jour le restaurant avec les coordonnées
      await db
        .update(restaurants)
        .set({ 
          lat: coords.lat.toString(),
          lng: coords.lng.toString(),
          updatedAt: sql`NOW()`
        })
        .where(eq(restaurants.id, restaurant.id));

      console.log(`✅ Coordonnées ajoutées pour: ${restaurant.name}`);
      console.log(`   → Latitude: ${coords.lat}, Longitude: ${coords.lng}`);
      console.log(`   → Rue Habib Bourguiba, Tataouine 3200`);
      updatedCount++;
    }

    console.log(`\n✨ ${updatedCount} restaurant(s) mis à jour !`);
    if (skippedCount > 0) {
      console.log(`⚠️  ${skippedCount} restaurant(s) avaient déjà des coordonnées`);
    }
    if (notFoundCount > 0) {
      console.log(`⚠️  ${notFoundCount} restaurant(s) sans coordonnées définies dans le script`);
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

addRestaurantCoordinates();
