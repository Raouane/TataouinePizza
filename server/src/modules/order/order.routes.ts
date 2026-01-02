/**
 * Routes HTTP pour le module Order (V2)
 * Validation + appel au service uniquement
 */

import type { Express, Request, Response } from "express";
import { z } from "zod";
import { insertOrderSchema } from "@shared/schema";
import { OrderService } from "./order.service";
import { OrderWebSocket } from "./order.websocket";
import { sendN8nWebhook } from "../../../webhooks/n8n-webhook";
import { storage } from "../../../storage";
import { errorHandler } from "../../../errors";
import type { CreateOrderInput } from "./order.types";

// Schema de validation pour la création de commande
const createOrderRequestSchema = insertOrderSchema;

/**
 * Helper pour valider les données avec Zod
 */
function validate<T>(schema: z.ZodSchema<T>, data: any): { success: true; data: T } | { success: false; error: z.ZodError } {
  const result = schema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, error: result.error };
}

/**
 * Enregistre les routes Order
 */
export function registerOrderRoutes(app: Express): void {
  // POST /api/orders - Créer une commande
  app.post("/api/orders", async (req: Request, res: Response) => {
    console.log("========================================");
    console.log("[ORDER] ⚡⚡⚡ POST /api/orders - DÉBUT CRÉATION COMMANDE ⚡⚡⚡");
    console.log("[ORDER] Body reçu:", JSON.stringify(req.body, null, 2));
    console.log("========================================");

    try {
      console.log("[ORDER] 📋 ÉTAPE 1: Validation des données...");
      // 1. Validation
      const validation = validate(createOrderRequestSchema, req.body);
      if (!validation.success) {
        console.error("[ORDER] ❌ Validation échouée:", validation.error.errors);
        return res.status(400).json({
          error: "Invalid order data",
          details: process.env.NODE_ENV === "development" ? validation.error.errors : undefined
        });
      }
      console.log("[ORDER] ✅ Validation réussie");

      const data = validation.data;

      console.log("[ORDER] 📋 ÉTAPE 2: Création de la commande via OrderService...");
      // 2. Créer la commande via le service
      let result;
      try {
        result = await OrderService.createOrder({
          restaurantId: data.restaurantId,
          customerName: data.customerName,
          phone: data.phone,
          address: data.address,
          addressDetails: data.addressDetails,
          customerLat: data.customerLat,
          customerLng: data.customerLng,
          clientOrderId: data.clientOrderId,
          items: data.items,
          paymentMethod: data.paymentMethod,
          notes: data.notes,
        });
        console.log("[ORDER] ✅ Commande créée avec succès:", { orderId: result.orderId, totalPrice: result.totalPrice });
      } catch (createError: any) {
        console.error("[ORDER] ❌ ERREUR lors de OrderService.createOrder:");
        console.error("[ORDER] ❌ Type:", createError?.constructor?.name || typeof createError);
        console.error("[ORDER] ❌ Message:", createError?.message || createError?.toString());
        console.error("[ORDER] ❌ Stack:", createError?.stack || 'Pas de stack');
        if (createError?.code) console.error("[ORDER] ❌ Code:", createError.code);
        throw createError; // Re-throw pour être capturé par le catch global
      }

      // 3. Gérer les doublons
      if (result.duplicate) {
        console.log("[ORDER] ℹ️ Commande dupliquée détectée");
        return res.status(200).json({
          orderId: result.orderId,
          totalPrice: result.totalPrice,
          duplicate: true
        });
      }

      console.log("[ORDER] 📋 ÉTAPE 3: Récupération de la commande créée...");
      // 4. Récupérer les détails pour les notifications
      let order;
      try {
        order = await storage.getOrderById(result.orderId);
        if (!order) {
          console.error("[ORDER] ❌ Commande créée mais non trouvée lors de la récupération:", result.orderId);
          return res.status(500).json({ error: "Failed to create order" });
        }
        console.log("[ORDER] ✅ Commande récupérée:", { orderId: order.id, status: order.status });
      } catch (getOrderError: any) {
        console.error("[ORDER] ❌ ERREUR lors de storage.getOrderById:");
        console.error("[ORDER] ❌ Type:", getOrderError?.constructor?.name || typeof getOrderError);
        console.error("[ORDER] ❌ Message:", getOrderError?.message || getOrderError?.toString());
        console.error("[ORDER] ❌ Stack:", getOrderError?.stack || 'Pas de stack');
        if (getOrderError?.code) console.error("[ORDER] ❌ Code:", getOrderError.code);
        throw getOrderError;
      }

      console.log("[ORDER] 📋 ÉTAPE 4: Récupération du restaurant...");
      const restaurant = await storage.getRestaurantById(data.restaurantId);
      if (!restaurant) {
        console.error("[ORDER] ❌ Restaurant non trouvé:", data.restaurantId);
        return res.status(404).json({ error: "Restaurant not found" });
      }
      console.log("[ORDER] ✅ Restaurant trouvé:", restaurant.name);

      // 5. Préparer les détails des items pour les notifications
      const pizzaIds = Array.from(new Set(data.items.map(item => item.pizzaId)));
      const pizzas = await storage.getPizzasByIds(pizzaIds);
      const pizzaMap = new Map(pizzas.map(p => [p.id, p]));

      const orderItemsDetails = data.items.map(item => {
        const pizza = pizzaMap.get(item.pizzaId);
        return {
          name: pizza?.name || `Pizza ${item.pizzaId}`,
          size: item.size,
          quantity: item.quantity,
        };
      });

      // 6. Notifier les livreurs via WebSocket (non-bloquant)
      console.log("[ORDER] 📋 ÉTAPE 6: Notification des livreurs via WebSocket...");
      try {
        await OrderWebSocket.notifyDrivers({
          type: "new_order",
          orderId: order.id,
          restaurantName: restaurant.name,
          customerName: data.customerName,
          address: data.address,
          customerLat: data.customerLat,
          customerLng: data.customerLng,
          totalPrice: result.totalPrice.toString(),
          items: orderItemsDetails,
        });
        console.log("[ORDER] ✅ Notification WebSocket envoyée");
      } catch (wsError: any) {
        console.error("[ORDER] ❌ ERREUR notification WebSocket (non-bloquant):");
        console.error("[ORDER] ❌ Type:", wsError?.constructor?.name || typeof wsError);
        console.error("[ORDER] ❌ Message:", wsError?.message || wsError?.toString());
        console.error("[ORDER] ❌ Stack:", wsError?.stack || 'Pas de stack');
        // Ne pas throw - c'est non-bloquant
      }

      // 7. Envoyer le webhook n8n (non-bloquant)
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
          totalPrice: result.totalPrice.toString(),
          items: orderItemsDetails,
          status: order.status,
          createdAt: order.createdAt,
        });
      } catch (webhookError) {
        console.error("[ORDER] Erreur webhook n8n:", webhookError);
      }

      // 8. Retourner la réponse
      res.status(201).json({
        orderId: result.orderId,
        totalPrice: result.totalPrice
      });

    } catch (error: any) {
      console.error("========================================");
      console.error("[ORDER] ❌❌❌ ERREUR 500 LORS DE LA CRÉATION DE COMMANDE ❌❌❌");
      console.error("[ORDER] ❌ Type d'erreur:", error?.constructor?.name || typeof error);
      console.error("[ORDER] ❌ Message:", error?.message || error?.toString());
      console.error("[ORDER] ❌ Stack:", error?.stack || 'Pas de stack trace');
      if (error?.code) {
        console.error("[ORDER] ❌ Code d'erreur:", error.code);
      }
      if (error?.details) {
        console.error("[ORDER] ❌ Détails:", error.details);
      }
      if (error?.sql) {
        console.error("[ORDER] ❌ SQL:", error.sql);
      }
      if (error?.query) {
        console.error("[ORDER] ❌ Query:", error.query);
      }
      console.error("[ORDER] ❌ Body reçu:", JSON.stringify(req.body, null, 2));
      console.error("========================================");
      errorHandler.sendError(res, error);
    }
  });

  // GET /api/orders/:id - Récupérer une commande
  app.get("/api/orders/:id", async (req: Request, res: Response) => {
    try {
      const orderId = req.params.id;
      console.log(`[ORDER] 📥 GET /api/orders/${orderId} - Récupération commande`);
      const order = await OrderService.getOrderWithItems(orderId);
      if (!order) {
        console.log(`[ORDER] ❌ Commande ${orderId} non trouvée`);
        return res.status(404).json({ error: "Order not found" });
      }
      console.log(`[ORDER] ✅ Commande ${orderId} trouvée:`, {
        orderId: order.id,
        status: order.status,
        driverId: order.driverId,
        driverIdType: typeof order.driverId,
        createdAt: order.createdAt,
      });
      res.json(order);
    } catch (error: any) {
      const orderId = req.params.id;
      console.error(`[ORDER] ❌ ERREUR 500 lors de la récupération de la commande ${orderId}`);
      console.error(`[ORDER] ❌ Type d'erreur:`, error?.constructor?.name || typeof error);
      console.error(`[ORDER] ❌ Message:`, error?.message || error?.toString());
      console.error(`[ORDER] ❌ Stack:`, error?.stack || 'Pas de stack trace');
      
      // Log des détails supplémentaires si disponibles
      if (error?.code) {
        console.error(`[ORDER] ❌ Code d'erreur:`, error.code);
      }
      if (error?.details) {
        console.error(`[ORDER] ❌ Détails:`, error.details);
      }
      
      errorHandler.sendError(res, error);
    }
  });

  // GET /api/orders/customer/:phone - Récupérer les commandes d'un client
  app.get("/api/orders/customer/:phone", async (req: Request, res: Response) => {
    console.log(`[ORDERS] GET /api/orders/customer/:phone - Téléphone: ${req.params.phone}`);
    try {
      const phone = req.params.phone;

      // Validation basique
      if (!phone || phone.length < 8) {
        return res.status(400).json({
          error: "Invalid phone number",
          details: "Phone number must be at least 8 characters"
        });
      }

      const orders = await OrderService.getCustomerOrders(phone);
      if (process.env.NODE_ENV !== "production") {
        console.log(`[ORDERS] ${orders.length} commande(s) trouvée(s) pour ${phone}`);
      }
      res.json(orders);
    } catch (error: any) {
      console.error("[ORDERS] Error fetching orders by phone:", error);
      errorHandler.sendError(res, error);
    }
  });

  // GET /api/orders/:id/transitions - Retourne les transitions autorisées
  app.get("/api/orders/:id/transitions", async (req: Request, res: Response) => {
    try {
      const transitions = await OrderService.getAllowedTransitions(req.params.id);
      res.json({ transitions });
    } catch (error: any) {
      console.error("[ORDER] Error fetching transitions:", error);
      errorHandler.sendError(res, error);
    }
  });

  // POST /api/orders/:id/cancel - Annuler une commande (client)
  app.post("/api/orders/:id/cancel", async (req: Request, res: Response) => {
    try {
      const orderId = req.params.id;
      console.log(`[ORDER] 🚫 Annulation de la commande ${orderId} par le client`);

      // Vérifier que la commande existe
      const order = await OrderService.getOrderWithItems(orderId);
      if (!order) {
        return res.status(404).json({ error: "Order not found" });
      }

      // Vérifier que la commande peut être annulée (pas déjà livrée ou en cours de livraison)
      if (order.status === 'delivered' || order.status === 'delivery') {
        return res.status(400).json({ 
          error: "Cannot cancel order", 
          message: "La commande est déjà en cours de livraison ou livrée" 
        });
      }

      // Annuler la commande (statut 'rejected')
      const { OrderService: OrderServiceLegacy } = await import("../../../services/order-service.js");
      const cancelledOrder = await OrderServiceLegacy.updateStatus(
        orderId,
        'rejected',
        { type: "webhook" } // Permet l'annulation côté client
      );

      // ✅ Supprimer les messages Telegram envoyés aux livreurs
      try {
        const { storage } = await import("../../../storage.js");
        const { telegramService } = await import("../../../services/telegram-service.js");
        
        // Récupérer tous les messages Telegram pour cette commande
        const telegramMessages = await storage.getTelegramMessagesByOrderId(orderId);
        
        // Filtrer les messages non supprimés (statut != "deleted")
        const activeMessages = telegramMessages.filter(msg => msg.status !== "deleted");
        
        if (activeMessages.length === 0) {
          console.log(`[ORDER] ℹ️ Aucun message Telegram actif à supprimer pour commande ${orderId}`);
        } else {
          console.log(`[ORDER] 🗑️ Suppression de ${activeMessages.length} message(s) Telegram pour commande ${orderId}`);
          
          // Supprimer chaque message
          let deletedCount = 0;
          for (const msg of activeMessages) {
            try {
              const deleteResult = await telegramService.deleteMessage(msg.chatId, msg.messageId);
              if (deleteResult.success) {
                // Marquer comme supprimé dans la DB
                await storage.markTelegramMessageAsDeleted(msg.id);
                deletedCount++;
              } else {
                console.error(`[ORDER] ⚠️ Erreur suppression message ${msg.messageId}:`, deleteResult.error);
              }
            } catch (error) {
              console.error(`[ORDER] ⚠️ Erreur suppression message ${msg.messageId}:`, error);
              // Continuer même si un message échoue
            }
          }
          
          console.log(`[ORDER] ✅ ${deletedCount}/${activeMessages.length} message(s) Telegram supprimé(s) pour commande ${orderId}`);
        }
      } catch (telegramError) {
        console.error('[ORDER] ⚠️ Erreur suppression messages Telegram:', telegramError);
        // Ne pas bloquer l'annulation si la suppression échoue
      }

      console.log(`[ORDER] ✅ Commande ${orderId} annulée avec succès`);
      res.json({ success: true, order: cancelledOrder });
    } catch (error: any) {
      console.error("[ORDER] Error cancelling order:", error);
      errorHandler.sendError(res, error);
    }
  });
}
