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
 * Vérifie si un fichier image existe
 */
function checkImageExists(imageUrl: string | null): { exists: boolean; path?: string; extension?: string } {
  if (!imageUrl || imageUrl.trim() === "") {
    return { exists: false };
  }

  // Extraire le nom du fichier depuis l'URL
  const fileName = imageUrl.split("/").pop() || "";
  if (!fileName) {
    return { exists: false };
  }

  const imagesDir = path.resolve(process.cwd(), "client/public/images/products");
  const baseName = fileName.replace(/\.(jpg|jpeg|png)$/i, "");
  
  // Vérifier les extensions possibles
  const extensions = [".jpg", ".jpeg", ".png"];
  for (const ext of extensions) {
    const filePath = path.join(imagesDir, `${baseName}${ext}`);
    if (fs.existsSync(filePath)) {
      return { exists: true, path: filePath, extension: ext };
    }
  }

  return { exists: false };
}

async function checkMissingImages() {
  console.log("🔍 Vérification des images manquantes...\n");

  try {
    // Récupérer tous les produits
    const allProducts = await db.select().from(pizzas);
    console.log(`📦 ${allProducts.length} produits trouvés dans la base de données\n`);

    const imagesDir = path.resolve(process.cwd(), "client/public/images/products");
    const imagesDirExists = fs.existsSync(imagesDir);

    if (!imagesDirExists) {
      console.log("❌ Le dossier client/public/images/products/ n'existe pas !");
      console.log("💡 Création du dossier...");
      fs.mkdirSync(imagesDir, { recursive: true });
      console.log("✅ Dossier créé\n");
    }

    // Lister tous les fichiers images existants
    const existingImages = new Set<string>();
    if (fs.existsSync(imagesDir)) {
      const files = fs.readdirSync(imagesDir);
      files.forEach(file => {
        if (/\.(jpg|jpeg|png)$/i.test(file)) {
          const baseName = file.replace(/\.(jpg|jpeg|png)$/i, "");
          existingImages.add(baseName.toLowerCase());
        }
      });
    }

    console.log(`📸 ${existingImages.size} image(s) trouvée(s) dans le dossier\n`);

    // Vérifier chaque produit
    const productsWithImages: Array<{ name: string; imageUrl: string; status: string }> = [];
    const productsWithoutImages: Array<{ name: string; expectedFileName: string; imageUrl: string | null }> = [];
    const productsWithInvalidUrls: Array<{ name: string; imageUrl: string | null }> = [];

    for (const product of allProducts) {
      const slug = generateImageSlug(product.name);
      const expectedFileName = `${slug}.jpg`;
      const imageUrl = product.imageUrl;

      if (!imageUrl || imageUrl.trim() === "") {
        productsWithoutImages.push({
          name: product.name,
          expectedFileName,
          imageUrl: null
        });
        continue;
      }

      // Vérifier si l'URL correspond au format attendu
      const expectedUrl = `/images/products/${slug}.jpg`;
      if (imageUrl !== expectedUrl && !imageUrl.includes(slug)) {
        productsWithInvalidUrls.push({
          name: product.name,
          imageUrl
        });
      }

      // Vérifier si le fichier existe
      const checkResult = checkImageExists(imageUrl);
      if (checkResult.exists) {
        productsWithImages.push({
          name: product.name,
          imageUrl,
          status: "✅ Trouvée"
        });
      } else {
        productsWithoutImages.push({
          name: product.name,
          expectedFileName,
          imageUrl
        });
      }
    }

    // Afficher le rapport
    console.log("=".repeat(70));
    console.log("📊 RAPPORT DES IMAGES");
    console.log("=".repeat(70));
    console.log(`\n✅ Images trouvées: ${productsWithImages.length}`);
    console.log(`❌ Images manquantes: ${productsWithoutImages.length}`);
    if (productsWithInvalidUrls.length > 0) {
      console.log(`⚠️  URLs invalides: ${productsWithInvalidUrls.length}`);
    }

    if (productsWithImages.length > 0) {
      console.log(`\n✅ PRODUITS AVEC IMAGES (${productsWithImages.length}):`);
      console.log("-".repeat(70));
      productsWithImages.forEach(p => {
        console.log(`   ✅ ${p.name}`);
      });
    }

    if (productsWithoutImages.length > 0) {
      console.log(`\n❌ PRODUITS SANS IMAGES (${productsWithoutImages.length}):`);
      console.log("-".repeat(70));
      productsWithoutImages.forEach(p => {
        console.log(`   ❌ ${p.name}`);
        console.log(`      📁 Nom de fichier attendu: ${p.expectedFileName}`);
        if (p.imageUrl) {
          console.log(`      🔗 URL dans la DB: ${p.imageUrl}`);
        } else {
          console.log(`      ⚠️  Pas d'URL dans la base de données`);
        }
      });
    }

    if (productsWithInvalidUrls.length > 0) {
      console.log(`\n⚠️  PRODUITS AVEC URLs INVALIDES (${productsWithInvalidUrls.length}):`);
      console.log("-".repeat(70));
      productsWithInvalidUrls.forEach(p => {
        const slug = generateImageSlug(p.name);
        const expectedUrl = `/images/products/${slug}.jpg`;
        console.log(`   ⚠️  ${p.name}`);
        console.log(`      URL actuelle: ${p.imageUrl}`);
        console.log(`      URL attendue: ${expectedUrl}`);
      });
    }

    // Générer un fichier de liste pour faciliter l'ajout des images
    if (productsWithoutImages.length > 0) {
      const listFilePath = path.join(imagesDir, "LISTE_IMAGES_MANQUANTES.txt");
      const listContent = productsWithoutImages.map(p => 
        `${p.expectedFileName} - ${p.name}`
      ).join("\n");
      
      fs.writeFileSync(listFilePath, 
        `LISTE DES IMAGES MANQUANTES\n` +
        `==========================\n\n` +
        `Placez ces fichiers dans: client/public/images/products/\n\n` +
        listContent
      );
      
      console.log(`\n📝 Liste des images manquantes sauvegardée dans:`);
      console.log(`   ${listFilePath}`);
    }

    // Suggestions
    console.log(`\n💡 SUGGESTIONS:`);
    console.log(`   1. Placez vos images dans: client/public/images/products/`);
    console.log(`   2. Nommez-les exactement comme indiqué dans le rapport`);
    console.log(`   3. Formats acceptés: .jpg, .jpeg, .png`);
    console.log(`   4. Après ajout, rechargez la page pour voir les images`);

    console.log(`\n✨ Vérification terminée !`);

  } catch (error: any) {
    console.error("❌ Erreur:", error.message);
    console.error(error.stack);
  } finally {
    process.exit(0);
  }
}

checkMissingImages();

