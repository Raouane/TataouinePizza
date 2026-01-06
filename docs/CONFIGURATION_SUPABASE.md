# 🗄️ Configuration Supabase comme Base de Données Principale

Ce guide vous explique comment configurer votre application pour utiliser Supabase comme base de données principale.

## 📋 Prérequis

1. Un projet Supabase créé
2. L'URL de connexion PostgreSQL de Supabase
3. Le mot de passe de la base de données Supabase

## 🔧 Configuration

### 1. Obtenir l'URL de connexion Supabase

1. Allez sur [Supabase Dashboard](https://app.supabase.com)
2. Sélectionnez votre projet
3. Allez dans **Settings** > **Database**
4. Copiez l'**Connection String** (format: `postgresql://postgres.[ref]:[password]@aws-[region].pooler.supabase.com:5432/postgres`)

### 2. Configurer le fichier `.env`

Ouvrez votre fichier `.env` et configurez `DATABASE_URL` :

```env
# Base de données Supabase (PRINCIPALE)
DATABASE_URL=postgresql://postgres.[ref]:[password]@aws-[region].pooler.supabase.com:5432/postgres?sslmode=require

# Optionnel : Si vous migrez depuis Render, gardez l'ancienne URL temporairement
# SUPABASE_DATABASE_URL=postgresql://postgres.[ref]:[password]@aws-[region].pooler.supabase.com:5432/postgres?sslmode=require
```

**Format de l'URL Supabase :**
```
postgresql://postgres.[PROJECT_REF]:[PASSWORD]@aws-[REGION].pooler.supabase.com:[PORT]/postgres?sslmode=require
```

**Ports disponibles :**
- `5432` : Connexion directe (recommandé pour migrations)
- `6543` : Connexion via pooler (recommandé pour production)

**Exemple :**
```env
DATABASE_URL=postgresql://postgres.dizcnsohvipedeqlmecb:X4u%3F4PNdHs3-Yst@aws-1-eu-west-1.pooler.supabase.com:6543/postgres?sslmode=require
```

### 3. Encoder le mot de passe si nécessaire

Si votre mot de passe contient des caractères spéciaux (`@`, `#`, `%`, etc.), vous devez les encoder :

- `@` → `%40`
- `#` → `%23`
- `%` → `%25`
- `?` → `%3F`
- etc.

**Exemple :**
- Mot de passe original : `X4u?4PNdHs3-Yst`
- Mot de passe encodé : `X4u%3F4PNdHs3-Yst`

### 4. Vérifier la configuration SSL

Supabase nécessite SSL. Le code détecte automatiquement Supabase et configure SSL. Vous pouvez aussi forcer SSL avec :

```env
PGSSLMODE=no-verify
```

## 🚀 Migration des données

Si vous migrez depuis Render vers Supabase :

1. **Assurez-vous que les migrations sont appliquées** :
   - Les migrations s'exécutent automatiquement au démarrage
   - Vérifiez les logs : `[DB] ✅ Table [nom_table] créée/vérifiée`

2. **Migrer les données existantes** :
   - Utilisez le bouton "Migration DB" dans l'espace admin
   - Ou exécutez le script : `npm run migrate:render-to-supabase`

## ✅ Vérification

### 1. Tester la connexion

Démarrez l'application :
```bash
npm run dev
```

Vérifiez les logs :
```
[DB] DATABASE_URL contient 'supabase': true
[DB] ✅✅✅ Configuration SSL Supabase FORCÉE
[DB] Connexion PostgreSQL établie
```

### 2. Vérifier les tables

Connectez-vous à Supabase SQL Editor et exécutez :

```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;
```

Vous devriez voir toutes les tables :
- `admin_users`
- `restaurants`
- `drivers`
- `pizzas`
- `pizza_prices`
- `customers`
- `orders`
- `order_items`
- `otp_codes`
- `idempotency_keys`
- `telegram_messages`
- `cash_handovers`

### 3. Tester l'API

```bash
# Health check
curl http://localhost:5000/api/health

# Devrait retourner : {"status":"ok",...}
```

## 🔍 Dépannage

### Erreur : "relation does not exist"

**Solution :** Les migrations n'ont pas été exécutées. Redémarrez l'application pour déclencher les migrations automatiques.

### Erreur : "SSL connection required"

**Solution :** Ajoutez `?sslmode=require` à la fin de votre `DATABASE_URL` ou définissez `PGSSLMODE=no-verify`.

### Erreur : "password authentication failed"

**Solution :** 
1. Vérifiez que le mot de passe est correct
2. Encodez les caractères spéciaux dans le mot de passe
3. Vérifiez que vous utilisez le bon port (5432 ou 6543)

### Erreur : "connection timeout"

**Solution :**
1. Vérifiez votre connexion internet
2. Vérifiez que le firewall n'bloque pas le port
3. Essayez le port 6543 (pooler) au lieu de 5432

## 📝 Notes importantes

1. **Port 5432 vs 6543** :
   - `5432` : Connexion directe, meilleur pour migrations
   - `6543` : Connexion via pooler, meilleur pour production (gère mieux les connexions multiples)

2. **SSL** : Supabase nécessite toujours SSL. Le code configure automatiquement `rejectUnauthorized: false` pour accepter les certificats auto-signés.

3. **Migrations** : Les migrations s'exécutent automatiquement au démarrage. Vous n'avez pas besoin de les exécuter manuellement.

4. **Performance** : Utilisez le pooler (port 6543) en production pour de meilleures performances.

## 🎯 Configuration finale recommandée

```env
# Production Supabase
DATABASE_URL=postgresql://postgres.[ref]:[password]@aws-[region].pooler.supabase.com:6543/postgres?sslmode=require

# SSL (optionnel, déjà géré automatiquement)
PGSSLMODE=no-verify
```
