import { Router, type IRouter } from "express";
import { upsertVisitor, getAllVisitors, updateVisitorName } from "@workspace/db";

const router: IRouter = Router();

function getClientIp(req: import("express").Request): string {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string") return forwarded.split(",")[0].trim();
  return req.socket.remoteAddress ?? "unknown";
}

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

export default router;
