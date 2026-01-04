import type { Express, Response } from "express";
import { storage } from "../../storage";
import { authenticateAdmin, type AuthRequest } from "../../auth";
import { errorHandler } from "../../errors";
import { getAuthenticatedDriverId } from "../../middleware/auth-helpers";
import { OrderAcceptanceService } from "../../services/order-acceptance-service";
import { OrderEnrichmentService } from "../../services/order-enrichment-service";
import { OrderService } from "../../services/order-service";
import type { Order } from "@shared/schema";

/**
 * Routes de gestion des commandes pour les livreurs
 * - Liste des commandes disponibles
 * - Liste des commandes du livreur
 * - Accepter une commande
 * - Refuser une commande
 * - Mettre à jour le statut d'une commande
 */
export function registerDriverOrdersRoutes(app: Express): void {
  // ============ DRIVER DASHBOARD ============
  
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
      
      const enrichedOrders = await OrderEnrichmentService.enrichOrders(readyOrders);
      
      if (process.env.NODE_ENV !== "production") {
        enrichedOrders.forEach(order => {
          console.log(`[API] Commande ${order.id} - Coordonnées GPS:`, {
            customerLat: order.customerLat,
            customerLng: order.customerLng,
            address: order.address,
          });
        });
      }
      
      res.json(enrichedOrders);
    } catch (error) {
      errorHandler.sendError(res, error);
    }
  });
  
  app.get("/api/driver/orders", authenticateAdmin, async (req: AuthRequest, res: Response) => {
    try {
      const driverId = getAuthenticatedDriverId(req);
      
      const orders = await storage.getOrdersByDriver(driverId);
      
      // ✅ DIAGNOSTIC : Logs pour comprendre pourquoi les commandes "received" ne s'affichent pas
      const statusCounts = orders.reduce((acc: Record<string, number>, o: any) => {
        acc[o.status] = (acc[o.status] || 0) + 1;
        return acc;
      }, {});
      console.log(`[API Driver] 📊 Répartition des commandes pour driver ${driverId}:`, statusCounts);
      
      // ✅ MODIFIÉ : Inclure les commandes livrées dans la réponse (pour l'historique)
      const activeOrders = orders.filter((o: any) => 
        ["received", "accepted", "ready", "delivery", "delivered"].includes(o.status)
      );
      console.log(`[API Driver] 📋 Commandes actives + livrées retournées: ${activeOrders.length}`);
      if (activeOrders.length > 0) {
        console.log(`[API Driver] 📋 Détails commandes actives:`, activeOrders.map((o: any) => ({
          id: o.id?.slice(0, 8),
          status: o.status,
          customerName: o.customerName,
          driverId: o.driverId
        })));
      }
      
      const enrichedOrders = await OrderEnrichmentService.enrichOrders(orders);
      res.json(enrichedOrders);
    } catch (error) {
      errorHandler.sendError(res, error);
    }
  });
  
  // Nettoyer les clés idempotency anciennes (plus de 1 heure) - toutes les heures
  setInterval(async () => {
    try {
      await storage.deleteOldIdempotencyKeys(1);
      console.log('[Idempotency] ✅ Nettoyage des clés idempotency anciennes effectué');
    } catch (error) {
      console.error('[Idempotency] ❌ Erreur nettoyage clés idempotency:', error);
    }
  }, 60 * 60 * 1000); // Nettoyage toutes les heures

  app.post("/api/driver/orders/:id/accept", authenticateAdmin, async (req: AuthRequest, res: Response) => {
    try {
      const driverId = getAuthenticatedDriverId(req);
      const orderId = req.params.id;
      
      // IDEMPOTENCY KEY - Anti double commande (PRIORITÉ 1) - Stockage DB
      const idempotencyKey = req.headers['idempotency-key'] as string || 
                              req.body?.idempotencyKey as string;
      
      if (idempotencyKey) {
        // Vérifier si cette requête a déjà été traitée (en DB, pas en mémoire)
        const existing = await storage.getIdempotencyKey(idempotencyKey);
        if (existing && existing.orderId === orderId && existing.driverId === driverId) {
          console.log(`[Driver] ✅ Requête idempotente détectée (${idempotencyKey}), retour résultat en cache DB`);
          return res.json(existing.response);
        }
      }
      
      const acceptedOrder = await OrderAcceptanceService.acceptOrder(
        orderId,
        driverId
      );
      
      if (!acceptedOrder) {
        throw errorHandler.badRequest("Cette commande a déjà été prise par un autre livreur");
      }
      
      // Mettre le livreur en statut "on_delivery" (OCCUPÉ)
      // Le statut de la commande reste "accepted" ou "ready" jusqu'à ce que le livreur clique sur "Commencer Livraison"
      await storage.updateDriver(driverId, { status: "on_delivery" });
      console.log(`[Driver] ✅ Livreur ${driverId} mis en statut "on_delivery" après acceptation de la commande ${orderId}`);
      
      // Stocker le résultat pour idempotency en DB (survit aux redémarrages serveur)
      if (idempotencyKey) {
        try {
          await storage.createIdempotencyKey(idempotencyKey, orderId, driverId, acceptedOrder);
          console.log(`[Idempotency] ✅ Clé idempotency stockée en DB: ${idempotencyKey}`);
        } catch (error: any) {
          // Si la clé existe déjà (race condition), c'est OK, on continue
          if (error?.code !== '23505') { // PostgreSQL unique violation
            console.error('[Idempotency] ⚠️ Erreur stockage clé idempotency (non bloquant):', error);
          }
        }
      }
      
      res.json(acceptedOrder);
    } catch (error) {
      errorHandler.sendError(res, error);
    }
  });
  
  // ✅ Route pour refuser une commande
  app.post("/api/driver/orders/:id/refuse", authenticateAdmin, async (req: AuthRequest, res: Response) => {
    try {
      const driverId = getAuthenticatedDriverId(req);
      const orderId = req.params.id;
      
      console.log(`[Driver] ❌ Refus de la commande ${orderId} par livreur ${driverId}`);
      
      // Récupérer la commande
      const order = await storage.getOrderById(orderId);
      if (!order) {
        throw errorHandler.notFound("Commande non trouvée");
      }
      
      // Vérifier que la commande n'a pas déjà été acceptée par un autre livreur
      if (order.driverId && order.driverId !== driverId) {
        throw errorHandler.badRequest("Cette commande a déjà été prise par un autre livreur");
      }
      
      // ✅ NOUVEAU : Marquer le livreur comme ayant refusé
      await storage.markOrderAsIgnoredByDriver(orderId, driverId);
      console.log(`[Driver] ✅ Livreur ${driverId} marqué comme ayant refusé la commande ${orderId}`);

      // ✅ NOUVEAU : Annuler le timer Round Robin immédiatement
      const { orderAcceptanceTimers } = await import("../../websocket.js");
      const timer = orderAcceptanceTimers.get(orderId);
      if (timer) {
        clearTimeout(timer);
        orderAcceptanceTimers.delete(orderId);
        console.log(`[Driver] ⏱️ Timer Round Robin annulé pour commande ${orderId}`);
      }

      // Enrichir la commande pour obtenir les infos nécessaires
      const enrichedOrder = await OrderEnrichmentService.enrichWithRestaurant(order);
      
      // ✅ NOUVEAU : Passer IMMÉDIATEMENT au livreur suivant (sans attendre le timer)
      const { notifyNextDriverInQueue } = await import("../../services/sms-service.js");
      const notifiedCount = await notifyNextDriverInQueue(
        orderId,
        enrichedOrder.restaurantName || "Restaurant",
        order.customerName,
        order.totalPrice.toString(),
        order.address
      );
      
      if (notifiedCount > 0) {
        console.log(`[Driver] ✅ ${notifiedCount} livreur(s) suivant(s) notifié(s) pour commande ${orderId}`);
      } else {
        console.log(`[Driver] ⚠️ Aucun livreur suivant disponible pour commande ${orderId}`);
      }
      
      res.json({ 
        success: true, 
        message: "Commande refusée, passage au livreur suivant",
        notifiedCount 
      });
    } catch (error) {
      errorHandler.sendError(res, error);
    }
  });
  
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
      
      // Si la commande est marquée comme "delivered", remettre le livreur en "available"
      if (status === "delivered") {
        const orderId = req.params.id;
        console.log(`[Driver] ✅ Commande ${orderId} livrée, vérification du statut du livreur ${driverId}`);
        
        // ✅ NOUVEAU : Supprimer les messages Telegram envoyés aux livreurs
        try {
          const { telegramService } = await import("../../services/telegram-service.js");
          
          // Récupérer tous les messages Telegram pour cette commande
          const telegramMessages = await storage.getTelegramMessagesByOrderId(orderId);
          
          // Filtrer les messages non supprimés (statut != "deleted")
          const activeMessages = telegramMessages.filter((msg: any) => msg.status !== "deleted");
          
          if (activeMessages.length === 0) {
            console.log(`[Driver] ℹ️ Aucun message Telegram actif à supprimer pour commande ${orderId}`);
          } else {
            console.log(`[Driver] 🗑️ Suppression de ${activeMessages.length} message(s) Telegram pour commande ${orderId}`);
            
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
                  console.error(`[Driver] ⚠️ Erreur suppression message ${msg.messageId}:`, deleteResult.error);
                }
              } catch (error) {
                console.error(`[Driver] ⚠️ Erreur suppression message ${msg.messageId}:`, error);
                // Continuer même si un message échoue
              }
            }
            
            console.log(`[Driver] ✅ ${deletedCount}/${activeMessages.length} message(s) Telegram supprimé(s) pour commande ${orderId}`);
          }
        } catch (telegramError) {
          console.error('[Driver] ⚠️ Erreur suppression messages Telegram:', telegramError);
          // Ne pas bloquer la livraison si la suppression échoue
        }
        
        // Vérifier s'il a d'autres commandes en cours
        // IMPORTANT: Exclure la commande qui vient d'être marquée comme "delivered"
        const driverOrders = await storage.getOrdersByDriver(driverId);
        const activeOrders = driverOrders.filter(o => 
          o.id !== orderId && // Exclure la commande qui vient d'être livrée
          (o.status === "delivery" || o.status === "accepted" || o.status === "ready")
        );
        
        console.log(`[Driver] 📊 Commande ${orderId} livrée. Autres commandes actives: ${activeOrders.length}`);
        if (activeOrders.length > 0) {
          activeOrders.forEach((order, index) => {
            console.log(`[Driver]   ${index + 1}. Commande ${order.id.slice(0, 8)} - Statut: ${order.status}`);
          });
        }
        
        if (activeOrders.length === 0) {
          // Aucune autre commande en cours, remettre en "available"
          await storage.updateDriver(driverId, { status: "available" });
          console.log(`[Driver] ✅ Livreur ${driverId} remis en statut "available" (aucune autre commande en cours)`);
        } else {
          console.log(`[Driver] ⚠️ Livreur ${driverId} garde statut "on_delivery" (${activeOrders.length} autre(s) commande(s) en cours)`);
        }
      }
      
      res.json(updatedOrder);
    } catch (error) {
      errorHandler.sendError(res, error);
    }
  });
}
