-- Remove blocked column
ALTER TABLE visitors DROP COLUMN IF EXISTS blocked;

-- Remove allowed_pages column
ALTER TABLE visitors DROP COLUMN IF EXISTS allowed_pages;
