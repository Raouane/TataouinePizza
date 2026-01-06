import { WebSocketServer, WebSocket } from "ws";
import { Server } from "http";
import { db } from "./db";
import { drivers } from "@shared/schema";
import { eq, sql } from "drizzle-orm";
import { verifyToken } from "./auth";
import jwt from "jsonwebtoken";

// Map pour stocker les connexions WebSocket des livreurs
// Key: driverId, Value: WebSocket
const driverConnections = new Map<string, WebSocket>();

// Map pour stocker les timers d'acceptation de commande
// Key: orderId, Value: NodeJS.Timeout
export const orderAcceptanceTimers = new Map<string, NodeJS.Timeout>();

// Map pour stocker les files d'attente Round Robin par commande
// Key: orderId, Value: Array<{ driverId: string; notifiedAt: Date }>
export const orderDriverQueues = new Map<string, Array<{ driverId: string; notifiedAt: Date }>>();

// Map pour stocker les timers de heartbeat par connexion
// Key: driverId, Value: NodeJS.Timeout
const heartbeatTimers = new Map<string, NodeJS.Timeout>();

// Durée du timer d'acceptation (1 minute pour Round Robin)
const ACCEPTANCE_TIMEOUT = 1 * 60 * 1000; // 1 minute (60 secondes)

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
  
  // ✅ NOUVEAU : Démarrer la re-notification périodique
  startPeriodicReNotification();
  
  // ✅ NOUVEAU : Démarrer le job de nettoyage des messages Telegram duplicatas
  startTelegramDuplicateCleanupJob();
  
  // Démarrer le timer d'inactivité
  resetInactivityTimer(wss);

  wss.on("connection", async (ws: WebSocket, req) => {
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

    // ✅ NOUVEAU : Vérifier le token JWT AVANT d'accepter la connexion
    const result = verifyToken(token);
    
    if (!result.valid) {
      if (result.reason === "expired") {
        console.log(`[WebSocket] ❌ Connexion rejetée: token expiré le ${result.expiredAt}`);
        ws.close(1008, "Token expired or invalid");
      } else {
        console.log("[WebSocket] ❌ Connexion rejetée: token invalide");
        ws.close(1008, "Token expired or invalid");
      }
      return;
    }
    
    const decoded = result.decoded;
    
    // ✅ NOUVEAU : Refuser les tokens qui expirent dans < 60 secondes
    const decodedRaw = jwt.decode(token) as any;
    const now = Math.floor(Date.now() / 1000);
    
    if (!decodedRaw?.exp || decodedRaw.exp < now + 60) {
      console.log(`[WebSocket] ❌ Connexion rejetée: token expire dans < 60s (exp: ${new Date(decodedRaw.exp * 1000).toISOString()})`);
      ws.close(1008, "Token expired or too close to expiry");
      return;
    }
    
    // Vérifier que le driverId correspond au token
    if (decoded.id !== driverId) {
      console.log("[WebSocket] ❌ Connexion rejetée: driverId ne correspond pas au token");
      ws.close(1008, "Driver ID mismatch");
      return;
    }
    
    console.log(`[WebSocket] ✅ Token valide pour livreur ${driverId} (expire dans ${decodedRaw.exp - now}s)`);

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
    ws.on("close", async () => {
      console.log(`[WebSocket] Livreur ${driverId} déconnecté`);
      await cleanupDriverConnection(driverId);
    });

    ws.on("error", async (error) => {
      console.error(`[WebSocket] Erreur pour livreur ${driverId}:`, error);
      await cleanupDriverConnection(driverId);
    });
  });

  console.log("[WebSocket] Serveur WebSocket initialisé sur /ws");
  return wss;
}

/**
 * Met à jour le timestamp last_seen d'un livreur (SANS toucher au statut)
 * Le statut est géré UNIQUEMENT par le bouton ON/OFF dans l'app livreur ou l'admin
 */
async function updateDriverLastSeen(driverId: string) {
  try {
    await db
      .update(drivers)
      .set({ 
        lastSeen: sql`NOW()`
        // ✅ Le statut reste tel quel (géré par le bouton ON/OFF)
      })
      .where(eq(drivers.id, driverId));
  } catch (error) {
    console.error(`[WebSocket] Erreur mise à jour last_seen pour ${driverId}:`, error);
  }
}

/**
 * Alerte l'administration quand aucun livreur n'est disponible pour une commande
 * (Log uniquement - pas de webhook n8n)
 */
async function alertAdministrationNoDriversAvailable(orderData: OrderNotification): Promise<void> {
  try {
    console.log('[ADMIN ALERT] 🚨 AUCUN LIVREUR DISPONIBLE - Alerte administration');
    console.log(`[ADMIN ALERT] Commande ${orderData.orderId} en attente - Tous les livreurs sont surchargés`);
    console.log(`[ADMIN ALERT] Client: ${orderData.customerName} - Restaurant: ${orderData.restaurantName}`);
    console.log(`[ADMIN ALERT] Prix: ${orderData.totalPrice} TND - Adresse: ${orderData.address}`);
    // Log uniquement - pas de webhook n8n
  } catch (error: any) {
    console.error('[ADMIN ALERT] ❌ Erreur log alerte administration:', error);
    // Ne pas bloquer le flux si l'alerte échoue
  }
}

/**
 * Notifie tous les livreurs connectés d'une nouvelle commande
 */
export async function notifyDriversOfNewOrder(orderData: OrderNotification) {
  console.log("========================================");
  console.log("[WebSocket] 🔔🔔🔔 NOUVELLE COMMANDE - NOTIFICATION LIVREURS 🔔🔔🔔");
  console.log("[WebSocket] Order ID:", orderData.orderId);
  console.log("[WebSocket] Restaurant:", orderData.restaurantName);
  console.log("[WebSocket] Client:", orderData.customerName);
  console.log("========================================");

  // Récupérer tous les livreurs connectés (en ligne dans les 5 dernières minutes)
  const onlineDrivers = await db
    .select()
    .from(drivers)
      .where(
        sql`last_seen > NOW() - INTERVAL '5 minutes' AND status = 'available'`
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

  // ✅ NOTIFICATIONS PWA DÉSACTIVÉES - On utilise uniquement Telegram
  // try {
  //   const { notifyAllAvailableDriversPush } = await import('./services/push-notification-service.js');
  //   const pushCount = await notifyAllAvailableDriversPush({
  //     id: orderData.orderId,
  //     customerName: orderData.customerName,
  //     address: orderData.address,
  //     totalPrice: orderData.totalPrice,
  //     restaurantName: orderData.restaurantName
  //   });
  //   console.log(`[WebSocket] 📲 ${pushCount} notification(s) push envoyée(s)`);
  // } catch (pushError: any) {
  //   console.error('[WebSocket] ❌ Erreur envoi push notifications:', pushError);
  //   // Ne pas bloquer si push échoue
  // }

  // WHATSAPP DÉSACTIVÉ - On utilise uniquement Telegram
  console.log('[WebSocket] 📱 WhatsApp désactivé - Utilisation uniquement Telegram');

  // Envoyer des notifications Telegram à tous les livreurs disponibles
  try {
    console.log("\n[WebSocket] 📞 ========================================");
    console.log("[WebSocket] 📞 ENVOI NOTIFICATION TELEGRAM");
    console.log("[WebSocket]    Order ID:", orderData.orderId);
    console.log("[WebSocket]    Restaurant:", orderData.restaurantName);
    console.log("[WebSocket]    Client:", orderData.customerName);
    console.log("[WebSocket]    Prix:", orderData.totalPrice);
    console.log("[WebSocket]    Adresse:", orderData.address);
    
    const { telegramService } = await import('./services/telegram-service.js');
    
    // ✅ Vérifier si le bot Telegram est configuré
    if (!telegramService.isReady()) {
      console.error("[WebSocket] ❌❌❌ BOT TELEGRAM NON CONFIGURÉ ❌❌❌");
      console.error("[WebSocket]    Vérifiez que TELEGRAM_BOT_TOKEN est défini dans .env");
      console.error("[WebSocket] ========================================\n");
      await alertAdministrationNoDriversAvailable(orderData);
      return notifiedCount;
    }
    
    console.log("[WebSocket] ✅ Bot Telegram configuré, envoi des notifications...");
    
    const telegramCount = await telegramService.sendToAllAvailableDrivers(
      orderData.orderId,
      orderData.restaurantName,
      orderData.customerName,
      orderData.totalPrice,
      orderData.address
    );
    
    console.log(`[WebSocket] 📱 Résultat: ${telegramCount} notification(s) Telegram envoyée(s)`);
    console.log("[WebSocket] ========================================\n");
    
    // Démarrer le timer Round Robin si un livreur a été notifié
    if (telegramCount > 0) {
      console.log("[WebSocket] ✅ Timer Round Robin démarré");
      startRoundRobinTimer(
        orderData.orderId,
        orderData.restaurantName,
        orderData.customerName,
        orderData.totalPrice,
        orderData.address
      );
    } else {
      console.warn("[WebSocket] ⚠️ Aucun livreur notifié - alerte administration");
      // Aucun livreur disponible - alerter l'administration
      await alertAdministrationNoDriversAvailable(orderData);
    }
  } catch (telegramError: any) {
    console.error('\n[WebSocket] ❌❌❌ ERREUR ENVOI TELEGRAM ❌❌❌');
    console.error('[WebSocket]    Erreur:', telegramError.message);
    console.error('[WebSocket]    Stack:', telegramError.stack);
    console.error("[WebSocket] ========================================\n");
    // Alerter l'administration même en cas d'erreur
    await alertAdministrationNoDriversAvailable(orderData);
  }

  // Réinitialiser le timer d'inactivité car il y a une nouvelle commande
  if (wssInstance) {
    resetInactivityTimer(wssInstance);
  }

  return notifiedCount;
}

/**
 * PROMPT 3: Démarre le timer Round Robin (2 minutes) pour une commande
 * Si pas d'acceptation, passe au livreur suivant dans la file
 */
export async function startRoundRobinTimer(
  orderId: string,
  restaurantName: string,
  customerName: string,
  totalPrice: string,
  address: string
): Promise<void> {
  // Annuler le timer existant si présent
  const existingTimer = orderAcceptanceTimers.get(orderId);
  if (existingTimer) {
    clearTimeout(existingTimer);
  }

  // Créer un nouveau timer de 1 minute
  const timer = setTimeout(async () => {
    console.log(`[Round Robin] ⏱️ Timer expiré (1 min) pour commande ${orderId}`);
    
    // Vérifier si la commande a été acceptée
    const { storage } = await import("./storage.js");
    const order = await storage.getOrderById(orderId);
    
    if (order && !order.driverId) {
      // Commande pas encore acceptée, passer au livreur suivant
      console.log(`[Round Robin] 🔄 Commande ${orderId} non acceptée, passage au livreur suivant...`);
      
      const { notifyNextDriverInQueue } = await import("./services/sms-service.js");
      await notifyNextDriverInQueue(orderId, restaurantName, customerName, totalPrice, address);
    } else {
      // Commande acceptée, nettoyer la file
      console.log(`[Round Robin] ✅ Commande ${orderId} acceptée, nettoyage de la file`);
      orderDriverQueues.delete(orderId);
      orderAcceptanceTimers.delete(orderId);
    }
  }, ACCEPTANCE_TIMEOUT);

  orderAcceptanceTimers.set(orderId, timer);
  console.log(`[Round Robin] ⏱️ Timer de 1 minute démarré pour commande ${orderId}`);
}

/**
 * Démarre le timer d'acceptation pour une commande (ancienne version, conservée pour compatibilité)
 */
function startAcceptanceTimer(orderId: string) {
  startRoundRobinTimer(orderId, "", "", "", "");
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
  const timer = setTimeout(async () => {
    console.log(`[WebSocket] Heartbeat timeout pour livreur ${driverId} - fermeture de la connexion`);
    if (ws.readyState === WebSocket.OPEN) {
      ws.close(1000, "Heartbeat timeout");
    }
    await cleanupDriverConnection(driverId);
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
 * 🛡️ RÈGLE D'OR : Le statut est piloté par l'INTENTION de l'humain, pas par l'état de la socket.
 * 
 * - "available" et "offline" sont des choix explicites via le bouton ON/OFF → JAMAIS modifiés automatiquement
 * - "on_delivery" est un statut transitoire de travail
 * - La perte de connexion WebSocket ne doit JAMAIS changer un statut intentionnel
 */
async function cleanupDriverConnection(driverId: string) {
  console.log(`[WebSocket] 🧹 Nettoyage connexion pour livreur ${driverId}`);
  
  driverConnections.delete(driverId);
  const heartbeatTimer = heartbeatTimers.get(driverId);
  if (heartbeatTimer) {
    clearTimeout(heartbeatTimer);
    heartbeatTimers.delete(driverId);
  }
  
  // 🛡️ RÈGLE STRICTE : Ne JAMAIS modifier les statuts intentionnels ("available" ou "offline")
  // La déconnexion WebSocket (perte réseau, etc.) ne doit JAMAIS changer le statut intentionnel
  // Seul le bouton ON/OFF peut changer entre "available" et "offline"
  try {
    console.log(`[WebSocket] 🔍 Vérification statut pour livreur ${driverId}...`);
    const { storage } = await import("./storage.js");
    const driver = await storage.getDriverById(driverId);
    
    if (!driver) {
      console.log(`[WebSocket] ⚠️ Livreur ${driverId} non trouvé`);
      return;
    }
    
    // 🛡️ RÈGLE CRITIQUE : Les statuts "available" et "offline" sont des choix explicites
    // → NE JAMAIS les modifier, même en cas de déconnexion WebSocket
    if (driver.status === "available" || driver.status === "offline") {
      console.log(`[WebSocket] ✅ Livreur ${driverId} en "${driver.status}" (choix explicite via bouton ON/OFF), statut préservé malgré déconnexion WebSocket`);
      // Mettre à jour last_seen pour éviter le nettoyage automatique à 10h
      await db
        .update(drivers)
        .set({ lastSeen: sql`NOW()` })
        .where(eq(drivers.id, driverId));
      return;
    }
    
    // Vérifier les commandes actives (uniquement pour le statut "on_delivery")
    const driverOrders = await storage.getOrdersByDriver(driverId);
    console.log(`[WebSocket] 📋 Livreur ${driverId}: ${driverOrders.length} commande(s) totale(s) trouvée(s)`);
    
    // Inclure aussi les commandes "received" avec driverId (elles sont assignées au livreur)
    const activeOrders = driverOrders.filter(o => 
      o.status === "delivery" || o.status === "accepted" || o.status === "ready" || o.status === "received"
    );
    
    console.log(`[WebSocket] 📊 Livreur ${driverId}: ${activeOrders.length} commande(s) active(s)`);
    
    if (activeOrders.length > 0) {
      console.log(`[WebSocket] 📋 Détails des commandes actives:`);
      activeOrders.forEach((order, index) => {
        console.log(`[WebSocket]   ${index + 1}. Commande ${order.id.slice(0, 8)} - Statut: ${order.status}`);
      });
      // Le livreur a des commandes actives, garder "on_delivery"
      console.log(`[WebSocket] ⚠️ Livreur ${driverId} déconnecté mais garde statut "on_delivery" (${activeOrders.length} commande(s) active(s))`);
      return;
    }
    
    // Aucune commande active ET statut "on_delivery"
    // ✅ CORRECTION : Si le livreur n'a plus de commandes actives, le remettre en "available"
    // (statut de travail par défaut). On suppose qu'il était en "available" avant d'accepter la commande
    // car un livreur "offline" ne peut pas accepter de commandes.
    if (driver.status === "on_delivery") {
      console.log(`[WebSocket] 🔄 Livreur ${driverId} n'a plus de commandes actives, remise en "available" (retour au statut de travail par défaut)`);
      await storage.updateDriver(driverId, { status: "available" });
      console.log(`[WebSocket] ✅ Livreur ${driverId} remis en "available" (aucune commande active, prêt pour nouvelles commandes)`);
    }
    // Si le statut n'est ni "available", ni "offline", ni "on_delivery", on ne le modifie pas
  } catch (error) {
    console.error(`[WebSocket] ❌ Erreur lors de la mise à jour du statut du livreur ${driverId}:`, error);
    console.error(`[WebSocket] ❌ Stack trace:`, error instanceof Error ? error.stack : 'N/A');
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
 * Re-notifie un livreur des commandes en attente après qu'il ait terminé une livraison
 * @param driverId ID du livreur qui vient de terminer une livraison
 */
export async function checkAndNotifyPendingOrdersForDriver(driverId: string): Promise<void> {
  console.log(`[Re-Notification] 🔍 Vérification pour livreur ${driverId}...`);
  
  try {
    const { storage } = await import("./storage.js");
    
    // 1. Vérifier que le livreur existe et est disponible
    const driver = await storage.getDriverById(driverId);
    if (!driver) {
      console.log(`[Re-Notification] ❌ Livreur ${driverId} non trouvé`);
      return;
    }
    
    // 2. Vérifier le statut du livreur
    if (driver.status !== 'available' && driver.status !== 'on_delivery') {
      console.log(`[Re-Notification] ⏭️ Livreur ${driverId} non disponible (status: ${driver.status})`);
      return;
    }
    
    // 3. Compter les commandes actives du livreur
    // ✅ CORRECTION : Inclure aussi les commandes "received" avec driverId (elles sont assignées au livreur)
    const driverOrders = await storage.getOrdersByDriver(driverId);
    const activeOrders = driverOrders.filter(o => 
      (o.status === 'delivery' || o.status === 'accepted' || o.status === 'ready' || o.status === 'received') &&
      o.driverId !== null
    );
    
    const MAX_ACTIVE_ORDERS_PER_DRIVER = 2;
    
    if (activeOrders.length >= MAX_ACTIVE_ORDERS_PER_DRIVER) {
      console.log(`[Re-Notification] ⏭️ Livreur ${driverId} a déjà ${activeOrders.length} commande(s) active(s)`);
      return;
    }
    
    console.log(`[Re-Notification] ✅ Livreur ${driverId} peut accepter (${activeOrders.length}/${MAX_ACTIVE_ORDERS_PER_DRIVER} commande(s))`);
    
    // 4. Récupérer les commandes en attente (sans driverId)
    const pendingOrders = await storage.getPendingOrdersWithoutDriver(5); // Limite à 5
    
    if (pendingOrders.length === 0) {
      console.log(`[Re-Notification] ⏭️ Aucune commande en attente`);
      return;
    }
    
    console.log(`[Re-Notification] 📋 ${pendingOrders.length} commande(s) en attente trouvée(s)`);
    
    // 5. Notifier le livreur pour la première commande en attente
    const orderToNotify = pendingOrders[0];
    
    // Vérifier à nouveau que le livreur peut accepter (éviter race condition)
    // ✅ CORRECTION : Inclure aussi les commandes "received" avec driverId
    const currentDriverOrders = await storage.getOrdersByDriver(driverId);
    const currentActiveOrders = currentDriverOrders.filter(o => 
      (o.status === 'delivery' || o.status === 'accepted' || o.status === 'ready' || o.status === 'received') &&
      o.driverId !== null
    );
    
    if (currentActiveOrders.length >= MAX_ACTIVE_ORDERS_PER_DRIVER) {
      console.log(`[Re-Notification] ⏭️ Livreur ${driverId} a maintenant ${currentActiveOrders.length} commande(s) (limite atteinte)`);
      return;
    }
    
    // Vérifier que la commande n'a pas été assignée entre-temps
    const currentOrder = await storage.getOrderById(orderToNotify.id);
    if (currentOrder.driverId !== null) {
      console.log(`[Re-Notification] ⏭️ Commande ${orderToNotify.id} déjà assignée à un autre livreur`);
      return;
    }
    
    // 6. Enrichir la commande avec les détails du restaurant
    const { OrderEnrichmentService } = await import("./services/order-enrichment-service.js");
    const enrichedOrder = await OrderEnrichmentService.enrichWithRestaurant(orderToNotify);
    
    // 7. Envoyer notification via UN SEUL canal (priorité)
    console.log(`[Re-Notification] 📤 Notification commande ${orderToNotify.id} à livreur ${driverId}`);
    
    // Priorité : WebSocket > Push > Telegram
    if (isDriverConnected(driverId)) {
      // Canal 1 : WebSocket (si connecté)
      const ws = driverConnections.get(driverId);
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
          type: "new_order",
          orderId: orderToNotify.id,
          restaurantName: enrichedOrder.restaurantName || "Restaurant",
          customerName: orderToNotify.customerName,
          address: orderToNotify.address,
          totalPrice: orderToNotify.totalPrice,
          items: orderToNotify.items || []
        }));
        console.log(`[Re-Notification] ✅ Notification WebSocket envoyée`);
        return; // Ne pas envoyer sur les autres canaux
      }
    }
    
    // ✅ NOTIFICATIONS PWA DÉSACTIVÉES
    // Canal 2 : Push (si disponible) - DÉSACTIVÉ
    // if (driver.pushSubscription) {
    //   const { sendPushNotificationToDriver } = await import("./services/push-notification-service.js");
    //   await sendPushNotificationToDriver(driverId, {
    //     title: "Nouvelle commande disponible",
    //     body: `${enrichedOrder.restaurantName || "Restaurant"} - ${orderToNotify.customerName}`,
    //     orderId: orderToNotify.id,
    //     url: `/driver/dashboard?order=${orderToNotify.id}`
    //   });
    //   console.log(`[Re-Notification] ✅ Notification Push envoyée`);
    //   return; // Ne pas envoyer sur Telegram
    // }
    
    // Canal 3 : Telegram (fallback)
    if (driver.telegramId) {
      const { telegramService } = await import("./services/telegram-service.js");
      await telegramService.sendOrderNotification(
        driver.telegramId,
        orderToNotify.id,
        orderToNotify.customerName,
        orderToNotify.totalPrice,
        orderToNotify.address,
        enrichedOrder.restaurantName || "Restaurant",
        driverId
      );
      console.log(`[Re-Notification] ✅ Notification Telegram envoyée`);
    }
    
    console.log(`[Re-Notification] ✅ Re-notification envoyée avec succès`);
    
  } catch (error: any) {
    console.error(`[Re-Notification] ❌ Erreur:`, error);
    console.error(`[Re-Notification] ❌ Stack:`, error.stack);
  }
}

/**
 * Re-notification périodique des commandes en attente
 * Vérifie toutes les 1 minute s'il y a des commandes en attente
 * et des livreurs disponibles
 */
function startPeriodicReNotification(): void {
  const RE_NOTIFICATION_INTERVAL_MS = 1 * 60 * 1000; // 1 minute
  
  setInterval(async () => {
    try {
      console.log("[Periodic Re-Notification] 🔄 Vérification périodique...");
      
      const { storage } = await import("./storage.js");
      
      // 1. Récupérer UNIQUEMENT les commandes en attente (optimisation)
      const pendingOrders = await storage.getPendingOrdersWithoutDriver(10); // Limite à 10
      
      if (pendingOrders.length === 0) {
        console.log("[Periodic Re-Notification] ⏭️ Aucune commande en attente");
        return;
      }
      
      console.log(`[Periodic Re-Notification] 📋 ${pendingOrders.length} commande(s) en attente`);
      
      // 2. Récupérer tous les livreurs disponibles
      const allDrivers = await storage.getAllDrivers();
      const MAX_ACTIVE_ORDERS_PER_DRIVER = 2;
      
      const availableDrivers = await Promise.all(
        allDrivers
          .filter(d => d.status === 'available' || d.status === 'on_delivery')
          .map(async (driver) => {
            const driverOrders = await storage.getOrdersByDriver(driver.id);
            // ✅ CORRECTION : Inclure aussi les commandes "received" avec driverId
            const activeOrders = driverOrders.filter(o => 
              (o.status === 'delivery' || o.status === 'accepted' || o.status === 'ready' || o.status === 'received') &&
              o.driverId !== null
            );
            
            return {
              driver,
              activeOrdersCount: activeOrders.length,
              canAcceptMore: activeOrders.length < MAX_ACTIVE_ORDERS_PER_DRIVER
            };
          })
      );
      
      const trulyAvailableDrivers = availableDrivers
        .filter(({ canAcceptMore }) => canAcceptMore)
        .map(({ driver }) => driver);
      
      if (trulyAvailableDrivers.length === 0) {
        console.log("[Periodic Re-Notification] ⏭️ Aucun livreur disponible");
        return;
      }
      
      console.log(`[Periodic Re-Notification] 📋 ${trulyAvailableDrivers.length} livreur(s) disponible(s)`);
      
      // 3. Notifier les livreurs disponibles pour les commandes en attente
      // Une commande par livreur (éviter le spam)
      for (let i = 0; i < Math.min(pendingOrders.length, trulyAvailableDrivers.length); i++) {
        const order = pendingOrders[i];
        const driver = trulyAvailableDrivers[i];
        
        // Vérifier à nouveau que le livreur peut accepter
        // ✅ CORRECTION : Inclure aussi les commandes "received" avec driverId
        const driverOrders = await storage.getOrdersByDriver(driver.id);
        const activeOrders = driverOrders.filter(o => 
          (o.status === 'delivery' || o.status === 'accepted' || o.status === 'ready' || o.status === 'received') &&
          o.driverId !== null
        );
        
        if (activeOrders.length < MAX_ACTIVE_ORDERS_PER_DRIVER) {
          // Vérifier que la commande n'a pas été assignée entre-temps
          const currentOrder = await storage.getOrderById(order.id);
          if (currentOrder.driverId !== null) {
            console.log(`[Periodic Re-Notification] ⏭️ Commande ${order.id} déjà assignée`);
            continue;
          }
          
          // Re-notifier le livreur
          await checkAndNotifyPendingOrdersForDriver(driver.id);
        }
      }
      
    } catch (error: any) {
      console.error("[Periodic Re-Notification] ❌ Erreur:", error);
    }
  }, RE_NOTIFICATION_INTERVAL_MS);
  
  console.log("[Periodic Re-Notification] ✅ Timer démarré (intervalle: 1 minute)");
}

/**
 * Job périodique pour supprimer les messages Telegram duplicatas programmés
 * Vérifie toutes les minutes les messages avec scheduled_deletion_at <= NOW()
 * et les supprime automatiquement
 */
function startTelegramDuplicateCleanupJob(): void {
  const CLEANUP_INTERVAL_MS = 1 * 60 * 1000; // 1 minute
  
  // Exécuter immédiatement au démarrage
  cleanupScheduledTelegramMessages();
  
  // Puis exécuter périodiquement
  setInterval(async () => {
    await cleanupScheduledTelegramMessages();
  }, CLEANUP_INTERVAL_MS);
  
  console.log("[Telegram Cleanup] ✅ Job de nettoyage des duplicatas démarré (intervalle: 1 minute)");
}

/**
 * Nettoie les messages Telegram programmés pour suppression
 */
async function cleanupScheduledTelegramMessages(): Promise<void> {
  try {
    const { storage } = await import("./storage.js");
    const { telegramService } = await import("./services/telegram-service.js");
    
    console.log("[Telegram Cleanup] 🔍 Vérification des messages programmés pour suppression...");
    
    const messagesToDelete = await storage.getTelegramMessagesScheduledForDeletion();
    
    if (messagesToDelete.length === 0) {
      console.log("[Telegram Cleanup] ⏭️ Aucun message à supprimer");
      return;
    }
    
    console.log(`[Telegram Cleanup] 📋 ${messagesToDelete.length} message(s) duplicata(s) à supprimer`);
    
    let deletedCount = 0;
    let errorCount = 0;
    
    for (const msg of messagesToDelete) {
      try {
        // Supprimer le message via l'API Telegram
        const deleteResult = await telegramService.deleteMessage(msg.chatId, msg.messageId);
        
        if (deleteResult.success) {
          // Marquer comme supprimé dans la DB
          await storage.markTelegramMessageAsDeleted(msg.id);
          deletedCount++;
          console.log(`[Telegram Cleanup] ✅ Duplicata ${msg.messageId} supprimé (commande: ${msg.orderId.slice(0, 8)})`);
        } else {
          console.error(`[Telegram Cleanup] ⚠️ Erreur suppression message ${msg.messageId}:`, deleteResult.error);
          errorCount++;
        }
      } catch (error: any) {
        console.error(`[Telegram Cleanup] ⚠️ Erreur suppression message ${msg.messageId}:`, error);
        errorCount++;
        // Continuer même si un message échoue
      }
    }
    
    console.log(`[Telegram Cleanup] ✅ Nettoyage terminé: ${deletedCount} supprimé(s), ${errorCount} erreur(s)`);
  } catch (error: any) {
    console.error("[Telegram Cleanup] ❌ Erreur lors du nettoyage:", error);
    console.error("[Telegram Cleanup] ❌ Stack:", error.stack);
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
      await cleanupDriverConnection(driverId);
    }

    // Nettoyer les timers expirés (ils se nettoient normalement, mais on vérifie)
    const expiredTimers: string[] = [];
    for (const [orderId, timer] of orderAcceptanceTimers.entries()) {
      // Les timers sont automatiquement nettoyés, mais on peut vérifier s'ils sont toujours valides
      // (cette vérification est optionnelle car les timers se nettoient eux-mêmes)
    }

    // 🛡️ RÈGLE STRICTE : Le statut est géré UNIQUEMENT par :
    // - Le bouton ON/OFF dans l'app livreur (via /api/driver/toggle-status)
    // - L'admin depuis le panneau admin
    // 
    // ❌ SUPPRESSION : Plus de timeout automatique qui met en "offline"
    // Le choix explicite du livreur est sacré. Si un livreur décide de se mettre
    // "En pause" ou "Hors ligne", le système ne doit JAMAIS le forcer à repasser en ligne
    // simplement à cause d'un bug de connexion ou d'une fin de commande.
    // 
    // Note: On garde juste la mise à jour de last_seen pour le suivi, mais on ne change
    // jamais le statut automatiquement.

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

