# PWA Install Prompt - Documentation

## 🎯 Vue d'ensemble

Composant moderne et réutilisable pour promouvoir l'installation de l'application PWA. Design premium avec animations douces, support multilingue et son optionnel.

## ✨ Fonctionnalités

- ✅ **Design moderne** : Card avec gradient, ombres, animations spring
- ✅ **Multilingue** : Support FR, EN, AR via système i18n
- ✅ **Animations douces** : Fade + slide avec Framer Motion
- ✅ **Responsive** : Mobile-first, adaptatif desktop
- ✅ **Non intrusif** : Respecte les préférences utilisateur
- ✅ **Son optionnel** : Notification sonore douce (une seule fois)
- ✅ **Réutilisable** : API simple et claire
- ✅ **Logique séparée** : Hook `usePwaInstall()` pour la logique métier

## 📦 Installation

Le composant est déjà intégré dans l'application. Aucune installation supplémentaire requise.

## 🚀 Utilisation

### Utilisation basique

```tsx
import { PwaInstallPrompt } from "@/components/pwa-install-prompt";

function App() {
  return (
    <div>
      {/* ... votre contenu ... */}
      <PwaInstallPrompt />
    </div>
  );
}
```

### Avec options personnalisées

```tsx
<PwaInstallPrompt
  enableSound={true}      // Activer le son (défaut: true)
  showDelay={3000}        // Délai avant affichage iOS/Safari (ms, défaut: 3000)
  position="bottom"        // Position: "bottom" | "top" (défaut: "bottom")
/>
```

## 🎨 Design

### Caractéristiques visuelles

- **Card moderne** : Coins arrondis (rounded-2xl), ombre portée (shadow-2xl)
- **Gradient accent** : Barre orange en haut avec dégradé
- **Icône avec effet** : Smartphone avec background gradient et blur
- **Boutons stylisés** : Gradient orange pour "Installer", outline pour "Plus tard"
- **Animations** : Slide depuis le bas avec effet spring

### Responsive

- **Mobile** : Pleine largeur avec marges (left-4 right-4)
- **Desktop** : Largeur fixe 96 (md:w-96) alignée à droite

## 🌍 Traductions

Les textes sont gérés via le système i18n :

| Clé | Français | English | العربية |
|-----|----------|---------|---------|
| `pwa.install.message` | Profitez de nos commandes en un clic ! Installez notre app maintenant 😊 | Enjoy ordering in one click! Install our app now 😊 | إستمتع بالطلبات متاعك بكليك وحدة! ركّب التطبيق تاو 😊 |
| `pwa.install.button` | Installer | Install | تثبيت |
| `pwa.install.later` | Plus tard | Later | لاحقاً |
| `pwa.install.instructions` | Voir instructions | See instructions | عرض التعليمات |

## 🔧 Architecture

### Séparation logique / UI

```
client/src/
├── hooks/
│   └── use-pwa-install.ts          # Logique métier (hook)
└── components/
    └── pwa-install-prompt.tsx      # UI (composant)
```

### Hook `usePwaInstall()`

Gère toute la logique :
- Détection de l'installation
- Gestion du `beforeinstallprompt`
- Détection iOS/Safari
- Gestion du localStorage (refus)
- Fonctions `handleInstall()` et `handleDismiss()`

### Composant `PwaInstallPrompt`

Gère uniquement l'UI :
- Affichage conditionnel
- Animations
- Traductions
- Son optionnel

## 🔊 Son

Le son est joué **une seule fois** à l'affichage du prompt (si `enableSound={true}`).

Utilise `playCustomSound()` de `@/lib/pwa-sound-manager`.

Pour désactiver :
```tsx
<PwaInstallPrompt enableSound={false} />
```

## 📱 Support navigateurs

### Chrome / Edge (Android / Desktop)
- ✅ Support natif via `beforeinstallprompt`
- ✅ Installation en un clic

### Safari (iOS)
- ⚠️ Pas de `beforeinstallprompt`
- ✅ Affiche des instructions manuelles
- ✅ Délai de 3 secondes par défaut

### Firefox
- ⚠️ Support limité
- ✅ Fonctionne mais avec limitations

## 🎯 Comportement

### Conditions d'affichage

Le prompt s'affiche si :
- ✅ L'app n'est **pas** déjà installée
- ✅ L'utilisateur n'a **pas** refusé aujourd'hui
- ✅ `beforeinstallprompt` est disponible (ou iOS/Safari)

### Conditions de non-affichage

Le prompt ne s'affiche **pas** si :
- ❌ L'app est déjà installée
- ❌ L'utilisateur a refusé aujourd'hui (stocké dans `localStorage`)
- ❌ Pas de `beforeinstallprompt` ET pas iOS/Safari

### Gestion du refus

Quand l'utilisateur clique sur "Plus tard" :
- Le prompt est masqué
- La date est stockée dans `localStorage` (clé: `pwaInstallDismissed`)
- Le prompt ne réapparaîtra **pas** aujourd'hui
- Réapparaîtra demain (nouvelle journée)

## 🔄 Cycle de vie

1. **Montage** : Vérifie si installé/refusé
2. **Écoute** : Attend `beforeinstallprompt` (ou délai iOS)
3. **Affichage** : Affiche le prompt avec animation
4. **Son** : Joue le son (une fois, si activé)
5. **Action** : Utilisateur clique "Installer" ou "Plus tard"
6. **Nettoyage** : Masque le prompt et met à jour l'état

## 🧪 Tests

### Tester l'affichage

1. Ouvrir l'app dans Chrome/Edge
2. Attendre que `beforeinstallprompt` se déclenche
3. Le prompt doit apparaître en bas à droite

### Tester le refus

1. Cliquer sur "Plus tard"
2. Rafraîchir la page
3. Le prompt ne doit **pas** réapparaître aujourd'hui

### Tester l'installation

1. Cliquer sur "Installer"
2. Confirmer dans le prompt natif
3. Le prompt doit disparaître
4. L'app doit s'installer

## 📝 Notes importantes

1. **localStorage** : Utilise la clé `pwaInstallDismissed` pour stocker la date de refus
2. **iOS/Safari** : Affiche des instructions manuelles (pas d'installation automatique)
3. **Son** : Joué une seule fois via `soundPlayedRef` pour éviter les répétitions
4. **Animations** : Utilise Framer Motion avec variants pour performance optimale

## 🎨 Personnalisation

### Changer les couleurs

Modifier les classes Tailwind dans le composant :
- Gradient : `from-orange-500 to-orange-600`
- Background : `bg-white`
- Border : `border-orange-100`

### Changer la position

```tsx
<PwaInstallPrompt position="top" />
```

### Changer le délai iOS

```tsx
<PwaInstallPrompt showDelay={5000} /> // 5 secondes
```

## 🔍 Debug

### Vérifier l'état

Dans la console du navigateur :
```javascript
// Vérifier si refusé
console.log(localStorage.getItem('pwaInstallDismissed'));

// Vérifier si installé
console.log(window.matchMedia('(display-mode: standalone)').matches);
```

### Logs

Le hook log les événements importants :
- `[PWA] ✅ Installation acceptée`
- `[PWA] ❌ Installation refusée`
- `[PWA] Erreur lors de l'installation`

## 🚀 Améliorations futures possibles

- [ ] Variante "toast" pour un design encore plus discret
- [ ] Variante "bottom-sheet" pour mobile
- [ ] Statistiques d'installation (analytics)
- [ ] A/B testing de différents messages
- [ ] Personnalisation par rôle (client vs driver)

