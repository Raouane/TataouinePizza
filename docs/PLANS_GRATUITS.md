# 💰 Plans gratuits pour déployer votre application

## 🎯 Render.com - Plan gratuit disponible

Render propose un **plan Starter gratuit** qui inclut :

### ✅ Ce qui est gratuit sur Render

- **Service Web** : 750 heures/mois (gratuit)
- **Base de données PostgreSQL** : 90 jours de rétention, 1 GB de stockage (gratuit)
- **Bandwidth** : 100 GB/mois (gratuit)

### ⚠️ Limitations du plan gratuit

- Le service Web "s'endort" après 15 minutes d'inactivité
- Le premier démarrage après veille prend 30-60 secondes
- La base de données est supprimée après 90 jours d'inactivité

### 📋 Comment utiliser le plan gratuit

Quand vous créez un service sur Render :

1. **Plan** : Sélectionnez **"Starter"** (gratuit)
2. **Ne cochez PAS** les options payantes
3. Le plan gratuit est automatiquement sélectionné par défaut

Si Render vous demande de payer, c'est probablement parce que :
- Vous avez sélectionné un plan payant par erreur
- Vous avez dépassé les limites du plan gratuit

## 🆓 Alternatives gratuites

Si Render ne fonctionne pas, voici d'autres options gratuites :

### 1. Railway.app (Recommandé)

- ✅ Plan gratuit : 500 heures/mois
- ✅ Base de données PostgreSQL incluse
- ✅ Pas de veille automatique
- ✅ Déploiement automatique depuis GitHub

**Déploiement** :
1. Allez sur [railway.app](https://railway.app)
2. Créez un compte (gratuit)
3. "New Project" → "Deploy from GitHub repo"
4. Sélectionnez votre dépôt
5. Railway détectera automatiquement Node.js et déploiera

### 2. Fly.io

- ✅ Plan gratuit : 3 VMs gratuites
- ✅ Base de données PostgreSQL gratuite
- ✅ Pas de veille automatique

### 3. Vercel (Frontend) + Supabase (Backend)

- ✅ Vercel : Déploiement gratuit du frontend
- ✅ Supabase : Base de données PostgreSQL gratuite (500 MB)
- ⚠️ Nécessite de séparer frontend et backend

### 4. Heroku (Alternative)

- ⚠️ Plus de plan gratuit permanent
- 💰 Payant uniquement maintenant

## 🎯 Recommandation : Railway.app

Railway est la meilleure alternative gratuite à Render :

1. **Plus simple** : Déploiement automatique depuis GitHub
2. **Pas de veille** : Votre app reste toujours active
3. **Base de données incluse** : PostgreSQL gratuit
4. **Interface moderne** : Plus facile à utiliser

### Déploiement sur Railway

1. Allez sur [railway.app](https://railway.app)
2. Créez un compte (gratuit avec GitHub)
3. Cliquez sur **"New Project"**
4. Sélectionnez **"Deploy from GitHub repo"**
5. Choisissez votre dépôt : `Raouane/TataouinePizza`
6. Railway va :
   - Détecter automatiquement Node.js
   - Installer les dépendances
   - Démarrer l'application
   - Créer une base de données PostgreSQL

### Configuration Railway

Railway détecte automatiquement :
- ✅ `package.json` → Installe les dépendances
- ✅ `npm start` → Démarre l'application
- ✅ Variables d'environnement → À configurer manuellement

**Variables d'environnement à ajouter** :
- `NODE_ENV` = `production`
- `PORT` = (Railway définit automatiquement, mais vous pouvez mettre `10000`)
- `DATABASE_URL` = (Railway crée automatiquement une base PostgreSQL)
- `JWT_SECRET` = (Générez une clé aléatoire)

## 📝 Comparaison des options gratuites

| Service | Plan gratuit | Veille | Base de données | Facilité |
|---------|--------------|--------|-----------------|----------|
| **Render** | 750h/mois | ⚠️ Oui (15 min) | ✅ Oui | ⭐⭐⭐ |
| **Railway** | 500h/mois | ✅ Non | ✅ Oui | ⭐⭐⭐⭐⭐ |
| **Fly.io** | 3 VMs | ✅ Non | ✅ Oui | ⭐⭐⭐⭐ |
| **Vercel+Supabase** | Illimité | ✅ Non | ✅ Oui | ⭐⭐⭐ |

## 🎯 Ma recommandation

**Utilisez Railway.app** - C'est le plus simple et le plus fiable pour un déploiement gratuit.

Souhaitez-vous que je vous guide pour déployer sur Railway ?



