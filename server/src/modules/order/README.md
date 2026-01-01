# Module Order V2

Module Order selon l'architecture V2 - Feature-Driven.

## Structure

```
order/
├── order.types.ts      # Types partagés (contrats)
├── order.storage.ts    # Couche d'accès aux données (SQL/ORM)
├── order.service.ts    # Logique métier
├── order.websocket.ts  # Events WebSocket
├── order.routes.ts    # Routes HTTP
└── README.md          # Ce fichier
```

## Utilisation

### Dans les routes

```typescript
import { registerOrderRoutes } from "./modules/order/order.routes";

// Dans server/routes.ts
registerOrderRoutes(app);
```

### Utiliser directement le service

```typescript
import { OrderService } from "./modules/order/order.service";

// Créer une commande
const result = await OrderService.createOrder({
  restaurantId: "...",
  customerName: "John Doe",
  phone: "21612345678",
  address: "123 Main St",
  items: [...]
});

// Récupérer une commande avec items
const order = await OrderService.getOrderWithItems(orderId);

// Mettre à jour le statut
await OrderService.updateStatus({
  orderId: "...",
  newStatus: "ready",
  actor: { type: "restaurant", id: "..." }
});
```

## Règles

- ✅ **Routes** : Validation uniquement, pas de logique métier
- ✅ **Service** : Toute la logique métier
- ✅ **Storage** : SQL/ORM uniquement, pas de logique
- ✅ **WebSocket** : Events uniquement

## Migration

Ce module coexiste avec l'ancien code. Pour migrer complètement :

1. Utiliser les nouvelles routes dans `server/routes.ts`
2. Tester que tout fonctionne
3. Désactiver progressivement les anciennes routes
