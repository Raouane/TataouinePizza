# 🧪 Guide de Test - Architecture V2

## 🎯 Tests à effectuer

### 1. Test Backend - Routes Order V2

#### Prérequis
```bash
# Activer les routes V2
echo "USE_ORDER_V2_ROUTES=true" >> .env

# Redémarrer le serveur
npm run dev
```

#### Test 1 : Création de commande

```bash
curl -X POST http://localhost:5000/api/orders \
  -H "Content-Type: application/json" \
  -d '{
    "restaurantId": "resto-001",
    "customerName": "Test User",
    "phone": "21612345678",
    "address": "123 Test Street",
    "items": [
      {
        "pizzaId": "pizza-001",
        "size": "medium",
        "quantity": 1
      }
    ]
  }'
```

**Résultat attendu** :
```json
{
  "orderId": "...",
  "totalPrice": 15.50
}
```

#### Test 2 : Récupération de commande

```bash
# Utiliser l'orderId du test précédent
curl http://localhost:5000/api/orders/ORDER_ID
```

**Résultat attendu** :
```json
{
  "id": "...",
  "customerName": "Test User",
  "status": "accepted",
  "items": [...]
}
```

#### Test 3 : Commandes d'un client

```bash
curl http://localhost:5000/api/orders/customer/21612345678
```

**Résultat attendu** : Tableau de commandes

---

### 2. Test Frontend - Feature Order V2

#### Test 1 : Utiliser les hooks

Créez un composant de test :

```typescript
import { useOrder, useCreateOrder } from "@/features/order/hooks/use-order";

function TestOrderComponent() {
  const { data: order, isLoading } = useOrder("order-id");
  const createOrderMutation = useCreateOrder();

  // Tester la création
  const handleTest = async () => {
    const result = await createOrderMutation.mutateAsync({
      restaurantId: "resto-001",
      customerName: "Test",
      phone: "21612345678",
      address: "Test",
      items: [{ pizzaId: "pizza-001", size: "medium", quantity: 1 }]
    });
    console.log("Commande créée:", result);
  };

  return (
    <div>
      {isLoading ? "Chargement..." : JSON.stringify(order)}
      <button onClick={handleTest}>Tester création</button>
    </div>
  );
}
```

#### Test 2 : Utiliser l'API directement

```typescript
import { createOrder } from "@/features/order/order.api";

const result = await createOrder({
  restaurantId: "resto-001",
  customerName: "Test",
  phone: "21612345678",
  address: "Test",
  items: [{ pizzaId: "pizza-001", size: "medium", quantity: 1 }]
});
```

---

### 3. Test Feature Flags

#### Vérifier les logs au démarrage

Au démarrage du serveur, vous devriez voir :
```
[FEATURE FLAGS] Configuration V2:
  - Order V2 Routes: ✅ Activé
[ROUTES] ✅ Activation des routes Order V2
```

#### Tester avec routes désactivées

```bash
# Commenter dans .env
# USE_ORDER_V2_ROUTES=true

# Redémarrer
npm run dev
```

Les logs devraient montrer :
```
[FEATURE FLAGS] Configuration V2:
  - Order V2 Routes: ❌ Désactivé
[ROUTES] ℹ️  Routes Order V2 désactivées
```

---

### 4. Test de compatibilité

#### Vérifier que l'ancien code fonctionne toujours

1. Désactiver les routes V2
2. Tester l'ancien endpoint `/api/orders`
3. Vérifier que tout fonctionne comme avant

#### Vérifier la coexistence

1. Activer les routes V2
2. Vérifier que les routes V2 prennent le dessus
3. Vérifier que l'ancien code frontend fonctionne toujours

---

## ✅ Checklist de validation

### Backend
- [ ] Routes Order V2 activées
- [ ] Logs montrent l'activation
- [ ] POST /api/orders fonctionne
- [ ] GET /api/orders/:id fonctionne
- [ ] GET /api/orders/customer/:phone fonctionne
- [ ] WebSocket notifications fonctionnent
- [ ] Webhooks n8n fonctionnent

### Frontend
- [ ] Hooks `useOrder` fonctionne
- [ ] Hook `useCreateOrder` fonctionne
- [ ] Hook `useCustomerOrders` fonctionne
- [ ] API `createOrder` fonctionne
- [ ] API `getOrder` fonctionne
- [ ] Exemples d'utilisation fonctionnent

### Intégration
- [ ] Feature flags fonctionnent
- [ ] Activation/désactivation fonctionne
- [ ] Ancien code toujours compatible
- [ ] Pas de breaking changes

---

## 🐛 Dépannage

### Erreur : "Cannot find module"

Vérifier les imports :
- `server/src/modules/order/order.routes.ts` existe
- Les chemins relatifs sont corrects

### Erreur : "Routes not found"

1. Vérifier que `USE_ORDER_V2_ROUTES=true` est défini
2. Vérifier les logs au démarrage
3. Vérifier l'ordre d'enregistrement dans `server/routes.ts`

### Erreur : "Invalid order data"

1. Vérifier le format des données
2. Vérifier que les IDs existent (restaurant, pizza)
3. Vérifier les logs pour plus de détails

---

## 📊 Résultats attendus

### Succès
- ✅ Routes V2 répondent correctement
- ✅ Logique métier fonctionne
- ✅ WebSocket notifications envoyées
- ✅ Webhooks n8n envoyés
- ✅ Pas d'erreurs dans les logs

### Performance
- Temps de réponse similaire ou meilleur
- Pas de régression

---

## 🎉 Validation complète

Une fois tous les tests passés :
1. ✅ Architecture V2 validée
2. ✅ Prêt pour la production
3. ✅ Peut remplacer progressivement l'ancien code
