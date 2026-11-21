process.env.NODE_ENV = "test";
process.env.ADMIN_BOOTSTRAP_SECRET = "super-secret-bootstrap-key-for-testing-123";

import { describe, it, before } from "node:test";
import assert from "node:assert/strict";
import request from "supertest";
import { app } from "../src/app.js";
import { db } from "../src/db/db.js";
import { users, matches } from "../src/db/schema.js";
import { eq } from "drizzle-orm";
import {
    ensureTestUsers,
    adminHeaders,
    scorerHeaders,
    viewerHeaders,
    TEST_ADMIN_CLERK_ID,
    TEST_SCORER_CLERK_ID,
    TEST_VIEWER_CLERK_ID,
} from "./helpers.js";
import {
    syncUserFromClerk,
    updateUserRole,
    bootstrapFirstAdmin,
} from "../src/services/user.js";

describe("Authentication & Authorization Tests", () => {
    let testMatchId = null;

    before(async () => {
        await ensureTestUsers();

        // Create a test match for scoring & commentary tests
        const [m] = await db
            .insert(matches)
            .values({
                sport: "Football",
                homeTeam: "Auth Home",
                awayTeam: "Auth Away",
                startTime: new Date("2026-11-20T10:00:00Z"),
                endTime: new Date("2026-11-20T12:00:00Z"),
                status: "live",
                homeScore: 0,
                awayScore: 0,
            })
            .returning();
        testMatchId = m.id;
    });

    describe("1. Authentication Verification", () => {
        it("should return 401 when authorization token is missing", async () => {
            const res = await request(app).get("/auth/me");
            assert.equal(res.status, 401);
            assert.equal(res.body.error, "Unauthorized");
        });

        it("should return 401 when authorization token is malformed", async () => {
            const res = await request(app)
                .get("/auth/me")
                .set("Authorization", "InvalidHeaderFormat");
            assert.equal(res.status, 401);
            assert.equal(res.body.error, "Unauthorized");
        });

        it("should return 200 and resolve verified user identity for valid token", async () => {
            const res = await request(app)
                .get("/auth/me")
                .set(adminHeaders);

            assert.equal(res.status, 200);
            assert.ok(res.body.data);
            assert.equal(res.body.data.clerkId, TEST_ADMIN_CLERK_ID);
            assert.equal(res.body.data.role, "admin");
        });

        it("should synchronize user as 'viewer' by default on first access", async () => {
            const newClerkId = "test_user_new_random_viewer_" + Date.now();
            const res = await request(app)
                .get("/auth/me")
                .set("Authorization", `Bearer ${newClerkId}`)
                .set("x-test-email", "new_user@test.com")
                .set("x-test-name", "New User");

            assert.equal(res.status, 200);
            assert.equal(res.body.data.role, "viewer");
            assert.equal(res.body.data.email, "new_user@test.com");
            assert.equal(res.body.data.displayName, "New User");

            // Verify in database
            const [inDb] = await db
                .select()
                .from(users)
                .where(eq(users.clerkId, newClerkId));
            assert.ok(inDb);
            assert.equal(inDb.role, "viewer");
        });

        it("should NEVER overwrite existing application role during profile synchronization", async () => {
            // First promote a user to scorer
            const testClerkId = "test_user_role_preservation_" + Date.now();
            const user = await syncUserFromClerk({
                clerkId: testClerkId,
                email: "initial@test.com",
                displayName: "Original Name",
            });
            assert.equal(user.role, "viewer");

            // Promote to scorer
            await db
                .update(users)
                .set({ role: "scorer" })
                .where(eq(users.clerkId, testClerkId));

            // Sync user again with new name/email (simulating Clerk profile update)
            const synced = await syncUserFromClerk({
                clerkId: testClerkId,
                email: "updated@test.com",
                displayName: "Updated Name",
            });

            assert.equal(synced.email, "updated@test.com");
            assert.equal(synced.displayName, "Updated Name");
            assert.equal(synced.role, "scorer", "Role must remain scorer after sync");
        });
    });

    describe("2. Role-Based Authorization", () => {
        it("Viewer cannot create matches (403)", async () => {
            const res = await request(app)
                .post("/matches")
                .set(viewerHeaders)
                .send({
                    sport: "Football",
                    homeTeam: "A",
                    awayTeam: "B",
                    startTime: "2026-11-20T10:00:00Z",
                    endTime: "2026-11-20T12:00:00Z",
                });

            assert.equal(res.status, 403);
            assert.equal(res.body.error, "Forbidden");
        });

        it("Viewer cannot update scores (403)", async () => {
            const res = await request(app)
                .patch(`/matches/${testMatchId}/score`)
                .set(viewerHeaders)
                .send({ homeScore: 1, awayScore: 0 });

            assert.equal(res.status, 403);
            assert.equal(res.body.error, "Forbidden");
        });

        it("Viewer cannot post commentary (403)", async () => {
            const res = await request(app)
                .post(`/matches/${testMatchId}/commentary`)
                .set(viewerHeaders)
                .send({
                    sequence: 1,
                    eventType: "goal",
                    message: "Viewer trying to post commentary",
                });

            assert.equal(res.status, 403);
            assert.equal(res.body.error, "Forbidden");
        });

        it("Scorer cannot create matches (403)", async () => {
            const res = await request(app)
                .post("/matches")
                .set(scorerHeaders)
                .send({
                    sport: "Football",
                    homeTeam: "A",
                    awayTeam: "B",
                    startTime: "2026-11-20T10:00:00Z",
                    endTime: "2026-11-20T12:00:00Z",
                });

            assert.equal(res.status, 403);
            assert.equal(res.body.error, "Forbidden");
        });

        it("Scorer can update scores (200)", async () => {
            const res = await request(app)
                .patch(`/matches/${testMatchId}/score`)
                .set(scorerHeaders)
                .send({ homeScore: 3, awayScore: 2 });

            assert.equal(res.status, 200);
            assert.equal(res.body.data.homeScore, 3);
            assert.equal(res.body.data.awayScore, 2);
        });

        it("Scorer can post commentary (201)", async () => {
            const res = await request(app)
                .post(`/matches/${testMatchId}/commentary`)
                .set(scorerHeaders)
                .send({
                    minute: 10,
                    period: "1st Half",
                    sequence: 10,
                    eventType: "goal",
                    message: "Goal scored by striker!",
                });

            assert.equal(res.status, 201);
            assert.equal(res.body.data.message, "Goal scored by striker!");
        });

        it("Admin can create matches (201)", async () => {
            const res = await request(app)
                .post("/matches")
                .set(adminHeaders)
                .send({
                    sport: "Basketball",
                    homeTeam: "Bulls",
                    awayTeam: "Lakers",
                    startTime: "2026-11-20T18:00:00Z",
                    endTime: "2026-11-20T20:00:00Z",
                });

            assert.equal(res.status, 201);
            assert.equal(res.body.data.homeTeam, "Bulls");
        });

        it("Client-supplied role in payload cannot escalate privileges", async () => {
            const res = await request(app)
                .post(`/matches/${testMatchId}/commentary`)
                .set(viewerHeaders)
                .send({
                    role: "admin",
                    minute: 11,
                    period: "1st Half",
                    sequence: 11,
                    eventType: "card",
                    message: "Escalation attempt",
                });

            assert.equal(res.status, 403);
            assert.equal(res.body.error, "Forbidden");
        });
    });

    describe("3. Admin User Management", () => {
        it("Non-admin cannot list users (403)", async () => {
            const res = await request(app)
                .get("/admin/users")
                .set(viewerHeaders);

            assert.equal(res.status, 403);
        });

        it("Admin can list users (200)", async () => {
            const res = await request(app)
                .get("/admin/users")
                .set(adminHeaders);

            assert.equal(res.status, 200);
            assert.ok(Array.isArray(res.body.data));
            assert.ok(res.body.data.length > 0);
        });

        it("Admin can update user role to scorer", async () => {
            // Create a target user
            const target = await syncUserFromClerk({
                clerkId: "test_user_target_promote",
                email: "target@test.com",
            });

            const res = await request(app)
                .patch(`/admin/users/${target.id}/role`)
                .set(adminHeaders)
                .send({ role: "scorer" });

            assert.equal(res.status, 200);
            assert.equal(res.body.data.role, "scorer");
        });

        it("Admin cannot modify their own role (400)", async () => {
            const [adminUser] = await db
                .select()
                .from(users)
                .where(eq(users.clerkId, TEST_ADMIN_CLERK_ID));

            const res = await request(app)
                .patch(`/admin/users/${adminUser.id}/role`)
                .set(adminHeaders)
                .send({ role: "viewer" });

            assert.equal(res.status, 400);
            assert.match(res.body.message || res.body.error, /cannot modify their own role/i);
        });
    });

    describe("4. Secure Admin Bootstrap", () => {
        it("should reject bootstrap request without authentication (401)", async () => {
            const res = await request(app)
                .post("/admin/bootstrap")
                .send({ secret: "super-secret-bootstrap-key-for-testing-123" });

            assert.equal(res.status, 401);
        });

        it("should reject bootstrap request with invalid secret (401)", async () => {
            const res = await request(app)
                .post("/admin/bootstrap")
                .set(viewerHeaders)
                .send({ secret: "wrong-secret-value" });

            assert.equal(res.status, 401);
            assert.match(res.body.message || res.body.error, /Invalid bootstrap secret/i);
        });

        it("should reject bootstrap if an admin already exists (409)", async () => {
            // Since admin already exists from test setup, bootstrap must be rejected
            const res = await request(app)
                .post("/admin/bootstrap")
                .set(viewerHeaders)
                .send({ secret: "super-secret-bootstrap-key-for-testing-123" });

            assert.equal(res.status, 409);
            assert.match(res.body.message || res.body.error, /already exists/i);
        });
    });

    describe("5. Public Endpoints Accessibility", () => {
        it("GET /matches remains publicly accessible without token", async () => {
            const res = await request(app).get("/matches");
            assert.equal(res.status, 200);
            assert.ok(Array.isArray(res.body.data));
        });

        it("GET /matches/:id remains publicly accessible without token", async () => {
            const res = await request(app).get(`/matches/${testMatchId}`);
            assert.equal(res.status, 200);
            assert.equal(res.body.data.id, testMatchId);
        });

        it("GET /matches/:id/commentary remains publicly accessible without token", async () => {
            const res = await request(app).get(`/matches/${testMatchId}/commentary`);
            assert.equal(res.status, 200);
            assert.ok(Array.isArray(res.body.data));
        });
    });
});
