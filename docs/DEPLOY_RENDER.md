# Guide de déploiement sur Render

Ce guide vous explique comment déployer l'application Tataouine Pizza sur Render.com.

## Prérequis

1. Un compte Render.com (gratuit)
2. Un dépôt Git (GitHub, GitLab, ou Bitbucket)

## Étapes de déploiement

### 1. Préparer le dépôt Git

Assurez-vous que votre code est poussé sur GitHub/GitLab/Bitbucket :

```bash
git add .
git commit -m "Préparation pour déploiement Render"
git push origin main
```

### 2. Créer la base de données PostgreSQL sur Render

1. Connectez-vous à [Render Dashboard](https://dashboard.render.com)
2. Cliquez sur **"New +"** → **"PostgreSQL"**
3. Configurez :
   - **Name**: `tataouine-pizza-db`
   - **Database**: `tataouine_pizza`
   - **User**: `tataouine_user`
   - **Region**: Choisissez la région la plus proche (ex: Frankfurt)
   - **Plan**: Starter (gratuit)
4. Cliquez sur **"Create Database"**
5. **Important** : Notez l'URL de connexion (Internal Database URL) qui sera utilisée automatiquement

### 3. Créer le service Web

1. Dans Render Dashboard, cliquez sur **"New +"** → **"Web Service"**
2. Connectez votre dépôt Git
3. Configurez le service :
   - **Name**: `tataouine-pizza`
   - **Environment**: `Node`
   - **Region**: Même région que la base de données
   - **Branch**: `main` (ou votre branche principale)
   - **Root Directory**: `/` (racine du projet)
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`
   - **Plan**: Starter (gratuit)

### 4. Configurer les variables d'environnement

Dans les paramètres du service Web, ajoutez ces variables d'environnement :

#### Variables obligatoires :

- **NODE_ENV**: `production`
- **PORT**: `10000` (Render définit automatiquement le port, mais on peut le spécifier)
- **DATABASE_URL**: Cette variable sera automatiquement remplie si vous avez lié la base de données dans render.yaml, sinon copiez l'Internal Database URL de votre base de données PostgreSQL
- **JWT_SECRET**: Générez une clé secrète aléatoire (ex: `openssl rand -base64 32`)

#### Variables optionnelles :

- **N8N_WEBHOOK_URL**: URL de votre webhook n8n (si configuré)
- **VITE_STRIPE_PUBLISHABLE_KEY**: Clé publique Stripe (pour les paiements)
- **STRIPE_SECRET_KEY**: Clé secrète Stripe (pour les paiements)

> 📚 **Voir le guide complet** : [Configuration Stripe sur Render](./STRIPE_RENDER.md)
- **TWILIO_ACCOUNT_SID**: Si vous utilisez Twilio pour les SMS
- **TWILIO_AUTH_TOKEN**: Si vous utilisez Twilio
- **TWILIO_PHONE_NUMBER**: Si vous utilisez Twilio

### 5. Lier la base de données au service Web

1. Dans les paramètres du service Web, allez dans **"Environment"**
2. Cliquez sur **"Link Database"**
3. Sélectionnez votre base de données `tataouine-pizza-db`
4. Render ajoutera automatiquement la variable `DATABASE_URL`

### 6. Initialiser la base de données

#### Option A : Migration automatique (recommandé)

Le script `script/migrate-db.ts` s'exécute automatiquement au premier démarrage grâce au code dans `server/routes.ts` qui vérifie si les restaurants existent. Si la base est vide, il crée automatiquement :
- ✅ Toutes les tables (via Drizzle Kit)
- ✅ Les colonnes supplémentaires (last_seen, assigned_at, customer_lat, customer_lng)
- ✅ Les données de démonstration (restaurants, pizzas, livreurs)

**Aucune action manuelle n'est nécessaire !** Le seed se fait automatiquement au premier démarrage.

#### Option B : Migration manuelle (si nécessaire)

Si vous voulez forcer les migrations manuellement :

1. Dans Render Dashboard, allez dans votre service Web
2. Cliquez sur **"Shell"** (ou utilisez la console)
3. Exécutez :
   ```bash
   npm run db:migrate
   ```

Cela exécutera toutes les migrations et créera les tables si elles n'existent pas.

### 7. Vérifier le déploiement

1. Attendez que le build se termine (première fois : 5-10 minutes)
2. Vérifiez les logs pour s'assurer qu'il n'y a pas d'erreurs
3. Visitez l'URL de votre service (ex: `https://tataouine-pizza.onrender.com`)

## Configuration automatique avec render.yaml

Le fichier `render.yaml` dans la racine du projet configure automatiquement :
- Le service Web avec les bonnes commandes de build/start
- La base de données PostgreSQL
- Les variables d'environnement de base
- Le lien entre le service et la base de données

Pour utiliser render.yaml :
1. Poussez le fichier `render.yaml` dans votre dépôt Git
2. Dans Render Dashboard, créez un **"Blueprint"** au lieu d'un service Web
3. Sélectionnez votre dépôt et le fichier `render.yaml`
4. Render créera automatiquement tous les services

## Comment fonctionne la base de données sur Render ?

### Processus automatique

1. **Création de la base de données** : Render crée une base PostgreSQL vide avec les identifiants configurés.

2. **Premier démarrage de l'application** :
   - Le serveur démarre et se connecte à la base de données
   - Le code dans `server/routes.ts` vérifie si des restaurants existent
   - Si la base est vide, il exécute automatiquement :
     - `drizzle-kit push` pour créer toutes les tables
     - Les migrations manuelles pour ajouter les colonnes supplémentaires
     - Le seed des données de démonstration (restaurants, pizzas, livreurs)

3. **Données initiales créées automatiquement** :
   - 3 restaurants (Tataouine Pizza, Pizza del Sol, Sahara Grill)
   - Plusieurs pizzas avec prix (small, medium, large)
   - 3 livreurs de démonstration (téléphone + mot de passe: `driver123`)

### Structure de la base de données

Les tables suivantes sont créées automatiquement :

- `admin_users` : Comptes administrateurs
- `restaurants` : Restaurants avec horaires d'ouverture
- `pizzas` : Menu des pizzas (lié aux restaurants)
- `pizza_prices` : Prix par taille (small/medium/large)
- `drivers` : Livreurs avec statut et last_seen
- `orders` : Commandes avec coordonnées GPS client
- `order_items` : Détails des commandes
- `otp_codes` : Codes OTP pour vérification téléphone

### Vérifier que tout fonctionne

Après le déploiement, vérifiez les logs dans Render Dashboard. Vous devriez voir :

```
[DB] Seeding database with demo data...
[DB] Demo data seeded successfully!
```

Si vous voyez cette ligne, la base de données est initialisée correctement !

## URLs importantes

- **Service Web**: `https://tataouine-pizza.onrender.com`
- **WebSocket**: `wss://tataouine-pizza.onrender.com/ws`
- **API**: `https://tataouine-pizza.onrender.com/api`

## Notes importantes

1. **Plan gratuit** : Le service peut "s'endormir" après 15 minutes d'inactivité. Le premier démarrage peut prendre 30-60 secondes.

2. **WebSocket** : Render supporte les WebSockets, mais assurez-vous que votre code utilise `wss://` en production.

3. **Base de données** : Le plan gratuit limite à 90 jours de rétention et 1 GB de stockage.

4. **Variables d'environnement** : Ne commitez JAMAIS le fichier `.env` dans Git. Utilisez les variables d'environnement de Render.

5. **Logs** : Consultez les logs dans Render Dashboard pour déboguer les problèmes.

## Dépannage

### Le service ne démarre pas
- Vérifiez les logs dans Render Dashboard
- Assurez-vous que `npm start` fonctionne localement
- Vérifiez que toutes les variables d'environnement sont définies

### Erreur de connexion à la base de données
- Vérifiez que la base de données est liée au service
- Utilisez l'Internal Database URL (pas l'External)
- Vérifiez que les migrations ont été exécutées

### WebSocket ne fonctionne pas
- Assurez-vous d'utiliser `wss://` (pas `ws://`) en production
- Vérifiez que le port est correctement configuré

## Support

Pour plus d'aide, consultez la [documentation Render](https://render.com/docs).

