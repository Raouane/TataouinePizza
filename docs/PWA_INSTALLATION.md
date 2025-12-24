# Installation PWA - Documentation

## Vue d'ensemble

L'application Tataouine Pizza est une Progressive Web App (PWA) qui peut être installée sur les appareils mobiles et desktop. L'installation est particulièrement importante pour les livreurs car elle permet :

- ✅ Notifications push fiables même quand l'app est fermée
- ✅ Sonnerie automatique pour les nouvelles commandes
- ✅ Fonctionnement en arrière-plan
- ✅ Accès rapide depuis l'écran d'accueil

## Fonctionnalités implémentées

### 1. Détection automatique de l'installation

Le composant `PWAInstallPrompt` détecte automatiquement :
- Si l'app est déjà installée (mode standalone)
- Si l'appareil supporte l'installation PWA
- Si l'utilisateur a déjà refusé l'installation aujourd'hui

### 2. Prompt d'installation intelligent

- **Pour les livreurs** : Message plus insistant avec explication des avantages
- **Pour les clients** : Message optionnel avec avantages généraux
- **Limitation** : Ne s'affiche qu'une fois par jour maximum

### 3. Système de son amélioré

#### En foreground (app ouverte)
- Son personnalisé répétitif toutes les 5 secondes
- Utilise l'API Web Audio ou Audio HTML5
- Peut être arrêté manuellement

#### En background (app fermée ou minimisée)
- Notifications système avec son natif Android/iOS
- Géré automatiquement par le Service Worker
- Vibrations activées sur mobile

## Fichiers créés/modifiés

### Nouveaux fichiers

1. **`client/public/manifest.json`**
   - Configuration PWA complète
   - Icônes, thème, orientation
   - Shortcuts et share target

2. **`client/src/components/pwa-install-prompt.tsx`**
   - Composant React pour proposer l'installation
   - Détection beforeinstallprompt
   - Gestion du localStorage pour éviter les spams

3. **`client/src/lib/pwa-sound-manager.ts`**
   - Gestionnaire de son personnalisé
   - Détection foreground/background
   - Répétition automatique

### Fichiers modifiés

1. **`client/index.html`**
   - Ajout du lien vers manifest.json
   - Meta tags PWA (theme-color, apple-mobile-web-app)

2. **`client/src/lib/sound-utils.ts`**
   - Intégration du son personnalisé en foreground
   - Délégation au Service Worker en background

3. **`client/src/App.tsx`**
   - Ajout du composant PWAInstallPrompt global

4. **`client/src/pages/driver-dashboard.tsx`**
   - Ajout du composant PWAInstallPrompt
   - Intégration stopCustomSound() pour arrêter le son

## Utilisation

### Pour les développeurs

Le composant `PWAInstallPrompt` s'affiche automatiquement :
- Sur toutes les pages (via App.tsx)
- Spécialement sur le dashboard livreur
- Une fois par jour maximum

### Pour les utilisateurs

#### Android / Chrome
1. Le prompt s'affiche automatiquement
2. Cliquer sur "Installer maintenant"
3. Confirmer l'installation dans la popup du navigateur

#### iOS / Safari
1. Le prompt affiche des instructions manuelles
2. Appuyer sur le bouton Partager (📤)
3. Sélectionner "Sur l'écran d'accueil"
4. Confirmer l'ajout

## Configuration

### Manifest.json

Les paramètres importants :
- `display: "standalone"` - Mode application
- `start_url: "/"` - Page de démarrage
- `theme_color: "#f97316"` - Couleur de thème orange
- `orientation: "portrait-primary"` - Orientation portrait

### Service Worker

Le Service Worker (`client/public/sw.js`) gère :
- Les notifications push en background
- Le son système natif
- La répétition des notifications

## Tests

Pour tester l'installation PWA :

1. **En développement local**
   - Utiliser HTTPS (ou localhost)
   - Ouvrir Chrome DevTools > Application > Manifest
   - Vérifier que le manifest est valide

2. **Sur mobile Android**
   - Ouvrir Chrome
   - Visiter l'application
   - Le prompt devrait apparaître automatiquement

3. **Sur iOS**
   - Ouvrir Safari
   - Visiter l'application
   - Utiliser le menu Partager pour installer

## Dépannage

### Le prompt ne s'affiche pas

- Vérifier que l'app n'est pas déjà installée
- Vérifier que le manifest.json est accessible
- Vérifier que le Service Worker est enregistré
- Vérifier la console pour les erreurs

### Le son ne fonctionne pas

- Vérifier les permissions audio dans le navigateur
- Vérifier que l'app est en foreground pour le son personnalisé
- Vérifier les permissions de notification système

### Installation échoue

- Vérifier HTTPS (requis pour PWA)
- Vérifier que le manifest.json est valide
- Vérifier que le Service Worker est actif

## Notes importantes

⚠️ **iOS** : L'installation PWA sur iOS nécessite une action manuelle de l'utilisateur. Le prompt affiche des instructions.

⚠️ **HTTPS requis** : Les PWA nécessitent HTTPS (sauf localhost en développement).

⚠️ **Service Worker** : Doit être enregistré et actif pour que les notifications fonctionnent en background.

