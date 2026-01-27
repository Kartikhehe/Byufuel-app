-- Migration: Remove amount column from restaurants table
-- The amount field should only be input at the time of route optimization, not stored permanently
-- Run this migration to remove the amount column from the database

-- Remove amount column from restaurants table
ALTER TABLE restaurants DROP COLUMN IF EXISTS amount;

-- Verify the change
-- You can check the table structure with:
-- \d restaurants

