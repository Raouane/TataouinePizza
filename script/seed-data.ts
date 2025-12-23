import "dotenv/config";
import { db } from "../server/db";
import { restaurants, drivers, pizzas, pizzaPrices } from "../shared/schema";
import { sql } from "drizzle-orm";
import { hashPassword } from "../server/auth";

async function seedData() {
  console.log("🌱 Début de l'insertion des données de test...\n");

  try {
    // ============ RESTAURANTS ============
    console.log("🍕 Insertion des restaurants...");
    
    const restaurantData = [
      {
        id: "resto-001",
        name: "Pizza del Sol",
        phone: "21622222222",
        address: "Rue de la Liberté, Tataouine",
        description: "Pizzas italiennes authentiques cuites au feu de bois",
        imageUrl: "https://images.unsplash.com/photo-1513104890138-7c749659a591?w=800",
        categories: JSON.stringify(["pizza", "drink", "dessert"]),
        isOpen: true,
        openingHours: "09:00-23:00",
        deliveryTime: 30,
        minOrder: "15.00",
        rating: "4.5",
      },
      {
        id: "resto-002",
        name: "Sahara Grill",
        phone: "21633333333",
        address: "Boulevard de l'Environnement, Tataouine",
        description: "Grillades et plats traditionnels tunisiens",
        imageUrl: "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=800",
        categories: JSON.stringify(["grill", "burger", "salade", "drink"]),
        isOpen: true,
        openingHours: "11:00-23:00",
        deliveryTime: 35,
        minOrder: "20.00",
        rating: "4.7",
      },
      {
        id: "resto-003",
        name: "Tataouine Pizza",
        phone: "21611111111",
        address: "Avenue Habib Bourguiba, Tataouine",
        description: "Spécialités de pizzas et fast-food",
        imageUrl: "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=800",
        categories: JSON.stringify(["pizza", "burger", "drink", "dessert"]),
        isOpen: true,
        openingHours: "10:00-00:00",
        deliveryTime: 25,
        minOrder: "12.00",
        rating: "4.6",
      },
      {
        id: "resto-004",
        name: "Le Jardin Salades",
        phone: "21644444444",
        address: "Rue Ibn Khaldoun, Tataouine",
        description: "Salades fraîches et plats végétariens",
        imageUrl: "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=800",
        categories: JSON.stringify(["salade", "drink", "dessert"]),
        isOpen: true,
        openingHours: "08:00-22:00",
        deliveryTime: 20,
        minOrder: "10.00",
        rating: "4.4",
      },
      {
        id: "resto-005",
        name: "Burger House",
        phone: "21655555555",
        address: "Avenue de la République, Tataouine",
        description: "Burgers gourmets et frites maison",
        imageUrl: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=800",
        categories: JSON.stringify(["burger", "drink", "dessert"]),
        isOpen: true,
        openingHours: "11:00-23:00",
        deliveryTime: 30,
        minOrder: "18.00",
        rating: "4.8",
      },
    ];

    for (const resto of restaurantData) {
      try {
        await db.insert(restaurants).values(resto);
      } catch (error: any) {
        if (error.code !== '23505') { // Ignorer les erreurs de doublon (unique constraint)
          throw error;
        }
      }
    }
    console.log(`✅ ${restaurantData.length} restaurants insérés\n`);

    // ============ LIVREURS ============
    console.log("🚗 Insertion des livreurs...");
    
    const driverData = [
      {
        id: "driver-001",
        name: "Mohamed Ben Ali",
        phone: "21612345678",
        password: await hashPassword("driver123"),
        status: "available",
      },
      {
        id: "driver-002",
        name: "Ahmed Trabelsi",
        phone: "21623456789",
        password: await hashPassword("driver123"),
        status: "available",
      },
      {
        id: "driver-003",
        name: "Salah Hammami",
        phone: "21634567890",
        password: await hashPassword("driver123"),
        status: "available",
      },
      {
        id: "driver-004",
        name: "Youssef Khelifi",
        phone: "21645678901",
        password: await hashPassword("driver123"),
        status: "available",
      },
      {
        id: "driver-005",
        name: "Karim Mezghani",
        phone: "21656789012",
        password: await hashPassword("driver123"),
        status: "available",
      },
    ];

    for (const driver of driverData) {
      try {
        await db.insert(drivers).values(driver);
      } catch (error: any) {
        if (error.code !== '23505') { // Ignorer les erreurs de doublon
          throw error;
        }
      }
    }
    console.log(`✅ ${driverData.length} livreurs insérés\n`);

    // ============ PRODUITS - PIZZA DEL SOL ============
    console.log("🍕 Insertion des produits pour Pizza del Sol...");
    
    const pizzaDelSolProducts = [
      {
        id: "pizza-001",
        restaurantId: "resto-001",
        name: "Pizza Margherita",
        description: "Tomate, mozzarella, basilic frais",
        productType: "pizza",
        category: "classic",
        imageUrl: "https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=800",
        available: true,
        prices: [
          { size: "small", price: "12.00" },
          { size: "medium", price: "18.00" },
          { size: "large", price: "24.00" },
        ],
      },
      {
        id: "pizza-002",
        restaurantId: "resto-001",
        name: "Pizza 4 Fromages",
        description: "Mozzarella, gorgonzola, parmesan, chèvre",
        productType: "pizza",
        category: "special",
        imageUrl: "https://images.unsplash.com/photo-1628840042765-356cda07504e?w=800",
        available: true,
        prices: [
          { size: "small", price: "15.00" },
          { size: "medium", price: "22.00" },
          { size: "large", price: "28.00" },
        ],
      },
      {
        id: "pizza-003",
        restaurantId: "resto-001",
        name: "Pizza Végétarienne",
        description: "Légumes frais, olives, champignons, poivrons",
        productType: "pizza",
        category: "vegetarian",
        imageUrl: "https://images.unsplash.com/photo-1571997478779-2adcbbe9ab2f?w=800",
        available: true,
        prices: [
          { size: "small", price: "13.00" },
          { size: "medium", price: "19.00" },
          { size: "large", price: "25.00" },
        ],
      },
      {
        id: "pizza-004",
        restaurantId: "resto-001",
        name: "Coca Cola",
        description: "Boisson gazeuse 33cl",
        productType: "drink",
        category: "soda",
        imageUrl: "https://images.unsplash.com/photo-1554866585-cd94860890b7?w=800",
        available: true,
        prices: [
          { size: "small", price: "3.00" },
        ],
      },
      {
        id: "pizza-005",
        restaurantId: "resto-001",
        name: "Tiramisu",
        description: "Dessert italien au café et mascarpone",
        productType: "dessert",
        category: "italian",
        imageUrl: "https://images.unsplash.com/photo-1571877227200-a0d98ea607e9?w=800",
        available: true,
        prices: [
          { size: "small", price: "8.00" },
        ],
      },
    ];

    for (const product of pizzaDelSolProducts) {
      const { prices, ...productData } = product;
      try {
        await db.insert(pizzas).values(productData);
      } catch (error: any) {
        if (error.code !== '23505') {
          throw error;
        }
      }
      
      // Insérer les prix
      for (const price of prices) {
        try {
          await db.insert(pizzaPrices).values({
            pizzaId: product.id,
            size: price.size,
            price: price.price,
          });
        } catch (error: any) {
          if (error.code !== '23505') {
            throw error;
          }
        }
      }
    }
    console.log(`✅ ${pizzaDelSolProducts.length} produits insérés pour Pizza del Sol\n`);

    // ============ PRODUITS - SAHARA GRILL ============
    console.log("🍖 Insertion des produits pour Sahara Grill...");
    
    const saharaGrillProducts = [
      {
        id: "grill-001",
        restaurantId: "resto-002",
        name: "Kebab Mixte",
        description: "Viande hachée et poulet grillé",
        productType: "grill",
        category: "mixed",
        imageUrl: "https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec?w=800",
        available: true,
        prices: [
          { size: "small", price: "18.00" },
          { size: "medium", price: "22.00" },
          { size: "large", price: "26.00" },
        ],
      },
      {
        id: "grill-002",
        restaurantId: "resto-002",
        name: "Burger Classique",
        description: "Steak haché, salade, tomate, oignons, sauce",
        productType: "burger",
        category: "beef",
        imageUrl: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=800",
        available: true,
        prices: [
          { size: "small", price: "15.00" },
          { size: "medium", price: "18.00" },
        ],
      },
      {
        id: "grill-003",
        restaurantId: "resto-002",
        name: "Salade César",
        description: "Salade verte, poulet grillé, parmesan, croûtons",
        productType: "salade",
        category: "chicken",
        imageUrl: "https://images.unsplash.com/photo-1546793665-c74683f339c1?w=800",
        available: true,
        prices: [
          { size: "small", price: "12.00" },
          { size: "medium", price: "16.00" },
        ],
      },
      {
        id: "grill-004",
        restaurantId: "resto-002",
        name: "Jus d'Orange",
        description: "Jus d'orange frais pressé",
        productType: "drink",
        category: "juice",
        imageUrl: "https://images.unsplash.com/photo-1600271886742-f049cd451bba?w=800",
        available: true,
        prices: [
          { size: "small", price: "5.00" },
        ],
      },
    ];

    for (const product of saharaGrillProducts) {
      const { prices, ...productData } = product;
      try {
        await db.insert(pizzas).values(productData);
      } catch (error: any) {
        if (error.code !== '23505') {
          throw error;
        }
      }
      
      for (const price of prices) {
        try {
          await db.insert(pizzaPrices).values({
            pizzaId: product.id,
            size: price.size,
            price: price.price,
          });
        } catch (error: any) {
          if (error.code !== '23505') {
            throw error;
          }
        }
      }
    }
    console.log(`✅ ${saharaGrillProducts.length} produits insérés pour Sahara Grill\n`);

    // ============ PRODUITS - TATAOUINE PIZZA ============
    console.log("🍕 Insertion des produits pour Tataouine Pizza...");
    
    const tataouinePizzaProducts = [
      {
        id: "pizza-006",
        restaurantId: "resto-003",
        name: "Pizza Reine",
        description: "Tomate, jambon, champignons, fromage",
        productType: "pizza",
        category: "classic",
        imageUrl: "https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=800",
        available: true,
        prices: [
          { size: "small", price: "14.00" },
          { size: "medium", price: "20.00" },
          { size: "large", price: "26.00" },
        ],
      },
      {
        id: "pizza-007",
        restaurantId: "resto-003",
        name: "Pizza Thon",
        description: "Tomate, thon, oignons, olives, câpres",
        productType: "pizza",
        category: "special",
        imageUrl: "https://images.unsplash.com/photo-1628840042765-356cda07504e?w=800",
        available: true,
        prices: [
          { size: "small", price: "15.00" },
          { size: "medium", price: "21.00" },
          { size: "large", price: "27.00" },
        ],
      },
      {
        id: "burger-001",
        restaurantId: "resto-003",
        name: "Burger Double Cheese",
        description: "Double steak, double fromage, bacon",
        productType: "burger",
        category: "beef",
        imageUrl: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=800",
        available: true,
        prices: [
          { size: "small", price: "16.00" },
          { size: "medium", price: "19.00" },
        ],
      },
      {
        id: "drink-001",
        restaurantId: "resto-003",
        name: "Pepsi",
        description: "Boisson gazeuse 33cl",
        productType: "drink",
        category: "soda",
        imageUrl: "https://images.unsplash.com/photo-1554866585-cd94860890b7?w=800",
        available: true,
        prices: [
          { size: "small", price: "3.00" },
        ],
      },
      {
        id: "dessert-001",
        restaurantId: "resto-003",
        name: "Glace Vanille",
        description: "Glace à la vanille avec coulis de chocolat",
        productType: "dessert",
        category: "ice-cream",
        imageUrl: "https://images.unsplash.com/photo-1563805042-7684c019e1cb?w=800",
        available: true,
        prices: [
          { size: "small", price: "6.00" },
        ],
      },
    ];

    for (const product of tataouinePizzaProducts) {
      const { prices, ...productData } = product;
      try {
        await db.insert(pizzas).values(productData);
      } catch (error: any) {
        if (error.code !== '23505') {
          throw error;
        }
      }
      
      for (const price of prices) {
        try {
          await db.insert(pizzaPrices).values({
            pizzaId: product.id,
            size: price.size,
            price: price.price,
          });
        } catch (error: any) {
          if (error.code !== '23505') {
            throw error;
          }
        }
      }
    }
    console.log(`✅ ${tataouinePizzaProducts.length} produits insérés pour Tataouine Pizza\n`);

    // ============ PRODUITS - LE JARDIN SALADES ============
    console.log("🥗 Insertion des produits pour Le Jardin Salades...");
    
    const jardinSaladesProducts = [
      {
        id: "salade-001",
        restaurantId: "resto-004",
        name: "Salade Niçoise",
        description: "Salade verte, thon, œufs, olives, tomates",
        productType: "salade",
        category: "french",
        imageUrl: "https://images.unsplash.com/photo-1546793665-c74683f339c1?w=800",
        available: true,
        prices: [
          { size: "small", price: "14.00" },
          { size: "medium", price: "18.00" },
        ],
      },
      {
        id: "salade-002",
        restaurantId: "resto-004",
        name: "Salade Grecque",
        description: "Salade, feta, olives, tomates, concombres",
        productType: "salade",
        category: "greek",
        imageUrl: "https://images.unsplash.com/photo-1546793665-c74683f339c1?w=800",
        available: true,
        prices: [
          { size: "small", price: "13.00" },
          { size: "medium", price: "17.00" },
        ],
      },
      {
        id: "salade-003",
        restaurantId: "resto-004",
        name: "Eau Minérale",
        description: "Eau minérale naturelle 50cl",
        productType: "drink",
        category: "water",
        imageUrl: "https://images.unsplash.com/photo-1548839140-5a4e5131ebd3?w=800",
        available: true,
        prices: [
          { size: "small", price: "2.00" },
        ],
      },
      {
        id: "dessert-002",
        restaurantId: "resto-004",
        name: "Fruit de Saison",
        description: "Assortiment de fruits frais",
        productType: "dessert",
        category: "fruit",
        imageUrl: "https://images.unsplash.com/photo-1610832958506-aa56368176cf?w=800",
        available: true,
        prices: [
          { size: "small", price: "7.00" },
        ],
      },
    ];

    for (const product of jardinSaladesProducts) {
      const { prices, ...productData } = product;
      try {
        await db.insert(pizzas).values(productData);
      } catch (error: any) {
        if (error.code !== '23505') {
          throw error;
        }
      }
      
      for (const price of prices) {
        try {
          await db.insert(pizzaPrices).values({
            pizzaId: product.id,
            size: price.size,
            price: price.price,
          });
        } catch (error: any) {
          if (error.code !== '23505') {
            throw error;
          }
        }
      }
    }
    console.log(`✅ ${jardinSaladesProducts.length} produits insérés pour Le Jardin Salades\n`);

    // ============ PRODUITS - BURGER HOUSE ============
    console.log("🍔 Insertion des produits pour Burger House...");
    
    const burgerHouseProducts = [
      {
        id: "burger-002",
        restaurantId: "resto-005",
        name: "Burger Chicken",
        description: "Filet de poulet pané, salade, tomate, sauce",
        productType: "burger",
        category: "chicken",
        imageUrl: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=800",
        available: true,
        prices: [
          { size: "small", price: "14.00" },
          { size: "medium", price: "17.00" },
        ],
      },
      {
        id: "burger-003",
        restaurantId: "resto-005",
        name: "Burger Végétarien",
        description: "Steak végétal, avocat, salade, tomate",
        productType: "burger",
        category: "vegetarian",
        imageUrl: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=800",
        available: true,
        prices: [
          { size: "small", price: "13.00" },
          { size: "medium", price: "16.00" },
        ],
      },
      {
        id: "burger-004",
        restaurantId: "resto-005",
        name: "Burger BBQ",
        description: "Steak haché, bacon, oignons frits, sauce BBQ",
        productType: "burger",
        category: "beef",
        imageUrl: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=800",
        available: true,
        prices: [
          { size: "small", price: "17.00" },
          { size: "medium", price: "20.00" },
        ],
      },
      {
        id: "drink-002",
        restaurantId: "resto-005",
        name: "Milkshake Vanille",
        description: "Milkshake à la vanille",
        productType: "drink",
        category: "milkshake",
        imageUrl: "https://images.unsplash.com/photo-1572490122747-3968b75cc699?w=800",
        available: true,
        prices: [
          { size: "small", price: "8.00" },
        ],
      },
      {
        id: "dessert-003",
        restaurantId: "resto-005",
        name: "Brownie Chocolat",
        description: "Brownie au chocolat avec glace vanille",
        productType: "dessert",
        category: "chocolate",
        imageUrl: "https://images.unsplash.com/photo-1606313564200-e75d5e30476c?w=800",
        available: true,
        prices: [
          { size: "small", price: "9.00" },
        ],
      },
    ];

    for (const product of burgerHouseProducts) {
      const { prices, ...productData } = product;
      try {
        await db.insert(pizzas).values(productData);
      } catch (error: any) {
        if (error.code !== '23505') {
          throw error;
        }
      }
      
      for (const price of prices) {
        try {
          await db.insert(pizzaPrices).values({
            pizzaId: product.id,
            size: price.size,
            price: price.price,
          });
        } catch (error: any) {
          if (error.code !== '23505') {
            throw error;
          }
        }
      }
    }
    console.log(`✅ ${burgerHouseProducts.length} produits insérés pour Burger House\n`);

    console.log("✨ Données de test insérées avec succès !");
    console.log("\n📊 Résumé :");
    console.log(`   - ${restaurantData.length} restaurants`);
    console.log(`   - ${driverData.length} livreurs`);
    console.log(`   - ${pizzaDelSolProducts.length + saharaGrillProducts.length + tataouinePizzaProducts.length + jardinSaladesProducts.length + burgerHouseProducts.length} produits`);
    console.log("\n💡 Les mots de passe des livreurs sont tous : 'driver123'");
    
  } catch (error) {
    console.error("❌ Erreur lors de l'insertion des données:", error);
    throw error;
  } finally {
    process.exit(0);
  }
}

seedData();

