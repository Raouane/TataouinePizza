# 🔄 Migration Pratique - Exemple : order-history.tsx

## 🎯 Objectif

Migrer la page `order-history.tsx` pour utiliser les hooks V2 au lieu de l'ancien code.

---

## 📋 Étape 1 : Analyser l'ancien code

### Code actuel (`client/src/pages/order-history.tsx`)

```typescript
import { useState, useEffect } from "react";
import { getOrdersByPhone } from "@/lib/api";

export default function OrderHistory() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const phone = getOnboarding()?.phone || "";

  useEffect(() => {
    if (phone && phone.length >= 8) {
      loadOrders();
    } else {
      setLoading(false);
    }
  }, [phone]);

  const loadOrders = async () => {
    if (!phone || phone.length < 8) return;
    setLoading(true);
    try {
      const result = await getOrdersByPhone(phone);
      setOrders(result);
    } catch (error) {
      console.error("Erreur:", error);
    } finally {
      setLoading(false);
    }
  };

  // Auto-refresh toutes les 5 secondes
  useEffect(() => {
    if (!phone || phone.length < 8) return;
    const interval = setInterval(async () => {
      try {
        setRefreshing(true);
        const result = await getOrdersByPhone(phone);
        setOrders(result);
      } catch (error) {
        console.error("Erreur:", error);
      } finally {
        setRefreshing(false);
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [phone]);

  // ... reste du code JSX
}
```

**Problèmes** :
- ❌ Gestion manuelle du state (`useState`)
- ❌ Gestion manuelle du loading
- ❌ Gestion manuelle du refresh
- ❌ Pas de cache automatique
- ❌ Code répétitif

---

## 📋 Étape 2 : Migrer vers les hooks V2

### Nouveau code avec hooks V2

```typescript
import { useCustomerOrders } from "@/features/order/hooks/use-order";
import { getOnboarding } from "@/pages/onboarding";

export default function OrderHistory() {
  const phone = getOnboarding()?.phone || "";
  const { 
    data: orders = [], 
    isLoading, 
    error, 
    refetch 
  } = useCustomerOrders(phone);

  // Auto-refresh toutes les 5 secondes
  useEffect(() => {
    if (!phone || phone.length < 8) return;
    const interval = setInterval(() => {
      refetch();
    }, 5000);
    return () => clearInterval(interval);
  }, [phone, refetch]);

  // ... reste du code JSX (identique)
}
```

**Avantages** :
- ✅ Pas de gestion manuelle du state
- ✅ Gestion automatique du loading (`isLoading`)
- ✅ Gestion automatique des erreurs (`error`)
- ✅ Cache automatique (évite les requêtes inutiles)
- ✅ Refetch simple avec `refetch()`
- ✅ Code plus simple et maintenable

---

## 📋 Étape 3 : Mettre à jour le JSX

### Avant
```typescript
{loading && <div>Chargement...</div>}
{orders.map(order => <OrderCard key={order.id} order={order} />)}
```

### Après
```typescript
{isLoading && <div>Chargement...</div>}
{error && <div>Erreur : {error.message}</div>}
{orders.map(order => <OrderCard key={order.id} order={order} />)}
```

---

## 📋 Étape 4 : Code complet migré

```typescript
import { useEffect } from "react";
import { useCustomerOrders } from "@/features/order/hooks/use-order";
import { getOnboarding } from "@/pages/onboarding";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useLanguage } from "@/lib/i18n";
import { RefreshCw } from "lucide-react";

export default function OrderHistory() {
  const phone = getOnboarding()?.phone || "";
  const { 
    data: orders = [], 
    isLoading, 
    error, 
    refetch,
    isRefetching 
  } = useCustomerOrders(phone);
  const { t } = useLanguage();

  // Auto-refresh toutes les 5 secondes
  useEffect(() => {
    if (!phone || phone.length < 8) return;
    const interval = setInterval(() => {
      refetch();
    }, 5000);
    return () => clearInterval(interval);
  }, [phone, refetch]);

  if (isLoading) {
    return <div className="p-4">Chargement...</div>;
  }

  if (error) {
    return (
      <div className="p-4">
        <p className="text-red-600">Erreur : {error.message}</p>
        <Button onClick={() => refetch()}>Réessayer</Button>
      </div>
    );
  }

  if (!phone || phone.length < 8) {
    return <div className="p-4">Téléphone requis</div>;
  }

  return (
    <div className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Mes commandes</h1>
        <Button 
          onClick={() => refetch()} 
          disabled={isRefetching}
          variant="outline"
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${isRefetching ? 'animate-spin' : ''}`} />
          {isRefetching ? 'Actualisation...' : 'Actualiser'}
        </Button>
      </div>

      {orders.length === 0 ? (
        <Card className="p-6">
          <p className="text-gray-600">Aucune commande trouvée</p>
        </Card>
      ) : (
        <div className="space-y-4">
          {orders.map(order => (
            <OrderCard key={order.id} order={order} />
          ))}
        </div>
      )}
    </div>
  );
}
```

---

## 📋 Étape 5 : Tester

### Checklist de test
- [ ] La page charge correctement
- [ ] Les commandes s'affichent
- [ ] Le loading fonctionne
- [ ] Les erreurs s'affichent
- [ ] Le bouton "Actualiser" fonctionne
- [ ] L'auto-refresh fonctionne (toutes les 5 secondes)
- [ ] Pas d'erreurs dans la console

### Commandes de test
```bash
# Démarrer le serveur
npm run dev

# Ouvrir dans le navigateur
# Aller sur /history
# Vérifier que tout fonctionne
```

---

## 📋 Étape 6 : Comparaison

### Avant (ancien code)
- **Lignes de code** : ~250
- **useState** : 2
- **useEffect** : 2
- **Gestion manuelle** : Loading, errors, refresh
- **Cache** : Aucun

### Après (hooks V2)
- **Lignes de code** : ~80 (-68%)
- **useState** : 0
- **useEffect** : 1 (seulement pour auto-refresh)
- **Gestion automatique** : Loading, errors, cache
- **Cache** : Automatique avec React Query

**Gains** :
- ✅ 68% moins de code
- ✅ Code plus simple
- ✅ Meilleure performance (cache)
- ✅ Meilleure UX (gestion d'erreurs)

---

## 🎯 Prochaines Migrations

### order-success.tsx
```typescript
// Avant
const [order, setOrder] = useState(null);
useEffect(() => {
  fetch(`/api/orders/${orderId}`).then(...);
}, [orderId]);

// Après
const { data: order, isLoading } = useOrder(orderId);
```

### cart-page.tsx
```typescript
// Avant
const handleSubmit = async () => {
  const response = await fetch("/api/orders", {...});
  const result = await response.json();
};

// Après
const createOrder = useCreateOrder();
const handleSubmit = async () => {
  const result = await createOrder.mutateAsync({...});
};
```

---

## 📚 Ressources

- `FRONTEND_INTEGRATION_GUIDE.md` - Guide complet
- `client/src/features/order/components/TestOrderV2.tsx` - Exemples
- `INTEGRATION_EXAMPLES.md` - Plus d'exemples

---

## ✅ Résultat

Après migration, vous aurez :
- ✅ Code plus simple et maintenable
- ✅ Meilleure performance
- ✅ Meilleure gestion des erreurs
- ✅ Cache automatique
- ✅ Expérience utilisateur améliorée

**Commencez par migrer `order-history.tsx`, puis continuez progressivement !** 🚀
