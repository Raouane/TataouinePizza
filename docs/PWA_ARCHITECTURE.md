# Architecture PWA - Tataouine Pizza

## 📋 Vue d'ensemble

L'application Tataouine Pizza est une **Progressive Web App (PWA)** complète qui permet :
- ✅ Installation sur mobile et desktop
- ✅ Notifications push même quand l'app est fermée
- ✅ Fonctionnement hors ligne (partiel)
- ✅ Sonnerie automatique pour les nouvelles commandes
- ✅ Expérience native-like

---

## 🏗️ Structure des Fichiers

### Fichiers PWA Principaux

```
client/
├── public/
│   ├── sw.js                    # Service Worker (notifications, cache)
│   ├── manifest.json            # Configuration PWA (icônes, thème, etc.)
│   ├── icon-192.png            # Icône 192x192
│   ├── icon-512.png            # Icône 512x512
│   └── audio/
│       └── alert.mp3           # Son d'alerte pour notifications
│
├── src/
│   ├── main.tsx                # Enregistrement Service Worker
│   ├── components/
│   │   └── pwa-install-prompt.tsx  # Prompt d'installation
│   ├── hooks/
│   │   ├── use-pwa-install.ts      # Hook installation PWA
│   │   └── use-push-notifications.ts  # Hook notifications push
│   └── lib/
│       ├── pwa-sound-manager.ts    # Gestionnaire de son
│       └── sound-utils.ts          # Utilitaires audio
│
└── server/
    └── services/
        └── push-notification-service.ts  # Service serveur push
```

---

## 🔧 Service Worker (`client/public/sw.js`)

### Responsabilités

1. **Notifications Push**
   - Réception des événements push du serveur
   - Affichage de notifications même quand l'app est fermée
   - Répétition automatique de notifications (5 minutes max)

2. **Gestion des Notifications**
   - Permissions et gestion d'erreurs
   - Arrêt automatique après 3 erreurs consécutives
   - Timeout de 5 minutes pour éviter les boucles infinies

3. **Communication Client ↔ Service Worker**
   - Messages pour démarrer/arrêter les répétitions
   - Gestion des clics sur notifications

### Événements Gérés

```javascript
// Push events (notifications serveur)
self.addEventListener('push', (event) => { ... })

// Messages du client (app ouverte)
self.addEventListener('message', (event) => { ... })

// Clics sur notifications
self.addEventListener('notificationclick', (event) => { ... })

// Installation/Activation
self.addEventListener('install', (event) => { ... })
self.addEventListener('activate', (event) => { ... })
```

### Fonctionnalités Clés

- **Répétition de notifications** : Toutes les X secondes jusqu'à acceptation
- **Gestion d'erreurs** : Arrêt automatique après 3 erreurs
- **Timeout** : Arrêt automatique après 5 minutes
- **Permissions** : Vérification avant affichage

---

## 📱 Manifest (`client/public/manifest.json`)

### Configuration

```json
{
  "name": "Tataouine Pizza - Saveurs du Sud",
  "short_name": "Tataouine Pizza",
  "display": "standalone",           // Mode app native
  "start_url": "/",
  "theme_color": "#f97316",          // Couleur de la barre d'état
  "background_color": "#ffffff",
  "orientation": "portrait-primary",
  "icons": [...],                    // Icônes 192x192, 512x512
  "shortcuts": [...],                // Raccourcis rapides
  "share_target": {...}              // Partage depuis autres apps
}
```

### Icônes Requises

- `icon-192.png` : Minimum requis
- `icon-512.png` : Recommandé pour splash screen
- `favicon-16x16.png` et `favicon-32x32.png` : Favicons

---

## 🔔 Push Notifications

### Architecture

```
┌─────────────┐         ┌──────────────┐         ┌─────────────┐
│   Serveur   │────────▶│ Service      │────────▶│  Livreur    │
│  (Node.js)  │  Web    │ Worker       │  Push   │  (Mobile)   │
│             │  Push   │              │  Event  │             │
└─────────────┘         └──────────────┘         └─────────────┘
```

### Flux Complet

1. **Abonnement** (Client → Serveur)
   ```
   Client: POST /api/driver/push/subscribe
   Body: { subscription: PushSubscription }
   ```

2. **Envoi Notification** (Serveur → Client)
   ```
   Serveur: webpush.sendNotification(subscription, payload)
   Service Worker: Réception événement 'push'
   ```

3. **Affichage** (Service Worker → OS)
   ```
   Service Worker: showNotification(title, options)
   OS: Notification système avec son
   ```

### VAPID Keys

- **Clé publique** : Exposée via `/api/driver/push/vapid-key`
- **Clé privée** : Utilisée côté serveur pour signer les notifications
- **Configuration** : Variables d'environnement `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`

### Stockage des Subscriptions

- Stockées dans la base de données (`drivers.pushSubscription`)
- Format JSON : `{ endpoint, keys: { p256dh, auth } }`
- Nettoyage automatique si subscription invalide (410/404)

---

## 🎵 Système de Son

### Architecture Dual

#### 1. **Foreground** (App ouverte)
- **Son personnalisé** : Fichier MP3/WAV ou Web Audio API
- **Répétition** : Toutes les 5 secondes
- **Gestion** : `pwa-sound-manager.ts`

#### 2. **Background** (App fermée/minimisée)
- **Son système** : Notifications natives OS
- **Gestion** : Service Worker automatique
- **Fonctionne même écran verrouillé** : Via notifications système (pas si téléphone éteint)

### Fichiers Audio

- `client/public/audio/alert.mp3` : Son d'alerte principal
- Utilisé par le Service Worker pour notifications répétées

### Détection Foreground/Background

```javascript
// Détection via Visibility API
document.addEventListener('visibilitychange', () => {
  isAppInForeground = !document.hidden;
});
```

---

## 📲 Installation PWA

### Composant `PwaInstallPrompt`

**Localisation** : `client/src/components/pwa-install-prompt.tsx`

**Fonctionnalités** :
- Détection automatique de l'installation
- Support iOS/Safari et Android/Chrome
- Limitation : 1 fois par jour maximum
- Design moderne avec animations

### Hook `usePwaInstall`

**Localisation** : `client/src/hooks/use-pwa-install.ts`

**API** :
```typescript
const {
  deferredPrompt,    // Event beforeinstallprompt
  showPrompt,        // Afficher le prompt ?
  isInstalled,       // Déjà installé ?
  handleInstall,     // Fonction installation
  handleDismiss,     // Fonction fermer
  isIOS,             // iOS ?
  isSafari           // Safari ?
} = usePwaInstall(showDelay);
```

### Détection Installation

- **Chrome/Edge** : `beforeinstallprompt` event
- **iOS/Safari** : Détection mode standalone
- **Firefox** : Menu "Installer"

---

## 🔄 Flux de Données

### 1. Nouvelle Commande Arrive

```
┌─────────────────────────────────────────────────────────┐
│ 1. Commande créée (API /api/orders)                     │
└─────────────────┬───────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────┐
│ 2. notifyDriversOfNewOrder() appelé                     │
│    - WebSocket (app ouverte)                            │
│    - Push Notifications (app fermée)                     │
│    - Telegram (toujours)                                │
└─────────────────┬───────────────────────────────────────┘
                  │
        ┌─────────┴─────────┐
        │                    │
        ▼                    ▼
┌──────────────┐    ┌──────────────────┐
│ App Ouverte   │    │ App Fermée       │
│ (Foreground)  │    │ (Background)     │
└──────┬───────┘    └────────┬─────────┘
       │                     │
       ▼                     ▼
┌──────────────┐    ┌──────────────────┐
│ Son MP3       │    │ Service Worker   │
│ Répétitif     │    │ Push Event       │
│ (5s)          │    │ Notification OS  │
└──────────────┘    └──────────────────┘
```

### 2. Abonnement Push

```
Client (Driver Dashboard)
  │
  ├─▶ Vérifie support (serviceWorker + PushManager)
  │
  ├─▶ Récupère clé VAPID publique
  │   GET /api/driver/push/vapid-key
  │
  ├─▶ Demande permission Notification
  │   Notification.requestPermission()
  │
  ├─▶ Crée subscription via Service Worker
  │   pushManager.subscribe({ applicationServerKey })
  │
  └─▶ Envoie subscription au serveur
      POST /api/driver/push/subscribe
      Body: { subscription }
```

### 3. Envoi Notification

```
Serveur (Nouvelle Commande)
  │
  ├─▶ Récupère livreurs disponibles
  │
  ├─▶ Pour chaque livreur :
  │   ├─▶ Parse pushSubscription
  │   ├─▶ Prépare payload JSON
  │   └─▶ webpush.sendNotification(subscription, payload)
  │
  └─▶ Service Worker reçoit événement 'push'
      └─▶ Affiche notification système
```

---

## 🎯 Points d'Amélioration Futurs

### 1. **Cache Strategy**
- **Actuel** : Pas de cache réseau
- **Amélioration** : Implémenter Cache API pour :
  - Assets statiques (CSS, JS, images)
  - Données API (restaurants, produits)
  - Mode offline partiel

### 2. **Background Sync**
- **Actuel** : Pas de sync en arrière-plan
- **Amélioration** : Synchroniser les actions (accepter commande) même offline

### 3. **IndexedDB**
- **Actuel** : localStorage uniquement
- **Amélioration** : IndexedDB pour :
  - Cache des commandes
  - Historique local
  - Données volumineuses

### 4. **Workbox Integration**
- **Actuel** : Service Worker manuel
- **Amélioration** : Utiliser Workbox pour :
  - Stratégies de cache automatiques
  - Pre-caching
  - Runtime caching

### 5. **App Updates**
- **Actuel** : Mise à jour manuelle
- **Amélioration** : Détection automatique de nouvelles versions
  - Prompt de mise à jour
  - Skip waiting automatique

### 6. **Analytics PWA**
- **Actuel** : Pas d'analytics PWA
- **Amélioration** : Tracker :
  - Taux d'installation
  - Utilisation offline
  - Performance notifications

### 7. **Share Target API**
- **Actuel** : Configuré mais non utilisé
- **Amélioration** : Permettre partage de liens/produits depuis autres apps

### 8. **Badge API**
- **Actuel** : Pas de badge sur icône
- **Amélioration** : Afficher nombre de commandes en attente sur icône app

### 9. **Periodic Background Sync**
- **Actuel** : Pas de sync périodique
- **Amélioration** : Synchroniser données en arrière-plan périodiquement

### 10. **Web Share API**
- **Actuel** : Pas de partage natif
- **Amélioration** : Permettre partage de commandes/produits

---

## 🔐 Sécurité

### VAPID Keys
- **Clé privée** : Jamais exposée au client
- **Clé publique** : Exposée uniquement via API authentifiée
- **Rotation** : Possible sans casser les subscriptions existantes

### Permissions
- **Notifications** : Demande explicite utilisateur
- **Audio** : Permission locale (localStorage)
- **Service Worker** : Scope limité à l'origine

### HTTPS Requis
- **Production** : HTTPS obligatoire pour PWA
- **Développement** : localhost accepté

---

## 📊 Métriques et Monitoring

### Logs Actuels

- **Service Worker** : Console logs pour debugging
- **Push Notifications** : Logs serveur (succès/échecs)
- **Installation** : localStorage pour tracking

### Métriques à Ajouter

- Taux d'installation PWA
- Taux de succès notifications push
- Temps de réponse Service Worker
- Utilisation cache
- Erreurs push (410, 404, etc.)

---

## 🛠️ Maintenance

### Mise à Jour Service Worker

1. **Modifier `sw.js`**
2. **Versioning** : Changer le nom du fichier ou ajouter version
3. **Skip Waiting** : Déjà implémenté (`self.skipWaiting()`)
4. **Claim** : Déjà implémenté (`self.clients.claim()`)

### Nettoyage Subscriptions

- **Automatique** : Si erreur 410/404 lors de l'envoi
- **Manuel** : Script de nettoyage périodique (à créer)

### Debugging

- **Chrome DevTools** : Application > Service Workers
- **Console** : Logs détaillés dans Service Worker
- **Network** : Voir requêtes push

---

## 📚 Ressources

- [MDN - Progressive Web Apps](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps)
- [Web Push Protocol](https://datatracker.ietf.org/doc/html/rfc8030)
- [Service Worker API](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API)
- [Web Push Libraries](https://github.com/web-push-libs)

---

## ✅ Checklist PWA

- [x] Service Worker enregistré
- [x] Manifest.json configuré
- [x] Icônes PWA (192x192, 512x512)
- [x] Push Notifications fonctionnelles
- [x] Installation PWA (Chrome, Edge)
- [x] Support iOS/Safari (instructions)
- [x] Sonnerie notifications
- [x] Mode standalone
- [ ] Cache Strategy (à améliorer)
- [ ] Background Sync (à ajouter)
- [ ] Offline support complet (à améliorer)

---

**Dernière mise à jour** : 2024
**Version PWA** : 1.0

