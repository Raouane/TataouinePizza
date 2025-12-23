# Feature Flags

## FORCE_RESTAURANT_READY

**⚠️ TEST UNIQUEMENT - Ne pas activer en production**

### Description

Ce feature flag permet de forcer toutes les nouvelles commandes à passer directement à l'état `ready` dès leur création, sans attendre l'action du restaurant.

### Utilisation

Ajouter dans votre fichier `.env` :

```env
# Forcer les commandes à l'état READY (test uniquement)
FORCE_RESTAURANT_READY=true
```

### Comportement

- **Quand activé (`true`)** : Toutes les nouvelles commandes sont créées avec le statut `ready` au lieu de `accepted`
- **Quand désactivé (`false` ou absent)** : Comportement normal - les commandes sont créées avec le statut `accepted`

### Impact

✅ **Avantages (pour les tests)** :
- Le livreur peut accepter et démarrer la livraison immédiatement
- Pas besoin d'attendre que le restaurant clique sur "commande prête"
- Tests plus rapides du workflow de livraison

⚠️ **Effets de bord (acceptables en test)** :
- Le restaurant peut ne pas être réellement prêt
- Le livreur peut arriver trop tôt
- Les temps de préparation ne sont plus respectés

### Sécurité

- Un avertissement est loggé si le flag est activé en production
- Le flag peut être désactivé à tout moment sans impact sur le code

### Désactivation

Pour désactiver, mettre `FORCE_RESTAURANT_READY=false` ou supprimer la variable du `.env`.

