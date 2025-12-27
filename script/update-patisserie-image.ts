import "dotenv/config";
import { db } from "../server/db";
import { restaurants } from "../shared/schema";
import { eq } from "drizzle-orm";

async function updatePatisserieImage() {
  console.log("🖼️  Mise à jour de l'image de la Pâtisserie EL BACHA...\n");

  try {
    // Image de pâtisserie orientale/tunisienne de haute qualité
    const newImageUrl = "https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=800&q=80";
    
    // Trouver le restaurant
    const result = await db.update(restaurants)
      .set({ imageUrl: newImageUrl })
      .where(eq(restaurants.name, "Pâtisserie EL BACHA"))
      .returning({ id: restaurants.id, name: restaurants.name });

    if (result.length === 0) {
      console.log("⚠️  Restaurant 'Pâtisserie EL BACHA' introuvable");
      process.exit(1);
    }

    console.log(`✅ Image mise à jour pour: ${result[0].name}`);
    console.log(`📸 Nouvelle image: ${newImageUrl}`);
    console.log("\n🎉 Terminé !");

  } catch (error: any) {
    console.error("❌ Erreur:", error);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

updatePatisserieImage();


