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

/**
 * Trouve le fichier PNG correspondant à un produit
 */
function findPngFile(productName: string, imagesDir: string): string | null {
  const slug = generateImageSlug(productName);
  const pngPath = path.join(imagesDir, `${slug}.png`);
  const jpgPath = path.join(imagesDir, `${slug}.jpg`);
  
  if (fs.existsSync(pngPath)) {
    return `/images/products/${slug}.png`;
  }
  if (fs.existsSync(jpgPath)) {
    return `/images/products/${slug}.jpg`;
  }
  
  return null;
}

async function removeSvgAndUsePng() {
  console.log("🔄 Suppression des SVG et utilisation des PNG...\n");

  try {
    const allProducts = await db.select().from(pizzas);
    console.log(`📦 ${allProducts.length} produits trouvés\n`);

    const imagesDir = path.resolve(process.cwd(), "client/public/images/products");
    
    // Supprimer tous les fichiers SVG
    const svgFiles = fs.readdirSync(imagesDir).filter(file => file.endsWith('.svg'));
    console.log(`🗑️  Suppression de ${svgFiles.length} fichiers SVG...\n`);
    
    for (const svgFile of svgFiles) {
      const svgPath = path.join(imagesDir, svgFile);
      try {
        fs.unlinkSync(svgPath);
        console.log(`   ✅ Supprimé: ${svgFile}`);
      } catch (error: any) {
        console.error(`   ❌ Erreur lors de la suppression de ${svgFile}:`, error.message);
      }
    }
    
    console.log(`\n🔄 Mise à jour des URLs dans la base de données...\n`);

    let updated = 0;
    let kept = 0;
    let noImage = 0;

    for (const product of allProducts) {
      const currentUrl = product.imageUrl || "";
      
      // Si l'URL pointe vers un SVG, chercher le PNG correspondant
      if (currentUrl.includes(".svg")) {
        const pngUrl = findPngFile(product.name, imagesDir);
        
        if (pngUrl) {
          await db
            .update(pizzas)
            .set({ imageUrl: pngUrl })
            .where(eq(pizzas.id, product.id));

          console.log(`✅ ${product.name}`);
          console.log(`   ${currentUrl} → ${pngUrl}`);
          updated++;
        } else {
          // Pas de PNG trouvé, mettre à null
          await db
            .update(pizzas)
            .set({ imageUrl: null })
            .where(eq(pizzas.id, product.id));

          console.log(`⚠️  ${product.name} - Pas de PNG trouvé, imageUrl mis à null`);
          noImage++;
        }
      } else if (currentUrl && !currentUrl.includes(".svg")) {
        // URL déjà correcte (PNG/JPG)
        console.log(`⏭️  ${product.name} - URL déjà correcte: ${currentUrl}`);
        kept++;
      } else {
        // Pas d'URL, chercher un PNG
        const pngUrl = findPngFile(product.name, imagesDir);
        if (pngUrl) {
          await db
            .update(pizzas)
            .set({ imageUrl: pngUrl })
            .where(eq(pizzas.id, product.id));

          console.log(`✅ ${product.name} - PNG trouvé: ${pngUrl}`);
          updated++;
        } else {
          console.log(`⚠️  ${product.name} - Pas d'image`);
          noImage++;
        }
      }
    }

    console.log(`\n${"=".repeat(70)}`);
    console.log("📊 RÉSUMÉ:");
    console.log("=".repeat(70));
    console.log(`   ✅ URLs mises à jour: ${updated}`);
    console.log(`   ⏭️  URLs conservées: ${kept}`);
    console.log(`   ⚠️  Produits sans image: ${noImage}`);
    console.log(`   🗑️  Fichiers SVG supprimés: ${svgFiles.length}`);
    console.log(`\n✨ Mise à jour terminée !`);
    console.log(`\n💡 Les produits utilisent maintenant uniquement les images PNG/JPG.`);

  } catch (error: any) {
    console.error("❌ Erreur:", error.message);
    console.error(error.stack);
  } finally {
    process.exit(0);
  }
}

removeSvgAndUsePng();

