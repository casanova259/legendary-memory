process.env.NODE_ENV = "test";
import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import http from "http";
import WebSocket from "ws";
import { app } from "../src/app.js";
import { attachWebSocketServer } from "../src/ws/server.js";
import request from "supertest";
import { ensureTestUsers, adminHeaders } from "./helpers.js";

describe("WebSocket Lifecycle & Realtime Broadcasting", () => {
    let server;
    let wsUrl;
    let broadcastCommentaryFn;
    let broadcastMatchUpdatedFn;
    let closeWebSocketServerFn;
    let validMatchId;

    before(async () => {
        await ensureTestUsers();

        // Create an active match in DB for subscription tests
        const res = await request(app)
            .post("/matches")
            .set(adminHeaders)
            .send({
                sport: "Tennis",
                homeTeam: "Alcaraz",
                awayTeam: "Sinner",
                startTime: "2026-11-17T15:00:00Z",
                endTime: "2026-11-17T18:00:00Z",
                homeScore: 0,
                awayScore: 0,
            });

        validMatchId = res.body.data.id;

        // Spin up temporary HTTP server on random port
        server = http.createServer(app);
        const wsAttached = attachWebSocketServer(server);
        broadcastCommentaryFn = wsAttached.broadcastCommentary;
        broadcastMatchUpdatedFn = wsAttached.broadcastMatchUpdated;
        closeWebSocketServerFn = wsAttached.closeWebSocketServer;

        await new Promise((resolve) => {
            server.listen(0, "127.0.0.1", () => {
                const port = server.address().port;
                wsUrl = `ws://127.0.0.1:${port}/ws`;
                resolve();
            });
        });
    });

    after(async () => {
        if (closeWebSocketServerFn) {
            await closeWebSocketServerFn();
        }
        if (server) {
            await new Promise((resolve) => server.close(resolve));
        }
    });

    it("should connect and receive welcome message", async () => {
        const client = new WebSocket(wsUrl);

        const welcome = await new Promise((resolve, reject) => {
            client.on("message", (raw) => {
                const msg = JSON.parse(raw.toString());
                if (msg.type === "welcome") resolve(msg);
            });
            client.on("error", reject);
        });

        assert.equal(welcome.type, "welcome");
        client.close();
    });

    it("should subscribe to a valid match and receive confirmation", async () => {
        const client = new WebSocket(wsUrl);

        await new Promise((resolve) => client.on("open", resolve));

        client.send(JSON.stringify({ type: "subscribe", matchId: validMatchId }));

        const response = await new Promise((resolve) => {
            client.on("message", (raw) => {
                const msg = JSON.parse(raw.toString());
                if (msg.type === "subscribed") resolve(msg);
            });
        });

        assert.equal(response.type, "subscribed");
        assert.equal(response.matchId, validMatchId);
        client.close();
    });

    it("should reject subscription to non-existent match", async () => {
        const client = new WebSocket(wsUrl);

        await new Promise((resolve) => client.on("open", resolve));

        client.send(JSON.stringify({ type: "subscribe", matchId: 999999999 }));

        const response = await new Promise((resolve) => {
            client.on("message", (raw) => {
                const msg = JSON.parse(raw.toString());
                if (msg.type === "error" && msg.code === "match_not_found") resolve(msg);
            });
        });

        assert.equal(response.code, "match_not_found");
        client.close();
    });

    it("should unsubscribe cleanly", async () => {
        const client = new WebSocket(wsUrl);

        await new Promise((resolve) => client.on("open", resolve));

        client.send(JSON.stringify({ type: "unsubscribe", matchId: validMatchId }));

        const response = await new Promise((resolve) => {
            client.on("message", (raw) => {
                const msg = JSON.parse(raw.toString());
                if (msg.type === "unsubscribed") resolve(msg);
            });
        });

        assert.equal(response.type, "unsubscribed");
        assert.equal(response.matchId, validMatchId);
        client.close();
    });

    it("should respond to ping with pong", async () => {
        const client = new WebSocket(wsUrl);

        await new Promise((resolve) => client.on("open", resolve));

        client.send(JSON.stringify({ type: "ping" }));

        const response = await new Promise((resolve) => {
            client.on("message", (raw) => {
                const msg = JSON.parse(raw.toString());
                if (msg.type === "pong") resolve(msg);
            });
        });

        assert.equal(response.type, "pong");
        client.close();
    });

    it("should handle malformed JSON without crashing", async () => {
        const client = new WebSocket(wsUrl);

        await new Promise((resolve) => client.on("open", resolve));

        client.send("not a json string");

        const response = await new Promise((resolve) => {
            client.on("message", (raw) => {
                const msg = JSON.parse(raw.toString());
                if (msg.type === "error" && msg.code === "invalid_json") resolve(msg);
            });
        });

        assert.equal(response.code, "invalid_json");
        client.close();
    });

    it("should broadcast commentary to subscribed clients", async () => {
        const client = new WebSocket(wsUrl);

        await new Promise((resolve) => client.on("open", resolve));

        // Subscribe to valid match
        client.send(JSON.stringify({ type: "subscribe", matchId: validMatchId }));

        await new Promise((resolve) => {
            client.on("message", (raw) => {
                const msg = JSON.parse(raw.toString());
                if (msg.type === "subscribed") resolve();
            });
        });

        // Trigger broadcast
        const commentData = {
            id: 101,
            matchId: validMatchId,
            message: "Ace on serve!",
        };

        const receivedCommentary = new Promise((resolve) => {
            client.on("message", (raw) => {
                const msg = JSON.parse(raw.toString());
                if (msg.type === "commentary") resolve(msg);
            });
        });

        broadcastCommentaryFn(validMatchId, commentData);

        const msg = await receivedCommentary;
        assert.equal(msg.type, "commentary");
        assert.equal(msg.data.message, "Ace on serve!");
        client.close();
    });

    it("should broadcast score updates to subscribed clients", async () => {
        const client = new WebSocket(wsUrl);

        await new Promise((resolve) => client.on("open", resolve));

        client.send(JSON.stringify({ type: "subscribe", matchId: validMatchId }));

        await new Promise((resolve) => {
            client.on("message", (raw) => {
                const msg = JSON.parse(raw.toString());
                if (msg.type === "subscribed") resolve();
            });
        });

        const receivedScore = new Promise((resolve) => {
            client.on("message", (raw) => {
                const msg = JSON.parse(raw.toString());
                if (msg.type === "score_update") resolve(msg);
            });
        });

        broadcastMatchUpdatedFn({ id: validMatchId, homeScore: 3, awayScore: 1 });

        const msg = await receivedScore;
        assert.equal(msg.type, "score_update");
        assert.equal(msg.data.homeScore, 3);
        assert.equal(msg.data.awayScore, 1);
        client.close();
    });
});
