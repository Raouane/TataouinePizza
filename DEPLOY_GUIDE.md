# 🚀 Guide de Déploiement - Tataouine Pizza

Guide simplifié pour déployer votre application sur Render.com

## 📋 Prérequis

- ✅ Compte GitHub/GitLab/Bitbucket avec votre code
- ✅ Compte Render.com (gratuit : [https://render.com](https://render.com))

## 🎯 Méthode 1 : Déploiement Automatique (Recommandé)

### Étape 1 : Préparer votre code

```bash
# Vérifier que tout est commité
git status

# Si vous avez des changements
git add .
git commit -m "Préparation pour déploiement Render"

# Pousser sur GitHub
git push origin main
```

### Étape 2 : Créer un compte Render

1. Allez sur [https://render.com](https://render.com)
2. Cliquez sur **"Get Started for Free"**
3. Créez un compte (vous pouvez utiliser GitHub pour vous connecter)

### Étape 3 : Déployer avec Blueprint

1. Dans Render Dashboard, cliquez sur **"New +"** → **"Blueprint"**
2. Connectez votre dépôt Git (GitHub/GitLab/Bitbucket)
3. Sélectionnez votre dépôt `TataouinePizza`
4. Render détectera automatiquement le fichier `render.yaml`
5. Cliquez sur **"Apply"**

### Étape 4 : Attendre le déploiement

- ⏱️ Le premier déploiement prend **5-10 minutes**
- Suivez les logs dans Render Dashboard
- Vous devriez voir : `[DB] Demo data seeded successfully!`

### Étape 5 : Vérifier

Votre application sera disponible à : `https://tataouine-pizza.onrender.com`

**Tests rapides** :
- ✅ `https://tataouine-pizza.onrender.com/api/health` → Devrait retourner `{"status":"ok"}`
- ✅ `https://tataouine-pizza.onrender.com` → Interface web
- ✅ `https://tataouine-pizza.onrender.com/driver/login` → Connexion livreur

**Compte de test livreur** :
- Téléphone : `21612345678`
- Mot de passe : `driver123`

## 🎯 Méthode 2 : Déploiement Manuel

Si le Blueprint ne fonctionne pas, suivez le guide détaillé : [DEPLOY_MANUEL.md](./DEPLOY_MANUEL.md)

## 📝 Variables d'environnement

Render configure automatiquement :
- ✅ `DATABASE_URL` (automatique via "Link Database")
- ✅ `JWT_SECRET` (généré automatiquement)
- ✅ `NODE_ENV=production`
- ✅ `PORT=10000`

**Variables optionnelles à ajouter manuellement** :
- `N8N_WEBHOOK_URL` = Votre URL de webhook n8n (si vous utilisez n8n)
- `TWILIO_ACCOUNT_SID` = Pour les SMS (si vous utilisez Twilio)
- `TWILIO_AUTH_TOKEN` = Pour les SMS
- `TWILIO_PHONE_NUMBER` = Numéro Twilio
- `TWILIO_WHATSAPP_NUMBER` = Numéro WhatsApp Twilio

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

**Solution** : Utilisez un service de monitoring gratuit (ex: UptimeRobot) pour "pinger" votre site toutes les 5 minutes.

### Erreur de build
→ Vérifiez que toutes les dépendances sont dans `package.json`

## 📚 Documentation complète

- [Guide étape par étape](./docs/DEPLOY_STEP_BY_STEP.md)
- [Guide manuel](./DEPLOY_MANUEL.md)
- [Guide base de données](./docs/DATABASE_RENDER.md)
- [Déploiement rapide](./QUICK_DEPLOY.md)

## ✅ Checklist de déploiement

- [ ] Code poussé sur GitHub/GitLab/Bitbucket
- [ ] Compte Render créé
- [ ] Blueprint créé avec `render.yaml`
- [ ] Premier build réussi
- [ ] Logs montrent "Demo data seeded successfully"
- [ ] API `/api/health` répond
- [ ] Interface web accessible
- [ ] Connexion livreur fonctionne

## 🎉 Félicitations !

Une fois le déploiement terminé, votre application est en ligne ! 🚀
