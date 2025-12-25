import { config } from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

// Charger le .env depuis la racine du projet
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
config({ path: path.resolve(__dirname, "..", ".env") });

import { db } from "../server/db";
import { pizzas } from "../shared/schema";
import { eq } from "drizzle-orm";

/**
 * Génère un slug à partir du nom du produit pour créer l'URL de l'image
 */
function generateImageSlug(productName: string): string {
  return productName
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Supprime les accents
    .replace(/[^a-z0-9]+/g, "-") // Remplace les caractères spéciaux par des tirets
    .replace(/^-|-$/g, ""); // Supprime les tirets en début/fin
}

/**
 * Génère l'URL de l'image pour un produit
 */
function generateImageUrl(productName: string): string {
  const slug = generateImageSlug(productName);
  return `/images/products/${slug}.jpg`;
}

async function updateProductImageUrls() {
  console.log("🖼️  Mise à jour des URLs d'images des produits...\n");

  try {
    // Récupérer tous les produits
    const allProducts = await db.select().from(pizzas);
    console.log(`📦 ${allProducts.length} produits trouvés\n`);

    let updated = 0;
    let skipped = 0;

    for (const product of allProducts) {
      // Générer l'URL attendue
      const expectedUrl = generateImageUrl(product.name);
      
      // Si le produit n'a pas d'URL ou a une URL Unsplash, mettre à jour
      if (!product.imageUrl || product.imageUrl.includes("unsplash.com") || product.imageUrl.includes("http")) {
        await db.update(pizzas)
          .set({ imageUrl: expectedUrl })
          .where(eq(pizzas.id, product.id));
        
        console.log(`✅ ${product.name}`);
        console.log(`   → ${expectedUrl}`);
        updated++;
      } else if (product.imageUrl === expectedUrl) {
        console.log(`⏭️  ${product.name} (déjà à jour)`);
        skipped++;
      } else {
        // URL locale mais différente, vérifier si c'est correct
        console.log(`⚠️  ${product.name}`);
        console.log(`   URL actuelle: ${product.imageUrl}`);
        console.log(`   URL attendue: ${expectedUrl}`);
        skipped++;
      }
    }

    console.log(`\n${"=".repeat(70)}`);
    console.log("📊 RÉSUMÉ:");
    console.log("=".repeat(70));
    console.log(`   ✅ Produits mis à jour: ${updated}`);
    console.log(`   ⏭️  Produits ignorés: ${skipped}`);
    console.log(`\n✨ Mise à jour terminée !`);
    console.log(`\n💡 Maintenant, placez vos images dans: client/public/images/products/`);
    console.log(`   Les noms de fichiers attendus sont dans: LISTE_IMAGES_MANQUANTES.txt`);

  } catch (error: any) {
    console.error("❌ Erreur:", error.message);
    console.error(error.stack);
  } finally {
    process.exit(0);
  }
}

updateProductImageUrls();

