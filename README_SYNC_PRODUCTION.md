# 🔄 Synchronisation des données vers la production

Ce guide explique comment synchroniser les restaurants et produits ajoutés en développement vers la base de données de production.

## 📋 Prérequis

1. **Récupérer la DATABASE_URL de production** :
   - Allez dans Render Dashboard → votre base de données PostgreSQL
   - Copiez l'**Internal Database URL** (ou External Database URL si vous êtes en dehors de Render)

2. **Format de l'URL** :
   ```
   postgresql://user:password@host:port/database
   ```

## 🚀 Méthodes d'exécution

### Méthode 1 : Fichier .env.production (Recommandé)

1. Créez un fichier `.env.production` à la racine du projet :
   ```bash
   DATABASE_URL=votre_url_de_production_ici
   ```

2. Exécutez le script :
   ```bash
   npm run sync-to-production
   ```

   ⚠️ **Important** : Assurez-vous que le script lit bien le fichier `.env.production`. Si ce n'est pas le cas, utilisez la méthode 2.

### Méthode 2 : Variable d'environnement directe

```bash
DATABASE_URL="votre_url_de_production" npm run sync-to-production
```

### Méthode 3 : Avec dotenv-cli (Plus sécurisé)

1. Installez dotenv-cli (si pas déjà installé) :
   ```bash
   npm install -D dotenv-cli
   ```

2. Créez un fichier `.env.production.local` (ne sera pas commité) :
   ```bash
   DATABASE_URL=votre_url_secrete
   ```

3. Exécutez avec dotenv :
   ```bash
   npx dotenv -e .env.production.local -- npm run sync-to-production
   ```

## 📊 Ce que fait le script

Le script `sync-to-production.ts` :

1. ✅ **Vérifie la connexion** à la base de données de production
2. ✅ **Ajoute les 5 nouveaux restaurants** :
   - Carrefour
   - Aziza
   - Boucherie Brahim
   - Volaille Othman
   - Bijouterie Ziyad
3. ✅ **Crée ou trouve BAB EL HARA** (si n'existe pas)
4. ✅ **Ajoute 10 produits** pour BAB EL HARA :
   - 3 pizzas (avec plusieurs tailles)
   - 2 burgers (avec plusieurs tailles)
   - 3 boissons (une seule taille)
   - 2 desserts (une seule taille)
5. ✅ **Gère les doublons** : ignore les restaurants/produits qui existent déjà
6. ✅ **Affiche un résumé** détaillé de l'opération

## 🔒 Sécurité

⚠️ **Ne commitez JAMAIS** :
- Le fichier `.env.production` avec la vraie DATABASE_URL
- Le fichier `.env.production.local`

✅ **Ajoutez à `.gitignore`** :
```
.env.production
.env.production.local
```

## 📝 Exemple de sortie

```
🚀 Synchronisation des données vers la production...

📊 Connexion à la base de données...
🔗 URL: postgresql://user:pass@host...

✅ Connexion réussie !

🏪 Ajout des restaurants...

✅ Restaurant créé: Carrefour (ID: 2f90627b...)
✅ Restaurant créé: Aziza (ID: a1b2c3d4...)
⚠️  Restaurant "BAB EL HARA" existe déjà

📊 Restaurants: 5 ajouté(s), 0 ignoré(s)

🍕 Ajout des produits pour BAB EL HARA...

✅ Restaurant BAB EL HARA trouvé (ID: 0bd9c093...)
✅ Produit créé: Pizza Margherita
✅ Produit créé: Pizza 4 Fromages
...

📊 Produits: 10 ajouté(s), 0 ignoré(s)

✨ Synchronisation terminée avec succès !

📋 Résumé:
   - Restaurants: 5 ajouté(s), 0 ignoré(s)
   - Produits: 10 ajouté(s), 0 ignoré(s)

🎉 Les données sont maintenant disponibles en production !
```

## 🐛 Dépannage

### Erreur : "DATABASE_URL non définie"
- Vérifiez que vous avez bien défini la variable d'environnement
- Utilisez une des méthodes ci-dessus

### Erreur de connexion
- Vérifiez que l'URL de la base de données est correcte
- Vérifiez que votre IP est autorisée (pour External Database URL)
- Vérifiez que la base de données est active sur Render

### Erreur : "Restaurant existe déjà"
- C'est normal, le script ignore les doublons
- Le restaurant/produit existe déjà en production

### Erreur : "Table does not exist"
- La base de données n'a pas été initialisée
- Le seed automatique ne s'est pas exécuté
- Exécutez d'abord les migrations : `npm run db:migrate` (si possible)

## ✅ Vérification après synchronisation

1. Visitez votre site en production
2. Vérifiez que les nouveaux restaurants apparaissent sur la page d'accueil
3. Cliquez sur un restaurant pour vérifier que les produits sont présents
4. Testez l'ajout au panier

## 🔄 Réexécution

Vous pouvez réexécuter le script plusieurs fois sans problème :
- Les doublons seront automatiquement ignorés
- Seuls les nouveaux restaurants/produits seront ajoutés



