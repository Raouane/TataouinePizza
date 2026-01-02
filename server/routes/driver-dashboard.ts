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
import { sendOtpSms } from "../services/sms-service";
import { comparePassword, generateDriverToken } from "../auth";
import type { Order } from "@shared/schema";

export function registerDriverDashboardRoutes(app: Express): void {
  console.log("[ROUTES] ✅ Enregistrement des routes driver dashboard");
  
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
      const { generateDriverToken, generateRefreshToken } = await import("../auth.js");
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
      const { verifyRefreshToken, generateDriverToken } = await import("../auth.js");
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
  
  // ============ DRIVER AUTH (OTP) ============
  // OTP TOUJOURS ACTIVÉ pour les livreurs (indépendamment de ENABLE_SMS_OTP)
  // (Gardé pour compatibilité, mais la connexion téléphone + mot de passe est recommandée)
  
  /**
   * POST /api/driver/otp/send
   * Envoie un code OTP au livreur (toujours activé)
   */
  app.post("/api/driver/otp/send", async (req, res) => {
    console.log("[DRIVER OTP] Requête reçue pour /api/driver/otp/send");
    try {
      const { phone } = req.body as { phone?: string };
      if (!phone) {
        return res.status(400).json({ error: "Phone required" });
      }
      
      // Vérifier que le livreur existe
      const driver = await storage.getDriverByPhone(phone);
      if (!driver) {
        return res.status(404).json({ error: "Livreur non trouvé avec ce numéro" });
      }
      
      // Générer et envoyer l'OTP
      const code = Math.floor(1000 + Math.random() * 9000).toString();
      const expiresAt = new Date(Date.now() + 5 * 60 * 1000);
      await storage.createOtpCode(phone, code, expiresAt);
      
      // Envoyer le code par SMS uniquement si ENABLE_DEMO_OTP=false (mode production réel)
      const ENABLE_DEMO_OTP = process.env.ENABLE_DEMO_OTP === "true" || process.env.NODE_ENV !== "production";
      
      let smsFailed = false;
      let smsErrorCode: string | undefined;
      
      if (!ENABLE_DEMO_OTP) {
        // Mode production réel : envoyer SMS
        const smsResult = await sendOtpSms(phone, code, "driver");
        if (smsResult.success) {
          console.log(`[DRIVER OTP] ✅ Code OTP envoyé par SMS à ${phone}`);
        } else {
          smsFailed = true;
          smsErrorCode = smsResult.error?.code;
          console.error(`[DRIVER OTP] ⚠️ Erreur envoi SMS (code stocké en base):`, smsResult.error?.message);
          console.error(`[DRIVER OTP] ⚠️ Code erreur: ${smsResult.error?.code}`);
          
          // Si erreur de limite quotidienne (63038), on retournera le code dans la réponse
          if (smsResult.error?.code === 63038 || smsResult.error?.message?.includes('limite') || smsResult.error?.message?.includes('limit')) {
            console.log(`[DRIVER OTP] 💡 Limite quotidienne atteinte, code retourné dans la réponse: ${code}`);
          }
        }
      } else {
        // Mode démo : afficher le code dans la console
        const demoCode = process.env.DEMO_OTP_CODE || "1234";
        console.log(`[DRIVER OTP] Code for ${phone}: ${code}`);
        console.log(`[DRIVER OTP] 💡 Mode démo activé - Utilisez le code de démo: ${demoCode}`);
      }
      
      const response: { 
        message: string; 
        demoCode?: string; 
        code?: string;
        smsFailed?: boolean;
      } = { message: "OTP sent" };
      
      if (ENABLE_DEMO_OTP) {
        response.demoCode = process.env.DEMO_OTP_CODE || "1234";
        response.code = code; // Retourner aussi le vrai code en mode démo
      } else if (smsFailed && (smsErrorCode === "63038" || smsErrorCode === undefined)) {
        // Si SMS échoué (limite quotidienne ou autre erreur), retourner le code
        response.code = code;
        response.smsFailed = true;
        response.message = "OTP généré (SMS non envoyé - limite quotidienne atteinte ou erreur)";
        console.log(`[DRIVER OTP] 📤 Code OTP retourné dans la réponse: ${code}`);
      }
      
      res.json(response);
    } catch (error: any) {
      console.error("[DRIVER OTP] Erreur lors de l'envoi:", error);
      res.status(500).json({ error: "Failed to send OTP" });
    }
  });
  
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
      
      // ✅ DIAGNOSTIC : Logs pour comprendre pourquoi les commandes "received" ne s'affichent pas
      const statusCounts = orders.reduce((acc: Record<string, number>, o: any) => {
        acc[o.status] = (acc[o.status] || 0) + 1;
        return acc;
      }, {});
      console.log(`[API Driver] 📊 Répartition des commandes pour driver ${driverId}:`, statusCounts);
      
      const activeOrders = orders.filter((o: any) => 
        ["received", "accepted", "ready", "delivery"].includes(o.status)
      );
      console.log(`[API Driver] 📋 Commandes actives retournées: ${activeOrders.length}`);
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
      const { orderAcceptanceTimers } = await import("../websocket.js");
      const timer = orderAcceptanceTimers.get(orderId);
      if (timer) {
        clearTimeout(timer);
        orderAcceptanceTimers.delete(orderId);
        console.log(`[Driver] ⏱️ Timer Round Robin annulé pour commande ${orderId}`);
      }

      // Enrichir la commande pour obtenir les infos nécessaires
      const enrichedOrder = await OrderEnrichmentService.enrichWithRestaurant(order);
      
      // ✅ NOUVEAU : Passer IMMÉDIATEMENT au livreur suivant (sans attendre le timer)
      const { notifyNextDriverInQueue } = await import("../services/sms-service.js");
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

