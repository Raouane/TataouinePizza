-- Migration: Ajouter le champ ignored_by à la table orders
-- Ce champ stocke un JSON array des driverId qui ont refusé cette commande

ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS ignored_by text;

-- Commentaire pour documenter le champ
COMMENT ON COLUMN orders.ignored_by IS 'JSON array des driverId qui ont refusé cette commande (ex: ["driver-id-1", "driver-id-2"])';
