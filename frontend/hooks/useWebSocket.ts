import { useState, useEffect, useCallback, useRef } from 'react';
import { wsClient } from '../lib/websocket';
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
  const [status, setStatus] = useState<ConnectionStatus>(() => wsClient.getStatus());
  const onMessageRef = useRef(onMessage);

  useEffect(() => {
    onMessageRef.current = onMessage;
  }, [onMessage]);

  useEffect(() => {
    const unsubStatus = wsClient.addStatusListener((newStatus) => {
      setStatus(newStatus);
    });

    const unsubMsg = wsClient.addMessageListener((msg) => {
      if (onMessageRef.current) {
        onMessageRef.current(msg);
      }
    });

    // Automatically initiate connection if not already connecting/connected
    wsClient.connect(true);

    return () => {
      unsubStatus();
      unsubMsg();
    };
  }, []);

  const connectGlobal = useCallback(() => {
    wsClient.connect(true);
  }, []);

  const subscribeMatch = useCallback((matchId: string | number) => {
    wsClient.subscribeMatch(matchId);
  }, []);

  const unsubscribeMatch = useCallback((matchId: string | number) => {
    wsClient.unsubscribeMatch(matchId);
  }, []);

  const disconnect = useCallback(() => {
    wsClient.disconnect();
  }, []);

  return {
    status,
    connectGlobal,
    subscribeMatch,
    unsubscribeMatch,
    disconnect,
  };
};
