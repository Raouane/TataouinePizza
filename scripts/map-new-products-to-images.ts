/**
 * Script pour mapper les nouveaux produits aux images existantes
 * et créer des copies/renommages si nécessaire
 */

import "dotenv/config";
if (process.env.DATABASE_URL?.includes('supabase')) {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
}
import { db } from "../server/db";
import { pizzas } from "../shared/schema";
import { eq } from "drizzle-orm";
import fs from "fs";
import path from "path";

// Mapping des produits aux images existantes
const productImageMapping: Record<string, string[]> = {
  // Pizzas
  "Pizza 4 Fromages": ["4fromage.png", "4-fromages.png", "pizza-4-fromages.png"],
  "Pizza Pepperoni": ["pepperoni.png", "pizza-pepperoni.png"],
  "Calzone aux Œufs": ["calzone.png", "calzone-aux-oeufs.png"],
  "Pizza Œuf au Plat": ["calzone.png", "pizza-oeuf.png"],
  
  // Desserts
  "Éclair au Chocolat": ["eclair-chocolat.png", "eclair.png"],
  "Baklava": ["baklawa tunisienne.png", "baklava.png"],
  "Macarons": ["macaron.png", "macarons.png"],
  "Ma'amoul": ["makroudh.png", "maamoul.png"],
  "Mille-feuille": ["mille-feuille.png"],
  "Biscuits Blancs": ["Kaak Warka.png", "biscuits.png"],
  
  // Plats traditionnels
  "Couscous au Poulet": ["couscous-poulet.png", "couscous.png"],
  "Ragoût de Poulet": ["kamounia.png", "ragout.png"],
  "Tajine": ["kamounia.png", "tajine.png"],
  "Shakshuka": ["ojja-merguez.png", "shakshuka.png"],
  "Œufs aux Saucisses": ["ojja-merguez.png", "oeufs-saucisses.png"],
  
  // Sandwiches
  "Sandwich au Thon": ["sandwich tunisien .png", "sandwich-thon.png"],
  "Sandwich Poulet Frites": ["sandwich poulet chiken.png", "sandwich-poulet.png"],
  
  // Accompagnements
  "Frites": ["frites.png"],
  
  // Pâtes
  "Pâtes à la Viande": ["makrouna-boeuf.png", "pates.png"],
};

function normalizeFileName(fileName: string): string {
  return fileName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
}

function findImageFile(productName: string, imagesDir: string): string | null {
  const possibleNames = productImageMapping[productName] || [];
  
  // Ajouter aussi des variantes basées sur le nom du produit
  const productSlug = normalizeFileName(productName);
  possibleNames.push(
    `${productSlug}.png`,
    `${productSlug}.jpg`,
    `${productSlug}.jpeg`
  );
  
  const files = fs.readdirSync(imagesDir);
  
  // Chercher une correspondance exacte d'abord
  for (const possibleName of possibleNames) {
    const normalizedPossible = normalizeFileName(possibleName);
    for (const file of files) {
      const normalizedFile = normalizeFileName(file);
      if (normalizedFile === normalizedPossible || 
          normalizedFile.includes(normalizedPossible) ||
          normalizedPossible.includes(normalizedFile)) {
        return file;
      }
    }
  }
  
  // Chercher une correspondance partielle
  const productWords = productSlug.split('-');
  for (const file of files) {
    const normalizedFile = normalizeFileName(file);
    const fileWords = normalizedFile.split('-');
    // Si au moins 2 mots correspondent
    const matches = productWords.filter(word => 
      fileWords.some(fw => fw.includes(word) || word.includes(fw))
    );
    if (matches.length >= 2) {
      return file;
    }
  }
  
  return null;
}

async function mapProductsToImages() {
  console.log("🖼️  Mapping des produits aux images existantes...\n");

  try {
    const imagesDir = path.resolve(process.cwd(), "client/public/images/products");
    
    if (!fs.existsSync(imagesDir)) {
      console.error("❌ Le dossier d'images n'existe pas:", imagesDir);
      process.exit(1);
    }

    const allProducts = await db.select().from(pizzas);
    console.log(`📦 ${allProducts.length} produits trouvés\n`);

    let mapped = 0;
    let notFound = 0;
    const notFoundProducts: string[] = [];

    for (const product of allProducts) {
      const imageFile = findImageFile(product.name, imagesDir);
      
      if (imageFile) {
        const imageUrl = `/images/products/${imageFile}`;
        
        // Mettre à jour l'URL dans la DB
        await db.update(pizzas)
          .set({ imageUrl, updatedAt: new Date() })
          .where(eq(pizzas.id, product.id));
        
        console.log(`✅ ${product.name}`);
        console.log(`   → ${imageUrl}`);
        mapped++;
      } else {
        console.log(`❌ ${product.name} - Image non trouvée`);
        notFoundProducts.push(product.name);
        notFound++;
      }
    }

    console.log(`\n${"=".repeat(70)}`);
    console.log("📊 RÉSUMÉ:");
    console.log("=".repeat(70));
    console.log(`   ✅ Produits mappés: ${mapped}`);
    console.log(`   ❌ Produits sans image: ${notFound}`);
    
    if (notFoundProducts.length > 0) {
      console.log(`\n📋 Produits sans image:`);
      notFoundProducts.forEach(name => console.log(`   - ${name}`));
    }

    console.log(`\n✨ Mapping terminé !`);

  } catch (error: any) {
    console.error("❌ Erreur:", error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

mapProductsToImages()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Erreur fatale:", error);
    process.exit(1);
  });
