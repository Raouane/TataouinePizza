/**
 * Service pour envoyer des notifications push PWA aux livreurs
 * Utilise Web Push API pour envoyer des notifications même quand l'app est fermée
 */

import webpush from 'web-push';
import { storage } from '../storage.js';

// Configuration VAPID (clés générées avec: npx web-push generate-vapid-keys)
const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY || 'BG3QiM5q-uSGOP_2W_Hl83Db6NLsa8Q-Ag26TzwLaBKtUhoWTNwnWKbG0vvFs7VL4Y1xHDqfhKaFKgpaJz6Ypzo';
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || 'aj7cgstQa-DT16_mJcIX2lK6uIkPt6bCTgGwiidJ0xo';
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || 'mailto:contact@tataouine-pizza.com';

// Configurer VAPID
webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

export interface PushNotificationData {
  title: string;
  body: string;
  orderId: string;
  url?: string;
  icon?: string;
  badge?: string;
}

/**
 * Envoie une notification push à un livreur
 * @param driverId ID du livreur
 * @param notification Données de la notification
 */
export async function sendPushNotificationToDriver(
  driverId: string,
  notification: PushNotificationData
): Promise<boolean> {
  try {
    // Récupérer le livreur depuis la DB
    const driver = await storage.getDriverById(driverId);
    if (!driver) {
      console.log(`[Push] ❌ Livreur ${driverId} non trouvé`);
      return false;
    }

    // Vérifier si le livreur a une subscription
    if (!driver.pushSubscription) {
      console.log(`[Push] ⚠️ Pas de subscription push pour livreur ${driverId}`);
      return false;
    }

    // Parser la subscription
    let subscription;
    try {
      subscription = typeof driver.pushSubscription === 'string' 
        ? JSON.parse(driver.pushSubscription)
        : driver.pushSubscription;
    } catch (error) {
      console.error(`[Push] ❌ Erreur parsing subscription pour ${driverId}:`, error);
      // Supprimer la subscription invalide
      await storage.updateDriver(driverId, { pushSubscription: null });
      return false;
    }

    // Préparer les données de la notification
    // IMPORTANT: Le son système fonctionne même quand le téléphone est éteint
    // Le son par défaut du système est utilisé automatiquement si silent: false
    const payload = JSON.stringify({
      title: notification.title,
      body: notification.body,
      icon: notification.icon || '/favicon-32x32.png',
      badge: notification.badge || '/favicon-32x32.png',
      vibrate: [200, 100, 200, 100, 200], // Vibration sur mobile
      silent: false, // Activer le son système (fonctionne même téléphone éteint)
      requireInteraction: true, // Nécessite une interaction pour se fermer
      tag: `order-${notification.orderId}`, // Tag pour regrouper les notifications
      data: {
        orderId: notification.orderId,
        url: notification.url || `/driver/orders/${notification.orderId}`
      }
    });

    // Envoyer la notification
    await webpush.sendNotification(subscription, payload);

    console.log(`[Push] ✅ Notification envoyée à livreur ${driverId} (${driver.name})`);
    return true;
  } catch (error: any) {
    console.error(`[Push] ❌ Erreur envoi notification à ${driverId}:`, error.message);

    // Si la subscription est invalide (410 Gone ou 404 Not Found), la supprimer
    if (error.statusCode === 410 || error.statusCode === 404) {
      console.log(`[Push] 🗑️ Subscription invalide, suppression pour ${driverId}`);
      await storage.updateDriver(driverId, { pushSubscription: null });
    }

    return false;
  }
}

/**
 * Envoie une notification push à tous les livreurs disponibles
 * @param order Données de la commande
 */
export async function notifyAllAvailableDriversPush(
  order: {
    id: string;
    customerName: string;
    address: string;
    totalPrice: string;
    restaurantName?: string;
  }
): Promise<number> {
  try {
    // Récupérer tous les livreurs disponibles
    const availableDrivers = await storage.getAvailableDrivers();
    
    if (availableDrivers.length === 0) {
      console.log('[Push] ⚠️ Aucun livreur disponible');
      return 0;
    }

    // Préparer la notification
    const notification: PushNotificationData = {
      title: '📦 Nouvelle commande!',
      body: `${order.customerName} - ${order.totalPrice} DT\n📍 ${order.address}`,
      orderId: order.id,
      url: `/driver/orders/${order.id}`
    };

    // Envoyer à tous les livreurs disponibles (en parallèle, non-bloquant)
    const results = await Promise.allSettled(
      availableDrivers.map(driver => 
        sendPushNotificationToDriver(driver.id, notification)
      )
    );

    // Compter les succès
    const successCount = results.filter(r => r.status === 'fulfilled' && r.value === true).length;
    const failureCount = results.length - successCount;

    console.log(`[Push] 📊 Notifications envoyées: ${successCount} succès, ${failureCount} échecs sur ${availableDrivers.length} livreurs`);
    
    return successCount;
  } catch (error: any) {
    console.error('[Push] ❌ Erreur notification tous livreurs:', error);
    return 0;
  }
}

/**
 * Exporte la clé publique VAPID pour le frontend
 */
export function getVapidPublicKey(): string {
  return VAPID_PUBLIC_KEY;
}

