import type { Response } from "express";

export interface SSEMessage {
  event: string;
  data: string;
  id?: string;
}

// Store all connected clients with metadata
interface ClientInfo {
  response: Response;
  connectedAt: number;
  lastActivity: number;
}

const clients = new Map<string, Set<ClientInfo>>();

// Register a new client connection
export function registerClient(sessionId: string, response: Response): void {
  if (!clients.has(sessionId)) {
    clients.set(sessionId, new Set());
  }
  
  const clientInfo: ClientInfo = {
    response,
    connectedAt: Date.now(),
    lastActivity: Date.now(),
  };
  
  clients.get(sessionId)!.add(clientInfo);
  console.log(`[SSE Store] Client connected: ${sessionId} (total: ${getSessionClientCount(sessionId)})`);
}

// Unregister a client connection
export function unregisterClient(sessionId: string, response: Response): void {
  const sessionClients = clients.get(sessionId);
  if (sessionClients) {
    // Find and remove the specific client
    for (const clientInfo of sessionClients) {
      if (clientInfo.response === response) {
        sessionClients.delete(clientInfo);
        break;
      }
    }
    
    if (sessionClients.size === 0) {
      clients.delete(sessionId);
    }
    console.log(`[SSE Store] Client disconnected: ${sessionId} (remaining: ${getSessionClientCount(sessionId)})`);
  }
}

// Get number of connected clients for a session
export function getSessionClientCount(sessionId: string): number {
  return clients.get(sessionId)?.size ?? 0;
}

// Check if a session has any connected clients
export function hasConnectedClients(sessionId: string): boolean {
  return getSessionClientCount(sessionId) > 0;
}

// Send an SSE event to all clients of a specific session
export function sendSSEMessage(sessionId: string, event: string, data: object | string): void {
  const sessionClients = clients.get(sessionId);
  if (!sessionClients || sessionClients.size === 0) {
    console.log(`[SSE Store] No clients connected for session: ${sessionId}`);
    return;
  }

  const messageId = Date.now().toString();
  const dataStr = typeof data === 'string' ? data : JSON.stringify(data);
  
  console.log(`[SSE Store] Sending "${event}" to session ${sessionId} (clients: ${sessionClients.size})`);
  console.log(`[SSE Store] Data: ${dataStr.substring(0, 100)}${dataStr.length > 100 ? '...' : ''}`);

  // Remove dead connections and send to alive ones
  const deadClients: ClientInfo[] = [];
  
  for (const clientInfo of sessionClients) {
    try {
      // Check if connection is still alive
      if (clientInfo.response.writable && !clientInfo.response.writable.destroyed) {
        const formattedMessage = formatSSEMessage({ event, data: dataStr, id: messageId });
        clientInfo.response.write(formattedMessage);
        clientInfo.lastActivity = Date.now();
      } else {
        deadClients.push(clientInfo);
      }
    } catch (error) {
      console.error(`[SSE Store] Error sending to client:`, error);
      deadClients.push(clientInfo);
    }
  }

  // Clean up dead clients
  for (const deadClient of deadClients) {
    sessionClients.delete(deadClient);
  }
  
  if (deadClients.length > 0) {
    console.log(`[SSE Store] Cleaned up ${deadClients.length} dead connections`);
  }
}

// Format SSE message according to spec
function formatSSEMessage(message: SSEMessage): string {
  let result = "";
  if (message.id) {
    result += `id: ${message.id}\n`;
  }
  if (message.event) {
    result += `event: ${message.event}\n`;
  }
  result += `data: ${message.data}\n\n`;
  return result;
}

// Get total number of connected clients
export function getTotalClientCount(): number {
  let total = 0;
  for (const sessionClients of clients.values()) {
    total += sessionClients.size;
  }
  return total;
}

// Get all active session IDs
export function getActiveSessions(): string[] {
  return Array.from(clients.keys());
}

// Clean up all connections (for shutdown)
export function cleanupAll(): void {
  console.log(`[SSE Store] Cleaning up ${getTotalClientCount()} connections`);
  for (const [sessionId, sessionClients] of clients) {
    for (const clientInfo of sessionClients) {
      try {
        clientInfo.response.end();
      } catch (error) {
        // Ignore
      }
    }
  }
  clients.clear();
}
