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

async function checkImageUrls() {
  console.log("🔍 Vérification des URLs d'images...\n");

  try {
    const allProducts = await db.select().from(pizzas);
    console.log(`📦 ${allProducts.length} produits trouvés\n`);

    const imagesDir = path.resolve(process.cwd(), "client/public/images/products");
    const imageFiles = fs.existsSync(imagesDir) ? fs.readdirSync(imagesDir) : [];
    const imageFileSet = new Set(imageFiles.map(f => f.toLowerCase()));

    console.log(`📸 ${imageFiles.length} fichiers images dans le dossier\n`);

    let validUrls = 0;
    let invalidUrls = 0;
    let nullUrls = 0;
    const invalidProducts: Array<{ name: string; url: string | null; reason: string }> = [];

    for (const product of allProducts) {
      if (!product.imageUrl || product.imageUrl.trim() === "") {
        nullUrls++;
        invalidProducts.push({
          name: product.name,
          url: null,
          reason: "Pas d'URL"
        });
        continue;
      }

      // Extraire le nom de fichier de l'URL
      const urlPath = product.imageUrl.replace(/^\/images\/products\//, "");
      const fileName = urlPath.split("?")[0]; // Enlever les query params si présents
      const fileNameLower = fileName.toLowerCase();

      // Vérifier si le fichier existe
      if (imageFileSet.has(fileNameLower)) {
        validUrls++;
        console.log(`✅ ${product.name}: ${product.imageUrl}`);
      } else {
        invalidUrls++;
        invalidProducts.push({
          name: product.name,
          url: product.imageUrl,
          reason: `Fichier non trouvé: ${fileName}`
        });
        console.log(`❌ ${product.name}: ${product.imageUrl} - Fichier non trouvé`);
      }
    }

    console.log(`\n${"=".repeat(70)}`);
    console.log("📊 RÉSUMÉ:");
    console.log("=".repeat(70));
    console.log(`   ✅ URLs valides: ${validUrls}`);
    console.log(`   ❌ URLs invalides: ${invalidUrls}`);
    console.log(`   ⚠️  URLs nulles: ${nullUrls}\n`);

    if (invalidProducts.length > 0) {
      console.log("❌ PRODUITS AVEC URLs INVALIDES:");
      console.log("----------------------------------------------------------------------");
      invalidProducts.forEach(item => {
        console.log(`   ❌ ${item.name}`);
        console.log(`      URL: ${item.url || 'null'}`);
        console.log(`      Raison: ${item.reason}\n`);
      });
    }

    console.log("\n💡 Les produits avec des URLs invalides afficheront l'emoji 🍕 en fallback.");

  } catch (error: any) {
    console.error("❌ Erreur:", error.message);
    console.error(error.stack);
  } finally {
    process.exit(0);
  }
}

checkImageUrls();

