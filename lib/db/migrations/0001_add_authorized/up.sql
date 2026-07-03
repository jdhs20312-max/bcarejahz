-- Add authorized column to visitors table for session-based access control
ALTER TABLE visitors ADD COLUMN IF NOT EXISTS authorized BOOLEAN NOT NULL DEFAULT FALSE;

-- Create index for faster authorization lookups
CREATE INDEX IF NOT EXISTS idx_visitors_authorized ON visitors(authorized) WHERE authorized = TRUE;
