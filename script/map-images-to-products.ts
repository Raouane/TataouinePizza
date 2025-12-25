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
    .replace(/[\u0300-\u036f]/g, "") // Supprime les accents
    .replace(/[^a-z0-9]+/g, "-") // Remplace les caractères spéciaux par des tirets
    .replace(/^-|-$/g, ""); // Supprime les tirets en début/fin
}

/**
 * Normalise un nom de fichier pour la comparaison
 */
function normalizeFileName(fileName: string): string {
  return fileName
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Supprime les accents
    .replace(/[^a-z0-9]+/g, "-") // Remplace les caractères spéciaux par des tirets
    .replace(/^-|-$/g, "") // Supprime les tirets en début/fin
    .replace(/\.(png|jpg|jpeg|svg)$/i, ""); // Supprime l'extension
}

/**
 * Mappings manuels pour les correspondances difficiles
 */
const manualMappings: Record<string, string[]> = {
  "pizza quatre fromages": ["4fromage", "quatre-fromages", "4-fromages"],
  "pizza pepperoni": ["pepperoni"],
  "pizza végétarienne": ["vegetarienne", "vegetarian"],
  "éclair au chocolat": ["eclair-chocolat", "eclair"],
  "macarons": ["macaron"],
  "baklava": ["baklawa"],
  "tarte aux fraises": ["tarte-fraise", "tarte-fraises"],
  "tarte aux pommes": ["tarte-pomme", "tarte-pommes"],
  "pizza œuf": ["pizza-oeuf", "oeuf"],
  "shakshuka saucisses": ["ojja-merguez", "shakshuka"],
  "tagine poulet pois": ["jelbana poulet", "tagine-poulet"],
  "pâtes viande pois chiches": ["makrouna-boeuf", "pates"],
  "shawarma poulet": ["sandwich tunisien", "shawarma"],
};

/**
 * Trouve la meilleure correspondance entre un produit et un fichier image
 */
function findBestMatch(productName: string, imageFiles: string[]): string | null {
  const productSlug = generateImageSlug(productName);
  const productNormalized = normalizeFileName(productName);
  const productLower = productName.toLowerCase();
  
  // Vérifier les mappings manuels d'abord
  for (const [key, patterns] of Object.entries(manualMappings)) {
    if (productLower.includes(key)) {
      for (const pattern of patterns) {
        for (const file of imageFiles) {
          const fileNormalized = normalizeFileName(file);
          if (fileNormalized.includes(pattern)) {
            return file;
          }
        }
      }
    }
  }
  
  // Mots-clés pour la correspondance
  const keywords = productName.toLowerCase().split(/\s+/).filter(k => k.length > 2);
  
  // Essayer une correspondance exacte d'abord
  for (const file of imageFiles) {
    const fileNormalized = normalizeFileName(file);
    if (fileNormalized === productSlug || fileNormalized === productNormalized) {
      return file;
    }
  }
  
  // Essayer une correspondance partielle avec mots-clés (au moins 2 mots correspondants)
  for (const file of imageFiles) {
    const fileNormalized = normalizeFileName(file);
    const matches = keywords.filter(keyword => 
      keyword.length > 3 && fileNormalized.includes(keyword)
    );
    if (matches.length >= Math.min(2, keywords.length)) {
      return file;
    }
  }
  
  // Correspondance partielle simple (1 mot-clé principal)
  for (const file of imageFiles) {
    const fileNormalized = normalizeFileName(file);
    // Vérifier si un mot-clé principal est présent
    const mainKeywords = keywords.filter(k => k.length > 4);
    if (mainKeywords.length > 0 && mainKeywords.some(k => fileNormalized.includes(k))) {
      return file;
    }
  }
  
  return null;
}

/**
 * Mappe les images aux produits
 */
async function mapImagesToProducts() {
  console.log("🔗 Association des images aux produits...\n");

  try {
    // Récupérer tous les produits
    const allProducts = await db.select().from(pizzas);
    console.log(`📦 ${allProducts.length} produits trouvés\n`);

    // Lister tous les fichiers images
    const imagesDir = path.resolve(process.cwd(), "client/public/images/products");
    if (!fs.existsSync(imagesDir)) {
      console.error("❌ Le dossier images n'existe pas:", imagesDir);
      process.exit(1);
    }

    const imageFiles = fs.readdirSync(imagesDir).filter(file => 
      /\.(png|jpg|jpeg|svg)$/i.test(file)
    );
    
    console.log(`🖼️  ${imageFiles.length} fichiers images trouvés:\n`);
    imageFiles.forEach(file => console.log(`   - ${file}`));
    console.log();

    const mappings: Array<{ product: string; image: string; url: string }> = [];
    const unmatched: Array<{ product: string }> = [];
    const unused: string[] = [...imageFiles];

    // Associer chaque produit à une image
    for (const product of allProducts) {
      const match = findBestMatch(product.name, imageFiles);
      
      if (match) {
        const imageUrl = `/images/products/${match}`;
        await db
          .update(pizzas)
          .set({ imageUrl: imageUrl })
          .where(eq(pizzas.id, product.id));

        mappings.push({
          product: product.name,
          image: match,
          url: imageUrl
        });

        // Retirer de la liste des fichiers non utilisés
        const index = unused.indexOf(match);
        if (index > -1) {
          unused.splice(index, 1);
        }

        console.log(`✅ ${product.name}`);
        console.log(`   → ${match}`);
        console.log(`   📷 URL: ${imageUrl}`);
      } else {
        unmatched.push({ product: product.name });
        console.log(`⚠️  ${product.name} - Aucune image correspondante trouvée`);
      }
    }

    console.log(`\n${"=".repeat(70)}`);
    console.log("📊 RÉSUMÉ:");
    console.log("=".repeat(70));
    console.log(`   ✅ Produits associés: ${mappings.length}`);
    console.log(`   ⚠️  Produits sans image: ${unmatched.length}`);
    console.log(`   📁 Images non utilisées: ${unused.length}`);

    if (unmatched.length > 0) {
      console.log(`\n⚠️  PRODUITS SANS IMAGE:`);
      unmatched.forEach(item => {
        console.log(`   - ${item.product}`);
      });
    }

    if (unused.length > 0) {
      console.log(`\n📁 IMAGES NON UTILISÉES:`);
      unused.forEach(file => {
        console.log(`   - ${file}`);
      });
      console.log(`\n💡 Ces images peuvent être associées manuellement via l'admin.`);
    }

    console.log(`\n✨ Association terminée !`);

  } catch (error: any) {
    console.error("❌ Erreur:", error.message);
    console.error(error.stack);
  } finally {
    process.exit(0);
  }
}

mapImagesToProducts();

