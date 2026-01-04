import type { Express, Request, Response } from "express";
import { storage } from "../storage";
import { authenticateAdmin, type AuthRequest } from "../auth";
import { errorHandler } from "../errors";
import { getAuthenticatedRestaurantId } from "../middleware/auth-helpers";
import { OrderService } from "../services/order-service";
import { comparePassword, generateToken } from "../auth";
import { restaurantLoginSchema } from "@shared/schema";
import { validate } from "../middlewares/validate";
import { asyncHandler } from "../middlewares/error-handler";

export function registerRestaurantDashboardRoutes(app: Express): void {
  // ============ RESTAURANT AUTH (TÉLÉPHONE + MOT DE PASSE) ============
  
  /**
   * POST /api/restaurant/login
   * Connexion avec téléphone + mot de passe (sans SMS)
   * 
   * ✅ Validation automatique via middleware Zod (phone normalisé)
   * ✅ Gestion d'erreur automatique via asyncHandler
   */
  app.post(
    "/api/restaurant/login",
    validate(restaurantLoginSchema),
    asyncHandler(async (req: Request, res: Response) => {
      console.log("[RESTAURANT LOGIN] Requête de connexion reçue");
      
      // req.body.phone est maintenant normalisé (8 chiffres) par phoneSchema
      const normalizedPhone = req.body.phone;
      
      // Trouver le restaurant par téléphone
      const restaurant = await storage.getRestaurantByPhone(normalizedPhone);
      if (!restaurant) {
        console.log(`[RESTAURANT LOGIN] ❌ Restaurant non trouvé: ${normalizedPhone}`);
        throw errorHandler.unauthorized("Téléphone ou mot de passe incorrect");
      }
      
      // Vérifier le mot de passe
      if (!restaurant.password) {
        console.log(`[RESTAURANT LOGIN] ❌ Restaurant ${restaurant.id} n'a pas de mot de passe défini`);
        throw errorHandler.unauthorized("Mot de passe non configuré. Contactez l'administrateur.");
      }
      
      const isPasswordValid = await comparePassword(req.body.password, restaurant.password);
      if (!isPasswordValid) {
        console.log(`[RESTAURANT LOGIN] ❌ Mot de passe incorrect pour restaurant: ${normalizedPhone}`);
        throw errorHandler.unauthorized("Téléphone ou mot de passe incorrect");
      }
      
      // Générer le token JWT
      const token = generateToken(restaurant.id, restaurant.phone);
      
      console.log(`[RESTAURANT LOGIN] ✅ Connexion réussie pour ${restaurant.name} (${normalizedPhone})`);
      
      res.json({
        token,
        restaurant: {
          id: restaurant.id,
          name: restaurant.name,
          phone: restaurant.phone,
        },
      });
    })
  );
  
  // ============ OTP SUPPRIMÉ POUR LES RESTAURANTS ============
  // Les routes /api/restaurant/otp/send et /api/restaurant/login-otp ont été supprimées
  // Les restaurants utilisent maintenant uniquement /api/restaurant/login avec téléphone + mot de passe

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

