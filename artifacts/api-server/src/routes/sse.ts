import { Router, type IRouter, type Request, type Response } from "express";
import { registerClient, unregisterClient } from "../lib/sse-store";

const router: IRouter = Router();

// SSE endpoint for client to connect and receive real-time events
router.get("/sse/:sessionId", (req: Request, res: Response): void => {
  const raw = req.params.sessionId;
  const sessionId = Array.isArray(raw) ? raw[0] : raw;

  console.log(`[SSE] New connection request for session: ${sessionId}`);

  // Set SSE headers - CRITICAL for persistent connection
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no"); // For nginx/proxy
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Keep-Alive", "timeout=120"); // Longer timeout for proxies
  
  // Prevent Express from closing the connection
  req.socket.setTimeout(0);
  
  res.flushHeaders();

  // Send initial connection success event
  try {
    res.write(`event: connected\n`);
    res.write(`data: ${JSON.stringify({ sessionId, message: "Connected successfully" })}\n\n`);
  } catch (e) {
    console.error(`[SSE] Error sending connected event:`, e);
    return;
  }

  // Register this client
  registerClient(sessionId, res);

  // Heartbeat interval (every 20 seconds to keep connection alive through proxies)
  const heartbeatInterval = setInterval(() => {
    try {
      if (res.writable && !res.writable.destroyed) {
        res.write(`event: heartbeat\n`);
        res.write(`data: ${JSON.stringify({ timestamp: Date.now() })}\n\n`);
      } else {
        // Connection is dead, clean up
        console.log(`[SSE] Heartbeat: connection not writable for ${sessionId}`);
        clearInterval(heartbeatInterval);
        unregisterClient(sessionId, res);
      }
    } catch (e) {
      console.error(`[SSE] Heartbeat error for ${sessionId}:`, e);
      clearInterval(heartbeatInterval);
      unregisterClient(sessionId, res);
    }
  }, 20000);

  // Clean up on connection close
  req.on("close", () => {
    console.log(`[SSE] Connection closed (normal) for session: ${sessionId}`);
    clearInterval(heartbeatInterval);
    unregisterClient(sessionId, res);
  });

  req.on("error", (error) => {
    console.error(`[SSE] Connection error for session ${sessionId}:`, error);
    clearInterval(heartbeatInterval);
    unregisterClient(sessionId, res);
  });

  req.on("end", () => {
    console.log(`[SSE] Connection ended for session: ${sessionId}`);
    clearInterval(heartbeatInterval);
    unregisterClient(sessionId, res);
  });
});

export default router;
