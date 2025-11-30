import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertPizzaSchema, insertOrderSchema, verifyOtpSchema, sendOtpSchema, updateOrderStatusSchema, insertAdminUserSchema } from "@shared/schema";
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

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  
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

      // Create order
      let order;
      try {
        order = await storage.createOrder({
          customerName: data.customerName,
          phone: data.phone,
          address: data.address,
          addressDetails: data.addressDetails || "",
          totalPrice: totalPrice.toFixed(2),
          paymentMethod: "cash",
          status: "pending",
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

  // Admin: Register (create first admin only in dev)
  app.post("/api/admin/register", async (req: Request, res: Response) => {
    try {
      const data = validate(insertAdminUserSchema, req.body);
      if (!data) return res.status(400).json({ error: "Invalid email or password" });

      const existing = await storage.getAdminByEmail(data.email);
      if (existing) return res.status(400).json({ error: "Admin already exists" });

      const hashed = await hashPassword(data.password);
      const admin = await storage.createAdminUser({ email: data.email, password: hashed });
      const token = generateToken(admin.id, admin.email);

      res.status(201).json({ token, admin: { id: admin.id, email: admin.email } });
    } catch (error) {
      res.status(500).json({ error: "Registration failed" });
    }
  });

  // Admin: Login
  app.post("/api/admin/login", async (req: Request, res: Response) => {
    try {
      const { email, password } = req.body as { email?: string; password?: string };
      if (!email || !password) return res.status(400).json({ error: "Email and password required" });

      const admin = await storage.getAdminByEmail(email);
      if (!admin) return res.status(401).json({ error: "Invalid credentials" });

      const valid = await comparePassword(password, admin.password);
      if (!valid) return res.status(401).json({ error: "Invalid credentials" });

      const token = generateToken(admin.id, admin.email);
      res.json({ token, admin: { id: admin.id, email: admin.email } });
    } catch (error) {
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

  return httpServer;
}
