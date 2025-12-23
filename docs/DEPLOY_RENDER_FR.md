# 🚀 Déploiement sur Render - Guide en français

## 📋 Étape 1 : Créer un Blueprint (appelé "Plan" en français)

1. Dans Render Dashboard, cliquez sur **"+ Nouveau"** (en haut à droite)
2. Dans le menu déroulant, cherchez **"Plan"** (c'est le dernier élément en bas de la liste)
   - ⚠️ **Note** : "Plan" = "Blueprint" en anglais
   - L'icône ressemble à des points connectés (●●●)
3. Cliquez sur **"Plan"**

## 📋 Étape 2 : Connecter votre dépôt GitHub

1. Render vous demandera de connecter votre compte GitHub (si ce n'est pas déjà fait)
2. Autorisez Render à accéder à vos dépôts
3. Sélectionnez le dépôt : **`Raouane/TataouinePizza`**

## 📋 Étape 3 : Configurer le Blueprint

1. Render détectera automatiquement le fichier `render.yaml`
2. Vous verrez un aperçu de ce qui sera créé :
   - ✅ Base de données PostgreSQL (`tataouine-pizza-db`)
   - ✅ Service Web (`tataouine-pizza`)
3. Cliquez sur **"Appliquer"** ou **"Apply"**

## 📋 Étape 4 : Attendre le déploiement

- Le premier déploiement prend **5-10 minutes**
- Suivez les logs dans Render Dashboard
- Vous devriez voir : `[DB] Demo data seeded successfully!`

## 🆘 Si vous ne trouvez toujours pas "Plan"

### Alternative : Créer manuellement

Si vous ne trouvez pas "Plan", vous pouvez créer les services manuellement :

#### 1. Créer la base de données PostgreSQL

1. Cliquez sur **"+ Nouveau"** → **"Postgres"**
2. Configurez :
   - **Nom** : `tataouine-pizza-db`
   - **Base de données** : `tataouine_pizza`
   - **Utilisateur** : `tataouine_user`
   - **Région** : Choisissez la plus proche (ex: Frankfurt)
   - **Plan** : Starter (gratuit)
3. Cliquez sur **"Créer la base de données"**

#### 2. Créer le service Web

1. Cliquez sur **"+ Nouveau"** → **"Service Web"**
2. Connectez votre dépôt GitHub
3. Sélectionnez : `Raouane/TataouinePizza`
4. Configurez :
   - **Nom** : `tataouine-pizza`
   - **Environnement** : `Node`
   - **Région** : Même région que la base de données
   - **Branche** : `main`
   - **Répertoire racine** : `/` (racine)
   - **Commande de build** : `npm install && npm run build`
   - **Commande de démarrage** : `npm start`
   - **Plan** : Starter (gratuit)
5. Dans **"Variables d'environnement"**, ajoutez :
   - `NODE_ENV` = `production`
   - `PORT` = `10000`
   - `DATABASE_URL` = (cliquez sur "Link Database" et sélectionnez `tataouine-pizza-db`)
   - `JWT_SECRET` = (générez une clé aléatoire)
6. Cliquez sur **"Créer le service Web"**

## ✅ Vérification

Après le déploiement, votre application sera à :
- **URL** : `https://tataouine-pizza.onrender.com`
- **API Health** : `https://tataouine-pizza.onrender.com/api/health`

## 📝 Notes

- "Plan" = "Blueprint" dans l'interface française
- Si vous ne voyez pas "Plan", utilisez la méthode manuelle ci-dessus
- Les migrations s'exécutent automatiquement au premier démarrage



