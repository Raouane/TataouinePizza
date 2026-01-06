/**
 * Script pour ajouter les produits identifiés dans les images à la base de données
 * 
 * Usage: npx tsx scripts/add-products-from-images.ts
 */

import "dotenv/config";
// Forcer la configuration SSL avant d'importer db
if (process.env.DATABASE_URL?.includes('supabase')) {
  process.env.PGSSLMODE = 'no-verify';
}
import { db } from "../server/db";
import { restaurants, pizzas, pizzaPrices } from "../shared/schema";
import { eq, sql } from "drizzle-orm";

// Liste des produits identifiés dans les images
const products = [
  // ============ PIZZAS ============
  {
    name: "Pizza 4 Fromages",
    description: "Mozzarella, gorgonzola, parmesan, chèvre - Une explosion de saveurs fromagères",
    productType: "pizza",
    category: "special",
    imageUrl: "/images/products/pizza-4-fromages.jpg",
    prices: [
      { size: "small", price: "16.00" },
      { size: "medium", price: "20.00" },
      { size: "large", price: "24.00" },
    ],
    restaurantCategory: "pizza",
  },
  {
    name: "Pizza Pepperoni",
    description: "Sauce tomate, mozzarella, pepperoni épicé - Classique et savoureuse",
    productType: "pizza",
    category: "classic",
    imageUrl: "/images/products/pizza-pepperoni.jpg",
    prices: [
      { size: "small", price: "15.00" },
      { size: "medium", price: "19.00" },
      { size: "large", price: "23.00" },
    ],
    restaurantCategory: "pizza",
  },
  {
    name: "Calzone aux Œufs",
    description: "Calzone farcie avec œufs, jambon, fromage - Un délice italien",
    productType: "pizza",
    category: "special",
    imageUrl: "/images/products/calzone-aux-oeufs.jpg",
    prices: [
      { size: "small", price: "18.00" },
      { size: "medium", price: "22.00" },
      { size: "large", price: "26.00" },
    ],
    restaurantCategory: "pizza",
  },
  {
    name: "Pizza Œuf au Plat",
    description: "Pizza avec œuf au plat au centre, pepperoni, olives et légumes",
    productType: "pizza",
    category: "special",
    imageUrl: "/images/products/pizza-oeuf-au-plat.jpg",
    prices: [
      { size: "small", price: "17.00" },
      { size: "medium", price: "21.00" },
      { size: "large", price: "25.00" },
    ],
    restaurantCategory: "pizza",
  },
  
  // ============ DESSERTS ============
  {
    name: "Éclair au Chocolat",
    description: "Éclair généreusement garni de crème pâtissière et nappé de chocolat, décoré de feuilles d'or",
    productType: "dessert",
    category: "patisserie",
    imageUrl: "/images/products/eclair-au-chocolat.jpg",
    prices: [
      { size: "small", price: "8.00" },
      { size: "medium", price: "10.00" },
      { size: "large", price: "12.00" },
    ],
    restaurantCategory: "patisserie",
  },
  {
    name: "Baklava",
    description: "Pâtisserie orientale aux noix et pistaches, imbibée de sirop - Traditionnel et gourmand",
    productType: "dessert",
    category: "patisserie",
    imageUrl: "/images/products/baklava.jpg",
    prices: [
      { size: "small", price: "12.00" },
      { size: "medium", price: "15.00" },
      { size: "large", price: "18.00" },
    ],
    restaurantCategory: "patisserie",
  },
  {
    name: "Macarons",
    description: "Assortiment de macarons colorés aux saveurs variées - Raffiné et délicat",
    productType: "dessert",
    category: "patisserie",
    imageUrl: "/images/products/macarons.jpg",
    prices: [
      { size: "small", price: "25.00" },
      { size: "medium", price: "30.00" },
      { size: "large", price: "35.00" },
    ],
    restaurantCategory: "patisserie",
  },
  {
    name: "Ma'amoul",
    description: "Biscuits traditionnels aux dattes, saupoudrés de graines de sésame - Authentique",
    productType: "dessert",
    category: "patisserie",
    imageUrl: "/images/products/maamoul.jpg",
    prices: [
      { size: "small", price: "10.00" },
      { size: "medium", price: "12.00" },
      { size: "large", price: "15.00" },
    ],
    restaurantCategory: "patisserie",
  },
  {
    name: "Mille-feuille",
    description: "Pâtisserie feuilletée avec crème pâtissière, nappée de glaçage blanc et décorée au chocolat",
    productType: "dessert",
    category: "patisserie",
    imageUrl: "/images/products/mille-feuille.jpg",
    prices: [
      { size: "small", price: "9.00" },
      { size: "medium", price: "11.00" },
      { size: "large", price: "13.00" },
    ],
    restaurantCategory: "patisserie",
  },
  {
    name: "Biscuits Blancs",
    description: "Biscuits délicats en forme d'anneaux - Légers et savoureux",
    productType: "dessert",
    category: "patisserie",
    imageUrl: "/images/products/biscuits-blancs.jpg",
    prices: [
      { size: "small", price: "6.00" },
      { size: "medium", price: "8.00" },
      { size: "large", price: "10.00" },
    ],
    restaurantCategory: "patisserie",
  },
  
  // ============ PLATS TRADITIONNELS ============
  {
    name: "Couscous au Poulet",
    description: "Couscous royal avec cuisse de poulet rôtie, légumes et pois chiches - Plat traditionnel généreux",
    productType: "plat",
    category: "traditionnel",
    imageUrl: "/images/products/couscous-au-poulet.jpg",
    prices: [
      { size: "small", price: "22.00" },
      { size: "medium", price: "28.00" },
      { size: "large", price: "35.00" },
    ],
    restaurantCategory: "traditionnel",
  },
  {
    name: "Ragoût de Poulet",
    description: "Ragoût de poulet mijoté avec légumes et épices, servi dans un tajine - Savoureux et réconfortant",
    productType: "plat",
    category: "traditionnel",
    imageUrl: "/images/products/ragout-de-poulet.jpg",
    prices: [
      { size: "small", price: "20.00" },
      { size: "medium", price: "25.00" },
      { size: "large", price: "30.00" },
    ],
    restaurantCategory: "traditionnel",
  },
  {
    name: "Tajine",
    description: "Tajine de viande aux épices, citrons confits et abricots secs - Parfumé et tendre",
    productType: "plat",
    category: "traditionnel",
    imageUrl: "/images/products/tajine.jpg",
    prices: [
      { size: "small", price: "24.00" },
      { size: "medium", price: "30.00" },
      { size: "large", price: "38.00" },
    ],
    restaurantCategory: "traditionnel",
  },
  {
    name: "Shakshuka",
    description: "Œufs au plat dans une sauce tomate épicée avec thon, pois chiches et câpres - Chaud et réconfortant",
    productType: "plat",
    category: "traditionnel",
    imageUrl: "/images/products/shakshuka.jpg",
    prices: [
      { size: "small", price: "18.00" },
      { size: "medium", price: "22.00" },
      { size: "large", price: "26.00" },
    ],
    restaurantCategory: "traditionnel",
  },
  {
    name: "Œufs aux Saucisses",
    description: "Œufs au plat avec saucisses grillées dans une sauce tomate épicée - Épicé et savoureux",
    productType: "plat",
    category: "traditionnel",
    imageUrl: "/images/products/oeufs-aux-saucisses.jpg",
    prices: [
      { size: "small", price: "16.00" },
      { size: "medium", price: "20.00" },
      { size: "large", price: "24.00" },
    ],
    restaurantCategory: "traditionnel",
  },
  
  // ============ SANDWICHES ============
  {
    name: "Sandwich au Thon",
    description: "Sandwich généreux au thon avec œufs durs, olives vertes, pommes de terre et harissa",
    productType: "sandwich",
    category: "classic",
    imageUrl: "/images/products/sandwich-au-thon.jpg",
    prices: [
      { size: "small", price: "12.00" },
      { size: "medium", price: "15.00" },
      { size: "large", price: "18.00" },
    ],
    restaurantCategory: "sandwich",
  },
  {
    name: "Sandwich Poulet Frites",
    description: "Sandwich au poulet grillé avec frites dorées et fromage fondu - Classique et généreux",
    productType: "sandwich",
    category: "classic",
    imageUrl: "/images/products/sandwich-poulet-frites.jpg",
    prices: [
      { size: "small", price: "14.00" },
      { size: "medium", price: "17.00" },
      { size: "large", price: "20.00" },
    ],
    restaurantCategory: "sandwich",
  },
  
  // ============ ACCOMPAGNEMENTS ============
  {
    name: "Frites",
    description: "Frites dorées et croustillantes, généreusement salées - Accompagnement parfait",
    productType: "accompagnement",
    category: "classic",
    imageUrl: "/images/products/frites.jpg",
    prices: [
      { size: "small", price: "5.00" },
      { size: "medium", price: "7.00" },
      { size: "large", price: "9.00" },
    ],
    restaurantCategory: "fastfood",
  },
  
  // ============ PÂTES ============
  {
    name: "Pâtes à la Viande",
    description: "Fusilli à la sauce tomate avec morceaux de viande et pois chiches, garni de persil frais",
    productType: "plat",
    category: "italien",
    imageUrl: "/images/products/pates-a-la-viande.jpg",
    prices: [
      { size: "small", price: "16.00" },
      { size: "medium", price: "20.00" },
      { size: "large", price: "24.00" },
    ],
    restaurantCategory: "italien",
  },
];

async function addProductsFromImages() {
  console.log("🍕 Ajout des produits depuis les images...\n");

  try {
    // Récupérer tous les restaurants
    const allRestaurants = await db.select().from(restaurants);
    
    if (allRestaurants.length === 0) {
      console.log("❌ Aucun restaurant trouvé dans la base de données");
      console.log("💡 Veuillez créer au moins un restaurant d'abord");
      process.exit(1);
    }

    console.log(`✅ ${allRestaurants.length} restaurant(s) trouvé(s)\n`);

    // Grouper les produits par catégorie de restaurant
    const productsByCategory: Record<string, typeof products> = {};
    
    for (const product of products) {
      const category = product.restaurantCategory;
      if (!productsByCategory[category]) {
        productsByCategory[category] = [];
      }
      productsByCategory[category].push(product);
    }

    let totalAdded = 0;
    let totalSkipped = 0;
    let totalErrors = 0;

    // Pour chaque restaurant, ajouter les produits correspondant à ses catégories
    for (const restaurant of allRestaurants) {
      const restaurantCategories = Array.isArray(restaurant.categories)
        ? restaurant.categories
        : typeof restaurant.categories === 'string'
        ? JSON.parse(restaurant.categories)
        : [];

      console.log(`\n📦 Restaurant: ${restaurant.name}`);
      console.log(`   Catégories: ${restaurantCategories.join(', ') || 'aucune'}`);

      // Trouver les produits correspondant aux catégories du restaurant
      const matchingProducts: typeof products = [];
      
      for (const category of restaurantCategories) {
        if (productsByCategory[category]) {
          matchingProducts.push(...productsByCategory[category]);
        }
      }

      // Si aucune catégorie ne correspond, ajouter tous les produits (pour développement)
      // OU si le restaurant n'a pas de catégories définies
      if (matchingProducts.length === 0) {
        if (restaurantCategories.length === 0) {
          console.log("   ⚠️  Aucune catégorie définie, ajout de tous les produits");
          matchingProducts.push(...products);
        } else {
          // Essayer de trouver des produits par type plutôt que par catégorie
          console.log("   🔍 Recherche de produits par type...");
          for (const product of products) {
            // Si le restaurant a une catégorie qui correspond au type de produit
            if (restaurantCategories.some(cat => 
              (cat === 'pizza' && product.productType === 'pizza') ||
              (cat === 'patisserie' && product.productType === 'dessert') ||
              (cat === 'traditionnel' && product.productType === 'plat' && product.category === 'traditionnel') ||
              (cat === 'sandwich' && product.productType === 'sandwich') ||
              (cat === 'fastfood' && (product.productType === 'sandwich' || product.productType === 'accompagnement')) ||
              (cat === 'italien' && (product.productType === 'pizza' || product.productType === 'plat' && product.category === 'italien'))
            )) {
              matchingProducts.push(product);
            }
          }
        }
      }

      if (matchingProducts.length === 0) {
        console.log("   ⏭️  Aucun produit à ajouter pour ce restaurant");
        continue;
      }

      // Vérifier les produits existants
      const existingProducts = await db
        .select()
        .from(pizzas)
        .where(eq(pizzas.restaurantId, restaurant.id));

      const existingNames = new Set(existingProducts.map(p => p.name.toLowerCase()));

      // Ajouter les produits
      for (const product of matchingProducts) {
        const productNameLower = product.name.toLowerCase();
        
        if (existingNames.has(productNameLower)) {
          console.log(`   ⏭️  "${product.name}" existe déjà`);
          totalSkipped++;
          continue;
        }

        try {
          const { prices, restaurantCategory, ...productData } = product;
          
          // Insérer le produit
          const [insertedProduct] = await db
            .insert(pizzas)
            .values({
              ...productData,
              restaurantId: restaurant.id,
              available: true,
            })
            .returning();

          // Insérer les prix
          for (const price of prices) {
            await db.insert(pizzaPrices).values({
              pizzaId: insertedProduct.id,
              size: price.size as "small" | "medium" | "large",
              price: price.price,
            });
          }

          console.log(`   ✅ "${product.name}" ajouté`);
          totalAdded++;
        } catch (error: any) {
          console.error(`   ❌ Erreur pour "${product.name}":`, error.message);
          totalErrors++;
        }
      }
    }

    console.log("\n" + "=".repeat(50));
    console.log("📊 Résumé:");
    console.log(`   ✅ Produits ajoutés: ${totalAdded}`);
    console.log(`   ⏭️  Produits ignorés (déjà existants): ${totalSkipped}`);
    console.log(`   ❌ Erreurs: ${totalErrors}`);
    console.log("=".repeat(50));

    if (totalAdded > 0) {
      console.log("\n✅ Produits ajoutés avec succès !");
      console.log("💡 N'oubliez pas d'ajouter les images dans client/public/images/products/");
    }

  } catch (error: any) {
    console.error("\n❌ Erreur lors de l'ajout des produits:", error.message);
    console.error(error);
    process.exit(1);
  }
}

// Exécuter le script
addProductsFromImages()
  .then(() => {
    console.log("\n✅ Script terminé");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ Erreur fatale:", error);
    process.exit(1);
  });
