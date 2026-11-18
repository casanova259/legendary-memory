process.env.NODE_ENV = "test";
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import request from "supertest";
import { app } from "../src/app.js";

describe("Match API Endpoints", () => {
    let createdMatchId = null;

    it("POST /matches - should create a match with valid ISO date", async () => {
        const payload = {
            sport: "Football",
            homeTeam: "Arsenal",
            awayTeam: "Chelsea",
            startTime: "2026-11-17T12:00:00Z",
            endTime: "2026-11-17T14:00:00Z",
            homeScore: 0,
            awayScore: 0,
        };

        const res = await request(app)
            .post("/matches")
            .send(payload);

        assert.equal(res.status, 201);
        assert.ok(res.body.data);
        assert.equal(res.body.data.homeTeam, "Arsenal");
        assert.equal(res.body.data.awayTeam, "Chelsea");
        assert.ok(res.body.data.id);
        createdMatchId = res.body.data.id;
    });

    it("POST /matches - should create a match with timezone offset in ISO date", async () => {
        const payload = {
            sport: "Basketball",
            homeTeam: "Lakers",
            awayTeam: "Warriors",
            startTime: "2026-11-17T18:00:00+05:30",
            endTime: "2026-11-17T20:30:00+05:30",
            homeScore: 0,
            awayScore: 0,
        };

        const res = await request(app)
            .post("/matches")
            .send(payload);

        assert.equal(res.status, 201);
        assert.ok(res.body.data);
        assert.equal(res.body.data.sport, "Basketball");
    });

    it("POST /matches - should reject invalid dates or endTime <= startTime", async () => {
        const payload = {
            sport: "Football",
            homeTeam: "Arsenal",
            awayTeam: "Chelsea",
            startTime: "2026-11-17T16:00:00Z",
            endTime: "2026-11-17T14:00:00Z", // Invalid: before start
        };

        const res = await request(app)
            .post("/matches")
            .send(payload);

        assert.equal(res.status, 400);
        assert.equal(res.body.error, "Invalid match payload");
        assert.ok(Array.isArray(res.body.details));
    });

    it("GET /matches - should return standardized list { data: [...] }", async () => {
        const res = await request(app)
            .get("/matches?limit=10");

        assert.equal(res.status, 200);
        assert.ok(Array.isArray(res.body.data));
    });

    it("GET /matches/:id - should return single match", async () => {
        assert.ok(createdMatchId, "createdMatchId must exist");
        const res = await request(app)
            .get(`/matches/${createdMatchId}`);

        assert.equal(res.status, 200);
        assert.ok(res.body.data);
        assert.equal(res.body.data.id, createdMatchId);
    });

    it("GET /matches/:id - should return 404 for non-existent match", async () => {
        const res = await request(app)
            .get("/matches/999999999");

        assert.equal(res.status, 404);
        assert.equal(res.body.error, "Match not found");
    });

    it("GET /matches/:id - should return 400 for invalid match ID", async () => {
        const res = await request(app)
            .get("/matches/invalid-id");

        assert.equal(res.status, 400);
        assert.equal(res.body.error, "Invalid match ID");
    });

    it("PATCH /matches/:id/score - should update match score", async () => {
        assert.ok(createdMatchId, "createdMatchId must exist");
        const res = await request(app)
            .patch(`/matches/${createdMatchId}/score`)
            .send({ homeScore: 2, awayScore: 1 });

        assert.equal(res.status, 200);
        assert.ok(res.body.data);
        assert.equal(res.body.data.homeScore, 2);
        assert.equal(res.body.data.awayScore, 1);
    });

    it("PATCH /matches/:id/score - should reject negative scores", async () => {
        assert.ok(createdMatchId, "createdMatchId must exist");
        const res = await request(app)
            .patch(`/matches/${createdMatchId}/score`)
            .send({ homeScore: -1, awayScore: 3 });

        assert.equal(res.status, 400);
        assert.equal(res.body.error, "Invalid score payload");
    });

    it("PATCH /matches/:id/score - should reject non-integer scores", async () => {
        assert.ok(createdMatchId, "createdMatchId must exist");
        const res = await request(app)
            .patch(`/matches/${createdMatchId}/score`)
            .send({ homeScore: 1.5, awayScore: 2 });

        assert.equal(res.status, 400);
        assert.equal(res.body.error, "Invalid score payload");
    });

    it("PATCH /matches/:id/score - should return 404 for non-existent match", async () => {
        const res = await request(app)
            .patch("/matches/999999999/score")
            .send({ homeScore: 1, awayScore: 0 });

        assert.equal(res.status, 404);
        assert.equal(res.body.error, "Match not found");
    });
});
