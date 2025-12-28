import type { Express, Response } from "express";
import { storage } from "../storage";
import { authenticateAdmin, type AuthRequest } from "../auth";
import { errorHandler } from "../errors";
import { getAuthenticatedRestaurantId } from "../middleware/auth-helpers";
import { handleOtpLogin } from "../middleware/otp-login-helper";
import { OrderService } from "../services/order-service";

export function registerRestaurantDashboardRoutes(app: Express): void {
  // ============ RESTAURANT AUTH (OTP) ============
  // OTP TOUJOURS ACTIVÉ pour les restaurants (indépendamment de ENABLE_SMS_OTP)
  
  /**
   * POST /api/restaurant/otp/send
   * Envoie un code OTP au restaurant (toujours activé)
   */
  app.post("/api/restaurant/otp/send", async (req, res) => {
    try {
      const { phone } = req.body as { phone?: string };
      if (!phone) {
        return res.status(400).json({ error: "Phone required" });
      }
      
      // Vérifier que le restaurant existe
      const restaurant = await storage.getRestaurantByPhone(phone);
      if (!restaurant) {
        return res.status(404).json({ error: "Restaurant non trouvé avec ce numéro" });
      }
      
      // Générer et envoyer l'OTP
      const code = Math.floor(1000 + Math.random() * 9000).toString();
      const expiresAt = new Date(Date.now() + 5 * 60 * 1000);
      await storage.createOtpCode(phone, code, expiresAt);
      
      if (process.env.NODE_ENV !== "production") {
        console.log(`[RESTAURANT OTP] Code for ${phone}: ${code}`);
      }
      
      res.json({ message: "OTP sent" });
    } catch (error: any) {
      console.error("[RESTAURANT OTP] Erreur lors de l'envoi:", error);
      res.status(500).json({ error: "Failed to send OTP" });
    }
  });
  
  app.post("/api/restaurant/login-otp", async (req, res) => {
    const result = await handleOtpLogin(req, res, {
      getUserByPhone: async (phone) => {
        const restaurant = await storage.getRestaurantByPhone(phone);
        return restaurant ? { id: restaurant.id, name: restaurant.name, phone: restaurant.phone } : null;
      },
      userType: "restaurant",
    });
    
    if (result) {
      res.json({ token: result.token, restaurant: result.user });
    }
  });

  // ============ RESTAURANT DASHBOARD ============
  
  app.get("/api/restaurant/orders", authenticateAdmin, async (req: AuthRequest, res: Response) => {
    try {
      const restaurantId = getAuthenticatedRestaurantId(req);
      
      const orders = await storage.getOrdersByRestaurant(restaurantId);
      res.json(orders);
    } catch (error) {
      errorHandler.sendError(res, error);
    }
  });

  app.patch("/api/restaurant/orders/:id/status", authenticateAdmin, async (req: AuthRequest, res: Response) => {
    try {
      const { status } = req.body as { status?: string };
      if (!status) throw errorHandler.badRequest("Status required");
      
      const restaurantId = getAuthenticatedRestaurantId(req);
      
      const updatedOrder = await OrderService.updateStatus(
        req.params.id,
        status,
        { type: "restaurant", id: restaurantId }
      );
      
      res.json(updatedOrder);
    } catch (error) {
      errorHandler.sendError(res, error);
    }
  });

  app.patch("/api/restaurant/toggle-status", authenticateAdmin, async (req: AuthRequest, res: Response) => {
    try {
      const restaurantId = getAuthenticatedRestaurantId(req);
      
      const restaurant = await storage.getRestaurantById(restaurantId);
      if (!restaurant) throw errorHandler.notFound("Restaurant not found");
      
      const currentStatus = restaurant.isOpen;
      const newStatus = !currentStatus;
      const updated = await storage.updateRestaurant(restaurantId, { isOpen: newStatus });
      res.json({ isOpen: updated.isOpen });
    } catch (error) {
      errorHandler.sendError(res, error);
    }
  });

  app.get("/api/restaurant/status", authenticateAdmin, async (req: AuthRequest, res: Response) => {
    try {
      const restaurantId = getAuthenticatedRestaurantId(req);
      
      const restaurant = await storage.getRestaurantById(restaurantId);
      if (!restaurant) throw errorHandler.notFound("Restaurant not found");
      
      res.json({ isOpen: restaurant.isOpen });
    } catch (error) {
      errorHandler.sendError(res, error);
    }
  });
}

