/**
 * Routes admin pour la génération de données de test (seed)
 * Centralise les endpoints de création et enrichissement de restaurants de test
 */

import type { Express, Response } from "express";
import { storage } from "../storage";
import { authenticateAdmin, type AuthRequest } from "../auth";
import { insertPizzaPriceSchema } from "@shared/schema";

export function registerAdminSeedRoutes(app: Express): void {
  app.post("/api/admin/restaurants/seed-test-data", authenticateAdmin, async (req: AuthRequest, res: Response) => {
    try {
      console.log("[ADMIN] Création des restaurants de test...");
      
      const testRestaurants = [
        {
          name: "Carrefour",
          phone: "21698765432",
          address: "Centre Commercial, Avenue Habib Bourguiba, Tataouine",
          description: "Supermarché et hypermarché - Tout pour vos courses quotidiennes",
          imageUrl: "https://images.unsplash.com/photo-1556910103-2c02749b8eff?w=800",
          categories: ["supermarket", "grocery", "drink", "snacks"],
          isOpen: true,
          openingHours: "08:00-22:00",
          deliveryTime: 25,
          minOrder: "10.00",
          rating: "4.6",
          products: []
        },
        {
          name: "Aziza",
          phone: "21698765433",
          address: "Rue de la République, Tataouine",
          description: "Restaurant traditionnel tunisien - Spécialités locales et plats du jour",
          imageUrl: "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=800",
          categories: ["tunisian", "traditional", "grill", "couscous"],
          isOpen: true,
          openingHours: "11:00-23:00",
          deliveryTime: 35,
          minOrder: "15.00",
          rating: "4.8",
          products: []
        },
        {
          name: "BAB EL HARA",
          phone: "21699999999",
          address: "6 Place De L'Abbaye, Tataouine",
          description: "Pizzas et spécialités tunisiennes",
          imageUrl: "https://images.unsplash.com/photo-1513104890138-7c749659a591?w=800",
          categories: ["pizza", "burger", "drink", "dessert"],
          isOpen: true,
          openingHours: "10:00-23:00",
          deliveryTime: 30,
          minOrder: "15.00",
          rating: "4.5",
          products: [
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
              ],
            },
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
          ]
        }
      ];

      let restaurantsCreated = 0;
      let restaurantsSkipped = 0;
      let productsCreated = 0;

      for (const restaurantData of testRestaurants) {
        const { products, ...restaurantInfo } = restaurantData;
        
        try {
          const existing = await storage.getRestaurantByPhone(restaurantInfo.phone);
          
          if (existing) {
            console.log(`[ADMIN] Restaurant "${restaurantInfo.name}" existe déjà`);
            restaurantsSkipped++;
            
            if (products && products.length > 0) {
              for (const product of products) {
                const { prices, ...productData } = product;
                try {
                  const newProduct = await storage.createPizza({
                    ...productData,
                    productType: productData.productType as "pizza" | "burger" | "salade" | "drink" | "dessert" | "other",
                    restaurantId: existing.id,
                  });
                  
                  for (const price of prices) {
                    const priceData = insertPizzaPriceSchema.parse({
                      pizzaId: newProduct.id,
                      size: price.size,
                      price: price.price,
                    });
                    await storage.createPizzaPrice(priceData);
                  }
                  productsCreated++;
                } catch (error: any) {
                  if (error.code !== '23505') {
                    console.error(`[ADMIN] Erreur produit "${product.name}":`, error.message);
                  }
                }
              }
            }
            continue;
          }

          const restaurant = await storage.createRestaurant({
            ...restaurantInfo,
            categories: restaurantInfo.categories,
          });
          
          restaurantsCreated++;
          console.log(`[ADMIN] Restaurant créé: ${restaurant.name}`);

          if (products && products.length > 0) {
            for (const product of products) {
              const { prices, ...productData } = product;
              try {
                const newProduct = await storage.createPizza({
                  ...productData,
                  productType: productData.productType as "pizza" | "burger" | "salade" | "drink" | "dessert" | "other",
                  restaurantId: restaurant.id,
                });
                
                for (const price of prices) {
                  const priceData = insertPizzaPriceSchema.parse({
                    pizzaId: newProduct.id,
                    size: price.size,
                    price: price.price,
                  });
                  await storage.createPizzaPrice(priceData);
                }
                productsCreated++;
              } catch (error: any) {
                console.error(`[ADMIN] Erreur produit "${product.name}":`, error.message);
              }
            }
          }
        } catch (error: any) {
          console.error(`[ADMIN] Erreur restaurant "${restaurantInfo.name}":`, error.message);
        }
      }

      res.json({
        success: true,
        message: "Restaurants de test créés avec succès",
        restaurantsCreated,
        restaurantsSkipped,
        productsCreated,
      });
    } catch (error: any) {
      console.error("[ADMIN] Erreur seed test data:", error);
      res.status(500).json({ error: "Failed to create test restaurants", details: error.message });
    }
  });

  app.post("/api/admin/restaurants/enrich-all", authenticateAdmin, async (req: AuthRequest, res: Response) => {
    try {
      console.log("[ADMIN] Enrichissement de tous les restaurants...");
      
      const restaurants = await storage.getAllRestaurants();
      let imagesUpdated = 0;
      let productsAdded = 0;
      let restaurantsProcessed = 0;

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

      const getProductsForCategory = (categories: string[]): any[] => {
        const products: any[] = [];
        
        if (categories.includes("pizza")) {
          products.push({
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
          });
        }
        
        if (categories.includes("grill") || categories.includes("tunisian")) {
          products.push({
            name: "Kafta",
            description: "Brochettes de viande hachée épicée",
            productType: "grill",
            category: "beef",
            imageUrl: "https://images.unsplash.com/photo-1529692236671-f1f6cf9683ba?w=800",
            available: true,
            prices: [
              { size: "small", price: "18.00" },
              { size: "medium", price: "25.00" },
            ],
          });
        }
        
        if (categories.includes("supermarket") || categories.includes("grocery")) {
          products.push({
            name: "Lait 1L",
            description: "Lait frais pasteurisé",
            productType: "grocery",
            category: "dairy",
            imageUrl: "https://images.unsplash.com/photo-1563636619-e9143da7973b?w=800",
            available: true,
            prices: [{ size: "small", price: "4.50" }],
          });
        }
        
        if (categories.includes("butcher")) {
          products.push({
            name: "Viande Hachée 500g",
            description: "Viande hachée fraîche",
            productType: "butcher",
            category: "beef",
            imageUrl: "https://images.unsplash.com/photo-1604503468506-a8da13d82791?w=800",
            available: true,
            prices: [{ size: "small", price: "25.00" }],
          });
        }
        
        if (categories.includes("poultry")) {
          products.push({
            name: "Poulet Entier",
            description: "Poulet frais entier",
            productType: "poultry",
            category: "chicken",
            imageUrl: "https://images.unsplash.com/photo-1604503468506-a8da13d82791?w=800",
            available: true,
            prices: [{ size: "small", price: "22.00" }],
          });
        }
        
        if (categories.includes("jewelry")) {
          products.push({
            name: "Bague en Or",
            description: "Bague en or 18 carats",
            productType: "jewelry",
            category: "ring",
            imageUrl: "https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=800",
            available: true,
            prices: [{ size: "small", price: "500.00" }],
          });
        }
        
        products.push({
          name: "Coca Cola",
          description: "Boisson gazeuse 33cl",
          productType: "drink",
          category: "soda",
          imageUrl: "https://images.unsplash.com/photo-1554866585-cd94860890b7?w=800",
          available: true,
          prices: [{ size: "small", price: "3.00" }],
        });
        
        return products.slice(0, 5);
      };

      for (const restaurant of restaurants) {
        restaurantsProcessed++;
        
        if (!restaurant.imageUrl) {
          const categories = restaurant.categories || [];
          let imageUrl = restaurantImages.default;
          for (const cat of categories) {
            if (restaurantImages[cat]) {
              imageUrl = restaurantImages[cat];
              break;
            }
          }
          await storage.updateRestaurant(restaurant.id, { imageUrl });
          imagesUpdated++;
        }

        const existingProducts = await storage.getPizzasByRestaurant(restaurant.id);
        
        if (existingProducts.length < 5) {
          const categoriesArray = Array.isArray(restaurant.categories) 
            ? restaurant.categories 
            : (typeof restaurant.categories === 'string' ? JSON.parse(restaurant.categories) : []);
          const productsToAdd = getProductsForCategory(categoriesArray);
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

              for (const price of prices) {
                await storage.createPizzaPrice({
                  pizzaId: newProduct.id,
                  size: price.size as "small" | "medium" | "large",
                  price: price.price,
                });
              }

              productsAdded++;
            } catch (error: any) {
              if (error.code !== '23505') {
                console.error(`[ADMIN] Erreur produit "${product.name}":`, error.message);
              }
            }
          }
        }
      }

      res.json({
        success: true,
        message: "Restaurants enrichis avec succès",
        restaurantsProcessed,
        imagesUpdated,
        productsAdded,
      });
    } catch (error: any) {
      console.error("[ADMIN] Erreur enrichissement:", error);
      res.status(500).json({ error: "Failed to enrich restaurants", details: error.message });
    }
  });
}

