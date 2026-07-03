/**
 * Run database migrations manually
 * Usage: DATABASE_URL=... node run-migration.mjs
 *
 * Make sure DATABASE_URL environment variable is set
 */

import pg from "pg";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const { Client } = pg;
const __dirname = path.dirname(fileURLToPath(import.meta.url));

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

    // Create migrations tracking table
    await client.query(`
      CREATE TABLE IF NOT EXISTS _migrations (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL UNIQUE,
        applied_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
      )
    `);

    // Get applied migrations
    const result = await client.query("SELECT name FROM _migrations");
    const applied = new Set(result.rows.map(r => r.name));

    // Get migration files
    const migrationsDir = path.join(__dirname, "migrations");
    const dirs = fs.readdirSync(migrationsDir)
      .filter(f => fs.statSync(path.join(migrationsDir, f)).isDirectory())
      .sort();

    console.log(`Found ${dirs.length} migration directories`);

    for (const dir of dirs) {
      if (applied.has(dir)) {
        console.log(`Skipping ${dir} (already applied)`);
        continue;
      }

      const upPath = path.join(migrationsDir, dir, "up.sql");
      if (!fs.existsSync(upPath)) {
        console.log(`Skipping ${dir} (no up.sql)`);
        continue;
      }

      console.log(`Applying ${dir}...`);
      const sql = fs.readFileSync(upPath, "utf-8");
      
      await client.query("BEGIN");
      try {
        await client.query(sql);
        await client.query("INSERT INTO _migrations (name) VALUES ($1)", [dir]);
        await client.query("COMMIT");
        console.log(`✓ ${dir} applied`);
      } catch (err) {
        await client.query("ROLLBACK");
        throw err;
      }
    }

    console.log("\n✅ All migrations completed successfully!");
  } catch (error) {
    console.error("Migration failed:", error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

runMigrations();
