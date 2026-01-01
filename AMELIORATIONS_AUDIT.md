# 🛠️ Améliorations Suite Audit — Détails Techniques

**Date** : 2025-01-XX  
**Priorité** : 1 (Robustesse Immédiate)

---

## 🔴 Priorité 1 — Robustesse Immédiate

### 1.1 Refactor `/success` — Découpage en Hook

**Problème** : `/success` trop chargé (état, WebSocket, transitions, navigation)

**Solution** : Extraire logique dans hook dédié `useOrderTracking()`

**Fichiers à créer/modifier** :
- `client/src/hooks/use-order-tracking.ts` (nouveau)
- `client/src/pages/order-success.tsx` (refactor)

**Bénéfices** :
- Code plus maintenable
- Réutilisable ailleurs
- Tests plus faciles
- Séparation des responsabilités

---

### 1.2 Fallback localStorage — Session Serveur

**Problème** : localStorage peut être nettoyé sur mobile (PWA)

**Solution** : Session serveur légère + resync automatique

**Fichiers à créer/modifier** :
- `client/src/lib/session-sync.ts` (nouveau)
- `server/routes/session.ts` (nouveau route)
- `client/src/pages/onboarding.tsx` (appel sync)
- `client/src/pages/cart-page.tsx` (appel sync)

**Bénéfices** :
- Résilience mobile
- Pas de perte de données utilisateur
- Transparent pour l'utilisateur

---

### 1.3 Machine d'État Centralisée — Backend

**Problème** : Logique de statut dupliquée côté frontend

**Solution** : Backend expose transitions autorisées

**Fichiers à créer/modifier** :
- `server/src/modules/order/order.service.ts` (ajout méthodes)
- `server/src/modules/order/order.routes.ts` (nouvelle route)
- `client/src/hooks/use-order-transitions.ts` (nouveau)

**Bénéfices** :
- Source de vérité unique
- Évite incohérences
- Facilite évolutions futures

---

## 🟡 Priorité 2 — UX Livreur

### 2.1 Gestion Double-Clic — UI Feedback

**Problème** : Double-clic sur lien Telegram → message pas assez clair

**Solution** : Message plus rassurant + redirection propre

**Fichiers à modifier** :
- `server/routes/public.ts` (améliorer message HTML)

**Bénéfices** :
- Meilleure UX livreur
- Moins de frustration
- Confiance accrue

---

### 2.2 Affichage Cyclique — Override Urgent

**Problème** : Commande urgente masquée par cycle 30s/10s

**Solution** : Priorité visuelle + override pour commandes > 50 TND

**Fichiers à modifier** :
- `client/src/pages/driver-dashboard.tsx` (logique priorité)

**Bénéfices** :
- Commandes importantes visibles
- Meilleur taux d'acceptation
- Réactivité améliorée

---

## 🟢 Priorité 3 — Améliorations Futures

### 3.1 Invalidation Cache React Query via WebSocket

**Fichiers à créer/modifier** :
- `client/src/lib/websocket-query-invalidation.ts` (nouveau)

### 3.2 NotificationService Unifié

**Fichiers à créer/modifier** :
- `client/src/lib/notification-service.ts` (nouveau)

---

## 📊 Checklist Implémentation

### Phase 1 — Priorité 1 (Immédiat)

- [ ] 1.1 Créer hook `useOrderTracking()`
- [ ] 1.1 Refactor `order-success.tsx` pour utiliser le hook
- [ ] 1.2 Créer `session-sync.ts` (client)
- [ ] 1.2 Créer route `/api/session/sync` (serveur)
- [ ] 1.2 Intégrer sync dans onboarding et cart
- [ ] 1.3 Ajouter méthodes transitions dans `OrderService`
- [ ] 1.3 Créer route `/api/orders/:id/transitions`
- [ ] 1.3 Créer hook `useOrderTransitions()`
- [ ] Tests unitaires pour chaque amélioration
- [ ] Tests d'intégration flux complet

### Phase 2 — Priorité 2 (Court terme)

- [ ] 2.1 Améliorer message double-clic
- [ ] 2.2 Implémenter logique priorité commandes
- [ ] Tests UX livreur

### Phase 3 — Priorité 3 (Moyen terme)

- [ ] 3.1 Invalidation cache React Query
- [ ] 3.2 NotificationService unifié
- [ ] Documentation

---

## 🎯 Métriques de Succès

### Avant Améliorations
- Complexité `/success` : ~465 lignes, 8 useState
- Dépendance localStorage : 100%
- Logique statut : Dupliquée frontend/backend

### Après Améliorations (Objectif)
- Complexité `/success` : ~150 lignes, 2 useState
- Dépendance localStorage : 50% (fallback serveur)
- Logique statut : Centralisée backend uniquement

---

**Document créé le** : 2025-01-XX  
**Statut** : En cours d'implémentation
