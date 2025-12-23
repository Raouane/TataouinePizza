# 🐛 Guide de débogage - Restaurants n'apparaissent pas en production

## 🔍 Problème identifié

D'après le script de vérification, **8 restaurants** sont en base de données, mais ils n'apparaissent pas sur le site en production.

## ✅ Vérifications effectuées

1. **Base de données** : ✅ 8 restaurants présents
2. **Statut** : ✅ Tous les restaurants sont ouverts (`isOpen = true`)
3. **Images** : ✅ Tous les restaurants ont des images
4. **Produits** : ⚠️ 5 restaurants n'ont **aucun produit** (mais cela ne devrait pas empêcher leur affichage)

## 🔧 Étapes de débogage

### 1. Vérifier la console du navigateur

Ouvrez la console du navigateur (F12) et regardez les logs :

```javascript
[Home] Début du chargement des restaurants...
[Home] Réponse API: 200 OK
[Home] Restaurants reçus: 8
[Home] État du filtrage:
  - Total restaurants: 8
  - Restaurants ouverts: 8
```

**Si vous voyez une erreur** (404, 500, CORS, etc.), notez-la.

### 2. Vérifier l'API directement

Testez l'API directement dans le navigateur ou avec curl :

```bash
# Dans le navigateur, ouvrez :
https://votre-site.com/api/restaurants

# Ou avec curl :
curl https://votre-site.com/api/restaurants
```

**Résultat attendu** : Un tableau JSON avec 8 restaurants.

### 3. Vérifier les logs serveur

Sur Render Dashboard, allez dans **Logs** et cherchez :
- Des erreurs lors de l'appel à `/api/restaurants`
- Des erreurs de connexion à la base de données
- Des erreurs de parsing JSON

### 4. Vérifier le cache du navigateur

Le navigateur peut avoir mis en cache une ancienne version :

1. **Chrome/Edge** : `Ctrl + Shift + R` (hard refresh)
2. **Firefox** : `Ctrl + F5`
3. **Safari** : `Cmd + Shift + R`

Ou ouvrez en **navigation privée** pour tester sans cache.

### 5. Vérifier les variables d'environnement

Sur Render Dashboard, vérifiez que :
- `DATABASE_URL` est bien définie
- La base de données est **active** (pas en pause)
- Les variables d'environnement sont correctes

## 🎯 Solutions possibles

### Solution 1 : Problème de cache

Si c'est un problème de cache, le hard refresh devrait résoudre.

### Solution 2 : API ne répond pas

Si l'API retourne une erreur :
1. Vérifiez les logs Render
2. Vérifiez que la base de données est active
3. Vérifiez que `DATABASE_URL` est correcte

### Solution 3 : Problème de CORS

Si vous voyez une erreur CORS dans la console :
- Vérifiez que le domaine est autorisé
- Vérifiez les headers CORS dans `server/routes.ts`

### Solution 4 : Problème de filtrage frontend

Si les restaurants sont chargés mais ne s'affichent pas :
- Vérifiez les logs dans la console
- Vérifiez que `isOpen` est bien `true` pour tous
- Vérifiez qu'il n'y a pas de filtre de recherche actif

## 📊 Logs de débogage ajoutés

J'ai ajouté des logs de débogage dans `home.tsx` pour tracer :
- Le chargement des restaurants
- La réponse de l'API
- Le nombre de restaurants reçus
- Le filtrage appliqué

**Ouvrez la console du navigateur** et partagez-moi les logs que vous voyez.

## 🚀 Prochaines étapes

1. **Ouvrez la console** du navigateur (F12)
2. **Rechargez la page** (Ctrl + Shift + R)
3. **Copiez tous les logs** qui commencent par `[Home]`
4. **Partagez-moi ces logs** pour que je puisse identifier le problème exact

## 💡 Note importante

Les restaurants **sans produits** devraient quand même apparaître sur la page d'accueil. Le problème est probablement :
- Un problème de chargement de l'API
- Un problème de cache
- Un problème de filtrage côté frontend

Les logs de débogage nous diront exactement où est le problème.

