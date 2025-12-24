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

// Map pour stocker les timers de heartbeat par connexion
// Key: driverId, Value: NodeJS.Timeout
const heartbeatTimers = new Map<string, NodeJS.Timeout>();

// Durée du timer d'acceptation (20 secondes)
const ACCEPTANCE_TIMEOUT = 20000; // 20 secondes

// Timeout pour le heartbeat (30 secondes d'inactivité = connexion morte)
const HEARTBEAT_TIMEOUT = 30000; // 30 secondes

// Intervalle de nettoyage (5 minutes)
const CLEANUP_INTERVAL = 5 * 60 * 1000; // 5 minutes

// Timeout pour fermer le WebSocket si pas d'activité (10 minutes)
const INACTIVITY_TIMEOUT = 10 * 60 * 1000; // 10 minutes
let inactivityTimer: NodeJS.Timeout | null = null;
let wssInstance: WebSocketServer | null = null;

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

  wssInstance = wss;

  // Démarrer le nettoyage périodique
  startPeriodicCleanup(wss);
  
  // Démarrer le timer d'inactivité
  resetInactivityTimer(wss);

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

    // Réinitialiser le timer d'inactivité
    resetInactivityTimer(wss);

    // Mettre à jour last_seen dans la DB
    updateDriverLastSeen(driverId);

    // Démarrer le heartbeat pour cette connexion
    startHeartbeat(driverId, ws);

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
          resetHeartbeat(driverId, ws);
          ws.send(JSON.stringify({ type: "pong" }));
          // Réinitialiser le timer d'inactivité
          resetInactivityTimer(wss);
        }
      } catch (error) {
        console.error("[WebSocket] Erreur traitement message:", error);
      }
    });

    // Gérer la déconnexion
    ws.on("close", () => {
      console.log(`[WebSocket] Livreur ${driverId} déconnecté`);
      cleanupDriverConnection(driverId);
    });

    ws.on("error", (error) => {
      console.error(`[WebSocket] Erreur pour livreur ${driverId}:`, error);
      cleanupDriverConnection(driverId);
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

  // Envoyer aussi des SMS à tous les livreurs disponibles
  console.log('[WebSocket] 📱 Tentative d\'envoi SMS pour commande:', orderData.orderId.slice(0, 8));
  try {
    const { sendSMSToDrivers } = await import('./services/sms-service.js');
    const { storage } = await import('./storage.js');
    
    console.log('[WebSocket] 📱 Récupération des données de la commande depuis la DB...');
    
    // Récupérer les informations complètes de la commande depuis la DB
    const order = await storage.getOrderById(orderData.orderId);
    let restaurantAddress: string | undefined;
    let customerPhone: string | undefined;
    
    if (order) {
      customerPhone = order.phone;
      console.log('[WebSocket] 📱 Commande trouvée, téléphone client:', customerPhone);
      
      // Récupérer l'adresse du restaurant
      if (order.restaurantId) {
        const restaurant = await storage.getRestaurantById(order.restaurantId);
        if (restaurant) {
          restaurantAddress = restaurant.address;
          console.log('[WebSocket] 📱 Restaurant trouvé, adresse:', restaurantAddress);
        } else {
          console.warn('[WebSocket] ⚠️ Restaurant non trouvé pour ID:', order.restaurantId);
        }
      } else {
        console.warn('[WebSocket] ⚠️ Commande sans restaurantId');
      }
    } else {
      console.error('[WebSocket] ❌ Commande non trouvée dans la DB:', orderData.orderId);
    }
    
    console.log('[WebSocket] 📱 Appel de sendSMSToDrivers avec:', {
      orderId: orderData.orderId.slice(0, 8),
      restaurantName: orderData.restaurantName,
      customerName: orderData.customerName,
      totalPrice: orderData.totalPrice,
      address: orderData.address,
      restaurantAddress: restaurantAddress || 'non trouvé',
      customerPhone: customerPhone || 'non trouvé',
      itemsCount: orderData.items?.length || 0
    });
    
    await sendSMSToDrivers(
      orderData.orderId,
      orderData.restaurantName,
      orderData.customerName,
      orderData.totalPrice,
      999, // maxDrivers
      orderData.address, // Adresse client
      restaurantAddress, // Adresse restaurant
      customerPhone, // Téléphone client
      orderData.items // Articles de la commande
    );
    
    console.log('[WebSocket] ✅ sendSMSToDrivers appelé avec succès');
  } catch (smsError: any) {
    console.error('[WebSocket] ❌ Erreur envoi SMS:', smsError);
    console.error('[WebSocket] ❌ Stack trace:', smsError.stack);
    // Ne pas bloquer si SMS échoue
  }

  // Démarrer le timer d'acceptation (20 secondes)
  startAcceptanceTimer(orderData.orderId);

  // Réinitialiser le timer d'inactivité car il y a une nouvelle commande
  if (wssInstance) {
    resetInactivityTimer(wssInstance);
  }

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
    // Utiliser le service centralisé pour l'acceptation
    const { OrderAcceptanceService } = await import("./services/order-acceptance-service");
    const { storage } = await import("./storage");
    
    const acceptedOrder = await OrderAcceptanceService.acceptOrder(orderId, driverId);

    if (!acceptedOrder) {
      // La commande a été prise entre-temps par un autre livreur
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

    // Récupérer les infos du livreur pour la notification
    const driver = await storage.getDriverById(driverId);

    // Notifier le livreur du succès
    ws.send(JSON.stringify({
      type: "order_accepted",
      orderId,
      message: "Commande assignée avec succès"
    }));

    // Notifier les autres livreurs que la commande est prise
    notifyOtherDriversOrderTaken(orderId, driverId);

    console.log(`[WebSocket] Commande ${orderId} assignée à livreur ${driverId}`);
  } catch (error: any) {
    console.error(`[WebSocket] Erreur acceptation commande:`, error);
    
    // Gérer les erreurs spécifiques
    if (error.statusCode === 404) {
      ws.send(JSON.stringify({
        type: "error",
        message: "Commande introuvable"
      }));
    } else if (error.statusCode === 400) {
      ws.send(JSON.stringify({
        type: "order_already_taken",
        message: error.message || "Cette commande a déjà été acceptée par un autre livreur"
      }));
    } else {
      ws.send(JSON.stringify({
        type: "error",
        message: "Erreur lors de l'acceptation de la commande"
      }));
    }
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
 * Démarre le heartbeat pour une connexion
 */
function startHeartbeat(driverId: string, ws: WebSocket) {
  // Nettoyer le timer existant
  const existingTimer = heartbeatTimers.get(driverId);
  if (existingTimer) {
    clearTimeout(existingTimer);
  }

  // Créer un nouveau timer
  const timer = setTimeout(() => {
    console.log(`[WebSocket] Heartbeat timeout pour livreur ${driverId} - fermeture de la connexion`);
    if (ws.readyState === WebSocket.OPEN) {
      ws.close(1000, "Heartbeat timeout");
    }
    cleanupDriverConnection(driverId);
  }, HEARTBEAT_TIMEOUT);

  heartbeatTimers.set(driverId, timer);
}

/**
 * Réinitialise le heartbeat pour une connexion
 */
function resetHeartbeat(driverId: string, ws: WebSocket) {
  startHeartbeat(driverId, ws);
}

/**
 * Nettoie les ressources d'une connexion livreur
 */
function cleanupDriverConnection(driverId: string) {
  driverConnections.delete(driverId);
  const heartbeatTimer = heartbeatTimers.get(driverId);
  if (heartbeatTimer) {
    clearTimeout(heartbeatTimer);
    heartbeatTimers.delete(driverId);
  }
}

/**
 * Réinitialise le timer d'inactivité globale
 */
function resetInactivityTimer(wss: WebSocketServer) {
  if (inactivityTimer) {
    clearTimeout(inactivityTimer);
  }

  inactivityTimer = setTimeout(async () => {
    console.log("[WebSocket] Vérification de l'inactivité...");
    
    const hasConnectedDrivers = driverConnections.size > 0;
    const hasPendingOrders = await checkPendingOrders();
    const hasActiveTimers = orderAcceptanceTimers.size > 0;

    if (!hasConnectedDrivers && !hasPendingOrders && !hasActiveTimers) {
      console.log("[WebSocket] Aucune activité - WebSocket en veille (connexions maintenues mais pas de traitement actif)");
      // On ne ferme pas le serveur WebSocket, mais on arrête les timers inutiles
    } else {
      console.log(`[WebSocket] Activité détectée: ${driverConnections.size} livreur(s), ${hasPendingOrders ? 'commandes en attente' : 'pas de commandes'}, ${orderAcceptanceTimers.size} timer(s) actif(s)`);
      // Réinitialiser le timer
      resetInactivityTimer(wss);
    }
  }, INACTIVITY_TIMEOUT);
}

/**
 * Vérifie s'il y a des commandes en attente
 */
async function checkPendingOrders(): Promise<boolean> {
  try {
    const { storage } = await import("./storage");
    const orders = await storage.getAllOrders();
    const pendingOrders = orders.filter(
      (order) => 
        order.status === "pending" || 
        order.status === "accepted" || 
        (order.status === "ready" && !order.driverId)
    );
    return pendingOrders.length > 0;
  } catch (error) {
    console.error("[WebSocket] Erreur vérification commandes:", error);
    return false;
  }
}

/**
 * Nettoie périodiquement les connexions inactives et les timers expirés
 */
function startPeriodicCleanup(wss: WebSocketServer) {
  setInterval(async () => {
    console.log("[WebSocket] Nettoyage périodique...");
    
    // Nettoyer les connexions mortes
    const deadConnections: string[] = [];
    for (const [driverId, ws] of driverConnections.entries()) {
      if (ws.readyState !== WebSocket.OPEN) {
        deadConnections.push(driverId);
      }
    }
    
    for (const driverId of deadConnections) {
      console.log(`[WebSocket] Suppression connexion morte: ${driverId}`);
      cleanupDriverConnection(driverId);
    }

    // Nettoyer les timers expirés (ils se nettoient normalement, mais on vérifie)
    const expiredTimers: string[] = [];
    for (const [orderId, timer] of orderAcceptanceTimers.entries()) {
      // Les timers sont automatiquement nettoyés, mais on peut vérifier s'ils sont toujours valides
      // (cette vérification est optionnelle car les timers se nettoient eux-mêmes)
    }

    // Mettre à jour le statut des livreurs inactifs dans la DB
    try {
      await db
        .update(drivers)
        .set({ 
          status: sql`CASE 
            WHEN last_seen < NOW() - INTERVAL '5 minutes' THEN 'offline'
            ELSE status
          END`
        })
        .where(sql`last_seen < NOW() - INTERVAL '5 minutes' AND status = 'online'`);
    } catch (error) {
      console.error("[WebSocket] Erreur mise à jour statut livreurs:", error);
    }

    const activeConnections = driverConnections.size;
    const activeTimers = orderAcceptanceTimers.size;
    const hasPending = await checkPendingOrders();

    console.log(`[WebSocket] État: ${activeConnections} connexion(s), ${activeTimers} timer(s), ${hasPending ? 'commandes en attente' : 'pas de commandes'}`);

    // Si aucune activité, on peut réduire la fréquence des vérifications
    if (activeConnections === 0 && activeTimers === 0 && !hasPending) {
      console.log("[WebSocket] Mode veille - aucune activité détectée");
    }
  }, CLEANUP_INTERVAL);
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

