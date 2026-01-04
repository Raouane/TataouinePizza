import type { Express, Response } from "express";
import { storage } from "../../storage";
import { comparePassword } from "../../auth";

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
   */
  app.post("/api/driver/login", async (req, res) => {
    console.log("[DRIVER LOGIN] Requête de connexion reçue");
    try {
      const { phone, password } = req.body as { phone?: string; password?: string };
      
      if (!phone || !password) {
        return res.status(400).json({ error: "Téléphone et mot de passe requis" });
      }
      
      // Trouver le livreur par téléphone (essayer plusieurs formats)
      let driver = await storage.getDriverByPhone(phone);
      
      // Si pas trouvé, essayer sans le +
      if (!driver && phone.startsWith('+')) {
        const phoneWithoutPlus = phone.replace('+', '');
        driver = await storage.getDriverByPhone(phoneWithoutPlus);
        if (driver) {
          console.log(`[DRIVER LOGIN] ✅ Livreur trouvé avec format sans +: ${phoneWithoutPlus}`);
        }
      }
      
      // Si toujours pas trouvé, essayer avec le +
      if (!driver && !phone.startsWith('+')) {
        const phoneWithPlus = `+${phone}`;
        driver = await storage.getDriverByPhone(phoneWithPlus);
        if (driver) {
          console.log(`[DRIVER LOGIN] ✅ Livreur trouvé avec format avec +: ${phoneWithPlus}`);
        }
      }
      
      if (!driver) {
        console.log(`[DRIVER LOGIN] ❌ Livreur non trouvé: ${phone} (essayé aussi avec/sans +)`);
        return res.status(401).json({ error: "Téléphone ou mot de passe incorrect" });
      }
      
      // Vérifier le mot de passe
      if (!driver.password) {
        console.log(`[DRIVER LOGIN] ❌ Livreur ${driver.id} n'a pas de mot de passe défini`);
        return res.status(401).json({ error: "Mot de passe non configuré. Contactez l'administrateur." });
      }
      
      const isPasswordValid = await comparePassword(password, driver.password);
      if (!isPasswordValid) {
        console.log(`[DRIVER LOGIN] ❌ Mot de passe incorrect pour livreur: ${phone}`);
        return res.status(401).json({ error: "Téléphone ou mot de passe incorrect" });
      }
      
      // ✅ NOUVEAU : Générer access token (7 jours) et refresh token (30 jours)
      const { generateDriverToken, generateRefreshToken } = await import("../../auth.js");
      const accessToken = generateDriverToken(driver.id, driver.phone);
      const refreshToken = generateRefreshToken(driver.id, driver.phone);
      
      console.log(`[DRIVER LOGIN] ✅ Connexion réussie pour ${driver.name} (${phone})`);
      
      res.json({
        token: accessToken, // Access token (7 jours)
        refreshToken: refreshToken, // ✅ NOUVEAU : Refresh token (30 jours)
        driver: {
          id: driver.id,
          name: driver.name,
          phone: driver.phone,
        },
      });
    } catch (error: any) {
      console.error("[DRIVER LOGIN] Erreur lors de la connexion:", error);
      res.status(500).json({ error: "Erreur serveur lors de la connexion" });
    }
  });
  
  // ✅ NOUVEAU : POST /api/driver/refresh - Rafraîchir le token
  app.post("/api/driver/refresh", async (req, res) => {
    console.log("[DRIVER REFRESH] Requête de rafraîchissement de token");
    try {
      const { refreshToken } = req.body as { refreshToken?: string };
      
      if (!refreshToken) {
        return res.status(400).json({ error: "Refresh token requis" });
      }
      
      // Vérifier le refresh token
      const { verifyRefreshToken, generateDriverToken } = await import("../../auth.js");
      const decoded = verifyRefreshToken(refreshToken);
      
      if (!decoded || !decoded.id || !decoded.phone) {
        console.log(`[DRIVER REFRESH] ❌ Refresh token invalide ou expiré`);
        return res.status(401).json({ error: "Refresh token invalide ou expiré" });
      }
      
      // Vérifier que le livreur existe toujours
      const driver = await storage.getDriverById(decoded.id);
      if (!driver) {
        console.log(`[DRIVER REFRESH] ❌ Livreur non trouvé: ${decoded.id}`);
        return res.status(401).json({ error: "Livreur non trouvé" });
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
    } catch (error: any) {
      console.error("[DRIVER REFRESH] Erreur lors du rafraîchissement:", error);
      res.status(500).json({ error: "Erreur serveur lors du rafraîchissement" });
    }
  });
  
  // ============ OTP SUPPRIMÉ POUR LES DRIVERS ============
  // Les routes /api/driver/otp/send et /api/driver/login-otp ont été supprimées
  // Les drivers utilisent maintenant uniquement /api/driver/login avec téléphone + mot de passe
}
