import { useEffect, useRef, useCallback, useState } from "react";

export interface SSEMessage {
  action: string;
  event?: string;
  code?: string;
  timestamp?: number;
}

export interface UseSSEOptions {
  sessionId: string;
  onControl?: (message: SSEMessage) => void;
  onConnected?: () => void;
  onDisconnected?: () => void;
  onError?: (error: Event) => void;
  reconnectDelay?: number;
}

export function useSSE(options: UseSSEOptions) {
  const {
    sessionId,
    onControl,
    onConnected,
    onDisconnected,
    onError,
    reconnectDelay = 3000,
  } = options;

  const [isConnected, setIsConnected] = useState(false);
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<number | null>(null);

  const connect = useCallback(() => {
    if (!sessionId || eventSourceRef.current) return;

    console.log("[useSSE] Connecting to SSE...");

    const apiUrl = import.meta.env.VITE_API_URL || "";
    const baseUrl = apiUrl || "";
    const sseUrl = `${baseUrl}/api/sse/${sessionId}`;

    const eventSource = new EventSource(sseUrl);
    eventSourceRef.current = eventSource;

    // Handle connection established
    eventSource.addEventListener("connected", (event) => {
      console.log("[useSSE] Connected:", event.data);
      setIsConnected(true);
      onConnected?.();
    });

    // Handle control events
    eventSource.addEventListener("control", (event) => {
      try {
        const message: SSEMessage = JSON.parse(event.data);
        console.log("[useSSE] Received control:", message);
        onControl?.(message);
      } catch (error) {
        console.error("[useSSE] Error parsing message:", error);
      }
    });

    // Handle errors
    eventSource.onerror = (error) => {
      console.error("[useSSE] Error:", error);
      setIsConnected(false);
      onError?.(error);

      // Close current connection
      eventSource.close();
      eventSourceRef.current = null;

      // Attempt to reconnect
      console.log(`[useSSE] Reconnecting in ${reconnectDelay}ms...`);
      reconnectTimeoutRef.current = window.setTimeout(() => {
        connect();
      }, reconnectDelay);
    };

    eventSource.onopen = () => {
      console.log("[useSSE] Connection opened");
      setIsConnected(true);
    };
  }, [sessionId, onControl, onConnected, onError, reconnectDelay]);

  // Connect on mount
  useEffect(() => {
    if (sessionId) {
      connect();
    }

    return () => {
      // Cleanup on unmount
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
      setIsConnected(false);
      onDisconnected?.();
    };
  }, [sessionId, connect, onDisconnected]);

  // Manual reconnect
  const reconnect = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    connect();
  }, [connect]);

  // Manual disconnect
  const disconnect = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    setIsConnected(false);
  }, []);

  return {
    isConnected,
    reconnect,
    disconnect,
  };
}
