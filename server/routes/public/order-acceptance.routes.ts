/**
 * Routes publiques pour l'acceptation et le refus de commandes
 * Utilisées par les liens Telegram/SMS pour accepter ou refuser une commande
 * 
 * ✅ IMPORTANT : Ces routes doivent être enregistrées EN PREMIER
 * pour éviter qu'elles soient interceptées par le middleware Vite/Static
 */

import type { Express, Request, Response } from "express";

/**
 * Enregistre les routes d'acceptation et de refus de commandes
 * 
 * Routes :
 * - GET /accept/:orderId - Accepter une commande via lien Telegram/SMS
 * - GET /refuse/:orderId - Refuser une commande via lien Telegram/SMS
 */
export function registerOrderAcceptanceRoutes(app: Express): void {
  /**
   * GET /accept/:orderId
   * Route publique pour accepter une commande via lien unique Telegram
   * Redirige vers le dashboard livreur avec la commande acceptée
   */
  app.get("/accept/:orderId", async (req: Request, res: Response) => {
    try {
      const { orderId } = req.params;
      const { driverId, phone } = req.query; // Paramètres optionnels pour identifier le livreur

      console.log("========================================");
      console.log("[ACCEPT] 🔗 Lien d'acceptation cliqué");
      console.log("[ACCEPT] 📋 Paramètres:", { orderId, driverId, phone });
      console.log("[ACCEPT] 📋 URL complète:", req.originalUrl);
      console.log("========================================");

      // Si driverId fourni, accepter directement
      if (driverId && typeof driverId === 'string') {
        const { OrderAcceptanceService } = await import("../../services/order-acceptance-service.js");
        const { storage } = await import("../../storage.js");

        // Vérifier que le livreur existe
        const driver = await storage.getDriverById(driverId);
        if (!driver) {
          return res.status(404).send(`
            <html>
              <body style="font-family: Arial; text-align: center; padding: 50px;">
                <h1>❌ Livreur non trouvé</h1>
                <p>Veuillez vous connecter à votre espace livreur.</p>
                <a href="/driver/login" style="display: inline-block; margin-top: 20px; padding: 10px 20px; background: #007bff; color: white; text-decoration: none; border-radius: 5px;">Se connecter</a>
              </body>
            </html>
          `);
        }

        // Vérifier l'état actuel de la commande AVANT d'essayer de l'accepter
        const order = await storage.getOrderById(orderId);
        if (!order) {
          return res.status(404).send(`
            <html>
              <body style="font-family: Arial; text-align: center; padding: 50px;">
                <h1>❌ Commande non trouvée</h1>
                <p>Cette commande n'existe plus.</p>
              </body>
            </html>
          `);
        }

        // Vérifier d'abord si la commande est déjà acceptée par ce livreur
        const acceptedStatuses = ['delivery', 'accepted', 'ready', 'delivered'] as const;
        if (order.driverId === driverId && order.status && acceptedStatuses.includes(order.status as any)) {
          console.log("[ACCEPT] ✅ Commande déjà acceptée par ce livreur, redirection vers dashboard");
          // Générer un token pour connexion automatique
          const { generateDriverToken } = await import("../../auth.js");
          const token = generateDriverToken(driver.id, driver.phone);
          const appUrl = process.env.APP_URL || "https://tataouine-pizza.onrender.com";
          const autoLoginUrl = `${appUrl}/driver/auto-login?token=${token}&driverId=${driver.id}&driverName=${encodeURIComponent(driver.name)}&driverPhone=${encodeURIComponent(driver.phone)}&order=${orderId}&accepted=true`;
          console.log("[ACCEPT] 🔄 Redirection (commande déjà acceptée):", autoLoginUrl);
          return res.redirect(autoLoginUrl);
        }

        // Si la commande est déjà assignée à un autre livreur
        if (order.driverId && order.driverId !== driverId) {
          console.log("[ACCEPT] ⚠️ Commande déjà assignée à un autre livreur:", order.driverId);
          return res.status(400).send(`
            <html>
              <body style="font-family: Arial; text-align: center; padding: 50px;">
                <h1>❌ Commande déjà prise</h1>
                <p>Cette commande a déjà été acceptée par un autre livreur.</p>
                <a href="/driver/dashboard" style="display: inline-block; margin-top: 20px; padding: 10px 20px; background: #007bff; color: white; text-decoration: none; border-radius: 5px;">Voir mes commandes</a>
              </body>
            </html>
          `);
        }

        // Accepter la commande
        let acceptedOrder;
        try {
          acceptedOrder = await OrderAcceptanceService.acceptOrder(orderId, driverId);
        } catch (error: any) {
          // Si erreur car statut invalide mais c'est le même livreur, rediriger quand même
          if (error.statusCode === 400 && order.driverId === driverId) {
            console.log("[ACCEPT] ⚠️ Erreur acceptOrder mais même livreur, redirection vers dashboard");
            const { generateDriverToken } = await import("../../auth.js");
            const token = generateDriverToken(driver.id, driver.phone);
            const appUrl = process.env.APP_URL || "https://tataouine-pizza.onrender.com";
            const autoLoginUrl = `${appUrl}/driver/auto-login?token=${token}&driverId=${driver.id}&driverName=${encodeURIComponent(driver.name)}&driverPhone=${encodeURIComponent(driver.phone)}&order=${orderId}&accepted=true`;
            console.log("[ACCEPT] 🔄 Redirection (erreur mais même livreur):", autoLoginUrl);
            return res.redirect(autoLoginUrl);
          }
          throw error;
        }

        if (!acceptedOrder) {
          // Commande prise entre-temps, vérifier à nouveau
          const currentOrder = await storage.getOrderById(orderId);
          if (currentOrder && currentOrder.driverId === driverId) {
            console.log("[ACCEPT] ✅ Commande prise entre-temps par ce livreur, redirection");
            const { generateDriverToken } = await import("../../auth.js");
            const token = generateDriverToken(driver.id, driver.phone);
            const appUrl = process.env.APP_URL || "https://tataouine-pizza.onrender.com";
            const autoLoginUrl = `${appUrl}/driver/auto-login?token=${token}&driverId=${driver.id}&driverName=${encodeURIComponent(driver.name)}&driverPhone=${encodeURIComponent(driver.phone)}&order=${orderId}&accepted=true`;
            console.log("[ACCEPT] 🔄 Redirection (commande prise entre-temps):", autoLoginUrl);
            return res.redirect(autoLoginUrl);
          }
          
          return res.status(400).send(`
            <html>
              <body style="font-family: Arial; text-align: center; padding: 50px;">
                <h1>❌ Commande déjà prise</h1>
                <p>Cette commande a déjà été acceptée par un autre livreur.</p>
                <a href="/driver/dashboard" style="display: inline-block; margin-top: 20px; padding: 10px 20px; background: #007bff; color: white; text-decoration: none; border-radius: 5px;">Voir mes commandes</a>
              </body>
            </html>
          `);
        }

        // Mettre le livreur en statut "on_delivery" (OCCUPÉ)
        await storage.updateDriver(driverId, { status: "on_delivery" });

        // Générer un token JWT temporaire pour connexion automatique
        const { generateDriverToken } = await import("../../auth.js");
        const token = generateDriverToken(driver.id, driver.phone);

        console.log("[ACCEPT] ✅ Token généré pour livreur:", driver.id);

        // Rediriger vers la page d'auto-login
        const appUrl = process.env.APP_URL || "https://tataouine-pizza.onrender.com";
        const autoLoginUrl = `${appUrl}/driver/auto-login?token=${token}&driverId=${driver.id}&driverName=${encodeURIComponent(driver.name)}&driverPhone=${encodeURIComponent(driver.phone)}&order=${orderId}&accepted=true`;
        console.log("[ACCEPT] 🔄 Redirection vers auto-login:", autoLoginUrl);
        
        return res.redirect(autoLoginUrl);
      }

      // Si phone fourni, trouver le livreur par téléphone
      if (phone && typeof phone === 'string') {
        const { storage } = await import("../../storage.js");
        const driver = await storage.getDriverByPhone(phone.replace('whatsapp:', '').replace('+', ''));

        if (driver) {
          // Rediriger avec driverId
          return res.redirect(`/accept/${orderId}?driverId=${driver.id}`);
        }
      }

      // Sinon, rediriger vers la page de login avec un message
      return res.redirect(`/driver/login?accept=${orderId}`);
    } catch (error: any) {
      console.error("[ACCEPT] ❌ Erreur:", error);
      console.error("[ACCEPT] ❌ Stack:", error.stack);
      return res.status(500).send(`
        <html>
          <body style="font-family: Arial; text-align: center; padding: 50px;">
            <h1>❌ Erreur</h1>
            <p>Une erreur est survenue lors de l'acceptation de la commande.</p>
            <a href="/driver/login" style="display: inline-block; margin-top: 20px; padding: 10px 20px; background: #007bff; color: white; text-decoration: none; border-radius: 5px;">Se connecter</a>
          </body>
        </html>
      `);
    }
  });

  /**
   * GET /refuse/:orderId
   * Route publique pour refuser une commande via lien unique Telegram
   * Passe au livreur suivant dans la file Round Robin
   */
  app.get("/refuse/:orderId", async (req: Request, res: Response) => {
    try {
      const { orderId } = req.params;
      const { driverId, phone } = req.query;

      console.log("[REFUSE] 🔗 Lien de refus cliqué:", { orderId, driverId, phone });

      // Si driverId fourni, refuser directement
      if (driverId && typeof driverId === 'string') {
        const { storage } = await import("../../storage.js");
        const { OrderEnrichmentService } = await import("../../services/order-enrichment-service.js");
        const { notifyNextDriverInQueue } = await import("../../services/sms-service.js");

        // Vérifier que le livreur existe
        const driver = await storage.getDriverById(driverId);
        if (!driver) {
          return res.status(404).send(`
            <html>
              <body style="font-family: Arial; text-align: center; padding: 50px;">
                <h1>❌ Livreur non trouvé</h1>
                <p>Veuillez vous connecter à votre espace livreur.</p>
                <a href="/driver/login" style="display: inline-block; margin-top: 20px; padding: 10px 20px; background: #007bff; color: white; text-decoration: none; border-radius: 5px;">Se connecter</a>
              </body>
            </html>
          `);
        }

        // Récupérer la commande
        const order = await storage.getOrderById(orderId);
        if (!order) {
          return res.status(404).send(`
            <html>
              <body style="font-family: Arial; text-align: center; padding: 50px;">
                <h1>❌ Commande non trouvée</h1>
                <p>Cette commande n'existe plus.</p>
              </body>
            </html>
          `);
        }

        // Vérifier que la commande n'a pas déjà été acceptée
        if (order.driverId && order.driverId !== driverId) {
          return res.status(400).send(`
            <html>
              <body style="font-family: Arial; text-align: center; padding: 50px;">
                <h1>❌ Commande déjà prise</h1>
                <p>Cette commande a déjà été acceptée par un autre livreur.</p>
                <a href="/driver/dashboard" style="display: inline-block; margin-top: 20px; padding: 10px 20px; background: #007bff; color: white; text-decoration: none; border-radius: 5px;">Voir mes commandes</a>
              </body>
            </html>
          `);
        }

        // Marquer le livreur comme ayant refusé
        try {
          await storage.markOrderAsIgnoredByDriver(orderId, driverId);
          console.log(`[REFUSE] ✅ Commande ${orderId} marquée comme ignorée par livreur ${driverId}`);
        } catch (error) {
          console.error(`[REFUSE] ⚠️ Erreur marquage ignoré (non-bloquant):`, error);
        }

        // Annuler le timer Round Robin immédiatement
        const { orderAcceptanceTimers } = await import("../../websocket.js");
        const timer = orderAcceptanceTimers.get(orderId);
        if (timer) {
          clearTimeout(timer);
          orderAcceptanceTimers.delete(orderId);
          console.log(`[REFUSE] ⏱️ Timer Round Robin annulé pour commande ${orderId}`);
        }

        // Enrichir la commande
        const enrichedOrder = await OrderEnrichmentService.enrichWithRestaurant(order);

        // Passer IMMÉDIATEMENT au livreur suivant (sans attendre le timer)
        console.log(`[REFUSE] 🔄 Passage immédiat au livreur suivant pour commande ${orderId}...`);
        const notifiedCount = await notifyNextDriverInQueue(
          orderId,
          enrichedOrder.restaurantName || "Restaurant",
          order.customerName,
          order.totalPrice.toString(),
          order.address
        );

        if (notifiedCount > 0) {
          console.log(`[REFUSE] ✅ ${notifiedCount} livreur(s) suivant(s) notifié(s)`);
        } else {
          console.log(`[REFUSE] ⚠️ Aucun livreur suivant disponible`);
        }

        // Générer un token JWT temporaire pour connexion automatique
        const { generateDriverToken } = await import("../../auth.js");
        const token = generateDriverToken(driver.id, driver.phone);

        // Afficher confirmation avec lien vers dashboard
        return res.send(`
          <html>
            <head>
              <meta charset="UTF-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <title>Commande refusée</title>
            </head>
            <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px; background: #f5f5f5;">
              <div style="background: white; border-radius: 10px; padding: 30px; max-width: 400px; margin: 0 auto; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
                <div style="font-size: 48px; margin-bottom: 20px;">❌</div>
                <h1 style="color: #333; margin-bottom: 10px;">Commande refusée</h1>
                <p style="color: #666; margin-bottom: 30px;">La commande sera proposée à un autre livreur.</p>
                <a href="/driver/auto-login?token=${token}&driverId=${driver.id}&driverName=${encodeURIComponent(driver.name)}&driverPhone=${encodeURIComponent(driver.phone)}" 
                   style="display: inline-block; padding: 12px 24px; background: #007bff; color: white; text-decoration: none; border-radius: 5px; font-weight: bold;">
                  Voir mes commandes
                </a>
              </div>
            </body>
          </html>
        `);
      }

      // Si phone fourni, trouver le livreur par téléphone
      if (phone && typeof phone === 'string') {
        const { storage } = await import("../../storage.js");
        const driver = await storage.getDriverByPhone(phone.replace('whatsapp:', '').replace('+', ''));

        if (driver) {
          return res.redirect(`/refuse/${orderId}?driverId=${driver.id}`);
        }
      }

      // Sinon, rediriger vers la page de login
      return res.redirect(`/driver/login?refuse=${orderId}`);
    } catch (error: any) {
      console.error("[REFUSE] ❌ Erreur:", error);
      return res.status(500).send(`
        <html>
          <body style="font-family: Arial; text-align: center; padding: 50px;">
            <h1>❌ Erreur</h1>
            <p>Une erreur est survenue lors du refus de la commande.</p>
            <a href="/driver/login" style="display: inline-block; margin-top: 20px; padding: 10px 20px; background: #007bff; color: white; text-decoration: none; border-radius: 5px;">Se connecter</a>
          </body>
        </html>
      `);
    }
  });
}
