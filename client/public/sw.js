// Service Worker pour répéter les notifications même en arrière-plan
// Fonctionne même quand l'écran est éteint ou l'app en arrière-plan

// Cache basique pour assets statiques (PRIORITÉ 3 - Cache Minimum)
const CACHE_NAME = 'tataouine-pizza-v1';
const STATIC_ASSETS = [
  '/',
  '/driver',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png',
  '/favicon-32x32.png',
  '/favicon-16x16.png',
];

// Stocker les intervalles de notification
let notificationIntervals = {};
// Stocker le nombre d'erreurs consécutives pour chaque commande
let notificationErrors = {};
// Stocker les timeouts pour arrêter automatiquement après un certain temps
let notificationTimeouts = {};
// Durée maximale de répétition (5 minutes)
const MAX_REPEAT_DURATION = 5 * 60 * 1000; // 5 minutes en millisecondes

// Écouter les événements push du serveur (pour les notifications en arrière-plan)
// Ces notifications fonctionnent même quand l'app est complètement fermée ou l'écran verrouillé
self.addEventListener('push', (event) => {
  console.log('[SW] 📬 Événement push reçu (fonctionne même écran verrouillé):', event);
  
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
    silent: data.silent !== undefined ? data.silent : false, // Activer le son système (fonctionne même écran verrouillé)
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

// Fonction pour afficher une notification avec gestion d'erreur
async function showNotificationSafely(title, options) {
  try {
    await self.registration.showNotification(title, options);
    return true;
  } catch (error) {
    // Si l'erreur est liée aux permissions, on retourne false
    if (error.message && error.message.includes('permission')) {
      return false;
    }
    throw error; // Re-lancer les autres erreurs
  }
}

// Fonction pour démarrer la répétition de notifications
function startNotificationRepeat(orderId, interval, title, body) {
  console.log(`[SW] Démarrage répétition notification pour commande ${orderId}, intervalle: ${interval}ms`);
  
  // Arrêter l'intervalle existant si présent
  if (notificationIntervals[orderId]) {
    clearInterval(notificationIntervals[orderId]);
    delete notificationIntervals[orderId];
    console.log(`[SW] Intervalle existant arrêté pour ${orderId}`);
  }
  
  // Réinitialiser le compteur d'erreurs
  notificationErrors[orderId] = 0;
  
  // Répéter la notification toutes les X secondes
  // IMPORTANT: Le son système fonctionne même quand le téléphone est éteint
  // Le son par défaut du système est utilisé automatiquement si silent: false
  const notificationInterval = setInterval(async () => {
    console.log(`[SW] Répétition notification pour commande ${orderId}`);
    
    const notificationOptions = {
      body,
      icon: '/favicon-32x32.png',
      badge: '/favicon-32x32.png',
      tag: `order-${orderId}`,
      requireInteraction: true,
      silent: false, // Activer le son système (fonctionne même téléphone éteint)
      vibrate: [200, 100, 200, 100, 200],
    };
    
    try {
      const success = await showNotificationSafely(title, notificationOptions);
      if (success) {
        // Réinitialiser le compteur d'erreurs en cas de succès
        notificationErrors[orderId] = 0;
      } else {
        // Permission refusée, arrêter la répétition
        console.warn(`[SW] ⚠️ Permissions non accordées pour ${orderId}, arrêt de la répétition`);
        clearInterval(notificationInterval);
        delete notificationIntervals[orderId];
        delete notificationErrors[orderId];
        if (notificationTimeouts[orderId]) {
          clearTimeout(notificationTimeouts[orderId]);
          delete notificationTimeouts[orderId];
        }
      }
    } catch (error) {
      console.error('[SW] Erreur affichage notification répétée:', error);
      // Incrémenter le compteur d'erreurs
      notificationErrors[orderId] = (notificationErrors[orderId] || 0) + 1;
      
      // Arrêter la répétition après 3 erreurs consécutives
      if (notificationErrors[orderId] >= 3) {
        console.warn(`[SW] ⚠️ Trop d'erreurs (${notificationErrors[orderId]}) pour ${orderId}, arrêt de la répétition`);
        clearInterval(notificationInterval);
        delete notificationIntervals[orderId];
        delete notificationErrors[orderId];
        if (notificationTimeouts[orderId]) {
          clearTimeout(notificationTimeouts[orderId]);
          delete notificationTimeouts[orderId];
        }
      }
    }
  }, interval);
  
  // Stocker l'intervalle pour pouvoir l'arrêter plus tard
  notificationIntervals[orderId] = notificationInterval;
  
  // Arrêter automatiquement après MAX_REPEAT_DURATION
  const timeout = setTimeout(() => {
    console.log(`[SW] ⏰ Timeout atteint pour ${orderId}, arrêt automatique de la répétition`);
    if (notificationIntervals[orderId]) {
      clearInterval(notificationIntervals[orderId]);
      delete notificationIntervals[orderId];
      delete notificationErrors[orderId];
      delete notificationTimeouts[orderId];
    }
  }, MAX_REPEAT_DURATION);
  
  notificationTimeouts[orderId] = timeout;
  console.log(`[SW] ✅ Répétition notification démarrée pour ${orderId} (arrêt automatique dans ${MAX_REPEAT_DURATION / 1000}s)`);
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
      delete notificationErrors[orderId];
    }
    
    // Arrêter aussi le timeout s'il existe
    if (notificationTimeouts[orderId]) {
      clearTimeout(notificationTimeouts[orderId]);
      delete notificationTimeouts[orderId];
    }
    
    if (notificationIntervals[orderId] || notificationTimeouts[orderId]) {
      console.log(`[SW] ✅ Répétition notification arrêtée pour ${orderId}`);
    } else {
      console.log(`[SW] ⚠️ Aucun intervalle trouvé pour ${orderId}`);
    }
  }
  
  if (event.data && event.data.type === 'STOP_ALL_NOTIFICATION_REPEAT') {
    console.log(`[SW] Arrêt de toutes les notifications répétées`);
    let stoppedCount = 0;
    
    // Arrêter tous les intervalles
    for (const orderId in notificationIntervals) {
      clearInterval(notificationIntervals[orderId]);
      delete notificationIntervals[orderId];
      delete notificationErrors[orderId];
      stoppedCount++;
    }
    
    // Arrêter tous les timeouts
    for (const orderId in notificationTimeouts) {
      clearTimeout(notificationTimeouts[orderId]);
      delete notificationTimeouts[orderId];
    }
    
    console.log(`[SW] ✅ ${stoppedCount} notification(s) répétée(s) arrêtée(s)`);
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
  
  // Cache initial des assets statiques
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW] 📦 Cache initial des assets statiques');
      return cache.addAll(STATIC_ASSETS).catch((err) => {
        console.warn('[SW] ⚠️ Erreur cache initial (non bloquant):', err);
      });
    })
  );
  
  // Forcer l'activation immédiate
  self.skipWaiting();
});

// Cache First pour assets statiques (PRIORITÉ 3 - Cache Minimum)
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  
  // Cache First pour assets statiques uniquement (match exact pour éviter cache involontaire d'API)
  const isStaticAsset = STATIC_ASSETS.some(asset => {
    // Match exact pour les routes
    if (asset === '/' || asset === '/driver') {
      return url.pathname === asset;
    }
    // Match exact ou endsWith pour les fichiers
    return url.pathname === asset || url.pathname.endsWith(asset);
  });
  
  if (isStaticAsset) {
    event.respondWith(
      caches.match(event.request).then((response) => {
        // Retourner depuis cache si disponible, sinon fetch
        return response || fetch(event.request).then((fetchResponse) => {
          // Mettre en cache pour la prochaine fois
          const responseClone = fetchResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
          return fetchResponse;
        });
      })
    );
  }
  // Pour les autres requêtes, pas de cache (Network Only)
});

// Log au démarrage du Service Worker
console.log('[SW] Service Worker démarré');

