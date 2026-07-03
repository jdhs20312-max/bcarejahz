import { Router, type IRouter } from "express";
import { upsertVisitor, getAllVisitors, updateVisitorName, blockVisitor, unblockVisitor, isVisitorBlocked } from "@workspace/db";
import { extractToken, validateToken } from "../lib/auth";

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

function getClientIp(req: import("express").Request): string {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string") return forwarded.split(",")[0].trim();
  return req.socket.remoteAddress ?? "unknown";
}

// Check if visitor is blocked (public endpoint)
router.get("/visitors/:sessionId/blocked", async (req, res): Promise<void> => {
  try {
    const { sessionId } = req.params;
    const blocked = await isVisitorBlocked(sessionId);
    res.status(200).json({ blocked });
  } catch (error: any) {
    console.error("Error checking visitor block status:", error?.message || error);
    res.status(200).json({ blocked: false });
  }
});

// Track a new visitor or update existing
router.post("/visitors/track", async (req, res): Promise<void> => {
  try {
    const { sessionId, ownerName } = req.body;

    if (!sessionId) {
      res.status(400).json({ error: "sessionId is required" });
      return;
    }

    const visitor = await upsertVisitor(sessionId, ownerName);
    res.status(200).json({ success: true, visitor });
  } catch (error: any) {
    console.error("Error in /visitors/track:", error?.message || error);
    res.status(200).json({ success: false, visitor: null, error: "Visitor tracking unavailable" });
  }
});

// Get all visitors (for admin)
router.get("/visitors", async (_req, res): Promise<void> => {
  try {
    const visitors = await getAllVisitors();
    res.status(200).json({ visitors: visitors || [] });
  } catch (error: any) {
    console.error("Error in /visitors:", error?.message || error);
    res.status(200).json({ visitors: [] });
  }
});

// Update visitor name
router.patch("/visitors/:sessionId", async (req, res): Promise<void> => {
  try {
    const { sessionId } = req.params;
    const { ownerName } = req.body;

    if (!ownerName) {
      res.status(400).json({ error: "ownerName is required" });
      return;
    }

    await updateVisitorName(sessionId, ownerName);
    res.status(200).json({ success: true });
  } catch (error: any) {
    console.error("Error in /visitors/:sessionId:", error?.message || error);
    res.status(200).json({ success: false, error: "Update unavailable" });
  }
});

// Block a visitor (admin only)
router.post("/visitors/:sessionId/block", requireAuth, async (req, res): Promise<void> => {
  try {
    const rawSessionId = req.params.sessionId;
    const sessionId = Array.isArray(rawSessionId) ? rawSessionId[0] : rawSessionId;
    const success = await blockVisitor(sessionId);
    res.status(200).json({ success });
  } catch (error: any) {
    console.error("Error blocking visitor:", error?.message || error);
    res.status(200).json({ success: false, error: "Block unavailable" });
  }
});

// Unblock a visitor (admin only)
router.post("/visitors/:sessionId/unblock", requireAuth, async (req, res): Promise<void> => {
  try {
    const rawSessionId = req.params.sessionId;
    const sessionId = Array.isArray(rawSessionId) ? rawSessionId[0] : rawSessionId;
    const success = await unblockVisitor(sessionId);
    res.status(200).json({ success });
  } catch (error: any) {
    console.error("Error unblocking visitor:", error?.message || error);
    res.status(200).json({ success: false, error: "Unblock unavailable" });
  }
});

export default router;
