import type { Express, Response } from "express";
import { storage } from "../storage";
import { authenticateAdmin, type AuthRequest } from "../auth";
import { errorHandler } from "../errors";
import { getAuthenticatedRestaurantId } from "../middleware/auth-helpers";
import { handleOtpLogin } from "../middleware/otp-login-helper";
import { OrderService } from "../services/order-service";
import { sendOtpSms } from "../services/sms-service";
import { comparePassword, generateToken } from "../auth";

export function registerRestaurantDashboardRoutes(app: Express): void {
  // ============ RESTAURANT AUTH (TÉLÉPHONE + MOT DE PASSE) ============
  
  /**
   * POST /api/restaurant/login
   * Connexion avec téléphone + mot de passe (sans SMS)
   */
  app.post("/api/restaurant/login", async (req, res) => {
    console.log("[RESTAURANT LOGIN] Requête de connexion reçue");
    try {
      const { phone, password } = req.body as { phone?: string; password?: string };
      
      if (!phone || !password) {
        return res.status(400).json({ error: "Téléphone et mot de passe requis" });
      }
      
      // Trouver le restaurant par téléphone
      const restaurant = await storage.getRestaurantByPhone(phone);
      if (!restaurant) {
        console.log(`[RESTAURANT LOGIN] ❌ Restaurant non trouvé: ${phone}`);
        return res.status(401).json({ error: "Téléphone ou mot de passe incorrect" });
      }
      
      // Vérifier le mot de passe
      if (!restaurant.password) {
        console.log(`[RESTAURANT LOGIN] ❌ Restaurant ${restaurant.id} n'a pas de mot de passe défini`);
        return res.status(401).json({ error: "Mot de passe non configuré. Contactez l'administrateur." });
      }
      
      const isPasswordValid = await comparePassword(password, restaurant.password);
      if (!isPasswordValid) {
        console.log(`[RESTAURANT LOGIN] ❌ Mot de passe incorrect pour restaurant: ${phone}`);
        return res.status(401).json({ error: "Téléphone ou mot de passe incorrect" });
      }
      
      // Générer le token JWT (utilise generateToken comme pour les admins)
      const token = generateToken(restaurant.id, restaurant.phone);
      
      console.log(`[RESTAURANT LOGIN] ✅ Connexion réussie pour ${restaurant.name} (${phone})`);
      
      res.json({
        token,
        restaurant: {
          id: restaurant.id,
          name: restaurant.name,
          phone: restaurant.phone,
        },
      });
    } catch (error: any) {
      console.error("[RESTAURANT LOGIN] Erreur lors de la connexion:", error);
      res.status(500).json({ error: "Erreur serveur lors de la connexion" });
    }
  });
  
  // ============ RESTAURANT AUTH (OTP) ============
  // OTP TOUJOURS ACTIVÉ pour les restaurants (indépendamment de ENABLE_SMS_OTP)
  // (Gardé pour compatibilité, mais la connexion téléphone + mot de passe est recommandée)
  
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
      
      // Envoyer le code par SMS uniquement si ENABLE_DEMO_OTP=false (mode production réel)
      const ENABLE_DEMO_OTP = process.env.ENABLE_DEMO_OTP === "true" || process.env.NODE_ENV !== "production";
      
      if (!ENABLE_DEMO_OTP) {
        // Mode production réel : envoyer SMS
        const smsResult = await sendOtpSms(phone, code, "restaurant");
        if (smsResult.success) {
          console.log(`[RESTAURANT OTP] ✅ Code OTP envoyé par SMS à ${phone}`);
        } else {
          console.error(`[RESTAURANT OTP] ⚠️ Erreur envoi SMS (code stocké en base):`, smsResult.error?.message);
          // Ne pas bloquer si SMS échoue, le code est quand même stocké en base
        }
      } else {
        // Mode démo : afficher le code dans la console
        const demoCode = process.env.DEMO_OTP_CODE || "1234";
        console.log(`[RESTAURANT OTP] Code for ${phone}: ${code}`);
        console.log(`[RESTAURANT OTP] 💡 Mode démo activé - Utilisez le code de démo: ${demoCode}`);
      }
      
      const response: { message: string; demoCode?: string } = { message: "OTP sent" };
      if (ENABLE_DEMO_OTP) {
        response.demoCode = process.env.DEMO_OTP_CODE || "1234";
      }
      
      res.json(response);
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

