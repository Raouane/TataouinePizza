# 📋 EXPLICATION : FLUX D'UNE NOUVELLE COMMANDE

**Question :** Pourquoi une nouvelle commande n'arrive pas avec un `driverId` normalement ?

---

## ✅ RÉPONSE COURTE

**OUI, c'est NORMAL qu'une nouvelle commande n'ait PAS de `driverId` au départ.**

Une nouvelle commande est créée **SANS `driverId`** et reste en attente jusqu'à ce qu'un livreur l'accepte.

---

## 🔄 FLUX COMPLET D'UNE NOUVELLE COMMANDE

### 1️⃣ **CRÉATION DE LA COMMANDE** (Client passe commande)

**Fichier :** `server/src/modules/order/order.routes.ts` (ligne 35)

```typescript
POST /api/orders
```

**Ce qui se passe :**

1. **Validation des données** (client, restaurant, items, prix)
2. **Création de la commande** via `OrderService.createOrder()`
3. **Statut initial :** `"received"` (pas `"accepted"` ni `"ready"`)
4. **`driverId` :** `NULL` (aucun livreur assigné)
5. **Notification automatique** aux livreurs disponibles

**Code :**
```typescript
// server/src/modules/order/order.service.ts (ligne 102-113)
const order = await OrderStorage.createOrderWithItems(
  {
    restaurantId: input.restaurantId,
    customerName: input.customerName,
    // ... autres champs ...
    status: initialStatus, // "received"
    // ❌ PAS de driverId ici - c'est NULL
  },
  orderItemsData,
  // ...
);
```

**Résultat en base de données :**
```sql
INSERT INTO orders (
  id,
  restaurant_id,
  customer_name,
  status,        -- "received"
  driver_id,     -- NULL ✅ C'EST NORMAL
  total_price,
  created_at
) VALUES (...);
```

---

### 2️⃣ **NOTIFICATION DES LIVREURS** (Immédiatement après création)

**Fichier :** `server/src/modules/order/order.routes.ts` (ligne 104)

```typescript
await OrderWebSocket.notifyDrivers({
  type: "new_order",
  orderId: order.id,
  restaurantName: restaurant.name,
  customerName: data.customerName,
  // ...
});
```

**Ce qui se passe :**

1. **Recherche des livreurs disponibles** :
   - Statut : `"available"` ou `"on_delivery"`
   - Telegram ID configuré
   - Moins de 2 commandes actives

2. **Envoi de notification Telegram** au premier livreur disponible

3. **La commande reste SANS `driverId`** jusqu'à acceptation

---

### 3️⃣ **ACCEPTATION PAR UN LIVREUR** (Livreur clique sur le lien Telegram)

**Fichier :** `server/routes/public.ts` (ligne 43)

```typescript
GET /accept/:orderId?driverId=...
```

**Ce qui se passe :**

1. **Vérification** :
   - La commande existe
   - La commande est en statut `"received"` (pas encore acceptée)
   - Le livreur existe et est disponible
   - Le livreur a moins de 2 commandes actives

2. **Acceptation** via `OrderAcceptanceService.acceptOrder()`

3. **Mise à jour de la commande** :
   ```typescript
   // driverId est maintenant assigné
   order.driverId = driverId;  // ✅ Assigné ICI
   order.status = "accepted";   // Ou reste "received" selon la logique
   ```

4. **Redirection** vers le dashboard livreur

**Résultat en base de données :**
```sql
UPDATE orders
SET 
  driver_id = '2d780c33-f2f5-47e1-8f15-0d40875c878e',  -- ✅ Assigné ICI
  status = 'accepted',
  assigned_at = NOW()
WHERE id = '...';
```

---

## 📊 RÉSUMÉ DU FLUX

```
1. CLIENT PASSE COMMANDE
   ↓
   Commande créée :
   - status: "received"
   - driverId: NULL ✅ NORMAL
   ↓
2. NOTIFICATION LIVREURS
   ↓
   Telegram envoyé aux livreurs disponibles
   ↓
   Commande reste :
   - status: "received"
   - driverId: NULL ✅ Toujours NULL
   ↓
3. LIVREUR ACCEPTE (clic sur lien Telegram)
   ↓
   Commande mise à jour :
   - status: "accepted" (ou reste "received")
   - driverId: "2d780c33-..." ✅ Assigné ICI
   ↓
4. LIVRAISON
   ↓
   - status: "delivery" → "delivered"
   - driverId: toujours assigné
```

---

## ❓ POURQUOI PAS DE `driverId` AU DÉPART ?

### Raison 1 : **Système de demande/acceptation**

Le système fonctionne comme **Uber** ou **Deliveroo** :
- La commande est créée et **proposée** aux livreurs
- Les livreurs **choisissent** d'accepter ou non
- Le `driverId` n'est assigné qu'**après acceptation**

### Raison 2 : **Flexibilité et équité**

- Permet à **plusieurs livreurs** de voir la commande
- Le **premier qui accepte** obtient la commande
- Évite l'assignation automatique qui pourrait être injuste

### Raison 3 : **Gestion des indisponibilités**

- Si un livreur est **offline** ou **surchargé**, la commande reste disponible
- Le système de **re-notification périodique** (toutes les minutes) cherche d'autres livreurs
- La commande peut être acceptée par **n'importe quel livreur disponible**

---

## 🔍 COMMENT VÉRIFIER QU'UNE COMMANDE EST NOUVELLE ?

### Dans la base de données :

```sql
SELECT 
  id,
  customer_name,
  status,
  driver_id,        -- NULL = pas encore acceptée
  created_at
FROM orders
WHERE status = 'received' 
  AND driver_id IS NULL;  -- ✅ Commandes en attente
```

### Avec le script de diagnostic :

```bash
npx tsx server/scripts/check-pending-orders-and-driver.ts
```

**Résultat attendu :**
```
📦 COMMANDES EN ATTENTE
========================================
1. Commande #7f1da695...
   Statut: received
   Client: Client Test 3
   Livreur assigné: AUCUN  ✅ NORMAL - Pas encore acceptée
```

---

## ⚠️ CAS PARTICULIERS

### Cas 1 : Commande avec `driverId` mais statut `"received"`

**Problème :** Une commande a un `driverId` mais reste en `"received"`

**Causes possibles :**
- Le livreur a cliqué sur le lien mais n'a pas terminé l'acceptation
- Bug dans le processus d'acceptation
- Commande assignée manuellement par erreur

**Solution :** Utiliser le script de libération :
```bash
npx tsx server/scripts/release-driver-orders.ts [driverId]
```

### Cas 2 : Commande créée avec `driverId` directement

**C'est possible si :**
- Commande créée manuellement par un admin
- Assignation automatique (non implémenté actuellement)
- Test ou migration de données

**Mais normalement :** Toutes les commandes client sont créées **SANS `driverId`**

---

## 📝 RÈGLES D'OR

1. ✅ **Nouvelle commande = `driverId` NULL**
2. ✅ **Acceptation = `driverId` assigné**
3. ✅ **Re-notification = Cherche livreurs disponibles toutes les minutes**
4. ✅ **Limite = 2 commandes actives par livreur maximum**

---

## 🎯 CONCLUSION

**C'est TOTALEMENT NORMAL qu'une nouvelle commande n'ait pas de `driverId`.**

Le `driverId` est assigné **UNIQUEMENT** quand :
- Un livreur **accepte** la commande (clic sur lien Telegram)
- Un admin **assigne** manuellement la commande

**Le système fonctionne comme prévu !** 🎉

---

**Document créé le :** 2026-01-01  
**Dernière mise à jour :** 2026-01-01
