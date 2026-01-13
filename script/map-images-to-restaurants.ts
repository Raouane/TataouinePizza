import { config } from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

// Charger le .env depuis la racine du projet
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
config({ path: path.resolve(__dirname, "..", ".env") });

import { db } from "../server/db";
import { restaurants } from "../shared/schema";
import { eq } from "drizzle-orm";

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
    .replace(/\.(png|jpg|jpeg)$/i, ""); // Supprime l'extension
}

/**
 * Mappings manuels pour les correspondances entre restaurants et images
 * Chaque restaurant a une image unique en priorité
 */
const manualMappings: Record<string, string[]> = {
  "tataouine pizza": [
    "pizza-margherita",  // Image principale unique pour Tataouine Pizza
    "pizza-4-fromages",
    "pizza-pepperoni"
  ],
  "pizza del sol": [
    "pizza-4-fromages",  // Image principale unique pour Pizza del Sol
    "pizza-pepperoni",
    "pizza-margherita"
  ],
  "sahara grill": [
    "makloub",  // Image principale unique pour Sahara Grill
    "shakshuka",
    "ojja-merguez",
    "oriental"
  ],
};

/**
 * Trouve la meilleure correspondance entre un restaurant et un fichier image
 */
function findBestMatch(restaurantName: string, imageFiles: string[]): string | null {
  const restaurantLower = restaurantName.toLowerCase();
  
  // Vérifier les mappings manuels d'abord
  for (const [key, patterns] of Object.entries(manualMappings)) {
    if (restaurantLower.includes(key)) {
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
  
  // Si pas de mapping manuel, chercher par catégorie du restaurant
  // Pour les restaurants pizza, utiliser des images de pizza
  if (restaurantLower.includes("pizza")) {
    for (const file of imageFiles) {
      const fileNormalized = normalizeFileName(file);
      if (fileNormalized.includes("pizza") || fileNormalized.includes("margherita")) {
        return file;
      }
    }
  }
  
  // Pour les restaurants grill, utiliser des images de grill
  if (restaurantLower.includes("grill")) {
    for (const file of imageFiles) {
      const fileNormalized = normalizeFileName(file);
      if (fileNormalized.includes("brochettes") || 
          fileNormalized.includes("makloub") || 
          fileNormalized.includes("shakshuka")) {
        return file;
      }
    }
  }
  
  return null;
}

/**
 * Mappe les images aux restaurants
 */
async function mapImagesToRestaurants() {
  console.log("🔗 Association des images aux restaurants...\n");

  try {
    // Récupérer tous les restaurants
    const allRestaurants = await db.select().from(restaurants);
    console.log(`📦 ${allRestaurants.length} restaurants trouvés\n`);

    // Lister tous les fichiers images dans products (on peut aussi créer un dossier restaurants plus tard)
    const imagesDir = path.resolve(process.cwd(), "client/public/images/products");
    if (!fs.existsSync(imagesDir)) {
      console.error("❌ Le dossier images n'existe pas:", imagesDir);
      process.exit(1);
    }

    const imageFiles = fs.readdirSync(imagesDir).filter(file => 
      /\.(png|jpg|jpeg)$/i.test(file) && !file.toLowerCase().endsWith('.svg')
    );
    
    console.log(`🖼️  ${imageFiles.length} fichiers images disponibles:\n`);
    imageFiles.slice(0, 10).forEach(file => console.log(`   - ${file}`));
    if (imageFiles.length > 10) {
      console.log(`   ... et ${imageFiles.length - 10} autres`);
    }
    console.log();

    const mappings: Array<{ restaurant: string; image: string; url: string }> = [];
    const unmatched: Array<{ restaurant: string }> = [];
    const usedImages = new Set<string>(); // Pour éviter les doublons

    // Associer chaque restaurant à une image unique
    for (const restaurant of allRestaurants) {
      const match = findBestMatch(restaurant.name, imageFiles.filter(f => !usedImages.has(f)));
      
      if (match) {
        usedImages.add(match); // Marquer l'image comme utilisée
        const imageUrl = `/images/products/${match}`;
        await db
          .update(restaurants)
          .set({ imageUrl: imageUrl })
          .where(eq(restaurants.id, restaurant.id));

        mappings.push({
          restaurant: restaurant.name,
          image: match,
          url: imageUrl
        });

        console.log(`✅ ${restaurant.name}`);
        console.log(`   → ${match}`);
        console.log(`   📷 URL: ${imageUrl}`);
      } else {
        unmatched.push({ restaurant: restaurant.name });
        console.log(`⚠️  ${restaurant.name} - Aucune image correspondante trouvée`);
      }
    }

    console.log(`\n${"=".repeat(70)}`);
    console.log("📊 RÉSUMÉ:");
    console.log("=".repeat(70));
    console.log(`   ✅ Restaurants associés: ${mappings.length}`);
    console.log(`   ⚠️  Restaurants sans image: ${unmatched.length}`);

    if (unmatched.length > 0) {
      console.log(`\n⚠️  RESTAURANTS SANS IMAGE:`);
      unmatched.forEach(item => {
        console.log(`   - ${item.restaurant}`);
      });
      console.log(`\n💡 Vous pouvez associer manuellement des images via l'admin.`);
    }

    console.log(`\n✨ Association terminée !`);

  } catch (error: any) {
    console.error("❌ Erreur:", error.message);
    console.error(error.stack);
  } finally {
    process.exit(0);
  }
}

mapImagesToRestaurants();
