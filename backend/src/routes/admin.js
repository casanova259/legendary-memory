import { Router } from "express";
import { requireAuth, requireRole } from "../middleware/auth.js";
import {
    bootstrapSchema,
    listUsersQuerySchema,
    updateUserRoleSchema,
    userIdParamSchema,
    setUserStatusSchema,
    inviteScorerSchema,
    assignScorerSchema,
    revokeAssignmentSchema,
    reassignScorerSchema,
    adminOverrideStatusSchema,
    adminCorrectEventSchema,
} from "../validation/admin.js";
import {
    matchIdParamSchema,
    createMatchSchema,
} from "../validation/matches.js";
import { eventIdParamSchema } from "../validation/scorer.js";
import {
    bootstrapFirstAdmin,
    listUsers,
    listScorers,
    updateUserRole,
    setUserActiveStatus,
    inviteScorer,
} from "../services/user.js";
import {
    assignScorer,
    revokeAssignment,
    reassignScorer,
    getActiveAssignment,
    getAssignmentHistory,
} from "../services/assignment.js";
import {
    adminOverrideMatchStatus,
    correctScoringEvent,
    getMatchEvents,
    getMatchInnings,
} from "../services/scoring.js";
import { getMatchAuditLogs, getAllAuditLogs } from "./../services/audit.js";
import { db } from "../db/db.js";
import { matches, users, matchAssignments } from "../db/schema.js";
import { count, desc, eq, or, and } from "drizzle-orm";
import { getMatchStatus } from "../utils/match-status.js";

export const adminRouter = Router();

/**
 * POST /bootstrap
 * One-time admin creation mechanism.
 */
adminRouter.post("/bootstrap", requireAuth, async (req, res, next) => {
    const parsed = bootstrapSchema.safeParse(req.body);
    if (!parsed.success) {
        return res.status(400).json({
            error: "Invalid request payload",
            details: parsed.error.issues,
        });
    }

    try {
        const adminUser = await bootstrapFirstAdmin({
            clerkId: req.auth.clerkId,
            email: req.auth.user?.email || null,
            displayName: req.auth.user?.displayName || null,
            secret: parsed.data.secret,
        });

        return res.status(200).json({
            message: "Administrator successfully bootstrapped",
            data: adminUser,
        });
    } catch (error) {
        next(error);
    }
});

// All subsequent routes require Admin role
adminRouter.use(requireAuth, requireRole("admin"));

/**
 * GET /dashboard
 * Returns top-level statistics for admin control center.
 */
adminRouter.get("/dashboard", async (req, res, next) => {
    try {
        const [matchesCount] = await db.select({ total: count() }).from(matches);
        const [liveMatchesCount] = await db.select({ total: count() }).from(matches).where(eq(matches.status, "live"));
        const [completedMatchesCount] = await db.select({ total: count() }).from(matches).where(
            or(eq(matches.status, "completed"), eq(matches.status, "finished"))
        );
        const [scheduledMatchesCount] = await db.select({ total: count() }).from(matches).where(eq(matches.status, "scheduled"));

        const [scorersCount] = await db.select({ total: count() }).from(users).where(eq(users.role, "scorer"));
        const [activeScorersCount] = await db.select({ total: count() }).from(users).where(
            and(eq(users.role, "scorer"), eq(users.isActive, true))
        );
        const [usersCount] = await db.select({ total: count() }).from(users);

        return res.status(200).json({
            data: {
                totalMatches: Number(matchesCount?.total || 0),
                liveMatches: Number(liveMatchesCount?.total || 0),
                completedMatches: Number(completedMatchesCount?.total || 0),
                scheduledMatches: Number(scheduledMatchesCount?.total || 0),
                totalScorers: Number(scorersCount?.total || 0),
                activeScorers: Number(activeScorersCount?.total || 0),
                totalUsers: Number(usersCount?.total || 0),
            },
        });
    } catch (error) {
        next(error);
    }
});

/**
 * GET /scorers
 * List all scorers with active/inactive status and assignment counts.
 */
adminRouter.get("/scorers", async (req, res, next) => {
    try {
        const result = await listScorers({
            limit: req.query.limit,
            offset: req.query.offset,
            activeOnly: req.query.activeOnly === "true",
        });

        return res.status(200).json({
            data: result.scorers,
            meta: {
                total: result.total,
                limit: result.limit,
                offset: result.offset,
            },
        });
    } catch (error) {
        next(error);
    }
});

/**
 * POST /scorers/invite
 * Invite a new scorer through Clerk.
 */
adminRouter.post("/scorers/invite", async (req, res, next) => {
    const parsed = inviteScorerSchema.safeParse(req.body);
    if (!parsed.success) {
        return res.status(400).json({
            error: "Invalid request payload",
            details: parsed.error.issues,
        });
    }

    try {
        const invitation = await inviteScorer({
            email: parsed.data.email,
            currentAdminClerkId: req.auth.clerkId,
        });

        return res.status(201).json({
            message: "Scorer invitation issued successfully",
            data: invitation,
        });
    } catch (error) {
        next(error);
    }
});

/**
 * PATCH /scorers/:id/status
 * Toggle scorer active/inactive status.
 */
adminRouter.patch("/scorers/:id/status", async (req, res, next) => {
    const paramParsed = userIdParamSchema.safeParse(req.params);
    if (!paramParsed.success) {
        return res.status(400).json({
            error: "Invalid scorer ID",
            details: paramParsed.error.issues,
        });
    }

    const bodyParsed = setUserStatusSchema.safeParse(req.body);
    if (!bodyParsed.success) {
        return res.status(400).json({
            error: "Invalid status payload",
            details: bodyParsed.error.issues,
        });
    }

    try {
        const updated = await setUserActiveStatus({
            targetUserId: paramParsed.data.id,
            isActive: bodyParsed.data.isActive,
            currentAdminClerkId: req.auth.clerkId,
        });

        return res.status(200).json({
            message: `Scorer account ${updated.isActive ? "activated" : "deactivated"}`,
            data: updated,
        });
    } catch (error) {
        next(error);
    }
});

/**
 * GET /users
 * List all users.
 */
adminRouter.get("/users", async (req, res, next) => {
    const parsed = listUsersQuerySchema.safeParse(req.query);
    if (!parsed.success) {
        return res.status(400).json({
            error: "Invalid query parameters",
            details: parsed.error.issues,
        });
    }

    try {
        const result = await listUsers(parsed.data);
        return res.status(200).json({
            data: result.users,
            meta: {
                total: result.total,
                limit: result.limit,
                offset: result.offset,
            },
        });
    } catch (error) {
        next(error);
    }
});

/**
 * PATCH /users/:id/role
 * Modify user application role.
 */
adminRouter.patch("/users/:id/role", async (req, res, next) => {
    const paramParsed = userIdParamSchema.safeParse(req.params);
    if (!paramParsed.success) {
        return res.status(400).json({
            error: "Invalid user ID",
            details: paramParsed.error.issues,
        });
    }

    const bodyParsed = updateUserRoleSchema.safeParse(req.body);
    if (!bodyParsed.success) {
        return res.status(400).json({
            error: "Invalid role payload",
            details: bodyParsed.error.issues,
        });
    }

    try {
        const updatedUser = await updateUserRole({
            targetUserId: paramParsed.data.id,
            newRole: bodyParsed.data.role,
            currentAdminClerkId: req.auth.clerkId,
        });

        return res.status(200).json({
            data: updatedUser,
            message: `User role successfully updated to ${updatedUser.role}`,
        });
    } catch (error) {
        next(error);
    }
});

/**
 * GET /matches
 * List all matches with active assignment and innings details.
 */
adminRouter.get("/matches", async (req, res, next) => {
    try {
        const limit = Math.min(Number(req.query.limit) || 50, 100);
        const offset = Math.max(Number(req.query.offset) || 0, 0);

        const rawMatches = await db
            .select()
            .from(matches)
            .orderBy(desc(matches.createdAt))
            .limit(limit)
            .offset(offset);

        // Fetch active assignments for matches
        const matchesWithAssignments = await Promise.all(
            rawMatches.map(async (m) => {
                const activeAssignment = await getActiveAssignment(m.id);
                return {
                    ...m,
                    activeAssignment,
                };
            })
        );

        return res.status(200).json({ data: matchesWithAssignments });
    } catch (error) {
        next(error);
    }
});

/**
 * POST /matches
 * Create a new match as Admin.
 */
adminRouter.post("/matches", async (req, res, next) => {
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
                createdById: req.auth.user.id,
            })
            .returning();

        if (res.app.locals.broadcastMatchCreated) {
            res.app.locals.broadcastMatchCreated(event);
        }

        return res.status(201).json({
            data: event,
            message: "Match created successfully",
        });
    } catch (error) {
        next(error);
    }
});

/**
 * POST /matches/:id/assign
 * Assign a scorer to a match.
 */
adminRouter.post("/matches/:id/assign", async (req, res, next) => {
    const paramParsed = matchIdParamSchema.safeParse(req.params);
    if (!paramParsed.success) {
        return res.status(400).json({
            error: "Invalid match ID",
            details: paramParsed.error.issues,
        });
    }

    const bodyParsed = assignScorerSchema.safeParse(req.body);
    if (!bodyParsed.success) {
        return res.status(400).json({
            error: "Invalid assignment payload",
            details: bodyParsed.error.issues,
        });
    }

    try {
        const assignment = await assignScorer({
            matchId: paramParsed.data.id,
            scorerId: bodyParsed.data.scorerId,
            assignedById: req.auth.user.id,
        });

        return res.status(201).json({
            message: "Scorer successfully assigned to match",
            data: assignment,
        });
    } catch (error) {
        next(error);
    }
});

/**
 * POST /matches/:id/revoke
 * Revoke active scorer assignment.
 */
adminRouter.post("/matches/:id/revoke", async (req, res, next) => {
    const paramParsed = matchIdParamSchema.safeParse(req.params);
    if (!paramParsed.success) {
        return res.status(400).json({
            error: "Invalid match ID",
            details: paramParsed.error.issues,
        });
    }

    const bodyParsed = revokeAssignmentSchema.safeParse(req.body || {});
    if (!bodyParsed.success) {
        return res.status(400).json({
            error: "Invalid revocation payload",
            details: bodyParsed.error.issues,
        });
    }

    try {
        const revoked = await revokeAssignment({
            matchId: paramParsed.data.id,
            revokedById: req.auth.user.id,
            reason: bodyParsed.data?.reason,
        });

        return res.status(200).json({
            message: "Scorer assignment successfully revoked",
            data: revoked,
        });
    } catch (error) {
        next(error);
    }
});

/**
 * POST /matches/:id/reassign
 * Atomically reassign match to a new scorer.
 */
adminRouter.post("/matches/:id/reassign", async (req, res, next) => {
    const paramParsed = matchIdParamSchema.safeParse(req.params);
    if (!paramParsed.success) {
        return res.status(400).json({
            error: "Invalid match ID",
            details: paramParsed.error.issues,
        });
    }

    const bodyParsed = reassignScorerSchema.safeParse(req.body);
    if (!bodyParsed.success) {
        return res.status(400).json({
            error: "Invalid reassignment payload",
            details: bodyParsed.error.issues,
        });
    }

    try {
        const newAssignment = await reassignScorer({
            matchId: paramParsed.data.id,
            newScorerId: bodyParsed.data.newScorerId,
            assignedById: req.auth.user.id,
            reason: bodyParsed.data.reason,
        });

        return res.status(200).json({
            message: "Match successfully reassigned to new scorer",
            data: newAssignment,
        });
    } catch (error) {
        next(error);
    }
});

/**
 * GET /matches/:id/assignments
 * View match assignment history.
 */
adminRouter.get("/matches/:id/assignments", async (req, res, next) => {
    const paramParsed = matchIdParamSchema.safeParse(req.params);
    if (!paramParsed.success) {
        return res.status(400).json({
            error: "Invalid match ID",
            details: paramParsed.error.issues,
        });
    }

    try {
        const history = await getAssignmentHistory(paramParsed.data.id);
        return res.status(200).json({ data: history });
    } catch (error) {
        next(error);
    }
});

/**
 * POST /matches/:id/status
 * Administrative match status override with mandatory audit reason.
 */
const handleStatusOverride = async (req, res, next) => {
    const paramParsed = matchIdParamSchema.safeParse(req.params);
    if (!paramParsed.success) {
        return res.status(400).json({
            error: "Invalid match ID",
            details: paramParsed.error.issues,
        });
    }

    const bodyParsed = adminOverrideStatusSchema.safeParse(req.body);
    if (!bodyParsed.success) {
        return res.status(400).json({
            error: "Invalid status override payload",
            details: bodyParsed.error.issues,
        });
    }

    try {
        const updated = await adminOverrideMatchStatus({
            matchId: paramParsed.data.id,
            newStatus: bodyParsed.data.status,
            reason: bodyParsed.data.reason,
            adminId: req.auth.user.id,
        });

        if (res.app.locals.broadcastMatchUpdated) {
            res.app.locals.broadcastMatchUpdated(updated);
        }

        return res.status(200).json({
            message: `Match status updated to ${updated.status}`,
            data: updated,
        });
    } catch (error) {
        next(error);
    }
};

adminRouter.post("/matches/:id/status", handleStatusOverride);
adminRouter.post("/matches/:id/status-override", handleStatusOverride);

/**
 * POST /matches/:id/events/:eventId/correct
 * Administrative scoring correction with mandatory audit reason.
 */
adminRouter.post("/matches/:id/events/:eventId/correct", async (req, res, next) => {
    const paramParsed = eventIdParamSchema.safeParse(req.params);
    if (!paramParsed.success) {
        return res.status(400).json({
            error: "Invalid match or event ID parameters",
            details: paramParsed.error.issues,
        });
    }

    const bodyParsed = adminCorrectEventSchema.safeParse(req.body);
    if (!bodyParsed.success) {
        return res.status(400).json({
            error: "Invalid correction payload",
            details: bodyParsed.error.issues,
        });
    }

    try {
        const result = await correctScoringEvent({
            matchId: paramParsed.data.id,
            eventId: paramParsed.data.eventId,
            reason: bodyParsed.data.reason,
            adminId: req.auth.user.id,
        });

        // Broadcast corrections over WebSocket
        if (res.app.locals.broadcastMatchUpdated) {
            res.app.locals.broadcastMatchUpdated(result.match);
        }
        if (res.app.locals.broadcastCorrection) {
            res.app.locals.broadcastCorrection(result.match.id, {
                eventId: paramParsed.data.eventId,
                recalculatedScore: {
                    homeScore: result.match.homeScore,
                    awayScore: result.match.awayScore,
                },
            });
        }
        if (res.app.locals.broadcastCommentary) {
            res.app.locals.broadcastCommentary(result.match.id, result.commentary);
        }

        return res.status(200).json({
            message: "Scoring event successfully corrected and reconciled",
            data: result,
        });
    } catch (error) {
        next(error);
    }
});

/**
 * GET /matches/:id/audit & GET /matches/:id/audit-logs
 * Retrieve audit log history for a match.
 */
const handleMatchAuditLogs = async (req, res, next) => {
    const paramParsed = matchIdParamSchema.safeParse(req.params);
    if (!paramParsed.success) {
        return res.status(400).json({
            error: "Invalid match ID",
            details: paramParsed.error.issues,
        });
    }

    try {
        const logs = await getMatchAuditLogs(paramParsed.data.id, req.query);
        return res.status(200).json({ data: logs });
    } catch (error) {
        next(error);
    }
};

adminRouter.get("/matches/:id/audit", handleMatchAuditLogs);
adminRouter.get("/matches/:id/audit-logs", handleMatchAuditLogs);

/**
 * GET /audit-logs & GET /audit
 * Retrieve all audit log history across matches.
 */
const handleAllAuditLogs = async (req, res, next) => {
    try {
        const logs = await getAllAuditLogs(req.query);
        return res.status(200).json({ data: logs });
    } catch (error) {
        next(error);
    }
};

adminRouter.get("/audit-logs", handleAllAuditLogs);
adminRouter.get("/audit", handleAllAuditLogs);
