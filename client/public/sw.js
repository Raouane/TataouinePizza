// Service Worker pour répéter les notifications même en arrière-plan
// Fonctionne même quand l'écran est éteint ou l'app en arrière-plan

// Stocker les intervalles de notification
let notificationIntervals = {};

// Écouter les événements push du serveur (pour les notifications en arrière-plan)
self.addEventListener('push', (event) => {
  console.log('[SW] Événement push reçu:', event);
  
  let data = {};
  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      data = { title: '🔔 Nouvelle commande!', body: 'Une nouvelle commande est disponible' };
    }
  }
  
  const title = data.title || '🔔 Nouvelle commande!';
  const body = data.body || 'Une nouvelle commande est disponible';
  const orderId = data.orderId || 'unknown';
  const interval = data.interval || 5000;
  
  // Afficher la notification immédiatement
  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon: '/favicon.ico',
      badge: '/favicon.ico',
      tag: `order-${orderId}`,
      requireInteraction: true,
      silent: false,
      vibrate: [200, 100, 200, 100, 200],
    }).then(() => {
      console.log('[SW] Notification push affichée pour commande', orderId);
      
      // Démarrer la répétition si demandée
      if (data.repeat) {
        startNotificationRepeat(orderId, interval, title, body);
      }
    })
  );
});

// Fonction pour démarrer la répétition de notifications
function startNotificationRepeat(orderId, interval, title, body) {
  console.log(`[SW] Démarrage répétition notification pour commande ${orderId}, intervalle: ${interval}ms`);
  
  // Arrêter l'intervalle existant si présent
  if (notificationIntervals[orderId]) {
    clearInterval(notificationIntervals[orderId]);
    console.log(`[SW] Intervalle existant arrêté pour ${orderId}`);
  }
  
  // Répéter la notification toutes les X secondes
  const notificationInterval = setInterval(() => {
    console.log(`[SW] Répétition notification pour commande ${orderId}`);
    self.registration.showNotification(title, {
      body,
      icon: '/favicon.ico',
      badge: '/favicon.ico',
      tag: `order-${orderId}`,
      requireInteraction: true,
      silent: false,
      vibrate: [200, 100, 200, 100, 200],
    }).catch((error) => {
      console.error('[SW] Erreur affichage notification répétée:', error);
    });
  }, interval);
  
  // Stocker l'intervalle pour pouvoir l'arrêter plus tard
  notificationIntervals[orderId] = notificationInterval;
  console.log(`[SW] ✅ Répétition notification démarrée pour ${orderId}`);
}

// Écouter les messages du client (pour quand l'app est ouverte)
self.addEventListener('message', (event) => {
  console.log('[SW] Message reçu:', event.data);
  
  if (event.data && event.data.type === 'START_NOTIFICATION_REPEAT') {
    const { orderId, interval } = event.data;
    const title = '🔔 Nouvelle commande!';
    const body = 'Une nouvelle commande est disponible';
    
    // Envoyer une notification immédiatement
    self.registration.showNotification(title, {
      body,
      icon: '/favicon.ico',
      badge: '/favicon.ico',
      tag: `order-${orderId}`,
      requireInteraction: true,
      silent: false,
      vibrate: [200, 100, 200, 100, 200],
    }).catch((error) => {
      console.error('[SW] Erreur affichage notification:', error);
    });
    
    // Démarrer la répétition
    startNotificationRepeat(orderId, interval, title, body);
  }
  
  if (event.data && event.data.type === 'STOP_NOTIFICATION_REPEAT') {
    const { orderId } = event.data;
    console.log(`[SW] Arrêt répétition notification pour commande ${orderId}`);
    
    if (notificationIntervals[orderId]) {
      clearInterval(notificationIntervals[orderId]);
      delete notificationIntervals[orderId];
      console.log(`[SW] ✅ Répétition notification arrêtée pour ${orderId}`);
    } else {
      console.log(`[SW] ⚠️ Aucun intervalle trouvé pour ${orderId}`);
    }
  }
});

// Gérer le clic sur la notification
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification cliquée:', event.notification.tag);
  event.notification.close();
  
  // Ouvrir/focus l'application
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Si une fenêtre est déjà ouverte, la focus
      for (const client of clientList) {
        if (client.url === self.location.origin && 'focus' in client) {
          return client.focus();
        }
      }
      // Sinon, ouvrir une nouvelle fenêtre
      if (clients.openWindow) {
        return clients.openWindow('/driver');
      }
    })
  );
});

// Activer le Service Worker immédiatement (pour qu'il reste actif même en arrière-plan)
self.addEventListener('activate', (event) => {
  console.log('[SW] Service Worker activé');
  // Prendre immédiatement le contrôle de toutes les pages
  event.waitUntil(
    self.clients.claim().then(() => {
      console.log('[SW] Service Worker a pris le contrôle de toutes les pages');
    })
  );
});

// Installer le Service Worker
self.addEventListener('install', (event) => {
  console.log('[SW] Service Worker installé');
  // Forcer l'activation immédiate
  self.skipWaiting();
});

// Log au démarrage du Service Worker
console.log('[SW] Service Worker démarré');

