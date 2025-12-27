import "dotenv/config";
import { db } from "../server/db";
import { pizzas, restaurants } from "../shared/schema";
import { eq } from "drizzle-orm";
import fs from "fs";
import path from "path";

async function verifyAndUpdateImageUrls() {
  console.log("🔍 VÉRIFICATION ET MISE À JOUR DES URLs D'IMAGES\n");
  console.log("=".repeat(70));

  try {
    const allProducts = await db.select().from(pizzas);
    const allRestaurants = await db.select().from(restaurants);
    const restaurantMap = new Map(allRestaurants.map(r => [r.id, r.name]));

    console.log(`\n📊 ${allProducts.length} produits trouvés\n`);

    // Vérifier les dossiers d'images possibles
    const possibleImageDirs = [
      path.resolve(process.cwd(), "client/public/images/products"),
      path.resolve(process.cwd(), "images/products"),
      path.resolve(process.cwd(), "public/images/products"),
    ];

    let imagesDir: string | null = null;
    for (const dir of possibleImageDirs) {
      if (fs.existsSync(dir)) {
        imagesDir = dir;
        console.log(`✅ Dossier d'images trouvé: ${dir}\n`);
        break;
      }
    }

    if (!imagesDir) {
      console.log("⚠️  Aucun dossier d'images produits trouvé.");
      console.log("Les images actuelles sont probablement des URLs externes (Unsplash).\n");
    }

    let unchangedCount = 0;
    let updatedCount = 0;
    let missingCount = 0;

    console.log("📋 VÉRIFICATION DES PRODUITS:\n");
    console.log("-".repeat(70));

    for (const product of allProducts) {
      const restaurantName = restaurantMap.get(product.restaurantId) || 'Inconnu';
      const currentImageUrl = product.imageUrl || null;

      console.log(`\n${product.name} (${restaurantName})`);
      console.log(`   Type: ${product.productType || 'pizza'}`);
      
      if (!currentImageUrl || currentImageUrl.trim() === '') {
        console.log(`   ❌ Pas d'image`);
        missingCount++;
        continue;
      }

      // Si c'est une URL externe (http/https), la garder telle quelle
      if (currentImageUrl.startsWith('http://') || currentImageUrl.startsWith('https://')) {
        console.log(`   ✅ URL externe: ${currentImageUrl.substring(0, 50)}...`);
        unchangedCount++;
        continue;
      }

      // Si c'est un chemin local, vérifier qu'il existe
      if (currentImageUrl.startsWith('/')) {
        const publicPath = path.resolve(process.cwd(), "client/public", currentImageUrl.substring(1));
        if (fs.existsSync(publicPath)) {
          console.log(`   ✅ Image locale trouvée: ${currentImageUrl}`);
          unchangedCount++;
        } else {
          console.log(`   ⚠️  Image locale introuvable: ${currentImageUrl}`);
          missingCount++;
        }
        continue;
      }

      // Si c'est un chemin relatif sans /, essayer de trouver l'image
      if (imagesDir) {
        const productSlug = product.name.toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-|-$/g, '');
        
        const possibleFiles = [
          `${productSlug}.jpg`,
          `${productSlug}.jpeg`,
          `${productSlug}.png`,
          `${productSlug}-medium.jpg`,
        ];

        let found = false;
        for (const file of possibleFiles) {
          const filePath = path.join(imagesDir, file);
          if (fs.existsSync(filePath)) {
            const newUrl = `/images/products/${file}`;
            console.log(`   🔄 Image trouvée, mise à jour: ${newUrl}`);
            
            await db.update(pizzas)
              .set({ imageUrl: newUrl, updatedAt: new Date() })
              .where(eq(pizzas.id, product.id));
            
            updatedCount++;
            found = true;
            break;
          }
        }

        if (!found) {
          console.log(`   ❌ Aucune image correspondante trouvée`);
          missingCount++;
        }
      } else {
        console.log(`   ⚠️  URL invalide ou dossier d'images introuvable`);
        missingCount++;
      }
    }

    console.log(`\n\n${"=".repeat(70)}`);
    console.log("📊 RÉSUMÉ:");
    console.log("=".repeat(70));
    console.log(`   ✅ URLs valides (inchangées): ${unchangedCount}`);
    console.log(`   🔄 URLs mises à jour: ${updatedCount}`);
    console.log(`   ❌ Images manquantes: ${missingCount}`);
    console.log(`\n✨ Vérification terminée !`);

  } catch (error: any) {
    console.error("❌ Erreur:", error.message);
    console.error(error.stack);
  } finally {
    process.exit(0);
  }
}

verifyAndUpdateImageUrls();




