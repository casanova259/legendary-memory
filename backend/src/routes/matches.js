import { Router } from "express";
import {
    createMatchSchema,
    listMatchesQuerySchema,
    matchIdParamSchema,
    updateScoreSchema,
} from "../validation/matches.js";
import { db } from "../db/db.js";
import { matches } from "../db/schema.js";
import { desc, eq } from "drizzle-orm";
import {
    getMatchStatus,
    syncMatchStatus,
    syncMatchesStatuses,
} from "../utils/match-status.js";

export const matchRouter = Router();

const MAX_LIMIT = 100;

// GET /matches
matchRouter.get("/", async (req, res, next) => {
    const parsed = listMatchesQuerySchema.safeParse(req.query);

    if (!parsed.success) {
        return res.status(400).json({
            error: "Invalid query parameters",
            details: parsed.error.issues,
        });
    }

    const limit = Math.min(parsed.data.limit ?? 50, MAX_LIMIT);

    try {
        const rawMatches = await db
            .select()
            .from(matches)
            .orderBy(desc(matches.createdAt))
            .limit(limit);

        const data = await syncMatchesStatuses(rawMatches, db);

        return res.status(200).json({ data });
    } catch (error) {
        next(error);
    }
});

// GET /matches/:id
matchRouter.get("/:id", async (req, res, next) => {
    const paramsParsed = matchIdParamSchema.safeParse(req.params);

    if (!paramsParsed.success) {
        return res.status(400).json({
            error: "Invalid match ID",
            details: paramsParsed.error.issues,
        });
    }

    try {
        const [match] = await db
            .select()
            .from(matches)
            .where(eq(matches.id, paramsParsed.data.id))
            .limit(1);

        if (!match) {
            return res.status(404).json({
                error: "Match not found",
            });
        }

        const data = await syncMatchStatus(match, db);

        return res.status(200).json({ data });
    } catch (error) {
        next(error);
    }
});

// POST /matches
matchRouter.post("/", async (req, res, next) => {
    const parsed = createMatchSchema.safeParse(req.body);

    if (!parsed.success) {
        return res.status(400).json({
            error: "Invalid match payload",
            details: parsed.error.issues,
        });
    }

    const { startTime, endTime, homeScore, awayScore } = parsed.data;
    const initialStatus = getMatchStatus(startTime, endTime) || "scheduled";

    try {
        const [event] = await db
            .insert(matches)
            .values({
                ...parsed.data,
                status: initialStatus,
                startTime: new Date(startTime),
                endTime: new Date(endTime),
                homeScore: homeScore ?? 0,
                awayScore: awayScore ?? 0,
            })
            .returning();

        if (res.app.locals.broadcastMatchCreated) {
            res.app.locals.broadcastMatchCreated(event);
        }

        return res.status(201).json({
            data: event,
        });
    } catch (error) {
        next(error);
    }
});

// PATCH /matches/:id/score
matchRouter.patch("/:id/score", async (req, res, next) => {
    const paramsParsed = matchIdParamSchema.safeParse(req.params);

    if (!paramsParsed.success) {
        return res.status(400).json({
            error: "Invalid match ID",
            details: paramsParsed.error.issues,
        });
    }

    const bodyParsed = updateScoreSchema.safeParse(req.body);

    if (!bodyParsed.success) {
        return res.status(400).json({
            error: "Invalid score payload",
            details: bodyParsed.error.issues,
        });
    }

    const matchId = paramsParsed.data.id;
    const { homeScore, awayScore } = bodyParsed.data;

    try {
        const [updated] = await db
            .update(matches)
            .set({
                homeScore,
                awayScore,
            })
            .where(eq(matches.id, matchId))
            .returning();

        if (!updated) {
            return res.status(404).json({
                error: "Match not found",
            });
        }

        // Realtime score update broadcast
        if (req.app.locals.broadcastMatchUpdated) {
            req.app.locals.broadcastMatchUpdated(updated);
        }

        return res.status(200).json({
            data: updated,
        });
    } catch (error) {
        next(error);
    }
});