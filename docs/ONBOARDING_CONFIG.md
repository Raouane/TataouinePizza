# Configuration de l'Onboarding

## 🎯 Vue d'ensemble

L'onboarding peut être désactivé pour le MVP afin de permettre un accès direct à l'application sans écrans d'introduction.

## ⚙️ Configuration

### Variable d'environnement

Dans votre fichier `.env` (à la racine du projet) :

```env
# Onboarding (désactivé par défaut pour le MVP)
VITE_ENABLE_ONBOARDING=false
```

**Important** : Dans Vite, les variables d'environnement doivent être préfixées par `VITE_` pour être accessibles côté client.

### Modes d'onboarding

| Mode | VITE_ENABLE_ONBOARDING | Comportement |
|------|------------------------|--------------|
| **Désactivé (MVP)** | `false` ou non défini | Accès direct à la Home, pas d'écrans d'introduction |
| **Activé** | `true` | Flow onboarding classique (téléphone → OTP → localisation) |

## 🔄 Comportement

### Mode désactivé (VITE_ENABLE_ONBOARDING=false)

- ✅ L'application démarre directement sur la page **Home**
- ✅ Toutes les routes sont accessibles sans vérification d'onboarding
- ✅ La route `/onboarding` reste accessible manuellement (pour tests)
- ✅ Aucune vérification de `localStorage` pour l'onboarding

### Mode activé (VITE_ENABLE_ONBOARDING=true)

- ✅ L'application vérifie si l'utilisateur a complété l'onboarding
- ✅ Si non complété → redirection vers `/onboarding`
- ✅ Si complété → accès normal à l'application
- ✅ Les données d'onboarding sont stockées dans `localStorage` (clé: `tp_onboarding`)

## 📋 Checklist pour réactiver l'onboarding

### 1. Variable d'environnement

```env
VITE_ENABLE_ONBOARDING=true
```

### 2. Redémarrer l'application

```bash
# Local
npm run dev

# Production
# Redéployer ou redémarrer le service
```

### 3. Vérifier le comportement

- [ ] L'application redirige vers `/onboarding` si non complété
- [ ] Le flow onboarding fonctionne (téléphone → OTP → localisation)
- [ ] Les données sont sauvegardées dans `localStorage`
- [ ] Après complétion, l'utilisateur accède à la Home

## 🏗️ Architecture

### Fichiers modifiés

- `client/src/lib/onboarding-config.ts` : Configuration centralisée (nouveau)
- `client/src/App.tsx` : Hook `useOnboarding()` modifié pour vérifier la config

### Fonctions principales

#### `isOnboardingEnabled()`
Vérifie si l'onboarding est activé via `VITE_ENABLE_ONBOARDING`.

#### `shouldSkipOnboarding()`
Retourne `true` si l'onboarding est désactivé ou si l'utilisateur a complété l'onboarding.

#### `useOnboarding()` (dans App.tsx)
Hook React qui :
- Retourne `true` si l'onboarding est désactivé (accès direct)
- Vérifie `localStorage` si l'onboarding est activé
- Écoute les changements de `localStorage` pour réactivité

## 🔒 Sécurité et données

### Données d'onboarding

Quand l'onboarding est activé, les données suivantes sont stockées dans `localStorage` :

```typescript
interface OnboardingData {
  name: string;
  phone: string;
  address?: string;
  addressDetails?: string;
  lat?: number;
  lng?: number;
}
```

**Clé de stockage** : `tp_onboarding`

### Compatibilité

- ✅ Les données d'onboarding existantes restent valides si réactivé
- ✅ Aucune migration de données requise
- ✅ Le code d'onboarding n'a pas été supprimé, seulement désactivé

## 📝 Notes importantes

1. **Code préservé** : Le code de l'onboarding n'a pas été supprimé, il est simplement désactivé via la variable d'environnement.

2. **Route `/onboarding`** : Reste accessible même si désactivé (pour tests ou accès manuel).

3. **Commentaires dans le code** : Tous les endroits où l'onboarding est conditionnel sont marqués avec :
   ```typescript
   // ONBOARDING DISABLED FOR MVP – ENABLE VIA ENABLE_ONBOARDING ENV FLAG
   ```

4. **Variables Vite** : N'oubliez pas le préfixe `VITE_` pour les variables d'environnement côté client.

## 🚀 Exemple d'utilisation

### Désactiver l'onboarding (MVP)

```env
# .env
VITE_ENABLE_ONBOARDING=false
```

Résultat : L'application démarre directement sur la Home.

### Activer l'onboarding

```env
# .env
VITE_ENABLE_ONBOARDING=true
```

Résultat : L'application vérifie l'onboarding et redirige si nécessaire.

## 🔍 Debug

### Vérifier la configuration

Dans la console du navigateur :

```javascript
// Vérifier si l'onboarding est activé
console.log(import.meta.env.VITE_ENABLE_ONBOARDING);

// Vérifier les données d'onboarding
console.log(localStorage.getItem('tp_onboarding'));
```

### Tester manuellement

Accéder à `/onboarding` directement dans l'URL pour tester le flow même si désactivé.

