/**
 * Routes CRUD pour l'administration
 * Centralise toutes les routes de gestion des commandes, restaurants, drivers et pizzas
 */

import type { Express, Response } from "express";
import { storage } from "../storage";
import { 
  updateOrderStatusSchema, 
  insertDriverSchema, 
  insertRestaurantSchema,
  insertPizzaSchema,
  insertPizzaPriceSchema,
  updateRestaurantSchema,
  updateDriverSchema,
  updatePizzaSchema,
  assignDriverSchema,
  insertOrderSchema
} from "@shared/schema";
import { authenticateAdmin, hashPassword, type AuthRequest } from "../auth";
import { errorHandler } from "../errors";
import { getAuthenticatedAdminId } from "../middleware/auth-helpers";
import { OrderService } from "../services/order-service";
import { notifyDriversOfNewOrder } from "../websocket";
import { sendN8nWebhook } from "../webhooks/n8n-webhook";
import { z } from "zod";

// Fonction validate améliorée qui retourne les erreurs Zod
function validate<T>(schema: z.ZodSchema<T>, data: any): { success: true; data: T } | { success: false; error: z.ZodError } {
  const result = schema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, error: result.error };
}

/**
 * Enregistre toutes les routes CRUD admin
 */
export function registerAdminCrudRoutes(app: Express): void {
  // ============ ADMIN ORDERS ============
  
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
      const validation = validate(updateOrderStatusSchema, req.body);
      if (!validation.success) {
        throw errorHandler.badRequest(
          validation.error.errors.map(e => e.message).join(", ")
        );
      }
      const { status } = validation.data;
      
      const adminId = getAuthenticatedAdminId(req);
      
      const updatedOrder = await OrderService.updateStatus(
        req.params.id,
        status,
        { type: "admin", id: adminId }
      );
      res.json(updatedOrder);
    } catch (error) {
      errorHandler.sendError(res, error);
    }
  });
  
  app.patch("/api/admin/orders/:id/driver", authenticateAdmin, async (req: AuthRequest, res: Response) => {
    try {
      const validation = validate(assignDriverSchema, req.body);
      if (!validation.success) {
        throw errorHandler.badRequest(
          validation.error.errors.map(e => e.message).join(", ")
        );
      }
      const { driverId } = validation.data;
      
      const order = await storage.getOrderById(req.params.id);
      if (!order) throw errorHandler.notFound("Order not found");
      
      const updatedOrder = await storage.assignOrderToDriver(req.params.id, driverId);
      res.json(updatedOrder);
    } catch (error) {
      errorHandler.sendError(res, error);
    }
  });

  // Créer une commande manuellement (pour commandes par téléphone)
  app.post("/api/admin/orders", authenticateAdmin, async (req: AuthRequest, res: Response) => {
    console.log("[ADMIN ORDER] 📞 Création commande manuelle par admin");
    console.log("[ADMIN ORDER] 📦 Données reçues:", JSON.stringify(req.body, null, 2));
    try {
      const validation = validate(insertOrderSchema, req.body);
      if (!validation.success) {
        console.error("[ADMIN ORDER] ❌ Erreur validation:", validation.error.errors);
        return res.status(400).json({ 
          error: "Invalid order data",
          details: validation.error.errors.map(e => ({
            path: e.path.join('.'),
            message: e.message
          }))
        });
      }
      const data = validation.data;
      
      // Verify restaurant exists
      const restaurant = await storage.getRestaurantById(data.restaurantId);
      if (!restaurant) return res.status(404).json({ error: "Restaurant not found" });
      
      // Gérer les commandes spéciales (sans items) ou normales (avec items)
      const isSpecialOrder = data.items.length === 0;
      
      let totalPrice = 0;
      const orderItemsDetails: Array<{ name: string; size: string; quantity: number }> = [];
      const orderItemsData: Array<{ pizzaId: string; size: string; quantity: number; pricePerUnit: string }> = [];
      
      if (!isSpecialOrder) {
        // Calculate total price and validate pizzas belong to restaurant
        const pizzaIds = Array.from(new Set(data.items.map(item => item.pizzaId)));
        const pizzas = await storage.getPizzasByIds(pizzaIds);
        const pizzaMap = new Map(pizzas.map(p => [p.id, p]));
        
        const prices = await storage.getPizzaPricesByPizzaIds(pizzaIds);
        const priceMap = new Map<string, typeof prices>();
        for (const price of prices) {
          if (!priceMap.has(price.pizzaId)) {
            priceMap.set(price.pizzaId, []);
          }
          priceMap.get(price.pizzaId)!.push(price);
        }
        
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
          
          orderItemsData.push({
            pizzaId: item.pizzaId,
            size: item.size,
            quantity: item.quantity,
            pricePerUnit: sizePrice.price,
          });
        }
      }
      
      // Calculer les frais de livraison dynamiques basés sur la distance GPS
      const { calculateDeliveryFeeFromCoords, type Coordinates } = require("@shared/distance-utils");
      const restaurantCoords: Coordinates | null = restaurant.lat && restaurant.lng
        ? { lat: Number(restaurant.lat), lng: Number(restaurant.lng) }
        : null;
      
      const customerCoords: Coordinates | null = data.customerLat && data.customerLng
        ? { lat: Number(data.customerLat), lng: Number(data.customerLng) }
        : null;
      
      const deliveryFee = calculateDeliveryFeeFromCoords(restaurantCoords, customerCoords);
      console.log(`[ADMIN ORDER] 📍 Calcul frais de livraison:`);
      console.log(`[ADMIN ORDER]    Restaurant: ${restaurant.name} (${restaurantCoords ? `${restaurantCoords.lat}, ${restaurantCoords.lng}` : 'pas de coordonnées'})`);
      console.log(`[ADMIN ORDER]    Client: ${customerCoords ? `${customerCoords.lat}, ${customerCoords.lng}` : 'pas de coordonnées'}`);
      console.log(`[ADMIN ORDER]    Frais calculés: ${deliveryFee} TND`);
      
      // Pour les commandes spéciales, appliquer uniquement les frais de livraison
      // Pour les commandes normales, ajouter les frais de livraison
      totalPrice += deliveryFee;
      
      // Status initial pour commande manuelle : "accepted" (prête pour le restaurant)
      const initialStatus = "accepted";
      
      const order = await storage.createOrderWithItems(
        {
          restaurantId: data.restaurantId,
          customerName: data.customerName,
          phone: data.phone,
          address: data.address,
          addressDetails: data.addressDetails,
          customerLat: data.customerLat?.toString(),
          customerLng: data.customerLng?.toString(),
          clientOrderId: null, // Pas de clientOrderId pour commandes manuelles
          totalPrice: totalPrice.toString(),
          status: initialStatus,
          paymentMethod: data.paymentMethod || "cash",
          notes: data.notes || null,
        },
        orderItemsData,
        undefined // Pas de vérification de doublon pour commandes manuelles
      );
      
      if (!order) {
        return res.status(500).json({ error: "Failed to create order" });
      }
      
      console.log("[ADMIN ORDER] ✅ Commande créée:", order.id);
      
      // Notifier les livreurs (comme pour une commande normale)
      try {
        console.log("[ADMIN ORDER] 📞 Notification livreurs pour commande:", order.id);
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
        console.log("[ADMIN ORDER] ✅ Notifications envoyées");
      } catch (wsError) {
        console.error("[ADMIN ORDER] ❌ Erreur notification WebSocket:", wsError);
      }
      
      // Envoyer webhook n8n
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
          createdBy: "admin", // Indiquer que c'est une commande manuelle
        });
      } catch (webhookError) {
        console.error("[ADMIN ORDER] Erreur webhook n8n:", webhookError);
      }
      
      res.status(201).json({ orderId: order.id, totalPrice });
    } catch (error: any) {
      console.error("[ADMIN ORDER] Error creating order:", error);
      errorHandler.sendError(res, error);
    }
  });
  
  // ============ ADMIN DRIVERS ============
  
  app.get("/api/admin/drivers", authenticateAdmin, async (req: AuthRequest, res: Response) => {
    try {
      const drivers = await storage.getAllDrivers();
      res.json(drivers);
    } catch (error) {
      errorHandler.sendError(res, error);
    }
  });
  
  app.post("/api/admin/drivers", authenticateAdmin, async (req: AuthRequest, res: Response) => {
    try {
      const validation = validate(insertDriverSchema, req.body);
      if (!validation.success) {
        throw errorHandler.badRequest(
          validation.error.errors.map(e => e.message).join(", ")
        );
      }
      const data = validation.data;
      
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
      
      const driver = await storage.getDriverById(driverId);
      if (!driver) throw errorHandler.notFound("Livreur non trouvé");
      
      const validation = validate(updateDriverSchema, req.body);
      if (!validation.success) {
        throw errorHandler.badRequest(
          validation.error.errors.map(e => e.message).join(", ")
        );
      }
      const updateData = validation.data;
      
      // Vérifier que le nouveau numéro n'est pas déjà utilisé par un autre livreur
      if (updateData.phone !== undefined) {
        const existing = await storage.getDriverByPhone(updateData.phone);
        if (existing && existing.id !== driverId) {
          throw errorHandler.badRequest("Un livreur avec ce numéro existe déjà");
        }
      }
      
      // Hasher le mot de passe si fourni
      const finalUpdateData: typeof updateData & { password?: string } = { ...updateData };
      if (updateData.password !== undefined && updateData.password.trim() !== "") {
        finalUpdateData.password = await hashPassword(updateData.password);
      } else {
        delete finalUpdateData.password;
      }
      
      const updated = await storage.updateDriver(driverId, finalUpdateData);
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
      
      // Supprimer vraiment le livreur de la base de données
      await storage.deleteDriver(driverId);
      
      res.json({ message: "Livreur supprimé avec succès" });
    } catch (error) {
      errorHandler.sendError(res, error);
    }
  });
  
  // ============ ADMIN RESTAURANTS ============
  
  app.get("/api/admin/restaurants", authenticateAdmin, async (req: AuthRequest, res: Response) => {
    try {
      const restaurants = await storage.getAllRestaurants();
      res.json(restaurants);
    } catch (error) {
      errorHandler.sendError(res, error);
    }
  });
  
  app.post("/api/admin/restaurants", authenticateAdmin, async (req: AuthRequest, res: Response) => {
    try {
      const validation = validate(insertRestaurantSchema, req.body);
      if (!validation.success) {
        throw errorHandler.badRequest(
          validation.error.errors.map(e => e.message).join(", ")
        );
      }
      const data = validation.data;
      
      const existing = await storage.getRestaurantByPhone(data.phone);
      if (existing) {
        throw errorHandler.badRequest(`Un restaurant avec ce numéro existe déjà : "${existing.name}"`);
      }
      
      // storage.createRestaurant attend categories: string[] et le convertit en JSON automatiquement
      const restaurantData: any = {
        name: data.name,
        phone: data.phone,
        address: data.address,
        categories: data.categories || [],
        description: data.description || undefined,
        imageUrl: data.imageUrl || undefined,
        openingHours: data.openingHours || undefined,
        deliveryTime: data.deliveryTime || 30,
        minOrder: data.minOrder || "0",
        rating: data.rating || "4.5",
        orderType: data.orderType || "online",
        lat: data.lat !== undefined ? (typeof data.lat === 'number' ? data.lat.toString() : data.lat) : undefined,
        lng: data.lng !== undefined ? (typeof data.lng === 'number' ? data.lng.toString() : data.lng) : undefined,
      };
      
      // Ajouter le mot de passe hashé si fourni
      if (data.password !== undefined && data.password.trim() !== "") {
        restaurantData.password = await hashPassword(data.password);
      }
      
      const restaurant = await storage.createRestaurant(restaurantData);
      
      // Parser les catégories pour la réponse
      const restaurantResponse = {
        ...restaurant,
        categories: typeof restaurant.categories === 'string' 
          ? JSON.parse(restaurant.categories) 
          : (restaurant.categories || []),
      };
      
      res.status(201).json(restaurantResponse);
    } catch (error) {
      errorHandler.sendError(res, error);
    }
  });
  
  app.patch("/api/admin/restaurants/:id", authenticateAdmin, async (req: AuthRequest, res: Response) => {
    try {
      const restaurantId = req.params.id;
      
      console.log(`\n[ADMIN CRUD] 🔄 Mise à jour restaurant ${restaurantId}`);
      console.log(`[ADMIN CRUD]    Données reçues:`, JSON.stringify(req.body, null, 2));
      
      const restaurant = await storage.getRestaurantById(restaurantId);
      if (!restaurant) throw errorHandler.notFound("Restaurant non trouvé");
      
      console.log(`[ADMIN CRUD]    Image actuelle: ${restaurant.imageUrl || 'NULL'}`);
      
      // ✅ Normaliser l'imageUrl AVANT validation si c'est un chemin Windows
      let normalizedBody = { ...req.body };
      if (normalizedBody.imageUrl && typeof normalizedBody.imageUrl === 'string') {
        const originalUrl = normalizedBody.imageUrl;
        
        // Si c'est un chemin Windows, le convertir en URL relative
        if (originalUrl.includes('\\') || originalUrl.match(/^[A-Z]:\\/i)) {
          console.log(`[ADMIN CRUD] 🔄 Détection chemin Windows: ${originalUrl}`);
          
          // Extraire le nom du fichier
          const fileName = originalUrl.split('\\').pop() || originalUrl.split('/').pop() || '';
          
          // Si le chemin contient "images", extraire la partie relative
          const imagesIndex = originalUrl.toLowerCase().indexOf('images');
          if (imagesIndex !== -1) {
            const relativePath = originalUrl.substring(imagesIndex);
            normalizedBody.imageUrl = '/' + relativePath.replace(/\\/g, '/');
          } else if (fileName) {
            // Sinon, utiliser juste le nom du fichier à la racine
            normalizedBody.imageUrl = `/${fileName}`;
          } else {
            normalizedBody.imageUrl = null;
          }
          
          console.log(`[ADMIN CRUD] ✅ URL normalisée: ${normalizedBody.imageUrl}`);
        }
      }
      
      const validation = validate(updateRestaurantSchema, normalizedBody);
      if (!validation.success) {
        console.error(`[ADMIN CRUD] ❌ Validation échouée:`, validation.error.errors);
        throw errorHandler.badRequest(
          validation.error.errors.map(e => e.message).join(", ")
        );
      }
      const updateData = validation.data;
      
      console.log(`[ADMIN CRUD] ✅ Validation réussie`);
      console.log(`[ADMIN CRUD]    ImageUrl AVANT validation: ${normalizedBody.imageUrl || 'NULL'}`);
      console.log(`[ADMIN CRUD]    ImageUrl APRÈS validation: ${updateData.imageUrl || 'NULL'}`);
      console.log(`[ADMIN CRUD]    Type: ${typeof updateData.imageUrl}`);
      console.log(`[ADMIN CRUD]    ImageUrl à sauvegarder: ${updateData.imageUrl || 'NULL'}`);
      
      // Vérifier que le nouveau numéro n'est pas déjà utilisé par un autre restaurant
      if (updateData.phone !== undefined) {
        const existing = await storage.getRestaurantByPhone(updateData.phone);
        if (existing && existing.id !== restaurantId) {
          throw errorHandler.badRequest(`Un restaurant avec ce numéro existe déjà : "${existing.name}"`);
        }
      }
      
      // Convertir les catégories en JSON string si fournies
      const finalUpdateData: Partial<{
        name: string;
        phone: string;
        address: string;
        description: string | null;
        imageUrl: string | null;
        categories: string;
        isOpen: boolean;
        openingHours: string | null;
        deliveryTime: number;
        minOrder: string;
        rating: string;
        password: string;
      }> = {};
      
      if (updateData.name !== undefined) finalUpdateData.name = updateData.name;
      if (updateData.phone !== undefined) finalUpdateData.phone = updateData.phone;
      if (updateData.address !== undefined) finalUpdateData.address = updateData.address;
      if (updateData.description !== undefined) finalUpdateData.description = updateData.description;
      // ✅ IMPORTANT : Inclure imageUrl même si c'est null (pour permettre de supprimer l'image)
      // Utiliser 'in' pour vérifier la présence de la clé, pas seulement si elle est undefined
      if ('imageUrl' in updateData) {
        finalUpdateData.imageUrl = updateData.imageUrl ?? null;
        console.log(`[ADMIN CRUD] ✅ imageUrl inclus dans finalUpdateData: ${finalUpdateData.imageUrl || 'NULL'}`);
      } else {
        console.log(`[ADMIN CRUD] ⚠️ imageUrl NON présent dans updateData`);
      }
      if (updateData.categories !== undefined) finalUpdateData.categories = JSON.stringify(updateData.categories);
      if (updateData.isOpen !== undefined) finalUpdateData.isOpen = updateData.isOpen;
      if (updateData.openingHours !== undefined) {
        finalUpdateData.openingHours = updateData.openingHours === "" ? null : updateData.openingHours;
      }
      if (updateData.deliveryTime !== undefined) finalUpdateData.deliveryTime = updateData.deliveryTime;
      if (updateData.minOrder !== undefined) finalUpdateData.minOrder = updateData.minOrder.toString();
      if (updateData.rating !== undefined) finalUpdateData.rating = updateData.rating.toString();
      if (updateData.lat !== undefined) finalUpdateData.lat = typeof updateData.lat === 'number' ? updateData.lat.toString() : updateData.lat;
      if (updateData.lng !== undefined) finalUpdateData.lng = typeof updateData.lng === 'number' ? updateData.lng.toString() : updateData.lng;
      
      // Gérer le mot de passe : hash si fourni et non vide
      if (updateData.password !== undefined && updateData.password.trim() !== "") {
        finalUpdateData.password = await hashPassword(updateData.password);
      }
      
      const updated = await storage.updateRestaurant(restaurantId, finalUpdateData);
      
      console.log(`[ADMIN CRUD] ✅ Restaurant mis à jour`);
      console.log(`[ADMIN CRUD]    ImageUrl sauvegardée: ${updated.imageUrl || 'NULL'}`);
      console.log(`[ADMIN CRUD] ========================================\n`);
      
      // Parser les catégories pour la réponse
      const restaurantResponse = {
        ...updated,
        categories: typeof updated.categories === 'string' 
          ? JSON.parse(updated.categories) 
          : (updated.categories || []),
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
      
      // Utiliser storage au lieu de db.delete direct pour cohérence
      // Note: Si storage.deleteRestaurant existe, l'utiliser
      // Pour l'instant, on désactive le restaurant
      await storage.updateRestaurant(restaurantId, { isOpen: false });
      
      res.json({ message: "Restaurant désactivé avec succès" });
    } catch (error) {
      errorHandler.sendError(res, error);
    }
  });
  
  // ============ ADMIN PIZZAS ============
  
  app.get("/api/admin/pizzas", authenticateAdmin, async (req: AuthRequest, res: Response) => {
    try {
      const pizzas = await storage.getAllPizzas();
      
      // Corriger N+1 queries : récupérer tous les prix en une seule requête si possible
      // Pour l'instant, on garde Promise.all mais idéalement storage devrait avoir getPizzasWithPrices()
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
  
  app.post("/api/admin/pizzas", authenticateAdmin, async (req: AuthRequest, res: Response) => {
    try {
      // Validation avec schéma Zod étendu pour inclure prices
      const pizzaWithPricesSchema = insertPizzaSchema.extend({
        prices: z.array(insertPizzaPriceSchema.omit({ pizzaId: true })).optional(),
      });
      
      const validation = validate(pizzaWithPricesSchema, req.body);
      if (!validation.success) {
        throw errorHandler.badRequest(
          validation.error.errors.map(e => e.message).join(", ")
        );
      }
      const { prices, ...pizzaData } = validation.data;
      
      // Vérifier que le restaurant existe
      const restaurant = await storage.getRestaurantById(pizzaData.restaurantId);
      if (!restaurant) throw errorHandler.notFound("Restaurant non trouvé");
      
      const pizza = await storage.createPizza({
        ...pizzaData,
        available: pizzaData.available ?? true, // Default to true if undefined
        productType: (pizzaData.productType || "pizza") as "pizza" | "burger" | "salade" | "drink" | "dessert" | "other",
        description: pizzaData.description || null,
        imageUrl: pizzaData.imageUrl || null,
      });
      
      // Créer les prix si fournis
      if (prices && prices.length > 0) {
        await Promise.all(
          prices.map(price => {
            const priceData = insertPizzaPriceSchema.parse({
              pizzaId: pizza.id,
              size: price.size,
              price: price.price,
            });
            return storage.createPizzaPrice(priceData);
          })
        );
      }
      
      const pizzaWithPrices = {
        ...pizza,
        prices: await storage.getPizzaPrices(pizza.id),
      };
      
      res.status(201).json(pizzaWithPrices);
    } catch (error) {
      errorHandler.sendError(res, error);
    }
  });
  
  app.patch("/api/admin/pizzas/:id", authenticateAdmin, async (req: AuthRequest, res: Response) => {
    try {
      const pizzaId = req.params.id;
      
      console.log(`\n[ADMIN CRUD] 🔄 Mise à jour produit ${pizzaId}`);
      console.log(`[ADMIN CRUD]    Données reçues:`, JSON.stringify(req.body, null, 2));
      
      const pizza = await storage.getPizzaById(pizzaId);
      if (!pizza) throw errorHandler.notFound("Produit non trouvé");
      
      console.log(`[ADMIN CRUD]    Image actuelle: ${pizza.imageUrl || 'NULL'}`);
      
      // ✅ Normaliser l'imageUrl AVANT validation si c'est un chemin Windows
      let normalizedBody = { ...req.body };
      if (normalizedBody.imageUrl && typeof normalizedBody.imageUrl === 'string') {
        const originalUrl = normalizedBody.imageUrl;
        
        // Si c'est un chemin Windows, le convertir en URL relative
        if (originalUrl.includes('\\') || originalUrl.match(/^[A-Z]:\\/i)) {
          console.log(`[ADMIN CRUD] 🔄 Détection chemin Windows: ${originalUrl}`);
          
          // Extraire le nom du fichier
          const fileName = originalUrl.split('\\').pop() || originalUrl.split('/').pop() || '';
          
          // Si le chemin contient "images/products", extraire la partie relative
          const productsIndex = originalUrl.toLowerCase().indexOf('images/products');
          if (productsIndex !== -1) {
            const relativePath = originalUrl.substring(productsIndex);
            normalizedBody.imageUrl = '/' + relativePath.replace(/\\/g, '/');
          } else if (fileName) {
            // Sinon, utiliser juste le nom du fichier dans images/products
            normalizedBody.imageUrl = `/images/products/${fileName}`;
          } else {
            normalizedBody.imageUrl = null;
          }
          
          console.log(`[ADMIN CRUD] ✅ URL normalisée: ${normalizedBody.imageUrl}`);
        }
      }
      
      const validation = validate(updatePizzaSchema, normalizedBody);
      if (!validation.success) {
        console.error(`[ADMIN CRUD] ❌ Validation échouée:`, validation.error.errors);
        throw errorHandler.badRequest(
          validation.error.errors.map(e => e.message).join(", ")
        );
      }
      const { prices, ...updateData } = validation.data;
      
      console.log(`[ADMIN CRUD]    ImageUrl à sauvegarder: ${updateData.imageUrl || 'NULL'}`);
      
      const updated = await storage.updatePizza(pizzaId, {
        ...updateData,
        description: updateData.description ?? undefined,
        imageUrl: updateData.imageUrl ?? undefined,
      });
      
      console.log(`[ADMIN CRUD] ✅ Produit mis à jour`);
      console.log(`[ADMIN CRUD]    ImageUrl sauvegardée: ${updated.imageUrl || 'NULL'}`);
      console.log(`[ADMIN CRUD] ========================================\n`);
      
      // Mettre à jour les prix si fournis
      if (prices !== undefined) {
        // Supprimer les anciens prix
        // Note: Utiliser db.delete directement car storage n'a pas deletePizzaPrice
        // Idéalement, storage devrait avoir une méthode updatePizzaPrices()
        const { db } = await import("../db");
        const { eq } = await import("drizzle-orm");
        const { pizzaPrices } = await import("@shared/schema");
        await db.delete(pizzaPrices).where(eq(pizzaPrices.pizzaId, pizzaId));
        
        // Créer les nouveaux prix
        if (prices.length > 0) {
          await Promise.all(
            prices.map(price => {
              const priceData = insertPizzaPriceSchema.parse({
                pizzaId: updated.id,
                size: price.size,
                price: price.price,
              });
              return storage.createPizzaPrice(priceData);
            })
          );
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

  // ============ CASH HANDOVER VALIDATION ============
  // CASH MANAGEMENT DISABLED BY DEFAULT – ENABLE VIA ENABLE_CASH_MANAGEMENT ENV FLAG
  
  /**
   * Vérifie si la gestion de caisse est activée
   */
  const isCashManagementEnabled = (): boolean => {
    return process.env.ENABLE_CASH_MANAGEMENT === "true";
  };
  
  /**
   * POST /api/admin/drivers/:driverId/cash-close
   * Valide la clôture de caisse d'un livreur par le gérant
   */
  app.post("/api/admin/drivers/:driverId/cash-close", authenticateAdmin, async (req: AuthRequest, res: Response) => {
    try {
      // Vérifier si la fonctionnalité est activée
      if (!isCashManagementEnabled()) {
        return res.status(403).json({ 
          error: "Gestion de caisse désactivée",
          message: "Cette fonctionnalité n'est pas disponible. Contactez l'administrateur."
        });
      }
      
      const adminId = getAuthenticatedAdminId(req);
      const driverId = req.params.driverId;
      
      // Récupérer la dernière remise de caisse du livreur pour aujourd'hui
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const lastHandover = await storage.getLastCashHandover(driverId, today);
      
      if (!lastHandover) {
        throw errorHandler.badRequest("Aucune remise de caisse trouvée pour ce livreur aujourd'hui");
      }
      
      // Vérifier si déjà validée
      const isAlreadyValidated = await storage.isCashHandoverValidated(lastHandover.id);
      if (isAlreadyValidated) {
        throw errorHandler.badRequest("Cette remise de caisse a déjà été validée");
      }
      
      // Valider la remise de caisse
      const validatedHandover = await storage.validateCashHandover(lastHandover.id, adminId);
      
      console.log(`[Admin] ✅ Clôture de caisse validée: driverId=${driverId}, handoverId=${lastHandover.id}, adminId=${adminId}`);
      
      res.json({
        success: true,
        message: "Clôture de caisse validée avec succès",
        handover: {
          id: validatedHandover.id,
          amount: Number(validatedHandover.amount),
          deliveryCount: validatedHandover.deliveryCount,
          validatedAt: validatedHandover.validatedAt?.toISOString(),
        },
      });
    } catch (error) {
      errorHandler.sendError(res, error);
    }
  });
  
  // Note: Les routes seed-test-data et enrich-all sont très longues et spécifiques
  // Elles restent dans routes.ts pour l'instant car elles sont moins critiques
}

