import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./src/schema/index.ts",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL || "postgresql://neondb_owner:npg_19PyrcJiUdgh@ep-restless-brook-ahzzosha-pooler.c-3.us-east-1.aws.neon.tech/neondb?sslmode=require",
  },
});
