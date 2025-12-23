# Fix: CRUD Admin ne fonctionne pas en Production

## Problème

Les opérations CRUD (Create, Read, Update, Delete) pour restaurants, livreurs et produits ne fonctionnent pas en production.

## Causes possibles

### 1. Token JWT invalide ou expiré
- Le token stocké dans `localStorage` peut être expiré
- Le `JWT_SECRET` peut être différent entre dev et prod

### 2. Admin non créé en production
- Aucun compte admin n'existe dans la base de données de production

### 3. Variable d'environnement manquante
- `JWT_SECRET` n'est pas défini en production

## Solutions

### Solution 1: Vérifier et créer un admin

```bash
# Sur votre serveur Render (via Shell ou render-cli)
npm run create-admin votre-email@example.com votre-mot-de-passe
```

### Solution 2: Vérifier JWT_SECRET

Assurez-vous que `JWT_SECRET` est défini dans les variables d'environnement Render :

1. Allez dans votre service Render
2. Settings → Environment
3. Vérifiez que `JWT_SECRET` est défini avec une valeur forte
4. Redémarrez le service

### Solution 3: Vérifier les logs

Les nouveaux logs vous indiqueront exactement le problème :

```
[AUTH] Requête POST /api/admin/restaurants
[AUTH] 🔍 Vérification du token (longueur: 200, préfixe: eyJhbGciOiJIUzI1NiIs...)
[AUTH] ✅ Token valide pour admin: admin@example.com
```

Ou en cas d'erreur :
```
[AUTH] ❌ Pas de header Authorization
[AUTH] ❌ Token invalide ou expiré
[AUTH] ⚠️  Le JWT_SECRET pourrait être différent entre dev et prod
```

### Solution 4: Se reconnecter

Si le token est expiré :

1. Allez sur `/admin/login`
2. Reconnectez-vous avec vos identifiants
3. Un nouveau token sera généré

## Vérifications à faire

### 1. Vérifier que l'admin existe

Connectez-vous à votre base de données et exécutez :

```sql
SELECT * FROM admin_users;
```

Si la table est vide, créez un admin avec le script.

### 2. Vérifier JWT_SECRET

Dans les logs Render, vous devriez voir :
- Si `JWT_SECRET` n'est pas défini : `⚠️ WARNING: JWT_SECRET n'est pas défini en production !`

### 3. Vérifier le token dans le navigateur

Ouvrez la console du navigateur (F12) et vérifiez :

```javascript
localStorage.getItem("adminToken")
```

Si c'est `null`, vous devez vous reconnecter.

## Logs améliorés

Les nouveaux logs vous aideront à diagnostiquer :

- `[AUTH] Requête POST /api/admin/restaurants` - Route appelée
- `[AUTH] 🔍 Vérification du token` - Token reçu
- `[AUTH] ✅ Token valide` - Authentification réussie
- `[AUTH] ❌ Token invalide` - Problème d'authentification
- `[ADMIN LOGIN] Tentative de connexion pour: <email>` - Tentative de login

## Test rapide

1. Ouvrez la console du navigateur (F12)
2. Allez sur `/admin/dashboard`
3. Regardez les erreurs dans la console
4. Vérifiez les logs Render pour voir les messages `[AUTH]`

## Si rien ne fonctionne

1. Vérifiez que vous êtes bien connecté (token présent)
2. Vérifiez les logs Render pour les erreurs `[AUTH]`
3. Créez un nouvel admin avec le script
4. Reconnectez-vous avec le nouvel admin
5. Vérifiez que `JWT_SECRET` est bien défini


