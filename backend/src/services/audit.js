import { db } from "../db/db.js";
import { auditLogs } from "../db/schema.js";
import { desc, eq } from "drizzle-orm";

/**
 * Record an audit log entry for administrative or scoring actions.
 */
export async function createAuditLog({
    actorId = null,
    action,
    matchId = null,
    targetUserId = null,
    eventId = null,
    reason = null,
    details = null,
    tx = db,
}) {
    if (!action) {
        throw new Error("Audit action is required");
    }

    const [log] = await tx
        .insert(auditLogs)
        .values({
            actorId,
            action,
            matchId,
            targetUserId,
            eventId,
            reason: reason || null,
            details: details || null,
        })
        .returning();

    return log;
}

/**
 * Retrieve audit logs for a specific match.
 */
export async function getMatchAuditLogs(matchId, { limit = 50, offset = 0 } = {}) {
    const numericId = Number(matchId);
    if (!Number.isInteger(numericId) || numericId <= 0) return [];

    return await db
        .select()
        .from(auditLogs)
        .where(eq(auditLogs.matchId, numericId))
        .orderBy(desc(auditLogs.createdAt))
        .limit(Math.min(limit, 100))
        .offset(Math.max(offset, 0));
}

/**
 * Retrieve all audit logs globally.
 */
export async function getAllAuditLogs({ matchId = null, limit = 50, offset = 0 } = {}) {
    let query = db.select().from(auditLogs);
    if (matchId) {
        const numericId = Number(matchId);
        if (Number.isInteger(numericId) && numericId > 0) {
            query = query.where(eq(auditLogs.matchId, numericId));
        }
    }
    return await query
        .orderBy(desc(auditLogs.createdAt))
        .limit(Math.min(limit, 100))
        .offset(Math.max(offset, 0));
}
