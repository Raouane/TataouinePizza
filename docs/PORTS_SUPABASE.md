# 🔌 Ports Supabase - Guide de Configuration

## 📊 Différence entre les ports

### Port 5432 - Connexion Directe
- **Usage** : Migrations, scripts, développement
- **Avantages** :
  - Connexion directe à la base
  - Meilleur pour les opérations longues
  - Pas de limite de connexions simultanées
- **Inconvénients** :
  - Peut être plus lent avec beaucoup de connexions
  - Consomme plus de ressources

### Port 6543 - Pooler (Transaction Mode)
- **Usage** : Production, applications avec beaucoup de connexions
- **Avantages** :
  - Gestion automatique du pool de connexions
  - Meilleures performances avec beaucoup de requêtes
  - Optimisé pour les transactions courtes
- **Inconvénients** :
  - Limite de connexions simultanées
  - Peut être moins adapté pour les migrations longues

## 🔧 Configuration recommandée

### Pour le développement local
```env
DATABASE_URL=postgresql://postgres.[ref]:[password]@aws-[region].pooler.supabase.com:5432/postgres?sslmode=require
```

### Pour la production (Render)
```env
DATABASE_URL=postgresql://postgres.[ref]:[password]@aws-[region].pooler.supabase.com:6543/postgres?sslmode=require
```

## 📝 Format de l'URL complète

```
postgresql://postgres.[PROJECT_REF]:[PASSWORD]@aws-[REGION].pooler.supabase.com:[PORT]/postgres?sslmode=require
```

**Composants :**
- `[PROJECT_REF]` : Référence de votre projet Supabase (ex: `dizcnsohvipedeqlmecb`)
- `[PASSWORD]` : Mot de passe de la base de données (encoder les caractères spéciaux)
- `[REGION]` : Région AWS (ex: `1-eu-west-1`)
- `[PORT]` : `5432` (direct) ou `6543` (pooler)

## ⚠️ Encodage du mot de passe

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

## 🔄 Changer de port

### Actuellement (port 6543 - pooler)
```env
DATABASE_URL=postgresql://postgres.dizcnsohvipedeqlmecb:X4u%3F4PNdHs3-Yst@aws-1-eu-west-1.pooler.supabase.com:6543/postgres?sslmode=require
```

### Pour passer au port 5432 (direct)
```env
DATABASE_URL=postgresql://postgres.dizcnsohvipedeqlmecb:X4u%3F4PNdHs3-Yst@aws-1-eu-west-1.pooler.supabase.com:5432/postgres?sslmode=require
```

**Note :** Changez seulement le numéro de port, le reste reste identique.

## ✅ Vérification

Après avoir changé le port, redémarrez l'application et vérifiez les logs :

```
[DB] DATABASE_URL contient 'supabase': true
[DB] ✅ URL Supabase détectée: Pooler (ou Direct selon le port)
[DB] Connexion PostgreSQL établie
```

## 🎯 Recommandation

- **Développement** : Port 5432 (direct)
- **Production** : Port 6543 (pooler)

Les deux fonctionnent, mais le pooler est optimisé pour la production avec beaucoup de connexions simultanées.
