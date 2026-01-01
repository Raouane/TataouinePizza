# 📋 Commandes Architecture V2

## 🚀 Démarrage

### Activer les routes V2
```bash
# Ajouter dans .env
echo "USE_ORDER_V2_ROUTES=true" >> .env

# Redémarrer le serveur
npm run dev
```

### Vérifier l'activation
Dans les logs, chercher :
```
[ROUTES] ✅ Activation des routes Order V2
```

---

## 🧪 Tests

### Tests Backend
```bash
npm run test:v2
```
**Résultat attendu** : 89% de réussite (8/9)

### Tests Frontend
```bash
npm run test:v2:frontend
```
**Résultat attendu** : 100% de réussite (17/17)

### Tous les Tests
```bash
npm run test:v2:all
```
**Résultat attendu** : 96% de réussite (25/26)

---

## 🔧 Développement

### Démarrer le serveur
```bash
npm run dev
```

### Démarrer le client
```bash
npm run dev:client
```

### Vérifier TypeScript
```bash
npm run check
```

---

## 📊 Base de Données

### Migrations
```bash
npm run db:migrate
```

### Seed (données de test)
```bash
npm run db:seed
```

### Push (Drizzle)
```bash
npm run db:push
```

---

## 🎯 Utilisation

### Backend - Créer une commande
```typescript
import { OrderService } from "./src/modules/order/order.service";

const result = await OrderService.createOrder({
  restaurantId: "...",
  customerName: "John",
  phone: "21612345678",
  address: "123 Main St",
  items: [{ pizzaId: "...", size: "medium", quantity: 1 }]
});
```

### Frontend - Utiliser les hooks
```typescript
import { useOrder, useCreateOrder } from "@/features/order/hooks/use-order";

const { data: order, isLoading } = useOrder(orderId);
const createOrder = useCreateOrder();
```

---

## 📚 Documentation

### Guides Principaux
- `README_V2.md` - Point d'entrée
- `START_HERE_V2.md` - Démarrage détaillé
- `QUICK_START_V2.md` - Démarrage rapide

### Guides d'Utilisation
- `USAGE_V2.md` - Guide complet
- `FRONTEND_INTEGRATION_GUIDE.md` - Intégration frontend
- `MIGRATION_PRATIQUE_EXEMPLE.md` - Exemple de migration

### Guides Techniques
- `ARCHITECTURE_V2.md` - Architecture complète
- `MIGRATION_V2_GUIDE.md` - Guide de migration
- `TEST_V2.md` - Guide de test

---

## 🆘 Dépannage

### Routes V2 non activées
```bash
# Vérifier .env
cat .env | grep USE_ORDER_V2_ROUTES

# Si absent, ajouter
echo "USE_ORDER_V2_ROUTES=true" >> .env

# Redémarrer
npm run dev
```

### Erreurs TypeScript
```bash
# Vérifier les erreurs
npm run check

# Vérifier les fichiers V2 spécifiquement
npm run check 2>&1 | grep "features/order"
```

### Tests qui échouent
```bash
# Vérifier que la base de données est accessible
npm run db:seed

# Vérifier que le serveur est démarré (pour tests API)
npm run dev
```

---

## 📖 Navigation

### Par Besoin
- **Démarrer** → `README_V2.md`
- **Comprendre** → `ARCHITECTURE_V2.md`
- **Utiliser** → `USAGE_V2.md`
- **Migrer** → `MIGRATION_PRATIQUE_EXEMPLE.md`
- **Tester** → `TEST_V2.md`

### Par Fichier
- **Index complet** → `INDEX_V2.md`
- **État actuel** → `STATUS_V2.md`
- **Résumé final** → `RESUME_FINAL_V2.md`

---

## 🎉 Checklist Rapide

- [ ] `USE_ORDER_V2_ROUTES=true` dans `.env`
- [ ] Serveur redémarré
- [ ] Logs montrent "Activation des routes Order V2"
- [ ] Tests backend passent (`npm run test:v2`)
- [ ] Tests frontend passent (`npm run test:v2:frontend`)
- [ ] Prêt à migrer les pages !

---

**Toutes les commandes sont prêtes à être utilisées !** 🚀
