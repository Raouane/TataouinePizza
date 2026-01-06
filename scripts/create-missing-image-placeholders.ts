/**
 * Script pour créer des images placeholder SVG pour les produits sans image
 */

import fs from "fs";
import path from "path";

const imagesDir = path.resolve(process.cwd(), "client/public/images/products");

// Produits sans image identifiés
const missingProducts = [
  { name: "Tataouine Spéciale", slug: "tataouine-speciale" },
  { name: "4 Fromages", slug: "4-fromages" },
  { name: "Vegetarian", slug: "vegetarian" },
  { name: "Mechoui", slug: "mechoui" },
  { name: "Brochettes Mixtes", slug: "brochettes-mixtes" },
  { name: "Pizza Œuf au Plat", slug: "pizza-oeuf-au-plat" }, // Utilise actuellement calzone.png
];

function generatePlaceholderSVG(productName: string, width: number = 800, height: number = 600): string {
  const emoji = "🍕"; // Emoji par défaut pour les pizzas
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#f3f4f6;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#e5e7eb;stop-opacity:1" />
    </linearGradient>
  </defs>
  <rect width="100%" height="100%" fill="url(#grad)"/>
  <text x="50%" y="45%" font-family="Arial, sans-serif" font-size="120" text-anchor="middle" fill="#9ca3af">${emoji}</text>
  <text x="50%" y="60%" font-family="Arial, sans-serif" font-size="32" font-weight="bold" text-anchor="middle" fill="#6b7280">${productName}</text>
</svg>`;
}

async function createPlaceholders() {
  console.log("🎨 Création des images placeholder pour les produits manquants...\n");

  if (!fs.existsSync(imagesDir)) {
    console.error("❌ Le dossier d'images n'existe pas:", imagesDir);
    process.exit(1);
  }

  let created = 0;
  let skipped = 0;

  for (const product of missingProducts) {
    const filePath = path.join(imagesDir, `${product.slug}.svg`);
    
    if (fs.existsSync(filePath)) {
      console.log(`⏭️  Fichier existe déjà: ${product.slug}.svg`);
      skipped++;
      continue;
    }

    try {
      const svg = generatePlaceholderSVG(product.name);
      fs.writeFileSync(filePath, svg);
      console.log(`✅ ${product.name} → ${product.slug}.svg`);
      created++;
    } catch (error: any) {
      console.error(`❌ Erreur pour ${product.name}:`, error.message);
    }
  }

  console.log(`\n${"=".repeat(70)}`);
  console.log("📊 RÉSUMÉ:");
  console.log("=".repeat(70));
  console.log(`   ✅ Placeholders créés: ${created}`);
  console.log(`   ⏭️  Fichiers ignorés: ${skipped}`);
  console.log(`\n✨ Terminé !`);
}

createPlaceholders()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Erreur fatale:", error);
    process.exit(1);
  });
