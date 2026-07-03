import { Router, type IRouter } from "express";
import { updateSessionPage, getAllSessionInfo, getSessionInfo, getPageArabic } from "../lib/page-tracker";
import { isVisitorBlocked } from "@workspace/db";

const router: IRouter = Router();

function getSessionId(req: import("express").Request): string | null {
  const header = req.headers["x-session-id"];
  if (typeof header === "string") return header;
  return null;
}

async function checkBlockStatus(req: import("express").Request, res: import("express").Response): Promise<boolean> {
  const sessionId = getSessionId(req);
  if (!sessionId) return false;
  
  try {
    const blocked = await isVisitorBlocked(sessionId);
    if (blocked) {
      console.log(`[Block] Blocked visitor ${sessionId.substring(0, 8)}... tried to track page`);
      res.status(403).json({ error: "blocked", redirect: "/ban" });
      return true;
    }
  } catch (error) {
    console.warn("[Block] Error checking block status:", error);
  }
  return false;
}

// Update current page for a session (called when user navigates)
router.post("/track/page", async (req, res): Promise<void> => {
  if (await checkBlockStatus(req, res)) return;
  try {
    const { sessionId, page } = req.body as { sessionId?: string; page?: string };
    
    if (!sessionId || !page) {
      res.status(400).json({ error: "sessionId and page are required" });
      return;
    }
    
    const info = updateSessionPage(sessionId, page);
    res.json({ 
      success: true, 
      sessionId,
      page,
      pageArabic: getPageArabic(page)
    });
  } catch (error) {
    console.error("[Track] Error updating page:", error);
    res.status(500).json({ error: "Failed to update page" });
  }
});

// Get all active sessions with their current page
router.get("/track/sessions", async (_req, res): Promise<void> => {
  try {
    const sessions = getAllSessionInfo();
    const sessionsWithArabic = sessions.map(s => ({
      ...s,
      pageArabic: getPageArabic(s.currentPage),
      lastSeenAgo: Date.now() - s.lastSeen,
    }));
    
    res.json({ sessions: sessionsWithArabic });
  } catch (error) {
    console.error("[Track] Error fetching sessions:", error);
    res.status(500).json({ error: "Failed to fetch sessions" });
  }
});

// Get specific session info
router.get("/track/session/:sessionId", async (req, res): Promise<void> => {
  try {
    const raw = req.params.sessionId;
    const sessionId = Array.isArray(raw) ? raw[0] : raw;
    
    const info = getSessionInfo(sessionId);
    if (!info) {
      res.status(404).json({ error: "Session not found" });
      return;
    }
    
    res.json({
      ...info,
      pageArabic: getPageArabic(info.currentPage),
      lastSeenAgo: Date.now() - info.lastSeen,
    });
  } catch (error) {
    console.error("[Track] Error fetching session:", error);
    res.status(500).json({ error: "Failed to fetch session" });
  }
});

export default router;
