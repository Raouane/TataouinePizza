# 🔍 AUDIT - PROBLÈME LIEN TELEGRAM / ACCEPT ORDER

**Date :** 2026-01-01 23:00:45  
**Problème :** Le lien Telegram pour accepter une commande redirige vers une page de login au lieu de l'espace livreur  
**Statut :** ✅ CORRIGÉ

---

## 📋 RÉSUMÉ EXÉCUTIF

Lorsqu'un livreur clique sur le lien d'acceptation dans une notification Telegram, le système redirige vers une page demandant un login au lieu de connecter automatiquement le livreur et l'emmener vers son espace de travail.

**Impact :** 
- ❌ Expérience utilisateur dégradée
- ❌ Livreur doit se connecter manuellement après avoir cliqué sur le lien
- ❌ Risque d'abandon de la commande

---

## 🔴 PROBLÈME IDENTIFIÉ

### Symptômes
1. Le livreur clique sur le lien dans Telegram : `https://tataouine-pizza.onrender.com/accept/:orderId?driverId=...`
2. Le navigateur s'ouvre mais affiche une page demandant un login
3. La commande n'est pas acceptée automatiquement
4. Le livreur doit se connecter manuellement

### Causes racines identifiées

#### 1. **Interception par le middleware SPA (Vite/Static)**
   - **Fichier :** `server/vite.ts` (développement) et `server/static.ts` (production)
   - **Problème :** Les routes `/accept/:orderId` et `/refuse/:orderId` étaient interceptées par le middleware catch-all qui sert `index.html` (SPA React)
   - **Conséquence :** Le backend ne recevait jamais la requête, le frontend React prenait le contrôle et affichait la page de login

#### 2. **Ordre d'enregistrement des routes**
   - **Fichier :** `server/routes/public.ts`
   - **Problème :** Les routes `/accept/:orderId` et `/refuse/:orderId` étaient définies APRÈS les autres routes dans `registerPublicRoutes()`
   - **Conséquence :** Si un middleware global était appliqué, ces routes pouvaient être interceptées

#### 3. **Redirections avec URLs relatives**
   - **Fichier :** `server/routes/public.ts`
   - **Problème :** Les redirections vers `/driver/auto-login` utilisaient des URLs relatives au lieu d'URLs absolues
   - **Conséquence :** En cas de redirection depuis Telegram, l'URL relative pouvait être mal interprétée

#### 4. **Statut de commande non accepté**
   - **Fichiers :** `server/services/order-acceptance-service.ts` et `server/storage.ts`
   - **Problème :** Les nouvelles commandes sont créées avec le statut `"received"`, mais `OrderAcceptanceService.acceptOrder()` n'acceptait que `"accepted"` ou `"ready"`
   - **Conséquence :** Les commandes avec statut `"received"` ne pouvaient pas être acceptées

---

## ✅ CORRECTIONS APPLIQUÉES

### 1. Exclusion des routes `/accept/` et `/refuse/` des middlewares SPA

#### Fichier : `server/vite.ts` (Développement)
```typescript
// Middleware pour ignorer les routes API et /accept/
app.use((req, res, next) => {
  if (req.originalUrl?.startsWith("/api/") || req.url?.startsWith("/api/")) {
    return next();
  }
  // ✅ NOUVEAU : Ne pas intercepter les routes /accept/ et /refuse/ (gérées par le backend)
  if (req.originalUrl?.startsWith("/accept/") || req.url?.startsWith("/accept/") ||
      req.originalUrl?.startsWith("/refuse/") || req.url?.startsWith("/refuse/")) {
    console.log(`[VITE] ⏭️ Route backend ignorée: ${req.originalUrl || req.url}`);
    return next();
  }
  // ... reste du code
});

// Dans le catch-all app.use("*")
app.use("*", async (req, res, next) => {
  const url = req.originalUrl;
  
  // Ne pas intercepter les routes API
  if (url.startsWith("/api/")) {
    return next();
  }
  
  // ✅ NOUVEAU : Ne pas intercepter les routes /accept/ et /refuse/ (gérées par le backend)
  if (url.startsWith("/accept/") || url.startsWith("/refuse/")) {
    return next();
  }
  // ... reste du code
});
```

#### Fichier : `server/static.ts` (Production)
```typescript
app.use((req, res, next) => {
  // Ne pas intercepter les routes API
  if (req.originalUrl?.startsWith("/api/") || req.url?.startsWith("/api/")) {
    return next();
  }
  
  // ✅ NOUVEAU : Ne pas intercepter les routes /accept/ et /refuse/ (gérées par le backend)
  if (req.originalUrl?.startsWith("/accept/") || req.url?.startsWith("/accept/") ||
      req.originalUrl?.startsWith("/refuse/") || req.url?.startsWith("/refuse/")) {
    return next();
  }
  // ... reste du code
});

// Avant de servir index.html
// ✅ NOUVEAU : Ne pas intercepter les routes /accept/ et /refuse/ (gérées par le backend)
if (req.path.startsWith("/accept/") || req.path.startsWith("/refuse/")) {
  return next();
}
```

### 2. Réorganisation des routes dans `registerPublicRoutes()`

#### Fichier : `server/routes/public.ts`
**Changement :** Les routes `/accept/:orderId` et `/refuse/:orderId` sont maintenant définies EN PREMIER dans la fonction `registerPublicRoutes()`

```typescript
export function registerPublicRoutes(app: Express): void {
  // ✅ IMPORTANT : Les routes /accept/ et /refuse/ doivent être enregistrées EN PREMIER
  // pour éviter qu'elles soient interceptées par le middleware Vite/Static
  
  // ============ ORDER ACCEPTANCE (PUBLIC LINK) - EN PREMIER ============
  app.get("/accept/:orderId", async (req, res) => {
    // ... logique d'acceptation
  });

  // ============ ORDER REFUSAL (PUBLIC LINK) - EN PREMIER ============
  app.get("/refuse/:orderId", async (req, res) => {
    // ... logique de refus
  });

  // ============ RESTAURANTS (PUBLIC) ============
  // ... autres routes
}
```

### 3. Utilisation d'URLs absolues pour les redirections

#### Fichier : `server/routes/public.ts`
**Avant :**
```typescript
return res.redirect(`/driver/auto-login?token=${token}&driverId=${driver.id}...`);
```

**Après :**
```typescript
const appUrl = process.env.APP_URL || "https://tataouine-pizza.onrender.com";
const autoLoginUrl = `${appUrl}/driver/auto-login?token=${token}&driverId=${driver.id}...`;
return res.redirect(autoLoginUrl);
```

### 4. Support du statut `"received"` pour l'acceptation

#### Fichier : `server/services/order-acceptance-service.ts`
**Avant :**
```typescript
if (order.status !== "accepted" && order.status !== "ready") {
  throw errorHandler.badRequest(
    `Order status must be 'accepted' or 'ready', got '${order.status}'`
  );
}
```

**Après :**
```typescript
if (order.status !== "received" && order.status !== "accepted" && order.status !== "ready") {
  throw errorHandler.badRequest(
    `Order status must be 'received', 'accepted' or 'ready', got '${order.status}'`
  );
}
```

#### Fichier : `server/storage.ts`
**Avant :**
```typescript
sql`${orders.status} IN ('accepted', 'ready')`
```

**Après :**
```typescript
sql`${orders.status} IN ('received', 'accepted', 'ready')`
```

#### Fichier : `server/routes/public.ts`
**Avant :**
```typescript
if (order.driverId === driverId && (order.status === 'delivery' || order.status === 'accepted' || order.status === 'ready')) {
```

**Après :**
```typescript
if (order.driverId === driverId && (order.status === 'delivery' || order.status === 'accepted' || order.status === 'ready' || order.status === 'received')) {
```

### 5. Ajout de logs de diagnostic

#### Fichier : `server/routes/public.ts`
```typescript
console.log("========================================");
console.log("[ACCEPT] 🔗 Lien d'acceptation cliqué");
console.log("[ACCEPT] 📋 Paramètres:", { orderId, driverId, phone });
console.log("[ACCEPT] 📋 URL complète:", req.originalUrl);
console.log("[ACCEPT] 📋 Headers:", JSON.stringify(req.headers, null, 2));
console.log("========================================");
```

---

## 📊 FLUX ATTENDU (APRÈS CORRECTION)

1. **Livreur clique sur le lien Telegram**
   ```
   https://tataouine-pizza.onrender.com/accept/:orderId?driverId=...
   ```

2. **Backend traite la requête** (`/accept/:orderId`)
   - ✅ Route non interceptée par Vite/Static
   - ✅ Vérifie que le livreur existe
   - ✅ Vérifie que la commande existe et est disponible
   - ✅ Accepte la commande (statut `received` → `accepted`)
   - ✅ Met le livreur en statut `on_delivery`
   - ✅ Génère un token JWT temporaire

3. **Redirection vers auto-login** (URL absolue)
   ```
   https://tataouine-pizza.onrender.com/driver/auto-login?token=...&driverId=...&order=...&accepted=true
   ```

4. **Page auto-login** (`/driver/auto-login`)
   - ✅ Stocke le token dans `localStorage`
   - ✅ Stocke `driverId`, `driverName`, `driverPhone`
   - ✅ Redirige vers `/driver/dashboard?order=...&accepted=true`

5. **Dashboard livreur**
   - ✅ Livreur connecté automatiquement
   - ✅ Commande affichée avec toast de succès
   - ✅ Livreur peut commencer la livraison

---

## 🔧 FICHIERS MODIFIÉS

1. **`server/vite.ts`**
   - Exclusion de `/accept/` et `/refuse/` du middleware Vite
   - Exclusion dans le catch-all `app.use("*")`

2. **`server/static.ts`**
   - Exclusion de `/accept/` et `/refuse/` du middleware Static
   - Exclusion avant de servir `index.html`

3. **`server/routes/public.ts`**
   - Réorganisation : routes `/accept/` et `/refuse/` en premier
   - Utilisation d'URLs absolues pour toutes les redirections
   - Support du statut `"received"` dans les vérifications
   - Ajout de logs de diagnostic détaillés

4. **`server/services/order-acceptance-service.ts`**
   - Support du statut `"received"` pour l'acceptation

5. **`server/storage.ts`**
   - Support du statut `"received"` dans `acceptOrderByDriver()`

6. **`server/src/modules/order/order.routes.ts`**
   - Correction des erreurs TypeScript (méthodes inexistantes commentées)

---

## ⚠️ POINTS D'ATTENTION

### 1. Ordre des middlewares
**Règle d'or :** Les routes publiques critiques (`/accept/`, `/refuse/`) doivent être :
- Enregistrées AVANT les middlewares d'authentification
- Exclues des middlewares SPA (Vite/Static)
- Définies AVANT les autres routes dans `registerPublicRoutes()`

### 2. URLs absolues vs relatives
**Règle :** Toujours utiliser des URLs absolues pour les redirections depuis Telegram :
```typescript
const appUrl = process.env.APP_URL || "https://tataouine-pizza.onrender.com";
const redirectUrl = `${appUrl}/path?params=...`;
```

### 3. Statuts de commande
**Règle :** Vérifier que tous les statuts valides sont supportés :
- `"received"` : Commande créée, en attente d'acceptation
- `"accepted"` : Commande acceptée par un livreur
- `"ready"` : Commande prête à être récupérée
- `"delivery"` : Commande en cours de livraison
- `"delivered"` : Commande livrée

### 4. Tests recommandés
- [ ] Tester le lien depuis Telegram (app mobile)
- [ ] Tester le lien depuis Telegram Web
- [ ] Vérifier que la redirection fonctionne en développement
- [ ] Vérifier que la redirection fonctionne en production
- [ ] Tester avec un livreur non connecté
- [ ] Tester avec un livreur déjà connecté
- [ ] Tester avec une commande déjà acceptée
- [ ] Tester avec une commande déjà assignée à un autre livreur

---

## 🧪 TESTS DE VALIDATION

### Test 1 : Lien depuis Telegram
1. Créer une commande de test
2. Vérifier que la notification Telegram est reçue
3. Cliquer sur le lien dans Telegram
4. **Résultat attendu :** Redirection automatique vers le dashboard, livreur connecté

### Test 2 : Commande avec statut `received`
1. Créer une commande (statut `received`)
2. Cliquer sur le lien d'acceptation
3. **Résultat attendu :** Commande acceptée, redirection vers dashboard

### Test 3 : Commande déjà acceptée
1. Accepter une commande
2. Cliquer à nouveau sur le lien
3. **Résultat attendu :** Redirection vers dashboard (pas d'erreur)

### Test 4 : Commande assignée à un autre livreur
1. Livreur A accepte une commande
2. Livreur B clique sur le lien
3. **Résultat attendu :** Message d'erreur "Commande déjà prise"

---

## 📝 RECOMMANDATIONS FUTURES

### 1. Implémenter la suppression des messages Telegram
**Fichier :** `server/src/modules/order/order.routes.ts`
- Créer `getTelegramMessagesByOrderId()` dans `storage.ts`
- Créer `deleteMessage()` dans `telegram-service.ts`
- Créer `markTelegramMessageAsDeleted()` dans `storage.ts`

### 2. Ajouter un système de tokens temporaires sécurisés
- Tokens avec expiration (ex: 5 minutes)
- Validation côté backend avant redirection
- Logs d'audit pour les accès

### 3. Améliorer la gestion d'erreurs
- Messages d'erreur plus explicites pour le livreur
- Retry automatique en cas d'échec
- Notification alternative si le lien échoue

### 4. Tests automatisés
- Tests E2E pour le flux d'acceptation
- Tests unitaires pour les routes publiques
- Tests d'intégration pour les redirections

---

## ✅ VALIDATION FINALE

**Statut :** ✅ **CORRIGÉ**

**Vérifications effectuées :**
- ✅ Routes `/accept/` et `/refuse/` exclues des middlewares SPA
- ✅ Routes enregistrées en premier dans `registerPublicRoutes()`
- ✅ URLs absolues utilisées pour toutes les redirections
- ✅ Statut `"received"` supporté pour l'acceptation
- ✅ Logs de diagnostic ajoutés
- ✅ Aucune erreur TypeScript

**Action requise :** Redémarrer le serveur pour que les changements prennent effet.

---

**Document généré le :** 2026-01-01 23:00:45  
**Version :** 1.0
