import "dotenv/config";
import { db } from "../server/db";
import { restaurants } from "../shared/schema";
import { eq, sql } from "drizzle-orm";

async function verifyCarrefourImage() {
  console.log("🔍 Vérification de l'image Carrefour...\n");

  try {
    // Trouver Carrefour avec différentes variantes de nom
    const carrefourVariants = await db.execute(sql`
      SELECT id, name, phone, image_url, 
             CASE WHEN image_url IS NULL THEN 'NULL' 
                  WHEN image_url = '' THEN 'EMPTY'
                  ELSE 'HAS_VALUE' END as image_status
      FROM restaurants 
      WHERE LOWER(name) LIKE '%carrefour%'
    `);

    console.log(`📋 Résultats trouvés: ${carrefourVariants.rows.length}\n`);

    if (carrefourVariants.rows.length === 0) {
      console.log("❌ Aucun restaurant Carrefour trouvé");
      process.exit(1);
    }

    for (const row of carrefourVariants.rows as any[]) {
      console.log(`🏪 Restaurant: ${row.name}`);
      console.log(`   ID: ${row.id}`);
      console.log(`   Téléphone: ${row.phone}`);
      console.log(`   Image URL: ${row.image_url || '(null ou vide)'}`);
      console.log(`   Statut: ${row.image_status}\n`);

      // Forcer la mise à jour avec une image
      const imageUrl = "https://images.unsplash.com/photo-1556910103-2c02749b8eff?w=800&q=80";
      
      await db
        .update(restaurants)
        .set({ 
          imageUrl: imageUrl,
          updatedAt: sql`NOW()`
        })
        .where(eq(restaurants.id, row.id));

      console.log(`✅ Image forcée pour: ${row.name}`);
      console.log(`   → ${imageUrl}\n`);
    }

    // Vérifier après mise à jour
    const afterUpdate = await db.execute(sql`
      SELECT name, image_url 
      FROM restaurants 
      WHERE LOWER(name) LIKE '%carrefour%'
    `);

    console.log("📸 Vérification après mise à jour:");
    for (const row of afterUpdate.rows as any[]) {
      console.log(`   ${row.name}: ${row.image_url || '(toujours vide!)'}`);
    }

    console.log("\n🎉 Terminé !");

  } catch (error) {
    console.error("❌ Erreur:", error);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

verifyCarrefourImage();



