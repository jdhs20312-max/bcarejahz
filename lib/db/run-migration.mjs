/**
 * Run database migrations manually
 * Usage: node run-migration.mjs
 * 
 * Make sure DATABASE_URL environment variable is set
 */

import pg from "pg";

const { Client } = pg;

async function runMigrations() {
  const databaseUrl = process.env.DATABASE_URL;
  
  if (!databaseUrl) {
    console.error("DATABASE_URL environment variable is required");
    process.exit(1);
  }

  const client = new Client({
    connectionString: databaseUrl,
  });

  try {
    await client.connect();
    console.log("Connected to database");

    // Create submissions table
    console.log("Creating submissions table...");
    await client.query(`
      CREATE TABLE IF NOT EXISTS submissions (
        id SERIAL PRIMARY KEY,
        session_id TEXT NOT NULL,
        type TEXT NOT NULL,
        data TEXT,
        ip_address TEXT,
        user_agent TEXT,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
      )
    `);
    console.log("✓ submissions table created");

    // Create visitors table
    console.log("Creating visitors table...");
    await client.query(`
      CREATE TABLE IF NOT EXISTS visitors (
        id SERIAL PRIMARY KEY,
        session_id TEXT NOT NULL UNIQUE,
        owner_name TEXT,
        ip_address TEXT,
        user_agent TEXT,
        first_visit TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        last_visit TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        visit_count INTEGER NOT NULL DEFAULT 1
      )
    `);
    console.log("✓ visitors table created");

    // Create admin_sessions table
    console.log("Creating admin_sessions table...");
    await client.query(`
      CREATE TABLE IF NOT EXISTS admin_sessions (
        id SERIAL PRIMARY KEY,
        token TEXT NOT NULL UNIQUE,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        expires_at TIMESTAMP WITH TIME ZONE NOT NULL
      )
    `);
    console.log("✓ admin_sessions table created");

    // Create indexes
    console.log("Creating indexes...");
    await client.query(`CREATE INDEX IF NOT EXISTS idx_submissions_session_id ON submissions(session_id)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_submissions_created_at ON submissions(created_at DESC)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_visitors_last_visit ON visitors(last_visit DESC)`);
    console.log("✓ indexes created");

    console.log("\n✅ All migrations completed successfully!");
  } catch (error) {
    console.error("Migration failed:", error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

runMigrations();
