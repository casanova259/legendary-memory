import { db } from "../db/db.js";
import { matchAssignments, matches, users } from "../db/schema.js";
import { eq, and, desc } from "drizzle-orm";
import { getUserById } from "./user.js";
import { createAuditLog } from "./audit.js";

/**
 * Assign a scorer to a match (Admin only).
 * Ensures:
 * 1. Match exists.
 * 2. Scorer exists, has role 'scorer', and is active.
 * 3. Scorer cannot assign themselves (actor cannot be the scorer).
 * 4. Only one active assignment per match at any time.
 */
export async function assignScorer({ matchId, scorerId, assignedById }) {
    const numericMatchId = Number(matchId);
    const numericScorerId = Number(scorerId);
    const numericAdminId = Number(assignedById);

    if (!numericMatchId || !numericScorerId) {
        const error = new Error("Valid matchId and scorerId are required");
        error.status = 400;
        throw error;
    }

    // Scorer cannot assign themselves
    if (numericAdminId && numericAdminId === numericScorerId) {
        const error = new Error("Scorers cannot assign themselves to matches");
        error.status = 400;
        throw error;
    }

    // Validate scorer
    const scorerUser = await getUserById(numericScorerId);
    if (!scorerUser) {
        const error = new Error("Scorer user account not found");
        error.status = 404;
        throw error;
    }

    if (scorerUser.role !== "scorer") {
        const error = new Error(`User is not a scorer (current role: ${scorerUser.role})`);
        error.status = 400;
        throw error;
    }

    if (!scorerUser.isActive) {
        const error = new Error("Cannot assign an inactive scorer");
        error.status = 400;
        throw error;
    }

    return await db.transaction(async (tx) => {
        // Lock match row to serialize assignment operations
        const [match] = await tx
            .select()
            .from(matches)
            .where(eq(matches.id, numericMatchId))
            .for("update");

        if (!match) {
            const error = new Error("Match not found");
            error.status = 404;
            throw error;
        }

        // Check if match already has an active assignment
        const [existingActive] = await tx
            .select()
            .from(matchAssignments)
            .where(
                and(
                    eq(matchAssignments.matchId, numericMatchId),
                    eq(matchAssignments.status, "active")
                )
            )
            .limit(1);

        if (existingActive) {
            const error = new Error(
                "Match already has an active assigned scorer. Revoke or reassign the match instead."
            );
            error.status = 409;
            throw error;
        }

        const [assignment] = await tx
            .insert(matchAssignments)
            .values({
                matchId: numericMatchId,
                scorerId: numericScorerId,
                assignedById: numericAdminId || null,
                status: "active",
                assignedAt: new Date(),
            })
            .returning();

        await createAuditLog({
            actorId: numericAdminId || null,
            action: "assign_scorer",
            matchId: numericMatchId,
            targetUserId: numericScorerId,
            details: { assignmentId: assignment.id },
            tx,
        });

        return assignment;
    });
}

/**
 * Revoke an active scorer assignment (Admin only).
 */
export async function revokeAssignment({ matchId, revokedById, reason = null }) {
    const numericMatchId = Number(matchId);
    const numericAdminId = Number(revokedById);

    return await db.transaction(async (tx) => {
        const [activeAssignment] = await tx
            .select()
            .from(matchAssignments)
            .where(
                and(
                    eq(matchAssignments.matchId, numericMatchId),
                    eq(matchAssignments.status, "active")
                )
            )
            .for("update");

        if (!activeAssignment) {
            const error = new Error("No active scorer assignment found for this match");
            error.status = 404;
            throw error;
        }

        const [revoked] = await tx
            .update(matchAssignments)
            .set({
                status: "revoked",
                revokedAt: new Date(),
            })
            .where(eq(matchAssignments.id, activeAssignment.id))
            .returning();

        await createAuditLog({
            actorId: numericAdminId || null,
            action: "revoke_assignment",
            matchId: numericMatchId,
            targetUserId: activeAssignment.scorerId,
            reason,
            details: { assignmentId: activeAssignment.id },
            tx,
        });

        return revoked;
    });
}

/**
 * Reassign a match to a new scorer (Admin only).
 * Atomically revokes current active assignment and assigns new scorer.
 */
export async function reassignScorer({ matchId, newScorerId, assignedById, reason = null }) {
    const numericMatchId = Number(matchId);
    const numericNewScorerId = Number(newScorerId);
    const numericAdminId = Number(assignedById);

    if (numericAdminId && numericAdminId === numericNewScorerId) {
        const error = new Error("Scorers cannot assign themselves to matches");
        error.status = 400;
        throw error;
    }

    const newScorer = await getUserById(numericNewScorerId);
    if (!newScorer) {
        const error = new Error("New scorer account not found");
        error.status = 404;
        throw error;
    }

    if (newScorer.role !== "scorer") {
        const error = new Error(`User is not a scorer (current role: ${newScorer.role})`);
        error.status = 400;
        throw error;
    }

    if (!newScorer.isActive) {
        const error = new Error("Cannot reassign to an inactive scorer");
        error.status = 400;
        throw error;
    }

    return await db.transaction(async (tx) => {
        // Lock match
        const [match] = await tx
            .select()
            .from(matches)
            .where(eq(matches.id, numericMatchId))
            .for("update");

        if (!match) {
            const error = new Error("Match not found");
            error.status = 404;
            throw error;
        }

        // Revoke any existing active assignment
        const [activeAssignment] = await tx
            .select()
            .from(matchAssignments)
            .where(
                and(
                    eq(matchAssignments.matchId, numericMatchId),
                    eq(matchAssignments.status, "active")
                )
            )
            .for("update");

        let previousScorerId = null;
        if (activeAssignment) {
            previousScorerId = activeAssignment.scorerId;
            await tx
                .update(matchAssignments)
                .set({
                    status: "revoked",
                    revokedAt: new Date(),
                })
                .where(eq(matchAssignments.id, activeAssignment.id));
        }

        // Create new active assignment
        const [newAssignment] = await tx
            .insert(matchAssignments)
            .values({
                matchId: numericMatchId,
                scorerId: numericNewScorerId,
                assignedById: numericAdminId || null,
                status: "active",
                assignedAt: new Date(),
            })
            .returning();

        await createAuditLog({
            actorId: numericAdminId || null,
            action: "reassign_scorer",
            matchId: numericMatchId,
            targetUserId: numericNewScorerId,
            reason,
            details: {
                previousAssignmentId: activeAssignment?.id || null,
                previousScorerId,
                newAssignmentId: newAssignment.id,
            },
            tx,
        });

        return newAssignment;
    });
}

/**
 * Retrieve active assignment for a match.
 */
export async function getActiveAssignment(matchId) {
    const numericMatchId = Number(matchId);
    if (!numericMatchId) return null;

    const [assignment] = await db
        .select({
            id: matchAssignments.id,
            matchId: matchAssignments.matchId,
            scorerId: matchAssignments.scorerId,
            assignedById: matchAssignments.assignedById,
            status: matchAssignments.status,
            assignedAt: matchAssignments.assignedAt,
            revokedAt: matchAssignments.revokedAt,
            scorer: {
                id: users.id,
                displayName: users.displayName,
                email: users.email,
                role: users.role,
                isActive: users.isActive,
            },
        })
        .from(matchAssignments)
        .leftJoin(users, eq(matchAssignments.scorerId, users.id))
        .where(
            and(
                eq(matchAssignments.matchId, numericMatchId),
                eq(matchAssignments.status, "active")
            )
        )
        .limit(1);

    return assignment || null;
}

/**
 * Check if a scorer is actively assigned to a match.
 */
export async function isScorerAssignedToMatch(matchId, scorerId) {
    const numericMatchId = Number(matchId);
    const numericScorerId = Number(scorerId);
    if (!numericMatchId || !numericScorerId) return false;

    const [assignment] = await db
        .select({ id: matchAssignments.id })
        .from(matchAssignments)
        .where(
            and(
                eq(matchAssignments.matchId, numericMatchId),
                eq(matchAssignments.scorerId, numericScorerId),
                eq(matchAssignments.status, "active")
            )
        )
        .limit(1);

    return Boolean(assignment);
}

/**
 * Retrieve complete assignment history for a match.
 */
export async function getAssignmentHistory(matchId) {
    const numericMatchId = Number(matchId);
    if (!numericMatchId) return [];

    return await db
        .select({
            id: matchAssignments.id,
            matchId: matchAssignments.matchId,
            scorerId: matchAssignments.scorerId,
            assignedById: matchAssignments.assignedById,
            status: matchAssignments.status,
            assignedAt: matchAssignments.assignedAt,
            revokedAt: matchAssignments.revokedAt,
            createdAt: matchAssignments.createdAt,
            scorerDisplayName: users.displayName,
            scorerEmail: users.email,
        })
        .from(matchAssignments)
        .leftJoin(users, eq(matchAssignments.scorerId, users.id))
        .where(eq(matchAssignments.matchId, numericMatchId))
        .orderBy(desc(matchAssignments.createdAt));
}

/**
 * Retrieve matches assigned to a scorer.
 */
export async function getAssignedMatchesForScorer(scorerId, { status = null, limit = 50, offset = 0 } = {}) {
    const numericScorerId = Number(scorerId);
    if (!numericScorerId) return [];

    const conditions = [
        eq(matchAssignments.scorerId, numericScorerId),
        eq(matchAssignments.status, "active"),
    ];

    if (status) {
        conditions.push(eq(matches.status, status));
    }

    const assignedList = await db
        .select({
            assignment: {
                id: matchAssignments.id,
                assignedAt: matchAssignments.assignedAt,
                status: matchAssignments.status,
            },
            match: matches,
        })
        .from(matchAssignments)
        .innerJoin(matches, eq(matchAssignments.matchId, matches.id))
        .where(and(...conditions))
        .orderBy(desc(matches.createdAt))
        .limit(Math.min(limit, 100))
        .offset(Math.max(offset, 0));

    return assignedList.map((item) => ({
        ...item.match,
        assignment: item.assignment,
    }));
}
