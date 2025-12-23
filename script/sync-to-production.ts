import "dotenv/config";
import { db } from "../server/db";
import { restaurants, pizzas, pizzaPrices } from "../shared/schema";
import { eq } from "drizzle-orm";

async function syncToProduction() {
  console.log("🚀 Synchronisation des données vers la production...\n");
  
  // Vérifier la DATABASE_URL
  if (!process.env.DATABASE_URL) {
    console.error("❌ DATABASE_URL non définie dans les variables d'environnement");
    console.log("\n💡 Options pour définir DATABASE_URL:");
    console.log("   1. Créer un fichier .env.production avec:");
    console.log("      DATABASE_URL=votre_url_de_production");
    console.log("   2. Passer directement la variable:");
    console.log("      DATABASE_URL='votre_url' npm run sync-to-production");
    console.log("   3. Utiliser dotenv-cli:");
    console.log("      npx dotenv -e .env.production -- npm run sync-to-production");
    process.exit(1);
  }

  console.log(`📊 Connexion à la base de données...`);
  const dbUrlPreview = process.env.DATABASE_URL.substring(0, 30) + "...";
  console.log(`🔗 URL: ${dbUrlPreview}\n`);

  try {
    // Test de connexion
    const testQuery = await db.select().from(restaurants).limit(1);
    console.log("✅ Connexion réussie !\n");

    // ============ AJOUT DES RESTAURANTS ============
    console.log("🏪 Ajout des restaurants...\n");
    
    const restaurantsToAdd = [
      {
        name: "Carrefour",
        phone: "21698765432",
        address: "Centre Commercial, Avenue Habib Bourguiba, Tataouine",
        description: "Supermarché et hypermarché - Tout pour vos courses quotidiennes",
        imageUrl: "https://images.unsplash.com/photo-1556910103-2c02749b8eff?w=800",
        categories: JSON.stringify(["supermarket", "grocery", "drink", "snacks"]),
        isOpen: true,
        openingHours: "08:00-22:00",
        deliveryTime: 25,
        minOrder: "10.00",
        rating: "4.6",
      },
      {
        name: "Aziza",
        phone: "21698765433",
        address: "Rue de la République, Tataouine",
        description: "Restaurant traditionnel tunisien - Spécialités locales et plats du jour",
        imageUrl: "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=800",
        categories: JSON.stringify(["tunisian", "traditional", "grill", "couscous"]),
        isOpen: true,
        openingHours: "11:00-23:00",
        deliveryTime: 35,
        minOrder: "15.00",
        rating: "4.8",
      },
      {
        name: "Boucherie Brahim",
        phone: "21698765434",
        address: "Marché Central, Rue du Marché, Tataouine",
        description: "Boucherie traditionnelle - Viande fraîche de qualité, découpe sur place",
        imageUrl: "https://images.unsplash.com/photo-1603048297172-c92544798d5a?w=800",
        categories: JSON.stringify(["butcher", "meat", "beef", "lamb"]),
        isOpen: true,
        openingHours: "07:00-19:00",
        deliveryTime: 20,
        minOrder: "25.00",
        rating: "4.7",
      },
      {
        name: "Volaille Othman",
        phone: "21698765435",
        address: "Marché Central, Avenue de la République, Tataouine",
        description: "Spécialiste en volaille fraîche - Poulet, dinde, canard et œufs",
        imageUrl: "https://images.unsplash.com/photo-1604503468506-a8da13d82791?w=800",
        categories: JSON.stringify(["poultry", "chicken", "eggs", "fresh"]),
        isOpen: true,
        openingHours: "06:00-18:00",
        deliveryTime: 20,
        minOrder: "20.00",
        rating: "4.9",
      },
      {
        name: "Bijouterie Ziyad",
        phone: "21698765436",
        address: "Rue des Bijoutiers, Centre-ville, Tataouine",
        description: "Bijouterie traditionnelle - Or, argent, bijoux artisanaux tunisiens",
        imageUrl: "https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=800",
        categories: JSON.stringify(["jewelry", "gold", "silver", "handmade"]),
        isOpen: true,
        openingHours: "09:00-19:00",
        deliveryTime: 30,
        minOrder: "50.00",
        rating: "4.5",
      },
    ];

    let restaurantsAdded = 0;
    let restaurantsSkipped = 0;
    const restaurantIds: Record<string, string> = {};

    for (const restaurant of restaurantsToAdd) {
      try {
        // Vérifier si le restaurant existe déjà
        const existing = await db.select()
          .from(restaurants)
          .where(eq(restaurants.phone, restaurant.phone))
          .limit(1);

        if (existing.length > 0) {
          console.log(`⚠️  Restaurant "${restaurant.name}" existe déjà`);
          restaurantIds[restaurant.name] = existing[0].id;
          restaurantsSkipped++;
          continue;
        }

        // Insérer le restaurant
        const result = await db.insert(restaurants).values(restaurant).returning({ id: restaurants.id });
        const newId = result[0]?.id;
        
        if (newId) {
          restaurantIds[restaurant.name] = newId;
          console.log(`✅ Restaurant créé: ${restaurant.name} (ID: ${newId.substring(0, 8)}...)`);
          restaurantsAdded++;
        }
      } catch (error: any) {
        if (error.code === '23505') {
          console.log(`⚠️  Restaurant "${restaurant.name}" existe déjà (doublon)`);
          restaurantsSkipped++;
        } else {
          console.error(`❌ Erreur pour "${restaurant.name}":`, error.message);
        }
      }
    }

    console.log(`\n📊 Restaurants: ${restaurantsAdded} ajouté(s), ${restaurantsSkipped} ignoré(s)\n`);

    // ============ AJOUT DES PRODUITS POUR BAB EL HARA ============
    console.log("🍕 Ajout des produits pour BAB EL HARA...\n");

    // Trouver ou créer BAB EL HARA
    let babElHaraId: string | undefined = restaurantIds["BAB EL HARA"];
    if (!babElHaraId) {
      const babElHara = await db.select()
        .from(restaurants)
        .where(eq(restaurants.name, "BAB EL HARA"))
        .limit(1);

      if (babElHara.length > 0) {
        babElHaraId = babElHara[0].id;
        console.log(`✅ Restaurant BAB EL HARA trouvé (ID: ${babElHaraId.substring(0, 8)}...)`);
      } else {
        console.log("💡 Création du restaurant BAB EL HARA...");
        const newRestaurant = {
          name: "BAB EL HARA",
          phone: "21699999999",
          address: "6 Place De L'Abbaye, Tataouine",
          description: "Pizzas et spécialités tunisiennes",
          imageUrl: "https://images.unsplash.com/photo-1513104890138-7c749659a591?w=800",
          categories: JSON.stringify(["pizza", "burger", "drink", "dessert"]),
          isOpen: true,
          openingHours: "10:00-23:00",
          deliveryTime: 30,
          minOrder: "15.00",
          rating: "4.5",
        };
        
        const result = await db.insert(restaurants).values(newRestaurant).returning({ id: restaurants.id });
        babElHaraId = result[0]?.id;
        console.log(`✅ Restaurant BAB EL HARA créé (ID: ${babElHaraId.substring(0, 8)}...)`);
      }
    }

    if (!babElHaraId) {
      console.error("❌ Impossible de trouver ou créer BAB EL HARA");
      process.exit(1);
    }

    // Produits à ajouter
    const timestamp = Date.now();
    const productsToAdd = [
      {
        id: `bab-pizza-001-${timestamp}`,
        restaurantId: babElHaraId,
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
        id: `bab-pizza-002-${timestamp}`,
        restaurantId: babElHaraId,
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
        id: `bab-pizza-003-${timestamp}`,
        restaurantId: babElHaraId,
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
        id: `bab-burger-001-${timestamp}`,
        restaurantId: babElHaraId,
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
        id: `bab-burger-002-${timestamp}`,
        restaurantId: babElHaraId,
        name: "Burger Poulet",
        description: "Poulet grillé, salade, tomate, sauce spéciale",
        productType: "burger",
        category: "chicken",
        imageUrl: "https://images.unsplash.com/photo-1596905812822-e0198247325e?w=800",
        available: true,
        prices: [
          { size: "small", price: "12.00" },
          { size: "medium", price: "16.00" },
        ],
      },
      {
        id: `bab-drink-001-${timestamp}`,
        restaurantId: babElHaraId,
        name: "Coca Cola",
        description: "Boisson gazeuse 33cl",
        productType: "drink",
        category: "soda",
        imageUrl: "https://images.unsplash.com/photo-1554866585-cd94860890b7?w=800",
        available: true,
        prices: [{ size: "small", price: "3.00" }],
      },
      {
        id: `bab-drink-002-${timestamp}`,
        restaurantId: babElHaraId,
        name: "Jus d'Orange",
        description: "Jus d'orange frais pressé",
        productType: "drink",
        category: "juice",
        imageUrl: "https://images.unsplash.com/photo-1600271886742-f049cd451bba?w=800",
        available: true,
        prices: [{ size: "small", price: "5.00" }],
      },
      {
        id: `bab-drink-003-${timestamp}`,
        restaurantId: babElHaraId,
        name: "Eau Minérale",
        description: "Bouteille d'eau minérale 1L",
        productType: "drink",
        category: "water",
        imageUrl: "https://images.unsplash.com/photo-1587502537000-918416001856?w=800",
        available: true,
        prices: [{ size: "small", price: "2.00" }],
      },
      {
        id: `bab-dessert-001-${timestamp}`,
        restaurantId: babElHaraId,
        name: "Tiramisu",
        description: "Dessert italien au café et mascarpone",
        productType: "dessert",
        category: "italian",
        imageUrl: "https://images.unsplash.com/photo-1571877227200-a0d98ea607e9?w=800",
        available: true,
        prices: [{ size: "small", price: "8.00" }],
      },
      {
        id: `bab-dessert-002-${timestamp}`,
        restaurantId: babElHaraId,
        name: "Millefeuille",
        description: "Pâtisserie feuilletée à la crème",
        productType: "dessert",
        category: "french",
        imageUrl: "https://images.unsplash.com/photo-1551024506-0bccd828d307?w=800",
        available: true,
        prices: [{ size: "small", price: "7.00" }],
      },
    ];

    let productsAdded = 0;
    let productsSkipped = 0;

    for (const product of productsToAdd) {
      const { prices, ...productData } = product;
      
      try {
        // Vérifier si le produit existe déjà (par nom et restaurant)
        const existing = await db.select()
          .from(pizzas)
          .where(eq(pizzas.restaurantId, babElHaraId))
          .limit(100); // Récupérer tous les produits du restaurant

        const productExists = existing.some(p => p.name === product.name);
        
        if (productExists) {
          console.log(`⚠️  Produit "${product.name}" existe déjà`);
          productsSkipped++;
          continue;
        }

        // Insérer le produit
        await db.insert(pizzas).values(productData);
        console.log(`✅ Produit créé: ${product.name}`);

        // Insérer les prix
        for (const price of prices) {
          try {
            await db.insert(pizzaPrices).values({
              pizzaId: product.id,
              size: price.size as "small" | "medium" | "large",
              price: price.price,
            });
          } catch (error: any) {
            if (error.code === '23505') {
              // Prix existe déjà, mettre à jour
              await db.update(pizzaPrices)
                .set({ price: price.price })
                .where(eq(pizzaPrices.pizzaId, product.id));
            }
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

    console.log(`\n📊 Produits: ${productsAdded} ajouté(s), ${productsSkipped} ignoré(s)\n`);

    console.log("✨ Synchronisation terminée avec succès !");
    console.log("\n📋 Résumé:");
    console.log(`   - Restaurants: ${restaurantsAdded} ajouté(s), ${restaurantsSkipped} ignoré(s)`);
    console.log(`   - Produits: ${productsAdded} ajouté(s), ${productsSkipped} ignoré(s)`);
    console.log("\n🎉 Les données sont maintenant disponibles en production !");

  } catch (error: any) {
    console.error("\n❌ Erreur lors de la synchronisation:", error.message);
    if (error.code) {
      console.error(`   Code d'erreur: ${error.code}`);
    }
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

syncToProduction();

