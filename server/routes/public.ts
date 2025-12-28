import type { Express, Request, Response } from "express";
import { storage } from "../storage";
import { insertOrderSchema, type PizzaPrice } from "@shared/schema";
import { z } from "zod";
import { errorHandler } from "../errors";
import { notifyDriversOfNewOrder } from "../websocket";
import { sendN8nWebhook } from "../webhooks/n8n-webhook";
import { isRestaurantOpenNow, checkRestaurantStatus } from "../utils/restaurant-status";

// Helper functions
function validate<T>(schema: z.ZodSchema<T>, data: any): { success: true; data: T } | { success: false; error: z.ZodError } {
  const result = schema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, error: result.error };
}

function escapeHtml(text: string | null | undefined): string {
  if (!text) return '';
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return text.replace(/[&<>"']/g, m => map[m]);
}

export function registerPublicRoutes(app: Express): void {
  // ============ RESTAURANTS (PUBLIC) ============
  
  app.get("/api/restaurants", async (req, res) => {
    try {
      const restaurants = await storage.getAllRestaurants();
      
      // Enrichir avec le statut calculé côté serveur pour cohérence
      const restaurantsWithStatus = restaurants.map(restaurant => {
        const status = checkRestaurantStatus(restaurant);
        
        const normalized = {
          id: restaurant.id,
          name: restaurant.name,
          phone: restaurant.phone,
          address: restaurant.address,
          description: restaurant.description || null,
          imageUrl: restaurant.imageUrl || null,
          categories: Array.isArray(restaurant.categories) 
            ? restaurant.categories 
            : (typeof restaurant.categories === 'string' 
                ? (() => { try { return JSON.parse(restaurant.categories); } catch { return null; } })()
                : null),
          isOpen: Boolean(restaurant.isOpen),
          openingHours: restaurant.openingHours || null,
          deliveryTime: restaurant.deliveryTime || 30,
          minOrder: restaurant.minOrder || "0",
          rating: restaurant.rating || "4.5",
          createdAt: restaurant.createdAt,
          updatedAt: restaurant.updatedAt,
          computedStatus: status
        };
        
        return normalized;
      });
      
      res.json(restaurantsWithStatus);
    } catch (error) {
      console.error("[API] Erreur GET /api/restaurants:", error);
      res.status(500).json({ error: "Failed to fetch restaurants" });
    }
  });
  
  app.get("/api/restaurants/:id", async (req, res) => {
    try {
      const restaurant = await storage.getRestaurantById(req.params.id);
      if (!restaurant) return res.status(404).json({ error: "Restaurant not found" });
      
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
      if (process.env.NODE_ENV !== "production") {
        console.log(`[API] Récupération du menu pour le restaurant: ${restaurantId}`);
      }
      
      const pizzas = await storage.getPizzasByRestaurant(restaurantId);
      if (process.env.NODE_ENV !== "production") {
        console.log(`[API] ${pizzas.length} produits trouvés pour le restaurant ${restaurantId}`);
      }
      
      const pizzasWithPrices = await Promise.all(
        pizzas.map(async (pizza) => {
          const prices = await storage.getPizzaPrices(pizza.id);
          const productWithPrices = { ...pizza, prices };
          
          if (process.env.NODE_ENV !== "production") {
            const hasImage = !!(pizza.imageUrl && pizza.imageUrl.trim() !== '');
            if (hasImage) {
              console.log(`[API] ✅ Produit "${pizza.name}" - imageUrl: ${pizza.imageUrl}`);
            } else {
              console.log(`[API] ❌ Produit "${pizza.name}" - PAS D'IMAGE (imageUrl: ${pizza.imageUrl || 'null'})`);
            }
          }
          
          return productWithPrices;
        })
      );
      
      if (process.env.NODE_ENV !== "production") {
        const withImages = pizzasWithPrices.filter(p => p.imageUrl && p.imageUrl.trim() !== '').length;
        const withoutImages = pizzasWithPrices.filter(p => !p.imageUrl || p.imageUrl.trim() === '').length;
        
        console.log(`[API] ========================================`);
        console.log(`[API] 📊 MENU ENVOYÉ: ${pizzasWithPrices.length} produits`);
        console.log(`[API] ✅ Avec images: ${withImages}`);
        console.log(`[API] ❌ Sans images: ${withoutImages}`);
        console.log(`[API] ========================================`);
      }
      
      res.json(pizzasWithPrices);
    } catch (error) {
      console.error("[API] Erreur lors de la récupération du menu:", error);
      res.status(500).json({ error: "Failed to fetch menu" });
    }
  });
  
  // ============ PIZZAS (PUBLIC) ============
  
  app.get("/api/pizzas", async (req, res) => {
    try {
      const searchQuery = req.query.search as string | undefined;
      let allPizzas = await storage.getAllPizzas();
      
      if (searchQuery && searchQuery.trim().length > 0) {
        const query = searchQuery.toLowerCase();
        allPizzas = allPizzas.filter(pizza => 
          pizza.name.toLowerCase().includes(query) ||
          pizza.description?.toLowerCase().includes(query) ||
          pizza.category?.toLowerCase().includes(query)
        );
      }
      
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

  // ============ ORDERS (PUBLIC) ============
  
  app.post("/api/orders", async (req, res) => {
    console.log("[ORDER] POST /api/orders - Début création commande");
    try {
      const validation = validate(insertOrderSchema, req.body);
      if (!validation.success) {
        return res.status(400).json({ 
          error: "Invalid order data",
          details: process.env.NODE_ENV === "development" ? validation.error.errors : undefined
        });
      }
      const data = validation.data;
      
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
      const pizzaIds = Array.from(new Set(data.items.map(item => item.pizzaId)));
      const pizzas = await storage.getPizzasByIds(pizzaIds);
      const pizzaMap = new Map(pizzas.map(p => [p.id, p]));
      
      const prices = await storage.getPizzaPricesByPizzaIds(pizzaIds);
      const priceMap = new Map<string, PizzaPrice[]>();
      for (const price of prices) {
        if (!priceMap.has(price.pizzaId)) {
          priceMap.set(price.pizzaId, []);
        }
        priceMap.get(price.pizzaId)!.push(price);
      }
      
      let totalPrice = 0;
      const orderItemsDetails: Array<{ name: string; size: string; quantity: number }> = [];
      
      for (const item of data.items) {
        const pizza = pizzaMap.get(item.pizzaId);
        if (!pizza) return res.status(404).json({ error: `Pizza ${item.pizzaId} not found` });
        if (pizza.restaurantId !== data.restaurantId) {
          return res.status(400).json({ error: "All pizzas must be from the same restaurant" });
        }
        
        const pizzaPrices = priceMap.get(item.pizzaId) || [];
        const sizePrice = pizzaPrices.find((p: any) => p.size === item.size);
        if (!sizePrice) return res.status(400).json({ error: `Invalid size for pizza ${pizza.name}` });
        totalPrice += Number(sizePrice.price) * item.quantity;
        
        orderItemsDetails.push({
          name: pizza.name,
          size: item.size,
          quantity: item.quantity,
        });
      }
      
      const deliveryFee = 2.0;
      totalPrice += deliveryFee;
      
      let FORCE_RESTAURANT_READY = process.env.FORCE_RESTAURANT_READY === 'true';
      const isProduction = process.env.NODE_ENV === 'production';
      
      if (isProduction && FORCE_RESTAURANT_READY) {
        console.error("[ORDER] ⚠️ FORCE_RESTAURANT_READY désactivé automatiquement en production");
        FORCE_RESTAURANT_READY = false;
      }
      
      const initialStatus = FORCE_RESTAURANT_READY ? "ready" : "accepted";
      
      if (FORCE_RESTAURANT_READY && process.env.NODE_ENV !== "production") {
        console.log("[ORDER] ⚠️ FORCE_RESTAURANT_READY activé - Commande forcée à READY");
      }
      
      if (process.env.NODE_ENV !== "production") {
        console.log("[ORDER] Création commande avec coordonnées GPS:", {
          customerLat: data.customerLat,
          customerLng: data.customerLng,
          address: data.address,
          status: initialStatus,
        });
      }
      
      const orderItemsData = data.items.map(item => {
        const pizzaPrices = priceMap.get(item.pizzaId) || [];
        const sizePrice = pizzaPrices.find((p: any) => p.size === item.size);
        if (!sizePrice) {
          throw new Error(`Price not found for pizza ${item.pizzaId} size ${item.size}`);
        }
        return {
          pizzaId: item.pizzaId,
          size: item.size,
          quantity: item.quantity,
          pricePerUnit: sizePrice.price,
        };
      });
      
      const order = await storage.createOrderWithItems(
        {
          restaurantId: data.restaurantId,
          customerName: data.customerName,
          phone: data.phone,
          address: data.address,
          addressDetails: data.addressDetails,
          customerLat: data.customerLat?.toString(),
          customerLng: data.customerLng?.toString(),
          clientOrderId: data.clientOrderId || null,
          totalPrice: totalPrice.toString(),
          status: initialStatus,
        },
        orderItemsData,
        {
          phone: data.phone,
          restaurantId: data.restaurantId,
          totalPrice: totalPrice.toString(),
          withinSeconds: 10
        }
      );
      
      if (!order) {
        let duplicateOrder: any;
        
        if (data.clientOrderId) {
          duplicateOrder = await storage.getOrderByClientOrderId(data.clientOrderId);
        }
        
        if (!duplicateOrder) {
          duplicateOrder = await storage.getRecentDuplicateOrder(
            data.phone,
            data.restaurantId,
            totalPrice.toString(),
            10
          );
        }
        
        if (duplicateOrder) {
          if (process.env.NODE_ENV !== "production") {
            console.log(`[ORDER] Duplicate order detected, returning existing order: ${duplicateOrder.id}`);
          }
          return res.status(200).json({ 
            orderId: duplicateOrder.id, 
            totalPrice: Number(duplicateOrder.totalPrice),
            duplicate: true 
          });
        } else {
          return res.status(409).json({ 
            error: "A duplicate order was detected but could not be retrieved. Please try again." 
          });
        }
      }
      
      if (!order) {
        return res.status(500).json({ error: "Failed to create order" });
      }
      
      if (process.env.NODE_ENV !== "production") {
        console.log("[ORDER] Commande créée:", {
          id: order.id,
          customerLat: order.customerLat,
          customerLng: order.customerLng,
        });
      }
      
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
      }
      
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
        if (process.env.NODE_ENV !== "production") {
          console.log(`[ORDER] Webhook n8n envoyé pour commande ${order.id}`);
        }
      } catch (webhookError) {
        console.error("[ORDER] Erreur webhook n8n:", webhookError);
      }
      
      res.status(201).json({ orderId: order.id, totalPrice });
    } catch (error: any) {
      console.error("[ORDER] Error creating order:", error);
      console.error("[ORDER] Error details:", {
        message: error?.message,
        stack: error?.stack,
        body: process.env.NODE_ENV !== "production" ? req.body : undefined,
      });
      errorHandler.sendError(res, error);
    }
  });

  app.get("/api/orders/:id/invoice", async (req, res) => {
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
      
      let restaurantName = "Restaurant";
      let restaurantAddress = "";
      if (order.restaurantId) {
        const restaurant = await storage.getRestaurantById(order.restaurantId);
        if (restaurant) {
          restaurantName = restaurant.name;
          restaurantAddress = restaurant.address || "";
        }
      }

      const invoiceHTML = `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Facture ${escapeHtml(order.id.slice(0, 8))}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      padding: 20px 10px;
      background: #f5f5f5;
      color: #333;
    }
    .invoice {
      max-width: 800px;
      margin: 0 auto;
      background: white;
      padding: 20px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
    }
    .header {
      border-bottom: 3px solid #f97316;
      padding-bottom: 15px;
      margin-bottom: 20px;
    }
    .header h1 {
      color: #f97316;
      font-size: 24px;
      margin-bottom: 8px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 20px 0;
    }
    th, td {
      padding: 12px;
      text-align: left;
      border-bottom: 1px solid #eee;
    }
    th {
      background: #f97316;
      color: white;
    }
    .total-row {
      font-weight: bold;
      background: #f5f5f5;
    }
    .footer {
      margin-top: 30px;
      text-align: center;
      color: #666;
    }
  </style>
</head>
<body>
  <div class="invoice">
    <div class="header">
      <h1>Tataouine Pizza</h1>
      <p>${escapeHtml(restaurantName)}</p>
      <p>${escapeHtml(restaurantAddress)}</p>
    </div>
    
    <table>
      <thead>
        <tr>
          <th>Article</th>
          <th>Taille</th>
          <th>Quantité</th>
          <th>Prix unitaire</th>
          <th>Total</th>
        </tr>
      </thead>
      <tbody>
        ${itemsWithDetails.map(item => `
          <tr>
            <td>${escapeHtml(item.pizza?.name || `Pizza ${item.pizzaId}`)}</td>
            <td>${item.size === 'small' ? 'Petite' : item.size === 'medium' ? 'Moyenne' : 'Grande'}</td>
            <td>${item.quantity}</td>
            <td>${Number(item.pricePerUnit).toFixed(2)} TND</td>
            <td>${(Number(item.pricePerUnit) * item.quantity).toFixed(2)} TND</td>
          </tr>
        `).join('')}
        <tr class="total-row">
          <td colspan="4" style="text-align: right;">TOTAL</td>
          <td>${Number(order.totalPrice).toFixed(2)} TND</td>
        </tr>
      </tbody>
    </table>
    
    <div class="footer">
      <p>Merci pour votre commande !</p>
      <p>Tataouine Pizza - L'authentique goût du désert</p>
    </div>
  </div>
</body>
</html>
      `;

      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      const forceDownload = req.query.download === 'true';
      res.setHeader('Content-Disposition', `${forceDownload ? 'attachment' : 'inline'}; filename="facture-${order.id.slice(0, 8)}.html"`);
      res.send(invoiceHTML);
    } catch (error) {
      console.error("[INVOICE] Error:", error);
      res.status(500).json({ error: "Failed to generate invoice" });
    }
  });

  app.get("/api/orders/customer/:phone", async (req, res) => {
    console.log(`[ORDERS] GET /api/orders/customer/:phone - Téléphone: ${req.params.phone}`);
    try {
      const phone = req.params.phone;
      
      // Validation basique du numéro de téléphone
      if (!phone || phone.length < 8) {
        return res.status(400).json({ 
          error: "Invalid phone number",
          details: "Phone number must be at least 8 characters"
        });
      }
      
      const orders = await storage.getOrdersByPhone(phone);
      if (process.env.NODE_ENV !== "production") {
        console.log(`[ORDERS] ${orders.length} commande(s) trouvée(s) pour ${phone}`);
      }
      res.json(orders);
    } catch (error: any) {
      console.error("[ORDERS] Error fetching orders by phone:", error);
      console.error("[ORDERS] Error details:", {
        message: error?.message,
        stack: error?.stack,
        phone: req.params.phone,
      });
      errorHandler.sendError(res, error);
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
          return { ...item, pizza: pizza || null };
        })
      );
      
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
      
      if (order.driverId) {
        const driver = await storage.getDriverById(order.driverId);
        if (driver) {
          enrichedOrder = {
            ...enrichedOrder,
            driverName: driver.name,
            driverPhone: driver.phone,
          };
        }
      }
      
      res.json(enrichedOrder);
    } catch (error: any) {
      console.error("[ORDERS] Error fetching order by id:", error);
      errorHandler.sendError(res, error);
    }
  });
}

