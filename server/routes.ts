import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertPizzaSchema, insertOrderSchema, verifyOtpSchema, sendOtpSchema, updateOrderStatusSchema, insertAdminUserSchema, insertDriverSchema, driverLoginSchema, insertRestaurantSchema, restaurants, drivers, pizzaPrices, type Order } from "@shared/schema";
import { z } from "zod";
import { authenticateAdmin, authenticateN8nWebhook, generateToken, hashPassword, comparePassword, type AuthRequest } from "./auth";
import { errorHandler, AppError } from "./errors";
import { getAuthenticatedDriverId, getAuthenticatedRestaurantId, getAuthenticatedAdminId } from "./middleware/auth-helpers";
import { handleOtpLogin } from "./middleware/otp-login-helper";
import { registerAdminCrudRoutes } from "./routes/admin-crud";
import { setupWebSocket, notifyDriversOfNewOrder } from "./websocket";
import { db } from "./db";
import { eq } from "drizzle-orm";
import { OrderService } from "./services/order-service";
import { OrderAcceptanceService } from "./services/order-acceptance-service";
import { OrderEnrichmentService } from "./services/order-enrichment-service";
import { CommissionService } from "./services/commission-service";
import { sendN8nWebhook } from "./webhooks/n8n-webhook";
import { isRestaurantOpenNow, checkRestaurantStatus } from "./utils/restaurant-status";

declare global {
  namespace Express {
    interface Request {
      admin?: { id: string; email: string };
    }
  }
}

function generateOtp(): string {
  return Math.floor(1000 + Math.random() * 9000).toString();
}

function validate<T>(schema: z.ZodSchema<T>, data: any): T | null {
  try {
    return schema.parse(data) as T;
  } catch (error) {
    return null;
  }
}

let seeded = false;

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  
  // Health check endpoint pour Render (ping toutes les 10 minutes pour éviter le cold start)
  app.get("/api/health", (req: Request, res: Response) => {
    res.json({ 
      status: "ok", 
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || "development"
    });
  });
  
  // ============ AUTO MIGRATIONS ============
  // Exécuter les migrations automatiquement au démarrage (pour Render)
  try {
    const { runMigrationsOnStartup } = await import("./migrate-on-startup");
    await runMigrationsOnStartup();
  } catch (error: any) {
    console.warn("[DB] Erreur lors des migrations automatiques:", error.message);
    // On continue quand même, certaines tables peuvent déjà exister
  }
  
  // ============ WEBSOCKET SETUP ============
  setupWebSocket(httpServer);
  
  // ============ SEED DATA ============
  if (!seeded) {
    try {
      const { seedDatabase } = await import("./scripts/seed");
      await seedDatabase();
      seeded = true;
    } catch (e) {
      console.error("[DB] Error seeding data:", e);
    }
  }
  
  // ============ RESTAURANTS (PUBLIC) ============
  
  app.get("/api/restaurants", async (req, res) => {
    try {
      const restaurants = await storage.getAllRestaurants();
      
      // Enrichir avec le statut calculé côté serveur pour cohérence
      const restaurantsWithStatus = restaurants.map(restaurant => {
        const status = checkRestaurantStatus(restaurant);
        return {
          ...restaurant,
          computedStatus: status
        };
      });
      
      res.json(restaurantsWithStatus);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch restaurants" });
    }
  });
  
  app.get("/api/restaurants/:id", async (req, res) => {
    try {
      const restaurant = await storage.getRestaurantById(req.params.id);
      if (!restaurant) return res.status(404).json({ error: "Restaurant not found" });
      
      // Enrichir avec le statut calculé pour cohérence
      const restaurantWithStatus = {
        ...restaurant,
        computedStatus: checkRestaurantStatus(restaurant)
      };
      
      res.json(restaurantWithStatus);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch restaurant" });
    }
  });
  
  app.get("/api/restaurants/:id/menu", async (req, res) => {
    try {
      const restaurantId = req.params.id;
      console.log(`[API] Récupération du menu pour le restaurant: ${restaurantId}`);
      
      const pizzas = await storage.getPizzasByRestaurant(restaurantId);
      console.log(`[API] ${pizzas.length} produits trouvés pour le restaurant ${restaurantId}`);
      
      const pizzasWithPrices = await Promise.all(
        pizzas.map(async (pizza) => {
          const prices = await storage.getPizzaPrices(pizza.id);
          return { ...pizza, prices };
        })
      );
      
      console.log(`[API] Menu envoyé avec ${pizzasWithPrices.length} produits`);
      res.json(pizzasWithPrices);
    } catch (error) {
      console.error("[API] Erreur lors de la récupération du menu:", error);
      res.status(500).json({ error: "Failed to fetch menu" });
    }
  });
  
  // ============ PIZZAS (PUBLIC) ============
  
  app.get("/api/pizzas", async (req, res) => {
    try {
      const allPizzas = await storage.getAllPizzas();
      const pizzasWithPrices = await Promise.all(
        allPizzas.map(async (pizza) => {
          const prices = await storage.getPizzaPrices(pizza.id);
          return { ...pizza, prices };
        })
      );
      res.json(pizzasWithPrices);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch pizzas" });
    }
  });
  
  app.get("/api/pizzas/:id", async (req, res) => {
    try {
      const pizza = await storage.getPizzaById(req.params.id);
      if (!pizza) return res.status(404).json({ error: "Pizza not found" });
      const prices = await storage.getPizzaPrices(pizza.id);
      res.json({ ...pizza, prices });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch pizza" });
    }
  });
  
  // ============ OTP ============
  
  app.post("/api/otp/send", async (req, res) => {
    try {
      const data = validate(sendOtpSchema, req.body);
      if (!data) return res.status(400).json({ error: "Invalid phone number" });
      
      const code = generateOtp();
      const expiresAt = new Date(Date.now() + 5 * 60 * 1000);
      await storage.createOtpCode(data.phone, code, expiresAt);
      
      console.log(`[OTP] Code for ${data.phone}: ${code}`);
      res.json({ message: "OTP sent", code });
    } catch (error: any) {
      console.error("[OTP] Erreur lors de l'envoi:", error);
      res.status(500).json({ 
        error: "Failed to send OTP",
        details: process.env.NODE_ENV === "development" ? error.message : undefined
      });
    }
  });
  
  app.post("/api/otp/verify", async (req, res) => {
    try {
      const data = validate(verifyOtpSchema, req.body);
      if (!data) return res.status(400).json({ error: "Invalid request" });
      
      const verified = await storage.verifyOtpCode(data.phone, data.code);
      res.json({ verified });
    } catch (error) {
      res.status(500).json({ error: "Verification failed" });
    }
  });
  
  // ============ ORDERS (PUBLIC) ============
  
  // La fonction isRestaurantOpenNow est maintenant importée depuis utils/restaurant-status.ts
  
  app.post("/api/orders", async (req, res) => {
    try {
      const data = validate(insertOrderSchema, req.body);
      if (!data) return res.status(400).json({ error: "Invalid order data" });
      
      // Verify restaurant exists
      const restaurant = await storage.getRestaurantById(data.restaurantId);
      if (!restaurant) return res.status(404).json({ error: "Restaurant not found" });
      
      // Check if restaurant is open
      if (!isRestaurantOpenNow(restaurant)) {
        return res.status(400).json({
          error: "Le restaurant est actuellement fermé. Merci de commander pendant les horaires d'ouverture.",
        });
      }
      
      // Calculate total price and validate pizzas belong to restaurant
      let totalPrice = 0;
      const orderItemsDetails: Array<{ name: string; size: string; quantity: number }> = [];
      
      for (const item of data.items) {
        const pizza = await storage.getPizzaById(item.pizzaId);
        if (!pizza) return res.status(404).json({ error: `Pizza ${item.pizzaId} not found` });
        if (pizza.restaurantId !== data.restaurantId) {
          return res.status(400).json({ error: "All pizzas must be from the same restaurant" });
        }
        
        const prices = await storage.getPizzaPrices(item.pizzaId);
        const sizePrice = prices.find((p: any) => p.size === item.size);
        if (!sizePrice) return res.status(400).json({ error: `Invalid size for pizza ${pizza.name}` });
        totalPrice += Number(sizePrice.price) * item.quantity;
        
        orderItemsDetails.push({
          name: pizza.name,
          size: item.size,
          quantity: item.quantity,
        });
      }
      
      // Add delivery fee (2 TND)
      const deliveryFee = 2.0;
      totalPrice += deliveryFee;
      
      // Feature flag: Force order to READY status for testing
      const FORCE_RESTAURANT_READY = process.env.FORCE_RESTAURANT_READY === 'true';
      const isProduction = process.env.NODE_ENV === 'production';
      
      if (FORCE_RESTAURANT_READY && isProduction) {
        console.error("[ORDER] ⚠️ ATTENTION: FORCE_RESTAURANT_READY activé en PRODUCTION !");
        // Optionnel: désactiver automatiquement en prod pour sécurité
        // FORCE_RESTAURANT_READY = false;
      }
      
      const initialStatus = FORCE_RESTAURANT_READY ? "ready" : "accepted";
      
      if (FORCE_RESTAURANT_READY) {
        console.log("[ORDER] ⚠️ FORCE_RESTAURANT_READY activé - Commande forcée à READY");
      }
      
      // Create order with status "accepted" if restaurant is open (or "ready" if flag is active)
      console.log("[ORDER] Création commande avec coordonnées GPS:", {
        customerLat: data.customerLat,
        customerLng: data.customerLng,
        address: data.address,
        status: initialStatus,
      });
      
      const order = await storage.createOrder({
        restaurantId: data.restaurantId,
        customerName: data.customerName,
        phone: data.phone,
        address: data.address,
        addressDetails: data.addressDetails,
        customerLat: data.customerLat?.toString(),
        customerLng: data.customerLng?.toString(),
        totalPrice: totalPrice.toString(),
        status: initialStatus, // "ready" si flag activé, sinon "accepted"
      });
      
      console.log("[ORDER] Commande créée:", {
        id: order.id,
        customerLat: order.customerLat,
        customerLng: order.customerLng,
      });
      
      for (const item of data.items) {
        const prices = await storage.getPizzaPrices(item.pizzaId);
        const sizePrice = prices.find((p: any) => p.size === item.size);
        await storage.createOrderItem({
          orderId: order.id,
          pizzaId: item.pizzaId,
          size: item.size,
          quantity: item.quantity,
          pricePerUnit: sizePrice.price,
        });
      }
      
      // Notify drivers via WebSocket
      try {
        await notifyDriversOfNewOrder({
          type: "new_order",
          orderId: order.id,
          restaurantName: restaurant.name,
          customerName: data.customerName,
          address: data.address,
          customerLat: data.customerLat,
          customerLng: data.customerLng,
          totalPrice: totalPrice.toString(),
          items: orderItemsDetails,
        });
      } catch (wsError) {
        console.error("[ORDER] Erreur notification WebSocket:", wsError);
        // Continue même si WebSocket échoue
      }
      
      // Envoyer aussi des SMS aux livreurs (déjà fait dans notifyDriversOfNewOrder, mais on peut aussi le faire ici pour être sûr)
      // Note: Les SMS sont déjà envoyés dans notifyDriversOfNewOrder, donc cette ligne est optionnelle
      // try {
      //   const { sendSMSToDrivers } = await import('./services/sms-service.js');
      //   await sendSMSToDrivers(order.id, restaurant.name, data.customerName, totalPrice.toString());
      // } catch (smsError) {
      //   console.error("[ORDER] Erreur envoi SMS:", smsError);
      // }
      
      // Send webhook to n8n
      try {
        await sendN8nWebhook("order-created", {
          orderId: order.id,
          restaurantId: restaurant.id,
          restaurantName: restaurant.name,
          restaurantPhone: restaurant.phone,
          customerName: data.customerName,
          customerPhone: data.phone,
          address: data.address,
          addressDetails: data.addressDetails,
          totalPrice: totalPrice.toString(),
          items: orderItemsDetails,
          status: order.status,
          createdAt: order.createdAt,
        });
        console.log(`[ORDER] Webhook n8n envoyé pour commande ${order.id}`);
      } catch (webhookError) {
        console.error("[ORDER] Erreur webhook n8n:", webhookError);
        // Continue même si webhook échoue
      }
      
      res.status(201).json({ orderId: order.id, totalPrice });
    } catch (error) {
      console.error("[ORDER] Error:", error);
      res.status(500).json({ error: "Failed to create order" });
    }
  });
  
  app.get("/api/orders/:id", async (req, res) => {
    try {
      const order = await storage.getOrderById(req.params.id);
      if (!order) return res.status(404).json({ error: "Order not found" });
      
      const items = await storage.getOrderItems(order.id);
      const itemsWithDetails = await Promise.all(
        items.map(async (item) => {
          const pizza = await storage.getPizzaById(item.pizzaId);
          return { ...item, pizza };
        })
      );
      
      // Enrichir avec les informations du restaurant pour le livreur
      let enrichedOrder: any = { ...order, items: itemsWithDetails };
      if (order.restaurantId) {
        const restaurant = await storage.getRestaurantById(order.restaurantId);
        if (restaurant) {
          enrichedOrder = {
            ...enrichedOrder,
            restaurantName: restaurant.name,
            restaurantAddress: restaurant.address,
          };
        }
      }
      
      res.json(enrichedOrder);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch order" });
    }
  });
  
  app.get("/api/orders/customer/:phone", async (req, res) => {
    try {
      const orders = await storage.getOrdersByPhone(req.params.phone);
      res.json(orders);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch orders" });
    }
  });
  
  // ============ ADMIN AUTH ============
  
  app.post("/api/admin/register", async (req, res) => {
    // Désactiver l'enregistrement en production pour des raisons de sécurité
    if (process.env.NODE_ENV === "production") {
      console.log("[ADMIN REGISTER] Tentative d'enregistrement bloquée en production");
      return res.status(403).json({ 
        error: "Registration is disabled in production. Use the create-admin script instead." 
      });
    }
    
    try {
      const data = validate(insertAdminUserSchema, req.body);
      if (!data) return res.status(400).json({ error: "Invalid data" });
      
      const existing = await storage.getAdminByEmail(data.email);
      if (existing) return res.status(409).json({ error: "Email already exists" });
      
      const hashedPassword = await hashPassword(data.password);
      const admin = await storage.createAdminUser({ email: data.email, password: hashedPassword });
      const token = generateToken(admin.id, admin.email);
      
      res.status(201).json({ token });
    } catch (error) {
      res.status(500).json({ error: "Registration failed" });
    }
  });
  
  app.post("/api/admin/login", async (req, res) => {
    try {
      const { email, password } = req.body;
      if (!email || !password) {
        console.log("[ADMIN LOGIN] Tentative de connexion sans email/password");
        return res.status(400).json({ error: "Email and password required" });
      }
      
      console.log(`[ADMIN LOGIN] Tentative de connexion pour: ${email}`);
      const admin = await storage.getAdminByEmail(email);
      if (!admin) {
        console.log(`[ADMIN LOGIN] Admin non trouvé: ${email}`);
        return res.status(401).json({ error: "Invalid credentials" });
      }
      
      const valid = await comparePassword(password, admin.password);
      if (!valid) {
        console.log(`[ADMIN LOGIN] Mot de passe incorrect pour: ${email}`);
        return res.status(401).json({ error: "Invalid credentials" });
      }
      
      const token = generateToken(admin.id, admin.email);
      console.log(`[ADMIN LOGIN] Connexion réussie pour: ${email}`);
      res.json({ token });
    } catch (error: any) {
      console.error("[ADMIN LOGIN] Erreur:", error);
      res.status(500).json({ error: "Login failed", details: process.env.NODE_ENV === "development" ? error.message : undefined });
    }
  });
  
  // ============ ADMIN DASHBOARD ============
  // Routes CRUD admin extraites dans routes/admin-crud.ts
  registerAdminCrudRoutes(app);
  
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
          products: [] // Pas de produits pour Carrefour pour l'instant
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
          // Vérifier si le restaurant existe déjà
          const existing = await storage.getRestaurantByPhone(restaurantInfo.phone);
          
          if (existing) {
            console.log(`[ADMIN] Restaurant "${restaurantInfo.name}" existe déjà`);
            restaurantsSkipped++;
            
            // Si le restaurant existe mais n'a pas de produits, ajouter les produits
            if (products && products.length > 0) {
              for (const product of products) {
                const { prices, ...productData } = product;
                try {
                  const newProduct = await storage.createPizza({
                    ...productData,
                    restaurantId: existing.id,
                  });
                  
                  // Ajouter les prix
                  for (const price of prices) {
                    await storage.createPizzaPrice({
                      pizzaId: newProduct.id,
                      size: price.size as "small" | "medium" | "large",
                      price: price.price,
                    });
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

          // Créer le restaurant
          const restaurant = await storage.createRestaurant({
            ...restaurantInfo,
            categories: restaurantInfo.categories,
          });
          
          restaurantsCreated++;
          console.log(`[ADMIN] Restaurant créé: ${restaurant.name}`);

          // Ajouter les produits
          if (products && products.length > 0) {
            for (const product of products) {
              const { prices, ...productData } = product;
              try {
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

      // Images par catégorie
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

      // Produits par catégorie (simplifié pour l'API)
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
        
        // Toujours ajouter des boissons
        products.push({
          name: "Coca Cola",
          description: "Boisson gazeuse 33cl",
          productType: "drink",
          category: "soda",
          imageUrl: "https://images.unsplash.com/photo-1554866585-cd94860890b7?w=800",
          available: true,
          prices: [{ size: "small", price: "3.00" }],
        });
        
        return products.slice(0, 5); // Max 5 produits par restaurant
      };

      for (const restaurant of restaurants) {
        restaurantsProcessed++;
        
        // 1. Ajouter une image si elle manque
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

        // 2. Vérifier les produits existants
        const existingProducts = await storage.getPizzasByRestaurant(restaurant.id);
        
        // 3. Ajouter des produits si nécessaire
        if (existingProducts.length < 5) {
          // Convertir categories en array si nécessaire
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

              // Ajouter les prix
              for (const price of prices) {
                await storage.createPizzaPrice({
                  pizzaId: newProduct.id,
                  size: price.size as "small" | "medium" | "large",
                  price: price.price,
                });
              }

              productsAdded++;
            } catch (error: any) {
              // Ignorer les erreurs de doublons
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

  
  // ============ RESTAURANT AUTH (OTP) ============
  
  app.post("/api/restaurant/login-otp", async (req: Request, res: Response) => {
    const result = await handleOtpLogin(req, res, {
      getUserByPhone: async (phone) => {
        const restaurant = await storage.getRestaurantByPhone(phone);
        return restaurant ? { id: restaurant.id, name: restaurant.name, phone: restaurant.phone } : null;
      },
      userType: "restaurant",
    });
    
    if (result) {
      res.json({ token: result.token, restaurant: result.user });
    }
  });
  
  // ============ RESTAURANT DASHBOARD ============
  
  app.get("/api/restaurant/orders", authenticateAdmin, async (req: AuthRequest, res: Response) => {
    try {
      const restaurantId = getAuthenticatedRestaurantId(req);
      
      const orders = await storage.getOrdersByRestaurant(restaurantId);
      res.json(orders);
    } catch (error) {
      errorHandler.sendError(res, error);
    }
  });
  
  app.patch("/api/restaurant/orders/:id/status", authenticateAdmin, async (req: AuthRequest, res: Response) => {
    try {
      const { status } = req.body as { status?: string };
      if (!status) throw errorHandler.badRequest("Status required");
      
      const restaurantId = getAuthenticatedRestaurantId(req);
      
      const updatedOrder = await OrderService.updateStatus(
        req.params.id,
        status,
        { type: "restaurant", id: restaurantId }
      );
      
      res.json(updatedOrder);
    } catch (error) {
      errorHandler.sendError(res, error);
    }
  });
  
  // Toggle restaurant open/closed status
  app.patch("/api/restaurant/toggle-status", authenticateAdmin, async (req: AuthRequest, res: Response) => {
    try {
      const restaurantId = getAuthenticatedRestaurantId(req);
      
      const restaurant = await storage.getRestaurantById(restaurantId);
      if (!restaurant) throw errorHandler.notFound("Restaurant not found");
      
      const currentStatus = restaurant.isOpen;
      const newStatus = !currentStatus;
      const updated = await storage.updateRestaurant(restaurantId, { isOpen: newStatus });
      res.json({ isOpen: updated.isOpen });
    } catch (error) {
      errorHandler.sendError(res, error);
    }
  });

  // Get restaurant status
  app.get("/api/restaurant/status", authenticateAdmin, async (req: AuthRequest, res: Response) => {
    try {
      const restaurantId = getAuthenticatedRestaurantId(req);
      
      const restaurant = await storage.getRestaurantById(restaurantId);
      if (!restaurant) throw errorHandler.notFound("Restaurant not found");
      
      res.json({ isOpen: restaurant.isOpen });
    } catch (error) {
      errorHandler.sendError(res, error);
    }
  });

  // ============ DRIVER AUTH (OTP) ============
  
  app.post("/api/driver/login-otp", async (req: Request, res: Response) => {
    const result = await handleOtpLogin(req, res, {
      getUserByPhone: async (phone) => {
        const driver = await storage.getDriverByPhone(phone);
        return driver ? { id: driver.id, name: driver.name, phone: driver.phone } : null;
      },
      userType: "driver",
    });
    
    if (result) {
      res.json({ token: result.token, driver: result.user });
    }
  });
  
  // ============ DRIVER DASHBOARD ============
  
  // Get ready orders available for pickup (for all drivers)
  app.get("/api/driver/available-orders", authenticateAdmin, async (req: AuthRequest, res: Response) => {
    try {
      let readyOrders: Order[] = [];
      try {
        readyOrders = await storage.getReadyOrders();
      } catch (err) {
        console.error("[DRIVER] Error fetching ready orders:", err);
        readyOrders = [];
      }
      
      if (!readyOrders || readyOrders.length === 0) {
        return res.json([]);
      }
      
      // Utiliser le service d'enrichissement pour éviter les duplications
      const enrichedOrders = await OrderEnrichmentService.enrichOrders(readyOrders);
      
      // Log pour debug GPS
      enrichedOrders.forEach(order => {
        console.log(`[API] Commande ${order.id} - Coordonnées GPS:`, {
          customerLat: order.customerLat,
          customerLng: order.customerLng,
          address: order.address,
        });
      });
      
      res.json(enrichedOrders);
    } catch (error) {
      errorHandler.sendError(res, error);
    }
  });
  
  // Get driver's own orders (accepted/in delivery)
  app.get("/api/driver/orders", authenticateAdmin, async (req: AuthRequest, res: Response) => {
    try {
      const driverId = getAuthenticatedDriverId(req);
      
      const orders = await storage.getOrdersByDriver(driverId);
      
      // Utiliser le service d'enrichissement pour éviter les duplications
      const enrichedOrders = await OrderEnrichmentService.enrichOrders(orders);
      
      res.json(enrichedOrders);
    } catch (error) {
      errorHandler.sendError(res, error);
    }
  });
  
  // Driver accepts a ready order (atomic - first come first served)
  app.post("/api/driver/orders/:id/accept", authenticateAdmin, async (req: AuthRequest, res: Response) => {
    try {
      const driverId = getAuthenticatedDriverId(req);
      
      // Utiliser le service centralisé pour l'acceptation
      const acceptedOrder = await OrderAcceptanceService.acceptOrder(
        req.params.id,
        driverId
      );
      
      if (!acceptedOrder) {
        throw errorHandler.badRequest("Cette commande a déjà été prise par un autre livreur");
      }
      
      res.json(acceptedOrder);
    } catch (error) {
      errorHandler.sendError(res, error);
    }
  });
  
  // Driver updates order status (can set to delivery when ready, or delivered when done)
  app.patch("/api/driver/orders/:id/status", authenticateAdmin, async (req: AuthRequest, res: Response) => {
    try {
      const { status } = req.body as { status?: string };
      if (!status) throw errorHandler.badRequest("Status required");
      
      const driverId = getAuthenticatedDriverId(req);
      
      const updatedOrder = await OrderService.updateStatus(
        req.params.id,
        status,
        { type: "driver", id: driverId }
      );
      
      res.json(updatedOrder);
    } catch (error) {
      errorHandler.sendError(res, error);
    }
  });
  
  // Toggle driver online/offline status
  app.patch("/api/driver/toggle-status", authenticateAdmin, async (req: AuthRequest, res: Response) => {
    try {
      const driverId = getAuthenticatedDriverId(req);
      
      const driver = await storage.getDriverById(driverId);
      if (!driver) throw errorHandler.notFound("Driver not found");
      
      // Toggle between available and offline
      const newStatus = driver.status === "offline" ? "available" : "offline";
      const updated = await storage.updateDriverStatus(driverId, newStatus);
      res.json({ status: updated.status });
    } catch (error) {
      errorHandler.sendError(res, error);
    }
  });

  // Get driver status
  app.get("/api/driver/status", authenticateAdmin, async (req: AuthRequest, res: Response) => {
    try {
      const driverId = getAuthenticatedDriverId(req);
      
      const driver = await storage.getDriverById(driverId);
      if (!driver) throw errorHandler.notFound("Driver not found");
      
      res.json({ status: driver.status });
    } catch (error) {
      errorHandler.sendError(res, error);
    }
  });
  
  // ============ N8N WEBHOOKS (Endpoints que n8n appelle) ============
  
  // Webhook: n8n peut mettre à jour le statut d'une commande
  app.patch("/webhook/orders/:id/status", authenticateN8nWebhook, async (req: Request, res: Response) => {
    try {
      const { status } = req.body;
      if (!status) {
        return res.status(400).json({ error: "Status required" });
      }
      
      const updatedOrder = await OrderService.updateStatus(
        req.params.id,
        status,
        { type: "webhook" }
      );
      res.json({ success: true, order: updatedOrder });
    } catch (error: any) {
      console.error("[N8N] Erreur webhook update status:", error);
      res.status(500).json({ error: error.message || "Internal server error" });
    }
  });
  
  // Webhook: n8n peut assigner un livreur à une commande
  app.post("/webhook/orders/:id/assign-driver", authenticateN8nWebhook, async (req: Request, res: Response) => {
    try {
      const { driverId } = req.body;
      if (!driverId) {
        return res.status(400).json({ error: "driverId required" });
      }
      
      // Utiliser le service centralisé pour l'acceptation
      const acceptedOrder = await OrderAcceptanceService.acceptOrder(
        req.params.id,
        driverId
      );
      
      if (!acceptedOrder) {
        return res.status(400).json({ error: "Failed to assign driver" });
      }
      
      res.json({ success: true, order: acceptedOrder });
    } catch (error: any) {
      console.error("[N8N] Erreur webhook assign driver:", error);
      res.status(500).json({ error: error.message || "Internal server error" });
    }
  });
  
  // Webhook: n8n peut enregistrer les commissions
  app.post("/webhook/orders/:id/commissions", authenticateN8nWebhook, async (req: Request, res: Response) => {
    try {
      const { driverCommission, appCommission } = req.body;
      
      const order = await storage.getOrderById(req.params.id);
      if (!order) {
        return res.status(404).json({ error: "Order not found" });
      }
      
      // Utiliser le service de commissions centralisé
      const commissions = CommissionService.calculateFromCustom(
        order.totalPrice,
        driverCommission,
        appCommission
      );
      
      // Pour l'instant, on log juste les commissions
      // TODO: Créer une table commissions si nécessaire
      console.log(`[N8N] Commissions pour commande ${req.params.id}:`, commissions);
      
      res.json({ 
        success: true, 
        commissions: {
          driver: commissions.driver,
          app: commissions.app,
          restaurant: commissions.restaurant,
        },
      });
    } catch (error: any) {
      console.error("[N8N] Erreur webhook commissions:", error);
      res.status(500).json({ error: error.message || "Internal server error" });
    }
  });
  
  // Webhook: n8n peut recevoir des messages WhatsApp entrants
  app.post("/webhook/whatsapp-incoming", authenticateN8nWebhook, async (req: Request, res: Response) => {
    try {
      const { from, message, orderId } = req.body;
      
      console.log(`[N8N] Message WhatsApp reçu de ${from}:`, message);
      
      // Traiter le message (ex: "ACCEPTER" pour livreur)
      // Cette logique sera gérée par n8n, on log juste ici
      
      res.json({ success: true, received: true });
    } catch (error: any) {
      console.error("[N8N] Erreur webhook whatsapp incoming:", error);
      res.status(500).json({ error: error.message || "Internal server error" });
    }
  });
  
  // Webhook: Health check pour n8n
  app.get("/webhook/health", authenticateN8nWebhook, async (req: Request, res: Response) => {
    res.json({ 
      status: "ok", 
      timestamp: new Date().toISOString(),
      service: "tataouine-pizza-backend",
    });
  });

  return httpServer;
}
