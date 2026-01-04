import type { Express, Response } from "express";
import { storage } from "../../storage";
import { authenticateAdmin, type AuthRequest } from "../../auth";
import { errorHandler } from "../../errors";
import { getAuthenticatedDriverId } from "../../middleware/auth-helpers";

/**
 * Routes de gestion du statut du livreur
 * - Toggle status (available/offline)
 * - Get status
 */
export function registerDriverStatusRoutes(app: Express): void {
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
}
