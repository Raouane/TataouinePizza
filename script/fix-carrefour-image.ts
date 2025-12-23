import "dotenv/config";
import { db } from "../server/db";
import { restaurants } from "../shared/schema";
import { eq } from "drizzle-orm";
import { sql } from "drizzle-orm";

async function fixCarrefourImage() {
  console.log("🖼️  Correction de l'image pour Carrefour...\n");

  try {
    // Trouver Carrefour
    const carrefour = await db.select()
      .from(restaurants)
      .where(eq(restaurants.name, "Carrefour"))
      .limit(1);

    if (carrefour.length === 0) {
      console.log("❌ Restaurant Carrefour non trouvé");
      process.exit(1);
    }

    const restaurant = carrefour[0];
    console.log(`📋 Restaurant trouvé: ${restaurant.name}`);
    console.log(`   Image actuelle: ${restaurant.imageUrl || "AUCUNE"}\n`);

    // Image appropriée pour un supermarché
    const imageUrl = "https://images.unsplash.com/photo-1556910103-2c02749b8eff?w=800";

    // Mettre à jour avec une image
    await db
      .update(restaurants)
      .set({ 
        imageUrl: imageUrl,
        updatedAt: sql`NOW()`
      })
      .where(eq(restaurants.id, restaurant.id));

    console.log(`✅ Image mise à jour pour Carrefour`);
    console.log(`   → ${imageUrl}`);
    console.log("\n🎉 Terminé !");

  } catch (error) {
    console.error("❌ Erreur:", error);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

fixCarrefourImage();



