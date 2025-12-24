// Service Worker pour répéter les notifications même en arrière-plan
// Fonctionne même quand l'écran est éteint ou l'app en arrière-plan

// Stocker les intervalles de notification
let notificationIntervals = {};

// Écouter les messages du client
self.addEventListener('message', (event) => {
  console.log('[SW] Message reçu:', event.data);
  
  if (event.data && event.data.type === 'START_NOTIFICATION_REPEAT') {
    const { orderId, interval } = event.data;
    
    console.log(`[SW] Démarrage répétition notification pour commande ${orderId}, intervalle: ${interval}ms`);
    
    // Arrêter l'intervalle existant si présent
    if (notificationIntervals[orderId]) {
      clearInterval(notificationIntervals[orderId]);
      console.log(`[SW] Intervalle existant arrêté pour ${orderId}`);
    }
    
    // Envoyer une notification immédiatement
    self.registration.showNotification('🔔 Nouvelle commande!', {
      body: 'Une nouvelle commande est disponible',
      icon: '/favicon.ico',
      badge: '/favicon.ico',
      tag: `order-${orderId}`,
      requireInteraction: true, // Nécessite une interaction pour se fermer
      silent: false, // Activer le son système
      vibrate: [200, 100, 200, 100, 200], // Vibration pour mobile
    }).catch((error) => {
      console.error('[SW] Erreur affichage notification:', error);
    });
    
    // Répéter la notification toutes les X secondes
    const notificationInterval = setInterval(() => {
      console.log(`[SW] Répétition notification pour commande ${orderId}`);
      self.registration.showNotification('🔔 Nouvelle commande!', {
        body: 'Une nouvelle commande est disponible',
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

// Log au démarrage du Service Worker
console.log('[SW] Service Worker démarré');

