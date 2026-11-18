process.env.NODE_ENV = "test";
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import request from "supertest";
import { app } from "../src/app.js";

describe("Commentary API Endpoints", () => {
    let testMatchId = null;

    it("Setup: Create a match to receive commentary", async () => {
        const res = await request(app)
            .post("/matches")
            .send({
                sport: "Cricket",
                homeTeam: "India",
                awayTeam: "Australia",
                startTime: "2026-11-17T10:00:00Z",
                endTime: "2026-11-17T18:00:00Z",
                homeScore: 0,
                awayScore: 0,
            });

        assert.equal(res.status, 201);
        testMatchId = res.body.data.id;
        assert.ok(testMatchId);
    });

    it("POST /matches/:id/commentary - should insert valid commentary", async () => {
        const payload = {
            minute: 15,
            sequence: 1,
            period: "1st Innings",
            eventType: "boundary",
            actor: "Kohli",
            team: "India",
            message: "Four runs through extra cover!",
            metadata: { runs: 4 },
            tags: ["four", "boundary"],
        };

        const res = await request(app)
            .post(`/matches/${testMatchId}/commentary`)
            .send(payload);

        assert.equal(res.status, 201);
        assert.ok(res.body.data);
        assert.equal(res.body.data.message, payload.message);
        assert.equal(res.body.data.matchId, testMatchId);
    });

    it("GET /matches/:id/commentary - should return list of commentary", async () => {
        const res = await request(app)
            .get(`/matches/${testMatchId}/commentary?limit=50`);

        assert.equal(res.status, 200);
        assert.ok(Array.isArray(res.body.data));
        assert.ok(res.body.data.length >= 1);
        assert.equal(res.body.data[0].matchId, testMatchId);
    });

    it("POST /matches/:id/commentary - should return 404 for non-existent match", async () => {
        const payload = {
            minute: 1,
            sequence: 1,
            period: "1st Innings",
            eventType: "dot",
            message: "No run.",
        };

        const res = await request(app)
            .post("/matches/999999999/commentary")
            .send(payload);

        assert.equal(res.status, 404);
        assert.equal(res.body.error, "Match not found");
    });

    it("GET /matches/:id/commentary - should return 404 for non-existent match", async () => {
        const res = await request(app)
            .get("/matches/999999999/commentary");

        assert.equal(res.status, 404);
        assert.equal(res.body.error, "Match not found");
    });

    it("POST /matches/:id/commentary - should reject invalid payload (missing message)", async () => {
        const payload = {
            minute: 5,
            sequence: 1,
            period: "1st Innings",
            eventType: "foul",
            // missing message
        };

        const res = await request(app)
            .post(`/matches/${testMatchId}/commentary`)
            .send(payload);

        assert.equal(res.status, 400);
        assert.equal(res.body.error, "Invalid commentary payload");
        assert.ok(Array.isArray(res.body.details));
    });

    it("GET /matches/:id/commentary - should return 400 for invalid match ID", async () => {
        const res = await request(app)
            .get("/matches/abc/commentary");

        assert.equal(res.status, 400);
        assert.equal(res.body.error, "Invalid match ID");
    });
});
