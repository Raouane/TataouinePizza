# 🎨 Guide Frontend V2

## 📁 Structure créée

```
client/src/
├── app/
│   ├── providers/
│   │   ├── auth-provider.tsx      # Gestion authentification
│   │   └── i18n-provider.tsx       # Wrapper i18n
│   └── guards/
│       ├── auth-guard.tsx          # Protection routes auth
│       ├── admin-guard.tsx         # Protection routes admin
│       └── driver-guard.tsx        # Protection routes driver
│
└── features/
    └── order/
        ├── order.types.ts          # Types partagés
        ├── order.api.ts            # Client API
        ├── hooks/
        │   └── use-order.ts        # Hooks React Query
        ├── pages/                  # Pages (à migrer)
        └── components/             # Composants (à migrer)
```

## 🔐 Providers

### AuthProvider

Gère l'authentification globale :

```typescript
import { AuthProvider, useAuth } from "@/app/providers/auth-provider";

function App() {
  return (
    <AuthProvider>
      {/* Votre app */}
    </AuthProvider>
  );
}

function MyComponent() {
  const { isAuthenticated, user, login, logout } = useAuth();
  // ...
}
```

### Guards

Protection des routes :

```typescript
import { AdminGuard } from "@/app/guards/admin-guard";

<Route path="/admin/dashboard">
  <AdminGuard fallback={<Navigate to="/admin/login" />}>
    <AdminDashboard />
  </AdminGuard>
</Route>
```

## 📦 Feature Order

### Utilisation des hooks

```typescript
import { useOrder, useCreateOrder } from "@/features/order/hooks/use-order";

function OrderPage() {
  const { data: order, isLoading } = useOrder(orderId);
  const createOrderMutation = useCreateOrder();

  const handleSubmit = async (data) => {
    const result = await createOrderMutation.mutateAsync(data);
    // result.orderId, result.totalPrice
  };
}
```

### Utilisation directe de l'API

```typescript
import { createOrder, getOrder } from "@/features/order/order.api";

const result = await createOrder({...});
const order = await getOrder(orderId);
```

## 🚀 Migration progressive

### Étape 1 : Utiliser les nouveaux providers

Dans `App.tsx`, remplacer progressivement :

```typescript
// Avant
<LanguageProvider>
  <OrderProvider>
    {/* ... */}
  </OrderProvider>
</LanguageProvider>

// Après (V2)
<AuthProvider>
  <LanguageProvider>
    <OrderProvider>
      {/* ... */}
    </OrderProvider>
  </LanguageProvider>
</AuthProvider>
```

### Étape 2 : Migrer les pages Order

1. Créer `features/order/pages/order-success.tsx`
2. Utiliser les nouveaux hooks
3. Tester

### Étape 3 : Migrer les composants

1. Créer `features/order/components/order-summary.tsx`
2. Utiliser les types V2
3. Tester

## 📝 Prochaines étapes

1. ✅ Providers et Guards créés
2. ✅ Feature Order créé (types, API, hooks)
3. ⏳ Migrer les pages Order
4. ⏳ Migrer les composants Order
5. ⏳ Créer les autres features (cart, auth, etc.)
