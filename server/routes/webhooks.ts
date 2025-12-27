import type { Express, Request, Response } from "express";
import { storage } from "../storage";
import { authenticateN8nWebhook } from "../auth";
import { OrderService } from "../services/order-service";
import { CommissionService } from "../services/commission-service";
import { OrderAcceptanceService } from "../services/order-acceptance-service";

export function registerWebhookRoutes(app: Express): void {
  app.patch("/webhook/orders/:id/status", authenticateN8nWebhook, async (req: Request, res: Response) => {
    try {
      const { status } = req.body;
      if (!status) {
        return res.status(400).json({ error: "Status required" });
      }
      
      const updatedOrder = await OrderService.updateStatus(
        req.params.id,
        status,
        { type: "webhook" }
      );
      res.json({ success: true, order: updatedOrder });
    } catch (error: any) {
      console.error("[N8N] Erreur webhook update status:", error);
      res.status(500).json({ error: error.message || "Internal server error" });
    }
  });
  
  app.post("/webhook/orders/:id/assign-driver", authenticateN8nWebhook, async (req: Request, res: Response) => {
    try {
      const { driverId } = req.body;
      if (!driverId) {
        return res.status(400).json({ error: "driverId required" });
      }
      
      const acceptedOrder = await OrderAcceptanceService.acceptOrder(
        req.params.id,
        driverId
      );
      
      if (!acceptedOrder) {
        return res.status(400).json({ error: "Failed to assign driver" });
      }
      
      res.json({ success: true, order: acceptedOrder });
    } catch (error: any) {
      console.error("[N8N] Erreur webhook assign driver:", error);
      res.status(500).json({ error: error.message || "Internal server error" });
    }
  });
  
  app.post("/webhook/orders/:id/commissions", authenticateN8nWebhook, async (req: Request, res: Response) => {
    try {
      const { driverCommission, appCommission } = req.body;
      
      const order = await storage.getOrderById(req.params.id);
      if (!order) {
        return res.status(404).json({ error: "Order not found" });
      }
      
      const commissions = CommissionService.calculateFromCustom(
        order.totalPrice,
        driverCommission,
        appCommission
      );
      
      console.log(`[N8N] Commissions pour commande ${req.params.id}:`, commissions);
      
      res.json({ 
        success: true, 
        commissions: {
          driver: commissions.driver,
          app: commissions.app,
          restaurant: commissions.restaurant,
        },
      });
    } catch (error: any) {
      console.error("[N8N] Erreur webhook commissions:", error);
      res.status(500).json({ error: error.message || "Internal server error" });
    }
  });
  
  app.post("/webhook/whatsapp-incoming", authenticateN8nWebhook, async (req: Request, res: Response) => {
    try {
      const { from, message, orderId } = req.body;
      
      console.log(`[N8N] Message WhatsApp reçu de ${from}:`, message);
      
      res.json({ success: true, received: true });
    } catch (error: any) {
      console.error("[N8N] Erreur webhook whatsapp incoming:", error);
      res.status(500).json({ error: error.message || "Internal server error" });
    }
  });
  
  app.get("/webhook/health", authenticateN8nWebhook, async (req: Request, res: Response) => {
    res.json({ 
      status: "ok", 
      timestamp: new Date().toISOString(),
      service: "tataouine-pizza-backend",
    });
  });
}

