# 📁 Vue d'ensemble de l'arborescence du projet TataouinePizza

## 🎯 Structure Backend (`server/`)

```
server/
├── storage.ts                    # ✅ SIMPLIFIÉ (342 lignes - orchestrateur léger)
│   └── Orchestration de 9 modules de storage
│
├── storage/                      # ✅ NOUVELLE STRUCTURE MODULAIRE
│   ├── base-storage.ts          # Classe de base avec helpers communs
│   ├── admin-storage.ts         # Gestion des admins
│   ├── customer-storage.ts      # Gestion des clients
│   ├── restaurant-storage.ts    # Gestion des restaurants
│   ├── driver-storage.ts        # Gestion des livreurs
│   ├── pizza-storage.ts         # Gestion des pizzas et prix
│   ├── order-storage.ts         # Gestion des commandes
│   ├── idempotency-storage.ts   # Clés d'idempotence
│   ├── telegram-storage.ts      # Messages Telegram
│   └── cash-storage.ts          # Remises de caisse
│   └── ❌ otp-storage.ts        # SUPPRIMÉ (OTP retiré)
│
├── routes/
│   ├── driver/                  # ✅ NOUVELLE STRUCTURE MODULAIRE
│   │   ├── driver-auth.routes.ts      # Authentification livreur
│   │   ├── driver-cash.routes.ts      # Gestion caisse
│   │   ├── driver-orders.routes.ts    # Gestion commandes
│   │   ├── driver-push.routes.ts      # Notifications push
│   │   └── driver-status.routes.ts    # Statut livreur
│   │
│   ├── driver-dashboard.ts       # ⚠️ ANCIEN FICHIER (903 lignes - à vérifier)
│   ├── auth.ts                  # ✅ Nettoyé (OTP supprimé)
│   ├── restaurant-dashboard.ts  # ✅ Nettoyé (OTP supprimé)
│   ├── admin-crud.ts
│   ├── public.ts
│   ├── flouci.ts
│   └── ...
│
├── services/
│   ├── customer-auth-service.ts # ✅ Nettoyé (isOtpEnabled supprimé)
│   └── sms-service.ts           # ✅ Nettoyé (sendOtpSms supprimé)
│
├── middleware/
│   └── auth-helpers.ts
│   └── ❌ otp-login-helper.ts   # SUPPRIMÉ
│
└── scripts/
    └── test-complete-order-flow.ts # ✅ Mis à jour (OTP retiré)
```

## 🎨 Structure Frontend (`client/src/`)

```
client/src/
├── components/
│   ├── admin/                   # Composants admin (bien organisés)
│   ├── menu/                    # Composants menu
│   ├── onboarding/              # Composants onboarding
│   ├── ui/                      # Composants UI (shadcn/ui)
│   │   └── input-otp.tsx       # ⚠️ COMPOSANT UI GÉNÉRIQUE (pas lié à notre OTP)
│   │
│   ├── restaurant-card.tsx      # ✅ Amélioré (badges dynamiques)
│   ├── pwa-install-prompt.tsx   # ✅ Ajouté (bannière PWA)
│   └── ...
│
├── pages/
│   ├── home.tsx                 # ✅ Filtrage strict restaurants ouverts
│   ├── cart-page.tsx            # ✅ OTP supprimé du flux
│   ├── onboarding.tsx           # ✅ OTP supprimé
│   ├── order-history.tsx        # ✅ OTP supprimé (utilise téléphone direct)
│   ├── order-success.tsx        # ✅ Bannière PWA ajoutée
│   └── ...
│
├── hooks/
│   ├── use-onboarding.ts        # ✅ OTP supprimé
│   └── ...
│
├── lib/
│   ├── api.ts                   # ✅ Fonctions OTP supprimées
│   ├── i18n.tsx                 # ✅ Traductions PWA ajoutées
│   ├── restaurant-status.ts     # ✅ Fuseau horaire Tunisie
│   └── ...
│
└── features/
    └── order/                   # ✅ Structure modulaire (exemple)
        ├── hooks/
        ├── components/
        └── order.api.ts
```

## 🗑️ Code mort / Fichiers orphelins liés à l'OTP

### ❌ Fichiers supprimés
- `server/storage/otp-storage.ts` ✅ SUPPRIMÉ
- `server/middleware/otp-login-helper.ts` ✅ SUPPRIMÉ

### ⚠️ Références OTP restantes (commentaires/documentation uniquement)
- `server/storage.ts` ligne 11 : Commentaire mentionnant OtpStorage (à nettoyer)
- `server/services/sms-service.ts` : Peut contenir des commentaires OTP
- `server/scripts/test-complete-order-flow.ts` : Commentaire indiquant suppression OTP

### ✅ Fichiers nettoyés (OTP retiré)
- `server/routes/auth.ts` ✅
- `server/routes/driver/driver-auth.routes.ts` ✅
- `server/routes/restaurant-dashboard.ts` ✅
- `server/services/customer-auth-service.ts` ✅
- `client/src/lib/api.ts` ✅
- `client/src/pages/cart-page.tsx` ✅
- `client/src/pages/onboarding.tsx` ✅
- `client/src/pages/order-history.tsx` ✅
- `client/src/hooks/use-onboarding.ts` ✅
- `client/src/components/onboarding/step-progress.tsx` ✅

## 📊 Statistiques de refactoring

### Backend
- **server/storage.ts** : 342 lignes (orchestrateur léger) ✅
- **server/storage/** : 10 modules spécialisés (9 actifs + 1 supprimé)
- **server/routes/driver/** : 5 fichiers modulaires ✅
- **server/routes/driver-dashboard.ts** : 30 lignes ✅ (orchestrateur léger)

### Frontend
- **client/src/** : Structure partiellement modulaire
  - ✅ `features/order/` : Exemple de modularisation
  - ⚠️ `pages/` : Encore des fichiers monolithiques
  - ⚠️ `components/` : Mélange de composants (certains organisés, d'autres non)

## 🔍 Points à vérifier

1. **server/routes/driver-dashboard.ts** (903 lignes)
   - ⚠️ Ancien fichier monolithique
   - ✅ Routes driver modulaires créées dans `server/routes/driver/`
   - ❓ Vérifier si `driver-dashboard.ts` est encore utilisé

2. **client/src/components/ui/input-otp.tsx**
   - ✅ Composant UI générique (shadcn/ui)
   - ✅ Non lié à notre système OTP supprimé
   - ✅ Peut être conservé (composant réutilisable)

3. **Code mort potentiel**
   - ✅ Tous les fichiers OTP supprimés
   - ✅ `sms-service.ts` nettoyé (sendOtpSms supprimé)

## ✅ Améliorations récentes

1. ✅ **Badges dynamiques** : Compte à rebours ouverture/fermeture
2. ✅ **Fuseau horaire** : Africa/Tunis (UTC+1) partout
3. ✅ **Filtrage strict** : Restaurants ouverts uniquement
4. ✅ **Bannière PWA** : Ajoutée dans order-success.tsx
5. ✅ **OTP supprimé** : Système complètement retiré
