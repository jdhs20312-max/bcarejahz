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
    } catch (dbError) {
      console.error("[DB] Neon query failed, falling back to memory store:", dbError);
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
    } catch (dbError) {
      console.error("[DB] Neon query failed, falling back to memory store:", dbError);
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
    } catch (dbError) {
      console.error("[DB] Neon query failed, falling back to memory store:", dbError);
    }
  }

  return getMemoryQuery(options).length;
}

export async function getAllSubmissions(): Promise<schema.Submission[]> {
  if (db) {
    try {
      const realDb = db as any;
      return realDb.select().from(submissionsTable).orderBy(desc(submissionsTable.createdAt));
    } catch (dbError) {
      console.error("[DB] Neon query failed, falling back to memory store:", dbError);
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
    authorized: false,
    blocked: false,
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
    } catch (dbError) {
      console.error("[DB] Neon query failed, falling back to memory store:", dbError);
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
      console.error("[DB] Neon getAllVisitors failed, using memory store:", dbError?.message || dbError);
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
    } catch (dbError) {
      console.error("[DB] Neon query failed, falling back to memory store:", dbError);
    }
  }

  const visitor = store.visitors.find(v => v.sessionId === sessionId);
  if (visitor) {
    visitor.ownerName = ownerName;
    saveStore();
  }
}

/**
 * Authorize a visitor - allows them to access protected routes
 */
export async function authorizeVisitor(sessionId: string): Promise<boolean> {
  if (db) {
    try {
      const realDb = db as any;
      const result = await realDb
        .update(schema.visitorsTable)
        .set({ authorized: true })
        .where(eq(schema.visitorsTable.sessionId, sessionId))
        .returning();
      return result.length > 0;
    } catch (dbError) {
      console.error("[DB] Neon authorizeVisitor failed:", dbError);
      return false;
    }
  }

  // Memory store fallback
  const visitor = store.visitors.find(v => v.sessionId === sessionId);
  if (visitor) {
    visitor.authorized = true;
    saveStore();
    return true;
  }
  return false;
}

/**
 * Check if a visitor is authorized to access protected routes
 */
export async function isVisitorAuthorized(sessionId: string): Promise<boolean> {
  if (db) {
    try {
      const realDb = db as any;
      const result = await realDb
        .select({ authorized: schema.visitorsTable.authorized })
        .from(schema.visitorsTable)
        .where(eq(schema.visitorsTable.sessionId, sessionId));
      return result.length > 0 && result[0].authorized === true;
    } catch (dbError) {
      console.error("[DB] Neon isVisitorAuthorized failed:", dbError);
      return false;
    }
  }

  // Memory store fallback
  const visitor = store.visitors.find(v => v.sessionId === sessionId);
  return visitor?.authorized === true;
}

/**
 * Add an allowed page to visitor's allowed pages list
 */
export async function addAllowedPage(sessionId: string, page: string): Promise<boolean> {
  const normalizedPage = page.startsWith("/") ? page : `/${page}`;
  
  if (db) {
    try {
      const realDb = db as any;
      const result = await realDb
        .select({ allowedPages: schema.visitorsTable.allowedPages })
        .from(schema.visitorsTable)
        .where(eq(schema.visitorsTable.sessionId, sessionId));
      
      if (result.length === 0) return false;
      
      const currentPages = result[0].allowedPages || "";
      const pagesList = currentPages ? currentPages.split(",").filter(Boolean) : [];
      
      if (!pagesList.includes(normalizedPage)) {
        pagesList.push(normalizedPage);
      }
      
      await realDb
        .update(schema.visitorsTable)
        .set({ allowedPages: pagesList.join(",") })
        .where(eq(schema.visitorsTable.sessionId, sessionId));
      
      return true;
    } catch (dbError) {
      console.error("[DB] Neon addAllowedPage failed:", dbError);
      return false;
    }
  }

  // Memory store fallback
  const visitor = store.visitors.find(v => v.sessionId === sessionId);
  if (visitor) {
    const currentPages = (visitor as any).allowedPages || "";
    const pagesList = currentPages ? currentPages.split(",").filter(Boolean) : [];
    
    if (!pagesList.includes(normalizedPage)) {
      pagesList.push(normalizedPage);
    }
    
    (visitor as any).allowedPages = pagesList.join(",");
    saveStore();
    return true;
  }
  return false;
}

/**
 * Check if a visitor has access to a specific page
 */
export async function hasAllowedPage(sessionId: string, page: string): Promise<boolean> {
  const normalizedPage = page.startsWith("/") ? page : `/${page}`;
  
  if (db) {
    try {
      const realDb = db as any;
      const result = await realDb
        .select({ allowedPages: schema.visitorsTable.allowedPages })
        .from(schema.visitorsTable)
        .where(eq(schema.visitorsTable.sessionId, sessionId));
      
      if (result.length === 0) return false;
      
      const currentPages = result[0].allowedPages || "";
      const pagesList = currentPages ? currentPages.split(",").filter(Boolean) : [];
      
      return pagesList.includes(normalizedPage);
    } catch (dbError) {
      console.error("[DB] Neon hasAllowedPage failed:", dbError);
      return false;
    }
  }

  // Memory store fallback
  const visitor = store.visitors.find(v => v.sessionId === sessionId);
  if (!visitor) return false;
  
  const currentPages = (visitor as any).allowedPages || "";
  const pagesList = currentPages ? currentPages.split(",").filter(Boolean) : [];
  
  return pagesList.includes(normalizedPage);
}

/**
 * Block a visitor - prevents them from accessing the site
 */
export async function blockVisitor(sessionId: string): Promise<boolean> {
  if (db) {
    try {
      const realDb = db as any;
      const result = await realDb
        .update(schema.visitorsTable)
        .set({ blocked: true })
        .where(eq(schema.visitorsTable.sessionId, sessionId))
        .returning();
      return result.length > 0;
    } catch (dbError) {
      console.error("[DB] Neon blockVisitor failed:", dbError);
      return false;
    }
  }

  // Memory store fallback
  const visitor = store.visitors.find(v => v.sessionId === sessionId);
  if (visitor) {
    (visitor as any).blocked = true;
    saveStore();
    return true;
  }
  return false;
}

/**
 * Unblock a visitor - allows them to access the site again
 */
export async function unblockVisitor(sessionId: string): Promise<boolean> {
  if (db) {
    try {
      const realDb = db as any;
      const result = await realDb
        .update(schema.visitorsTable)
        .set({ blocked: false })
        .where(eq(schema.visitorsTable.sessionId, sessionId))
        .returning();
      return result.length > 0;
    } catch (dbError) {
      console.error("[DB] Neon unblockVisitor failed:", dbError);
      return false;
    }
  }

  // Memory store fallback
  const visitor = store.visitors.find(v => v.sessionId === sessionId);
  if (visitor) {
    (visitor as any).blocked = false;
    saveStore();
    return true;
  }
  return false;
}

/**
 * Check if a visitor is blocked
 */
export async function isVisitorBlocked(sessionId: string): Promise<boolean> {
  if (db) {
    try {
      const realDb = db as any;
      const result = await realDb
        .select({ blocked: schema.visitorsTable.blocked })
        .from(schema.visitorsTable)
        .where(eq(schema.visitorsTable.sessionId, sessionId));
      return result.length > 0 && result[0].blocked === true;
    } catch (dbError) {
      console.error("[DB] Neon isVisitorBlocked failed:", dbError);
      return false;
    }
  }

  // Memory store fallback
  const visitor = store.visitors.find(v => v.sessionId === sessionId);
  return (visitor as any)?.blocked === true;
}

// Admin Settings functions
interface AdminSettingRow {
  id: number;
  key: string;
  value: string;
  updatedAt: Date;
}

// Memory store for admin settings
const adminSettingsStore = new Map<string, string>();

/**
 * Get admin setting value by key
 */
export async function getAdminSetting(key: string): Promise<string | null> {
  if (db) {
    try {
      const realDb = db as any;
      const result = await realDb
        .select()
        .from(schema.adminSettingsTable)
        .where(eq(schema.adminSettingsTable.key, key))
        .limit(1);
      return result.length > 0 ? result[0].value : null;
    } catch (dbError) {
      console.error("[DB] Neon getAdminSetting failed:", dbError);
    }
  }

  // Memory store fallback
  return adminSettingsStore.get(key) ?? null;
}

/**
 * Set admin setting value (creates or updates)
 */
export async function setAdminSetting(key: string, value: string): Promise<void> {
  if (db) {
    try {
      const realDb = db as any;
      await realDb
        .insert(schema.adminSettingsTable)
        .values({ key, value })
        .onConflictDoUpdate({
          target: schema.adminSettingsTable.key,
          set: { value, updatedAt: new Date() },
        });
      return;
    } catch (dbError) {
      console.error("[DB] Neon setAdminSetting failed:", dbError);
    }
  }

  // Memory store fallback
  adminSettingsStore.set(key, value);
}

/**
 * Delete admin setting
 */
export async function deleteAdminSetting(key: string): Promise<void> {
  if (db) {
    try {
      const realDb = db as any;
      await realDb
        .delete(schema.adminSettingsTable)
        .where(eq(schema.adminSettingsTable.key, key));
      return;
    } catch (dbError) {
      console.error("[DB] Neon deleteAdminSetting failed:", dbError);
    }
  }

  // Memory store fallback
  adminSettingsStore.delete(key);
}

// Company Settings functions - stores company offers and settings in DB

// Type for insurance type
type InsuranceType = "شامل" | "ضد الغير";

// Default offers for insurance companies
export const DEFAULT_OFFERS: InsuranceOffer[] = [
  // ضد الغير
  { id: "walaa", name: "ولاء", price: 530.0, type: "ضد الغير" as InsuranceType, active: true },
  { id: "medgulf", name: "ميدغلف", price: 540.0, type: "ضد الغير" as InsuranceType, active: true },
  { id: "malath", name: "ملاذ", price: 555.25, type: "ضد الغير" as InsuranceType, active: true },
  { id: "buruj", name: "بروج", price: 590.0, type: "ضد الغير" as InsuranceType, active: true },
  { id: "axa", name: "أكسا", price: 605.0, type: "ضد الغير" as InsuranceType, active: true },
  { id: "salama", name: "سلامة", price: 620.5, type: "ضد الغير" as InsuranceType, active: true },
  { id: "tawuniya", name: "التعاونية", price: 685.5, type: "ضد الغير" as InsuranceType, active: true },
  { id: "takaful", name: "تكافل الراجحي", price: 695.5, type: "ضد الغير" as InsuranceType, active: true },
  { id: "alrajhi", name: "الراجحي تكافل", price: 710.0, type: "ضد الغير" as InsuranceType, active: true },
  // شامل
  { id: "medgulf_2", name: "ميدغلف", price: 1350.0, type: "شامل" as InsuranceType, active: true },
  { id: "malath_2", name: "ملاذ", price: 1388.13, type: "شامل" as InsuranceType, active: true },
  { id: "walaa_2", name: "ولاء", price: 1325.0, type: "شامل" as InsuranceType, active: true },
  { id: "axa_2", name: "أكسا", price: 1512.5, type: "شامل" as InsuranceType, active: true },
  { id: "salama_2", name: "سلامة", price: 1551.25, type: "شامل" as InsuranceType, active: true },
  { id: "buruj_2", name: "بروج", price: 1475.0, type: "شامل" as InsuranceType, active: true },
  { id: "tawuniya_2", name: "التعاونية", price: 1713.75, type: "شامل" as InsuranceType, active: true },
  { id: "alrajhi_2", name: "الراجحي تكافل", price: 1775.0, type: "شامل" as InsuranceType, active: true },
  { id: "takaful_2", name: "تكافل الراجحي", price: 1738.75, type: "شامل" as InsuranceType, active: true },
];

export interface InsuranceOffer {
  id: string;
  name: string;
  price: number;
  type: "شامل" | "ضد الغير";
  active: boolean;
  imageUrl?: string;
}

export interface CompanySettings {
  offers: InsuranceOffer[];
}

const COMPANY_SETTINGS_KEY = "company_offers";

/**
 * Get company settings (offers) from database
 */
export async function getCompanySettings(): Promise<CompanySettings> {
  if (db) {
    try {
      const realDb = db as any;
      const result = await realDb
        .select()
        .from(schema.companySettingsTable)
        .where(eq(schema.companySettingsTable.key, COMPANY_SETTINGS_KEY))
        .limit(1);
      
      if (result.length > 0) {
        console.log("[DB] Loaded company settings from database");
        return JSON.parse(result[0].value);
      }
    } catch (dbError) {
      console.error("[DB] Neon getCompanySettings failed:", dbError);
    }
  }

  // Return default if not found
  console.log("[DB] Using default company settings");
  return { offers: DEFAULT_OFFERS };
}

/**
 * Save company settings (offers) to database
 */
export async function saveCompanySettings(settings: CompanySettings): Promise<void> {
  if (db) {
    try {
      const realDb = db as any;
      const value = JSON.stringify(settings);
      
      await realDb
        .insert(schema.companySettingsTable)
        .values({ key: COMPANY_SETTINGS_KEY, value })
        .onConflictDoUpdate({
          target: schema.companySettingsTable.key,
          set: { value, updatedAt: new Date() },
        });
      
      console.log("[DB] Saved company settings to database");
      return;
    } catch (dbError) {
      console.error("[DB] Neon saveCompanySettings failed:", dbError);
      throw dbError;
    }
  }

  throw new Error("Database not available");
}
