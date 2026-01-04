/**
 * Routes publiques pour les opérations d'écriture sur les commandes
 * (Création, Annulation)
 */

import type { Express, Request, Response } from "express";
import { z } from "zod";
import { insertOrderSchema } from "@shared/schema";
import { errorHandler } from "../../errors";
import { OrderCreationService } from "../../services/order-creation-service";
import { OrderService } from "../../services/order-service";
import { validate } from "../../middlewares/validate";
import { asyncHandler } from "../../middlewares/error-handler";

/**
 * Enregistre les routes d'écriture pour les commandes
 * 
 * Routes :
 * - POST /api/orders - Créer une nouvelle commande
 * - POST /api/orders/:id/cancel - Annuler une commande
 */
export function registerOrdersWriteRoutes(app: Express): void {
  /**
   * POST /api/orders
   * Créer une nouvelle commande
   * 
   * ✅ Validation automatique via middleware Zod
   * ✅ Utilise OrderCreationService pour toute la logique métier
   */
  app.post(
    "/api/orders",
    validate(insertOrderSchema),
    asyncHandler(async (req: Request, res: Response) => {
      // req.body est maintenant typé et validé par le middleware
      const result = await OrderCreationService.createOrder(req.body);

      res.status(result.duplicate ? 200 : 201).json({
        orderId: result.orderId,
        totalPrice: result.totalPrice,
        ...(result.duplicate && { duplicate: true }),
      });
    })
  );

  /**
   * POST /api/orders/:id/cancel
   * Annuler une commande (client)
   * 
   * ✅ Validation automatique des params via middleware Zod
   * ✅ Utilise OrderService pour la gestion des statuts
   */
  app.post(
    "/api/orders/:id/cancel",
    validate(z.object({ id: z.string().uuid() }), "params"),
    asyncHandler(async (req: Request, res: Response) => {
      const orderId = req.params.id; // Validé par le middleware
      console.log(`[ORDERS] 🚫 Annulation de la commande ${orderId} par le client`);

      // Vérifier que la commande existe
      const { storage } = await import("../../storage.js");
      const order = await storage.getOrderById(orderId);
      if (!order) {
        throw errorHandler.notFound("Order not found");
      }

      // Vérifier que la commande peut être annulée
      if (order.status === "delivered" || order.status === "delivery") {
        throw errorHandler.badRequest(
          "La commande est déjà en cours de livraison ou livrée"
        );
      }

      // Annuler la commande via OrderService (gestion centralisée des statuts)
      const cancelledOrder = await OrderService.updateStatus(orderId, "rejected", {
        type: "webhook", // Permet l'annulation côté client
      });

      console.log(`[ORDERS] ✅ Commande ${orderId} annulée avec succès`);
      res.json({ success: true, order: cancelledOrder });
    })
  );
}
