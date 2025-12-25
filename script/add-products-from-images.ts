import { config } from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

// Charger le .env depuis la racine du projet
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
config({ path: path.resolve(__dirname, "..", ".env") });

import { db } from "../server/db";
import { restaurants, pizzas, pizzaPrices } from "../shared/schema";
import { eq } from "drizzle-orm";
import fs from "fs";

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
 * Génère l'URL de l'image pour un produit
 * Vérifie d'abord si le fichier existe localement, sinon retourne null
 */
function generateImageUrl(productName: string, checkExists: boolean = false): string | null {
  const slug = generateImageSlug(productName);
  const imagePath = path.resolve(process.cwd(), "client/public/images/products", `${slug}.jpg`);
  const imagePathPng = path.resolve(process.cwd(), "client/public/images/products", `${slug}.png`);
  
  if (checkExists) {
    // Vérifier si le fichier existe
    if (fs.existsSync(imagePath)) {
      return `/images/products/${slug}.jpg`;
    }
    if (fs.existsSync(imagePathPng)) {
      return `/images/products/${slug}.png`;
    }
    return null;
  }
  
  // Par défaut, utiliser .jpg (vous pouvez changer selon vos fichiers)
  return `/images/products/${slug}.jpg`;
}

async function addProductsFromImages() {
  console.log("🍕 Ajout des produits depuis les images...\n");

  try {
    // Trouver les restaurants
    const patisserieName = "Pâtisserie EL BACHA";
    const babElHaraName = "BAB EL HARA";
    
    const patisserie = await db.select()
      .from(restaurants)
      .where(eq(restaurants.name, patisserieName))
      .limit(1);

    const babElHara = await db.select()
      .from(restaurants)
      .where(eq(restaurants.name, babElHaraName))
      .limit(1);

    if (patisserie.length === 0) {
      console.log(`❌ Restaurant "${patisserieName}" non trouvé`);
      console.log("💡 Veuillez créer le restaurant d'abord");
      process.exit(1);
    }

    if (babElHara.length === 0) {
      console.log(`❌ Restaurant "${babElHaraName}" non trouvé`);
      console.log("💡 Veuillez créer le restaurant d'abord");
      process.exit(1);
    }

    const patisserieId = patisserie[0].id;
    const babElHaraId = babElHara[0].id;
    
    console.log(`✅ Restaurant trouvé: ${patisserieName} (ID: ${patisserieId})`);
    console.log(`✅ Restaurant trouvé: ${babElHaraName} (ID: ${babElHaraId})\n`);

    // Vérifier si le dossier d'images existe
    const imagesDir = path.resolve(process.cwd(), "client/public/images/products");
    const imagesDirExists = fs.existsSync(imagesDir);
    
    if (!imagesDirExists) {
      console.log("⚠️  Le dossier client/public/images/products/ n'existe pas encore");
      console.log("💡 Les URLs d'images seront générées mais vous devrez ajouter les fichiers plus tard\n");
    } else {
      console.log(`✅ Dossier d'images trouvé: ${imagesDir}\n`);
    }

    // Liste des produits identifiés dans les images avec noms et prix
    const products = [
      // SANDWICHES
      {
        name: "Sandwich Poulet Frites",
        description: "Sandwich au poulet grillé, frites croustillantes et fromage fondu",
        productType: "sandwich",
        category: "chicken",
        prices: [
          { size: "small", price: "8.50" },
        ],
      },
      {
        name: "Sandwich Thon",
        description: "Thon, œufs durs, olives vertes, pommes de terre et sauce rouge",
        productType: "sandwich",
        category: "seafood",
        prices: [
          { size: "small", price: "7.50" },
        ],
      },
      {
        name: "Sandwich Thon Pan Bagnat",
        description: "Baguette croustillante, thon, œufs, olives, légumes frais",
        productType: "sandwich",
        category: "seafood",
        prices: [
          { size: "small", price: "9.00" },
        ],
      },
      {
        name: "Shawarma Poulet",
        description: "Poulet grillé épicé, légumes frais et sauce blanche",
        productType: "sandwich",
        category: "chicken",
        prices: [
          { size: "small", price: "10.00" },
        ],
      },
      {
        name: "Sandwich Poulet Grillé",
        description: "Poulet grillé aux marques de grill, salade, tomates et sauce",
        productType: "sandwich",
        category: "chicken",
        prices: [
          { size: "small", price: "9.50" },
        ],
      },

      // PIZZAS
      {
        name: "Pizza Végétarienne",
        description: "Courgettes grillées, poivrons, champignons, aubergines et olives",
        productType: "pizza",
        category: "vegetarian",
        prices: [
          { size: "small", price: "12.00" },
          { size: "medium", price: "18.00" },
          { size: "large", price: "24.00" },
        ],
      },
      {
        name: "Pizza Quatre Fromages",
        description: "Mozzarella, fromage bleu, ricotta et chèvre",
        productType: "pizza",
        category: "special",
        prices: [
          { size: "small", price: "14.00" },
          { size: "medium", price: "20.00" },
          { size: "large", price: "26.00" },
        ],
      },
      {
        name: "Pizza Pepperoni",
        description: "Sauce tomate, mozzarella et pepperoni",
        productType: "pizza",
        category: "classic",
        prices: [
          { size: "small", price: "13.00" },
          { size: "medium", price: "19.00" },
          { size: "large", price: "25.00" },
        ],
      },
      {
        name: "Pizza Œuf",
        description: "Pizza avec œuf au plat, pepperoni, poivrons et olives",
        productType: "pizza",
        category: "special",
        prices: [
          { size: "small", price: "13.50" },
          { size: "medium", price: "19.50" },
          { size: "large", price: "25.50" },
        ],
      },
      {
        name: "Calzone Œuf Jambon",
        description: "Calzone fourré aux œufs, jambon et fromage fondu",
        productType: "pizza",
        category: "special",
        prices: [
          { size: "small", price: "11.00" },
        ],
      },

      // PLATS
      {
        name: "Shakshuka Saucisses",
        description: "Œufs au plat dans une sauce tomate épicée avec saucisses",
        productType: "plat",
        category: "breakfast",
        prices: [
          { size: "small", price: "15.00" },
        ],
      },
      {
        name: "Tagine Poulet Pois",
        description: "Poulet mijoté aux pois dans une sauce tomate",
        productType: "plat",
        category: "chicken",
        prices: [
          { size: "small", price: "18.00" },
        ],
      },
      {
        name: "Couscous Poulet",
        description: "Couscous aux légumes, poulet épicé et pois chiches",
        productType: "plat",
        category: "chicken",
        prices: [
          { size: "small", price: "20.00" },
        ],
      },
      {
        name: "Tagine Viande",
        description: "Viande mijotée aux citrons confits et épices",
        productType: "plat",
        category: "meat",
        prices: [
          { size: "small", price: "22.00" },
        ],
      },
      {
        name: "Pâtes Viande Pois Chiches",
        description: "Fusilli à la sauce tomate, viande mijotée et pois chiches",
        productType: "plat",
        category: "pasta",
        prices: [
          { size: "small", price: "16.00" },
        ],
      },
      {
        name: "Tagine Thon",
        description: "Œuf au plat, thon, pois chiches et croûtons dans une sauce tomate",
        productType: "plat",
        category: "seafood",
        prices: [
          { size: "small", price: "17.00" },
        ],
      },
      {
        name: "Salade Thon",
        description: "Salade fraîche au thon, œufs durs, olives et légumes",
        productType: "salade",
        category: "seafood",
        prices: [
          { size: "small", price: "14.00" },
        ],
      },
      {
        name: "Frites",
        description: "Frites croustillantes salées",
        productType: "accompagnement",
        category: "sides",
        prices: [
          { size: "small", price: "4.00" },
        ],
      },

      // PÂTISSERIES
      {
        name: "Ma'amoul aux Dattes",
        description: "Pâtisserie traditionnelle fourrée aux dattes et graines de sésame",
        productType: "dessert",
        category: "tunisian",
        prices: [
          { size: "small", price: "2.50" },
        ],
      },
      {
        name: "Beignets",
        description: "Beignets traditionnels légers et moelleux",
        productType: "dessert",
        category: "tunisian",
        prices: [
          { size: "small", price: "3.00" },
        ],
      },
      {
        name: "Baklava",
        description: "Pâtisserie feuilletée au miel et aux pistaches",
        productType: "dessert",
        category: "oriental",
        prices: [
          { size: "small", price: "5.00" },
        ],
      },
      {
        name: "Mille-feuille",
        description: "Pâte feuilletée et crème pâtissière, glaçage au chocolat",
        productType: "dessert",
        category: "french",
        prices: [
          { size: "small", price: "6.00" },
        ],
      },
      {
        name: "Éclair au Chocolat",
        description: "Éclair garni de crème et glaçage au chocolat noir",
        productType: "dessert",
        category: "french",
        prices: [
          { size: "small", price: "5.50" },
        ],
      },
      {
        name: "Macarons",
        description: "Assortiment de macarons aux saveurs variées",
        productType: "dessert",
        category: "french",
        prices: [
          { size: "small", price: "12.00" },
        ],
      },
      {
        name: "Tarte aux Pommes",
        description: "Tarte aux pommes caramélisées sur pâte brisée",
        productType: "dessert",
        category: "french",
        prices: [
          { size: "small", price: "7.00" },
        ],
      },
      {
        name: "Tarte Citron Meringuée",
        description: "Tarte au citron avec meringue dorée",
        productType: "dessert",
        category: "french",
        prices: [
          { size: "small", price: "8.00" },
        ],
      },
      {
        name: "Tarte aux Fraises",
        description: "Tarte aux fraises fraîches sur crème pâtissière",
        productType: "dessert",
        category: "french",
        prices: [
          { size: "small", price: "8.50" },
        ],
      },
    ];

    let productsAdded = 0;
    let productsSkipped = 0;
    let imagesFound = 0;
    let imagesMissing = 0;
    let patisserieCount = 0;
    let babElHaraCount = 0;

    console.log(`📦 Insertion de ${products.length} produits...\n`);

    for (const product of products) {
      const { prices, ...productData } = product;
      
      // Déterminer le restaurant selon le type de produit
      // Les desserts (pâtisseries) vont à Pâtisserie EL BACHA
      // Tout le reste va à BAB EL HARA
      const targetRestaurantId = product.productType === "dessert" ? patisserieId : babElHaraId;
      const targetRestaurantName = product.productType === "dessert" ? patisserieName : babElHaraName;
      
      // Générer l'URL de l'image
      const imageUrl = generateImageUrl(product.name, imagesDirExists);
      const imageExists = imageUrl && imagesDirExists && fs.existsSync(
        path.resolve(process.cwd(), "client/public", imageUrl.substring(1))
      );
      
      if (imageExists) {
        imagesFound++;
      } else if (imageUrl) {
        imagesMissing++;
      }
      
      try {
        // Vérifier si le produit existe déjà dans le restaurant cible
        const existing = await db.select()
          .from(pizzas)
          .where(eq(pizzas.restaurantId, targetRestaurantId))
          .limit(100);

        const productExists = existing.some(p => p.name === product.name);
        
        if (productExists) {
          console.log(`⚠️  Produit "${product.name}" existe déjà dans ${targetRestaurantName}`);
          productsSkipped++;
          continue;
        }

        // Insérer le produit avec l'URL d'image générée
        const insertedProduct = await db.insert(pizzas).values({
          ...productData,
          restaurantId: targetRestaurantId,
          imageUrl: imageUrl || null,
          available: true,
        }).returning();

        const newProductId = insertedProduct[0].id;
        const imageStatus = imageExists ? "✅" : imageUrl ? "⚠️ " : "❌";
        console.log(`${imageStatus} Produit créé: ${product.name} → ${targetRestaurantName}${imageUrl ? ` (${imageUrl})` : ""}`);
        
        // Compter les produits par restaurant
        if (product.productType === "dessert") {
          patisserieCount++;
        } else {
          babElHaraCount++;
        }

        // Insérer les prix
        for (const price of prices) {
          try {
            await db.insert(pizzaPrices).values({
              pizzaId: newProductId,
              size: price.size as "small" | "medium" | "large",
              price: price.price,
            });
          } catch (error: any) {
            console.error(`❌ Erreur prix pour ${product.name}:`, error.message);
          }
        }

        productsAdded++;
      } catch (error: any) {
        if (error.code === '23505') {
          console.log(`⚠️  Produit "${product.name}" existe déjà`);
          productsSkipped++;
        } else {
          console.error(`❌ Erreur pour "${product.name}":`, error.message);
        }
      }
    }

    console.log(`\n${"=".repeat(70)}`);
    console.log("📊 RÉSUMÉ:");
    console.log("=".repeat(70));
    console.log(`   ✅ Produits ajoutés: ${productsAdded}`);
    console.log(`      🍰 ${patisserieName}: ${patisserieCount} produits`);
    console.log(`      🍕 ${babElHaraName}: ${babElHaraCount} produits`);
    console.log(`   ⚠️  Produits ignorés (déjà existants): ${productsSkipped}`);
    if (imagesDirExists) {
      console.log(`   🖼️  Images trouvées: ${imagesFound}`);
      console.log(`   ⚠️  Images manquantes: ${imagesMissing}`);
    }
    console.log(`\n✨ Insertion terminée !`);
    
    if (imagesMissing > 0) {
      console.log(`\n💡 Pour ajouter les images manquantes:`);
      console.log(`   1. Placez vos images dans: client/public/images/products/`);
      console.log(`   2. Nommez-les selon le format: nom-du-produit.jpg`);
      console.log(`   3. Exemple: "sandwich-poulet-frites.jpg"`);
      console.log(`\n📋 Liste des noms de fichiers attendus:`);
      products.forEach(product => {
        const slug = generateImageSlug(product.name);
        console.log(`   - ${slug}.jpg`);
      });
    }

  } catch (error: any) {
    console.error("❌ Erreur:", error.message);
    console.error(error.stack);
  } finally {
    process.exit(0);
  }
}

addProductsFromImages();

