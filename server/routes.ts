import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertPizzaSchema, insertOrderSchema, verifyOtpSchema, sendOtpSchema, updateOrderStatusSchema, insertAdminUserSchema, insertDriverSchema, driverLoginSchema } from "@shared/schema";
import { z } from "zod";
import { authenticateAdmin, generateToken, hashPassword, comparePassword, type AuthRequest } from "./auth";

declare global {
  namespace Express {
    interface Request {
      admin?: { id: string; email: string };
    }
  }
}

// Helper: Generate random 4-digit OTP
function generateOtp(): string {
  return Math.floor(1000 + Math.random() * 9000).toString();
}

// Helper: Validate requests
function validate<T>(schema: z.ZodSchema, data: any): T | null {
  try {
    return schema.parse(data);
  } catch (error) {
    return null;
  }
}

// Demo pizzas seed data
const DEMO_PIZZAS = [
  {
    name: "Margherita",
    description: "Sauce tomate, mozzarella di bufala, basilic frais, huile d'olive extra vierge.",
    category: "classic",
    imageUrl: null,
    available: true,
  },
  {
    name: "La Tunisienne",
    description: "Thon, olives noires, œuf, harissa artisanale, fromage, persil.",
    category: "special",
    imageUrl: null,
    available: true,
  },
  {
    name: "Pepperoni",
    description: "Double pepperoni piquant, mozzarella fondante, origan.",
    category: "classic",
    imageUrl: null,
    available: true,
  },
  {
    name: "Vegetarian",
    description: "Poivrons, oignons rouges, champignons frais, olives, tomates cerises.",
    category: "vegetarian",
    imageUrl: null,
    available: true,
  },
  {
    name: "Tataouine Spéciale",
    description: "Merguez, poivrons grillés, œuf, olives, sauce tomate épicée.",
    category: "special",
    imageUrl: null,
    available: true,
  },
  {
    name: "4 Fromages",
    description: "Mozzarella, Gorgonzola, Parmesan, Chèvre, miel (optionnel).",
    category: "classic",
    imageUrl: null,
    available: true,
  },
];

let seeded = false;
let driverSeeded = false;

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  
  // Seed demo drivers on startup
  if (!driverSeeded) {
    try {
      const existingDrivers = await storage.getAllDrivers();
      if (existingDrivers.length === 0) {
        console.log("[DB] Seeding database with demo drivers...");
        const demoDrivers = [
          { name: "Mohamed", phone: "21612345678", password: await hashPassword("driver123") },
          { name: "Ahmed", phone: "21698765432", password: await hashPassword("driver123") },
          { name: "Fatima", phone: "21625874123", password: await hashPassword("driver123") },
        ];
        for (const driver of demoDrivers) {
          await storage.createDriver(driver);
        }
      }
      driverSeeded = true;
    } catch (e) {
      console.error("[DB] Error seeding drivers:", e);
    }
  }
  
  // ============ PIZZAS (PUBLIC) ============
  
  // Get all pizzas
  app.get("/api/pizzas", async (req, res) => {
    try {
      let allPizzas = await storage.getAllPizzas();
      
      // Auto-seed if empty
      if (allPizzas.length === 0 && !seeded) {
        console.log("[DB] Seeding database with demo pizzas...");
        for (const pizza of DEMO_PIZZAS) {
          const created = await storage.createPizza(pizza);
          for (const [size, price] of [["small", "10"], ["medium", "15"], ["large", "18"]]) {
            await storage.createPizzaPrice({
              pizzaId: created.id,
              size,
              price,
            });
          }
        }
        seeded = true;
        allPizzas = await storage.getAllPizzas();
      }
      
      const pizzasWithPrices = await Promise.all(
        allPizzas.map(async (pizza) => ({
          ...pizza,
          prices: await storage.getPizzaPrices(pizza.id),
        }))
      );
      res.json(pizzasWithPrices);
    } catch (error) {
      console.error("[ERROR] Failed to fetch pizzas:", error);
      res.status(500).json({ error: "Failed to fetch pizzas" });
    }
  });

  // Get single pizza
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

  // ============ OTP & VERIFICATION ============

  // Send OTP
  app.post("/api/otp/send", async (req: Request, res: Response) => {
    try {
      const data = validate(sendOtpSchema, req.body);
      if (!data) return res.status(400).json({ error: "Invalid phone number" });

      const code = generateOtp();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

      // TODO: Send SMS via Twilio or local provider
      console.log(`[SMS] OTP ${code} sent to ${data.phone}`);

      await storage.createOtpCode(data.phone, code, expiresAt);
      res.json({ success: true, message: "OTP sent", code }); // Remove code in production
    } catch (error) {
      res.status(500).json({ error: "Failed to send OTP" });
    }
  });

  // Verify OTP
  app.post("/api/otp/verify", async (req: Request, res: Response) => {
    try {
      const data = validate(verifyOtpSchema, req.body);
      if (!data) return res.status(400).json({ error: "Invalid data" });

      // Demo code for testing - mark as verified in DB
      if (data.code === "1234") {
        const otpRecord = await storage.getLatestOtpCode(data.phone);
        if (otpRecord) {
          // Mark OTP as verified by calling verifyOtpCode (it checks for 1234 match won't work, so just mark directly)
          // Actually, let's create a new OTP with verified status for demo
          await storage.createOtpCode(data.phone, "1234", new Date(Date.now() + 10 * 60 * 1000));
          // Now verify it
          await storage.verifyOtpCode(data.phone, "1234");
        }
        res.json({ success: true, verified: true });
        return;
      }

      const verified = await storage.verifyOtpCode(data.phone, data.code);
      if (!verified) return res.status(401).json({ error: "Invalid or expired code" });

      res.json({ success: true, verified: true });
    } catch (error) {
      res.status(500).json({ error: "Verification failed" });
    }
  });

  // ============ ORDERS ============

  // Create order
  app.post("/api/orders", async (req: Request, res: Response) => {
    try {
      const data = validate(insertOrderSchema, req.body);
      if (!data) return res.status(400).json({ error: "Invalid order data" });

      // Verify OTP first (allow demo code 1234 or verified OTP)
      const otpRecord = await storage.getLatestOtpCode(data.phone);
      const isDemoCode = otpRecord?.code === "1234" || otpRecord?.verified;
      if (!isDemoCode && !otpRecord?.verified) {
        return res.status(403).json({ error: "Phone not verified. Please verify OTP first." });
      }

      // Calculate total price
      let totalPrice = 0;
      const itemsData = [];

      for (const item of data.items) {
        const pizza = await storage.getPizzaById(item.pizzaId);
        if (!pizza) return res.status(404).json({ error: `Pizza ${item.pizzaId} not found` });

        const prices = await storage.getPizzaPrices(item.pizzaId);
        const priceData = prices.find(p => p.size === item.size);
        if (!priceData) return res.status(404).json({ error: `Size ${item.size} not available` });

        const itemTotal = parseFloat(priceData.price) * item.quantity;
        totalPrice += itemTotal;
        itemsData.push({ ...item, pricePerUnit: priceData.price });
      }

      // Create order (don't pass status, let DB use default)
      let order;
      try {
        order = await storage.createOrder({
          customerName: data.customerName,
          phone: data.phone,
          address: data.address,
          addressDetails: data.addressDetails || "",
          totalPrice: totalPrice.toFixed(2),
          paymentMethod: "cash",
          estimatedDeliveryTime: 45,
        });
      } catch (dbError: any) {
        console.error("[DB ERROR] Failed to create order:", dbError.message || dbError);
        return res.status(500).json({ error: "Database error: " + (dbError.message || "Unknown error") });
      }

      if (!order || !order.id) {
        console.error("[ERROR] Order created but missing ID:", order);
        return res.status(500).json({ error: "Failed to save order to database" });
      }

      // Create order items
      for (const item of itemsData) {
        await storage.createOrderItem({
          orderId: order.id,
          pizzaId: item.pizzaId,
          size: item.size,
          quantity: item.quantity,
          pricePerUnit: item.pricePerUnit,
        });
      }

      res.status(201).json({ success: true, orderId: order.id, totalPrice });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to create order" });
    }
  });

  // Get order by ID
  app.get("/api/orders/:id", async (req: Request, res: Response) => {
    try {
      const order = await storage.getOrderById(req.params.id);
      if (!order) return res.status(404).json({ error: "Order not found" });
      
      const items = await storage.getOrderItems(order.id);
      res.json({ ...order, items });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch order" });
    }
  });

  // Get orders by phone
  app.get("/api/orders/customer/:phone", async (req: Request, res: Response) => {
    try {
      const orders = await storage.getOrdersByPhone(req.params.phone);
      res.json(orders);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch orders" });
    }
  });

  // ============ ADMIN AUTH ============

  // Demo admin credentials (use for testing)
  const DEMO_ADMIN_EMAIL = "admin@pizzatataouine.tn";
  const DEMO_ADMIN_PASSWORD = "pizzatataouine123";
  let demoAdminHashed = "";

  // Initialize demo admin hash on startup
  hashPassword(DEMO_ADMIN_PASSWORD).then(hash => {
    demoAdminHashed = hash;
  });

  // Admin: Register (create first admin only in dev)
  app.post("/api/admin/register", async (req: Request, res: Response) => {
    try {
      const { email, password } = req.body as { email?: string; password?: string };
      if (!email || !password) return res.status(400).json({ error: "Email and password required" });
      if (password.length < 6) return res.status(400).json({ error: "Password must be at least 6 characters" });

      // For demo, accept the demo admin credentials
      if (email === DEMO_ADMIN_EMAIL && password === DEMO_ADMIN_PASSWORD) {
        const token = generateToken("demo-admin-id", email);
        res.status(201).json({ token, admin: { id: "demo-admin-id", email } });
        return;
      }

      // For other admins, reject for now (DB issue)
      res.status(400).json({ error: "Demo mode: Use admin@pizzatataouine.tn / pizzatataouine123" });
    } catch (error: any) {
      console.error("[ADMIN] Registration error:", error);
      res.status(500).json({ error: "Registration failed" });
    }
  });

  // Admin: Login
  app.post("/api/admin/login", async (req: Request, res: Response) => {
    try {
      const { email, password } = req.body as { email?: string; password?: string };
      if (!email || !password) return res.status(400).json({ error: "Email and password required" });

      // Demo admin login
      if (email === DEMO_ADMIN_EMAIL && password === DEMO_ADMIN_PASSWORD) {
        const token = generateToken("demo-admin-id", email);
        res.json({ token, admin: { id: "demo-admin-id", email } });
        return;
      }

      res.status(401).json({ error: "Invalid credentials" });
    } catch (error) {
      console.error("[ADMIN] Login error:", error);
      res.status(500).json({ error: "Login failed" });
    }
  });

  // ============ ADMIN ROUTES (Protected) ============

  // Admin: Get all orders
  app.get("/api/admin/orders", authenticateAdmin, async (req: AuthRequest, res: Response) => {
    try {
      const allOrders = await storage.getAllOrders();
      res.json(allOrders);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch orders" });
    }
  });

  // Admin: Update order status
  app.patch("/api/admin/orders/:id/status", authenticateAdmin, async (req: AuthRequest, res: Response) => {
    try {
      const data = validate(updateOrderStatusSchema, req.body);
      if (!data) return res.status(400).json({ error: "Invalid status" });

      const order = await storage.updateOrderStatus(req.params.id, data.status);
      res.json(order);
    } catch (error) {
      res.status(500).json({ error: "Failed to update order" });
    }
  });

  // Admin: Create pizza
  app.post("/api/admin/pizzas", authenticateAdmin, async (req: AuthRequest, res: Response) => {
    try {
      const data = validate(insertPizzaSchema, req.body);
      if (!data) return res.status(400).json({ error: "Invalid pizza data" });

      const pizza = await storage.createPizza(data);
      res.status(201).json(pizza);
    } catch (error) {
      res.status(500).json({ error: "Failed to create pizza" });
    }
  });

  // Admin: Update pizza
  app.patch("/api/admin/pizzas/:id", authenticateAdmin, async (req: AuthRequest, res: Response) => {
    try {
      const pizza = await storage.updatePizza(req.params.id, req.body);
      res.json(pizza);
    } catch (error) {
      res.status(500).json({ error: "Failed to update pizza" });
    }
  });

  // Admin: Delete pizza
  app.delete("/api/admin/pizzas/:id", authenticateAdmin, async (req: AuthRequest, res: Response) => {
    try {
      await storage.deletePizza(req.params.id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete pizza" });
    }
  });

  // Admin: Get all drivers
  app.get("/api/admin/drivers", authenticateAdmin, async (req: AuthRequest, res: Response) => {
    try {
      const drivers = await storage.getAllDrivers();
      res.json(drivers);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch drivers" });
    }
  });

  // Admin: Assign order to driver
  app.post("/api/admin/assign-order/:id", authenticateAdmin, async (req: AuthRequest, res: Response) => {
    try {
      const { driverId } = req.body as { driverId?: string };
      if (!driverId) return res.status(400).json({ error: "Driver ID required" });

      const order = await storage.assignOrderToDriver(req.params.id, driverId);
      res.json(order);
    } catch (error) {
      res.status(500).json({ error: "Failed to assign order" });
    }
  });

  // ============ DRIVER AUTH ============

  const DEMO_DRIVER_PHONE = "21612345678";
  const DEMO_DRIVER_PASSWORD = "driver123";

  // Driver: Login
  app.post("/api/driver/login", async (req: Request, res: Response) => {
    try {
      const data = validate(driverLoginSchema, req.body);
      if (!data) return res.status(400).json({ error: "Invalid phone or password" });

      // Demo driver login
      if (data.phone === DEMO_DRIVER_PHONE && data.password === DEMO_DRIVER_PASSWORD) {
        const token = generateToken("demo-driver-id", data.phone);
        res.json({ token, driver: { id: "demo-driver-id", name: "Mohamed", phone: data.phone } });
        return;
      }

      res.status(401).json({ error: "Invalid credentials" });
    } catch (error) {
      console.error("[DRIVER] Login error:", error);
      res.status(500).json({ error: "Login failed" });
    }
  });

  // Driver: Get assigned orders
  app.get("/api/driver/orders", authenticateAdmin, async (req: AuthRequest, res: Response) => {
    try {
      const driverId = req.admin?.id;
      if (!driverId) return res.status(401).json({ error: "Unauthorized" });

      const orders = await storage.getOrdersByDriver(driverId);
      res.json(orders);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch orders" });
    }
  });

  // Driver: Update status
  app.patch("/api/driver/status", authenticateAdmin, async (req: AuthRequest, res: Response) => {
    try {
      const { status } = req.body as { status?: string };
      if (!status) return res.status(400).json({ error: "Status required" });

      const driverId = req.admin?.id;
      if (!driverId) return res.status(401).json({ error: "Unauthorized" });

      const driver = await storage.updateDriverStatus(driverId, status);
      res.json(driver);
    } catch (error) {
      res.status(500).json({ error: "Failed to update status" });
    }
  });

  // Driver: Update order status (delivery -> delivered)
  app.patch("/api/driver/orders/:id/status", authenticateAdmin, async (req: AuthRequest, res: Response) => {
    try {
      const { status } = req.body as { status?: string };
      if (!status) return res.status(400).json({ error: "Status required" });

      const order = await storage.updateOrderStatus(req.params.id, status);
      res.json(order);
    } catch (error) {
      res.status(500).json({ error: "Failed to update order" });
    }
  });

  return httpServer;
}
