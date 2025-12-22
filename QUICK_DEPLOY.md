# 🚀 Déploiement rapide sur Render

## ⚡ Étapes rapides

### 1. Commiter et pousser le code

```bash
# Ajouter tous les fichiers
git add .

# Commiter
git commit -m "Préparation pour déploiement Render avec migrations automatiques"

# Pousser sur GitHub/GitLab/Bitbucket
git push origin main
```

### 2. Créer un compte Render

1. Allez sur [https://render.com](https://render.com)
2. Créez un compte (gratuit)
3. Connectez votre compte GitHub/GitLab/Bitbucket

### 3. Déployer avec Blueprint

1. Dans Render Dashboard → **"New +"** → **"Blueprint"**
2. Sélectionnez votre dépôt `TataouinePizza`
3. Render détectera `render.yaml` automatiquement
4. Cliquez sur **"Apply"**

### 4. Attendre le déploiement (5-10 minutes)

Suivez les logs dans Render Dashboard. Vous devriez voir :

```
✅ Building...
✅ Installing dependencies...
[DB] Seeding database with demo data...
[DB] Demo data seeded successfully!
serving on port 10000
```

### 5. Tester votre application

Votre URL sera : `https://tataouine-pizza.onrender.com`

**Test rapide** :
- ✅ `https://tataouine-pizza.onrender.com/api/health` → Devrait retourner `{"status":"ok"}`
- ✅ `https://tataouine-pizza.onrender.com` → Interface web
- ✅ `https://tataouine-pizza.onrender.com/driver/login` → Connexion livreur

**Comptes de test livreur** :
- Téléphone : `21612345678`
- Mot de passe : `driver123`

## 📝 Variables d'environnement

Render configure automatiquement :
- ✅ `DATABASE_URL` (automatique)
- ✅ `JWT_SECRET` (généré automatiquement)
- ✅ `NODE_ENV=production`
- ✅ `PORT=10000`

**À ajouter manuellement** (si vous avez n8n) :
- `N8N_WEBHOOK_URL` = Votre URL de webhook

## 🆘 Problèmes courants

### Le service ne démarre pas
→ Vérifiez les logs dans Render Dashboard

### La base de données est vide
→ Les migrations s'exécutent automatiquement au premier démarrage. Si problème, utilisez Render Shell :
```bash
npm run db:migrate
```

### Le service "s'endort"
→ Normal sur le plan gratuit. Le premier démarrage après veille prend 30-60 secondes.

## 📚 Documentation complète

- [Guide étape par étape](./docs/DEPLOY_STEP_BY_STEP.md)
- [Guide complet](./docs/DEPLOY_RENDER.md)
- [Guide base de données](./docs/DATABASE_RENDER.md)

