-- Migration: Add uco_pickup_history column to restaurants table
-- This adds an array column to store UCO pickup amounts in litres for each restaurant

ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS uco_pickup_history INTEGER[] DEFAULT NULL;

-- Update index to include the new column
DROP INDEX IF EXISTS idx_restaurants_created_at;
CREATE INDEX IF NOT EXISTS idx_restaurants_created_at ON restaurants(created_at DESC);

