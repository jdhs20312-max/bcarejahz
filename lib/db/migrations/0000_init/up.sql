-- Create submissions table
CREATE TABLE IF NOT EXISTS submissions (
    id SERIAL PRIMARY KEY,
    session_id TEXT NOT NULL,
    type TEXT NOT NULL,
    data TEXT,
    ip_address TEXT,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create visitors table
CREATE TABLE IF NOT EXISTS visitors (
    id SERIAL PRIMARY KEY,
    session_id TEXT NOT NULL UNIQUE,
    owner_name TEXT,
    ip_address TEXT,
    user_agent TEXT,
    first_visit TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    last_visit TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    visit_count INTEGER NOT NULL DEFAULT 1
);

-- Create admin_sessions table
CREATE TABLE IF NOT EXISTS admin_sessions (
    id SERIAL PRIMARY KEY,
    token TEXT NOT NULL UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_submissions_session_id ON submissions(session_id);
CREATE INDEX IF NOT EXISTS idx_submissions_created_at ON submissions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_visitors_last_visit ON visitors(last_visit DESC);
