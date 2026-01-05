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
  console.log("[RESTAURANT ROUTES] ✅ Routes restaurant enregistrées (POST /api/restaurant/login)");
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
      console.log("==========================================");
      console.log("[RESTAURANT LOGIN] 🔵 Requête de connexion reçue");
      console.log("[RESTAURANT LOGIN] 📥 Données reçues:", {
        phone: req.body.phone,
        password: req.body.password ? "***" : "MANQUANT",
        phoneType: typeof req.body.phone,
        passwordType: typeof req.body.password
      });
      
      // req.body.phone est maintenant normalisé (8 chiffres) par phoneSchema
      const normalizedPhone = req.body.phone;
      const providedPassword = req.body.password;
      
      console.log("[RESTAURANT LOGIN] 📞 Téléphone normalisé:", normalizedPhone);
      console.log("[RESTAURANT LOGIN] 🔐 Mot de passe fourni:", providedPassword ? "PRÉSENT" : "MANQUANT");
      
      // Trouver le restaurant par téléphone
      console.log("[RESTAURANT LOGIN] 🔍 Recherche du restaurant par téléphone...");
      const restaurant = await storage.getRestaurantByPhone(normalizedPhone);
      
      if (!restaurant) {
        console.log(`[RESTAURANT LOGIN] ❌ Restaurant non trouvé pour téléphone: ${normalizedPhone}`);
        throw errorHandler.unauthorized("Téléphone ou mot de passe incorrect");
      }
      
      console.log("[RESTAURANT LOGIN] ✅ Restaurant trouvé:", {
        id: restaurant.id,
        name: restaurant.name,
        phone: restaurant.phone,
        hasPassword: !!restaurant.password,
        passwordType: typeof restaurant.password,
        passwordLength: restaurant.password ? restaurant.password.length : 0,
        passwordPreview: restaurant.password ? restaurant.password.substring(0, 10) + "..." : "NULL"
      });
      
      // Vérifier le mot de passe
      if (!restaurant.password) {
        console.log(`[RESTAURANT LOGIN] ❌ Restaurant ${restaurant.id} (${restaurant.name}) n'a pas de mot de passe défini`);
        console.log("[RESTAURANT LOGIN] 📋 Données complètes du restaurant:", JSON.stringify(restaurant, null, 2));
        throw errorHandler.unauthorized("Mot de passe non configuré. Contactez l'administrateur.");
      }
      
      console.log("[RESTAURANT LOGIN] 🔐 Comparaison du mot de passe...");
      console.log("[RESTAURANT LOGIN] 📝 Mot de passe fourni:", providedPassword);
      console.log("[RESTAURANT LOGIN] 📝 Hash stocké:", restaurant.password.substring(0, 20) + "...");
      
      const isPasswordValid = await comparePassword(providedPassword, restaurant.password);
      
      console.log("[RESTAURANT LOGIN] ✅ Résultat de la comparaison:", isPasswordValid);
      
      if (!isPasswordValid) {
        console.log(`[RESTAURANT LOGIN] ❌ Mot de passe incorrect pour restaurant: ${restaurant.name} (${normalizedPhone})`);
        console.log("[RESTAURANT LOGIN] 🔍 Détails:", {
          providedPassword: providedPassword,
          storedPasswordHash: restaurant.password.substring(0, 30) + "...",
          comparisonResult: isPasswordValid
        });
        throw errorHandler.unauthorized("Téléphone ou mot de passe incorrect");
      }
      
      // Générer le token JWT
      const token = generateToken(restaurant.id, restaurant.phone);
      
      console.log(`[RESTAURANT LOGIN] ✅ Connexion réussie pour ${restaurant.name} (${normalizedPhone})`);
      console.log("[RESTAURANT LOGIN] 🎫 Token généré:", token.substring(0, 20) + "...");
      console.log("==========================================");
      
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

