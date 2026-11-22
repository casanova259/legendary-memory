import {
  WS_BASE_URL,
  INITIAL_RECONNECT_DELAY,
  MAX_RECONNECT_DELAY,
} from '../../constants.ts';
import type { ConnectionStatus, WSMessage } from '../../types.ts';

export type WSMessageListener = (msg: WSMessage) => void;
export type WSStatusListener = (status: ConnectionStatus) => void;

export class WebSocketClient {
  private url: string;
  private ws: WebSocket | null = null;
  private status: ConnectionStatus = 'disconnected';
  private reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
  private reconnectDelay = INITIAL_RECONNECT_DELAY;
  private isExplicitlyClosed = false;
  private subscribedMatches = new Set<string>();
  private isSubscribedAll = false;
  private messageListeners = new Set<WSMessageListener>();
  private statusListeners = new Set<WSStatusListener>();
  private pingInterval: ReturnType<typeof setInterval> | null = null;

  constructor(url: string = WS_BASE_URL) {
    this.url = url;
  }

  public getStatus(): ConnectionStatus {
    return this.status;
  }

  private setStatus(newStatus: ConnectionStatus) {
    if (this.status !== newStatus) {
      this.status = newStatus;
      this.statusListeners.forEach((listener) => {
        try {
          listener(newStatus);
        } catch (err) {
          console.error('Error in WS status listener:', err);
        }
      });
    }
  }

  public addMessageListener(listener: WSMessageListener): () => void {
    this.messageListeners.add(listener);
    return () => {
      this.messageListeners.delete(listener);
    };
  }

  public addStatusListener(listener: WSStatusListener): () => void {
    this.statusListeners.add(listener);
    listener(this.status);
    return () => {
      this.statusListeners.delete(listener);
    };
  }

  public connect(subscribeAll = true) {
    this.isExplicitlyClosed = false;
    this.isSubscribedAll = subscribeAll;

    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return;
    }

    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    this.setStatus(this.reconnectDelay > INITIAL_RECONNECT_DELAY ? 'reconnecting' : 'connecting');

    const connectUrl = subscribeAll
      ? `${this.url.includes('?') ? this.url : `${this.url}?all=1`}`
      : this.url;

    try {
      const socket = new WebSocket(connectUrl);
      this.ws = socket;

      socket.onopen = () => {
        if (this.ws !== socket) return;
        this.setStatus('connected');
        this.reconnectDelay = INITIAL_RECONNECT_DELAY;

        // Resubscribe to matches
        this.subscribedMatches.forEach((matchId) => {
          this.send({ type: 'subscribe', matchId });
        });

        // Setup ping keepalive
        this.startPingKeepalive();
      };

      socket.onmessage = (event) => {
        if (this.ws !== socket) return;

        try {
          const parsed = JSON.parse(event.data) as WSMessage;
          this.messageListeners.forEach((listener) => {
            try {
              listener(parsed);
            } catch (err) {
              console.error('Error in WS message listener:', err);
            }
          });
        } catch {
          // Ignore malformed JSON packets safely
        }
      };

      socket.onerror = () => {
        if (this.ws !== socket) return;
        this.setStatus('error');
      };

      socket.onclose = () => {
        if (this.ws !== socket) return;
        this.stopPingKeepalive();
        this.ws = null;

        if (!this.isExplicitlyClosed) {
          this.setStatus('reconnecting');
          this.scheduleReconnect();
        } else {
          this.setStatus('disconnected');
        }
      };
    } catch {
      this.setStatus('error');
      this.scheduleReconnect();
    }
  }

  private scheduleReconnect() {
    if (this.reconnectTimeout || this.isExplicitlyClosed) return;

    this.reconnectTimeout = setTimeout(() => {
      this.reconnectTimeout = null;
      this.reconnectDelay = Math.min(this.reconnectDelay * 2, MAX_RECONNECT_DELAY);
      this.connect(this.isSubscribedAll);
    }, this.reconnectDelay);
  }

  public subscribeMatch(matchId: string | number) {
    const id = String(matchId);
    this.subscribedMatches.add(id);

    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.send({ type: 'subscribe', matchId: id });
    }
  }

  public unsubscribeMatch(matchId: string | number) {
    const id = String(matchId);
    this.subscribedMatches.delete(id);

    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.send({ type: 'unsubscribe', matchId: id });
    }
  }

  public subscribeAll() {
    this.isSubscribedAll = true;
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.send({ type: 'subscribe_all' });
    }
  }

  public unsubscribeAll() {
    this.isSubscribedAll = false;
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.send({ type: 'unsubscribe_all' });
    }
  }

  public send(payload: Record<string, unknown>) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      try {
        this.ws.send(JSON.stringify(payload));
      } catch (err) {
        console.error('Failed to send WS message:', err);
      }
    }
  }

  public disconnect() {
    this.isExplicitlyClosed = true;
    this.stopPingKeepalive();

    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    if (this.ws) {
      const socket = this.ws;
      this.ws = null;
      try {
        if (socket.readyState === WebSocket.OPEN) {
          socket.close(1000, 'Normal closure');
        } else if (socket.readyState === WebSocket.CONNECTING) {
          socket.onopen = () => {
            try {
              socket.close(1000, 'Normal closure');
            } catch {}
          };
        }
      } catch {}
    }

    this.setStatus('disconnected');
  }

  private startPingKeepalive() {
    this.stopPingKeepalive();
    this.pingInterval = setInterval(() => {
      this.send({ type: 'ping' });
    }, 25000);
  }

  private stopPingKeepalive() {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }
}

// Global shared singleton instance for application
export const wsClient = new WebSocketClient();
