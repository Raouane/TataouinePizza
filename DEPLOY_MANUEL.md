# 🚀 Déploiement manuel sur Render (si Blueprint ne fonctionne pas)

Si le Blueprint se ferme après 3 secondes, utilisez cette méthode manuelle qui fonctionne à 100%.

## 📋 Étape 1 : Créer la base de données PostgreSQL

1. Dans Render Dashboard → **"+ Nouveau"** → **"Postgres"**
2. Configurez :
   - **Nom** : `tataouine-pizza-db`
   - **Base de données** : `tataouine_pizza`
   - **Utilisateur** : `tataouine_user`
   - **Région** : Frankfurt (ou la région la plus proche)
   - **Plan** : Starter (gratuit)
3. Cliquez sur **"Créer la base de données"**
4. ⏱️ Attendez 2-3 minutes que la base soit créée

## 📋 Étape 2 : Créer le service Web

1. Dans Render Dashboard → **"+ Nouveau"** → **"Service Web"**
2. Cliquez sur **"Connecter un dépôt"**
3. Sélectionnez : **`Raouane / TataouinePizza`**
4. Cliquez sur **"Connecter"**

## 📋 Étape 3 : Configurer le service Web

Remplissez les champs suivants :

### Informations de base
- **Nom** : `tataouine-pizza`
- **Environnement** : `Node`
- **Région** : **Même région que la base de données** (important !)
- **Branche** : `main`
- **Répertoire racine** : `/` (laissez vide ou mettez juste `/`)

### Commandes
- **Commande de build** : `npm install && npm run build`
- **Commande de démarrage** : `npm start`

### Plan
- **Plan** : **Starter (gratuit)** ⚠️ Assurez-vous de sélectionner "Starter" et non un plan payant

## 📋 Étape 4 : Configurer les variables d'environnement

1. Dans la section **"Variables d'environnement"**, cliquez sur **"Link Database"**
2. Sélectionnez **`tataouine-pizza-db`**
3. Render ajoutera automatiquement `DATABASE_URL`

Ajoutez ces variables manuellement :

| Clé | Valeur |
|-----|--------|
| `NODE_ENV` | `production` |
| `PORT` | `10000` |
| `JWT_SECRET` | (Générez une clé aléatoire - voir ci-dessous) |

### Générer JWT_SECRET

**Option 1 : Via PowerShell**
```powershell
-join ((48..57) + (65..90) + (97..122) | Get-Random -Count 32 | ForEach-Object {[char]$_})
```

**Option 2 : En ligne**
Allez sur : https://www.random.org/strings/
- Longueur : 32
- Caractères : Alphanumeric
- Copiez le résultat

**Option 3 : Simple**
Utilisez : `tataouine-pizza-jwt-secret-2025-production`

## 📋 Étape 5 : Créer le service

1. Vérifiez que tout est correct
2. Cliquez sur **"Créer le service Web"**
3. ⏱️ Attendez 5-10 minutes pour le premier build

## ✅ Vérification

### Pendant le build

Suivez les logs dans Render Dashboard. Vous devriez voir :
```
✅ Installing dependencies...
✅ Building client...
✅ Building server...
[DB] Seeding database with demo data...
[DB] Demo data seeded successfully!
serving on port 10000
```

### Après le build

Votre application sera accessible à :
- **URL principale** : `https://tataouine-pizza.onrender.com`
- **API Health** : `https://tataouine-pizza.onrender.com/api/health`
- **API Restaurants** : `https://tataouine-pizza.onrender.com/api/restaurants`

### Tests

1. **Test de santé** :
   ```bash
   curl https://tataouine-pizza.onrender.com/api/health
   ```
   Devrait retourner : `{"status":"ok","timestamp":"..."}`

2. **Test restaurants** :
   ```bash
   curl https://tataouine-pizza.onrender.com/api/restaurants
   ```
   Devrait retourner un tableau avec 3 restaurants

3. **Interface web** :
   Ouvrez `https://tataouine-pizza.onrender.com` dans votre navigateur

4. **Connexion livreur** :
   - URL : `https://tataouine-pizza.onrender.com/driver/login`
   - Téléphone : `21612345678`
   - Mot de passe : `driver123`

## 🆘 Problèmes courants

### Le service ne démarre pas
- Vérifiez les logs dans Render Dashboard
- Vérifiez que toutes les variables d'environnement sont définies
- Vérifiez que la base de données est bien liée

### Erreur de connexion à la base de données
- Vérifiez que la base de données et le service Web sont dans la même région
- Vérifiez que `DATABASE_URL` est bien définie (via "Link Database")

### La base de données est vide
- Les migrations s'exécutent automatiquement au premier démarrage
- Si problème, utilisez Render Shell :
  1. Allez dans votre service Web → **"Shell"**
  2. Exécutez : `npm run db:migrate`

## 📝 Notes importantes

- ⏱️ Le premier build prend 5-10 minutes
- 💤 Sur le plan gratuit, le service peut "s'endormir" après 15 minutes d'inactivité
- 🔄 Le premier démarrage après veille prend 30-60 secondes
- 📊 Les données de démonstration sont créées automatiquement au premier démarrage

## 🎉 Félicitations !

Une fois le déploiement terminé, votre application est en ligne ! 🚀

