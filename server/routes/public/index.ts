/**
 * Orchestrateur des routes publiques
 * 
 * ✅ IMPORTANT : Les routes /accept/ et /refuse/ doivent être enregistrées EN PREMIER
 * pour éviter qu'elles soient interceptées par le middleware Vite/Static
 */

import type { Express } from "express";
import { registerOrderAcceptanceRoutes } from "./order-acceptance.routes";
import { registerRestaurantsRoutes } from "./restaurants.routes";
import { registerPizzasRoutes } from "./pizzas.routes";
import { registerOrdersReadRoutes } from "./orders-read.routes";
import { registerOrdersWriteRoutes } from "./orders-write.routes";
import { registerPublicSettingsRoutes } from "./settings.routes";

/**
 * Enregistre toutes les routes publiques
 * 
 * Ordre d'enregistrement important :
 * 1. Routes d'acceptation/refus (doivent être en premier)
 * 2. Routes restaurants
 * 3. Routes pizzas
 * 4. Routes commandes (lecture puis écriture)
 */
export function registerPublicRoutes(app: Express): void {
  // ✅ CRITIQUE : Routes d'acceptation/refus EN PREMIER
  // Pour éviter l'interception par le middleware Vite/Static
  registerOrderAcceptanceRoutes(app);
  
  // Routes restaurants et menu
  registerRestaurantsRoutes(app);
  
  // Routes pizzas
  registerPizzasRoutes(app);
  
  // Routes commandes - LECTURE (GET)
  registerOrdersReadRoutes(app);
  
  // Routes commandes - ÉCRITURE (POST)
  registerOrdersWriteRoutes(app);
  
  // Routes settings (lecture seule, publique)
  registerPublicSettingsRoutes(app);
}
