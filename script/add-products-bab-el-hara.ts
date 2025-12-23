import "dotenv/config";
import { db } from "../server/db";
import { restaurants, pizzas, pizzaPrices } from "../shared/schema";
import { eq } from "drizzle-orm";

async function addProductsToBabElHara() {
  console.log("🍕 Ajout de produits pour BAB EL HARA...\n");

  try {
    // Trouver le restaurant BAB EL HARA
    const restaurant = await db.select()
      .from(restaurants)
      .where(eq(restaurants.name, "BAB EL HARA"))
      .limit(1);

    if (restaurant.length === 0) {
      console.log("❌ Restaurant BAB EL HARA non trouvé");
      console.log("💡 Création du restaurant...");
      
      // Créer le restaurant s'il n'existe pas
      const newRestaurant = {
        id: `resto-${Date.now()}`,
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
      
      await db.insert(restaurants).values(newRestaurant);
      console.log(`✅ Restaurant créé: ${newRestaurant.id}\n`);
      
      const restoId = newRestaurant.id;
      
      // Produits avec plusieurs tailles (modal s'affichera)
      const productsWithMultipleSizes = [
        {
          id: `bab-pizza-001-${Date.now()}`,
          restaurantId: restoId,
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
          id: `bab-pizza-002-${Date.now()}`,
          restaurantId: restoId,
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
          id: `bab-burger-001-${Date.now()}`,
          restaurantId: restoId,
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
      ];

      // Produits avec une seule taille (ajout direct, pas de modal)
      const productsWithSingleSize = [
        {
          id: `bab-drink-001-${Date.now()}`,
          restaurantId: restoId,
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
          id: `bab-drink-002-${Date.now()}`,
          restaurantId: restoId,
          name: "Jus d'Orange",
          description: "Jus d'orange frais pressé",
          productType: "drink",
          category: "juice",
          imageUrl: "https://images.unsplash.com/photo-1600271886742-f049cd451bba?w=800",
          available: true,
          prices: [
            { size: "small", price: "4.00" },
          ],
        },
        {
          id: `bab-dessert-001-${Date.now()}`,
          restaurantId: restoId,
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
        {
          id: `bab-dessert-002-${Date.now()}`,
          restaurantId: restoId,
          name: "Millefeuille",
          description: "Pâtisserie feuilletée à la crème",
          productType: "dessert",
          category: "french",
          imageUrl: "https://images.unsplash.com/photo-1551024506-0bccd828d307?w=800",
          available: true,
          prices: [
            { size: "small", price: "7.00" },
          ],
        },
      ];

      const allProducts = [...productsWithMultipleSizes, ...productsWithSingleSize];

      for (const product of allProducts) {
        const { prices, ...productData } = product;
        
        try {
          await db.insert(pizzas).values(productData);
          console.log(`✅ Produit créé: ${product.name}`);
        } catch (error: any) {
          if (error.code !== '23505') {
            console.error(`❌ Erreur lors de l'insertion de ${product.name}:`, error.message);
            throw error;
          } else {
            console.log(`⚠️  Produit déjà existant: ${product.name}`);
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
              console.error(`❌ Erreur lors de l'insertion du prix pour ${product.name}:`, error.message);
            }
          }
        }
      }

      console.log(`\n✨ ${allProducts.length} produits ajoutés pour BAB EL HARA !`);
      console.log(`   - ${productsWithMultipleSizes.length} produits avec plusieurs tailles (modal)`);
      console.log(`   - ${productsWithSingleSize.length} produits avec une seule taille (ajout direct)`);
      
    } else {
      const resto = restaurant[0];
      console.log(`✅ Restaurant trouvé: ${resto.name} (ID: ${resto.id})\n`);
      
      const restoId = resto.id;
      
      // Produits avec plusieurs tailles (modal s'affichera)
      const productsWithMultipleSizes = [
        {
          id: `bab-pizza-001-${Date.now()}`,
          restaurantId: restoId,
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
          id: `bab-pizza-002-${Date.now()}`,
          restaurantId: restoId,
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
          id: `bab-pizza-003-${Date.now()}`,
          restaurantId: restoId,
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
          id: `bab-burger-001-${Date.now()}`,
          restaurantId: restoId,
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
          id: `bab-burger-002-${Date.now()}`,
          restaurantId: restoId,
          name: "Burger Poulet",
          description: "Filet de poulet grillé, salade, tomate, sauce",
          productType: "burger",
          category: "chicken",
          imageUrl: "https://images.unsplash.com/photo-1606755962773-d324e0a13086?w=800",
          available: true,
          prices: [
            { size: "small", price: "13.00" },
            { size: "medium", price: "17.00" },
          ],
        },
      ];

      // Produits avec une seule taille (ajout direct, pas de modal)
      const productsWithSingleSize = [
        {
          id: `bab-drink-001-${Date.now()}`,
          restaurantId: restoId,
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
          id: `bab-drink-002-${Date.now()}`,
          restaurantId: restoId,
          name: "Jus d'Orange",
          description: "Jus d'orange frais pressé",
          productType: "drink",
          category: "juice",
          imageUrl: "https://images.unsplash.com/photo-1600271886742-f049cd451bba?w=800",
          available: true,
          prices: [
            { size: "small", price: "4.00" },
          ],
        },
        {
          id: `bab-drink-003-${Date.now()}`,
          restaurantId: restoId,
          name: "Eau Minérale",
          description: "Eau minérale naturelle 50cl",
          productType: "drink",
          category: "water",
          imageUrl: "https://images.unsplash.com/photo-1548839140-5a9415c5c8b3?w=800",
          available: true,
          prices: [
            { size: "small", price: "2.00" },
          ],
        },
        {
          id: `bab-dessert-001-${Date.now()}`,
          restaurantId: restoId,
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
        {
          id: `bab-dessert-002-${Date.now()}`,
          restaurantId: restoId,
          name: "Millefeuille",
          description: "Pâtisserie feuilletée à la crème",
          productType: "dessert",
          category: "french",
          imageUrl: "https://images.unsplash.com/photo-1551024506-0bccd828d307?w=800",
          available: true,
          prices: [
            { size: "small", price: "7.00" },
          ],
        },
      ];

      const allProducts = [...productsWithMultipleSizes, ...productsWithSingleSize];

      for (const product of allProducts) {
        const { prices, ...productData } = product;
        
        try {
          await db.insert(pizzas).values(productData);
          console.log(`✅ Produit créé: ${product.name}`);
        } catch (error: any) {
          if (error.code !== '23505') {
            console.error(`❌ Erreur lors de l'insertion de ${product.name}:`, error.message);
            throw error;
          } else {
            console.log(`⚠️  Produit déjà existant: ${product.name}`);
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
              console.error(`❌ Erreur lors de l'insertion du prix pour ${product.name}:`, error.message);
            }
          }
        }
      }

      console.log(`\n✨ ${allProducts.length} produits ajoutés pour BAB EL HARA !`);
      console.log(`   - ${productsWithMultipleSizes.length} produits avec plusieurs tailles (modal)`);
      console.log(`   - ${productsWithSingleSize.length} produits avec une seule taille (ajout direct)`);
    }

    console.log("\n🎉 Terminé !");
  } catch (error) {
    console.error("❌ Erreur:", error);
    process.exit(1);
  }
}

addProductsToBabElHara();



