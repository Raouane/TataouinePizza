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
        // id sera généré automatiquement par la DB (UUID)
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
        // id sera généré automatiquement par la DB (UUID)
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
        // id sera généré automatiquement par la DB (UUID)
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
        // id sera généré automatiquement par la DB (UUID)
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

    // Map pour stocker les IDs des restaurants créés (nom → UUID)
    const restaurantIds: Record<string, string> = {};
    
    for (const resto of restaurantData) {
      try {
        // Ne pas spécifier l'ID - laisser la DB générer un UUID
        const { id, ...restoWithoutId } = resto as any;
        const result = await db.insert(restaurants).values(restoWithoutId).returning({ id: restaurants.id });
        if (result && result[0]) {
          restaurantIds[resto.name] = result[0].id;
          console.log(`✅ Restaurant créé: ${resto.name} (UUID: ${result[0].id})`);
        }
      } catch (error: any) {
        if (error.code === '23505') {
          // Restaurant existe déjà - récupérer son ID
          const existing = await db.select().from(restaurants).where(sql`name = ${resto.name}`).limit(1);
          if (existing[0]) {
            restaurantIds[resto.name] = existing[0].id;
            console.log(`⚠️  Restaurant "${resto.name}" existe déjà (UUID: ${existing[0].id})`);
          }
        } else {
          throw error;
        }
      }
    }
    console.log(`✅ ${Object.keys(restaurantIds).length} restaurants traités\n`);

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
    
    const pizzaDelSolId = restaurantIds["Pizza del Sol"];
    if (!pizzaDelSolId) {
      console.log("⚠️  Restaurant 'Pizza del Sol' non trouvé, skip produits");
    } else {
      const pizzaDelSolProducts = [
        {
          // id sera généré automatiquement par la DB (UUID)
          restaurantId: pizzaDelSolId,
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
        // id sera généré automatiquement par la DB (UUID)
        restaurantId: pizzaDelSolId,
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
        // id sera généré automatiquement par la DB (UUID)
        restaurantId: pizzaDelSolId,
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
        // id sera généré automatiquement par la DB (UUID)
        restaurantId: pizzaDelSolId,
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
        // id sera généré automatiquement par la DB (UUID)
        restaurantId: pizzaDelSolId,
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
      let pizzaId: string;
      try {
        const result = await db.insert(pizzas).values(productData).returning({ id: pizzas.id });
        pizzaId = result[0]?.id;
        if (!pizzaId) {
          throw new Error("Failed to get pizza ID after insertion");
        }
      } catch (error: any) {
        if (error.code !== '23505') {
          throw error;
        }
        // Pizza existe déjà, récupérer son ID
        const existing = await db.select().from(pizzas)
          .where(sql`name = ${productData.name} AND restaurant_id = ${productData.restaurantId}`)
          .limit(1);
        if (existing[0]) {
          pizzaId = existing[0].id;
        } else {
          throw new Error(`Pizza ${productData.name} existe mais ID non trouvé`);
        }
      }
      
      // Insérer les prix
      for (const price of prices) {
        try {
          await db.insert(pizzaPrices).values({
            pizzaId: pizzaId,
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
    }

    // ============ PRODUITS - SAHARA GRILL ============
    console.log("🍖 Insertion des produits pour Sahara Grill...");
    
    const saharaGrillId = restaurantIds["Sahara Grill"];
    if (!saharaGrillId) {
      console.log("⚠️  Restaurant 'Sahara Grill' non trouvé, skip produits");
    } else {
      const saharaGrillProducts = [
        {
          // id sera généré automatiquement par la DB (UUID)
          restaurantId: saharaGrillId,
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
        // id sera généré automatiquement par la DB (UUID)
        restaurantId: saharaGrillId,
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
        // id sera généré automatiquement par la DB (UUID)
        restaurantId: saharaGrillId,
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
        // id sera généré automatiquement par la DB (UUID)
        restaurantId: saharaGrillId,
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
      let pizzaId: string;
      try {
        const result = await db.insert(pizzas).values(productData).returning({ id: pizzas.id });
        pizzaId = result[0]?.id;
        if (!pizzaId) {
          throw new Error("Failed to get pizza ID after insertion");
        }
      } catch (error: any) {
        if (error.code !== '23505') {
          throw error;
        }
        // Pizza existe déjà, récupérer son ID
        const existing = await db.select().from(pizzas)
          .where(sql`name = ${productData.name} AND restaurant_id = ${productData.restaurantId}`)
          .limit(1);
        if (existing[0]) {
          pizzaId = existing[0].id;
        } else {
          throw new Error(`Pizza ${productData.name} existe mais ID non trouvé`);
        }
      }
      
      for (const price of prices) {
        try {
          await db.insert(pizzaPrices).values({
            pizzaId: pizzaId,
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
    }

    // ============ PRODUITS - TATAOUINE PIZZA ============
    console.log("🍕 Insertion des produits pour Tataouine Pizza...");
    
    const tataouinePizzaId = restaurantIds["Tataouine Pizza"];
    if (!tataouinePizzaId) {
      console.log("⚠️  Restaurant 'Tataouine Pizza' non trouvé, skip produits");
    } else {
      const tataouinePizzaProducts = [
        {
          // id sera généré automatiquement par la DB (UUID)
          restaurantId: tataouinePizzaId,
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
        // id sera généré automatiquement par la DB (UUID)
        restaurantId: tataouinePizzaId,
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
        // id sera généré automatiquement par la DB (UUID)
        restaurantId: tataouinePizzaId,
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
        // id sera généré automatiquement par la DB (UUID)
        restaurantId: tataouinePizzaId,
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
        // id sera généré automatiquement par la DB (UUID)
        restaurantId: tataouinePizzaId,
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
      let pizzaId: string;
      try {
        const result = await db.insert(pizzas).values(productData).returning({ id: pizzas.id });
        pizzaId = result[0]?.id;
        if (!pizzaId) {
          throw new Error("Failed to get pizza ID after insertion");
        }
      } catch (error: any) {
        if (error.code !== '23505') {
          throw error;
        }
        // Pizza existe déjà, récupérer son ID
        const existing = await db.select().from(pizzas)
          .where(sql`name = ${productData.name} AND restaurant_id = ${productData.restaurantId}`)
          .limit(1);
        if (existing[0]) {
          pizzaId = existing[0].id;
        } else {
          throw new Error(`Pizza ${productData.name} existe mais ID non trouvé`);
        }
      }
      
      for (const price of prices) {
        try {
          await db.insert(pizzaPrices).values({
            pizzaId: pizzaId,
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
    }

    // ============ PRODUITS - LE JARDIN SALADES ============
    console.log("🥗 Insertion des produits pour Le Jardin Salades...");
    
    const jardinSaladesId = restaurantIds["Le Jardin Salades"];
    if (!jardinSaladesId) {
      console.log("⚠️  Restaurant 'Le Jardin Salades' non trouvé, skip produits");
    } else {
      const jardinSaladesProducts = [
        {
          // id sera généré automatiquement par la DB (UUID)
          restaurantId: jardinSaladesId,
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
        // id sera généré automatiquement par la DB (UUID)
        restaurantId: jardinSaladesId,
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
        // id sera généré automatiquement par la DB (UUID)
        restaurantId: jardinSaladesId,
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
        // id sera généré automatiquement par la DB (UUID)
        restaurantId: jardinSaladesId,
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
      let pizzaId: string;
      try {
        const result = await db.insert(pizzas).values(productData).returning({ id: pizzas.id });
        pizzaId = result[0]?.id;
        if (!pizzaId) {
          throw new Error("Failed to get pizza ID after insertion");
        }
      } catch (error: any) {
        if (error.code !== '23505') {
          throw error;
        }
        // Pizza existe déjà, récupérer son ID
        const existing = await db.select().from(pizzas)
          .where(sql`name = ${productData.name} AND restaurant_id = ${productData.restaurantId}`)
          .limit(1);
        if (existing[0]) {
          pizzaId = existing[0].id;
        } else {
          throw new Error(`Pizza ${productData.name} existe mais ID non trouvé`);
        }
      }
      
      for (const price of prices) {
        try {
          await db.insert(pizzaPrices).values({
            pizzaId: pizzaId,
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
    }

    // ============ PRODUITS - BURGER HOUSE ============
    console.log("🍔 Insertion des produits pour Burger House...");
    
    const burgerHouseId = restaurantIds["Burger House"];
    if (!burgerHouseId) {
      console.log("⚠️  Restaurant 'Burger House' non trouvé, skip produits");
    } else {
      const burgerHouseProducts = [
        {
          // id sera généré automatiquement par la DB (UUID)
        restaurantId: burgerHouseId,
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
        // id sera généré automatiquement par la DB (UUID)
        restaurantId: burgerHouseId,
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
        // id sera généré automatiquement par la DB (UUID)
        restaurantId: burgerHouseId,
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
        // id sera généré automatiquement par la DB (UUID)
        restaurantId: burgerHouseId,
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
        // id sera généré automatiquement par la DB (UUID)
        restaurantId: burgerHouseId,
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
      let pizzaId: string;
      try {
        const result = await db.insert(pizzas).values(productData).returning({ id: pizzas.id });
        pizzaId = result[0]?.id;
        if (!pizzaId) {
          throw new Error("Failed to get pizza ID after insertion");
        }
      } catch (error: any) {
        if (error.code !== '23505') {
          throw error;
        }
        // Pizza existe déjà, récupérer son ID
        const existing = await db.select().from(pizzas)
          .where(sql`name = ${productData.name} AND restaurant_id = ${productData.restaurantId}`)
          .limit(1);
        if (existing[0]) {
          pizzaId = existing[0].id;
        } else {
          throw new Error(`Pizza ${productData.name} existe mais ID non trouvé`);
        }
      }
      
      for (const price of prices) {
        try {
          await db.insert(pizzaPrices).values({
            pizzaId: pizzaId,
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
    }

    // Compter le total de produits insérés
    const totalProducts = await db.execute(sql`
      SELECT COUNT(*) as count FROM pizzas
    `);
    const totalProductsNum = parseInt(totalProducts.rows[0]?.count || "0");

    console.log("✨ Données de test insérées avec succès !");
    console.log("\n📊 Résumé :");
    console.log(`   - ${restaurantData.length} restaurants`);
    console.log(`   - ${driverData.length} livreurs`);
    console.log(`   - ${totalProductsNum} produits au total`);
    console.log("\n💡 Les mots de passe des livreurs sont tous : 'driver123'");
    
  } catch (error) {
    console.error("❌ Erreur lors de l'insertion des données:", error);
    throw error;
  } finally {
    process.exit(0);
  }
}

seedData();

