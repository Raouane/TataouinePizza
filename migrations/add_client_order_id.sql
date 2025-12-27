-- Migration: Add client_order_id to orders table for idempotency
-- Date: 2025-01-XX
-- Purpose: Prevent duplicate orders when frontend sends same clientOrderId

-- Add client_order_id column to orders table
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS client_order_id VARCHAR(255);

-- Create unique index on client_order_id to ensure idempotency at DB level
-- This prevents duplicate orders even if application logic fails
CREATE UNIQUE INDEX IF NOT EXISTS idx_orders_client_order_id 
ON orders(client_order_id) 
WHERE client_order_id IS NOT NULL;

-- Note: The unique index allows NULL values (multiple NULLs are allowed)
-- This ensures backward compatibility with existing orders and allows
-- orders without clientOrderId to be created normally

