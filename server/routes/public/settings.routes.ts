/**
 * Routes publiques pour les settings (lecture seule)
 */

import type { Express, Request, Response } from "express";
import { storage } from "../../storage";
import { errorHandler } from "../../errors";

/**
 * Enregistre les routes publiques pour les settings
 */
export function registerPublicSettingsRoutes(app: Express): void {
  /**
   * GET /api/settings/:key
   * Récupère un setting par sa clé (lecture seule, publique)
   */
  app.get("/api/settings/:key", async (req: Request, res: Response) => {
    try {
      const { key } = req.params;
      const setting = await storage.getSetting(key);
      
      if (!setting) {
        // Retourner une valeur par défaut au lieu d'une erreur
        // Pour delivery_modes_enabled, la valeur par défaut est "true"
        const defaultValue = key === "delivery_modes_enabled" ? "true" : "false";
        return res.json({ 
          setting: { 
            key, 
            value: defaultValue,
            description: null,
            updatedAt: new Date().toISOString(),
            updatedBy: null
          } 
        });
      }
      
      res.json({ setting });
    } catch (error) {
      errorHandler.sendError(res, error);
    }
  });
}
