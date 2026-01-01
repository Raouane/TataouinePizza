# ⚡ Quick Start - Architecture V2

## 🎯 Démarrage rapide

### 1. Activer les routes Order V2

```bash
# Ajouter dans .env
echo "USE_ORDER_V2_ROUTES=true" >> .env
```

### 2. Redémarrer le serveur

```bash
npm run dev
```

### 3. Vérifier l'activation

Dans les logs, vous devriez voir :
```
[FEATURE FLAGS] Configuration V2:
  - Order V2 Routes: ✅ Activé
[ROUTES] ✅ Activation des routes Order V2
```

### 4. Tester

```bash
# Tester la création de commande
curl -X POST http://localhost:5000/api/orders \
  -H "Content-Type: application/json" \
  -d '{
    "restaurantId": "resto-001",
    "customerName": "Test",
    "phone": "21612345678",
    "address": "Test Address",
    "items": [{"pizzaId": "pizza-001", "size": "medium", "quantity": 1}]
  }'
```

## ✅ C'est tout !

Les routes V2 sont maintenant actives et remplacent les anciennes routes Order.

## 🔄 Désactiver

Pour revenir aux anciennes routes, supprimez ou commentez :
```env
# USE_ORDER_V2_ROUTES=true
```

## 📚 Documentation

- `USAGE_V2.md` - Guide complet d'utilisation
- `ARCHITECTURE_V2.md` - Architecture complète
- `MIGRATION_V2_GUIDE.md` - Guide de migration
