import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
    isValidIsoDateString,
    createMatchSchema,
    updateScoreSchema,
    matchIdParamSchema,
    listMatchesQuerySchema,
} from "../src/validation/matches.js";
import {
    createCommentarySchema,
    listCommentaryQuerySchema,
} from "../src/validation/commentary.js";

describe("ISO Date Validation (isValidIsoDateString)", () => {
    it("should accept valid UTC ISO date without milliseconds", () => {
        assert.equal(isValidIsoDateString("2026-11-17T12:00:00Z"), true);
    });

    it("should accept valid UTC ISO date with milliseconds", () => {
        assert.equal(isValidIsoDateString("2026-11-17T12:00:00.000Z"), true);
    });

    it("should accept valid ISO date with positive timezone offset (+05:30)", () => {
        assert.equal(isValidIsoDateString("2026-11-17T17:30:00+05:30"), true);
    });

    it("should accept valid ISO date with negative timezone offset (-08:00)", () => {
        assert.equal(isValidIsoDateString("2026-11-17T04:00:00-08:00"), true);
    });

    it("should reject impossible calendar dates (e.g. Feb 31)", () => {
        assert.equal(isValidIsoDateString("2026-02-31T12:00:00Z"), false);
    });

    it("should reject impossible months (e.g. month 13)", () => {
        assert.equal(isValidIsoDateString("2026-13-45T12:00:00Z"), false);
    });

    it("should reject leap day on non-leap years (2026-02-29)", () => {
        assert.equal(isValidIsoDateString("2026-02-29T12:00:00Z"), false);
    });

    it("should accept leap day on leap years (2024-02-29)", () => {
        assert.equal(isValidIsoDateString("2024-02-29T12:00:00Z"), true);
    });

    it("should reject arbitrary non-date strings", () => {
        assert.equal(isValidIsoDateString("not-a-date"), false);
        assert.equal(isValidIsoDateString("2026-11-17"), false);
        assert.equal(isValidIsoDateString(""), false);
        assert.equal(isValidIsoDateString(null), false);
    });
});

describe("Match Schemas Validation", () => {
    it("should validate createMatchSchema with valid ISO dates and positive duration", () => {
        const validMatch = {
            sport: "Football",
            homeTeam: "Arsenal",
            awayTeam: "Chelsea",
            startTime: "2026-11-17T12:00:00Z",
            endTime: "2026-11-17T14:00:00Z",
            homeScore: 0,
            awayScore: 0,
        };

        const result = createMatchSchema.safeParse(validMatch);
        assert.equal(result.success, true);
    });

    it("should reject createMatchSchema when endTime is before or equal to startTime", () => {
        const invalidMatch = {
            sport: "Football",
            homeTeam: "Arsenal",
            awayTeam: "Chelsea",
            startTime: "2026-11-17T14:00:00Z",
            endTime: "2026-11-17T12:00:00Z",
        };

        const result = createMatchSchema.safeParse(invalidMatch);
        assert.equal(result.success, false);
        const endTimeIssue = result.error.issues.find((i) => i.path.includes("endTime"));
        assert.ok(endTimeIssue);
    });

    it("should validate matchIdParamSchema with positive integer", () => {
        assert.equal(matchIdParamSchema.safeParse({ id: "42" }).success, true);
        assert.equal(matchIdParamSchema.safeParse({ id: 42 }).success, true);
        assert.equal(matchIdParamSchema.safeParse({ id: "-5" }).success, false);
        assert.equal(matchIdParamSchema.safeParse({ id: "abc" }).success, false);
    });

    it("should validate listMatchesQuerySchema limits", () => {
        assert.equal(listMatchesQuerySchema.safeParse({ limit: "25" }).success, true);
        assert.equal(listMatchesQuerySchema.safeParse({ limit: "150" }).success, false);
        assert.equal(listMatchesQuerySchema.safeParse({ limit: "-1" }).success, false);
    });
});

describe("Score Update Validation (updateScoreSchema)", () => {
    it("should accept zero and positive integers", () => {
        const result = updateScoreSchema.safeParse({ homeScore: 3, awayScore: 2 });
        assert.equal(result.success, true);
        assert.equal(result.data.homeScore, 3);
        assert.equal(result.data.awayScore, 2);
    });

    it("should coerce string numbers properly", () => {
        const result = updateScoreSchema.safeParse({ homeScore: "0", awayScore: "1" });
        assert.equal(result.success, true);
        assert.equal(result.data.homeScore, 0);
        assert.equal(result.data.awayScore, 1);
    });

    it("should reject negative scores", () => {
        const result = updateScoreSchema.safeParse({ homeScore: -1, awayScore: 2 });
        assert.equal(result.success, false);
    });

    it("should reject floating-point / decimal scores", () => {
        const result = updateScoreSchema.safeParse({ homeScore: 1.5, awayScore: 2 });
        assert.equal(result.success, false);
    });

    it("should reject missing score fields", () => {
        assert.equal(updateScoreSchema.safeParse({ homeScore: 1 }).success, false);
        assert.equal(updateScoreSchema.safeParse({}).success, false);
    });
});

describe("Commentary Schemas Validation", () => {
    it("should accept valid commentary payload", () => {
        const payload = {
            minute: 45,
            sequence: 1,
            period: "1st Half",
            eventType: "goal",
            message: "Goal scored by Saka!",
            actor: "Saka",
            team: "Arsenal",
            metadata: { distance: 25 },
            tags: ["goal", "highlight"],
        };

        const result = createCommentarySchema.safeParse(payload);
        assert.equal(result.success, true);
    });

    it("should reject commentary payload missing required message", () => {
        const payload = {
            minute: 10,
            sequence: 1,
            period: "1st Half",
            eventType: "foul",
        };

        const result = createCommentarySchema.safeParse(payload);
        assert.equal(result.success, false);
    });

    it("should validate listCommentaryQuerySchema limit", () => {
        assert.equal(listCommentaryQuerySchema.safeParse({ limit: "50" }).success, true);
        assert.equal(listCommentaryQuerySchema.safeParse({ limit: "500" }).success, false);
    });
});
