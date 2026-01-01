# 🎨 Guide d'Intégration Frontend - Architecture V2

## 🎯 Objectif

Ce guide vous montre comment intégrer les hooks V2 dans votre application frontend existante.

---

## 📋 Étape 1 : Importer les hooks

```typescript
import { useOrder, useCreateOrder, useCustomerOrders } from "@/features/order/hooks/use-order";
```

---

## 📋 Étape 2 : Utiliser les hooks dans vos composants

### Exemple 1 : Créer une commande

**Avant (ancien code)** :
```typescript
const handleSubmit = async () => {
  const response = await fetch("/api/orders", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(orderData)
  });
  const result = await response.json();
  // Gérer le résultat...
};
```

**Après (avec hooks V2)** :
```typescript
const createOrderMutation = useCreateOrder();

const handleSubmit = async () => {
  try {
    const result = await createOrderMutation.mutateAsync({
      restaurantId: "...",
      customerName: "...",
      phone: "...",
      address: "...",
      items: [...]
    });
    // React Query gère automatiquement le cache et les états
    console.log("Commande créée:", result.orderId);
  } catch (error) {
    // Gestion d'erreur automatique
    console.error("Erreur:", error);
  }
};

// Dans le JSX
<button 
  onClick={handleSubmit}
  disabled={createOrderMutation.isPending}
>
  {createOrderMutation.isPending ? "Création..." : "Créer commande"}
</button>
```

**Avantages** :
- ✅ Gestion automatique du loading (`isPending`)
- ✅ Gestion automatique des erreurs (`isError`, `error`)
- ✅ Cache automatique
- ✅ Invalidation automatique
- ✅ Optimistic updates possibles

---

### Exemple 2 : Récupérer une commande

**Avant (ancien code)** :
```typescript
const [order, setOrder] = useState(null);
const [loading, setLoading] = useState(true);

useEffect(() => {
  fetch(`/api/orders/${orderId}`)
    .then(res => res.json())
    .then(data => {
      setOrder(data);
      setLoading(false);
    });
}, [orderId]);
```

**Après (avec hooks V2)** :
```typescript
const { data: order, isLoading, error, refetch } = useOrder(orderId);

// Dans le JSX
{isLoading && <p>Chargement...</p>}
{error && <p>Erreur : {error.message}</p>}
{order && <OrderDetails order={order} />}
```

**Avantages** :
- ✅ Pas besoin de gérer le state manuellement
- ✅ Cache automatique (évite les requêtes inutiles)
- ✅ Refetch facile avec `refetch()`
- ✅ Gestion automatique du loading et des erreurs

---

### Exemple 3 : Liste des commandes d'un client

**Avant (ancien code)** :
```typescript
const [orders, setOrders] = useState([]);
const [loading, setLoading] = useState(true);

useEffect(() => {
  fetch(`/api/orders/customer/${phone}`)
    .then(res => res.json())
    .then(data => {
      setOrders(data);
      setLoading(false);
    });
}, [phone]);
```

**Après (avec hooks V2)** :
```typescript
const { data: orders, isLoading, error } = useCustomerOrders(phone);

// Dans le JSX
{isLoading && <p>Chargement...</p>}
{error && <p>Erreur : {error.message}</p>}
{orders?.map(order => <OrderCard key={order.id} order={order} />)}
```

---

## 📋 Étape 3 : Migrer une page existante

### Exemple : Page de succès de commande

**Fichier** : `client/src/pages/order-success.tsx`

**Avant** :
```typescript
import { useState, useEffect } from "react";
import { useLocation } from "wouter";

export function OrderSuccessPage() {
  const [location, setLocation] = useLocation();
  const orderId = new URLSearchParams(location.search).get("orderId");
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (orderId) {
      fetch(`/api/orders/${orderId}`)
        .then(res => res.json())
        .then(data => {
          setOrder(data);
          setLoading(false);
        });
    }
  }, [orderId]);

  if (loading) return <div>Chargement...</div>;
  if (!order) return <div>Commande introuvable</div>;

  return (
    <div>
      <h1>Commande #{order.id}</h1>
      <p>Statut : {order.status}</p>
      <p>Total : {order.totalPrice} TND</p>
    </div>
  );
}
```

**Après (avec hooks V2)** :
```typescript
import { useOrder } from "@/features/order/hooks/use-order";
import { useLocation } from "wouter";

export function OrderSuccessPage() {
  const [location] = useLocation();
  const orderId = new URLSearchParams(location.search).get("orderId");
  
  const { data: order, isLoading, error } = useOrder(orderId);

  if (isLoading) return <div>Chargement...</div>;
  if (error) return <div>Erreur : {error.message}</div>;
  if (!order) return <div>Commande introuvable</div>;

  return (
    <div>
      <h1>Commande #{order.id}</h1>
      <p>Statut : {order.status}</p>
      <p>Total : {order.totalPrice} TND</p>
    </div>
  );
}
```

**Gains** :
- ✅ Code plus simple (moins de state)
- ✅ Gestion automatique du cache
- ✅ Refetch automatique si nécessaire
- ✅ Meilleure gestion des erreurs

---

## 📋 Étape 4 : Utiliser le composant de test

Pour tester rapidement les hooks V2, utilisez le composant de test :

```typescript
import { TestOrderV2Complete } from "@/features/order/components/TestOrderV2";

// Dans votre router ou page de test
<Route path="/test-order-v2">
  <TestOrderV2Complete />
</Route>
```

Ce composant inclut :
- ✅ Test de création de commande
- ✅ Test de récupération de commande
- ✅ Test de liste des commandes client

---

## 📋 Étape 5 : Intégrer dans App.tsx

### Ajouter QueryClientProvider

```typescript
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      {/* ... reste de l'app ... */}
    </QueryClientProvider>
  );
}
```

### Ajouter AuthProvider (optionnel)

```typescript
import { AuthProvider } from "@/app/providers/auth-provider";

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        {/* ... reste de l'app ... */}
      </AuthProvider>
    </QueryClientProvider>
  );
}
```

---

## ✅ Checklist de migration

### Pour chaque page utilisant les commandes

- [ ] Importer les hooks V2
- [ ] Remplacer les `useState` + `useEffect` par les hooks
- [ ] Remplacer les appels `fetch` par les hooks
- [ ] Utiliser `isLoading`, `isError`, `error` pour les états
- [ ] Tester que tout fonctionne
- [ ] Supprimer l'ancien code

### Pages à migrer

- [ ] `order-success.tsx` → Utiliser `useOrder`
- [ ] `order-history.tsx` → Utiliser `useCustomerOrders`
- [ ] `cart-page.tsx` → Utiliser `useCreateOrder`
- [ ] Autres pages utilisant les commandes

---

## 🎓 Bonnes pratiques

### 1. Gérer les états de chargement

```typescript
const { data, isLoading, isError, error } = useOrder(orderId);

if (isLoading) return <LoadingSpinner />;
if (isError) return <ErrorMessage error={error} />;
if (!data) return <NotFound />;

return <OrderDetails order={data} />;
```

### 2. Utiliser les mutations avec feedback

```typescript
const createOrder = useCreateOrder();

const handleSubmit = async () => {
  try {
    const result = await createOrder.mutateAsync(data);
    toast.success(`Commande créée : ${result.orderId}`);
    navigate(`/order-success?orderId=${result.orderId}`);
  } catch (error) {
    toast.error(error.message || "Erreur lors de la création");
  }
};
```

### 3. Invalider le cache après mutation

```typescript
const createOrder = useCreateOrder();
const queryClient = useQueryClient();

const handleSubmit = async () => {
  const result = await createOrder.mutateAsync(data);
  
  // Invalider les commandes du client pour rafraîchir la liste
  queryClient.invalidateQueries({ 
    queryKey: ["customer-orders", result.phone] 
  });
};
```

---

## 🆘 Dépannage

### Erreur : "Cannot find module"

Vérifier les imports :
```typescript
// ✅ Correct
import { useOrder } from "@/features/order/hooks/use-order";

// ❌ Incorrect
import { useOrder } from "../features/order/hooks/use-order";
```

### Erreur : "Invalid hook call"

Vérifier que React Query est configuré :
```typescript
// Dans App.tsx
<QueryClientProvider client={queryClient}>
  {/* ... */}
</QueryClientProvider>
```

### Les données ne se mettent pas à jour

Utiliser `refetch()` :
```typescript
const { data, refetch } = useOrder(orderId);

<button onClick={() => refetch()}>Actualiser</button>
```

---

## 📚 Ressources

- `client/src/features/order/components/TestOrderV2.tsx` - Composant de test
- `client/src/features/order/examples/` - Exemples d'utilisation
- `INTEGRATION_EXAMPLES.md` - Exemples d'intégration
- `FRONTEND_V2_GUIDE.md` - Guide frontend complet

---

## 🎉 Résultat

Après migration, vous aurez :
- ✅ Code plus simple et maintenable
- ✅ Gestion automatique du cache
- ✅ Meilleure gestion des erreurs
- ✅ Performance améliorée
- ✅ Expérience utilisateur améliorée

**Commencez par migrer une page simple, puis continuez progressivement !** 🚀
