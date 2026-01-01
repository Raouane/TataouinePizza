# 🔧 Migration : Table order_telegram_messages

## ⚠️ IMPORTANT

Cette migration doit être exécutée pour activer la suppression automatique des messages Telegram lors de l'annulation d'une commande.

## 📋 Instructions

### Option 1 : Via votre interface d'administration (Recommandé)

Si vous utilisez **Render**, **Neon**, **Supabase** ou une autre plateforme :

1. Ouvrez votre interface d'administration de base de données
2. Allez dans l'éditeur SQL
3. Copiez-collez le contenu du fichier `migrations/add_order_telegram_messages.sql`
4. Exécutez la requête

### Option 2 : Via psql (ligne de commande)

```bash
psql $DATABASE_URL -f migrations/add_order_telegram_messages.sql
```

### Option 3 : Via votre client PostgreSQL

1. Connectez-vous à votre base de données PostgreSQL
2. Ouvrez une nouvelle requête SQL
3. Copiez-collez le contenu ci-dessous :

```sql
-- Migration: Ajout de la table order_telegram_messages
-- Description: Stocke les IDs des messages Telegram envoyés aux livreurs pour pouvoir les supprimer lors de l'annulation

CREATE TABLE IF NOT EXISTS order_telegram_messages (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id VARCHAR NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  driver_id VARCHAR NOT NULL REFERENCES drivers(id) ON DELETE CASCADE,
  driver_telegram_id VARCHAR NOT NULL,
  message_id INTEGER NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  deleted_at TIMESTAMP NULL
);

-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_order_telegram_order_id ON order_telegram_messages(order_id);
CREATE INDEX IF NOT EXISTS idx_order_telegram_driver_id ON order_telegram_messages(driver_id);
CREATE INDEX IF NOT EXISTS idx_order_telegram_deleted_at ON order_telegram_messages(deleted_at) WHERE deleted_at IS NULL;
```

4. Exécutez la requête

## ✅ Vérification

Après exécution, vérifiez que la table existe :

```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_name = 'order_telegram_messages';
```

Vous devriez voir :
```
table_name
-------------------
order_telegram_messages
```

## 🎯 Résultat

Une fois la migration exécutée :
- ✅ Les messages Telegram seront automatiquement stockés lors de l'envoi
- ✅ Les messages seront automatiquement supprimés lors de l'annulation d'une commande
- ✅ Les livreurs ne verront plus de messages invalides

## ⚠️ Note

Si vous avez déjà des commandes avec des messages Telegram envoyés, ces messages ne seront **pas** supprimés automatiquement car ils n'ont pas été stockés dans la base de données. Seuls les messages envoyés **après** l'exécution de cette migration seront supprimés automatiquement.
