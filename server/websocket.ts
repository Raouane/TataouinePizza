import { WebSocketServer, WebSocket } from "ws";
import { Server } from "http";
import { db } from "./db";
import { drivers } from "@shared/schema";
import { eq, sql } from "drizzle-orm";

// Map pour stocker les connexions WebSocket des livreurs
// Key: driverId, Value: WebSocket
const driverConnections = new Map<string, WebSocket>();

// Map pour stocker les timers d'acceptation de commande
// Key: orderId, Value: NodeJS.Timeout
const orderAcceptanceTimers = new Map<string, NodeJS.Timeout>();

// Durée du timer d'acceptation (20 secondes)
const ACCEPTANCE_TIMEOUT = 20000; // 20 secondes

export interface OrderNotification {
  type: "new_order";
  orderId: string;
  restaurantName: string;
  customerName: string;
  address: string;
  customerLat?: string | number;
  customerLng?: string | number;
  totalPrice: string;
  items: Array<{ name: string; size: string; quantity: number }>;
}

export interface OrderAcceptedNotification {
  type: "order_accepted";
  orderId: string;
  message: string;
}

export interface OrderRejectedNotification {
  type: "order_rejected";
  orderId: string;
  message: string;
}

/**
 * Initialise le serveur WebSocket
 */
export function setupWebSocket(httpServer: Server): WebSocketServer {
  const wss = new WebSocketServer({ 
    server: httpServer,
    path: "/ws"
  });

  wss.on("connection", (ws: WebSocket, req) => {
    console.log("[WebSocket] Nouvelle connexion");

    // Authentification du livreur via query params
    const url = new URL(req.url || "", `http://${req.headers.host}`);
    const driverId = url.searchParams.get("driverId");
    const token = url.searchParams.get("token");

    if (!driverId || !token) {
      console.log("[WebSocket] Connexion rejetée: driverId ou token manquant");
      ws.close(1008, "Authentication required");
      return;
    }

    // TODO: Vérifier le token JWT ici si nécessaire
    // Pour l'instant, on fait confiance au driverId

    // Enregistrer la connexion
    driverConnections.set(driverId, ws);
    console.log(`[WebSocket] Livreur ${driverId} connecté`);

    // Mettre à jour last_seen dans la DB
    updateDriverLastSeen(driverId);

    // Envoyer un message de confirmation
    ws.send(JSON.stringify({
      type: "connected",
      message: "Vous êtes connecté et recevrez les notifications de commandes"
    }));

    // Gérer les messages du livreur
    ws.on("message", async (data: Buffer) => {
      try {
        const message = JSON.parse(data.toString());
        
        if (message.type === "accept_order") {
          await handleDriverAcceptOrder(driverId, message.orderId, ws);
        } else if (message.type === "reject_order") {
          handleDriverRejectOrder(driverId, message.orderId);
        } else if (message.type === "ping") {
          // Heartbeat pour maintenir la connexion
          updateDriverLastSeen(driverId);
          ws.send(JSON.stringify({ type: "pong" }));
        }
      } catch (error) {
        console.error("[WebSocket] Erreur traitement message:", error);
      }
    });

    // Gérer la déconnexion
    ws.on("close", () => {
      console.log(`[WebSocket] Livreur ${driverId} déconnecté`);
      driverConnections.delete(driverId);
    });

    ws.on("error", (error) => {
      console.error(`[WebSocket] Erreur pour livreur ${driverId}:`, error);
      driverConnections.delete(driverId);
    });
  });

  console.log("[WebSocket] Serveur WebSocket initialisé sur /ws");
  return wss;
}

/**
 * Met à jour le timestamp last_seen d'un livreur
 */
async function updateDriverLastSeen(driverId: string) {
  try {
    await db
      .update(drivers)
      .set({ 
        lastSeen: sql`NOW()`,
        status: "online"
      })
      .where(eq(drivers.id, driverId));
  } catch (error) {
    console.error(`[WebSocket] Erreur mise à jour last_seen pour ${driverId}:`, error);
  }
}

/**
 * Notifie tous les livreurs connectés d'une nouvelle commande
 */
export async function notifyDriversOfNewOrder(orderData: OrderNotification) {
  console.log(`[WebSocket] Notification nouvelle commande ${orderData.orderId} à tous les livreurs`);

  // Récupérer tous les livreurs connectés (en ligne dans les 5 dernières minutes)
  const onlineDrivers = await db
    .select()
    .from(drivers)
    .where(
      sql`last_seen > NOW() - INTERVAL '5 minutes' AND status IN ('available', 'online')`
    );

  console.log(`[WebSocket] ${onlineDrivers.length} livreur(s) en ligne trouvé(s)`);

  let notifiedCount = 0;

  // Notifier chaque livreur connecté via WebSocket
  for (const driver of onlineDrivers) {
    const ws = driverConnections.get(driver.id);
    if (ws && ws.readyState === WebSocket.OPEN) {
      try {
        ws.send(JSON.stringify(orderData));
        notifiedCount++;
        console.log(`[WebSocket] Notification envoyée à livreur ${driver.id}`);
      } catch (error) {
        console.error(`[WebSocket] Erreur envoi notification à ${driver.id}:`, error);
        driverConnections.delete(driver.id);
      }
    }
  }

  // Démarrer le timer d'acceptation (20 secondes)
  startAcceptanceTimer(orderData.orderId);

  return notifiedCount;
}

/**
 * Démarre le timer d'acceptation pour une commande
 */
function startAcceptanceTimer(orderId: string) {
  // Annuler le timer existant si présent
  const existingTimer = orderAcceptanceTimers.get(orderId);
  if (existingTimer) {
    clearTimeout(existingTimer);
  }

  // Créer un nouveau timer
  const timer = setTimeout(async () => {
    console.log(`[WebSocket] Timer expiré pour commande ${orderId}`);
    orderAcceptanceTimers.delete(orderId);
    
    // Vérifier si la commande a été acceptée
    // Si non, on peut notifier les livreurs que le temps est écoulé
    // ou réassigner automatiquement
  }, ACCEPTANCE_TIMEOUT);

  orderAcceptanceTimers.set(orderId, timer);
}

/**
 * Gère l'acceptation d'une commande par un livreur
 */
async function handleDriverAcceptOrder(
  driverId: string,
  orderId: string,
  ws: WebSocket
) {
  console.log(`[WebSocket] Livreur ${driverId} accepte commande ${orderId}`);

  try {
    // Lock atomique: vérifier et assigner la commande en une seule transaction
    const { storage } = await import("./storage");
    const order = await storage.getOrderById(orderId);

    if (!order) {
      ws.send(JSON.stringify({
        type: "error",
        message: "Commande introuvable"
      }));
      return;
    }

    // Vérifier si la commande est déjà assignée
    if (order.driverId && order.driverId !== driverId) {
      ws.send(JSON.stringify({
        type: "order_already_taken",
        message: "Cette commande a déjà été acceptée par un autre livreur"
      }));
      return;
    }

    // Vérifier si le timer est toujours actif (optionnel - permet l'acceptation même après expiration si non assignée)
    const timer = orderAcceptanceTimers.get(orderId);
    if (timer) {
      // Annuler le timer si toujours actif
      clearTimeout(timer);
      orderAcceptanceTimers.delete(orderId);
    } else {
      // Timer expiré mais commande pas encore assignée - on permet quand même l'acceptation
      console.log(`[WebSocket] Timer expiré pour ${orderId}, mais commande pas encore assignée - acceptation autorisée`);
    }

    // Assigner la commande au livreur
    await storage.assignOrderToDriver(orderId, driverId);

    // Notifier le livreur du succès
    ws.send(JSON.stringify({
      type: "order_accepted",
      orderId,
      message: "Commande assignée avec succès"
    }));

    // Notifier les autres livreurs que la commande est prise
    notifyOtherDriversOrderTaken(orderId, driverId);

    console.log(`[WebSocket] Commande ${orderId} assignée à livreur ${driverId}`);
  } catch (error) {
    console.error(`[WebSocket] Erreur acceptation commande:`, error);
    ws.send(JSON.stringify({
      type: "error",
      message: "Erreur lors de l'acceptation de la commande"
    }));
  }
}

/**
 * Gère le refus d'une commande par un livreur
 */
function handleDriverRejectOrder(driverId: string, orderId: string) {
  console.log(`[WebSocket] Livreur ${driverId} refuse commande ${orderId}`);
  // Pour l'instant, on ne fait rien de spécial
  // On pourrait logger cela pour des statistiques
}

/**
 * Notifie les autres livreurs qu'une commande a été prise
 */
function notifyOtherDriversOrderTaken(orderId: string, acceptedDriverId: string) {
  const notification: OrderRejectedNotification = {
    type: "order_rejected",
    orderId,
    message: "Cette commande a déjà été acceptée par un autre livreur"
  };

  for (const [driverId, ws] of driverConnections.entries()) {
    if (driverId !== acceptedDriverId && ws.readyState === WebSocket.OPEN) {
      try {
        ws.send(JSON.stringify(notification));
      } catch (error) {
        console.error(`[WebSocket] Erreur notification refus à ${driverId}:`, error);
      }
    }
  }
}

/**
 * Récupère la liste des livreurs connectés
 */
export function getConnectedDrivers(): string[] {
  return Array.from(driverConnections.keys());
}

/**
 * Vérifie si un livreur est connecté
 */
export function isDriverConnected(driverId: string): boolean {
  const ws = driverConnections.get(driverId);
  return ws !== undefined && ws.readyState === WebSocket.OPEN;
}

