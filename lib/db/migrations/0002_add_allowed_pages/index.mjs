import { sql } from "drizzle-orm";
import { db, pool } from "../src/index";

async function migrate() {
  console.log("Running migration: 0002_add_allowed_pages");
  
  // Add allowed_pages column to visitors table
  await db.execute(sql`
    ALTER TABLE visitors 
    ADD COLUMN IF NOT EXISTS allowed_pages TEXT NOT NULL DEFAULT ''
  `);
  
  console.log("Migration completed successfully!");
  await pool.end();
  process.exit(0);
}

migrate().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
