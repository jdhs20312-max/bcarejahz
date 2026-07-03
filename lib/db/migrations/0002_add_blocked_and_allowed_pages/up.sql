-- Add allowed_pages column to visitors table for tracking authorized pages
ALTER TABLE visitors ADD COLUMN IF NOT EXISTS allowed_pages TEXT NOT NULL DEFAULT '';

-- Add blocked column to visitors table for blocking visitors
ALTER TABLE visitors ADD COLUMN IF NOT EXISTS blocked BOOLEAN NOT NULL DEFAULT FALSE;

-- Create index for faster blocked lookups
CREATE INDEX IF NOT EXISTS idx_visitors_blocked ON visitors(blocked) WHERE blocked = TRUE;
