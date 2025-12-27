# Migrations SQL

## Migration: `add_client_order_id.sql`

**CRITIQUE** : Cette migration doit être exécutée pour activer la protection contre les doublons de commandes.

### Pourquoi cette migration ?

Cette migration ajoute la colonne `client_order_id` à la table `orders` pour permettre l'idempotence des commandes. Sans cette colonne, les doublons continueront à apparaître dans la base de données.

### Comment exécuter la migration

#### Option 1: Via votre client PostgreSQL (recommandé)

```sql
-- Connectez-vous à votre base de données
-- Puis exécutez le contenu de migrations/add_client_order_id.sql
```

#### Option 2: Via psql (ligne de commande)

```bash
psql -h votre-host -U votre-user -d votre-database -f migrations/add_client_order_id.sql
```

#### Option 3: Via votre interface d'administration (Neon, Supabase, etc.)

1. Ouvrez votre interface d'administration
2. Allez dans l'éditeur SQL
3. Copiez-collez le contenu de `migrations/add_client_order_id.sql`
4. Exécutez la requête

### Vérification

Après exécution, vérifiez que la colonne existe :

```sql
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'orders' AND column_name = 'client_order_id';
```

Vous devriez voir :
```
column_name      | data_type
-----------------|----------
client_order_id  | character varying
```

### Important

⚠️ **Sans cette migration, les doublons continueront à apparaître !**

Le backend essaiera d'utiliser `client_order_id` mais échouera silencieusement si la colonne n'existe pas, et utilisera uniquement la vérification par phone/restaurant/prix qui peut avoir des failles en cas de forte charge.

