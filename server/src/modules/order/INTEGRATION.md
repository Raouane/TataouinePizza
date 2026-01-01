# Intégration Module Order V2

## ✅ Intégration complétée

Le module Order V2 est maintenant intégré dans l'application avec un système de feature flags.

## 🔧 Activation

### Méthode 1 : Variable d'environnement (recommandé)

Ajoutez dans votre `.env` :
```env
USE_ORDER_V2_ROUTES=true
```

### Méthode 2 : Code

Les routes sont automatiquement activées si `USE_ORDER_V2_ROUTES=true` dans les variables d'environnement.

## 📍 Routes disponibles

Une fois activées, les routes suivantes sont disponibles :

- `POST /api/orders` - Créer une commande
- `GET /api/orders/:id` - Récupérer une commande
- `GET /api/orders/customer/:phone` - Récupérer les commandes d'un client

## 🔄 Coexistence avec l'ancien code

Les routes V2 peuvent coexister avec les anciennes routes. Cependant, comme elles utilisent les mêmes chemins, **les routes V2 remplaceront les anciennes** si elles sont activées.

L'ordre d'enregistrement dans `server/routes.ts` est important :
1. Les anciennes routes sont enregistrées en premier
2. Les routes V2 sont enregistrées en dernier (si activées)
3. Les routes enregistrées en dernier prennent le dessus

## 🧪 Tests

Pour tester les routes V2 :

1. Activer avec `USE_ORDER_V2_ROUTES=true`
2. Redémarrer le serveur
3. Vérifier les logs : `[ROUTES] ✅ Activation des routes Order V2`
4. Tester les endpoints

## 📝 Prochaines étapes

1. Tester en développement
2. Tester en staging
3. Activer progressivement en production
4. Désactiver les anciennes routes une fois validé
