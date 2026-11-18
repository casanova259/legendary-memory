import WebSocket, { WebSocketServer } from "ws";
import { wsArcjet } from "../arcjet.js";
import { db } from "../db/db.js";
import { matches } from "../db/schema.js";
import { eq } from "drizzle-orm";

const MAX_SUBSCRIPTIONS_PER_SOCKET = 100;

// In-memory registry of matchId -> Set<WebSocket>
const matchSubscribers = new Map();

// Lightweight cache for known valid match IDs to minimize database hits
const knownMatchIds = new Set();

export function subscribe(matchId, socket) {
    if (!matchSubscribers.has(matchId)) {
        matchSubscribers.set(matchId, new Set());
    }
    matchSubscribers.get(matchId).add(socket);
}

export function unsubscribe(matchId, socket) {
    const subscribers = matchSubscribers.get(matchId);
    if (!subscribers) return;

    subscribers.delete(socket);
    if (subscribers.size === 0) {
        matchSubscribers.delete(matchId);
    }
}

export function cleanUpSubscriptions(socket) {
    if (!socket || !socket.subscriptions) {
        return;
    }

    for (const matchId of socket.subscriptions) {
        unsubscribe(matchId, socket);
    }
    socket.subscriptions.clear();
}

export function sendJson(socket, payload) {
    if (!socket || socket.readyState !== WebSocket.OPEN) {
        return;
    }
    try {
        socket.send(JSON.stringify(payload));
    } catch (err) {
        console.error("Failed to send WebSocket message:", err);
    }
}

export function broadcastToMatch(matchId, payload) {
    const subscribers = matchSubscribers.get(matchId);
    if (!subscribers || subscribers.size === 0) {
        return;
    }

    const messageString = JSON.stringify(payload);
    for (const client of subscribers) {
        if (client.readyState === WebSocket.OPEN) {
            try {
                client.send(messageString);
            } catch (err) {
                console.error("Failed to broadcast to client:", err);
            }
        }
    }
}

export function broadcastToAll(wss, payload) {
    if (!wss || !wss.clients) return;

    const messageString = JSON.stringify(payload);
    for (const client of wss.clients) {
        if (client.readyState !== WebSocket.OPEN) continue;
        try {
            client.send(messageString);
        } catch (err) {
            console.error("Failed to broadcast to all clients:", err);
        }
    }
}

async function verifyMatchExists(matchId) {
    if (knownMatchIds.has(matchId)) {
        return true;
    }
    try {
        const [match] = await db
            .select({ id: matches.id })
            .from(matches)
            .where(eq(matches.id, matchId))
            .limit(1);

        if (match) {
            knownMatchIds.add(matchId);
            return true;
        }
        return false;
    } catch (error) {
        console.error("Error verifying match existence:", error);
        return false;
    }
}

export async function handleMessage(socket, data) {
    let message;
    try {
        message = JSON.parse(data.toString());
    } catch (err) {
        sendJson(socket, {
            type: "error",
            code: "invalid_json",
            message: "Payload must be valid JSON",
        });
        return;
    }

    if (!message || typeof message !== "object") {
        sendJson(socket, {
            type: "error",
            code: "invalid_payload",
            message: "Message must be an object",
        });
        return;
    }

    if (message.type === "subscribe") {
        const matchId = Number(message.matchId);
        if (!Number.isInteger(matchId) || matchId <= 0) {
            sendJson(socket, {
                type: "error",
                code: "invalid_match_id",
                message: "matchId must be a positive integer",
            });
            return;
        }

        if (socket.subscriptions.has(matchId)) {
            sendJson(socket, {
                type: "subscribed",
                matchId,
            });
            return;
        }

        if (socket.subscriptions.size >= MAX_SUBSCRIPTIONS_PER_SOCKET) {
            sendJson(socket, {
                type: "error",
                code: "subscription_limit_reached",
                message: `Maximum subscriptions (${MAX_SUBSCRIPTIONS_PER_SOCKET}) reached`,
            });
            return;
        }

        // Verify match exists before subscribing
        const exists = await verifyMatchExists(matchId);
        if (!exists) {
            sendJson(socket, {
                type: "error",
                code: "match_not_found",
                message: `Match with ID ${matchId} does not exist`,
            });
            return;
        }

        subscribe(matchId, socket);
        socket.subscriptions.add(matchId);

        sendJson(socket, {
            type: "subscribed",
            matchId,
        });
        return;
    }

    if (message.type === "unsubscribe") {
        const matchId = Number(message.matchId);
        if (!Number.isInteger(matchId) || matchId <= 0) {
            sendJson(socket, {
                type: "error",
                code: "invalid_match_id",
                message: "matchId must be a positive integer",
            });
            return;
        }

        unsubscribe(matchId, socket);
        socket.subscriptions?.delete(matchId);

        sendJson(socket, {
            type: "unsubscribed",
            matchId,
        });
        return;
    }

    if (message.type === "ping") {
        sendJson(socket, { type: "pong" });
        return;
    }

    sendJson(socket, {
        type: "error",
        code: "unknown_message_type",
        message: `Unknown message type: ${message.type}`,
    });
}

export function attachWebSocketServer(server) {
    const wss = new WebSocketServer({
        server,
        path: "/ws",
        maxPayload: 1024 * 1024,
    });

    wss.on("connection", async (socket, req) => {
        // 1. Immediately initialize connection state synchronously
        socket.isAlive = true;
        socket.subscriptions = new Set();

        socket.on("pong", () => {
            socket.isAlive = true;
        });

        socket.on("error", (err) => {
            console.error("WebSocket client error:", err);
            cleanUpSubscriptions(socket);
            socket.terminate();
        });

        socket.on("close", () => {
            cleanUpSubscriptions(socket);
        });

        // 2. Perform security verification if configured
        try {
            if (wsArcjet && process.env.NODE_ENV !== "test") {
                const decision = await wsArcjet.protect(req);

                if (decision.isDenied()) {
                    const code = decision.reason.isRateLimit() ? 1013 : 1008;
                    const reason = decision.reason.isRateLimit()
                        ? "Rate limit exceeded"
                        : "Access Denied";

                    socket.close(code, reason);
                    return;
                }
            }
        } catch (error) {
            console.error("WS Arcjet Security error:", error);
            socket.close(1011, "Server Security error");
            return;
        }

        // 3. Welcome client and bind single message handler
        sendJson(socket, { type: "welcome" });

        socket.on("message", async (data) => {
            await handleMessage(socket, data);
        });
    });

    // Heartbeat keepalive every 30 seconds
    const interval = setInterval(() => {
        wss.clients.forEach((ws) => {
            if (ws.isAlive === false) return ws.terminate();

            ws.isAlive = false;
            try {
                ws.ping();
            } catch (err) {
                ws.terminate();
            }
        });
    }, 30000);

    wss.on("close", () => clearInterval(interval));

    function broadcastMatchCreated(match) {
        if (match?.id) knownMatchIds.add(match.id);
        broadcastToAll(wss, { type: "match_created", data: match });
    }

    function broadcastCommentary(matchId, comment) {
        broadcastToMatch(matchId, { type: "commentary", data: comment });
    }

    function broadcastMatchUpdated(match) {
        if (match?.id) {
            knownMatchIds.add(match.id);
            broadcastToMatch(match.id, {
                type: "score_update",
                matchId: match.id,
                data: {
                    homeScore: match.homeScore,
                    awayScore: match.awayScore,
                },
     
            });
        }
    }

    function closeWebSocketServer() {
        clearInterval(interval);
        for (const client of wss.clients) {
            try {
                client.close(1001, "Server is shutting down");
            } catch (e) {
                client.terminate();
            }
        }
        return new Promise((resolve) => {
            wss.close(() => resolve());
        });
    }

    return {
        broadcastMatchCreated,
        broadcastCommentary,
        broadcastMatchUpdated,
        closeWebSocketServer,
        wss,
    };
}
