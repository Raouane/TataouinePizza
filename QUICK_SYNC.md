# ⚡ Synchronisation rapide vers la production

## 🎯 Étapes rapides

### 1. Récupérer la DATABASE_URL de production

1. Allez sur [Render Dashboard](https://dashboard.render.com)
2. Sélectionnez votre base de données PostgreSQL
3. Copiez l'**Internal Database URL** (ou External si vous êtes en dehors de Render)

### 2. Créer le fichier de configuration

Créez un fichier `.env.production` à la racine du projet :

```bash
DATABASE_URL=postgresql://user:password@host:port/database
```

⚠️ **Ne commitez JAMAIS ce fichier !** Il est déjà dans `.gitignore`.

### 3. Exécuter le script

```bash
npm run sync-to-production
```

## ✅ Résultat attendu

Le script va :
- ✅ Ajouter 5 nouveaux restaurants (Carrefour, Aziza, Boucherie Brahim, Volaille Othman, Bijouterie Ziyad)
- ✅ Créer ou trouver BAB EL HARA
- ✅ Ajouter 10 produits pour BAB EL HARA
- ✅ Ignorer les doublons automatiquement

## 🔍 Vérification

Après l'exécution, visitez votre site en production et vérifiez que :
1. Les nouveaux restaurants apparaissent sur la page d'accueil
2. Les produits sont visibles dans le menu de BAB EL HARA
3. Vous pouvez ajouter des produits au panier

## 🐛 Problème ?

Si vous avez une erreur, vérifiez :
- ✅ La DATABASE_URL est correcte
- ✅ La base de données est active sur Render
- ✅ Votre connexion internet fonctionne

Pour plus de détails, consultez `README_SYNC_PRODUCTION.md`.

