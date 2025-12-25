/**
 * Routes CRUD pour l'administration
 * Centralise toutes les routes de gestion des commandes, restaurants, drivers et pizzas
 */

import type { Express, Response } from "express";
import { storage } from "../storage";
import { updateOrderStatusSchema, insertDriverSchema, restaurants, drivers, pizzaPrices } from "@shared/schema";
import { authenticateAdmin, hashPassword, type AuthRequest } from "../auth";
import { errorHandler } from "../errors";
import { getAuthenticatedAdminId } from "../middleware/auth-helpers";
import { db } from "../db";
import { eq } from "drizzle-orm";
import { OrderService } from "../services/order-service";
import { z } from "zod";

function validate<T>(schema: z.ZodSchema, data: any): T | null {
  try {
    return schema.parse(data);
  } catch (error) {
    return null;
  }
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
      const data = validate(updateOrderStatusSchema, req.body);
      if (!data) throw errorHandler.badRequest("Invalid status");
      
      const adminId = getAuthenticatedAdminId(req);
      
      const updatedOrder = await OrderService.updateStatus(
        req.params.id,
        data.status,
        { type: "admin", id: adminId }
      );
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
      console.log("[API] POST /api/admin/restaurants - Début");
      const { name, phone, address, description, imageUrl, categories, openingHours, deliveryTime, minOrder, rating } = req.body;
      console.log("[API] Données reçues:", { name, phone, address, categories, openingHours, deliveryTime, minOrder, rating });
      
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
        console.log("[API] Restaurant existe déjà avec ce téléphone:", existing.name);
        throw errorHandler.badRequest(`Un restaurant avec ce numéro existe déjà : "${existing.name}"`);
      }
      
      // Convertir le tableau de catégories en JSON string
      const restaurantData: any = {
        name,
        phone,
        address,
        description: description || null,
        imageUrl: imageUrl || null,
        categories: JSON.stringify(categories),
      };
      
      // Ajouter les champs optionnels s'ils sont fournis
      if (openingHours) {
        restaurantData.openingHours = openingHours;
      }
      if (deliveryTime !== undefined) {
        restaurantData.deliveryTime = parseInt(deliveryTime) || 30;
      }
      if (minOrder !== undefined) {
        restaurantData.minOrder = minOrder.toString();
      }
      if (rating !== undefined) {
        restaurantData.rating = rating.toString();
      }
      
      console.log("[API] Création du restaurant avec données:", restaurantData);
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
      const { name, phone, address, description, imageUrl, categories, isOpen, openingHours, deliveryTime, minOrder, rating } = req.body;
      const restaurantId = req.params.id;
      
      console.log("[API] PATCH /api/admin/restaurants/:id - Restaurant ID:", restaurantId);
      console.log("[API] Données reçues:", { name, phone, address, description, imageUrl, categories, isOpen, openingHours, deliveryTime, minOrder, rating });
      console.log("[API] isOpen reçu:", isOpen, "type:", typeof isOpen);
      console.log("[API] openingHours reçu:", openingHours, "type:", typeof openingHours, "valeur:", JSON.stringify(openingHours));
      
      const restaurant = await storage.getRestaurantById(restaurantId);
      if (!restaurant) throw errorHandler.notFound("Restaurant non trouvé");
      
      console.log("[API] Restaurant actuel - isOpen:", restaurant.isOpen, "type:", typeof restaurant.isOpen);
      
      const updateData: any = {};
      // Traiter isOpen séparément car il sera mis à jour avec SQL brut dans storage.ts
      let isOpenToUpdate: boolean | undefined = undefined;
      if (isOpen !== undefined) {
        isOpenToUpdate = Boolean(isOpen);
        console.log("[API] isOpen à mettre à jour (séparément):", isOpenToUpdate, "type:", typeof isOpenToUpdate);
        // Ne pas inclure isOpen dans updateData, il sera traité séparément
      }
      
      if (name !== undefined) updateData.name = name;
      if (phone !== undefined) {
        // Vérifier que le nouveau numéro n'est pas déjà utilisé par un autre restaurant
        const existing = await storage.getRestaurantByPhone(phone);
        if (existing && existing.id !== restaurantId) {
          throw errorHandler.badRequest(`Un restaurant avec ce numéro existe déjà : "${existing.name}"`);
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
      // Toujours inclure openingHours dans updateData si présent dans req.body
      // Cela permet de mettre à jour explicitement à null si nécessaire
      if (openingHours !== undefined) {
        // Convertir les chaînes vides en null pour la base de données
        updateData.openingHours = openingHours === "" || openingHours === null ? null : openingHours;
        console.log("[API] openingHours à sauvegarder:", updateData.openingHours, "type:", typeof updateData.openingHours);
      } else {
        console.log("[API] openingHours NON inclus dans req.body (undefined)");
      }
      if (deliveryTime !== undefined) {
        updateData.deliveryTime = parseInt(deliveryTime) || 30;
      }
      if (minOrder !== undefined) {
        updateData.minOrder = minOrder.toString();
      }
      if (rating !== undefined) {
        updateData.rating = rating.toString();
      }
      
      console.log("[API] Données à mettre à jour (sans isOpen):", updateData);
      console.log("[API] openingHours dans updateData:", updateData.openingHours, "présent:", 'openingHours' in updateData);
      
      // Ajouter isOpen séparément si présent
      if (isOpenToUpdate !== undefined) {
        updateData.isOpen = isOpenToUpdate;
        console.log("[API] Ajout de isOpen aux données:", isOpenToUpdate);
      }
      
      const updated = await storage.updateRestaurant(restaurantId, updateData);
      console.log("[API] Restaurant mis à jour - isOpen:", updated.isOpen, "type:", typeof updated.isOpen);
      
      const restaurantResponse = {
        ...updated,
        categories: typeof updated.categories === 'string' ? JSON.parse(updated.categories) : (updated.categories || []),
      };
      
      console.log("[API] Réponse envoyée - isOpen:", restaurantResponse.isOpen);
      res.json(restaurantResponse);
    } catch (error) {
      console.error("[API] Erreur dans PATCH /api/admin/restaurants/:id:", error);
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
  
  // ============ ADMIN PIZZAS ============
  
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
  
  // Note: Les routes seed-test-data et enrich-all sont très longues et spécifiques
  // Elles restent dans routes.ts pour l'instant car elles sont moins critiques
}

