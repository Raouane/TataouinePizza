import type { Express } from "express";
import { registerDriverAuthRoutes } from "./driver/driver-auth.routes";
import { registerDriverOrdersRoutes } from "./driver/driver-orders.routes";
import { registerDriverStatusRoutes } from "./driver/driver-status.routes";
import { registerDriverCashRoutes } from "./driver/driver-cash.routes";
import { registerDriverPushRoutes } from "./driver/driver-push.routes";

/**
 * Orchestration des routes driver dashboard
 * 
 * Ce fichier centralise l'enregistrement de toutes les routes driver
 * en les organisant par domaine fonctionnel :
 * - Authentification (login, refresh)
 * - Commandes (available, accept, refuse, status)
 * - Statut (toggle, get)
 * - Caisse (stats, history, handover, summary)
 * - Push notifications (subscribe, unsubscribe, vapid-key)
 * 
 * Note: OTP supprimé - Les livreurs utilisent maintenant login/password
 */
export function registerDriverDashboardRoutes(app: Express): void {
  console.log("[ROUTES] ✅ Enregistrement des routes driver dashboard");
  
  // Enregistrer toutes les routes par domaine
  registerDriverAuthRoutes(app);
  registerDriverOrdersRoutes(app);
  registerDriverStatusRoutes(app);
  registerDriverCashRoutes(app);
  registerDriverPushRoutes(app);
}

