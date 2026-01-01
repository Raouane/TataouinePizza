# Feature Order V2

Feature Order selon l'architecture V2 - Feature-Driven.

## Structure

```
features/order/
├── order.types.ts      # Types partagés
├── order.api.ts        # Client API
├── hooks/
│   └── use-order.ts   # Hooks React Query
├── pages/              # Pages (à migrer)
├── components/         # Composants (à migrer)
└── README.md          # Ce fichier
```

## Utilisation

### Dans un composant

```typescript
import { useOrder, useCreateOrder } from "@/features/order/hooks/use-order";

function MyComponent() {
  const { data: order, isLoading } = useOrder(orderId);
  const createOrderMutation = useCreateOrder();

  const handleCreate = async () => {
    const result = await createOrderMutation.mutateAsync({
      restaurantId: "...",
      customerName: "John Doe",
      phone: "21612345678",
      address: "123 Main St",
      items: [...]
    });
  };
}
```

### Utiliser directement l'API

```typescript
import { createOrder, getOrder } from "@/features/order/order.api";

// Créer une commande
const result = await createOrder({...});

// Récupérer une commande
const order = await getOrder(orderId);
```

## Règles

- ✅ **Pages** : Orchestration uniquement
- ✅ **Components** : Présentation uniquement
- ✅ **Hooks** : Logique métier (React Query)
- ✅ **API** : Requêtes HTTP uniquement

## Migration

Ce feature coexiste avec l'ancien code. Pour migrer complètement :

1. Migrer les pages vers `features/order/pages/`
2. Migrer les composants vers `features/order/components/`
3. Utiliser les nouveaux hooks au lieu de l'ancien code
