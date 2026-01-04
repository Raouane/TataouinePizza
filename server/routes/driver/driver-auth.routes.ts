import type { Express, Request, Response } from "express";
import { z } from "zod";
import { storage } from "../../storage";
import { comparePassword } from "../../auth";
import { driverLoginSchema } from "@shared/schema";
import { errorHandler } from "../../errors";
import { validate } from "../../middlewares/validate";
import { asyncHandler } from "../../middlewares/error-handler";

/**
 * Routes d'authentification pour les livreurs
 * - Login avec téléphone + mot de passe
 * - Refresh token
 */
export function registerDriverAuthRoutes(app: Express): void {
  // ============ DRIVER AUTH (TÉLÉPHONE + MOT DE PASSE) ============
  
  /**
   * POST /api/driver/login
   * Connexion avec téléphone + mot de passe (sans SMS)
   * 
   * ✅ Validation automatique via middleware Zod (phone normalisé)
   * ✅ Gestion d'erreur automatique via asyncHandler
   */
  app.post(
    "/api/driver/login",
    validate(driverLoginSchema),
    asyncHandler(async (req: Request, res: Response) => {
      console.log("[DRIVER LOGIN] Requête de connexion reçue");
      
      // req.body.phone est maintenant normalisé (8 chiffres) par phoneSchema
      const normalizedPhone = req.body.phone;
      
      // Trouver le livreur par téléphone (le phoneSchema a déjà normalisé)
      let driver = await storage.getDriverByPhone(normalizedPhone);
      
      // Fallback : essayer avec/sans préfixes si pas trouvé (compatibilité)
      if (!driver) {
        // Essayer avec +216
        driver = await storage.getDriverByPhone(`+216${normalizedPhone}`);
        if (driver) {
          console.log(`[DRIVER LOGIN] ✅ Livreur trouvé avec format +216: +216${normalizedPhone}`);
        }
      }
      
      if (!driver) {
        console.log(`[DRIVER LOGIN] ❌ Livreur non trouvé: ${normalizedPhone}`);
        throw errorHandler.unauthorized("Téléphone ou mot de passe incorrect");
      }
      
      // Vérifier le mot de passe
      if (!driver.password) {
        console.log(`[DRIVER LOGIN] ❌ Livreur ${driver.id} n'a pas de mot de passe défini`);
        throw errorHandler.unauthorized("Mot de passe non configuré. Contactez l'administrateur.");
      }
      
      const isPasswordValid = await comparePassword(req.body.password, driver.password);
      if (!isPasswordValid) {
        console.log(`[DRIVER LOGIN] ❌ Mot de passe incorrect pour livreur: ${normalizedPhone}`);
        throw errorHandler.unauthorized("Téléphone ou mot de passe incorrect");
      }
      
      // Générer access token (7 jours) et refresh token (30 jours)
      const { generateDriverToken, generateRefreshToken } = await import("../../auth.js");
      const accessToken = generateDriverToken(driver.id, driver.phone);
      const refreshToken = generateRefreshToken(driver.id, driver.phone);
      
      console.log(`[DRIVER LOGIN] ✅ Connexion réussie pour ${driver.name} (${normalizedPhone})`);
      
      res.json({
        token: accessToken,
        refreshToken: refreshToken,
        driver: {
          id: driver.id,
          name: driver.name,
          phone: driver.phone,
        },
      });
    })
  );
  
  /**
   * POST /api/driver/refresh
   * Rafraîchir le token d'accès avec un refresh token
   * 
   * ✅ Validation automatique via middleware Zod
   * ✅ Gestion d'erreur automatique via asyncHandler
   */
  app.post(
    "/api/driver/refresh",
    validate(z.object({
      refreshToken: z.string().min(1, "Refresh token requis"),
    })),
    asyncHandler(async (req: Request, res: Response) => {
      console.log("[DRIVER REFRESH] Requête de rafraîchissement de token");
      
      // req.body.refreshToken est validé par le middleware
      const { verifyRefreshToken, generateDriverToken } = await import("../../auth.js");
      const decoded = verifyRefreshToken(req.body.refreshToken);
      
      if (!decoded || !decoded.id || !decoded.phone) {
        console.log(`[DRIVER REFRESH] ❌ Refresh token invalide ou expiré`);
        throw errorHandler.unauthorized("Refresh token invalide ou expiré");
      }
      
      // Vérifier que le livreur existe toujours
      const driver = await storage.getDriverById(decoded.id);
      if (!driver) {
        console.log(`[DRIVER REFRESH] ❌ Livreur non trouvé: ${decoded.id}`);
        throw errorHandler.unauthorized("Livreur non trouvé");
      }
      
      // Générer un nouveau access token
      const newAccessToken = generateDriverToken(driver.id, driver.phone);
      
      console.log(`[DRIVER REFRESH] ✅ Token rafraîchi pour ${driver.name} (${driver.phone})`);
      
      res.json({
        token: newAccessToken,
        driver: {
          id: driver.id,
          name: driver.name,
          phone: driver.phone,
        },
      });
    })
  );
  
  // ============ OTP SUPPRIMÉ POUR LES DRIVERS ============
  // Les routes /api/driver/otp/send et /api/driver/login-otp ont été supprimées
  // Les drivers utilisent maintenant uniquement /api/driver/login avec téléphone + mot de passe
}
