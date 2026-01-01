# 🚀 Guide d'utilisation Architecture V2

## 🎯 Activation des routes V2

### Backend

Les routes V2 sont désactivées par défaut pour maintenir la compatibilité. Pour les activer :

1. **Option 1 : Variable d'environnement** (recommandé)
   ```bash
   # Dans .env
   USE_ORDER_V2_ROUTES=true
   ```

2. **Option 2 : Modification du code**
   ```typescript
   // Dans server/routes.ts
   // Remplacer :
   if (FEATURE_FLAGS.USE_ORDER_V2_ROUTES) {
     registerOrderRoutes(app);
   }
   // Par :
   registerOrderRoutes(app);
   ```

### Vérification

Au démarrage du serveur, vous verrez dans les logs :
```
[FEATURE FLAGS] Configuration V2:
  - Order V2 Routes: ✅ Activé
```

---

## 📦 Utilisation Backend

### Module Order V2

```typescript
import { OrderService } from "./src/modules/order/order.service";
import { OrderStorage } from "./src/modules/order/order.storage";

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

---

## 🎨 Utilisation Frontend

### Feature Order V2

```typescript
import { useOrder, useCreateOrder } from "@/features/order/hooks/use-order";

function MyComponent() {
  // Récupérer une commande
  const { data: order, isLoading } = useOrder(orderId);
  
  // Créer une commande
  const createOrderMutation = useCreateOrder();
  
  const handleSubmit = async (data) => {
    try {
      const result = await createOrderMutation.mutateAsync({
        restaurantId: data.restaurantId,
        customerName: data.customerName,
        phone: data.phone,
        address: data.address,
        items: data.items
      });
      
      console.log('Commande créée:', result.orderId);
    } catch (error) {
      console.error('Erreur:', error);
    }
  };
}
```

### Providers et Guards

```typescript
import { AuthProvider, useAuth } from "@/app/providers/auth-provider";
import { AdminGuard } from "@/app/guards/admin-guard";

function App() {
  return (
    <AuthProvider>
      <Router>
        <Route path="/admin/dashboard">
          <AdminGuard fallback={<Navigate to="/admin/login" />}>
            <AdminDashboard />
          </AdminGuard>
        </Route>
      </Router>
    </AuthProvider>
  );
}
```

---

## 🧪 Tests

### Tester les routes Order V2

```bash
# Activer les routes V2
export USE_ORDER_V2_ROUTES=true

# Démarrer le serveur
npm run dev

# Tester la création de commande
curl -X POST http://localhost:5000/api/orders \
  -H "Content-Type: application/json" \
  -d '{
    "restaurantId": "resto-001",
    "customerName": "Test",
    "phone": "21612345678",
    "address": "Test Address",
    "items": [
      {
        "pizzaId": "pizza-001",
        "size": "medium",
        "quantity": 1
      }
    ]
  }'
```

---

## 🔄 Migration progressive

### Étape 1 : Tester en parallèle

1. Activer `USE_ORDER_V2_ROUTES=true`
2. Tester que tout fonctionne
3. Comparer les logs avec les anciennes routes

### Étape 2 : Remplacer progressivement

1. Une fois validé, les routes V2 remplaceront automatiquement les anciennes
2. Les anciennes routes dans `public.ts` peuvent être commentées
3. Tester en production avec un petit pourcentage de trafic

### Étape 3 : Nettoyer

1. Supprimer les anciennes routes une fois tout validé
2. Migrer les autres domaines (Auth, Restaurant, etc.)

---

## 📝 Notes importantes

- ⚠️ Les routes V2 utilisent les mêmes chemins que les anciennes (`/api/orders`)
- ⚠️ L'ordre d'enregistrement est important : les routes enregistrées en dernier prennent le dessus
- ✅ Les routes V2 sont compatibles avec l'ancien code frontend
- ✅ Migration progressive sans breaking changes

---

## 🆘 Dépannage

### Les routes V2 ne fonctionnent pas

1. Vérifier que `USE_ORDER_V2_ROUTES=true` est défini
2. Vérifier les logs au démarrage
3. Vérifier que les imports sont corrects

### Erreurs d'import

Les chemins relatifs peuvent varier. Vérifier :
- `server/src/modules/order/order.routes.ts` existe
- Les imports dans `server/routes.ts` sont corrects

---

## 📚 Documentation complète

- `ARCHITECTURE_V2.md` - Architecture complète
- `MIGRATION_V2_GUIDE.md` - Guide de migration
- `FRONTEND_V2_GUIDE.md` - Guide frontend
- `MIGRATION_COMPLETE.md` - État d'avancement
