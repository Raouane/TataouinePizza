# 🔧 Exemples d'Intégration - Architecture V2

## 🎯 Exemples pratiques

### Backend - Utiliser le service Order V2

```typescript
import { OrderService } from "./src/modules/order/order.service";

// Créer une commande
const result = await OrderService.createOrder({
  restaurantId: "resto-001",
  customerName: "John Doe",
  phone: "21612345678",
  address: "123 Main Street",
  items: [
    { pizzaId: "pizza-001", size: "medium", quantity: 1 }
  ]
});

// Mettre à jour le statut
await OrderService.updateStatus({
  orderId: result.orderId,
  newStatus: "ready",
  actor: { type: "restaurant", id: "resto-001" }
});
```

Voir `server/src/modules/order/order.example.ts` pour plus d'exemples.

---

### Frontend - Utiliser les hooks V2

```typescript
import { useOrder, useCreateOrder } from "@/features/order/hooks/use-order";

function MyComponent() {
  const { data: order, isLoading } = useOrder(orderId);
  const createOrderMutation = useCreateOrder();

  const handleCreate = async () => {
    const result = await createOrderMutation.mutateAsync({
      restaurantId: "resto-001",
      customerName: "John",
      phone: "21612345678",
      address: "123 Main St",
      items: [{ pizzaId: "pizza-001", size: "medium", quantity: 1 }]
    });
    
    console.log("Commande créée:", result.orderId);
  };

  return (
    <div>
      {isLoading ? "Chargement..." : JSON.stringify(order)}
      <button onClick={handleCreate}>Créer commande</button>
    </div>
  );
}
```

Voir `client/src/features/order/examples/integration-example.tsx` pour plus d'exemples.

---

## 🔄 Migration d'un composant existant

### Avant (ancien code)

```typescript
// Ancien code dans cart-page.tsx
import { createOrder } from "@/lib/api";

const handleSubmit = async () => {
  const result = await createOrder({
    restaurantId: "...",
    customerName: "...",
    // ...
  });
};
```

### Après (code V2)

```typescript
// Nouveau code avec hooks V2
import { useCreateOrder } from "@/features/order/hooks/use-order";

function CartPage() {
  const createOrderMutation = useCreateOrder();

  const handleSubmit = async () => {
    const result = await createOrderMutation.mutateAsync({
      restaurantId: "...",
      customerName: "...",
      // ...
    });
    
    // React Query gère automatiquement le cache et les états
  };
}
```

**Avantages** :
- ✅ Gestion automatique du loading/error
- ✅ Cache automatique
- ✅ Invalidation automatique
- ✅ Optimistic updates possibles

---

## 🧩 Intégration dans App.tsx

### Ajouter AuthProvider

```typescript
// Dans App.tsx
import { AuthProvider } from "@/app/providers/auth-provider";
import { LanguageProvider } from "@/app/providers/i18n-provider";

function App() {
  return (
    <AuthProvider>
      <LanguageProvider>
        <QueryClientProvider client={queryClient}>
          {/* ... reste de l'app ... */}
        </QueryClientProvider>
      </LanguageProvider>
    </AuthProvider>
  );
}
```

### Utiliser les Guards

```typescript
import { AdminGuard } from "@/app/guards/admin-guard";

<Route path="/admin/dashboard">
  <AdminGuard fallback={<Navigate to="/admin/login" />}>
    <AdminDashboard />
  </AdminGuard>
</Route>
```

---

## 📝 Checklist d'intégration

### Pour migrer une page Order

- [ ] Importer les hooks V2
- [ ] Remplacer les appels API directs par les hooks
- [ ] Utiliser les types V2
- [ ] Tester que tout fonctionne
- [ ] Supprimer l'ancien code

### Pour créer un nouveau domaine

1. **Backend** :
   - [ ] Créer `modules/[domain]/[domain].types.ts`
   - [ ] Créer `modules/[domain]/[domain].storage.ts`
   - [ ] Créer `modules/[domain]/[domain].service.ts`
   - [ ] Créer `modules/[domain]/[domain].routes.ts`
   - [ ] Ajouter feature flag
   - [ ] Intégrer dans `server/routes.ts`

2. **Frontend** :
   - [ ] Créer `features/[domain]/[domain].types.ts`
   - [ ] Créer `features/[domain]/[domain].api.ts`
   - [ ] Créer `features/[domain]/hooks/use-[domain].ts`
   - [ ] Migrer les pages
   - [ ] Migrer les composants

---

## 🎓 Bonnes pratiques

### Backend
- ✅ Toujours utiliser le service, jamais le storage directement
- ✅ Validation dans les routes uniquement
- ✅ Logique métier dans le service uniquement
- ✅ SQL/ORM dans le storage uniquement

### Frontend
- ✅ Utiliser les hooks React Query
- ✅ Gérer les états loading/error
- ✅ Utiliser les types V2
- ✅ Centraliser l'API dans `[feature].api.ts`

---

## 📚 Ressources

- `server/src/modules/order/order.example.ts` - Exemples backend
- `client/src/features/order/examples/integration-example.tsx` - Exemples frontend
- `USAGE_V2.md` - Guide d'utilisation complet
- `ARCHITECTURE_V2.md` - Architecture détaillée
