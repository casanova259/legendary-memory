import { Router } from "express";
import { requireAuth, requireRole, requireAssignedScorer } from "../middleware/auth.js";
import {
    scoringEventSchema,
    createInningsSchema,
} from "../validation/scorer.js";
import { matchIdParamSchema } from "../validation/matches.js";
import {
    getAssignedMatchesForScorer,
    getActiveAssignment,
    isScorerAssignedToMatch,
} from "../services/assignment.js";
import {
    startMatch,
    pauseMatch,
    resumeMatch,
    completeMatch,
    createOrStartInnings,
    recordScoringEvent,
    getMatchEvents,
    getMatchInnings,
} from "../services/scoring.js";
import { db } from "../db/db.js";
import { matches, matchInnings } from "../db/schema.js";
import { eq } from "drizzle-orm";

export const scorerRouter = Router();

// Require authenticated user with scorer or admin role
scorerRouter.use(requireAuth, requireRole("scorer", "admin"));

/**
 * GET /dashboard
 * Scorer dashboard summary.
 */
scorerRouter.get("/dashboard", async (req, res, next) => {
    try {
        const userId = req.auth.user.id;
        const assignedMatches = await getAssignedMatchesForScorer(userId);

        const liveCount = assignedMatches.filter((m) => m.status === "live").length;
        const scheduledCount = assignedMatches.filter((m) => m.status === "scheduled").length;
        const completedCount = assignedMatches.filter((m) => m.status === "completed" || m.status === "finished").length;

        return res.status(200).json({
            data: {
                totalAssigned: assignedMatches.length,
                liveMatches: liveCount,
                scheduledMatches: scheduledCount,
                completedMatches: completedCount,
                recentMatches: assignedMatches.slice(0, 5),
            },
        });
    } catch (error) {
        next(error);
    }
});

/**
 * GET /matches
 * List all matches assigned to the authenticated scorer.
 */
scorerRouter.get("/matches", async (req, res, next) => {
    try {
        const userId = req.auth.user.id;
        const { status, limit, offset } = req.query;

        const assignedMatches = await getAssignedMatchesForScorer(userId, {
            status,
            limit: Number(limit) || 50,
            offset: Number(offset) || 0,
        });

        return res.status(200).json({ data: assignedMatches });
    } catch (error) {
        next(error);
    }
});

/**
 * GET /matches/:id
 * Retrieve assigned match details, current innings, and recent scoring events.
 */
scorerRouter.get("/matches/:id", requireAssignedScorer(), async (req, res, next) => {
    const paramParsed = matchIdParamSchema.safeParse(req.params);
    if (!paramParsed.success) {
        return res.status(400).json({
            error: "Invalid match ID",
            details: paramParsed.error.issues,
        });
    }

    try {
        const matchId = paramParsed.data.id;
        const [match] = await db
            .select()
            .from(matches)
            .where(eq(matches.id, matchId))
            .limit(1);

        if (!match) {
            return res.status(404).json({ error: "Match not found" });
        }

        const activeAssignment = await getActiveAssignment(matchId);
        const inningsList = await getMatchInnings(matchId);
        const recentEvents = await getMatchEvents(matchId, { limit: 20 });

        return res.status(200).json({
            data: {
                match,
                assignment: activeAssignment,
                innings: inningsList,
                recentEvents,
            },
        });
    } catch (error) {
        next(error);
    }
});

/**
 * POST /matches/:id/start
 * Start a scheduled match.
 */
scorerRouter.post("/matches/:id/start", requireAssignedScorer(), async (req, res, next) => {
    const paramParsed = matchIdParamSchema.safeParse(req.params);
    if (!paramParsed.success) {
        return res.status(400).json({
            error: "Invalid match ID",
            details: paramParsed.error.issues,
        });
    }

    try {
        const result = await startMatch({
            matchId: paramParsed.data.id,
            actorId: req.auth.user.id,
            actorRole: req.auth.user.role,
        });

        if (res.app.locals.broadcastMatchStarted) {
            res.app.locals.broadcastMatchStarted(result.match, result.innings);
        }

        return res.status(200).json({
            message: "Match successfully started and innings initialized",
            data: result,
        });
    } catch (error) {
        next(error);
    }
});

/**
 * POST /matches/:id/pause
 * Pause a live match.
 */
scorerRouter.post("/matches/:id/pause", requireAssignedScorer(), async (req, res, next) => {
    const paramParsed = matchIdParamSchema.safeParse(req.params);
    if (!paramParsed.success) {
        return res.status(400).json({
            error: "Invalid match ID",
            details: paramParsed.error.issues,
        });
    }

    try {
        const updated = await pauseMatch({
            matchId: paramParsed.data.id,
            actorId: req.auth.user.id,
            actorRole: req.auth.user.role,
        });

        if (res.app.locals.broadcastMatchPaused) {
            res.app.locals.broadcastMatchPaused(updated);
        }

        return res.status(200).json({
            message: "Match paused",
            data: updated,
        });
    } catch (error) {
        next(error);
    }
});

/**
 * POST /matches/:id/resume
 * Resume a paused match.
 */
scorerRouter.post("/matches/:id/resume", requireAssignedScorer(), async (req, res, next) => {
    const paramParsed = matchIdParamSchema.safeParse(req.params);
    if (!paramParsed.success) {
        return res.status(400).json({
            error: "Invalid match ID",
            details: paramParsed.error.issues,
        });
    }

    try {
        const updated = await resumeMatch({
            matchId: paramParsed.data.id,
            actorId: req.auth.user.id,
            actorRole: req.auth.user.role,
        });

        if (res.app.locals.broadcastMatchResumed) {
            res.app.locals.broadcastMatchResumed(updated);
        }

        return res.status(200).json({
            message: "Match resumed",
            data: updated,
        });
    } catch (error) {
        next(error);
    }
});

/**
 * POST /matches/:id/complete
 * Complete a match.
 */
scorerRouter.post("/matches/:id/complete", requireAssignedScorer(), async (req, res, next) => {
    const paramParsed = matchIdParamSchema.safeParse(req.params);
    if (!paramParsed.success) {
        return res.status(400).json({
            error: "Invalid match ID",
            details: paramParsed.error.issues,
        });
    }

    try {
        const updated = await completeMatch({
            matchId: paramParsed.data.id,
            actorId: req.auth.user.id,
            actorRole: req.auth.user.role,
        });

        if (res.app.locals.broadcastMatchCompleted) {
            res.app.locals.broadcastMatchCompleted(updated);
        }

        return res.status(200).json({
            message: "Match marked as completed",
            data: updated,
        });
    } catch (error) {
        next(error);
    }
});

/**
 * POST /matches/:id/innings
 * Start a new innings (e.g. Innings 2).
 */
scorerRouter.post("/matches/:id/innings", requireAssignedScorer(), async (req, res, next) => {
    const paramParsed = matchIdParamSchema.safeParse(req.params);
    if (!paramParsed.success) {
        return res.status(400).json({
            error: "Invalid match ID",
            details: paramParsed.error.issues,
        });
    }

    const bodyParsed = createInningsSchema.safeParse(req.body);
    if (!bodyParsed.success) {
        return res.status(400).json({
            error: "Invalid innings payload",
            details: bodyParsed.error.issues,
        });
    }

    try {
        const innings = await createOrStartInnings({
            matchId: paramParsed.data.id,
            inningsNumber: bodyParsed.data.inningsNumber,
            battingTeam: bodyParsed.data.battingTeam,
            bowlingTeam: bodyParsed.data.bowlingTeam,
            target: bodyParsed.data.target,
            actorId: req.auth.user.id,
        });

        return res.status(201).json({
            message: `Innings ${innings.inningsNumber} started`,
            data: innings,
        });
    } catch (error) {
        next(error);
    }
});

/**
 * POST /matches/:id/events
 * Record a cricket scoring event (ball-by-ball).
 * Full transactional integrity, idempotency, and automated commentary.
 */
scorerRouter.post("/matches/:id/events", requireAssignedScorer(), async (req, res, next) => {
    const paramParsed = matchIdParamSchema.safeParse(req.params);
    if (!paramParsed.success) {
        return res.status(400).json({
            error: "Invalid match ID",
            details: paramParsed.error.issues,
        });
    }

    const bodyParsed = scoringEventSchema.safeParse(req.body);
    if (!bodyParsed.success) {
        return res.status(400).json({
            error: "Invalid scoring event payload",
            details: bodyParsed.error.issues,
        });
    }

    try {
        const result = await recordScoringEvent({
            matchId: paramParsed.data.id,
            scorerId: req.auth.user.id,
            ...bodyParsed.data,
            actorRole: req.auth.user.role,
        });

        // Broadcast events over WebSocket (strictly post-commit)
        if (!result.isIdempotentReplay) {
            if (res.app.locals.broadcastMatchUpdated) {
                res.app.locals.broadcastMatchUpdated(result.match);
            }

            if (res.app.locals.broadcastCommentary && result.commentary) {
                res.app.locals.broadcastCommentary(result.match.id, result.commentary);
            }

            if (result.event.wicketType !== "none" && res.app.locals.broadcastWicket) {
                res.app.locals.broadcastWicket(result.match.id, result.event);
            }

            if (result.innings.status === "completed" && res.app.locals.broadcastInningsCompleted) {
                res.app.locals.broadcastInningsCompleted(result.match.id, result.innings);
            }
        }

        return res.status(201).json({
            message: result.isIdempotentReplay
                ? "Scoring event already processed (idempotent response)"
                : "Scoring event recorded successfully",
            data: result,
        });
    } catch (error) {
        next(error);
    }
});

/**
 * GET /matches/:id/events
 * Retrieve scoring event history for an assigned match.
 */
scorerRouter.get("/matches/:id/events", requireAssignedScorer(), async (req, res, next) => {
    const paramParsed = matchIdParamSchema.safeParse(req.params);
    if (!paramParsed.success) {
        return res.status(400).json({
            error: "Invalid match ID",
            details: paramParsed.error.issues,
        });
    }

    try {
        const events = await getMatchEvents(paramParsed.data.id, {
            inningsId: req.query.inningsId,
            limit: req.query.limit,
            offset: req.query.offset,
        });

        return res.status(200).json({ data: events });
    } catch (error) {
        next(error);
    }
});
