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
