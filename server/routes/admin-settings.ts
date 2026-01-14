/**
 * Routes admin pour la gestion des settings de l'application
 */

import type { Express, Response } from "express";
import { storage } from "../storage";
import { authenticateAdmin, type AuthRequest } from "../auth";
import { errorHandler } from "../errors";
import { getAuthenticatedAdminId } from "../middleware/auth-helpers";
import { z } from "zod";

const updateSettingSchema = z.object({
  value: z.string().min(1, "La valeur ne peut pas être vide"),
  description: z.string().optional(),
});

/**
 * Enregistre les routes admin pour les settings
 */
export function registerAdminSettingsRoutes(app: Express): void {
  /**
   * GET /api/admin/settings
   * Récupère tous les settings
   */
  app.get("/api/admin/settings", authenticateAdmin, async (req: AuthRequest, res: Response) => {
    try {
      const settings = await storage.getAllSettings();
      res.json({ settings });
    } catch (error) {
      errorHandler.sendError(res, error);
    }
  });

  /**
   * GET /api/admin/settings/:key
   * Récupère un setting par sa clé
   */
  app.get("/api/admin/settings/:key", authenticateAdmin, async (req: AuthRequest, res: Response) => {
    try {
      const { key } = req.params;
      const setting = await storage.getSetting(key);
      
      if (!setting) {
        throw errorHandler.notFound(`Setting avec la clé "${key}" non trouvé`);
      }
      
      res.json({ setting });
    } catch (error) {
      errorHandler.sendError(res, error);
    }
  });

  /**
   * PATCH /api/admin/settings/:key
   * Met à jour un setting (crée s'il n'existe pas)
   */
  app.patch("/api/admin/settings/:key", authenticateAdmin, async (req: AuthRequest, res: Response) => {
    try {
      const { key } = req.params;
      const validation = updateSettingSchema.safeParse(req.body);
      
      if (!validation.success) {
        return res.status(400).json({
          error: "Validation error",
          message: validation.error.errors.map(e => e.message).join(", ")
        });
      }

      const { value, description } = validation.data;
      const adminId = getAuthenticatedAdminId(req);

      // upsertSetting crée le setting s'il n'existe pas
      const setting = await storage.upsertSetting(key, value, description, adminId);
      res.json({ setting });
    } catch (error: any) {
      console.error("[Admin Settings] Error updating setting:", error);
      if (error.statusCode) {
        return res.status(error.statusCode).json({
          error: error.message || "Erreur lors de la mise à jour"
        });
      }
      res.status(500).json({
        error: "Internal server error",
        message: error.message || "Erreur lors de la mise à jour du setting"
      });
    }
  });

  /**
   * DELETE /api/admin/settings/:key
   * Supprime un setting
   */
  app.delete("/api/admin/settings/:key", authenticateAdmin, async (req: AuthRequest, res: Response) => {
    try {
      const { key } = req.params;
      await storage.deleteSetting(key);
      res.json({ success: true, message: `Setting "${key}" supprimé avec succès` });
    } catch (error) {
      errorHandler.sendError(res, error);
    }
  });
}
