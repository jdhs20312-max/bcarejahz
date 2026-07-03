import express, { type Express } from "express";
import cors from "cors";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pinoHttp from "pino-http";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import router from "./routes";
import { logger } from "./lib/logger";
import { sessionAuthMiddleware } from "./middleware/auth.middleware";
import { cleanExpiredTokens } from "./lib/auth";

const app: Express = express();
const uiDist = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "phishing-pages", "dist");
const hasUiDist = fs.existsSync(uiDist);

// Security headers with helmet
app.use(helmet());

// Remove x-powered-by header
app.disable("x-powered-by");

// CORS configuration with environment variable support
const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(",").map((o) => o.trim()) || [];
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) {
        return callback(null, true);
      }
      if (allowedOrigins.length === 0 || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      callback(new Error("Not allowed from this origin"));
    },
    credentials: true,
  })
);

// Rate limiting for login - 5 attempts per 15 minutes
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { error: "Too many login attempts, try again after 15 minutes" },
  standardHeaders: true,
  legacyHeaders: false,
});

// Rate limiting for general API - 500 requests per minute
const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 500,
  message: { error: "Too many requests, try again later" },
  standardHeaders: true,
  legacyHeaders: false,
});

// Apply rate limiters to specific routes
app.use("/api/admin/login", loginLimiter);
app.use("/api/", apiLimiter);

// HTTPS redirect in production
if (process.env.NODE_ENV === "production") {
  app.use((req, res, next) => {
    if (req.secure || req.headers["x-forwarded-proto"] === "https") {
      return next();
    }
    res.redirect(`https://${req.hostname}${req.url}`);
  });
}

// Periodic token cleanup - every hour
setInterval(cleanExpiredTokens, 60 * 60 * 1000);

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Apply session-based access control middleware for protected routes
app.use(sessionAuthMiddleware);

// Global error handler - prevents unhandled errors from crashing the server
app.use((err: Error, req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error("[Global Error Handler] Unhandled error:", err);
  res.status(500).json({
    error: "Internal server error",
  });
});

app.use("/api", router);

if (hasUiDist) {
  app.use(express.static(uiDist));
  app.use((req, res, next) => {
    if (req.method === "GET" && !req.path.startsWith("/api")) {
      return res.sendFile(path.join(uiDist, "index.html"));
    }
    next();
  });
}

export default app;
