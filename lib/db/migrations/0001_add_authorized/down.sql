-- Remove authorized column from visitors table
ALTER TABLE visitors DROP COLUMN IF EXISTS authorized;
