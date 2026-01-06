/**
 * Script pour ajouter TOUS les produits à TOUS les restaurants
 * 
 * Usage: npx tsx scripts/add-all-products-to-all-restaurants.ts
 */

import "dotenv/config";
if (process.env.DATABASE_URL?.includes('supabase')) {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
}
import { db } from "../server/db";
import { restaurants, pizzas, pizzaPrices } from "../shared/schema";
import { eq } from "drizzle-orm";

// Liste complète des produits
const allProducts = [
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
  },
];

async function addAllProductsToAllRestaurants() {
  console.log("🍕 Ajout de TOUS les produits à TOUS les restaurants...\n");

  try {
    // Récupérer tous les restaurants
    const allRestaurants = await db.select().from(restaurants);
    
    if (allRestaurants.length === 0) {
      console.log("❌ Aucun restaurant trouvé dans la base de données");
      process.exit(1);
    }

    console.log(`✅ ${allRestaurants.length} restaurant(s) trouvé(s)\n`);

    let totalAdded = 0;
    let totalSkipped = 0;
    let totalErrors = 0;

    // Pour chaque restaurant, ajouter tous les produits
    for (const restaurant of allRestaurants) {
      console.log(`\n📦 Restaurant: ${restaurant.name}`);

      // Vérifier les produits existants
      const existingProducts = await db
        .select()
        .from(pizzas)
        .where(eq(pizzas.restaurantId, restaurant.id));

      const existingNames = new Set(existingProducts.map(p => p.name.toLowerCase()));

      // Ajouter tous les produits
      for (const product of allProducts) {
        const productNameLower = product.name.toLowerCase();
        
        if (existingNames.has(productNameLower)) {
          console.log(`   ⏭️  "${product.name}" existe déjà`);
          totalSkipped++;
          continue;
        }

        try {
          const { prices, ...productData } = product;
          
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
    process.exit(1);
  }
}

// Exécuter le script
addAllProductsToAllRestaurants()
  .then(() => {
    console.log("\n✅ Script terminé");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ Erreur fatale:", error);
    process.exit(1);
  });
