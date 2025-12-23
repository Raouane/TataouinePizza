# Création d'un Admin en Production

## Problème

Si vous ne pouvez pas vous connecter comme admin en production, c'est probablement parce qu'aucun compte admin n'existe dans la base de données.

## Solution

### Option 1 : Via le script (Recommandé)

Utilisez le script `create-admin` pour créer un admin :

```bash
npm run create-admin <email> <password>
```

**Exemple :**
```bash
npm run create-admin admin@tataouinepizza.com MonMotDePasse123
```

### Option 2 : Via l'interface (si disponible)

1. Allez sur `/admin/login`
2. Cliquez sur "Créer un compte admin"
3. Entrez votre email et mot de passe

### Option 3 : Via SQL direct (si vous avez accès à la DB)

```sql
INSERT INTO admin_users (id, email, password, created_at)
VALUES (
  gen_random_uuid(),
  'admin@example.com',
  '$2a$10$...', -- Hash bcrypt du mot de passe
  NOW()
);
```

⚠️ **Note :** Vous devez générer le hash bcrypt du mot de passe. Utilisez plutôt le script.

## Vérification

Après création, vous pouvez vous connecter avec :
- **Email :** celui que vous avez utilisé
- **Mot de passe :** celui que vous avez défini

## Variables d'environnement importantes

Assurez-vous que `JWT_SECRET` est défini en production :

```env
JWT_SECRET=votre-secret-jwt-tres-securise-en-production
```

⚠️ **Important :** Ne partagez jamais votre `JWT_SECRET` et utilisez un secret fort en production.

## Dépannage

### Erreur : "Invalid credentials"
- Vérifiez que l'admin existe dans la base de données
- Vérifiez que vous utilisez le bon email et mot de passe
- Vérifiez les logs du serveur pour plus de détails

### Erreur : "No token provided"
- Vérifiez que le token est bien stocké dans `localStorage`
- Vérifiez que le header `Authorization` est bien envoyé

### Erreur : "Invalid token"
- Vérifiez que `JWT_SECRET` est le même entre les environnements
- Le token peut être expiré (durée de vie : 7 jours)




