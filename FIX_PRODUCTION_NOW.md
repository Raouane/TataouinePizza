# 🔧 Correction immédiate de la production

## 🎯 Problème identifié

L'API retourne seulement **4 restaurants** et ils n'ont **pas d'images** (`imageUrl: null`).

Les restaurants ajoutés (Carrefour, Aziza, etc.) ne sont pas dans la base de données de production.

## ✅ Solution

J'ai créé un script `fix-production-restaurants.ts` qui va :
1. ✅ Ajouter des images aux 4 restaurants existants
2. ✅ Ajouter les 6 restaurants manquants (Carrefour, Aziza, Boucherie Brahim, Volaille Othman, Bijouterie Ziyad, BAB EL HARA)

## 🚀 Exécution

### 1. Vérifier que DATABASE_URL pointe vers la production

Créez ou modifiez `.env.production` :

```bash
DATABASE_URL=votre_url_de_production_render
```

### 2. Exécuter le script

```bash
npm run fix-production-restaurants
```

## 📊 Résultat attendu

Le script va :
- ✅ Ajouter des images aux 4 restaurants existants
- ✅ Ajouter 6 nouveaux restaurants avec images
- ✅ Total : **10 restaurants** avec images

## 🔍 Vérification

Après l'exécution, testez l'API :

```
https://tataouine-pizza.onrender.com/api/restaurants
```

Vous devriez voir **10 restaurants** avec des `imageUrl` non null.

## ⚠️ Important

Le script vérifie les doublons par téléphone, donc vous pouvez l'exécuter plusieurs fois sans problème.

## 🐛 Si ça ne fonctionne pas

1. Vérifiez que `DATABASE_URL` pointe bien vers la production
2. Vérifiez que la base de données est active sur Render
3. Vérifiez les logs du script pour voir les erreurs éventuelles



