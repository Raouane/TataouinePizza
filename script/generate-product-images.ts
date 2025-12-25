import { config } from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import https from "https";
import http from "http";

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
 * Télécharge une image depuis une URL
 */
function downloadImage(url: string, filePath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(filePath);
    const protocol = url.startsWith("https") ? https : http;

    protocol
      .get(url, (response) => {
        if (response.statusCode === 301 || response.statusCode === 302) {
          // Suivre les redirections
          return downloadImage(response.headers.location!, filePath)
            .then(resolve)
            .catch(reject);
        }

        if (response.statusCode !== 200) {
          file.close();
          fs.unlinkSync(filePath);
          reject(new Error(`Failed to download: ${response.statusCode}`));
          return;
        }

        response.pipe(file);

        file.on("finish", () => {
          file.close();
          resolve();
        });
      })
      .on("error", (err) => {
        file.close();
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
        reject(err);
      });
  });
}

/**
 * Génère une image placeholder SVG
 */
function generatePlaceholderSVG(productName: string, width: number = 800, height: number = 600): string {
  const colors = [
    { bg: "#FF6B6B", text: "#FFFFFF" },
    { bg: "#4ECDC4", text: "#FFFFFF" },
    { bg: "#45B7D1", text: "#FFFFFF" },
    { bg: "#FFA07A", text: "#FFFFFF" },
    { bg: "#98D8C8", text: "#2C3E50" },
    { bg: "#F7DC6F", text: "#2C3E50" },
    { bg: "#BB8FCE", text: "#FFFFFF" },
    { bg: "#85C1E2", text: "#FFFFFF" },
  ];

  const color = colors[productName.length % colors.length];
  const initials = productName
    .split(" ")
    .map((word) => word[0])
    .join("")
    .toUpperCase()
    .substring(0, 2);

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
  <rect width="${width}" height="${height}" fill="${color.bg}"/>
  <text x="50%" y="50%" font-family="Arial, sans-serif" font-size="72" font-weight="bold" 
        fill="${color.text}" text-anchor="middle" dominant-baseline="middle">
    ${initials}
  </text>
  <text x="50%" y="60%" font-family="Arial, sans-serif" font-size="24" 
        fill="${color.text}" text-anchor="middle" dominant-baseline="middle" opacity="0.8">
    ${productName}
  </text>
</svg>`;
}

/**
 * Génère une image placeholder depuis Unsplash (sans clé API)
 */
async function generateUnsplashPlaceholder(productName: string, productType: string): Promise<string | null> {
  // Mapper les types de produits à des mots-clés Unsplash
  const keywords: Record<string, string> = {
    pizza: "pizza",
    burger: "burger",
    sandwich: "sandwich",
    salade: "salad",
    drink: "drink",
    dessert: "dessert",
    plat: "food",
    tagine: "moroccan-food",
    couscous: "couscous",
    shawarma: "shawarma",
    shakshuka: "shakshuka",
    pates: "pasta",
    frites: "fries",
    beignets: "donut",
    baklava: "baklava",
    "mille-feuille": "mille-feuille",
    eclair: "eclair",
    macarons: "macarons",
    tarte: "pie",
    "ma-amoul": "date-cake",
  };

  const keyword = keywords[productType.toLowerCase()] || keywords[productName.toLowerCase()] || "food";
  
  // Utiliser Unsplash Source API (gratuit, sans clé)
  const width = 800;
  const height = 600;
  const url = `https://source.unsplash.com/${width}x${height}/?${keyword}`;
  
  return url;
}

/**
 * Crée une image placeholder locale
 */
async function createPlaceholderImage(productName: string, productType: string, imagesDir: string): Promise<string> {
  const slug = generateImageSlug(productName);
  const svgPath = path.join(imagesDir, `${slug}.svg`);
  const pngPath = path.join(imagesDir, `${slug}.png`);

  // Générer le SVG placeholder
  const svgContent = generatePlaceholderSVG(productName);
  fs.writeFileSync(svgPath, svgContent);

  console.log(`✅ Placeholder SVG créé: ${slug}.svg`);

  // Retourner le chemin relatif
  return `/images/products/${slug}.svg`;
}

async function generateProductImages() {
  console.log("🖼️  Génération automatique des images pour les produits...\n");

  try {
    // Récupérer tous les produits
    const allProducts = await db.select().from(pizzas);
    console.log(`📦 ${allProducts.length} produits trouvés\n`);

    // Vérifier/créer le dossier d'images
    const imagesDir = path.resolve(process.cwd(), "client/public/images/products");
    if (!fs.existsSync(imagesDir)) {
      console.log("📁 Création du dossier images...");
      fs.mkdirSync(imagesDir, { recursive: true });
    }

    let created = 0;
    let skipped = 0;
    let failed = 0;

    console.log("🎨 Génération des images placeholder...\n");

    for (const product of allProducts) {
      const slug = generateImageSlug(product.name);
      const svgPath = path.join(imagesDir, `${slug}.svg`);
      const pngPath = path.join(imagesDir, `${slug}.png`);
      const jpgPath = path.join(imagesDir, `${slug}.jpg`);

      // Vérifier si une image existe déjà
      if (fs.existsSync(svgPath) || fs.existsSync(pngPath) || fs.existsSync(jpgPath)) {
        console.log(`⏭️  Image existe déjà: ${product.name}`);
        skipped++;
        continue;
      }

      try {
        // Créer une image placeholder SVG
        const imageUrl = await createPlaceholderImage(
          product.name,
          product.productType || "pizza",
          imagesDir
        );

        // Mettre à jour l'URL dans la base de données si elle n'existe pas
        if (!product.imageUrl || product.imageUrl.trim() === "") {
          await db
            .update(pizzas)
            .set({ imageUrl: imageUrl })
            .where(eq(pizzas.id, product.id));

          console.log(`✅ Image créée et URL mise à jour: ${product.name}`);
          console.log(`   📷 URL: ${imageUrl}`);
        } else {
          console.log(`✅ Image créée: ${product.name} (URL déjà définie: ${product.imageUrl})`);
        }

        created++;
      } catch (error: any) {
        console.error(`❌ Erreur pour "${product.name}":`, error.message);
        failed++;
      }
    }

    console.log(`\n${"=".repeat(70)}`);
    console.log("📊 RÉSUMÉ:");
    console.log("=".repeat(70));
    console.log(`   ✅ Images créées: ${created}`);
    console.log(`   ⏭️  Images ignorées (déjà existantes): ${skipped}`);
    console.log(`   ❌ Erreurs: ${failed}`);
    console.log(`\n✨ Génération terminée !`);
    console.log(`\n💡 Les images sont des placeholders SVG colorés.`);
    console.log(`   Vous pouvez les remplacer par de vraies images plus tard.`);
    console.log(`   Format: client/public/images/products/nom-du-produit.svg`);

  } catch (error: any) {
    console.error("❌ Erreur:", error.message);
    console.error(error.stack);
  } finally {
    process.exit(0);
  }
}

generateProductImages();

