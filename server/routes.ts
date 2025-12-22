import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertPizzaSchema, insertOrderSchema, verifyOtpSchema, sendOtpSchema, updateOrderStatusSchema, insertAdminUserSchema, insertDriverSchema, driverLoginSchema, insertRestaurantSchema, restaurants, drivers, pizzaPrices } from "@shared/schema";
import { z } from "zod";
import { authenticateAdmin, generateToken, hashPassword, comparePassword, type AuthRequest } from "./auth";
import { errorHandler, AppError } from "./errors";
import { setupWebSocket, notifyDriversOfNewOrder } from "./websocket";
import { db } from "./db";
import { eq } from "drizzle-orm";

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

function validate<T>(schema: z.ZodSchema, data: any): T | null {
  try {
    return schema.parse(data);
  } catch (error) {
    return null;
  }
}

let seeded = false;

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  
  // Health check endpoint pour Render
  app.get("/api/health", (req: Request, res: Response) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
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
      let existingRestaurants: any[] = [];
      try {
        existingRestaurants = await storage.getAllRestaurants();
      } catch (e) {
        console.log("[DB] Could not get restaurants, will try to seed:", e);
        existingRestaurants = [];
      }
      if (!existingRestaurants || existingRestaurants.length === 0) {
        console.log("[DB] Seeding database with demo data...");
        
        // Create demo restaurants
        const restaurant1 = await storage.createRestaurant({
          name: "Tataouine Pizza",
          phone: "21611111111",
          address: "Avenue Habib Bourguiba, Tataouine",
          description: "Les meilleures pizzas de Tataouine avec des recettes traditionnelles tunisiennes",
          imageUrl: null,
          category: "pizza",
        });
        
        const restaurant2 = await storage.createRestaurant({
          name: "Pizza del Sol",
          phone: "21622222222",
          address: "Rue de la Liberté, Tataouine",
          description: "Pizzas italiennes authentiques cuites au feu de bois",
          imageUrl: null,
          category: "pizza",
        });
        
        const restaurant3 = await storage.createRestaurant({
          name: "Sahara Grill",
          phone: "21633333333",
          address: "Boulevard de l'Environnement, Tataouine",
          description: "Grillades et spécialités du sud tunisien",
          imageUrl: null,
          category: "grill",
        });
        
        // Pizzas for restaurant 1
        const pizzas1 = [
          { name: "Margherita", description: "Sauce tomate, mozzarella di bufala, basilic frais", category: "classic", restaurantId: restaurant1.id },
          { name: "La Tunisienne", description: "Thon, olives, œuf, harissa, fromage", category: "special", restaurantId: restaurant1.id },
          { name: "Tataouine Spéciale", description: "Merguez, poivrons grillés, œuf, olives", category: "special", restaurantId: restaurant1.id },
        ];
        
        // Pizzas for restaurant 2
        const pizzas2 = [
          { name: "Pepperoni", description: "Double pepperoni, mozzarella, origan", category: "classic", restaurantId: restaurant2.id },
          { name: "4 Fromages", description: "Mozzarella, Gorgonzola, Parmesan, Chèvre", category: "classic", restaurantId: restaurant2.id },
          { name: "Vegetarian", description: "Poivrons, champignons, olives, tomates", category: "vegetarian", restaurantId: restaurant2.id },
        ];
        
        // Pizzas for restaurant 3 (grill items)
        const pizzas3 = [
          { name: "Mechoui", description: "Agneau grillé aux épices du sud", category: "special", restaurantId: restaurant3.id },
          { name: "Brochettes Mixtes", description: "Bœuf, poulet, merguez grillés", category: "special", restaurantId: restaurant3.id },
        ];
        
        for (const pizza of [...pizzas1, ...pizzas2, ...pizzas3]) {
          const created = await storage.createPizza(pizza);
          for (const [size, price] of [["small", "10"], ["medium", "15"], ["large", "18"]]) {
            await storage.createPizzaPrice({ pizzaId: created.id, size, price });
          }
        }
        
        // Create demo drivers (only if they don't exist)
        const demoDrivers = [
          { name: "Mohamed", phone: "21612345678", password: await hashPassword("driver123") },
          { name: "Ahmed", phone: "21698765432", password: await hashPassword("driver123") },
          { name: "Fatima", phone: "21625874123", password: await hashPassword("driver123") },
        ];
        for (const driver of demoDrivers) {
          const existing = await storage.getDriverByPhone(driver.phone);
          if (!existing) {
            await storage.createDriver(driver);
          }
        }
        
        console.log("[DB] Demo data seeded successfully!");
      }
      seeded = true;
    } catch (e) {
      console.error("[DB] Error seeding data:", e);
    }
  }
  
  // ============ RESTAURANTS (PUBLIC) ============
  
  app.get("/api/restaurants", async (req, res) => {
    try {
      const restaurants = await storage.getAllRestaurants();
      res.json(restaurants);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch restaurants" });
    }
  });
  
  app.get("/api/restaurants/:id", async (req, res) => {
    try {
      const restaurant = await storage.getRestaurantById(req.params.id);
      if (!restaurant) return res.status(404).json({ error: "Restaurant not found" });
      res.json(restaurant);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch restaurant" });
    }
  });
  
  app.get("/api/restaurants/:id/menu", async (req, res) => {
    try {
      const pizzas = await storage.getPizzasByRestaurant(req.params.id);
      const pizzasWithPrices = await Promise.all(
        pizzas.map(async (pizza) => {
          const prices = await storage.getPizzaPrices(pizza.id);
          return { ...pizza, prices };
        })
      );
      res.json(pizzasWithPrices);
    } catch (error) {
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
  
  // Helper function to check if restaurant is open now
  function isRestaurantOpenNow(restaurant: any): boolean {
    if (!restaurant.isOpen) return false;
    if (!restaurant.openingHours) return true; // Si pas d'horaires, considérer ouvert
    
    // Parse opening hours (format: "09:00-23:00")
    const [openTime, closeTime] = restaurant.openingHours.split("-");
    if (!openTime || !closeTime) return true;
    
    const now = new Date();
    const currentTime = `${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}`;
    
    return currentTime >= openTime && currentTime <= closeTime;
  }
  
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
      
      // Create order with status "accepted" if restaurant is open
      console.log("[ORDER] Création commande avec coordonnées GPS:", {
        customerLat: data.customerLat,
        customerLng: data.customerLng,
        address: data.address,
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
        status: "accepted", // Auto-accept if restaurant is open
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
      
      // Send webhook to n8n
      try {
        const n8nWebhookUrl = process.env.N8N_WEBHOOK_URL;
        if (n8nWebhookUrl) {
          await fetch(n8nWebhookUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
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
            }),
          });
          console.log(`[ORDER] Webhook n8n envoyé pour commande ${order.id}`);
        }
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
      
      res.json({ ...order, items: itemsWithDetails });
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
      if (!email || !password) return res.status(400).json({ error: "Email and password required" });
      
      const admin = await storage.getAdminByEmail(email);
      if (!admin) return res.status(401).json({ error: "Invalid credentials" });
      
      const valid = await comparePassword(password, admin.password);
      if (!valid) return res.status(401).json({ error: "Invalid credentials" });
      
      const token = generateToken(admin.id, admin.email);
      res.json({ token });
    } catch (error) {
      res.status(500).json({ error: "Login failed" });
    }
  });
  
  // ============ ADMIN DASHBOARD ============
  
  app.get("/api/admin/orders", authenticateAdmin, async (req: AuthRequest, res: Response) => {
    try {
      const { status, limit = "50", offset = "0" } = req.query;
      let allOrders = await storage.getAllOrders();
      
      if (status && typeof status === "string") {
        allOrders = allOrders.filter(o => o.status === status);
      }
      
      const total = allOrders.length;
      const paginatedOrders = allOrders.slice(Number(offset), Number(offset) + Number(limit));
      
      res.json({ orders: paginatedOrders, total, offset: Number(offset), limit: Number(limit) });
    } catch (error) {
      errorHandler.sendError(res, error);
    }
  });
  
  app.patch("/api/admin/orders/:id/status", authenticateAdmin, async (req: AuthRequest, res: Response) => {
    try {
      const data = validate(updateOrderStatusSchema, req.body);
      if (!data) throw errorHandler.badRequest("Invalid status");
      
      const order = await storage.getOrderById(req.params.id);
      if (!order) throw errorHandler.notFound("Order not found");
      
      const updatedOrder = await storage.updateOrderStatus(req.params.id, data.status);
      res.json(updatedOrder);
    } catch (error) {
      errorHandler.sendError(res, error);
    }
  });
  
  app.patch("/api/admin/orders/:id/driver", authenticateAdmin, async (req: AuthRequest, res: Response) => {
    try {
      const { driverId } = req.body;
      if (!driverId) throw errorHandler.badRequest("Driver ID required");
      
      const order = await storage.getOrderById(req.params.id);
      if (!order) throw errorHandler.notFound("Order not found");
      
      const updatedOrder = await storage.assignOrderToDriver(req.params.id, driverId);
      res.json(updatedOrder);
    } catch (error) {
      errorHandler.sendError(res, error);
    }
  });
  
  app.get("/api/admin/drivers", authenticateAdmin, async (req: AuthRequest, res: Response) => {
    try {
      const drivers = await storage.getAllDrivers();
      res.json(drivers);
    } catch (error) {
      errorHandler.sendError(res, error);
    }
  });
  
  app.get("/api/admin/restaurants", authenticateAdmin, async (req: AuthRequest, res: Response) => {
    try {
      const restaurants = await storage.getAllRestaurants();
      res.json(restaurants);
    } catch (error) {
      errorHandler.sendError(res, error);
    }
  });
  
  app.get("/api/admin/pizzas", authenticateAdmin, async (req: AuthRequest, res: Response) => {
    try {
      const pizzas = await storage.getAllPizzas();
      // Récupérer les prix pour chaque pizza
      const pizzasWithPrices = await Promise.all(
        pizzas.map(async (pizza) => {
          const prices = await storage.getPizzaPrices(pizza.id);
          return { ...pizza, prices };
        })
      );
      res.json(pizzasWithPrices);
    } catch (error) {
      errorHandler.sendError(res, error);
    }
  });
  
  app.post("/api/admin/restaurants", authenticateAdmin, async (req: AuthRequest, res: Response) => {
    try {
      console.log("[API] POST /api/admin/restaurants - Début");
      const { name, phone, address, description, imageUrl, categories } = req.body;
      console.log("[API] Données reçues:", { name, phone, address, categories });
      
      if (!name || !phone || !address) {
        console.log("[API] Validation échouée: champs manquants");
        throw errorHandler.badRequest("Nom, téléphone et adresse sont requis");
      }
      
      if (!categories || !Array.isArray(categories) || categories.length === 0) {
        console.log("[API] Validation échouée: catégories manquantes");
        throw errorHandler.badRequest("Au moins une catégorie de produit est requise");
      }
      
      const existing = await storage.getRestaurantByPhone(phone);
      if (existing) {
        console.log("[API] Restaurant existe déjà avec ce téléphone");
        throw errorHandler.badRequest("Un restaurant avec ce numéro existe déjà");
      }
      
      // Convertir le tableau de catégories en JSON string
      const restaurantData = {
        name,
        phone,
        address,
        description: description || null,
        imageUrl: imageUrl || null,
        categories: JSON.stringify(categories),
      };
      
      console.log("[API] Création du restaurant...");
      const restaurant = await storage.createRestaurant(restaurantData);
      console.log("[API] Restaurant créé:", restaurant.id);
      
      // Parser les catégories pour la réponse
      const restaurantResponse = {
        ...restaurant,
        categories: typeof restaurant.categories === 'string' ? JSON.parse(restaurant.categories) : (restaurant.categories || []),
      };
      
      console.log("[API] Envoi de la réponse");
      res.status(201).json(restaurantResponse);
    } catch (error) {
      console.error("[API] Erreur lors de la création du restaurant:", error);
      errorHandler.sendError(res, error);
    }
  });
  
  app.patch("/api/admin/restaurants/:id", authenticateAdmin, async (req: AuthRequest, res: Response) => {
    try {
      const { name, phone, address, description, imageUrl, categories } = req.body;
      const restaurantId = req.params.id;
      
      const restaurant = await storage.getRestaurantById(restaurantId);
      if (!restaurant) throw errorHandler.notFound("Restaurant non trouvé");
      
      const updateData: any = {};
      if (name !== undefined) updateData.name = name;
      if (phone !== undefined) {
        // Vérifier que le nouveau numéro n'est pas déjà utilisé par un autre restaurant
        const existing = await storage.getRestaurantByPhone(phone);
        if (existing && existing.id !== restaurantId) {
          throw errorHandler.badRequest("Un restaurant avec ce numéro existe déjà");
        }
        updateData.phone = phone;
      }
      if (address !== undefined) updateData.address = address;
      if (description !== undefined) updateData.description = description || null;
      if (imageUrl !== undefined) updateData.imageUrl = imageUrl || null;
      if (categories !== undefined) {
        if (!Array.isArray(categories) || categories.length === 0) {
          throw errorHandler.badRequest("Au moins une catégorie de produit est requise");
        }
        updateData.categories = JSON.stringify(categories);
      }
      
      const updated = await storage.updateRestaurant(restaurantId, updateData);
      
      const restaurantResponse = {
        ...updated,
        categories: typeof updated.categories === 'string' ? JSON.parse(updated.categories) : (updated.categories || []),
      };
      
      res.json(restaurantResponse);
    } catch (error) {
      errorHandler.sendError(res, error);
    }
  });
  
  app.delete("/api/admin/restaurants/:id", authenticateAdmin, async (req: AuthRequest, res: Response) => {
    try {
      const restaurantId = req.params.id;
      
      const restaurant = await storage.getRestaurantById(restaurantId);
      if (!restaurant) throw errorHandler.notFound("Restaurant non trouvé");
      
      await db.delete(restaurants).where(eq(restaurants.id, restaurantId));
      
      res.json({ message: "Restaurant supprimé avec succès" });
    } catch (error) {
      errorHandler.sendError(res, error);
    }
  });
  
  app.post("/api/admin/drivers", authenticateAdmin, async (req: AuthRequest, res: Response) => {
    try {
      const data = validate(insertDriverSchema, req.body);
      if (!data) throw errorHandler.badRequest("Invalid driver data");
      
      const existing = await storage.getDriverByPhone(data.phone);
      if (existing) throw errorHandler.badRequest("Un livreur avec ce numéro existe déjà");
      
      const hashedPassword = await hashPassword(data.password);
      const driver = await storage.createDriver({ ...data, password: hashedPassword });
      res.status(201).json({ ...driver, password: undefined });
    } catch (error) {
      errorHandler.sendError(res, error);
    }
  });
  
  app.patch("/api/admin/drivers/:id", authenticateAdmin, async (req: AuthRequest, res: Response) => {
    try {
      const driverId = req.params.id;
      const { name, phone, password } = req.body;
      
      const driver = await storage.getDriverById(driverId);
      if (!driver) throw errorHandler.notFound("Livreur non trouvé");
      
      const updateData: any = {};
      if (name !== undefined) updateData.name = name;
      if (phone !== undefined) {
        // Vérifier que le nouveau numéro n'est pas déjà utilisé par un autre livreur
        const existing = await storage.getDriverByPhone(phone);
        if (existing && existing.id !== driverId) {
          throw errorHandler.badRequest("Un livreur avec ce numéro existe déjà");
        }
        updateData.phone = phone;
      }
      if (password !== undefined && password.trim() !== "") {
        updateData.password = await hashPassword(password);
      }
      
      const updated = await storage.updateDriver(driverId, updateData);
      res.json({ ...updated, password: undefined });
    } catch (error) {
      errorHandler.sendError(res, error);
    }
  });
  
  app.delete("/api/admin/drivers/:id", authenticateAdmin, async (req: AuthRequest, res: Response) => {
    try {
      const driverId = req.params.id;
      
      const driver = await storage.getDriverById(driverId);
      if (!driver) throw errorHandler.notFound("Livreur non trouvé");
      
      await db.delete(drivers).where(eq(drivers.id, driverId));
      
      res.json({ message: "Livreur supprimé avec succès" });
    } catch (error) {
      errorHandler.sendError(res, error);
    }
  });
  
  app.post("/api/admin/pizzas", authenticateAdmin, async (req: AuthRequest, res: Response) => {
    try {
      const { restaurantId, name, description, productType, category, imageUrl, available, prices } = req.body;
      
      console.log("[API] Création d'un produit avec les données:", { restaurantId, name, productType, category, prices });
      
      if (!restaurantId || !name || !category) {
        throw errorHandler.badRequest("restaurantId, name et category sont requis");
      }
      
      // Vérifier que le restaurant existe
      const restaurant = await storage.getRestaurantById(restaurantId);
      if (!restaurant) throw errorHandler.notFound("Restaurant non trouvé");
      
      const pizzaData = {
        restaurantId,
        name,
        description: description || null,
        productType: productType || "pizza",
        category,
        imageUrl: imageUrl || null,
        available: available !== false,
      };
      
      console.log("[API] Données du produit à créer:", pizzaData);
      const pizza = await storage.createPizza(pizzaData);
      console.log("[API] Produit créé:", pizza.id);
      
      // Créer les prix si fournis
      if (prices && Array.isArray(prices) && prices.length > 0) {
        console.log("[API] Création des prix:", prices);
        for (const price of prices) {
          if (price.size && price.price) {
            await storage.createPizzaPrice({
              pizzaId: pizza.id,
              size: price.size,
              price: price.price.toString(),
            });
          }
        }
      }
      
      const pizzaWithPrices = {
        ...pizza,
        prices: await storage.getPizzaPrices(pizza.id),
      };
      
      console.log("[API] Envoi de la réponse avec prix");
      res.status(201).json(pizzaWithPrices);
    } catch (error) {
      console.error("[API] Erreur lors de la création du produit:", error);
      errorHandler.sendError(res, error);
    }
  });
  
  app.patch("/api/admin/pizzas/:id", authenticateAdmin, async (req: AuthRequest, res: Response) => {
    try {
      const pizzaId = req.params.id;
      const { name, description, productType, category, imageUrl, available, prices } = req.body;
      
      const pizza = await storage.getPizzaById(pizzaId);
      if (!pizza) throw errorHandler.notFound("Produit non trouvé");
      
      const updateData: any = {};
      if (name !== undefined) updateData.name = name;
      if (description !== undefined) updateData.description = description || null;
      if (productType !== undefined) updateData.productType = productType;
      if (category !== undefined) updateData.category = category;
      if (imageUrl !== undefined) updateData.imageUrl = imageUrl || null;
      if (available !== undefined) updateData.available = available;
      
      const updated = await storage.updatePizza(pizzaId, updateData);
      
      // Mettre à jour les prix si fournis
      if (prices && Array.isArray(prices)) {
        // Supprimer les anciens prix
        await db.delete(pizzaPrices).where(eq(pizzaPrices.pizzaId, pizzaId));
        // Créer les nouveaux prix
        for (const price of prices) {
          if (price.size && price.price) {
            await storage.createPizzaPrice({
              pizzaId: updated.id,
              size: price.size,
              price: price.price.toString(),
            });
          }
        }
      }
      
      const pizzaWithPrices = {
        ...updated,
        prices: await storage.getPizzaPrices(updated.id),
      };
      
      res.json(pizzaWithPrices);
    } catch (error) {
      errorHandler.sendError(res, error);
    }
  });
  
  app.delete("/api/admin/pizzas/:id", authenticateAdmin, async (req: AuthRequest, res: Response) => {
    try {
      const pizzaId = req.params.id;
      
      const pizza = await storage.getPizzaById(pizzaId);
      if (!pizza) throw errorHandler.notFound("Produit non trouvé");
      
      await storage.deletePizza(pizzaId);
      
      res.json({ message: "Produit supprimé avec succès" });
    } catch (error) {
      errorHandler.sendError(res, error);
    }
  });
  
  // ============ RESTAURANT AUTH (OTP) ============
  
  app.post("/api/restaurant/login-otp", async (req: Request, res: Response) => {
    try {
      const { phone, code } = req.body as { phone?: string; code?: string };
      if (!phone) return res.status(400).json({ error: "Phone required" });
      
      if (code) {
        const isValid = await storage.verifyOtpCode(phone, code);
        if (!isValid) return res.status(403).json({ error: "Code OTP incorrect" });
      }
      
      const restaurant = await storage.getRestaurantByPhone(phone);
      if (!restaurant) return res.status(404).json({ error: "Restaurant non trouvé avec ce numéro" });
      
      const token = generateToken(restaurant.id, phone);
      res.json({ token, restaurant: { id: restaurant.id, name: restaurant.name, phone: restaurant.phone } });
    } catch (error) {
      console.error("[RESTAURANT] Login error:", error);
      res.status(500).json({ error: "Login failed" });
    }
  });
  
  // ============ RESTAURANT DASHBOARD ============
  
  app.get("/api/restaurant/orders", authenticateAdmin, async (req: AuthRequest, res: Response) => {
    try {
      const restaurantId = req.admin?.id;
      if (!restaurantId) throw errorHandler.unauthorized("Not authenticated");
      
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
      
      const restaurantId = req.admin?.id;
      if (!restaurantId) throw errorHandler.unauthorized("Not authenticated");
      
      const order = await storage.getOrderById(req.params.id);
      if (!order) throw errorHandler.notFound("Order not found");
      if (order.restaurantId !== restaurantId) throw errorHandler.forbidden("Order not for this restaurant");
      
      // Restaurant can only change status to: accepted, preparing, baking, ready, rejected
      const allowedStatuses = ["accepted", "preparing", "baking", "ready", "rejected"];
      if (!allowedStatuses.includes(status)) {
        throw errorHandler.badRequest("Invalid status for restaurant");
      }
      
      const updatedOrder = await storage.updateOrderStatus(req.params.id, status);
      res.json(updatedOrder);
    } catch (error) {
      errorHandler.sendError(res, error);
    }
  });
  
  // Toggle restaurant open/closed status
  app.patch("/api/restaurant/toggle-status", authenticateAdmin, async (req: AuthRequest, res: Response) => {
    try {
      const restaurantId = req.admin?.id;
      if (!restaurantId) throw errorHandler.unauthorized("Not authenticated");
      
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
      const restaurantId = req.admin?.id;
      if (!restaurantId) throw errorHandler.unauthorized("Not authenticated");
      
      const restaurant = await storage.getRestaurantById(restaurantId);
      if (!restaurant) throw errorHandler.notFound("Restaurant not found");
      
      res.json({ isOpen: restaurant.isOpen });
    } catch (error) {
      errorHandler.sendError(res, error);
    }
  });

  // ============ DRIVER AUTH (OTP) ============
  
  app.post("/api/driver/login-otp", async (req: Request, res: Response) => {
    try {
      const { phone, code } = req.body as { phone?: string; code?: string };
      if (!phone) return res.status(400).json({ error: "Phone required" });
      
      if (code) {
        const isValid = await storage.verifyOtpCode(phone, code);
        if (!isValid) return res.status(403).json({ error: "Code OTP incorrect" });
      }
      
      const driver = await storage.getDriverByPhone(phone);
      if (!driver) return res.status(404).json({ error: "Livreur non trouvé avec ce numéro" });
      
      const token = generateToken(driver.id, phone);
      res.json({ token, driver: { id: driver.id, name: driver.name, phone: driver.phone } });
    } catch (error) {
      console.error("[DRIVER] Login error:", error);
      res.status(500).json({ error: "Login failed" });
    }
  });
  
  // ============ DRIVER DASHBOARD ============
  
  // Get ready orders available for pickup (for all drivers)
  app.get("/api/driver/available-orders", authenticateAdmin, async (req: AuthRequest, res: Response) => {
    try {
      let readyOrders;
      try {
        readyOrders = await storage.getReadyOrders();
      } catch (err) {
        console.error("[DRIVER] Error fetching ready orders:", err);
        readyOrders = [];
      }
      
      if (!readyOrders || readyOrders.length === 0) {
        return res.json([]);
      }
      
      const restaurants = await storage.getAllRestaurants();
      const restaurantMap = new Map(restaurants.map(r => [r.id, r]));
      
      const ordersWithRestaurant = readyOrders.map(order => {
        // S'assurer que les coordonnées GPS sont bien converties en nombres
        const orderData = {
          ...order,
          restaurantName: restaurantMap.get(order.restaurantId!)?.name || "Restaurant",
          restaurantAddress: restaurantMap.get(order.restaurantId!)?.address || "",
          // Convertir les coordonnées GPS en nombres si elles sont des strings
          customerLat: order.customerLat ? (typeof order.customerLat === 'string' ? parseFloat(order.customerLat) : order.customerLat) : null,
          customerLng: order.customerLng ? (typeof order.customerLng === 'string' ? parseFloat(order.customerLng) : order.customerLng) : null,
        };
        console.log(`[API] Commande ${order.id} - Coordonnées GPS:`, {
          customerLat: orderData.customerLat,
          customerLng: orderData.customerLng,
          address: order.address,
        });
        return orderData;
      });
      
      res.json(ordersWithRestaurant);
    } catch (error) {
      errorHandler.sendError(res, error);
    }
  });
  
  // Get driver's own orders (accepted/in delivery)
  app.get("/api/driver/orders", authenticateAdmin, async (req: AuthRequest, res: Response) => {
    try {
      const driverId = req.admin?.id;
      if (!driverId) throw errorHandler.unauthorized("Not authenticated");
      
      const orders = await storage.getOrdersByDriver(driverId);
      const restaurants = await storage.getAllRestaurants();
      const restaurantMap = new Map(restaurants.map(r => [r.id, r]));
      
      const ordersWithRestaurant = orders.map(order => {
        // S'assurer que les coordonnées GPS sont bien converties en nombres
        const orderData = {
          ...order,
          restaurantName: restaurantMap.get(order.restaurantId!)?.name || "Restaurant",
          restaurantAddress: restaurantMap.get(order.restaurantId!)?.address || "",
          // Convertir les coordonnées GPS en nombres si elles sont des strings
          customerLat: order.customerLat ? (typeof order.customerLat === 'string' ? parseFloat(order.customerLat) : order.customerLat) : null,
          customerLng: order.customerLng ? (typeof order.customerLng === 'string' ? parseFloat(order.customerLng) : order.customerLng) : null,
        };
        return orderData;
      });
      
      res.json(ordersWithRestaurant);
    } catch (error) {
      errorHandler.sendError(res, error);
    }
  });
  
  // Driver accepts a ready order (atomic - first come first served)
  app.post("/api/driver/orders/:id/accept", authenticateAdmin, async (req: AuthRequest, res: Response) => {
    try {
      const driverId = req.admin?.id;
      if (!driverId) throw errorHandler.unauthorized("Not authenticated");
      
      const order = await storage.getOrderById(req.params.id);
      if (!order) throw errorHandler.notFound("Order not found");
      
      // Use atomic acceptance to prevent race conditions
      const acceptedOrder = await storage.acceptOrderByDriver(req.params.id, driverId);
      
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
      
      const driverId = req.admin?.id;
      if (!driverId) throw errorHandler.unauthorized("Not authenticated");
      
      const order = await storage.getOrderById(req.params.id);
      if (!order) throw errorHandler.notFound("Order not found");
      if (order.driverId !== driverId) throw errorHandler.forbidden("Order not assigned to you");
      
      // Driver can change to: delivery (when picking up) or delivered (when done)
      if (status !== "delivery" && status !== "delivered") {
        throw errorHandler.badRequest("Invalid status for driver");
      }
      
      const updatedOrder = await storage.updateOrderStatus(req.params.id, status);
      res.json(updatedOrder);
    } catch (error) {
      errorHandler.sendError(res, error);
    }
  });
  
  // Toggle driver online/offline status
  app.patch("/api/driver/toggle-status", authenticateAdmin, async (req: AuthRequest, res: Response) => {
    try {
      const driverId = req.admin?.id;
      if (!driverId) throw errorHandler.unauthorized("Not authenticated");
      
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
      const driverId = req.admin?.id;
      if (!driverId) throw errorHandler.unauthorized("Not authenticated");
      
      const driver = await storage.getDriverById(driverId);
      if (!driver) throw errorHandler.notFound("Driver not found");
      
      res.json({ status: driver.status });
    } catch (error) {
      errorHandler.sendError(res, error);
    }
  });

  return httpServer;
}
