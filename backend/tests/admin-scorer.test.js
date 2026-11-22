process.env.NODE_ENV = "test";
import { describe, it, before } from "node:test";
import assert from "node:assert/strict";
import request from "supertest";
import { app } from "../src/app.js";
import {
    ensureTestUsers,
    adminHeaders,
    scorerHeaders,
    scorer2Headers,
    viewerHeaders,
    inactiveHeaders,
    TEST_ADMIN_CLERK_ID,
    TEST_SCORER_CLERK_ID,
    TEST_SCORER_2_CLERK_ID,
} from "./helpers.js";
import { db } from "../src/db/db.js";
import { users, matches } from "../src/db/schema.js";
import { eq } from "drizzle-orm";

describe("Production-Grade Admin–Scorer Architecture Tests", () => {
    let adminUser;
    let scorerUser1;
    let scorerUser2;
    let testMatchId;

    before(async () => {
        await ensureTestUsers();
        [adminUser] = await db.select().from(users).where(eq(users.clerkId, TEST_ADMIN_CLERK_ID)).limit(1);
        [scorerUser1] = await db.select().from(users).where(eq(users.clerkId, TEST_SCORER_CLERK_ID)).limit(1);
        [scorerUser2] = await db.select().from(users).where(eq(users.clerkId, TEST_SCORER_2_CLERK_ID)).limit(1);
    });

    describe("1. Authentication, Roles & Inactive Accounts", () => {
        it("should reject unauthenticated requests to protected endpoints (401)", async () => {
            const res = await request(app).get("/api/admin/dashboard");
            assert.equal(res.status, 401);
        });

        it("should reject inactive accounts with 403 Forbidden", async () => {
            const res = await request(app)
                .get("/api/scorer/dashboard")
                .set(inactiveHeaders);
            assert.equal(res.status, 403);
            assert.match(res.body.message, /inactive/i);
        });

        it("should reject scorers trying to access admin dashboard (403)", async () => {
            const res = await request(app)
                .get("/api/admin/dashboard")
                .set(scorerHeaders);
            assert.equal(res.status, 403);
        });

        it("should reject viewers trying to access scorer dashboard (403)", async () => {
            const res = await request(app)
                .get("/api/scorer/dashboard")
                .set(viewerHeaders);
            assert.equal(res.status, 403);
        });
    });

    describe("2. Admin Operations & Scorer Management", () => {
        it("admin can access dashboard statistics", async () => {
            const res = await request(app)
                .get("/api/admin/dashboard")
                .set(adminHeaders);
            assert.equal(res.status, 200);
            assert.ok("totalMatches" in res.body.data);
            assert.ok("totalScorers" in res.body.data);
        });

        it("admin can list scorers", async () => {
            const res = await request(app)
                .get("/api/admin/scorers")
                .set(adminHeaders);
            assert.equal(res.status, 200);
            assert.ok(Array.isArray(res.body.data));
            const hasScorer = res.body.data.some((s) => s.id === scorerUser1.id);
            assert.ok(hasScorer);
        });

        it("admin can invite a scorer via email", async () => {
            const res = await request(app)
                .post("/api/admin/scorers/invite")
                .set(adminHeaders)
                .send({ email: "new_scorer_invite@test.com" });
            assert.equal(res.status, 201);
            assert.ok(res.body.data.id);
        });

        it("admin can toggle user active status", async () => {
            const res = await request(app)
                .patch(`/api/admin/scorers/${scorerUser2.id}/status`)
                .set(adminHeaders)
                .send({ isActive: false });
            assert.equal(res.status, 200);
            assert.equal(res.body.data.isActive, false);

            // Re-activate for subsequent tests
            const reactivateRes = await request(app)
                .patch(`/api/admin/scorers/${scorerUser2.id}/status`)
                .set(adminHeaders)
                .send({ isActive: true });
            assert.equal(reactivateRes.status, 200);
            assert.equal(reactivateRes.data?.isActive ?? reactivateRes.body.data.isActive, true);
        });

        it("admin cannot deactivate themselves", async () => {
            const res = await request(app)
                .patch(`/api/admin/scorers/${adminUser.id}/status`)
                .set(adminHeaders)
                .send({ isActive: false });
            assert.equal(res.status, 400);
            assert.match(res.body.error, /deactivate their own account/i);
        });
    });

    describe("3. Match Creation & Scorer Assignment Lifecycle", () => {
        it("admin creates a cricket match", async () => {
            const now = Date.now();
            const res = await request(app)
                .post("/api/admin/matches")
                .set(adminHeaders)
                .send({
                    sport: "Cricket",
                    homeTeam: "India",
                    awayTeam: "Australia",
                    startTime: new Date(now + 60000).toISOString(),
                    endTime: new Date(now + 7200000).toISOString(),
                });
            assert.equal(res.status, 201);
            assert.ok(res.body.data.id);
            testMatchId = res.body.data.id;
        });

        it("admin assigns Scorer 1 to the match", async () => {
            const res = await request(app)
                .post(`/api/admin/matches/${testMatchId}/assign`)
                .set(adminHeaders)
                .send({ scorerId: scorerUser1.id });
            assert.equal(res.status, 201);
            assert.equal(res.body.data.status, "active");
            assert.equal(res.body.data.scorerId, scorerUser1.id);
        });

        it("cannot add duplicate active assignment for the same match (409 Conflict)", async () => {
            const res = await request(app)
                .post(`/api/admin/matches/${testMatchId}/assign`)
                .set(adminHeaders)
                .send({ scorerId: scorerUser2.id });
            assert.equal(res.status, 409);
        });

        it("Scorer 1 sees the assigned match in their dashboard", async () => {
            const res = await request(app)
                .get("/api/scorer/matches")
                .set(scorerHeaders);
            assert.equal(res.status, 200);
            const found = res.body.data.some((m) => m.id === testMatchId);
            assert.ok(found);
        });

        it("Scorer 2 cannot see or operate Scorer 1's match (403)", async () => {
            const res = await request(app)
                .get(`/api/scorer/matches/${testMatchId}`)
                .set(scorer2Headers);
            assert.equal(res.status, 403);
        });

        it("admin can reassign match to Scorer 2", async () => {
            const res = await request(app)
                .post(`/api/admin/matches/${testMatchId}/reassign`)
                .set(adminHeaders)
                .send({
                    newScorerId: scorerUser2.id,
                    reason: "Scorer 1 emergency shift handover",
                });
            assert.equal(res.status, 200);
            assert.equal(res.body.data.scorerId, scorerUser2.id);
            assert.equal(res.body.data.status, "active");
        });

        it("Scorer 1 no longer has access after reassignment (403)", async () => {
            const res = await request(app)
                .get(`/api/scorer/matches/${testMatchId}`)
                .set(scorerHeaders);
            assert.equal(res.status, 403);
        });

        it("Scorer 2 now has full access to the match", async () => {
            const res = await request(app)
                .get(`/api/scorer/matches/${testMatchId}`)
                .set(scorer2Headers);
            assert.equal(res.status, 200);
            assert.equal(res.body.data.match.id, testMatchId);
        });

        it("admin can view assignment history showing previous and current assignments", async () => {
            const res = await request(app)
                .get(`/api/admin/matches/${testMatchId}/assignments`)
                .set(adminHeaders);
            assert.equal(res.status, 200);
            assert.ok(Array.isArray(res.body.data));
            assert.ok(res.body.data.length >= 2);
            assert.ok(res.body.data.some((a) => a.status === "revoked"));
            assert.ok(res.body.data.some((a) => a.status === "active"));
        });
    });

    describe("4. Cricket Scoring Engine & Match Lifecycle", () => {
        let firstScoringEventId;

        it("Scorer 2 starts the match and initializes Innings 1", async () => {
            const res = await request(app)
                .post(`/api/scorer/matches/${testMatchId}/start`)
                .set(scorer2Headers);
            assert.equal(res.status, 200);
            assert.equal(res.body.data.match.status, "live");
            assert.equal(res.body.data.innings.inningsNumber, 1);
            assert.equal(res.body.data.innings.status, "live");
        });

        it("scores a dot ball (0 runs, 1 legal ball)", async () => {
            const res = await request(app)
                .post(`/api/scorer/matches/${testMatchId}/events`)
                .set(scorer2Headers)
                .send({
                    eventType: "ball",
                    runsOffBat: 0,
                    batter: "Rohit Sharma",
                    bowler: "Pat Cummins",
                    idempotencyKey: `idem_dot_${Date.now()}`,
                });
            assert.equal(res.status, 201);
            assert.equal(res.body.data.event.totalRuns, 0);
            assert.equal(res.body.data.innings.legalBalls, 1);
            assert.equal(res.body.data.innings.totalRuns, 0);
            firstScoringEventId = res.body.data.event.id;
        });

        it("scores a boundary FOUR (4 runs, 1 legal ball)", async () => {
            const res = await request(app)
                .post(`/api/scorer/matches/${testMatchId}/events`)
                .set(scorer2Headers)
                .send({
                    eventType: "ball",
                    runsOffBat: 4,
                    batter: "Rohit Sharma",
                    bowler: "Pat Cummins",
                    idempotencyKey: `idem_four_${Date.now()}`,
                });
            assert.equal(res.status, 201);
            assert.equal(res.body.data.innings.totalRuns, 4);
            assert.equal(res.body.data.innings.legalBalls, 2);
        });

        it("scores a SIX (6 runs, 1 legal ball)", async () => {
            const res = await request(app)
                .post(`/api/scorer/matches/${testMatchId}/events`)
                .set(scorer2Headers)
                .send({
                    eventType: "ball",
                    runsOffBat: 6,
                    batter: "Rohit Sharma",
                    bowler: "Pat Cummins",
                    idempotencyKey: `idem_six_${Date.now()}`,
                });
            assert.equal(res.status, 201);
            assert.equal(res.body.data.innings.totalRuns, 10);
            assert.equal(res.body.data.innings.legalBalls, 3);
        });

        it("scores a WIDE delivery (1 extra run, 0 legal balls)", async () => {
            const res = await request(app)
                .post(`/api/scorer/matches/${testMatchId}/events`)
                .set(scorer2Headers)
                .send({
                    eventType: "extra",
                    extrasType: "wide",
                    extrasRuns: 1,
                    bowler: "Pat Cummins",
                    idempotencyKey: `idem_wide_${Date.now()}`,
                });
            assert.equal(res.status, 201);
            assert.equal(res.body.data.innings.totalRuns, 11);
            // Legal balls must NOT increment for wides!
            assert.equal(res.body.data.innings.legalBalls, 3);
            assert.equal(res.body.data.innings.extras, 1);
        });

        it("scores a NO-BALL with 2 runs off bat (3 total runs, 0 legal balls)", async () => {
            const res = await request(app)
                .post(`/api/scorer/matches/${testMatchId}/events`)
                .set(scorer2Headers)
                .send({
                    eventType: "extra",
                    extrasType: "no_ball",
                    extrasRuns: 1,
                    runsOffBat: 2,
                    batter: "Rohit Sharma",
                    bowler: "Pat Cummins",
                    idempotencyKey: `idem_noball_${Date.now()}`,
                });
            assert.equal(res.status, 201);
            assert.equal(res.body.data.event.totalRuns, 3);
            assert.equal(res.body.data.innings.totalRuns, 14);
            // Legal balls must NOT increment for no-balls!
            assert.equal(res.body.data.innings.legalBalls, 3);
        });

        it("scores a BYE (1 extra run, 1 legal ball)", async () => {
            const res = await request(app)
                .post(`/api/scorer/matches/${testMatchId}/events`)
                .set(scorer2Headers)
                .send({
                    eventType: "extra",
                    extrasType: "bye",
                    extrasRuns: 1,
                    runsOffBat: 0,
                    bowler: "Pat Cummins",
                    idempotencyKey: `idem_bye_${Date.now()}`,
                });
            assert.equal(res.status, 201);
            assert.equal(res.body.data.innings.totalRuns, 15);
            // Byes are legal deliveries!
            assert.equal(res.body.data.innings.legalBalls, 4);
        });

        it("records a WICKET (bowled dismissal)", async () => {
            const res = await request(app)
                .post(`/api/scorer/matches/${testMatchId}/events`)
                .set(scorer2Headers)
                .send({
                    eventType: "wicket",
                    wicketType: "bowled",
                    batter: "Rohit Sharma",
                    dismissedPlayer: "Rohit Sharma",
                    bowler: "Pat Cummins",
                    idempotencyKey: `idem_wkt_${Date.now()}`,
                });
            assert.equal(res.status, 201);
            assert.equal(res.body.data.innings.wickets, 1);
            assert.equal(res.body.data.innings.legalBalls, 5);
        });

        it("idempotency check: duplicate idempotencyKey returns existing event without adding runs", async () => {
            const fixedKey = `idem_test_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
            const firstRes = await request(app)
                .post(`/api/scorer/matches/${testMatchId}/events`)
                .set(scorer2Headers)
                .send({
                    eventType: "ball",
                    runsOffBat: 2,
                    idempotencyKey: fixedKey,
                });
            assert.equal(firstRes.status, 201);
            assert.equal(firstRes.body.data.isIdempotentReplay, false);
            const runsAfterFirst = firstRes.body.data.innings.totalRuns;

            // Replay with identical key
            const secondRes = await request(app)
                .post(`/api/scorer/matches/${testMatchId}/events`)
                .set(scorer2Headers)
                .send({
                    eventType: "ball",
                    runsOffBat: 2,
                    idempotencyKey: fixedKey,
                });
            assert.equal(secondRes.status, 201);
            assert.equal(secondRes.body.data.isIdempotentReplay, true);
            assert.equal(secondRes.body.data.innings.totalRuns, runsAfterFirst);
        });

        it("scorer can pause and resume match", async () => {
            const pauseRes = await request(app)
                .post(`/api/scorer/matches/${testMatchId}/pause`)
                .set(scorer2Headers);
            assert.equal(pauseRes.status, 200);
            assert.equal(pauseRes.body.data.status, "paused");

            // Cannot score while paused
            const rejectedScoring = await request(app)
                .post(`/api/scorer/matches/${testMatchId}/events`)
                .set(scorer2Headers)
                .send({
                    eventType: "ball",
                    runsOffBat: 1,
                    idempotencyKey: `idem_while_paused_${Date.now()}`,
                });
            assert.equal(rejectedScoring.status, 400);

            // Resume
            const resumeRes = await request(app)
                .post(`/api/scorer/matches/${testMatchId}/resume`)
                .set(scorer2Headers);
            assert.equal(resumeRes.status, 200);
            assert.equal(resumeRes.body.data.status, "live");
        });

        it("admin can perform scoring correction with mandatory audit reason", async () => {
            const res = await request(app)
                .post(`/api/admin/matches/${testMatchId}/events/${firstScoringEventId}/correct`)
                .set(adminHeaders)
                .send({
                    reason: "Scorer erroneously marked ball, was actually cancelled by umpire",
                });
            assert.equal(res.status, 200);
            assert.equal(res.body.data.reversedEvent.isReversed, true);
            assert.ok(res.body.data.commentary);
            assert.match(res.body.data.commentary.message, /ADMIN CORRECTION/i);
        });

        it("admin can override match status with mandatory reason", async () => {
            const res = await request(app)
                .post(`/api/admin/matches/${testMatchId}/status`)
                .set(adminHeaders)
                .send({
                    status: "paused",
                    reason: "Rain delay - administrative pause",
                });
            assert.equal(res.status, 200);
            assert.equal(res.body.data.status, "paused");

            // Resume
            await request(app)
                .post(`/api/admin/matches/${testMatchId}/status`)
                .set(adminHeaders)
                .send({
                    status: "live",
                    reason: "Rain cleared, resuming play",
                });
        });

        it("admin can view audit logs for match", async () => {
            const res = await request(app)
                .get(`/api/admin/matches/${testMatchId}/audit`)
                .set(adminHeaders);
            assert.equal(res.status, 200);
            assert.ok(Array.isArray(res.body.data));
            assert.ok(res.body.data.length >= 3);
        });

        it("scorer can complete match", async () => {
            const res = await request(app)
                .post(`/api/scorer/matches/${testMatchId}/complete`)
                .set(scorer2Headers);
            assert.equal(res.status, 200);
            assert.equal(res.body.data.status, "completed");
        });
    });

    describe("5. Public Compatibility & WebSocket Integrity", () => {
        it("public GET /matches remains accessible without authentication", async () => {
            const res = await request(app).get("/matches");
            assert.equal(res.status, 200);
            assert.ok(Array.isArray(res.body.data));
        });

        it("public GET /matches/:id remains accessible without authentication", async () => {
            const res = await request(app).get(`/matches/${testMatchId}`);
            assert.equal(res.status, 200);
            assert.equal(res.body.data.id, testMatchId);
        });

        it("public GET /matches/:id/commentary returns auto-generated cricket commentary", async () => {
            const res = await request(app).get(`/matches/${testMatchId}/commentary`);
            assert.equal(res.status, 200);
            assert.ok(Array.isArray(res.body.data));
            assert.ok(res.body.data.length > 0);
        });
    });
});
