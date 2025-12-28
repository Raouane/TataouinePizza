import type { Express, Response } from "express";
import { storage } from "../storage";
import { authenticateAdmin, type AuthRequest } from "../auth";
import { errorHandler } from "../errors";
import { getAuthenticatedDriverId } from "../middleware/auth-helpers";
import { handleOtpLogin } from "../middleware/otp-login-helper";
import { OrderAcceptanceService } from "../services/order-acceptance-service";
import { OrderEnrichmentService } from "../services/order-enrichment-service";
import { OrderService } from "../services/order-service";
import { getVapidPublicKey } from "../services/push-notification-service";
import type { Order } from "@shared/schema";

export function registerDriverDashboardRoutes(app: Express): void {
  // ============ DRIVER AUTH (OTP) ============
  
  app.post("/api/driver/login-otp", async (req, res) => {
    const result = await handleOtpLogin(req, res, {
      getUserByPhone: async (phone) => {
        const driver = await storage.getDriverByPhone(phone);
        return driver ? { id: driver.id, name: driver.name, phone: driver.phone } : null;
      },
      userType: "driver",
    });
    
    if (result) {
      res.json({ token: result.token, driver: result.user });
    }
  });
  
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
      const enrichedOrders = await OrderEnrichmentService.enrichOrders(orders);
      res.json(enrichedOrders);
    } catch (error) {
      errorHandler.sendError(res, error);
    }
  });
  
  app.post("/api/driver/orders/:id/accept", authenticateAdmin, async (req: AuthRequest, res: Response) => {
    try {
      const driverId = getAuthenticatedDriverId(req);
      
      const acceptedOrder = await OrderAcceptanceService.acceptOrder(
        req.params.id,
        driverId
      );
      
      if (!acceptedOrder) {
        throw errorHandler.badRequest("Cette commande a déjà été prise par un autre livreur");
      }
      
      res.json(acceptedOrder);
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
      res.json(updatedOrder);
    } catch (error) {
      errorHandler.sendError(res, error);
    }
  });
  
  app.patch("/api/driver/toggle-status", authenticateAdmin, async (req: AuthRequest, res: Response) => {
    try {
      const driverId = getAuthenticatedDriverId(req);
      
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

  app.get("/api/driver/status", authenticateAdmin, async (req: AuthRequest, res: Response) => {
    try {
      const driverId = getAuthenticatedDriverId(req);
      
      const driver = await storage.getDriverById(driverId);
      if (!driver) throw errorHandler.notFound("Driver not found");
      
      res.json({ status: driver.status });
    } catch (error) {
      errorHandler.sendError(res, error);
    }
  });

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

