/**
 * Routes de gestion de session utilisateur
 * Fallback pour localStorage qui peut être nettoyé sur mobile (PWA)
 */

import type { Express, Request, Response } from "express";
import { storage } from "../storage";

interface SessionData {
  phone?: string;
  address?: string;
  addressDetails?: string;
  name?: string;
}

// Stockage temporaire en mémoire (pourrait être migré vers Redis en production)
const sessionStore = new Map<string, SessionData & { expiresAt: number }>();

// Durée de vie d'une session : 7 jours
const SESSION_TTL = 7 * 24 * 60 * 60 * 1000;

// Nettoyage périodique des sessions expirées
setInterval(() => {
  const now = Date.now();
  for (const [key, session] of sessionStore.entries()) {
    if (session.expiresAt < now) {
      sessionStore.delete(key);
    }
  }
}, 60 * 60 * 1000); // Toutes les heures

/**
 * Génère une clé de session basée sur le téléphone
 */
function getSessionKey(phone: string): string {
  return `session:${phone}`;
}

/**
 * Enregistre les routes de session
 */
export function registerSessionRoutes(app: Express): void {
  /**
   * POST /api/session/sync
   * Synchronise les données utilisateur avec le serveur
   */
  app.post("/api/session/sync", async (req: Request, res: Response) => {
    try {
      const { phone, address, addressDetails, name }: SessionData = req.body;

      if (!phone) {
        return res.status(400).json({ error: "Phone is required" });
      }

      const sessionKey = getSessionKey(phone);
      const expiresAt = Date.now() + SESSION_TTL;

      sessionStore.set(sessionKey, {
        phone,
        address,
        addressDetails,
        name,
        expiresAt,
      });

      console.log(`[Session] ✅ Session synchronisée pour ${phone}`);

      res.json({ success: true });
    } catch (error: any) {
      console.error("[Session] Erreur sync:", error);
      res.status(500).json({ error: "Failed to sync session" });
    }
  });

  /**
   * GET /api/session/restore?phone=xxx
   * Récupère les données de session depuis le serveur
   */
  app.get("/api/session/restore", async (req: Request, res: Response) => {
    try {
      const { phone } = req.query;

      if (!phone || typeof phone !== "string") {
        return res.status(400).json({ error: "Phone is required" });
      }

      const sessionKey = getSessionKey(phone);
      const session = sessionStore.get(sessionKey);

      if (!session) {
        // Pas de session trouvée, essayer de récupérer depuis les commandes
        try {
          const orders = await storage.getOrdersByPhone(phone);
          if (orders.length > 0) {
            const lastOrder = orders[0]; // Plus récente
            const restoredData: SessionData = {
              phone: lastOrder.phone,
              address: lastOrder.address,
              addressDetails: lastOrder.addressDetails || undefined,
              name: lastOrder.customerName,
            };

            // Sauvegarder pour la prochaine fois
            const expiresAt = Date.now() + SESSION_TTL;
            sessionStore.set(sessionKey, { ...restoredData, expiresAt });

            return res.json(restoredData);
          }
        } catch (dbError) {
          console.error("[Session] Erreur récupération depuis DB:", dbError);
        }

        return res.status(404).json({ error: "Session not found" });
      }

      // Vérifier expiration
      if (session.expiresAt < Date.now()) {
        sessionStore.delete(sessionKey);
        return res.status(404).json({ error: "Session expired" });
      }

      // Retourner les données (sans expiresAt)
      const { expiresAt, ...data } = session;
      res.json(data);
    } catch (error: any) {
      console.error("[Session] Erreur restore:", error);
      res.status(500).json({ error: "Failed to restore session" });
    }
  });

  console.log("[ROUTES] ✅ Routes de session enregistrées");
}
