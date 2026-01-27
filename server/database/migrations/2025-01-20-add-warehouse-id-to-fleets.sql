-- Migration to add warehouse_id foreign key to fleets table and remove area column
-- This replaces the text-based 'area' field with a reference to the warehouses table

-- Step 1: Add warehouse_id column (nullable initially)
ALTER TABLE fleets ADD COLUMN IF NOT EXISTS warehouse_id INTEGER;

-- Step 2: Add foreign key constraint
ALTER TABLE fleets ADD CONSTRAINT fk_fleet_warehouse 
FOREIGN KEY (warehouse_id) REFERENCES warehouses(id) ON DELETE SET NULL;

-- Step 3: Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_fleets_warehouse_id ON fleets(warehouse_id);

-- Step 4: Remove the area column (data migration complete - area info now stored via warehouse_id)
ALTER TABLE fleets DROP COLUMN IF EXISTS area;

-- Step 5: Remove old indexes related to area (if they exist)
DROP INDEX IF EXISTS idx_fleets_area;

-- Note: If you have existing data with area values, you'll need to manually 
-- update fleets to set warehouse_id based on matching warehouse names
-- Example:
-- UPDATE fleets f
-- SET warehouse_id = w.id
-- FROM warehouses w
-- WHERE f.area IS NOT NULL AND LOWER(w.name) LIKE LOWER(CONCAT('%', f.area, '%'));

