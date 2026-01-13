# 🔧 Fix : Erreur d'authentification PostgreSQL sur Render

## ❌ Erreur rencontrée

```
error: password authentication failed for user "postgres"
code: '28P01'
```

Cette erreur signifie que la variable d'environnement `DATABASE_URL` sur Render n'est pas correctement configurée ou que le mot de passe est incorrect.

## ✅ Solution

### 1. Vérifier la variable d'environnement sur Render

1. Allez sur [Render Dashboard](https://dashboard.render.com)
2. Sélectionnez votre service web (Tataouine Pizza)
3. Allez dans **Environment** (Variables d'environnement)
4. Vérifiez que `DATABASE_URL` est bien définie

### 2. Récupérer la bonne URL de connexion

#### Option A : Si vous utilisez Supabase

1. Allez sur [Supabase Dashboard](https://app.supabase.com)
2. Sélectionnez votre projet
3. Allez dans **Settings** > **Database**
4. Copiez l'**Connection String** (format pooler recommandé pour production) :
   ```
   postgresql://postgres.[PROJECT_REF]:[PASSWORD]@aws-[REGION].pooler.supabase.com:6543/postgres?sslmode=require
   ```

#### Option B : Si vous utilisez Render PostgreSQL

1. Allez sur [Render Dashboard](https://dashboard.render.com)
2. Sélectionnez votre base de données PostgreSQL
3. Copiez l'**Internal Database URL** (pour services sur Render) ou **External Database URL** (si vous êtes en dehors de Render)

### 3. Encoder le mot de passe si nécessaire

Si votre mot de passe contient des caractères spéciaux, encodez-les :

| Caractère | Encodé |
|-----------|--------|
| `@` | `%40` |
| `#` | `%23` |
| `%` | `%25` |
| `?` | `%3F` |
| `/` | `%2F` |
| `:` | `%3A` |
| `&` | `%26` |
| `=` | `%3D` |

**Exemple :**
- Mot de passe original : `X4u?4PNdHs3-Yst`
- Mot de passe encodé : `X4u%3F4PNdHs3-Yst`

### 4. Mettre à jour la variable sur Render

1. Dans Render Dashboard → votre service → **Environment**
2. Trouvez `DATABASE_URL`
3. Cliquez sur **Edit** ou **Add**
4. Collez la nouvelle URL (avec mot de passe encodé si nécessaire)
5. Cliquez sur **Save Changes**

### 5. Redémarrer le service

Après avoir mis à jour la variable d'environnement :

1. Allez dans **Manual Deploy** ou **Events**
2. Cliquez sur **Clear build cache & deploy** (optionnel mais recommandé)
3. Le service va redémarrer automatiquement

## 🔍 Vérification

Après le redémarrage, vérifiez les logs :

1. Allez dans **Logs** de votre service sur Render
2. Cherchez ces messages :
   ```
   [DB] DATABASE_URL (masqué): postgresql://postgres.****@...
   [DB] Connexion PostgreSQL établie
   ```
3. Si vous voyez `[DB] Connexion PostgreSQL établie`, c'est bon ✅
4. Si vous voyez encore `password authentication failed`, vérifiez :
   - Que l'URL est correcte
   - Que le mot de passe est bien encodé
   - Que la base de données est active

## 🚨 Problèmes courants

### Problème 1 : URL pointe vers une ancienne base de données

**Solution :** Vérifiez que l'URL pointe vers la bonne base de données (Supabase ou Render PostgreSQL actuelle)

### Problème 2 : Mot de passe avec caractères spéciaux non encodés

**Solution :** Encodez tous les caractères spéciaux dans le mot de passe

### Problème 3 : Base de données supprimée ou suspendue

**Solution :** Vérifiez que la base de données est active sur Supabase/Render

## 📝 Format d'URL correct

### Pour Supabase (Production)
```
postgresql://postgres.[PROJECT_REF]:[PASSWORD_ENCODED]@aws-[REGION].pooler.supabase.com:6543/postgres?sslmode=require
```

### Pour Render PostgreSQL
```
postgresql://[USER]:[PASSWORD_ENCODED]@[HOST]:5432/[DATABASE]?sslmode=require
```

## ✅ Après correction

Une fois la correction appliquée, vous devriez voir dans les logs :
- ✅ `[DB] Connexion PostgreSQL établie`
- ✅ `[API] 📦 X restaurants trouvés dans la base de données`
- ✅ Les restaurants s'affichent sur la page d'accueil
