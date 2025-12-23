import "dotenv/config";
import { storage } from "../server/storage.js";
import { randomUUID } from "crypto";

/**
 * Script pour enrichir tous les restaurants avec :
 * - Une image si elle manque
 * - Des produits variés selon leur catégorie d'activité
 * - Chaque produit a une image
 */

// Images par catégorie de restaurant
const restaurantImages: Record<string, string> = {
  pizza: "https://images.unsplash.com/photo-1513104890138-7c749659a591?w=800",
  grill: "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=800",
  tunisian: "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=800",
  traditional: "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=800",
  supermarket: "https://images.unsplash.com/photo-1556910103-2c02749b8eff?w=800",
  grocery: "https://images.unsplash.com/photo-1556910103-2c02749b8eff?w=800",
  butcher: "https://images.unsplash.com/photo-1604503468506-a8da13d82791?w=800",
  poultry: "https://images.unsplash.com/photo-1604503468506-a8da13d82791?w=800",
  jewelry: "https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=800",
  default: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800",
};

// Produits par catégorie d'activité
const productsByCategory: Record<string, any[]> = {
  pizza: [
    {
      name: "Pizza Margherita",
      description: "Tomate, mozzarella, basilic frais",
      productType: "pizza",
      category: "classic",
      imageUrl: "https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=800",
      available: true,
      prices: [
        { size: "small", price: "14.00" },
        { size: "medium", price: "18.00" },
        { size: "large", price: "22.00" },
      ],
    },
    {
      name: "Pizza 4 Fromages",
      description: "Mozzarella, gorgonzola, parmesan, chèvre",
      productType: "pizza",
      category: "special",
      imageUrl: "https://images.unsplash.com/photo-1628840042765-356cda07504e?w=800",
      available: true,
      prices: [
        { size: "small", price: "16.00" },
        { size: "medium", price: "20.00" },
        { size: "large", price: "24.00" },
      ],
    },
    {
      name: "Pizza Végétarienne",
      description: "Légumes frais, olives, champignons, poivrons",
      productType: "pizza",
      category: "vegetarian",
      imageUrl: "https://images.unsplash.com/photo-1571997478779-2adcbbe9ab2f?w=800",
      available: true,
      prices: [
        { size: "small", price: "13.00" },
        { size: "medium", price: "17.00" },
        { size: "large", price: "21.00" },
      ],
    },
    {
      name: "Pizza Tuna",
      description: "Thon, oignons, olives, fromage",
      productType: "pizza",
      category: "seafood",
      imageUrl: "https://images.unsplash.com/photo-1571407970349-bc81e7e96d47?w=800",
      available: true,
      prices: [
        { size: "small", price: "15.00" },
        { size: "medium", price: "19.00" },
        { size: "large", price: "23.00" },
      ],
    },
    {
      name: "Pizza Pepperoni",
      description: "Pepperoni, mozzarella, sauce tomate",
      productType: "pizza",
      category: "classic",
      imageUrl: "https://images.unsplash.com/photo-1628840042765-356cda07504e?w=800",
      available: true,
      prices: [
        { size: "small", price: "15.00" },
        { size: "medium", price: "19.00" },
        { size: "large", price: "23.00" },
      ],
    },
  ],
  burger: [
    {
      name: "Burger Classique",
      description: "Steak haché, salade, tomate, oignons, sauce",
      productType: "burger",
      category: "beef",
      imageUrl: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=800",
      available: true,
      prices: [
        { size: "small", price: "14.00" },
        { size: "medium", price: "18.00" },
        { size: "large", price: "22.00" },
      ],
    },
    {
      name: "Burger Poulet",
      description: "Poulet grillé, salade, tomate, sauce spéciale",
      productType: "burger",
      category: "chicken",
      imageUrl: "https://images.unsplash.com/photo-1596905812822-e0198247325e?w=800",
      available: true,
      prices: [
        { size: "small", price: "12.00" },
        { size: "medium", price: "16.00" },
        { size: "large", price: "20.00" },
      ],
    },
    {
      name: "Burger Double",
      description: "Double steak, double fromage, bacon",
      productType: "burger",
      category: "beef",
      imageUrl: "https://images.unsplash.com/photo-1550547660-d9450f859349?w=800",
      available: true,
      prices: [
        { size: "medium", price: "22.00" },
        { size: "large", price: "26.00" },
      ],
    },
  ],
  grill: [
    {
      name: "Kafta",
      description: "Brochettes de viande hachée épicée",
      productType: "grill",
      category: "beef",
      imageUrl: "https://images.unsplash.com/photo-1529692236671-f1f6cf9683ba?w=800",
      available: true,
      prices: [
        { size: "small", price: "18.00" },
        { size: "medium", price: "25.00" },
        { size: "large", price: "32.00" },
      ],
    },
    {
      name: "Méchoui",
      description: "Agneau rôti aux épices",
      productType: "grill",
      category: "lamb",
      imageUrl: "https://images.unsplash.com/photo-1529692236671-f1f6cf9683ba?w=800",
      available: true,
      prices: [
        { size: "small", price: "20.00" },
        { size: "medium", price: "28.00" },
        { size: "large", price: "35.00" },
      ],
    },
    {
      name: "Brochette de Poulet",
      description: "Poulet mariné et grillé",
      productType: "grill",
      category: "chicken",
      imageUrl: "https://images.unsplash.com/photo-1529692236671-f1f6cf9683ba?w=800",
      available: true,
      prices: [
        { size: "small", price: "15.00" },
        { size: "medium", price: "22.00" },
        { size: "large", price: "28.00" },
      ],
    },
  ],
  tunisian: [
    {
      name: "Couscous",
      description: "Couscous aux légumes et viande",
      productType: "tunisian",
      category: "traditional",
      imageUrl: "https://images.unsplash.com/photo-1551892374-ecf8754cf8b0?w=800",
      available: true,
      prices: [
        { size: "small", price: "12.00" },
        { size: "medium", price: "18.00" },
        { size: "large", price: "24.00" },
      ],
    },
    {
      name: "Brik",
      description: "Feuille de brick farcie à l'œuf et thon",
      productType: "tunisian",
      category: "appetizer",
      imageUrl: "https://images.unsplash.com/photo-1551892374-ecf8754cf8b0?w=800",
      available: true,
      prices: [{ size: "small", price: "5.00" }],
    },
    {
      name: "Chorba",
      description: "Soupe traditionnelle tunisienne",
      productType: "tunisian",
      category: "soup",
      imageUrl: "https://images.unsplash.com/photo-1551892374-ecf8754cf8b0?w=800",
      available: true,
      prices: [
        { size: "small", price: "8.00" },
        { size: "medium", price: "12.00" },
      ],
    },
    {
      name: "Tajine",
      description: "Tajine aux légumes et viande",
      productType: "tunisian",
      category: "traditional",
      imageUrl: "https://images.unsplash.com/photo-1551892374-ecf8754cf8b0?w=800",
      available: true,
      prices: [
        { size: "small", price: "15.00" },
        { size: "medium", price: "22.00" },
      ],
    },
  ],
  supermarket: [
    {
      name: "Lait 1L",
      description: "Lait frais pasteurisé",
      productType: "grocery",
      category: "dairy",
      imageUrl: "https://images.unsplash.com/photo-1563636619-e9143da7973b?w=800",
      available: true,
      prices: [{ size: "small", price: "4.50" }],
    },
    {
      name: "Pain de Mie",
      description: "Pain de mie blanc 500g",
      productType: "grocery",
      category: "bakery",
      imageUrl: "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=800",
      available: true,
      prices: [{ size: "small", price: "2.50" }],
    },
    {
      name: "Œufs x12",
      description: "Douzaine d'œufs frais",
      productType: "grocery",
      category: "dairy",
      imageUrl: "https://images.unsplash.com/photo-1582722872445-44dc5f7e3c8f?w=800",
      available: true,
      prices: [{ size: "small", price: "6.00" }],
    },
    {
      name: "Riz 1kg",
      description: "Riz long grain",
      productType: "grocery",
      category: "pasta",
      imageUrl: "https://images.unsplash.com/photo-1586201375761-83865001e31c?w=800",
      available: true,
      prices: [{ size: "small", price: "5.00" }],
    },
    {
      name: "Pâtes 500g",
      description: "Pâtes spaghetti",
      productType: "grocery",
      category: "pasta",
      imageUrl: "https://images.unsplash.com/photo-1586201375761-83865001e31c?w=800",
      available: true,
      prices: [{ size: "small", price: "3.50" }],
    },
  ],
  butcher: [
    {
      name: "Viande Hachée 500g",
      description: "Viande hachée fraîche",
      productType: "butcher",
      category: "beef",
      imageUrl: "https://images.unsplash.com/photo-1604503468506-a8da13d82791?w=800",
      available: true,
      prices: [{ size: "small", price: "25.00" }],
    },
    {
      name: "Côtelettes d'Agneau",
      description: "Côtelettes d'agneau fraîches",
      productType: "butcher",
      category: "lamb",
      imageUrl: "https://images.unsplash.com/photo-1604503468506-a8da13d82791?w=800",
      available: true,
      prices: [{ size: "small", price: "35.00" }],
    },
    {
      name: "Filet de Bœuf",
      description: "Filet de bœuf premium",
      productType: "butcher",
      category: "beef",
      imageUrl: "https://images.unsplash.com/photo-1604503468506-a8da13d82791?w=800",
      available: true,
      prices: [{ size: "small", price: "45.00" }],
    },
    {
      name: "Merguez x6",
      description: "Saucisses merguez épicées",
      productType: "butcher",
      category: "sausage",
      imageUrl: "https://images.unsplash.com/photo-1604503468506-a8da13d82791?w=800",
      available: true,
      prices: [{ size: "small", price: "18.00" }],
    },
  ],
  poultry: [
    {
      name: "Poulet Entier",
      description: "Poulet frais entier",
      productType: "poultry",
      category: "chicken",
      imageUrl: "https://images.unsplash.com/photo-1604503468506-a8da13d82791?w=800",
      available: true,
      prices: [{ size: "small", price: "22.00" }],
    },
    {
      name: "Cuisses de Poulet",
      description: "Cuisses de poulet fraîches",
      productType: "poultry",
      category: "chicken",
      imageUrl: "https://images.unsplash.com/photo-1604503468506-a8da13d82791?w=800",
      available: true,
      prices: [{ size: "small", price: "18.00" }],
    },
    {
      name: "Ailes de Poulet",
      description: "Ailes de poulet marinées",
      productType: "poultry",
      category: "chicken",
      imageUrl: "https://images.unsplash.com/photo-1604503468506-a8da13d82791?w=800",
      available: true,
      prices: [{ size: "small", price: "15.00" }],
    },
    {
      name: "Œufs de Poule x12",
      description: "Douzaine d'œufs de poule",
      productType: "poultry",
      category: "eggs",
      imageUrl: "https://images.unsplash.com/photo-1582722872445-44dc5f7e3c8f?w=800",
      available: true,
      prices: [{ size: "small", price: "6.50" }],
    },
  ],
  jewelry: [
    {
      name: "Bague en Or",
      description: "Bague en or 18 carats",
      productType: "jewelry",
      category: "ring",
      imageUrl: "https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=800",
      available: true,
      prices: [{ size: "small", price: "500.00" }],
    },
    {
      name: "Collier en Argent",
      description: "Collier en argent massif",
      productType: "jewelry",
      category: "necklace",
      imageUrl: "https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=800",
      available: true,
      prices: [{ size: "small", price: "150.00" }],
    },
    {
      name: "Bracelet en Or",
      description: "Bracelet en or 18 carats",
      productType: "jewelry",
      category: "bracelet",
      imageUrl: "https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=800",
      available: true,
      prices: [{ size: "small", price: "350.00" }],
    },
    {
      name: "Boucles d'Oreilles",
      description: "Boucles d'oreilles en or",
      productType: "jewelry",
      category: "earrings",
      imageUrl: "https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=800",
      available: true,
      prices: [{ size: "small", price: "200.00" }],
    },
  ],
  drink: [
    {
      name: "Coca Cola",
      description: "Boisson gazeuse 33cl",
      productType: "drink",
      category: "soda",
      imageUrl: "https://images.unsplash.com/photo-1554866585-cd94860890b7?w=800",
      available: true,
      prices: [{ size: "small", price: "3.00" }],
    },
    {
      name: "Jus d'Orange",
      description: "Jus d'orange frais pressé",
      productType: "drink",
      category: "juice",
      imageUrl: "https://images.unsplash.com/photo-1600271886742-f049cd451bba?w=800",
      available: true,
      prices: [{ size: "small", price: "5.00" }],
    },
    {
      name: "Eau Minérale",
      description: "Bouteille d'eau minérale 1L",
      productType: "drink",
      category: "water",
      imageUrl: "https://images.unsplash.com/photo-1587502537000-918416001856?w=800",
      available: true,
      prices: [{ size: "small", price: "2.00" }],
    },
  ],
  dessert: [
    {
      name: "Tiramisu",
      description: "Dessert italien au café et mascarpone",
      productType: "dessert",
      category: "italian",
      imageUrl: "https://images.unsplash.com/photo-1571877227200-a0d98ea607e9?w=800",
      available: true,
      prices: [{ size: "small", price: "8.00" }],
    },
    {
      name: "Millefeuille",
      description: "Pâtisserie feuilletée à la crème",
      productType: "dessert",
      category: "french",
      imageUrl: "https://images.unsplash.com/photo-1551024506-0bccd828d307?w=800",
      available: true,
      prices: [{ size: "small", price: "7.00" }],
    },
  ],
};

function getImageForRestaurant(categories: string[]): string {
  for (const cat of categories) {
    if (restaurantImages[cat]) {
      return restaurantImages[cat];
    }
  }
  return restaurantImages.default;
}

function getProductsForRestaurant(categories: string[]): any[] {
  const products: any[] = [];
  const addedProducts = new Set<string>();

  for (const cat of categories) {
    if (productsByCategory[cat]) {
      for (const product of productsByCategory[cat]) {
        // Éviter les doublons
        if (!addedProducts.has(product.name)) {
          products.push(product);
          addedProducts.add(product.name);
        }
      }
    }
  }

  // Si aucun produit n'a été trouvé, ajouter des produits par défaut
  if (products.length === 0) {
    return productsByCategory.drink.slice(0, 3);
  }

  return products;
}

async function enrichAllRestaurants() {
  try {
    console.log("🔄 Récupération de tous les restaurants...");
    const restaurants = await storage.getAllRestaurants();
    console.log(`✅ ${restaurants.length} restaurants trouvés\n`);

    let imagesUpdated = 0;
    let productsAdded = 0;
    let restaurantsProcessed = 0;

    for (const restaurant of restaurants) {
      console.log(`\n📦 Traitement de "${restaurant.name}"...`);
      restaurantsProcessed++;

      // 1. Ajouter une image si elle manque
      if (!restaurant.imageUrl) {
        const imageUrl = getImageForRestaurant(restaurant.categories || []);
        await storage.updateRestaurant(restaurant.id, { imageUrl });
        console.log(`  ✅ Image ajoutée: ${imageUrl}`);
        imagesUpdated++;
      } else {
        console.log(`  ℹ️  Image déjà présente`);
      }

      // 2. Vérifier les produits existants
      const existingProducts = await storage.getPizzasByRestaurant(restaurant.id);
      console.log(`  📊 Produits existants: ${existingProducts.length}`);

      // 3. Ajouter des produits si nécessaire (max 5-8 produits par restaurant)
      if (existingProducts.length < 5) {
        const productsToAdd = getProductsForRestaurant(restaurant.categories || []);
        const productsNeeded = Math.min(5 - existingProducts.length, productsToAdd.length);

        for (let i = 0; i < productsNeeded; i++) {
          const product = productsToAdd[i];
          if (!product) continue;

          try {
            const { prices, ...productData } = product;
            const newProduct = await storage.createPizza({
              ...productData,
              restaurantId: restaurant.id,
            });

            // Ajouter les prix
            for (const price of prices) {
              await storage.createPizzaPrice({
                pizzaId: newProduct.id,
                size: price.size as "small" | "medium" | "large",
                price: price.price,
              });
            }

            productsAdded++;
            console.log(`  ✅ Produit ajouté: ${product.name}`);
          } catch (error: any) {
            // Ignorer les erreurs de doublons
            if (error.code !== '23505') {
              console.error(`  ❌ Erreur produit "${product.name}":`, error.message);
            }
          }
        }
      } else {
        console.log(`  ℹ️  Assez de produits déjà présents`);
      }
    }

    console.log(`\n\n🎉 Enrichissement terminé !`);
    console.log(`📊 Statistiques:`);
    console.log(`   - Restaurants traités: ${restaurantsProcessed}`);
    console.log(`   - Images ajoutées/mises à jour: ${imagesUpdated}`);
    console.log(`   - Produits ajoutés: ${productsAdded}`);
  } catch (error) {
    console.error("❌ Erreur lors de l'enrichissement:", error);
    process.exit(1);
  }
}

// Exécuter le script
enrichAllRestaurants()
  .then(() => {
    console.log("\n✅ Script terminé avec succès");
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Erreur fatale:", error);
    process.exit(1);
  });

