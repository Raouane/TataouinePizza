# 🚀 Guide de Migration vers Architecture V2

## 📋 Vue d'ensemble

Ce guide explique comment migrer progressivement vers l'architecture V2 sans casser l'existant.

## ✅ Étape 1 : Structure de base créée

La structure de base V2 a été créée :
- ✅ `server/src/modules/order/` - Module Order V2
- ✅ `ARCHITECTURE_V2.md` - Documentation de l'architecture

## 📦 Module Order V2 (Exemple)

Le module Order a été migré comme exemple :

```
server/src/modules/order/
├── order.types.ts      # Types partagés
├── order.storage.ts    # Couche d'accès aux données
├── order.service.ts    # Logique métier
├── order.websocket.ts  # Events WebSocket
└── order.routes.ts    # Routes HTTP
```

### Utilisation

Pour utiliser le nouveau module Order, vous pouvez :

1. **Option 1 : Utiliser les nouvelles routes** (recommandé)
   - Les routes V2 sont dans `order.routes.ts`
   - Elles peuvent coexister avec les anciennes routes

2. **Option 2 : Utiliser directement le service**
   ```typescript
   import { OrderService } from "./modules/order/order.service";
   
   const result = await OrderService.createOrder(input);
   ```

## 🔄 Migration progressive

### Phase 1 : Coexistence (actuel)
- ✅ Nouveau module Order créé
- ✅ Anciennes routes toujours actives
- ✅ Pas de breaking changes

### Phase 2 : Migration des routes
1. Ajouter les nouvelles routes dans `server/routes.ts`
2. Tester que tout fonctionne
3. Désactiver progressivement les anciennes routes

### Phase 3 : Migration frontend
1. Créer `client/src/features/order/`
2. Migrer les pages et composants
3. Utiliser les nouveaux hooks et API

### Phase 4 : Réplication
1. Appliquer le pattern aux autres domaines :
   - Auth
   - Restaurant
   - Driver
   - Admin

## 📝 Règles à suivre

### Backend
- ✅ **Routes** : Validation uniquement, pas de logique métier
- ✅ **Service** : Toute la logique métier
- ✅ **Storage** : SQL/ORM uniquement, pas de logique
- ✅ **WebSocket** : Events uniquement

### Frontend (à venir)
- ✅ **Pages** : Orchestration uniquement
- ✅ **Components** : Présentation uniquement
- ✅ **Hooks** : Logique métier
- ✅ **API** : 1 fichier par feature

## 🧪 Tests

Pour tester le nouveau module Order :

```bash
# Tester la création de commande
curl -X POST http://localhost:5000/api/orders \
  -H "Content-Type: application/json" \
  -d '{
    "restaurantId": "...",
    "customerName": "Test",
    "phone": "21612345678",
    "address": "Test Address",
    "items": [...]
  }'
```

## 🎯 Prochaines étapes

1. **Tester le module Order V2**
2. **Créer les guards et providers frontend**
3. **Migrer le frontend Order**
4. **Répliquer aux autres domaines**

## 📚 Documentation

- `ARCHITECTURE_V2.md` - Architecture complète
- Ce fichier - Guide de migration

---

**Note** : La migration est progressive. L'ancien code continue de fonctionner pendant la transition.
