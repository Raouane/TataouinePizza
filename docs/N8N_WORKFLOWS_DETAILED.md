# 📋 n8n — Détails des workflows (Node par Node)

## 🔔 Workflow 1 : Nouvelle commande client

### Structure n8n

```
┌─────────────────┐
│  Webhook Node   │ ← POST /webhook/order-created
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  HTTP Request   │ ← GET /api/restaurants/{id}
│  (Vérif resto)  │
└────────┬────────┘
         │
         ├─ Restaurant ouvert ──┐
         │                       │
         ▼                       ▼
┌─────────────────┐    ┌─────────────────┐
│  WhatsApp Node  │    │  WhatsApp Node  │
│  (Client OK)    │    │  (Client Fermé) │
└────────┬────────┘    └─────────────────┘
         │
         ▼
┌─────────────────┐
│  HTTP Request   │ ← POST /api/admin/orders/{id}/status
│  (Status=accepted)│
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  WhatsApp Node  │
│  (Notif resto)  │
└─────────────────┘
```

### Configuration des nodes

#### 1. Webhook Node
- **Method** : POST
- **Path** : `/webhook/order-created`
- **Authentication** : Header `x-n8n-token`

#### 2. HTTP Request (Vérif restaurant)
- **Method** : GET
- **URL** : `{{$env.BACKEND_API_URL}}/api/restaurants/{{$json.restaurant_id}}`
- **Headers** : 
  ```
  Authorization: Bearer {{$env.BACKEND_API_TOKEN}}
  ```

#### 3. IF Node (Restaurant ouvert ?)
- **Condition** : `{{$json.isOpen}} === true`

#### 4. WhatsApp Node (Client - OK)
- **To** : `{{$json.client.phone}}`
- **Message** : Template message de confirmation

#### 5. HTTP Request (Mise à jour status)
- **Method** : PATCH
- **URL** : `{{$env.BACKEND_API_URL}}/api/admin/orders/{{$json.order_id}}/status`
- **Body** :
  ```json
  {
    "status": "accepted"
  }
  ```

---

## 🚴 Workflow 2 : Dispatch livreurs (20 secondes)

### Structure n8n

```
┌─────────────────┐
│  Webhook Node   │ ← POST /webhook/order-ready
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  HTTP Request   │ ← GET /api/admin/drivers
│  (Livreurs)     │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Split In Batches│ (Pour chaque livreur)
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  WhatsApp Node  │ (Notif tous les livreurs)
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Wait Node      │ (20 secondes)
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Webhook Node   │ (Écouter réponses)
│  (Incoming)     │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  IF Node        │ (Réponse = "ACCEPTER" ?)
└────────┬────────┘
         │
         ├─ Oui ──┐
         │        │
         ▼        ▼
┌─────────────────┐  ┌─────────────────┐
│  HTTP Request   │  │  WhatsApp Node  │
│  (Assigner)     │  │  (Déjà prise)   │
└────────┬────────┘  └─────────────────┘
         │
         ▼
┌─────────────────┐
│  WhatsApp Node  │ (Notif autres livreurs)
└─────────────────┘
```

### Configuration des nodes

#### 1. Webhook Node (Trigger)
- **Method** : POST
- **Path** : `/webhook/order-ready`

#### 2. HTTP Request (Récupérer livreurs)
- **Method** : GET
- **URL** : `{{$env.BACKEND_API_URL}}/api/admin/drivers`
- **Filter** : `status === "available" || status === "online"`

#### 3. Split In Batches
- **Batch Size** : 1 (un livreur à la fois)

#### 4. WhatsApp Node (Notification)
- **To** : `{{$json.phone}}`
- **Message** :
  ```
  📦 Nouvelle livraison disponible
  
  Commande #{{$('Webhook').item.json.order_id}}
  Restaurant : {{$('Webhook').item.json.restaurant_name}}
  Client : {{$('Webhook').item.json.client.name}}
  Adresse : {{$('Webhook').item.json.client.address}}
  Total : {{$('Webhook').item.json.total}} TND
  
  Répondez "ACCEPTER" dans les 20 secondes
  ```

#### 5. Wait Node
- **Duration** : 20 seconds

#### 6. Webhook Node (Incoming - Écouter réponses)
- **Method** : POST
- **Path** : `/webhook/whatsapp-incoming`
- **Filter** : `body.message === "ACCEPTER"`

#### 7. HTTP Request (Vérifier disponibilité)
- **Method** : GET
- **URL** : `{{$env.BACKEND_API_URL}}/api/orders/{{$json.order_id}}`
- **Check** : `status === "ready" && driverId === null`

#### 8. HTTP Request (Assigner livreur)
- **Method** : POST
- **URL** : `{{$env.BACKEND_API_URL}}/api/driver/orders/{{$json.order_id}}/accept`
- **Headers** :
  ```
  Authorization: Bearer {{$json.driver_token}}
  ```

---

## 📲 Workflow 3 : Suivi commande

### 3.1 : Restaurant "Prêt"

```
┌─────────────────┐
│  Webhook Node   │ ← POST /webhook/order-ready
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  HTTP Request   │ ← PATCH /api/admin/orders/{id}/status
│  (Status=ready) │
└────────┬────────┘
         │
         ├─┐
         │ │
         ▼ ▼
┌─────────────────┐  ┌─────────────────┐
│  WhatsApp Node  │  │  Trigger Workflow│
│  (Client)       │  │  (Dispatch)      │
└─────────────────┘  └─────────────────┘
```

### 3.2 : Livreur "Récupérée"

```
┌─────────────────┐
│  Webhook Node   │ ← POST /webhook/order-picked-up
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  HTTP Request   │ ← PATCH /api/driver/orders/{id}/status
│  (Status=delivery)│
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  WhatsApp Node  │
│  (Client)       │
└─────────────────┘
```

### 3.3 : Livreur "Livrée"

```
┌─────────────────┐
│  Webhook Node   │ ← POST /webhook/order-delivered
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  HTTP Request   │ ← PATCH /api/driver/orders/{id}/status
│  (Status=delivered)│
└────────┬────────┘
         │
         ├─┐
         │ │
         ▼ ▼
┌─────────────────┐  ┌─────────────────┐
│  WhatsApp Node  │  │  Trigger Workflow│
│  (Client)       │  │  (Fin commande)  │
└─────────────────┘  └─────────────────┘
```

---

## 💰 Workflow 5 : Fin de commande

```
┌─────────────────┐
│  Webhook Node   │ ← POST /webhook/order-delivered
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Code Node      │ (Calcul commissions)
│  driver: 2.5    │
│  app: 1.5       │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  HTTP Request   │ ← POST /api/admin/orders/{id}/commissions
│  (Enregistrer)  │
└────────┬────────┘
         │
         ├─┐
         │ │
         ▼ ▼
┌─────────────────┐  ┌─────────────────┐
│  WhatsApp Node  │  │  WhatsApp Node  │
│  (Client)       │  │  (Livreur)      │
└─────────────────┘  └─────────────────┘
```

---

## 🔧 Configuration n8n

### Variables d'environnement

Dans n8n → Settings → Environment Variables :

```env
BACKEND_API_URL=https://tataouine-pizza.onrender.com
BACKEND_API_TOKEN=your_jwt_token_here
WHATSAPP_API_KEY=your_whatsapp_api_key
WHATSAPP_PHONE_NUMBER_ID=your_phone_number_id
N8N_WEBHOOK_TOKEN=your_secure_token_here
```

### Credentials WhatsApp

1. Aller dans n8n → Credentials
2. Créer une nouvelle credential "WhatsApp Business API"
3. Configurer avec :
   - API Key
   - Phone Number ID
   - Access Token

---

## 🧪 Tests

### Test Workflow 1
```bash
curl -X POST https://your-n8n.com/webhook/order-created \
  -H "Content-Type: application/json" \
  -H "x-n8n-token: your_token" \
  -d '{
    "order_id": "test-123",
    "restaurant_id": "R1",
    "client": {
      "name": "Test",
      "phone": "+21612345678"
    },
    "total": "18.00"
  }'
```

### Test Workflow 2
```bash
curl -X POST https://your-n8n.com/webhook/order-ready \
  -H "Content-Type: application/json" \
  -H "x-n8n-token: your_token" \
  -d '{
    "order_id": "test-123",
    "restaurant_name": "BAB EL HARA"
  }'
```

---

## 📝 Notes importantes

1. **Timer 20 secondes** : Utiliser le node "Wait" de n8n, pas un sleep JavaScript
2. **Premier arrivé** : Vérifier toujours via API avant d'assigner (race condition)
3. **Webhooks sécurisés** : Toujours vérifier le token dans le header
4. **Gestion d'erreurs** : Ajouter des nodes "Error Trigger" pour chaque workflow
5. **Logs** : Activer les logs n8n pour le débogage

