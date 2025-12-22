# Guide de Test - Notifications WebSocket pour Livreurs

## 📋 Comment vérifier que les livreurs reçoivent les notifications via WebSocket

### 🎯 Vue d'ensemble

Le système fonctionne ainsi :
1. **Client** passe une commande → Backend crée la commande
2. **Backend** notifie tous les livreurs connectés via WebSocket
3. **Livreur** reçoit la notification en temps réel sur son dashboard
4. **Livreur** peut accepter la commande via WebSocket (ou API REST en fallback)

---

## 🧪 Étapes de Test

### 1. Préparer l'environnement

```bash
# Démarrer le serveur
npm run dev
```

### 2. Se connecter en tant que livreur

1. Ouvrir le navigateur et aller sur : `http://localhost:5000/driver/login`
2. Se connecter avec un compte livreur (ex: `21612345678` / code OTP: `1234`)
3. Vous serez redirigé vers `/driver/dashboard`

### 3. Vérifier la connexion WebSocket

**Dans le dashboard livreur, vous verrez :**
- Un indicateur **"WS"** (bleu avec animation) = WebSocket connecté ✅
- Un indicateur **"Off"** (gris) = WebSocket déconnecté ❌

**Dans la console du navigateur (F12) :**
```
[WebSocket] Connecté
[WebSocket] Message reçu: {type: "connected", message: "..."}
```

### 4. Tester la réception de notification

**Option A : Depuis l'app client (recommandé)**
1. Ouvrir un **nouvel onglet** (ou un autre navigateur)
2. Aller sur `http://localhost:5000`
3. Passer une commande normale (onboarding → menu → panier → commande)
4. **Retourner sur l'onglet du livreur**

**Résultat attendu :**
- ✅ Toast notification : "Nouvelle commande disponible: [Nom Restaurant]"
- ✅ La commande apparaît dans la liste "Commandes disponibles"
- ✅ Console : `[WebSocket] Message reçu: {type: "new_order", ...}`

**Option B : Via l'API directement**
```bash
curl -X POST http://localhost:5000/api/orders \
  -H "Content-Type: application/json" \
  -d '{
    "restaurantId": "restaurant-id",
    "customerName": "Test Client",
    "phone": "21123456",
    "address": "123 Test Street",
    "items": [{"pizzaId": "pizza-id", "size": "medium", "quantity": 1}]
  }'
```

### 5. Tester l'acceptation de commande

**Dans le dashboard livreur :**
1. Cliquer sur **"Accepter"** sur une commande disponible
2. **Résultat attendu :**
   - ✅ Toast : "Commande acceptée avec succès"
   - ✅ La commande passe dans "Mes commandes"
   - ✅ Console : `[WebSocket] Message reçu: {type: "order_accepted", ...}`

**Si un autre livreur accepte en premier :**
- ✅ Toast : "Cette commande a déjà été acceptée par un autre livreur"
- ✅ Console : `[WebSocket] Message reçu: {type: "order_rejected", ...}`

---

## 🔍 Vérifications dans la Console

### Côté Serveur (Terminal)

Quand une commande est créée, vous devriez voir :
```
[ORDER] Webhook n8n envoyé pour commande order-123
[WebSocket] Notification nouvelle commande order-123 à tous les livreurs
[WebSocket] 2 livreur(s) en ligne trouvé(s)
[WebSocket] Notification envoyée à livreur driver-1
[WebSocket] Notification envoyée à livreur driver-2
```

Quand un livreur accepte :
```
[WebSocket] Livreur driver-1 accepte commande order-123
[WebSocket] Commande order-123 assignée à livreur driver-1
```

### Côté Client (Console navigateur)

**Connexion :**
```
[WebSocket] Connecté
[WebSocket] Message reçu: {type: "connected", message: "..."}
```

**Notification de commande :**
```
[WebSocket] Message reçu: {
  type: "new_order",
  orderId: "order-123",
  restaurantName: "Tataouine Pizza",
  customerName: "Raoua",
  address: "123 Test Street",
  totalPrice: "17.00",
  items: [...]
}
```

**Acceptation :**
```
[WebSocket] Message reçu: {
  type: "order_accepted",
  orderId: "order-123",
  message: "Commande assignée avec succès"
}
```

---

## 🐛 Dépannage

### Le livreur ne reçoit pas les notifications

1. **Vérifier la connexion WebSocket :**
   - L'indicateur "WS" doit être bleu et animé
   - Console : `[WebSocket] Connecté`

2. **Vérifier que le livreur est "En ligne" :**
   - Le switch "En ligne" doit être activé
   - Le statut dans la DB doit être `online` ou `available`

3. **Vérifier `last_seen` :**
   - Le livreur doit avoir un `last_seen` récent (< 5 minutes)
   - Le WebSocket met à jour `last_seen` automatiquement

4. **Vérifier les logs serveur :**
   - Le serveur doit afficher : `[WebSocket] X livreur(s) en ligne trouvé(s)`

### La commande n'apparaît pas dans "Commandes disponibles"

1. Vérifier que la commande a le statut `accepted` (pas `pending`)
2. Vérifier que la commande n'est pas déjà assignée (`driverId` est NULL)
3. Rafraîchir manuellement la liste (le WebSocket devrait le faire automatiquement)

### Erreur de connexion WebSocket

1. **Vérifier l'URL :**
   - Dev : `ws://localhost:5000/ws?driverId=...&token=...`
   - Prod : `wss://votre-domaine.com/ws?driverId=...&token=...`

2. **Vérifier l'authentification :**
   - `driverId` et `token` doivent être valides
   - Le token doit être dans `localStorage` après login

3. **Vérifier le serveur :**
   - Le serveur WebSocket doit être initialisé dans `server/routes.ts`
   - Vérifier les logs : `[WebSocket] Serveur WebSocket initialisé sur /ws`

---

## 📊 Test avec plusieurs livreurs

Pour tester le système de "premier accepte" :

1. **Ouvrir 2 onglets** avec 2 comptes livreurs différents
2. **Passer une commande** depuis l'app client
3. **Les 2 livreurs** reçoivent la notification
4. **Le premier qui clique "Accepter"** obtient la commande
5. **Le second** reçoit : "Commande déjà prise"

---

## ✅ Checklist de Test

- [ ] Livreur peut se connecter au dashboard
- [ ] Indicateur WebSocket montre "WS" (connecté)
- [ ] Console affiche `[WebSocket] Connecté`
- [ ] Création d'une commande depuis l'app
- [ ] Livreur reçoit la notification toast
- [ ] Commande apparaît dans "Commandes disponibles"
- [ ] Livreur peut accepter la commande
- [ ] Commande passe dans "Mes commandes"
- [ ] Si 2 livreurs acceptent, seul le premier obtient la commande
- [ ] Reconnexion automatique si WebSocket se déconnecte

---

## 🎉 C'est tout !

Le système est fonctionnel. Les livreurs reçoivent les notifications en temps réel via WebSocket dès qu'une commande est créée.

