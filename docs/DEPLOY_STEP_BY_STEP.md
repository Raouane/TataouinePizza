# 🚀 Guide de déploiement étape par étape - Render

Ce guide vous accompagne pas à pas pour mettre votre application Tataouine Pizza en ligne sur Render.

## 📋 Prérequis

- ✅ Un compte GitHub/GitLab/Bitbucket
- ✅ Un compte Render.com (gratuit : [https://render.com](https://render.com))
- ✅ Votre code prêt et testé localement

## 🎯 Étape 1 : Préparer votre code Git

### 1.1 Vérifier que tout est commité

```bash
# Vérifier l'état
git status

# Si vous avez des changements non commités
git add .
git commit -m "Préparation pour déploiement Render"
```

### 1.2 Pousser sur GitHub/GitLab/Bitbucket

```bash
# Si vous n'avez pas encore de dépôt distant
git remote add origin https://github.com/VOTRE_USERNAME/tataouine-pizza.git

# Pousser le code
git push -u origin main
```

**Important** : Assurez-vous que le fichier `.env` est dans `.gitignore` (il ne doit PAS être commité).

## 🎯 Étape 2 : Créer un compte Render

1. Allez sur [https://render.com](https://render.com)
2. Cliquez sur **"Get Started for Free"**
3. Créez un compte (vous pouvez utiliser GitHub pour vous connecter rapidement)

## 🎯 Étape 3 : Déployer avec Blueprint (Méthode recommandée)

### 3.1 Créer un Blueprint

1. Dans Render Dashboard, cliquez sur **"New +"** → **"Blueprint"**
2. Connectez votre dépôt Git (GitHub/GitLab/Bitbucket)
3. Sélectionnez votre dépôt `TataouinePizza`
4. Render détectera automatiquement le fichier `render.yaml`
5. Cliquez sur **"Apply"**

### 3.2 Render créera automatiquement :

- ✅ **Base de données PostgreSQL** (`tataouine-pizza-db`)
- ✅ **Service Web** (`tataouine-pizza`)
- ✅ **Variables d'environnement** (sauf `N8N_WEBHOOK_URL` que vous devrez ajouter)

### 3.3 Configurer les variables d'environnement manuelles

1. Allez dans votre service Web → **"Environment"**
2. Ajoutez la variable suivante si vous avez un webhook n8n :
   - **Key**: `N8N_WEBHOOK_URL`
   - **Value**: Votre URL de webhook n8n (ex: `https://votre-n8n.com/webhook/...`)

## 🎯 Étape 4 : Attendre le déploiement

### 4.1 Premier build

Le premier déploiement prend **5-10 minutes**. Vous pouvez suivre la progression dans les logs.

### 4.2 Vérifier les logs

Dans Render Dashboard → Votre service → **"Logs"**, vous devriez voir :

```
✅ Building...
✅ Installing dependencies...
✅ Building client...
✅ Building server...
✅ Starting server...
[DB] Seeding database with demo data...
[DB] Demo data seeded successfully!
serving on port 10000
```

### 4.3 Si vous voyez des erreurs

- **Erreur de build** : Vérifiez que toutes les dépendances sont dans `package.json`
- **Erreur de connexion DB** : Vérifiez que la base de données est bien liée
- **Erreur de migration** : Les migrations s'exécutent automatiquement, mais vous pouvez les forcer via Shell (voir ci-dessous)

## 🎯 Étape 5 : Vérifier que tout fonctionne

### 5.1 Tester l'API

Votre application sera disponible à : `https://tataouine-pizza.onrender.com`

Testez l'endpoint de santé :
```bash
curl https://tataouine-pizza.onrender.com/api/health
```

Devrait retourner :
```json
{"status":"ok","timestamp":"2025-01-20T..."}
```

### 5.2 Tester les restaurants

```bash
curl https://tataouine-pizza.onrender.com/api/restaurants
```

Devrait retourner un tableau avec 3 restaurants de démonstration.

### 5.3 Tester l'interface

1. Ouvrez `https://tataouine-pizza.onrender.com` dans votre navigateur
2. Vous devriez voir la page d'accueil avec les restaurants
3. Testez le flow complet : onboarding → commande

## 🎯 Étape 6 : Tester la connexion livreur

1. Allez sur `https://tataouine-pizza.onrender.com/driver/login`
2. Utilisez un des comptes de test :
   - **Téléphone** : `21612345678`
   - **Mot de passe** : `driver123`

## 🔧 Dépannage

### Le service ne démarre pas

1. **Vérifiez les logs** dans Render Dashboard
2. **Vérifiez les variables d'environnement** :
   - `NODE_ENV` = `production`
   - `PORT` = `10000`
   - `DATABASE_URL` = (automatique si base liée)
   - `JWT_SECRET` = (généré automatiquement)

### La base de données est vide

1. Allez dans Render Dashboard → Service Web → **"Shell"**
2. Exécutez :
   ```bash
   npm run db:migrate
   ```
3. Redémarrez le service (Manual Deploy → Deploy latest commit)

### WebSocket ne fonctionne pas

- Assurez-vous d'utiliser `wss://` (pas `ws://`) en production
- Vérifiez que le port est correctement configuré

### Le service "s'endort"

Sur le plan gratuit, Render met le service en veille après 15 minutes d'inactivité. Le premier démarrage après veille prend 30-60 secondes.

**Solution** : Utilisez un service de monitoring gratuit (ex: UptimeRobot) pour "pinger" votre site toutes les 5 minutes.

## 📝 URLs importantes

Après le déploiement, notez ces URLs :

- **Application** : `https://tataouine-pizza.onrender.com`
- **API** : `https://tataouine-pizza.onrender.com/api`
- **WebSocket** : `wss://tataouine-pizza.onrender.com/ws`
- **Dashboard Admin** : `https://tataouine-pizza.onrender.com/admin`
- **Dashboard Livreur** : `https://tataouine-pizza.onrender.com/driver/login`

## ✅ Checklist de déploiement

- [ ] Code poussé sur GitHub/GitLab/Bitbucket
- [ ] Compte Render créé
- [ ] Blueprint créé avec `render.yaml`
- [ ] Variables d'environnement configurées
- [ ] Premier build réussi
- [ ] Logs montrent "Demo data seeded successfully"
- [ ] API `/api/health` répond
- [ ] API `/api/restaurants` retourne des données
- [ ] Interface web accessible
- [ ] Connexion livreur fonctionne
- [ ] WebSocket fonctionne (testé avec un livreur connecté)

## 🎉 Félicitations !

Votre application est maintenant en ligne ! 🚀

Pour toute question, consultez :
- [Documentation Render](https://render.com/docs)
- [Guide de déploiement complet](./DEPLOY_RENDER.md)
- [Guide de la base de données](./DATABASE_RENDER.md)



