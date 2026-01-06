/**
 * Script pour tester l'affichage des images
 * Vérifie que les URLs dans la DB correspondent aux fichiers existants
 */

import "dotenv/config";
if (process.env.DATABASE_URL?.includes('supabase')) {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
}
import { db } from "../server/db";
import { pizzas } from "../shared/schema";
import fs from "fs";
import path from "path";

async function testImageDisplay() {
  console.log("🖼️  Test d'affichage des images...\n");

  const imagesDir = path.resolve(process.cwd(), "client/public/images/products");
  const files = fs.existsSync(imagesDir) ? fs.readdirSync(imagesDir) : [];
  const fileSet = new Set(files.map(f => f.toLowerCase()));

  console.log(`📁 Dossier: ${imagesDir}`);
  console.log(`📸 ${files.length} fichiers images trouvés\n`);

  const allProducts = await db.select().from(pizzas).limit(20);
  console.log(`📦 ${allProducts.length} produits à vérifier\n`);

  let valid = 0;
  let invalid = 0;
  const invalidProducts: Array<{ name: string; url: string; reason: string }> = [];

  for (const product of allProducts) {
    if (!product.imageUrl || product.imageUrl.trim() === "") {
      invalid++;
      invalidProducts.push({
        name: product.name,
        url: "AUCUNE",
        reason: "Pas d'URL d'image"
      });
      continue;
    }

    // Extraire le nom de fichier
    const fileName = product.imageUrl.replace('/images/products/', '');
    const fileNameLower = fileName.toLowerCase();
    
    // Vérifier si le fichier existe (avec différentes variantes)
    const exists = fileSet.has(fileNameLower) || 
                   files.some(f => f.toLowerCase() === fileNameLower);

    if (exists) {
      valid++;
      console.log(`✅ ${product.name}`);
      console.log(`   ${product.imageUrl}`);
    } else {
      invalid++;
      invalidProducts.push({
        name: product.name,
        url: product.imageUrl,
        reason: `Fichier non trouvé: ${fileName}`
      });
      console.log(`❌ ${product.name}`);
      console.log(`   ${product.imageUrl} - Fichier non trouvé`);
      
      // Chercher des variantes
      const baseName = fileName.replace(/\.(jpg|jpeg|png|svg)$/i, '').toLowerCase();
      const variants = files.filter(f => 
        f.toLowerCase().includes(baseName) || 
        baseName.includes(f.toLowerCase().replace(/\.(jpg|jpeg|png|svg)$/i, ''))
      );
      if (variants.length > 0) {
        console.log(`   💡 Variantes possibles: ${variants.join(', ')}`);
      }
    }
  }

  console.log(`\n${"=".repeat(70)}`);
  console.log("📊 RÉSUMÉ:");
  console.log("=".repeat(70));
  console.log(`   ✅ Images valides: ${valid}`);
  console.log(`   ❌ Images invalides: ${invalid}`);
  
  if (invalidProducts.length > 0) {
    console.log(`\n📋 Produits avec problèmes:`);
    invalidProducts.forEach(p => {
      console.log(`   - ${p.name}: ${p.reason}`);
    });
  }

  console.log(`\n💡 Pour tester dans le navigateur:`);
  console.log(`   1. Ouvrez http://localhost:5000/images/products/pizza-4-fromages.jpg`);
  console.log(`   2. Vérifiez la console du navigateur (F12) pour les erreurs 404`);
  console.log(`   3. Vérifiez l'onglet Network pour voir les requêtes d'images`);

  process.exit(0);
}

testImageDisplay();
