-- Migration: Ajout du statut "received" à l'enum order_status
-- Description: Ajoute le statut "received" pour les commandes nouvellement créées
-- Date: 2026-01-01

-- IMPORTANT: ALTER TYPE ... ADD VALUE ne peut pas être exécuté dans une transaction
-- Cette migration doit être exécutée manuellement ou via migrate-on-startup.ts

-- Vérifier si "received" existe déjà dans l'enum, puis l'ajouter si nécessaire
DO $$ 
BEGIN
  -- Vérifier si la valeur "received" existe déjà
  IF NOT EXISTS (
    SELECT 1 
    FROM pg_enum 
    WHERE enumlabel = 'received' 
    AND enumtypid = (
      SELECT oid 
      FROM pg_type 
      WHERE typname = 'order_status'
    )
  ) THEN
    -- Ajouter la valeur "received" à l'enum
    -- Note: ALTER TYPE ... ADD VALUE ne peut pas être dans une transaction
    -- Mais dans un DO block avec gestion d'exception, ça fonctionne
    BEGIN
      ALTER TYPE order_status ADD VALUE 'received';
      RAISE NOTICE 'Statut "received" ajouté à l''enum order_status';
    EXCEPTION
      WHEN duplicate_object THEN
        RAISE NOTICE 'Statut "received" existe déjà dans l''enum order_status';
    END;
  ELSE
    RAISE NOTICE 'Statut "received" existe déjà dans l''enum order_status';
  END IF;
END $$;

-- Vérification: Afficher tous les statuts disponibles
SELECT 
  enumlabel as status_value,
  enumsortorder as sort_order
FROM pg_enum 
WHERE enumtypid = (
  SELECT oid 
  FROM pg_type 
  WHERE typname = 'order_status'
)
ORDER BY enumsortorder;
