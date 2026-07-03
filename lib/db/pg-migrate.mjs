// Minimal PostgreSQL migration script using built-in https
const DATABASE_URL = "postgresql://neondb_owner:npg_19PyrcJiUdgh@ep-restless-brook-ahzzosha-pooler.c-3.us-east-1.aws.neon.tech/neondb?sslmode=require";

async function migrate() {
  console.log("Connecting to Neon database...");
  
  // Parse the URL
  const url = new URL(DATABASE_URL);
  const host = url.hostname;
  const port = url.port || 5432;
  const database = url.pathname.slice(1);
  const user = url.username;
  const password = url.password;

  // For Neon, we need to use their API or a connection. Let's try a different approach
  // Create a simple migration using fetch to Neon API or run inline
  
  const { Client } = await import("pg");
  const client = new Client({
    host,
    port: parseInt(port),
    database,
    user,
    password,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log("Connected!");

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
    console.log("✓ submissions table ready");

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
    console.log("✓ visitors table ready");

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
    console.log("✓ admin_sessions table ready");

    console.log("\n✅ Migration completed successfully!");
  } catch (error) {
    console.error("Migration failed:", error.message);
    throw error;
  } finally {
    await client.end();
  }
}

migrate().catch(console.error);
