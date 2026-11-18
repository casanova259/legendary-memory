process.env.NODE_ENV = "test";
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import request from "supertest";
import { app } from "../src/app.js";

describe("Health & Diagnostics Probes", () => {
    it("GET /healthz should return 200 with status: ok", async () => {
        const res = await request(app).get("/healthz");
        assert.equal(res.status, 200);
        assert.equal(res.body.status, "ok");
        assert.ok(typeof res.body.uptime === "number");
        assert.ok(res.body.timestamp);
    });

    it("GET / should return 200 with service info", async () => {
        const res = await request(app).get("/");
        assert.equal(res.status, 200);
        assert.equal(res.body.name, "LivSportz API");
        assert.equal(res.body.status, "online");
    });
});

describe("Security Headers (Helmet)", () => {
    it("should set essential HTTP security headers", async () => {
        const res = await request(app).get("/healthz");
        assert.equal(res.headers["x-content-type-options"], "nosniff");
        assert.equal(res.headers["x-frame-options"], "SAMEORIGIN");
        assert.ok(res.headers["x-xss-protection"] !== undefined || res.headers["x-dns-prefetch-control"] !== undefined);
    });
});

describe("CORS Protection", () => {
    it("should allow requests with permitted origin (e.g. localhost:3000)", async () => {
        const res = await request(app)
            .get("/healthz")
            .set("Origin", "http://localhost:3000");

        assert.equal(res.status, 200);
        assert.equal(res.headers["access-control-allow-origin"], "http://localhost:3000");
        assert.equal(res.headers["access-control-allow-credentials"], "true");
    });

    it("should reject requests from unauthorized origins", async () => {
        const res = await request(app)
            .get("/healthz")
            .set("Origin", "http://malicious-website.com");

        assert.equal(res.status, 403);
        assert.equal(res.body.error, "CORS Forbidden");
    });

    it("should allow requests without an Origin header (curl / non-browser)", async () => {
        const res = await request(app).get("/healthz");
        assert.equal(res.status, 200);
    });
});

describe("404 Route Handling", () => {
    it("should return JSON 404 for unknown endpoints", async () => {
        const res = await request(app).get("/api/unknown-endpoint");
        assert.equal(res.status, 404);
        assert.equal(res.body.error, "Route not found");
        assert.equal(res.body.path, "/api/unknown-endpoint");
    });
});
