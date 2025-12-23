-- Migration: Add last_seen to drivers and assigned_at to orders
-- Date: 2025-01-XX

-- Add last_seen column to drivers table
ALTER TABLE drivers 
ADD COLUMN IF NOT EXISTS last_seen TIMESTAMP DEFAULT NOW();

-- Add assigned_at column to orders table
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS assigned_at TIMESTAMP;

-- Update existing drivers to have last_seen = NOW()
UPDATE drivers 
SET last_seen = NOW() 
WHERE last_seen IS NULL;






