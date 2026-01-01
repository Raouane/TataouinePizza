# 🎯 Plan d'Action - Maintenant

## ✅ Ce qui est fait

- ✅ Architecture V2 créée
- ✅ Module Order V2 (backend) créé
- ✅ Feature Order V2 (frontend) créé
- ✅ Feature flags configurés
- ✅ Documentation complète
- ✅ Erreurs TypeScript corrigées

---

## 🚀 Actions immédiates (aujourd'hui)

### 1. Activer les routes V2

```bash
# Ajouter dans .env
USE_ORDER_V2_ROUTES=true
```

### 2. Tester les routes backend

```bash
# Démarrer le serveur
npm run dev

# Vérifier les logs
# Vous devriez voir : [ROUTES] ✅ Activation des routes Order V2

# Tester une création de commande (dans un autre terminal)
curl -X POST http://localhost:5000/api/orders \
  -H "Content-Type: application/json" \
  -d '{
    "restaurantId": "VOTRE_RESTAURANT_ID",
    "customerName": "Test User",
    "phone": "21612345678",
    "address": "123 Test Street",
    "items": [{
      "pizzaId": "VOTRE_PIZZA_ID",
      "size": "medium",
      "quantity": 1
    }]
  }'
```

### 3. Tester les hooks frontend

Créer un composant de test simple :

```typescript
// client/src/test-order-v2.tsx
import { useOrder, useCreateOrder } from "@/features/order/hooks/use-order";

export function TestOrderV2() {
  const createOrder = useCreateOrder();
  
  const handleTest = async () => {
    try {
      const result = await createOrder.mutateAsync({
        restaurantId: "...",
        customerName: "Test",
        phone: "21612345678",
        address: "Test",
        items: [{ pizzaId: "...", size: "medium", quantity: 1 }]
      });
      console.log("✅ Commande créée:", result);
    } catch (error) {
      console.error("❌ Erreur:", error);
    }
  };

  return <button onClick={handleTest}>Tester Order V2</button>;
}
```

---

## 📅 Cette semaine

### Option A : Tester en profondeur

1. **Tester toutes les routes Order V2**
   - Créer une commande
   - Récupérer une commande
   - Récupérer les commandes d'un client
   - Comparer avec les anciennes routes

2. **Valider la compatibilité**
   - Vérifier que le frontend existant fonctionne toujours
   - Vérifier que les WebSockets fonctionnent
   - Vérifier que les webhooks n8n fonctionnent

3. **Documenter les résultats**
   - Noter les problèmes rencontrés
   - Noter les améliorations
   - Créer un rapport de test

### Option B : Migrer le frontend

1. **Identifier les pages à migrer**
   - `order-success.tsx` → `features/order/pages/order-success.tsx`
   - `order-history.tsx` → `features/order/pages/order-history.tsx`
   - Autres pages utilisant les commandes

2. **Migrer progressivement**
   - Remplacer les appels API par les hooks V2
   - Utiliser `useOrder`, `useCreateOrder`, `useCustomerOrders`
   - Tester après chaque migration

3. **Intégrer les providers**
   - Ajouter `AuthProvider` dans `App.tsx`
   - Utiliser les guards dans le router
   - Tester l'authentification

---

## 📅 Semaine prochaine

### Migrer un autre domaine

**Recommandation : Auth** (le plus simple)

1. **Backend** :
   - Créer `server/src/modules/auth/auth.types.ts`
   - Créer `server/src/modules/auth/auth.storage.ts`
   - Créer `server/src/modules/auth/auth.service.ts`
   - Créer `server/src/modules/auth/auth.routes.ts`
   - Ajouter feature flag `USE_AUTH_V2_ROUTES`
   - Intégrer dans `server/routes.ts`

2. **Frontend** :
   - Créer `client/src/features/auth/auth.types.ts`
   - Créer `client/src/features/auth/auth.api.ts`
   - Créer `client/src/features/auth/hooks/use-auth.ts`
   - Migrer les pages d'authentification

**Suivre le pattern du module Order V2 comme référence.**

---

## 🎯 Objectifs à court terme

### Cette semaine
- [ ] Activer `USE_ORDER_V2_ROUTES=true`
- [ ] Tester les routes backend
- [ ] Valider que tout fonctionne
- [ ] Documenter les résultats

### Semaine prochaine
- [ ] Migrer au moins une page frontend
- [ ] Utiliser les hooks V2 dans l'application
- [ ] Intégrer `AuthProvider` dans `App.tsx`

### Ce mois
- [ ] Migrer toutes les pages Order frontend
- [ ] Migrer le domaine Auth (backend + frontend)
- [ ] Activer progressivement en staging

---

## 📚 Ressources

### Pour tester
- `TEST_V2.md` - Guide de test complet
- `QUICK_START_V2.md` - Démarrage rapide
- `INTEGRATION_EXAMPLES.md` - Exemples pratiques

### Pour migrer
- `MIGRATION_V2_GUIDE.md` - Guide de migration
- `server/src/modules/order/` - Exemple backend
- `client/src/features/order/` - Exemple frontend

### Pour comprendre
- `ARCHITECTURE_V2.md` - Architecture complète
- `USAGE_V2.md` - Guide d'utilisation

---

## 🆘 Besoin d'aide ?

### Problème d'activation ?
→ Vérifiez `QUICK_START_V2.md`

### Erreur lors des tests ?
→ Vérifiez `TEST_V2.md` section "Dépannage"

### Questions sur la migration ?
→ Vérifiez `MIGRATION_V2_GUIDE.md`

### Exemples de code ?
→ Consultez `INTEGRATION_EXAMPLES.md`

---

## 🎉 Prochaine étape immédiate

**1. Activer les routes V2 :**
```bash
echo "USE_ORDER_V2_ROUTES=true" >> .env
npm run dev
```

**2. Vérifier les logs :**
```
[FEATURE FLAGS] Configuration V2:
  - Order V2 Routes: ✅ Activé
[ROUTES] ✅ Activation des routes Order V2
```

**3. Tester une route :**
```bash
curl -X POST http://localhost:5000/api/orders ...
```

**C'est parti ! 🚀**
