# 🆘 Dépannage - Déploiement Render

## Problème : La page se ferme après 3 secondes

Si après avoir cliqué sur "Connecter", une page s'ouvre puis se ferme rapidement, voici les solutions :

### Solution 1 : Vérifier que render.yaml est bien dans le dépôt

1. Allez sur GitHub : `https://github.com/Raouane/TataouinePizza`
2. Vérifiez que le fichier `render.yaml` est présent à la racine
3. Si absent, poussez-le :
   ```bash
   git add render.yaml
   git commit -m "Ajout render.yaml"
   git push origin main
   ```

### Solution 2 : Créer manuellement (Alternative)

Si le Blueprint ne fonctionne pas, créez les services manuellement :

#### Étape 1 : Créer la base de données

1. Dans Render Dashboard → **"+ Nouveau"** → **"Postgres"**
2. Configurez :
   - **Nom** : `tataouine-pizza-db`
   - **Base de données** : `tataouine_pizza`
   - **Utilisateur** : `tataouine_user`
   - **Région** : Frankfurt (ou la plus proche)
   - **Plan** : Starter
3. Cliquez sur **"Créer la base de données"**

#### Étape 2 : Créer le service Web

1. Dans Render Dashboard → **"+ Nouveau"** → **"Service Web"**
2. Cliquez sur **"Connecter un dépôt"**
3. Sélectionnez : `Raouane / TataouinePizza`
4. Configurez :
   - **Nom** : `tataouine-pizza`
   - **Environnement** : `Node`
   - **Région** : Même région que la base de données
   - **Branche** : `main`
   - **Répertoire racine** : `/` (laissez vide ou mettez `/`)
   - **Commande de build** : `npm install && npm run build`
   - **Commande de démarrage** : `npm start`
   - **Plan** : Starter

#### Étape 3 : Configurer les variables d'environnement

Dans les paramètres du service Web → **"Variables d'environnement"** :

1. Cliquez sur **"Link Database"**
2. Sélectionnez `tataouine-pizza-db`
3. Render ajoutera automatiquement `DATABASE_URL`

Ajoutez manuellement :
- **NODE_ENV** = `production`
- **PORT** = `10000`
- **JWT_SECRET** = (générez une clé aléatoire, ex: `openssl rand -base64 32`)

#### Étape 4 : Créer le service

Cliquez sur **"Créer le service Web"**

### Solution 3 : Vérifier les logs du navigateur

1. Ouvrez les outils de développement (F12)
2. Allez dans l'onglet **"Console"**
3. Cliquez à nouveau sur "Connecter"
4. Regardez s'il y a des erreurs JavaScript

### Solution 4 : Vérifier l'authentification GitHub

1. Dans Render Dashboard → **"Paramètres"** → **"Comptes Git"**
2. Vérifiez que GitHub est bien connecté
3. Si nécessaire, reconnectez votre compte GitHub

### Solution 5 : Essayer en navigation privée

Parfois, les extensions de navigateur peuvent causer des problèmes :
1. Ouvrez une fenêtre de navigation privée
2. Connectez-vous à Render
3. Réessayez de créer le Blueprint

## ✅ Vérification après création manuelle

Une fois les services créés manuellement :

1. **Base de données** : Vérifiez qu'elle est "Disponible"
2. **Service Web** : Attendez le build (5-10 minutes)
3. **Logs** : Vérifiez qu'il n'y a pas d'erreurs
4. **URL** : Votre app sera à `https://tataouine-pizza.onrender.com`

## 📝 Note

La méthode manuelle fonctionne exactement comme le Blueprint, mais vous configurez chaque service séparément. C'est plus long mais plus fiable si le Blueprint pose problème.



