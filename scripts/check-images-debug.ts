/**
 * Script de débogage pour vérifier les images
 */

import "dotenv/config";
if (process.env.DATABASE_URL?.includes('supabase')) {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
}
import { db } from "../server/db";
import { pizzas } from "../shared/schema";
import fs from "fs";
import path from "path";

async function checkImages() {
  console.log("🔍 Vérification des images...\n");

  const imagesDir = path.resolve(process.cwd(), "client/public/images/products");
  console.log(`📁 Dossier images: ${imagesDir}`);
  console.log(`   Existe: ${fs.existsSync(imagesDir)}\n`);

  if (fs.existsSync(imagesDir)) {
    const files = fs.readdirSync(imagesDir);
    console.log(`📸 ${files.length} fichiers dans le dossier:\n`);
    files.slice(0, 20).forEach(file => {
      const filePath = path.join(imagesDir, file);
      const stats = fs.statSync(filePath);
      console.log(`   - ${file} (${(stats.size / 1024).toFixed(2)} KB)`);
    });
    if (files.length > 20) {
      console.log(`   ... et ${files.length - 20} autres fichiers\n`);
    }
  }

  console.log("\n" + "=".repeat(70));
  console.log("📦 Vérification des produits dans la DB:\n");

  const allProducts = await db.select().from(pizzas).limit(10);
  
  for (const product of allProducts) {
    console.log(`\n${product.name}:`);
    console.log(`   URL: ${product.imageUrl || 'AUCUNE'}`);
    
    if (product.imageUrl) {
      // Extraire le nom de fichier
      const fileName = product.imageUrl.replace('/images/products/', '');
      const filePath = path.join(imagesDir, fileName);
      const exists = fs.existsSync(filePath);
      
      console.log(`   Fichier: ${fileName}`);
      console.log(`   Chemin: ${filePath}`);
      console.log(`   Existe: ${exists ? '✅' : '❌'}`);
      
      if (!exists) {
        // Chercher des variantes
        const baseName = fileName.replace(/\.(jpg|jpeg|png|svg)$/i, '');
        const variants = fs.readdirSync(imagesDir).filter(f => 
          f.toLowerCase().includes(baseName.toLowerCase()) || 
          baseName.toLowerCase().includes(f.toLowerCase().replace(/\.(jpg|jpeg|png|svg)$/i, ''))
        );
        if (variants.length > 0) {
          console.log(`   ⚠️  Variantes trouvées: ${variants.join(', ')}`);
        }
      }
    }
  }

  console.log("\n" + "=".repeat(70));
  console.log("✅ Vérification terminée");
  process.exit(0);
}

checkImages();
