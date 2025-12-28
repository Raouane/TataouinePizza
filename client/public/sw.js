// Service Worker pour répéter les notifications même en arrière-plan
// Fonctionne même quand l'écran est éteint ou l'app en arrière-plan

// Stocker les intervalles de notification
let notificationIntervals = {};

// Écouter les événements push du serveur (pour les notifications en arrière-plan)
// Ces notifications fonctionnent même quand l'app est complètement fermée ou le téléphone éteint
self.addEventListener('push', (event) => {
  console.log('[SW] 📬 Événement push reçu (fonctionne même téléphone éteint):', event);
  
  let data = {
    title: '🔔 Nouvelle commande!',
    body: 'Une nouvelle commande est disponible',
    orderId: null,
    url: '/driver',
    icon: '/favicon-32x32.png',
    badge: '/favicon-32x32.png',
    silent: false // Son système activé
  };

  if (event.data) {
    try {
      const parsed = event.data.json();
      data = { ...data, ...parsed };
      console.log('[SW] 📦 Données push parsées:', parsed);
    } catch (e) {
      console.error('[SW] Erreur parsing push data:', e);
      // Utiliser les valeurs par défaut
    }
  }
  
  const title = data.title || '🔔 Nouvelle commande!';
  const body = data.body || 'Une nouvelle commande est disponible';
  const orderId = data.orderId || 'unknown';
  const url = data.url || '/driver';
  const icon = data.icon || '/favicon-32x32.png';
  const badge = data.badge || '/favicon-32x32.png';
  
  // Afficher la notification immédiatement
  // IMPORTANT: Le son système fonctionne même quand le téléphone est éteint
  // Le son par défaut du système est utilisé automatiquement si silent: false
  const notificationOptions = {
    body,
    icon,
    badge,
    tag: `order-${orderId}`,
    requireInteraction: true, // Nécessite une interaction pour se fermer
    silent: data.silent !== undefined ? data.silent : false, // Activer le son système (fonctionne même téléphone éteint)
    vibrate: [200, 100, 200, 100, 200], // Vibration sur mobile
    data: {
      orderId,
      url
    }
  };
  
  console.log('[SW] 🔊 Options notification:', { silent: notificationOptions.silent, orderId });
  
  event.waitUntil(
    self.registration.showNotification(title, notificationOptions)
      .then(() => {
        console.log('[SW] ✅ Notification push affichée pour commande', orderId, '(son activé)');
      })
      .catch((error) => {
        console.error('[SW] ❌ Erreur affichage notification:', error);
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
  // IMPORTANT: Le son système fonctionne même quand le téléphone est éteint
  // Le son par défaut du système est utilisé automatiquement si silent: false
  const notificationInterval = setInterval(() => {
    console.log(`[SW] Répétition notification pour commande ${orderId}`);
    self.registration.showNotification(title, {
      body,
      icon: '/favicon-32x32.png',
      badge: '/favicon-32x32.png',
      tag: `order-${orderId}`,
      requireInteraction: true,
      silent: false, // Activer le son système (fonctionne même téléphone éteint)
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
    // IMPORTANT: Le son système fonctionne même quand le téléphone est éteint
    // Le son par défaut du système est utilisé automatiquement si silent: false
    self.registration.showNotification(title, {
      body,
      icon: '/favicon-32x32.png',
      badge: '/favicon-32x32.png',
      tag: `order-${orderId}`,
      requireInteraction: true,
      silent: false, // Activer le son système (fonctionne même téléphone éteint)
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
  console.log('[SW] 👆 Notification cliquée:', event.notification.tag);
  event.notification.close();
  
  // Récupérer l'URL depuis les données de la notification
  const url = event.notification.data?.url || '/driver';
  
  // Ouvrir/focus l'application
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Si une fenêtre est déjà ouverte, la focus et naviguer vers l'URL
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          // Essayer de naviguer si possible (Chrome)
          if ('navigate' in client && typeof client.navigate === 'function') {
            return client.navigate(url).then(function() {
              return client.focus();
            });
          }
          // Sinon juste focus
          return client.focus();
        }
      }
      // Sinon, ouvrir une nouvelle fenêtre
      if (clients.openWindow) {
        return clients.openWindow(url);
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

