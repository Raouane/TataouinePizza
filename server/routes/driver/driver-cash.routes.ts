import type { Express, Response } from "express";
import { storage } from "../../storage";
import { authenticateAdmin, type AuthRequest } from "../../auth";
import { errorHandler } from "../../errors";
import { getAuthenticatedDriverId } from "../../middleware/auth-helpers";
import { CommissionService } from "../../services/commission-service";
import type { Order } from "@shared/schema";

/**
 * Routes de gestion de caisse pour les livreurs
 * - Statistiques de caisse
 * - Historique des livraisons cash
 * - Remise de caisse
 * - Résumé de fin de journée
 * 
 * Note: Ces routes sont désactivées par défaut (ENABLE_CASH_MANAGEMENT=false)
 */
export function registerDriverCashRoutes(app: Express): void {
  // ============ CASH MANAGEMENT (ESPÈCES) ============
  // CASH MANAGEMENT DISABLED BY DEFAULT – ENABLE VIA ENABLE_CASH_MANAGEMENT ENV FLAG
  
  /**
   * Vérifie si la gestion de caisse est activée
   */
  const isCashManagementEnabled = (): boolean => {
    return process.env.ENABLE_CASH_MANAGEMENT === "true";
  };
  
  /**
   * GET /api/driver/cash-stats
   * Retourne les statistiques de caisse du livreur pour la journée
   * - Espèces en main (total collecté)
   * - Commission du livreur
   * - Nombre de livraisons
   * - Montant à rendre au restaurant
   */
  app.get("/api/driver/cash-stats", authenticateAdmin, async (req: AuthRequest, res: Response) => {
    try {
      // Vérifier si la fonctionnalité est activée
      if (!isCashManagementEnabled()) {
        return res.status(403).json({ 
          error: "Gestion de caisse désactivée",
          message: "Cette fonctionnalité n'est pas disponible. Contactez l'administrateur."
        });
      }
      
      const driverId = getAuthenticatedDriverId(req);
      
      // Récupérer toutes les commandes du livreur
      const allOrders = await storage.getOrdersByDriver(driverId);
      
      // Filtrer les commandes livrées aujourd'hui avec paiement en espèces
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const cashOrdersToday = allOrders.filter((order: Order) => {
        // Vérifier que la commande est livrée
        if (order.status !== "delivered") return false;
        
        // Vérifier que c'est un paiement en espèces
        if (order.paymentMethod !== "cash") return false;
        
        // Vérifier que c'est aujourd'hui
        const orderDate = new Date(order.createdAt || order.updatedAt || "");
        orderDate.setHours(0, 0, 0, 0);
        return orderDate.getTime() === today.getTime();
      });
      
      // Calculer les statistiques
      let totalCash = 0;
      let totalCommission = 0;
      
      cashOrdersToday.forEach((order: Order) => {
        const orderTotal = Number(order.totalPrice);
        totalCash += orderTotal;
        
        // Calculer la commission pour cette commande
        const commission = CommissionService.calculateCommissions(orderTotal);
        totalCommission += commission.driver;
      });
      
      const amountToReturn = totalCash - totalCommission;
      const deliveryCount = cashOrdersToday.length;
      
      res.json({
        cashInHand: Number(totalCash.toFixed(2)),
        myCommission: Number(totalCommission.toFixed(2)),
        deliveryCount,
        amountToReturn: Number(amountToReturn.toFixed(2)),
        date: today.toISOString().split('T')[0], // Format YYYY-MM-DD
      });
    } catch (error) {
      errorHandler.sendError(res, error);
    }
  });

  /**
   * GET /api/driver/cash-history
   * Retourne l'historique détaillé des livraisons Cash du jour
   * Chaque ligne contient : numéro de commande, montant total, commission, statut (remis ou non)
   */
  app.get("/api/driver/cash-history", authenticateAdmin, async (req: AuthRequest, res: Response) => {
    try {
      // Vérifier si la fonctionnalité est activée
      if (!isCashManagementEnabled()) {
        return res.status(403).json({ 
          error: "Gestion de caisse désactivée",
          message: "Cette fonctionnalité n'est pas disponible. Contactez l'administrateur."
        });
      }
      
      const driverId = getAuthenticatedDriverId(req);
      
      // Récupérer toutes les commandes du livreur
      const allOrders = await storage.getOrdersByDriver(driverId);
      
      // Filtrer les commandes livrées aujourd'hui avec paiement en espèces
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const cashOrdersToday = allOrders.filter((order: Order) => {
        if (order.status !== "delivered") return false;
        if (order.paymentMethod !== "cash") return false;
        const orderDate = new Date(order.createdAt || order.updatedAt || "");
        orderDate.setHours(0, 0, 0, 0);
        return orderDate.getTime() === today.getTime();
      });
      
      // Récupérer la dernière remise de caisse (si elle existe)
      // Pour l'instant, on utilise une table simple ou un champ dans la table drivers
      // TODO: Créer une table cash_handovers pour un suivi plus précis
      const lastHandover = await storage.getLastCashHandover(driverId, today);
      
      // Construire l'historique avec le statut de remise
      const history = cashOrdersToday.map((order: Order) => {
        const orderTotal = Number(order.totalPrice);
        const commission = CommissionService.calculateCommissions(orderTotal);
        const deliveredAt = new Date(order.updatedAt || order.createdAt || "");
        
        // Une commande est considérée comme "remise" si elle a été livrée avant la dernière remise de caisse
        const isHandedOver = (lastHandover?.handoverAt) 
          ? deliveredAt <= lastHandover.handoverAt 
          : false;
        
        return {
          orderId: order.id,
          orderNumber: order.id.slice(0, 8), // Affichage court
          customerName: order.customerName,
          totalAmount: Number(orderTotal.toFixed(2)),
          driverCommission: Number(commission.driver.toFixed(2)),
          amountToReturn: Number((orderTotal - commission.driver).toFixed(2)),
          deliveredAt: deliveredAt.toISOString(),
          isHandedOver, // Rouge si false, Vert si true
        };
      });
      
      // Trier par date de livraison (plus récent en premier)
      history.sort((a, b) => new Date(b.deliveredAt).getTime() - new Date(a.deliveredAt).getTime());
      
      res.json({
        history,
        lastHandover: lastHandover && lastHandover.handoverAt ? {
          timestamp: lastHandover.handoverAt.toISOString(),
          amount: lastHandover.amount,
        } : null,
      });
    } catch (error) {
      errorHandler.sendError(res, error);
    }
  });

  /**
   * POST /api/driver/cash-handover
   * Notifie le système que le livreur a remis la caisse au restaurant
   * Enregistre la remise dans la table cash_handovers
   */
  app.post("/api/driver/cash-handover", authenticateAdmin, async (req: AuthRequest, res: Response) => {
    try {
      // Vérifier si la fonctionnalité est activée
      if (!isCashManagementEnabled()) {
        return res.status(403).json({ 
          error: "Gestion de caisse désactivée",
          message: "Cette fonctionnalité n'est pas disponible. Contactez l'administrateur."
        });
      }
      
      const driverId = getAuthenticatedDriverId(req);
      const { amount } = req.body as { amount?: number };
      
      // Récupérer les stats actuelles pour validation
      const allOrders = await storage.getOrdersByDriver(driverId);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const cashOrdersToday = allOrders.filter((order: Order) => {
        if (order.status !== "delivered") return false;
        if (order.paymentMethod !== "cash") return false;
        const orderDate = new Date(order.createdAt || order.updatedAt || "");
        orderDate.setHours(0, 0, 0, 0);
        return orderDate.getTime() === today.getTime();
      });
      
      let totalCash = 0;
      let totalCommission = 0;
      
      cashOrdersToday.forEach((order: Order) => {
        const orderTotal = Number(order.totalPrice);
        totalCash += orderTotal;
        const commission = CommissionService.calculateCommissions(orderTotal);
        totalCommission += commission.driver;
      });
      
      const expectedAmount = totalCash - totalCommission;
      
      // Si un montant est fourni, on peut le valider
      if (amount !== undefined) {
        const difference = Math.abs(amount - expectedAmount);
        if (difference > 0.01) { // Tolérance de 0.01 DT
          console.log(`[Cash Handover] ⚠️ Montant remis (${amount}) différent du montant attendu (${expectedAmount})`);
        }
      }
      
      // Enregistrer la remise de caisse
      const handover = await storage.createCashHandover(
        driverId,
        expectedAmount,
        cashOrdersToday.length,
        today
      );
      
      console.log(`[Cash Handover] ✅ Livreur ${driverId} a remis la caisse: ${expectedAmount.toFixed(2)} DT (${cashOrdersToday.length} livraison(s))`);
      
      res.json({
        success: true,
        message: "Remise de caisse enregistrée",
        amount: expectedAmount,
        deliveryCount: cashOrdersToday.length,
        timestamp: handover.handoverAt?.toISOString() || new Date().toISOString(),
      });
    } catch (error) {
      errorHandler.sendError(res, error);
    }
  });

  /**
   * GET /api/driver/cash-summary
   * Retourne le résumé de fin de journée pour la clôture de caisse
   * Calcule automatiquement : Argent Total Collecté - Commissions = Montant à rendre
   */
  app.get("/api/driver/cash-summary", authenticateAdmin, async (req: AuthRequest, res: Response) => {
    try {
      // Vérifier si la fonctionnalité est activée
      if (!isCashManagementEnabled()) {
        return res.status(403).json({ 
          error: "Gestion de caisse désactivée",
          message: "Cette fonctionnalité n'est pas disponible. Contactez l'administrateur."
        });
      }
      
      const driverId = getAuthenticatedDriverId(req);
      
      // Récupérer toutes les commandes du livreur
      const allOrders = await storage.getOrdersByDriver(driverId);
      
      // Filtrer les commandes livrées aujourd'hui avec paiement en espèces
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const cashOrdersToday = allOrders.filter((order: Order) => {
        if (order.status !== "delivered") return false;
        if (order.paymentMethod !== "cash") return false;
        const orderDate = new Date(order.createdAt || order.updatedAt || "");
        orderDate.setHours(0, 0, 0, 0);
        return orderDate.getTime() === today.getTime();
      });
      
      // Calculer le bilan
      let totalCash = 0;
      let totalCommission = 0;
      
      cashOrdersToday.forEach((order: Order) => {
        const orderTotal = Number(order.totalPrice);
        totalCash += orderTotal;
        const commission = CommissionService.calculateCommissions(orderTotal);
        totalCommission += commission.driver;
      });
      
      const amountToReturn = totalCash - totalCommission;
      const deliveryCount = cashOrdersToday.length;
      
      // Vérifier si la caisse a déjà été validée par le gérant
      const lastHandover = await storage.getLastCashHandover(driverId, today);
      const isClosed = lastHandover ? await storage.isCashHandoverValidated(lastHandover.id) : false;
      
      res.json({
        date: today.toISOString().split('T')[0],
        totalCashCollected: Number(totalCash.toFixed(2)),
        totalCommission: Number(totalCommission.toFixed(2)),
        amountToReturn: Number(amountToReturn.toFixed(2)),
        deliveryCount,
        isClosed, // Si la caisse a été validée par le gérant
        lastHandover: lastHandover && lastHandover.handoverAt ? {
          timestamp: lastHandover.handoverAt.toISOString(),
          amount: Number(lastHandover.amount),
        } : null,
        summary: {
          message: `Vous avez collecté ${totalCash.toFixed(2)} DT, vos gains sont de ${totalCommission.toFixed(2)} DT, vous devez déposer ${amountToReturn.toFixed(2)} DT à la caisse.`,
        },
      });
    } catch (error) {
      errorHandler.sendError(res, error);
    }
  });
}
