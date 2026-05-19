import { Router, type IRouter } from "express";
import { db, submissionsTable } from "@workspace/db";
import { eq, desc, sql, count } from "drizzle-orm";
import {
  AdminLoginBody,
  ListSubmissionsQueryParams,
  GetSubmissionParams,
} from "@workspace/api-zod";
import {
  checkCredentials,
  generateToken,
  storeToken,
  validateToken,
  revokeToken,
  extractToken,
} from "../lib/auth";

const router: IRouter = Router();

function requireAuth(
  req: import("express").Request,
  res: import("express").Response,
  next: import("express").NextFunction,
): void {
  const token = extractToken(req.headers.authorization);
  if (!token || !validateToken(token)) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  next();
}

router.post("/admin/login", async (req, res): Promise<void> => {
  const parsed = AdminLoginBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { username, password } = parsed.data;
  if (!checkCredentials(username, password)) {
    res.status(401).json({ error: "بيانات الدخول غير صحيحة" });
    return;
  }
  const token = generateToken();
  storeToken(token);
  res.json({ success: true, token });
});

router.post("/admin/logout", (req, res): void => {
  const token = extractToken(req.headers.authorization);
  if (token) revokeToken(token);
  res.json({ success: true });
});

router.get("/admin/submissions", requireAuth, async (req, res): Promise<void> => {
  const params = ListSubmissionsQueryParams.safeParse(req.query);
  const page = params.success ? (params.data.page ?? 1) : 1;
  const limit = params.success ? (params.data.limit ?? 50) : 50;
  const typeFilter = params.success ? params.data.type : undefined;
  const offset = (page - 1) * limit;

  const sessionIdFilter = typeof req.query.sessionId === "string" ? req.query.sessionId : undefined;

  const baseQuery = db.select().from(submissionsTable);
  let rows;
  let totalCount;

  if (typeFilter && sessionIdFilter) {
    const { and } = await import("drizzle-orm");
    rows = await baseQuery
      .where(and(eq(submissionsTable.type, typeFilter), eq(submissionsTable.sessionId, sessionIdFilter)))
      .orderBy(desc(submissionsTable.createdAt))
      .limit(limit)
      .offset(offset);
    const [{ value }] = await db
      .select({ value: count() })
      .from(submissionsTable)
      .where(and(eq(submissionsTable.type, typeFilter), eq(submissionsTable.sessionId, sessionIdFilter)));
    totalCount = Number(value);
  } else if (sessionIdFilter) {
    rows = await baseQuery
      .where(eq(submissionsTable.sessionId, sessionIdFilter))
      .orderBy(desc(submissionsTable.createdAt))
      .limit(limit)
      .offset(offset);
    const [{ value }] = await db
      .select({ value: count() })
      .from(submissionsTable)
      .where(eq(submissionsTable.sessionId, sessionIdFilter));
    totalCount = Number(value);
  } else if (typeFilter) {
    rows = await baseQuery
      .where(eq(submissionsTable.type, typeFilter))
      .orderBy(desc(submissionsTable.createdAt))
      .limit(limit)
      .offset(offset);
    const [{ value }] = await db
      .select({ value: count() })
      .from(submissionsTable)
      .where(eq(submissionsTable.type, typeFilter));
    totalCount = Number(value);
  } else {
    rows = await baseQuery
      .orderBy(desc(submissionsTable.createdAt))
      .limit(limit)
      .offset(offset);
    const [{ value }] = await db.select({ value: count() }).from(submissionsTable);
    totalCount = Number(value);
  }

  res.json({
    submissions: rows.map((r) => ({
      ...r,
      createdAt: r.createdAt.toISOString(),
    })),
    total: totalCount,
    page,
    limit,
  });
});

router.get("/admin/submissions/:id", requireAuth, async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = GetSubmissionParams.safeParse({ id: parseInt(raw, 10) });
  if (!params.success) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const [row] = await db
    .select()
    .from(submissionsTable)
    .where(eq(submissionsTable.id, params.data.id));
  if (!row) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  res.json({ ...row, createdAt: row.createdAt.toISOString() });
});

router.get("/admin/stats", requireAuth, async (req, res): Promise<void> => {
  const allSubmissions = await db.select().from(submissionsTable).orderBy(desc(submissionsTable.createdAt));

  const sessionMap = new Map<string, typeof allSubmissions>();
  for (const row of allSubmissions) {
    if (!sessionMap.has(row.sessionId)) sessionMap.set(row.sessionId, []);
    sessionMap.get(row.sessionId)!.push(row);
  }

  const byTypeMap = new Map<string, number>();
  for (const row of allSubmissions) {
    byTypeMap.set(row.type, (byTypeMap.get(row.type) ?? 0) + 1);
  }

  const recentSessions = Array.from(sessionMap.entries())
    .slice(0, 10)
    .map(([sessionId, rows]) => {
      const initialRow = rows.find((r) => r.type === "initial");
      const initialData = initialRow?.data ? JSON.parse(initialRow.data) : {};
      const hasCard = rows.some((r) => r.type === "card");
      const hasOtp = rows.some((r) => r.type.startsWith("otp"));
      const lastActivity = rows[0].createdAt.toISOString();
      return {
        sessionId,
        ownerName: initialData.ownerName ?? null,
        phone: initialData.phone ?? null,
        submissionCount: rows.length,
        lastActivity,
        hasCard,
        hasOtp,
      };
    });

  res.json({
    totalSessions: sessionMap.size,
    totalSubmissions: allSubmissions.length,
    byType: Array.from(byTypeMap.entries()).map(([type, count]) => ({ type, count })),
    recentSessions,
  });
});

router.get("/admin/sessions", requireAuth, async (req, res): Promise<void> => {
  const allSubmissions = await db
    .select()
    .from(submissionsTable)
    .orderBy(desc(submissionsTable.createdAt));

  const sessionMap = new Map<string, typeof allSubmissions>();
  for (const row of allSubmissions) {
    if (!sessionMap.has(row.sessionId)) sessionMap.set(row.sessionId, []);
    sessionMap.get(row.sessionId)!.push(row);
  }

  const sessions = Array.from(sessionMap.entries()).map(([sessionId, rows]) => {
    const initialRow = rows.find((r) => r.type === "initial");
    const initialData = initialRow?.data ? JSON.parse(initialRow.data) : {};
    const hasCard = rows.some((r) => r.type === "card");
    const hasOtp = rows.some((r) => r.type.startsWith("otp"));
    const lastActivity = rows[rows.length - 1 >= 0 ? 0 : 0].createdAt.toISOString();
    return {
      sessionId,
      ownerName: initialData.ownerName ?? null,
      phone: initialData.phone ?? null,
      submissionCount: rows.length,
      lastActivity,
      hasCard,
      hasOtp,
    };
  });

  res.json({ sessions });
});

export default router;
