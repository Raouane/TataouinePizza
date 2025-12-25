import { config } from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

// Charger le .env depuis la racine du projet
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
config({ path: path.resolve(__dirname, "..", ".env") });

import { db } from "../server/db";
import { pizzas } from "../shared/schema";
import { eq } from "drizzle-orm";

/**
 * Génère un slug à partir du nom du produit
 */
function generateImageSlug(productName: string): string {
  return productName
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

async function updateImageUrlsToSvg() {
  console.log("🔄 Mise à jour des URLs d'images vers les fichiers SVG...\n");

  try {
    const allProducts = await db.select().from(pizzas);
    console.log(`📦 ${allProducts.length} produits trouvés\n`);

    const imagesDir = path.resolve(process.cwd(), "client/public/images/products");
    let updated = 0;
    let skipped = 0;

    for (const product of allProducts) {
      const slug = generateImageSlug(product.name);
      const svgPath = path.join(imagesDir, `${slug}.svg`);
      const svgUrl = `/images/products/${slug}.svg`;

      // Vérifier si le fichier SVG existe
      if (fs.existsSync(svgPath)) {
        // Mettre à jour l'URL seulement si elle pointe vers .jpg ou .png qui n'existe pas
        const currentUrl = product.imageUrl || "";
        const jpgPath = path.join(imagesDir, `${slug}.jpg`);
        const pngPath = path.join(imagesDir, `${slug}.png`);

        // Si l'URL actuelle pointe vers .jpg/.png mais le fichier n'existe pas, mettre à jour vers SVG
        if (
          (currentUrl.includes(".jpg") && !fs.existsSync(jpgPath)) ||
          (currentUrl.includes(".png") && !fs.existsSync(pngPath)) ||
          !currentUrl ||
          currentUrl.trim() === ""
        ) {
          await db
            .update(pizzas)
            .set({ imageUrl: svgUrl })
            .where(eq(pizzas.id, product.id));

          console.log(`✅ ${product.name}`);
          console.log(`   → ${svgUrl}`);
          updated++;
        } else {
          console.log(`⏭️  ${product.name} (URL déjà correcte ou fichier existe)`);
          skipped++;
        }
      } else {
        console.log(`⚠️  ${product.name} (SVG non trouvé: ${slug}.svg)`);
        skipped++;
      }
    }

    console.log(`\n${"=".repeat(70)}`);
    console.log("📊 RÉSUMÉ:");
    console.log("=".repeat(70));
    console.log(`   ✅ URLs mises à jour: ${updated}`);
    console.log(`   ⏭️  URLs ignorées: ${skipped}`);
    console.log(`\n✨ Mise à jour terminée !`);
    console.log(`\n💡 Les produits pointent maintenant vers les images SVG placeholder.`);
    console.log(`   Vous pouvez remplacer les fichiers SVG par de vraies images plus tard.`);

  } catch (error: any) {
    console.error("❌ Erreur:", error.message);
    console.error(error.stack);
  } finally {
    process.exit(0);
  }
}

updateImageUrlsToSvg();

