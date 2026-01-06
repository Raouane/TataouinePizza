/**
 * Script pour mettre à jour les URLs d'images vers les noms standardisés
 */

import "dotenv/config";
if (process.env.DATABASE_URL?.includes('supabase')) {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
}
import { db } from "../server/db";
import { pizzas } from "../shared/schema";
import { eq, like } from "drizzle-orm";

// Mapping des anciennes URLs vers les nouvelles
const urlUpdates: Record<string, string> = {
  "/images/products/4fromage.png": "/images/products/pizza-4-fromages.jpg",
  "/images/products/pepperoni.png": "/images/products/pizza-pepperoni.jpg",
  "/images/products/calzone.png": "/images/products/calzone-aux-oeufs.jpg",
  "/images/products/eclair-chocolat.png": "/images/products/eclair-au-chocolat.jpg",
  "/images/products/baklawa tunisienne.png": "/images/products/baklava.jpg",
  "/images/products/macaron.png": "/images/products/macarons.jpg",
  "/images/products/makroudh.png": "/images/products/maamoul.jpg",
  "/images/products/mille-feuille.png": "/images/products/mille-feuille.jpg",
  "/images/products/Kaak Warka.png": "/images/products/biscuits-blancs.jpg",
  "/images/products/couscous-poulet.png": "/images/products/couscous-au-poulet.jpg",
  "/images/products/kamounia.png": "/images/products/ragout-de-poulet.jpg",
  "/images/products/ojja-merguez.png": "/images/products/shakshuka.jpg",
  "/images/products/sandwich tunisien .png": "/images/products/sandwich-au-thon.jpg",
  "/images/products/sandwich poulet chiken.png": "/images/products/sandwich-poulet-frites.jpg",
  "/images/products/frites.png": "/images/products/frites.jpg",
  "/images/products/makrouna-boeuf.png": "/images/products/pates-a-la-viande.jpg",
};

async function updateImageUrls() {
  console.log("🔄 Mise à jour des URLs d'images vers les noms standardisés...\n");

  try {
    const allProducts = await db.select().from(pizzas);
    console.log(`📦 ${allProducts.length} produits trouvés\n`);

    let updated = 0;
    let skipped = 0;

    for (const product of allProducts) {
      if (!product.imageUrl) {
        skipped++;
        continue;
      }

      const newUrl = urlUpdates[product.imageUrl];
      
      if (newUrl) {
        await db.update(pizzas)
          .set({ imageUrl: newUrl, updatedAt: new Date() })
          .where(eq(pizzas.id, product.id));
        
        console.log(`✅ ${product.name}`);
        console.log(`   ${product.imageUrl} → ${newUrl}`);
        updated++;
      } else {
        skipped++;
      }
    }

    console.log(`\n${"=".repeat(70)}`);
    console.log("📊 RÉSUMÉ:");
    console.log("=".repeat(70));
    console.log(`   ✅ URLs mises à jour: ${updated}`);
    console.log(`   ⏭️  URLs inchangées: ${skipped}`);
    console.log(`\n✨ Mise à jour terminée !`);

  } catch (error: any) {
    console.error("❌ Erreur:", error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

updateImageUrls()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Erreur fatale:", error);
    process.exit(1);
  });
