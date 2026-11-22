import { useState, useEffect, useRef, useCallback } from 'react';
import { WS_BASE_URL, INITIAL_RECONNECT_DELAY, MAX_RECONNECT_DELAY } from '../constants';
import { ConnectionStatus, WSMessage } from '../types';

interface UseWebSocketReturn {
  status: ConnectionStatus;
  connectGlobal: () => void;
  subscribeMatch: (matchId: string | number) => void;
  unsubscribeMatch: (matchId: string | number) => void;
  disconnect: () => void;
}

export const useWebSocket = (
  onMessage: (msg: WSMessage) => void
): UseWebSocketReturn => {
  const [status, setStatus] = useState<ConnectionStatus>('disconnected');
  
  const ws = useRef<WebSocket | null>(null);
  const reconnectTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectAttempts = useRef(0);
  const isIntentionalClose = useRef(false);
  const isUnmounted = useRef(false);
  const subscribedMatchIdsRef = useRef<Set<string>>(new Set<string>());
  const onMessageRef = useRef(onMessage);

  useEffect(() => {
    onMessageRef.current = onMessage;
  }, [onMessage]);

  const normalizeId = (matchId: string | number) => String(matchId);

  const sendMessage = useCallback((message: WSMessage | Record<string, unknown>) => {
    if (ws.current && ws.current.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify(message));
    }
  }, []);

  // Cleanup helper to safely close a socket without triggering its close/error listeners
  const cleanupCurrentSocket = useCallback((code = 1000, reason = "Normal closure") => {
    if (ws.current) {
      const socket = ws.current;
      ws.current = null;
      socket.onmessage = null;
      socket.onerror = null;
      socket.onclose = null;

      try {
        if (socket.readyState === WebSocket.OPEN) {
          socket.close(code, reason);
        } else if (socket.readyState === WebSocket.CONNECTING) {
          // Defer closing until after the handshake completes.
          // This avoids the browser's console warning:
          // "WebSocket is closed before the connection is established"
          socket.onopen = () => {
            try {
              socket.close(code, reason);
            } catch {
              // Ignore
            }
          };
        }
      } catch {
        // Ignore closing errors on already closed socket
      }
    }
  }, []);

  // Core connect function
  const initConnection = useCallback(() => {
    if (isUnmounted.current) return;

    // Clear any pending reconnect timers
    if (reconnectTimeout.current) {
      clearTimeout(reconnectTimeout.current);
      reconnectTimeout.current = null;
    }

    // Do not reconnect if already open or connecting
    if (ws.current && (ws.current.readyState === WebSocket.OPEN || ws.current.readyState === WebSocket.CONNECTING)) {
      return;
    }

    // Safely cleanup previous socket if any
    cleanupCurrentSocket(1000, "Reconnecting");

    setStatus(reconnectAttempts.current > 0 ? 'reconnecting' : 'connecting');
    isIntentionalClose.current = false;

    // Construct URL
    const socketUrl = `${WS_BASE_URL}?all=1`;
    
    try {
      const socket = new WebSocket(socketUrl);
      ws.current = socket;

      socket.onopen = () => {
        if (isUnmounted.current || ws.current !== socket) return;
        setStatus('connected');
        reconnectAttempts.current = 0;
        if (subscribedMatchIdsRef.current.size > 0) {
          subscribedMatchIdsRef.current.forEach((id) => {
            const num = Number(id);
            socket.send(JSON.stringify({
              type: 'subscribe',
              matchId: Number.isInteger(num) ? num : id,
            }));
          });
        }
        console.log('[WebSocket] Connected successfully');
      };

      socket.onmessage = (event) => {
        if (isUnmounted.current || ws.current !== socket) return;
        try {
          const data = JSON.parse(event.data);
          onMessageRef.current(data);
        } catch (e) {
          console.error('[WebSocket] Failed to parse message:', e);
        }
      };

      socket.onerror = () => {
        if (isUnmounted.current || ws.current !== socket) return;
        console.warn('[WebSocket] Connection error occurred');
        if (socket.readyState === WebSocket.OPEN) {
          setStatus('error');
        }
      };

      socket.onclose = (event) => {
        if (isUnmounted.current || ws.current !== socket || isIntentionalClose.current) {
          setStatus('disconnected');
          return;
        }

        setStatus('disconnected');
        
        // Exponential backoff for real reconnection attempts
        const delay = Math.min(
          INITIAL_RECONNECT_DELAY * (2 ** reconnectAttempts.current),
          MAX_RECONNECT_DELAY
        );
        
        console.log(`[WebSocket] Disconnected (Code: ${event.code}). Reconnecting in ${delay}ms...`);
        
        reconnectTimeout.current = setTimeout(() => {
          if (!isUnmounted.current) {
            reconnectAttempts.current += 1;
            initConnection();
          }
        }, delay);
      };

    } catch (e) {
      console.error('[WebSocket] Connection creation failed:', e);
      setStatus('error');
    }
  }, [cleanupCurrentSocket]);

  // Public connect method
  const connectGlobal = useCallback(() => {
    if (isUnmounted.current) return;
    if (reconnectTimeout.current) {
      clearTimeout(reconnectTimeout.current);
      reconnectTimeout.current = null;
    }
    reconnectAttempts.current = 0;
    if (ws.current && (ws.current.readyState === WebSocket.OPEN || ws.current.readyState === WebSocket.CONNECTING)) {
      return;
    }
    initConnection();
  }, [initConnection]);

  const subscribeMatch = useCallback((matchId: string | number) => {
    const normalized = normalizeId(matchId);
    subscribedMatchIdsRef.current.add(normalized);
    const idNum = Number(matchId);
    sendMessage({ type: 'subscribe', matchId: Number.isInteger(idNum) ? idNum : matchId });
  }, [sendMessage]);

  const unsubscribeMatch = useCallback((matchId: string | number) => {
    const normalized = normalizeId(matchId);
    subscribedMatchIdsRef.current.delete(normalized);
    const idNum = Number(matchId);
    sendMessage({ type: 'unsubscribe', matchId: Number.isInteger(idNum) ? idNum : matchId });
  }, [sendMessage]);

  // Public disconnect method
  const disconnect = useCallback(() => {
    isIntentionalClose.current = true;
    if (reconnectTimeout.current) {
      clearTimeout(reconnectTimeout.current);
      reconnectTimeout.current = null;
    }
    cleanupCurrentSocket(1000, "User disconnected");
    setStatus('disconnected');
  }, [cleanupCurrentSocket]);

  // Cleanup on unmount
  useEffect(() => {
    isUnmounted.current = false;
    return () => {
      isUnmounted.current = true;
      isIntentionalClose.current = true;
      if (reconnectTimeout.current) {
        clearTimeout(reconnectTimeout.current);
        reconnectTimeout.current = null;
      }
      cleanupCurrentSocket(1000, "Component unmounted");
    };
  }, [cleanupCurrentSocket]);

  return { status, connectGlobal, subscribeMatch, unsubscribeMatch, disconnect };
};
