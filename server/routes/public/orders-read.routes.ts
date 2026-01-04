/**
 * Routes publiques pour les opérations de lecture sur les commandes
 * (Détails, Facture, Historique)
 */

import type { Express, Request, Response } from "express";
import { storage } from "../../storage";
import { errorHandler } from "../../errors";
import { OrderEnrichmentService } from "../../services/order-enrichment-service";
import { escapeHtml } from "./utils";

/**
 * Enregistre les routes de lecture pour les commandes
 * 
 * Routes :
 * - GET /api/orders/:id - Détails d'une commande
 * - GET /api/orders/:id/invoice - Facture HTML d'une commande
 * - GET /api/orders/customer/:phone - Historique des commandes d'un client
 */
export function registerOrdersReadRoutes(app: Express): void {
  /**
   * GET /api/orders/:id
   * Détails d'une commande avec enrichissement (restaurant, livreur, items)
   * 
   * Utilise OrderEnrichmentService pour optimiser les requêtes
   */
  app.get("/api/orders/:id", async (req: Request, res: Response) => {
    try {
      const order = await storage.getOrderById(req.params.id);
      if (!order) {
        return res.status(404).json({ error: "Order not found" });
      }

      // Récupérer les items avec gestion d'erreur individuelle
      let itemsWithDetails: any[] = [];
      try {
        const items = await storage.getOrderItems(order.id);
        itemsWithDetails = await Promise.all(
          items.map(async (item) => {
            try {
              const pizza = await storage.getPizzaById(item.pizzaId);
              return { ...item, pizza: pizza || null };
            } catch (pizzaError: any) {
              console.error(`[ORDERS] Erreur récupération pizza ${item.pizzaId}:`, pizzaError.message);
              return { ...item, pizza: null };
            }
          })
        );
      } catch (itemsError: any) {
        console.error("[ORDERS] Erreur récupération items:", itemsError.message);
        itemsWithDetails = [];
      }

      // Enrichir la commande avec restaurant et livreur (utilise le cache)
      let enrichedOrder: any = { ...order, items: itemsWithDetails };

      // Enrichir avec restaurant (utilise OrderEnrichmentService avec cache)
      if (order.restaurantId) {
        try {
          enrichedOrder = await OrderEnrichmentService.enrichWithRestaurant(enrichedOrder);
        } catch (restaurantError: any) {
          console.error(`[ORDERS] Erreur récupération restaurant ${order.restaurantId}:`, restaurantError.message);
        }
      }

      // Enrichir avec livreur
      if (order.driverId) {
        try {
          enrichedOrder = await OrderEnrichmentService.enrichWithDriver(enrichedOrder);
        } catch (driverError: any) {
          console.error(`[ORDERS] Erreur récupération driver ${order.driverId}:`, driverError.message);
        }
      }

      res.json(enrichedOrder);
    } catch (error: any) {
      console.error("[ORDERS] Error fetching order by id:", error);
      errorHandler.sendError(res, error);
    }
  });

  /**
   * GET /api/orders/:id/invoice
   * Génère une facture HTML pour une commande
   */
  app.get("/api/orders/:id/invoice", async (req: Request, res: Response) => {
    try {
      const order = await storage.getOrderById(req.params.id);
      if (!order) {
        return res.status(404).json({ error: "Order not found" });
      }

      // Récupérer les items
      const items = await storage.getOrderItems(order.id);
      const itemsWithDetails = await Promise.all(
        items.map(async (item) => {
          const pizza = await storage.getPizzaById(item.pizzaId);
          return { ...item, pizza };
        })
      );

      // Enrichir avec le restaurant (utilise le cache)
      let restaurantName = "Restaurant";
      let restaurantAddress = "";
      if (order.restaurantId) {
        try {
          const enriched = await OrderEnrichmentService.enrichWithRestaurant(order);
          restaurantName = enriched.restaurantName || "Restaurant";
          restaurantAddress = enriched.restaurantAddress || "";
        } catch (error) {
          console.error("[INVOICE] Erreur récupération restaurant:", error);
        }
      }

      const orderDate = order.createdAt
        ? new Date(order.createdAt).toLocaleDateString("fr-FR", {
            year: "numeric",
            month: "long",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          })
        : "Date indisponible";

      // Générer le HTML de la facture (template inline pour simplicité)
      const invoiceHTML = OrderReadRoutesHelper.generateInvoiceHTML(
        order,
        itemsWithDetails,
        restaurantName,
        restaurantAddress,
        orderDate
      );

      res.setHeader("Content-Type", "text/html; charset=utf-8");
      const forceDownload = req.query.download === "true";
      res.setHeader(
        "Content-Disposition",
        `${forceDownload ? "attachment" : "inline"}; filename="facture-${order.id.slice(0, 8)}.html"`
      );
      res.send(invoiceHTML);
    } catch (error) {
      console.error("[INVOICE] Error:", error);
      res.status(500).json({ error: "Failed to generate invoice" });
    }
  });

  /**
   * GET /api/orders/customer/:phone
   * Récupère l'historique des commandes d'un client par téléphone
   * 
   * ✅ SÉCURITÉ : Masque les adresses pour protéger la vie privée
   */
  app.get("/api/orders/customer/:phone", async (req: Request, res: Response) => {
    try {
      const phone = req.params.phone;

      // Validation basique du numéro de téléphone
      if (!phone || phone.length < 8) {
        return res.status(400).json({
          error: "Invalid phone number",
          details: "Phone number must be at least 8 characters",
        });
      }

      const orders = await storage.getOrdersByPhone(phone);

      // ✅ SÉCURITÉ : Ne pas exposer l'adresse dans les commandes (protection de la vie privée)
      const sanitizedOrders = orders.map((order) => {
        const { address, addressDetails, customerLat, customerLng, ...rest } = order;
        return rest;
      });

      if (process.env.NODE_ENV !== "production") {
        console.log(
          `[ORDERS] ${sanitizedOrders.length} commande(s) trouvée(s) pour ${phone} (adresses masquées pour sécurité)`
        );
      }

      res.json(sanitizedOrders);
    } catch (error: any) {
      console.error("[ORDERS] Error fetching orders by phone:", error);
      errorHandler.sendError(res, error);
    }
  });

}

/**
 * Helper pour la génération de factures
 */
class OrderReadRoutesHelper {
  /**
   * Génère le HTML de la facture
   */
  static generateInvoiceHTML(
    order: any,
    itemsWithDetails: any[],
    restaurantName: string,
    restaurantAddress: string,
    orderDate: string
  ): string {
    return `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Facture ${escapeHtml(order.id.slice(0, 8))}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      padding: 10px;
      background: #f5f5f5;
      color: #333;
      line-height: 1.6;
    }
    .invoice {
      max-width: 800px;
      margin: 0 auto;
      background: white;
      padding: 20px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
      border-radius: 8px;
    }
    .header {
      border-bottom: 3px solid #f97316;
      padding-bottom: 15px;
      margin-bottom: 20px;
      text-align: center;
    }
    .header h1 {
      color: #f97316;
      font-size: 28px;
      margin-bottom: 8px;
      font-weight: bold;
    }
    .header p {
      color: #666;
      font-size: 14px;
      margin: 4px 0;
    }
    .order-info {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 15px;
      margin-bottom: 20px;
      padding: 15px;
      background: #f9f9f9;
      border-radius: 6px;
    }
    .info-item {
      display: flex;
      flex-direction: column;
    }
    .info-label {
      font-size: 12px;
      color: #666;
      text-transform: uppercase;
      margin-bottom: 4px;
    }
    .info-value {
      font-size: 14px;
      font-weight: 600;
      color: #333;
    }
    .table-container {
      overflow-x: auto;
      margin: 20px 0;
    }
    table {
      width: 100%;
      min-width: 600px;
      border-collapse: collapse;
      margin: 0;
    }
    th, td {
      padding: 12px 8px;
      text-align: left;
      border-bottom: 1px solid #eee;
      font-size: 14px;
    }
    th {
      background: #f97316;
      color: white;
      font-weight: 600;
      position: sticky;
      top: 0;
    }
    td {
      background: white;
    }
    tr:hover td {
      background: #fafafa;
    }
    .total-row {
      font-weight: bold;
      background: #f5f5f5;
      font-size: 16px;
    }
    .total-row td {
      background: #f5f5f5;
      padding: 15px 8px;
    }
    .footer {
      margin-top: 30px;
      padding-top: 20px;
      border-top: 2px solid #eee;
      text-align: center;
      color: #666;
    }
    .footer p {
      margin: 8px 0;
      font-size: 14px;
    }
    .footer p:first-child {
      font-weight: 600;
      color: #f97316;
      font-size: 16px;
    }
    .mobile-items {
      display: none;
    }
    .mobile-item {
      background: #f9f9f9;
      border: 1px solid #eee;
      border-radius: 8px;
      padding: 12px;
      margin-bottom: 10px;
    }
    .mobile-item-header {
      display: flex;
      justify-content: space-between;
      align-items: start;
      margin-bottom: 8px;
      padding-bottom: 8px;
      border-bottom: 1px solid #ddd;
    }
    .mobile-item-name {
      font-weight: 600;
      font-size: 14px;
      color: #333;
      flex: 1;
    }
    .mobile-item-price {
      font-weight: 700;
      font-size: 16px;
      color: #f97316;
    }
    .mobile-item-details {
      display: flex;
      justify-content: space-between;
      font-size: 12px;
      color: #666;
      margin-top: 4px;
    }
    .mobile-total {
      background: #f5f5f5;
      border: 2px solid #f97316;
      border-radius: 8px;
      padding: 15px;
      margin-top: 15px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .mobile-total-label {
      font-size: 16px;
      font-weight: 600;
      color: #333;
    }
    .mobile-total-value {
      font-size: 20px;
      font-weight: 700;
      color: #f97316;
    }
    @media (max-width: 768px) {
      body {
        padding: 0;
        background: #f5f5f5;
      }
      .invoice {
        padding: 12px;
        border-radius: 0;
        box-shadow: none;
        max-width: 100%;
      }
      .header {
        padding-bottom: 12px;
        margin-bottom: 15px;
      }
      .header h1 {
        font-size: 22px;
        margin-bottom: 6px;
      }
      .header p {
        font-size: 12px;
        margin: 2px 0;
      }
      .order-info {
        grid-template-columns: 1fr;
        gap: 8px;
        padding: 12px;
        margin-bottom: 15px;
      }
      .info-label {
        font-size: 10px;
      }
      .info-value {
        font-size: 13px;
      }
      .table-container {
        display: none !important;
      }
      .mobile-items {
        display: block !important;
        margin: 15px 0;
      }
      .footer {
        margin-top: 20px;
        padding-top: 15px;
      }
      .footer p {
        font-size: 12px;
        margin: 6px 0;
      }
    }
    @media (max-width: 480px) {
      .invoice {
        padding: 10px;
      }
      .header h1 {
        font-size: 20px;
      }
      .header p {
        font-size: 11px;
      }
      .order-info {
        padding: 10px;
      }
      .mobile-item {
        padding: 10px;
      }
      .mobile-item-name {
        font-size: 13px;
      }
      .mobile-item-price {
        font-size: 15px;
      }
      .mobile-item-details {
        font-size: 11px;
        flex-wrap: wrap;
        gap: 4px;
      }
      .mobile-total {
        padding: 12px;
      }
      .mobile-total-label {
        font-size: 14px;
      }
      .mobile-total-value {
        font-size: 18px;
      }
    }
    @media print {
      body {
        background: white;
        padding: 0;
      }
      .invoice {
        box-shadow: none;
        padding: 20px;
      }
      .table-container {
        overflow: visible;
      }
      table {
        min-width: 100%;
      }
    }
  </style>
</head>
<body>
  <div class="invoice">
    <div class="header">
      <h1>🍕 Tataouine Pizza</h1>
      <p>${escapeHtml(restaurantName)}</p>
      ${restaurantAddress ? `<p>${escapeHtml(restaurantAddress)}</p>` : ""}
    </div>
    
    <div class="order-info">
      <div class="info-item">
        <span class="info-label">N° Commande</span>
        <span class="info-value">${escapeHtml(order.id.slice(0, 8))}</span>
      </div>
      <div class="info-item">
        <span class="info-label">Date</span>
        <span class="info-value">${escapeHtml(orderDate)}</span>
      </div>
      <div class="info-item">
        <span class="info-label">Client</span>
        <span class="info-value">${escapeHtml(order.customerName)}</span>
      </div>
      <div class="info-item">
        <span class="info-label">Téléphone</span>
        <span class="info-value">${escapeHtml(order.phone)}</span>
      </div>
    </div>
    
    <div class="table-container">
      <table>
        <thead>
          <tr>
            <th>Article</th>
            <th>Taille</th>
            <th>Qté</th>
            <th>Prix unit.</th>
            <th>Total</th>
          </tr>
        </thead>
        <tbody>
          ${itemsWithDetails
            .map(
              (item) => `
            <tr>
              <td>${escapeHtml(item.pizza?.name || `Pizza ${item.pizzaId}`)}</td>
              <td>${item.size === "small" ? "Petite" : item.size === "medium" ? "Moyenne" : "Grande"}</td>
              <td style="text-align: center;">${item.quantity}</td>
              <td style="text-align: right;">${Number(item.pricePerUnit).toFixed(2)} TND</td>
              <td style="text-align: right; font-weight: 600;">${(Number(item.pricePerUnit) * item.quantity).toFixed(2)} TND</td>
            </tr>
          `
            )
            .join("")}
          <tr class="total-row">
            <td colspan="4" style="text-align: right; font-size: 16px;">TOTAL</td>
            <td style="text-align: right; font-size: 18px; color: #f97316;">${Number(order.totalPrice).toFixed(2)} TND</td>
          </tr>
        </tbody>
      </table>
    </div>
    
    <div class="mobile-items">
      ${itemsWithDetails
        .map(
          (item) => `
        <div class="mobile-item">
          <div class="mobile-item-header">
            <div class="mobile-item-name">${escapeHtml(item.pizza?.name || `Pizza ${item.pizzaId}`)}</div>
            <div class="mobile-item-price">${(Number(item.pricePerUnit) * item.quantity).toFixed(2)} TND</div>
          </div>
          <div class="mobile-item-details">
            <span>${item.size === "small" ? "Petite" : item.size === "medium" ? "Moyenne" : "Grande"}</span>
            <span>Qté: ${item.quantity}</span>
            <span>${Number(item.pricePerUnit).toFixed(2)} TND × ${item.quantity}</span>
          </div>
        </div>
      `
        )
        .join("")}
      <div class="mobile-total">
        <div class="mobile-total-label">TOTAL</div>
        <div class="mobile-total-value">${Number(order.totalPrice).toFixed(2)} TND</div>
      </div>
    </div>
    
    ${order.address ? `
    <div style="margin-top: 20px; padding: 15px; background: #f9f9f9; border-radius: 6px;">
      <div style="font-size: 12px; color: #666; margin-bottom: 4px;">Adresse de livraison</div>
      <div style="font-size: 14px; font-weight: 600;">${escapeHtml(order.address)}</div>
      ${order.addressDetails ? `<div style="font-size: 12px; color: #666; margin-top: 4px;">${escapeHtml(order.addressDetails)}</div>` : ""}
    </div>
    ` : ""}
    
    <div class="footer">
      <p>✅ Merci pour votre commande !</p>
      <p>Tataouine Pizza - L'authentique goût du désert</p>
      <p style="font-size: 12px; margin-top: 10px;">Cette facture est valable comme justificatif de paiement</p>
    </div>
  </div>
</body>
</html>
    `;
  }
}
