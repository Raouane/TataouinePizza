import type { Express, Response } from "express";
import { storage } from "../../storage";
import { authenticateAdmin, type AuthRequest } from "../../auth";
import { errorHandler } from "../../errors";
import { getAuthenticatedDriverId } from "../../middleware/auth-helpers";
import { getVapidPublicKey } from "../../services/push-notification-service";

/**
 * Routes de gestion des push notifications pour les livreurs
 * - Obtenir la clé publique VAPID
 * - S'abonner aux notifications
 * - Se désabonner des notifications
 */
export function registerDriverPushRoutes(app: Express): void {
  // ============ PUSH NOTIFICATIONS ============
  
  /**
   * GET /api/driver/push/vapid-key
   * Retourne la clé publique VAPID pour s'abonner aux push notifications
   */
  app.get("/api/driver/push/vapid-key", (req, res) => {
    try {
      const publicKey = getVapidPublicKey();
      res.json({ publicKey });
    } catch (error) {
      errorHandler.sendError(res, error);
    }
  });

  /**
   * POST /api/driver/push/subscribe
   * Enregistre la subscription push d'un livreur
   */
  app.post("/api/driver/push/subscribe", authenticateAdmin, async (req: AuthRequest, res: Response) => {
    try {
      const driverId = getAuthenticatedDriverId(req);
      const { subscription } = req.body as { subscription?: any };

      if (!subscription) {
        throw errorHandler.badRequest("Subscription required");
      }

      // Valider la structure de la subscription
      if (!subscription.endpoint || !subscription.keys) {
        throw errorHandler.badRequest("Invalid subscription format");
      }

      // Sauvegarder la subscription dans la DB
      await storage.updateDriver(driverId, {
        pushSubscription: JSON.stringify(subscription)
      });

      console.log(`[Push] ✅ Subscription enregistrée pour livreur ${driverId}`);
      res.json({ success: true });
    } catch (error) {
      errorHandler.sendError(res, error);
    }
  });

  /**
   * DELETE /api/driver/push/unsubscribe
   * Supprime la subscription push d'un livreur
   */
  app.delete("/api/driver/push/unsubscribe", authenticateAdmin, async (req: AuthRequest, res: Response) => {
    try {
      const driverId = getAuthenticatedDriverId(req);

      // Supprimer la subscription
      await storage.updateDriver(driverId, {
        pushSubscription: null
      });

      console.log(`[Push] 🗑️ Subscription supprimée pour livreur ${driverId}`);
      res.json({ success: true });
    } catch (error) {
      errorHandler.sendError(res, error);
    }
  });
}
