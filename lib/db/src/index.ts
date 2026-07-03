import { drizzle } from "drizzle-orm/node-postgres";
import { and, count, desc, eq } from "drizzle-orm";
import pg from "pg";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import * as schema from "./schema";

const { Pool } = pg;
const dataFile = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "db-store.json");

let db: unknown = null;
const store = {
  submissions: [] as schema.Submission[],
  visitors: [] as schema.Visitor[],
  nextId: 1,
  nextVisitorId: 1,
};

function loadStore() {
  if (!fs.existsSync(dataFile)) return;
  try {
    const raw = fs.readFileSync(dataFile, "utf-8");
    const parsed = JSON.parse(raw) as {
      submissions: Array<Omit<schema.Submission, "createdAt"> & { createdAt: string }>;
      visitors: Array<Omit<schema.Visitor, "firstVisit" | "lastVisit"> & { firstVisit: string; lastVisit: string }>;
      nextId: number;
      nextVisitorId: number;
    };
    store.nextId = parsed.nextId ?? 1;
    store.nextVisitorId = parsed.nextVisitorId ?? 1;
    store.submissions = parsed.submissions.map((submission) => ({
      ...submission,
      createdAt: new Date(submission.createdAt),
    }));
    store.visitors = (parsed.visitors ?? []).map((visitor) => ({
      ...visitor,
      firstVisit: new Date(visitor.firstVisit),
      lastVisit: new Date(visitor.lastVisit),
    }));
  } catch (err) {
    console.warn("Failed to load persistent DB store, starting fresh:", err);
    store.submissions = [];
    store.visitors = [];
    store.nextId = 1;
    store.nextVisitorId = 1;
  }
}

function saveStore() {
  try {
    fs.writeFileSync(
      dataFile,
      JSON.stringify(
        {
          nextId: store.nextId,
          nextVisitorId: store.nextVisitorId,
          submissions: store.submissions.map((submission) => ({
            ...submission,
            createdAt: submission.createdAt.toISOString(),
          })),
          visitors: store.visitors.map((visitor) => ({
            ...visitor,
            firstVisit: visitor.firstVisit.toISOString(),
            lastVisit: visitor.lastVisit.toISOString(),
          })),
        },
        null,
        2,
      ),
      "utf-8",
    );
  } catch (err) {
    console.error("Failed to save persistent DB store:", err);
  }
}

loadStore();

if (process.env.DATABASE_URL) {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  db = drizzle(pool, { schema });
} else {
  console.info("DATABASE_URL not set; using persistent disk fallback database");
}

export const submissionsTable = schema.submissionsTable;
export type { Submission, InsertSubmission } from "./schema";
export { db };

function createMemorySubmission(values: schema.InsertSubmission): schema.Submission {
  const row: schema.Submission = {
    id: store.nextId++,
    sessionId: values.sessionId,
    type: values.type,
    data: values.data ?? null,
    ipAddress: values.ipAddress ?? null,
    userAgent: values.userAgent ?? null,
    createdAt: new Date(),
  } as schema.Submission;
  store.submissions.push(row);
  saveStore();
  return row;
}

interface ListOptions {
  type?: string;
  sessionId?: string;
  limit?: number;
  offset?: number;
}

function getMemoryQuery(options: ListOptions = {}): schema.Submission[] {
  let rows = store.submissions.slice();

  if (options.type) {
    rows = rows.filter((row) => row.type === options.type);
  }
  if (options.sessionId) {
    rows = rows.filter((row) => row.sessionId === options.sessionId);
  }

  rows.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  const offset = options.offset ?? 0;
  const limit = options.limit ?? 50;
  return rows.slice(offset, offset + limit);
}

export async function insertSubmission(values: schema.InsertSubmission): Promise<schema.Submission> {
  if (db) {
    try {
      const realDb = db as any;
      const [row] = await realDb.insert(submissionsTable).values(values).returning();
      return row;
    } catch (dbError: any) {
      console.error("[DB] Neon query failed, falling back to memory:", dbError?.message || dbError);
      // Return empty array on error
      return createMemoryVisitor({ sessionId, ownerName });
      // Fallback to memory store if Neon fails
    }
  }

  return createMemorySubmission(values);
}

export async function listSubmissions(options: ListOptions = {}): Promise<schema.Submission[]> {
  if (db) {
    try {
      const realDb = db as any;
      let query = realDb
        .select()
        .from(submissionsTable)
        .orderBy(desc(submissionsTable.createdAt))
        .limit(options.limit ?? 50)
        .offset(options.offset ?? 0);

      if (options.type && options.sessionId) {
        query = query.where(
          and(eq(submissionsTable.type, options.type), eq(submissionsTable.sessionId, options.sessionId)),
        );
      } else if (options.type) {
        query = query.where(eq(submissionsTable.type, options.type));
      } else if (options.sessionId) {
        query = query.where(eq(submissionsTable.sessionId, options.sessionId));
      }

      return query;
    } catch (dbError: any) {
      console.error("[DB] Neon query failed, falling back to memory:", dbError?.message || dbError);
      // Return empty array on error
      return createMemoryVisitor({ sessionId, ownerName });
    }
  }

  return getMemoryQuery(options);
}

export async function countSubmissions(options: ListOptions = {}): Promise<number> {
  if (db) {
    try {
      const realDb = db as any;
      let query = realDb.select({ value: count() }).from(submissionsTable);

      if (options.type && options.sessionId) {
        query = query.where(
          and(eq(submissionsTable.type, options.type), eq(submissionsTable.sessionId, options.sessionId)),
        );
      } else if (options.type) {
        query = query.where(eq(submissionsTable.type, options.type));
      } else if (options.sessionId) {
        query = query.where(eq(submissionsTable.sessionId, options.sessionId));
      }

      const [{ value }] = await query;
      return Number(value);
    } catch (dbError: any) {
      console.error("[DB] Neon query failed, falling back to memory:", dbError?.message || dbError);
      // Return empty array on error
      return createMemoryVisitor({ sessionId, ownerName });
    }
  }

  return getMemoryQuery(options).length;
}

export async function getAllSubmissions(): Promise<schema.Submission[]> {
  if (db) {
    try {
      const realDb = db as any;
      return realDb.select().from(submissionsTable).orderBy(desc(submissionsTable.createdAt));
    } catch (dbError: any) {
      console.error("[DB] Neon query failed, falling back to memory:", dbError?.message || dbError);
      // Return empty array on error
      return createMemoryVisitor({ sessionId, ownerName });
    }
  }

  return store.submissions.slice().sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
}

// Visitors functions
function createMemoryVisitor(values: schema.InsertVisitor): schema.Visitor {
  const row: schema.Visitor = {
    id: store.nextVisitorId++,
    sessionId: values.sessionId,
    ownerName: values.ownerName ?? null,
    ipAddress: values.ipAddress ?? null,
    userAgent: values.userAgent ?? null,
    firstVisit: new Date(),
    lastVisit: new Date(),
    visitCount: 1,
  } as schema.Visitor;
  store.visitors.push(row);
  saveStore();
  return row;
}

export async function upsertVisitor(sessionId: string, ownerName?: string): Promise<schema.Visitor> {
  if (db) {
    try {
      const realDb = db as any;
      const existing = await realDb.select().from(schema.visitorsTable).where(eq(schema.visitorsTable.sessionId, sessionId));
      
      if (existing.length > 0) {
        const [updated] = await realDb
          .update(schema.visitorsTable)
          .set({ 
            lastVisit: new Date(),
            visitCount: existing[0].visitCount + 1,
            ...(ownerName ? { ownerName } : {}),
          })
          .where(eq(schema.visitorsTable.sessionId, sessionId))
          .returning();
        return updated;
      } else {
        const [inserted] = await realDb
          .insert(schema.visitorsTable)
          .values({
            sessionId,
            ownerName: ownerName ?? null,
          })
          .returning();
        return inserted;
      }
    } catch (dbError: any) {
      console.error("[DB] Neon query failed, falling back to memory:", dbError?.message || dbError);
      // Return empty array on error
      return createMemoryVisitor({ sessionId, ownerName });
    }
  }

  // Memory store fallback
  const existing = store.visitors.find(v => v.sessionId === sessionId);
  if (existing) {
    existing.lastVisit = new Date();
    existing.visitCount += 1;
    if (ownerName) existing.ownerName = ownerName;
    saveStore();
    return existing;
  }
  return createMemoryVisitor({ sessionId, ownerName });
}

export async function getAllVisitors(): Promise<schema.Visitor[]> {
  if (db) {
    try {
      const realDb = db as any;
      return await realDb.select().from(schema.visitorsTable).orderBy(desc(schema.visitorsTable.lastVisit));
    } catch (dbError: any) {
      console.error("[DB] Neon query failed, falling back to memory store:", dbError?.message || dbError);
      // Return empty array on error instead of crashing
      return [];
    }
  }

  return store.visitors.slice().sort((a, b) => b.lastVisit.getTime() - a.lastVisit.getTime());
}

export async function updateVisitorName(sessionId: string, ownerName: string): Promise<void> {
  if (db) {
    try {
      const realDb = db as any;
      await realDb
        .update(schema.visitorsTable)
        .set({ ownerName })
        .where(eq(schema.visitorsTable.sessionId, sessionId));
      return;
    } catch (dbError: any) {
      console.error("[DB] Neon query failed, falling back to memory:", dbError?.message || dbError);
      // Return empty array on error
      return createMemoryVisitor({ sessionId, ownerName });
    }
  }

  const visitor = store.visitors.find(v => v.sessionId === sessionId);
  if (visitor) {
    visitor.ownerName = ownerName;
    saveStore();
  }
}
