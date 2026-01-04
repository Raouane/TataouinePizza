import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { setupWebSocket } from "./websocket";
import { registerAdminCrudRoutes } from "./routes/admin-crud";
import { registerAdminSeedRoutes } from "./routes/admin-seed";
import { registerPublicRoutes } from "./routes/public";
import { registerAuthRoutes } from "./routes/auth";
import { registerRestaurantDashboardRoutes } from "./routes/restaurant-dashboard";
import { registerDriverDashboardRoutes } from "./routes/driver-dashboard";
import { registerWebhookRoutes } from "./routes/webhooks";
import { registerWhatsAppWebhookRoutes } from "./routes/whatsapp-webhook";
import { registerTelegramWebhookRoutes } from "./routes/telegram-webhook";
import { registerStripeRoutes } from "./routes/stripe";

let seeded = false;

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  
  // Health check endpoint pour Render (ping toutes les 10 minutes pour éviter le cold start)
  app.get("/api/health", (req: Request, res: Response) => {
    res.json({ 
      status: "ok", 
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || "development"
    });
  });
  
  // ============ AUTO MIGRATIONS ============
  // Exécuter les migrations automatiquement au démarrage (pour Render)
  try {
    const { runMigrationsOnStartup } = await import("./migrate-on-startup");
    await runMigrationsOnStartup();
  } catch (error: any) {
    console.warn("[DB] Erreur lors des migrations automatiques:", error.message);
    // On continue quand même, certaines tables peuvent déjà exister
  }
  
  // ============ WEBSOCKET SETUP ============
  setupWebSocket(httpServer);
  
  // ============ SEED DATA ============
  if (!seeded) {
    try {
      const { seedDatabase } = await import("./scripts/seed");
      await seedDatabase();
      seeded = true;
    } catch (e) {
      console.error("[DB] Error seeding data:", e);
    }
  }
  
  // ============ REGISTER ALL ROUTES ============
  registerPublicRoutes(app);
  registerAuthRoutes(app);
  registerRestaurantDashboardRoutes(app);
  registerDriverDashboardRoutes(app);
  registerWebhookRoutes(app);
  registerWhatsAppWebhookRoutes(app);
  registerTelegramWebhookRoutes(app);
  registerAdminCrudRoutes(app);
  registerAdminSeedRoutes(app);
  registerStripeRoutes(app);

  return httpServer;
}
