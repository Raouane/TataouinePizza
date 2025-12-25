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

/**
 * Génère un slug à partir du nom du produit pour créer le nom de fichier attendu
 */
function generateImageSlug(productName: string): string {
  return productName
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Supprime les accents
    .replace(/[^a-z0-9]+/g, "-") // Remplace les caractères spéciaux par des tirets
    .replace(/^-|-$/g, ""); // Supprime les tirets en début/fin
}

async function listProductsWithoutImages() {
  console.log("📋 Liste des produits sans images...\n");

  try {
    const allProducts = await db.select().from(pizzas);
    console.log(`📦 ${allProducts.length} produits trouvés\n`);

    const imagesDir = path.resolve(process.cwd(), "client/public/images/products");
    const imageFiles = fs.existsSync(imagesDir) ? fs.readdirSync(imagesDir) : [];
    const imageFileSet = new Set(imageFiles.map(f => f.toLowerCase()));

    const productsWithoutImages: Array<{
      name: string;
      id: string;
      expectedFileName: string;
      category?: string;
    }> = [];

    for (const product of allProducts) {
      if (!product.imageUrl || product.imageUrl.trim() === "") {
        const slug = generateImageSlug(product.name);
        const expectedFileName = `${slug}.png`;
        
        productsWithoutImages.push({
          name: product.name,
          id: product.id,
          expectedFileName: expectedFileName,
          category: product.category || undefined
        });
      }
    }

    console.log(`\n${"=".repeat(70)}`);
    console.log("📊 PRODUITS SANS IMAGES");
    console.log("=".repeat(70));
    console.log(`\n   Total: ${productsWithoutImages.length} produits\n`);

    if (productsWithoutImages.length > 0) {
      console.log("📝 LISTE DES PRODUITS À AJOUTER:");
      console.log("----------------------------------------------------------------------\n");
      
      productsWithoutImages.forEach((item, index) => {
        console.log(`${index + 1}. ${item.name}`);
        console.log(`   📁 Nom de fichier attendu: ${item.expectedFileName}`);
        console.log(`   📂 Chemin complet: client/public/images/products/${item.expectedFileName}`);
        if (item.category) {
          console.log(`   🏷️  Catégorie: ${item.category}`);
        }
        console.log("");
      });

      // Créer un fichier texte avec la liste
      const listContent = `LISTE DES PRODUITS SANS IMAGES
===========================

Total: ${productsWithoutImages.length} produits

INSTRUCTIONS:
1. Placez les images dans: client/public/images/products/
2. Nommez-les exactement comme indiqué ci-dessous
3. Formats acceptés: .png, .jpg, .jpeg

PRODUITS À AJOUTER:
${productsWithoutImages.map((item, index) => 
  `${index + 1}. ${item.name}\n   → ${item.expectedFileName}`
).join('\n\n')}

APRÈS AJOUT:
- Rechargez la page pour voir les nouvelles images
- Les images seront automatiquement associées aux produits
`;

      const listPath = path.join(imagesDir, "PRODUITS_SANS_IMAGES.txt");
      fs.writeFileSync(listPath, listContent);
      console.log(`\n💾 Liste sauvegardée dans: ${listPath}\n`);
    } else {
      console.log("✅ Tous les produits ont des images !\n");
    }

    console.log("💡 Pour ajouter les images:");
    console.log("   1. Placez les fichiers PNG dans: client/public/images/products/");
    console.log("   2. Nommez-les exactement comme indiqué dans la liste ci-dessus");
    console.log("   3. Rechargez la page pour voir les images\n");

  } catch (error: any) {
    console.error("❌ Erreur:", error.message);
    console.error(error.stack);
  } finally {
    process.exit(0);
  }
}

listProductsWithoutImages();

