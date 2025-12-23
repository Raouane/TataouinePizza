# 🔁 Intégration n8n — Orchestration des workflows

## 🎯 Vue d'ensemble

n8n est utilisé comme **cerveau d'orchestration** pour :
- ✅ Notifications WhatsApp (clients, restaurants, livreurs)
- ✅ Dispatch automatique des livreurs (système "premier arrivé")
- ✅ Gestion des statuts de commande
- ✅ Logique temporelle (timer 20 secondes)
- ✅ Centralisation des échanges (pas de WhatsApp direct)

**Principe** : Le backend déclenche des webhooks n8n → n8n décide quoi faire → n8n met à jour le backend via API REST.

---

## 🏗️ Architecture

```
┌─────────────┐         ┌─────────────┐         ┌─────────────┐
│   Client    │────────▶│   Backend   │────────▶│     n8n     │
│  (Frontend) │         │   (API)     │         │ (Orchestr.) │
└─────────────┘         └─────────────┘         └─────────────┘
                                                         │
                                                         ▼
                                                  ┌─────────────┐
                                                  │  WhatsApp   │
                                                  │ Business API│
                                                  └─────────────┘
```

**Règles importantes** :
- Backend = source de vérité (base de données)
- n8n = stateless (pas de stockage définitif)
- Webhooks sécurisés (token d'authentification)
- Pas de boucles infinies

---

## 🔔 Workflow 1 : Nouvelle commande client

### Trigger
**Webhook n8n** : `POST /webhook/order-created`

### Payload attendu
```json
{
  "order_id": "123",
  "restaurant_id": "R1",
  "restaurant_name": "BAB EL HARA",
  "restaurant_phone": "+21699999999",
  "client": {
    "name": "Ali",
    "phone": "+21612345678"
  },
  "address": "Rue de la République, Tataouine",
  "total": "18.00",
  "items": [
    {
      "name": "Pizza Margherita",
      "size": "medium",
      "quantity": 1,
      "price": "18.00"
    }
  ],
  "status": "accepted"
}
```

### Actions n8n

1. **Notification client** (WhatsApp)
   ```
   🍔 Commande reçue sur Tataouine Pizza
   
   Restaurant : BAB EL HARA
   Total : 18.00 TND
   Paiement : En espèces à la livraison
   
   Votre commande est en préparation...
   ```

2. **Vérification restaurant** (API Backend)
   ```
   GET /api/restaurants/{restaurant_id}
   ```
   - Vérifier `isOpen === true`
   - Vérifier horaires d'ouverture

3. **Si restaurant ouvert** :
   - Mettre à jour status : `POST /api/admin/orders/{order_id}/status` → `"accepted"`
   - Notifier restaurant (WhatsApp) :
     ```
     📦 Nouvelle commande #123
     
     Client : Ali
     Adresse : Rue de la République
     Total : 18.00 TND
     
     [Bouton : Accepter] [Bouton : Refuser]
     ```

4. **Si restaurant fermé** :
   - Notifier client (WhatsApp) :
     ```
     ⚠️ Restaurant actuellement fermé
     
     Votre commande sera traitée dès l'ouverture.
     ```

---

## 🚴 Workflow 2 : Dispatch livreurs (20 secondes)

### Trigger
**Webhook n8n** : `POST /webhook/order-ready` (quand `status = "ready"`)

### Payload attendu
```json
{
  "order_id": "123",
  "restaurant_id": "R1",
  "restaurant_name": "BAB EL HARA",
  "restaurant_address": "6 Place De L'Abbaye",
  "client": {
    "name": "Ali",
    "phone": "+21612345678",
    "address": "Rue de la République, Tataouine",
    "lat": 33.0,
    "lng": 10.5
  },
  "total": "18.00"
}
```

### Actions n8n

1. **Récupérer livreurs actifs** (API Backend)
   ```
   GET /api/admin/drivers
   ```
   Filtrer : `status === "available"` ou `status === "online"`

2. **Envoyer WhatsApp à tous les livreurs**
   ```
   📦 Nouvelle livraison disponible
   
   Commande #123
   Restaurant : BAB EL HARA
   Client : Ali
   Adresse : Rue de la République
   Total : 18.00 TND
   
   Répondez "ACCEPTER" dans les 20 secondes
   ```

3. **Démarrer timer 20 secondes**
   - Utiliser node "Wait" ou "Sleep" dans n8n
   - Pendant ce temps, écouter les réponses WhatsApp

4. **Logique "Premier arrivé"**

   **Si réponse WhatsApp = "ACCEPTER"** :
   
   a. Vérifier via API :
      ```
      GET /api/orders/{order_id}
      ```
      Vérifier : `status === "ready"` ET `driverId === null`
   
   b. Si disponible :
      - Assigner livreur :
        ```
        POST /api/driver/orders/{order_id}/accept
        Headers: Authorization: Bearer {driver_token}
        ```
      - Mettre à jour status → `"delivery"`
      - Notifier les autres livreurs :
        ```
        ⚠️ Commande #123 déjà assignée
        ```
      - Notifier le livreur assigné :
        ```
        ✅ Commande #123 assignée
        Adresse restaurant : 6 Place De L'Abbaye
        Adresse client : Rue de la République
        ```
   
   c. Si déjà assignée :
      - Répondre au livreur :
        ```
        ❌ Commande déjà assignée à un autre livreur
        ```

5. **Après 20 secondes** (si aucun livreur n'a accepté)
   - Notifier l'admin :
     ```
     ⚠️ Aucun livreur disponible pour la commande #123
     ```
   - Optionnel : Réessayer avec un délai plus long

---

## 📲 Workflow 3 : Suivi commande

### Trigger 3.1 : Restaurant clique "Prêt"
**Webhook** : `POST /webhook/order-ready`

### Actions
1. Mettre à jour status : `POST /api/admin/orders/{order_id}/status` → `"ready"`
2. Déclencher **Workflow 2** (Dispatch livreurs)
3. Notifier client :
   ```
   ✅ Votre commande est prête !
   Un livreur va venir la récupérer.
   ```

---

### Trigger 3.2 : Livreur clique "Récupérée"
**Webhook** : `POST /webhook/order-picked-up`

### Actions
1. Mettre à jour status : `POST /api/driver/orders/{order_id}/status` → `"delivery"`
2. Notifier client :
   ```
   🚴 Votre commande est en route !
   Le livreur est parti du restaurant.
   Temps estimé : 15-20 minutes
   ```

---

### Trigger 3.3 : Livreur clique "Livrée"
**Webhook** : `POST /webhook/order-delivered`

### Actions
1. Mettre à jour status : `POST /api/driver/orders/{order_id}/status` → `"delivered"`
2. Notifier client :
   ```
   ✅ Commande livrée !
   Merci d'avoir commandé sur Tataouine Pizza 🙏
   ```
3. Déclencher **Workflow 5** (Fin de commande)

---

## 📞 Workflow 4 : Communication centralisée

### Principe
- Le client **ne contacte jamais directement** le livreur
- Tous les messages passent par WhatsApp Business API via n8n
- n8n agit comme proxy pour éviter le contournement de l'app

### Exemple : Client demande un update
1. Client envoie WhatsApp : "Où est ma commande ?"
2. n8n reçoit le message
3. n8n vérifie le statut via API : `GET /api/orders/{order_id}`
4. n8n répond automatiquement :
   ```
   📦 Statut de votre commande #123
   
   Statut : En route
   Livreur : Mohamed
   Temps estimé : 10 minutes
   ```

---

## 💰 Workflow 5 : Fin de commande

### Trigger
**Webhook** : `POST /webhook/order-delivered` (quand `status = "delivered"`)

### Payload
```json
{
  "order_id": "123",
  "total": "18.00",
  "driver_id": "D1",
  "driver_name": "Mohamed"
}
```

### Actions

1. **Calculer commissions**
   - Livreur : 2.5 TND (fixe)
   - App : 1.5 TND (fixe)
   - Restaurant : Total - 4.0 TND

2. **Enregistrer commissions** (API Backend)
   ```
   POST /api/admin/orders/{order_id}/commissions
   {
     "driver_commission": "2.50",
     "app_commission": "1.50"
   }
   ```

3. **Message client final**
   ```
   ✅ Commande livrée !
   
   Merci d'avoir commandé sur Tataouine Pizza 🙏
   
   Notez votre expérience : [Lien évaluation]
   ```

4. **Message livreur**
   ```
   💰 Commande #123 livrée
   
   Commission : 2.50 TND
   Total gagné aujourd'hui : XX TND
   ```

---

## 🔐 Sécurité & Configuration

### Webhooks sécurisés
Tous les webhooks n8n doivent être protégés par un token :

```typescript
// Dans server/routes.ts
app.post("/webhook/order-created", async (req, res) => {
  const token = req.headers['x-n8n-token'];
  if (token !== process.env.N8N_WEBHOOK_TOKEN) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  // ... traitement
});
```

### Variables d'environnement n8n
```env
BACKEND_API_URL=https://tataouine-pizza.onrender.com
BACKEND_API_TOKEN=your_jwt_token
WHATSAPP_API_KEY=your_whatsapp_key
WHATSAPP_PHONE_NUMBER_ID=your_phone_id
```

---

## 🧩 Contraintes techniques

### Backend (Source de vérité)
- ✅ Toutes les données métier sont dans PostgreSQL
- ✅ n8n ne stocke que des données temporaires (workflow state)
- ✅ Toutes les mises à jour passent par l'API REST

### n8n (Stateless)
- ✅ Pas de base de données persistante
- ✅ Utilise uniquement les webhooks et API REST
- ✅ Gère la logique temporelle (timers, délais)

### Pas de boucles infinies
- ✅ Chaque workflow a un point d'entrée unique
- ✅ Les webhooks ne se déclenchent pas mutuellement en boucle
- ✅ Utiliser des flags dans le backend pour éviter les doubles traitements

---

## 📌 Résumé ultra-court

> n8n orchestre les notifications WhatsApp, le dispatch livreur (20s, premier accepté), la mise à jour des statuts de commande et la centralisation des échanges, en se basant uniquement sur des webhooks backend et des appels API REST.

---

## 🚀 Prochaines étapes

1. **Créer les workflows n8n** selon les spécifications ci-dessus
2. **Configurer WhatsApp Business API** dans n8n
3. **Tester chaque workflow** avec des données de test
4. **Intégrer les webhooks** dans le backend
5. **Sécuriser les webhooks** avec des tokens

---

## 📚 Ressources

- [Documentation n8n](https://docs.n8n.io/)
- [WhatsApp Business API](https://developers.facebook.com/docs/whatsapp)
- [API Backend Documentation](./API.md)

