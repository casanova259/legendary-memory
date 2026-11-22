import { db } from "../db/db.js";
import {
    matches,
    matchInnings,
    matchEvents,
    commentary,
    matchAssignments,
} from "../db/schema.js";
import { eq, and, desc, sql } from "drizzle-orm";
import { createAuditLog } from "./audit.js";

/**
 * Format legal deliveries into standard cricket overs representation.
 * e.g. 0 balls -> "0.0", 5 balls -> "0.5", 6 balls -> "1.0", 16 balls -> "2.4"
 */
export function formatOvers(legalBalls) {
    const safeBalls = Math.max(Number(legalBalls) || 0, 0);
    const completedOvers = Math.floor(safeBalls / 6);
    const ballsInCurrentOver = safeBalls % 6;
    return `${completedOvers}.${ballsInCurrentOver}`;
}

/**
 * Start a cricket match and initialize its first innings.
 */
export async function startMatch({ matchId, actorId, actorRole }) {
    const numericMatchId = Number(matchId);

    return await db.transaction(async (tx) => {
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

        if (match.status !== "scheduled" && match.status !== "paused") {
            const error = new Error(`Cannot start match in status '${match.status}'. Must be 'scheduled' or 'paused'.`);
            error.status = 400;
            throw error;
        }

        // Verify active assignment if actor is scorer
        if (actorRole === "scorer") {
            const [activeAssignment] = await tx
                .select({ id: matchAssignments.id })
                .from(matchAssignments)
                .where(
                    and(
                        eq(matchAssignments.matchId, numericMatchId),
                        eq(matchAssignments.scorerId, actorId),
                        eq(matchAssignments.status, "active")
                    )
                )
                .limit(1);

            if (!activeAssignment) {
                const error = new Error("You are not the active assigned scorer for this match");
                error.status = 403;
                throw error;
            }
        }

        // Check if an innings already exists
        let [currentInnings] = await tx
            .select()
            .from(matchInnings)
            .where(
                and(
                    eq(matchInnings.matchId, numericMatchId),
                    eq(matchInnings.status, "live")
                )
            )
            .limit(1);

        if (!currentInnings) {
            // Check if Innings 1 exists in upcoming
            const [existingInnings1] = await tx
                .select()
                .from(matchInnings)
                .where(
                    and(
                        eq(matchInnings.matchId, numericMatchId),
                        eq(matchInnings.inningsNumber, 1)
                    )
                )
                .limit(1);

            if (existingInnings1) {
                const [updatedInnings] = await tx
                    .update(matchInnings)
                    .set({ status: "live", updatedAt: new Date() })
                    .where(eq(matchInnings.id, existingInnings1.id))
                    .returning();
                currentInnings = updatedInnings;
            } else {
                // Initialize Innings 1 (Home team bats first by default)
                const [newInnings] = await tx
                    .insert(matchInnings)
                    .values({
                        matchId: numericMatchId,
                        inningsNumber: 1,
                        battingTeam: match.homeTeam,
                        bowlingTeam: match.awayTeam,
                        totalRuns: 0,
                        wickets: 0,
                        legalBalls: 0,
                        extras: 0,
                        status: "live",
                    })
                    .returning();
                currentInnings = newInnings;
            }
        }

        const [updatedMatch] = await tx
            .update(matches)
            .set({
                status: "live",
                currentInningsId: currentInnings.id,
            })
            .where(eq(matches.id, numericMatchId))
            .returning();

        await createAuditLog({
            actorId,
            action: "start_match",
            matchId: numericMatchId,
            details: { previousStatus: match.status, newStatus: "live", inningsId: currentInnings.id },
            tx,
        });

        return {
            match: updatedMatch,
            innings: currentInnings,
        };
    });
}

/**
 * Pause a live match.
 */
export async function pauseMatch({ matchId, actorId, actorRole }) {
    const numericMatchId = Number(matchId);

    return await db.transaction(async (tx) => {
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

        if (match.status !== "live") {
            const error = new Error(`Cannot pause match in status '${match.status}'. Must be 'live'.`);
            error.status = 400;
            throw error;
        }

        const [updated] = await tx
            .update(matches)
            .set({ status: "paused" })
            .where(eq(matches.id, numericMatchId))
            .returning();

        await createAuditLog({
            actorId,
            action: "pause_match",
            matchId: numericMatchId,
            details: { previousStatus: "live", newStatus: "paused" },
            tx,
        });

        return updated;
    });
}

/**
 * Resume a paused match.
 */
export async function resumeMatch({ matchId, actorId, actorRole }) {
    const numericMatchId = Number(matchId);

    return await db.transaction(async (tx) => {
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

        if (match.status !== "paused") {
            const error = new Error(`Cannot resume match in status '${match.status}'. Must be 'paused'.`);
            error.status = 400;
            throw error;
        }

        const [updated] = await tx
            .update(matches)
            .set({ status: "live" })
            .where(eq(matches.id, numericMatchId))
            .returning();

        await createAuditLog({
            actorId,
            action: "resume_match",
            matchId: numericMatchId,
            details: { previousStatus: "paused", newStatus: "live" },
            tx,
        });

        return updated;
    });
}

/**
 * Complete a match.
 */
export async function completeMatch({ matchId, actorId, actorRole }) {
    const numericMatchId = Number(matchId);

    return await db.transaction(async (tx) => {
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

        if (match.status !== "live" && match.status !== "paused") {
            const error = new Error(`Cannot complete match in status '${match.status}'.`);
            error.status = 400;
            throw error;
        }

        // Complete any active innings
        if (match.currentInningsId) {
            await tx
                .update(matchInnings)
                .set({ status: "completed", updatedAt: new Date() })
                .where(eq(matchInnings.id, match.currentInningsId));
        }

        const [updated] = await tx
            .update(matches)
            .set({
                status: "completed",
                endTime: new Date(),
            })
            .where(eq(matches.id, numericMatchId))
            .returning();

        await createAuditLog({
            actorId,
            action: "complete_match",
            matchId: numericMatchId,
            details: { previousStatus: match.status, newStatus: "completed" },
            tx,
        });

        return updated;
    });
}

/**
 * Administrative match status override (Admin only).
 */
export async function adminOverrideMatchStatus({ matchId, newStatus, reason, adminId }) {
    const numericMatchId = Number(matchId);

    const validTransitions = [
        "scheduled",
        "live",
        "paused",
        "completed",
        "abandoned",
        "finished",
    ];

    if (!validTransitions.includes(newStatus)) {
        const error = new Error(`Invalid status '${newStatus}'`);
        error.status = 400;
        throw error;
    }

    if (!reason || reason.trim().length < 3) {
        const error = new Error("A valid reason of at least 3 characters is mandatory for administrative status override");
        error.status = 400;
        throw error;
    }

    return await db.transaction(async (tx) => {
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

        const normalizedStatus = newStatus === "finished" ? "completed" : newStatus;

        const [updated] = await tx
            .update(matches)
            .set({
                status: normalizedStatus,
                ...(normalizedStatus === "completed" || normalizedStatus === "abandoned" ? { endTime: new Date() } : {}),
            })
            .where(eq(matches.id, numericMatchId))
            .returning();

        await createAuditLog({
            actorId: adminId,
            action: "admin_override_match_status",
            matchId: numericMatchId,
            reason: reason.trim(),
            details: { previousStatus: match.status, newStatus: normalizedStatus },
            tx,
        });

        return updated;
    });
}

/**
 * Create or activate a cricket innings for a match.
 */
export async function createOrStartInnings({ matchId, inningsNumber, battingTeam, bowlingTeam, target = null, actorId }) {
    const numericMatchId = Number(matchId);
    const numericInningsNum = Number(inningsNumber);

    return await db.transaction(async (tx) => {
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

        // Close any currently live innings
        if (match.currentInningsId) {
            await tx
                .update(matchInnings)
                .set({ status: "completed", updatedAt: new Date() })
                .where(eq(matchInnings.id, match.currentInningsId));
        }

        const [newInnings] = await tx
            .insert(matchInnings)
            .values({
                matchId: numericMatchId,
                inningsNumber: numericInningsNum,
                battingTeam,
                bowlingTeam: bowlingTeam || (battingTeam === match.homeTeam ? match.awayTeam : match.homeTeam),
                totalRuns: 0,
                wickets: 0,
                legalBalls: 0,
                extras: 0,
                status: "live",
                target: target ? Number(target) : null,
            })
            .returning();

        await tx
            .update(matches)
            .set({ currentInningsId: newInnings.id })
            .where(eq(matches.id, numericMatchId));

        await createAuditLog({
            actorId,
            action: "start_innings",
            matchId: numericMatchId,
            details: { inningsNumber: numericInningsNum, battingTeam, inningsId: newInnings.id },
            tx,
        });

        return newInnings;
    });
}

/**
 * Record a cricket scoring event transactionally.
 * Follows strict cricket laws:
 * - Legal deliveries vs illegals (wides, no-balls).
 * - Extras calculation.
 * - Dismissals and wicket counting.
 * - Idempotency by (scorerId, idempotencyKey).
 * - Automatic commentary generation.
 */
export async function recordScoringEvent({
    matchId,
    scorerId,
    eventType = "ball",
    runsOffBat = 0,
    extrasType = "none",
    extrasRuns = 0,
    isLegalDelivery: requestedLegalDelivery,
    wicketType = "none",
    dismissedPlayer = null,
    batter = null,
    bowler = null,
    idempotencyKey,
    actorRole = "scorer",
}) {
    const numericMatchId = Number(matchId);
    const numericScorerId = Number(scorerId);

    if (!idempotencyKey || typeof idempotencyKey !== "string" || idempotencyKey.trim().length === 0) {
        const error = new Error("idempotencyKey is required for scoring events");
        error.status = 400;
        throw error;
    }

    return await db.transaction(async (tx) => {
        // 1. Idempotency Check: prevent duplicate event processing
        const [existingEvent] = await tx
            .select()
            .from(matchEvents)
            .where(
                and(
                    eq(matchEvents.scorerId, numericScorerId),
                    eq(matchEvents.idempotencyKey, idempotencyKey)
                )
            )
            .limit(1);

        if (existingEvent) {
            // Already processed; return existing record safely without applying runs again
            const [currentInnings] = await tx
                .select()
                .from(matchInnings)
                .where(eq(matchInnings.id, existingEvent.inningsId))
                .limit(1);

            const [currentMatch] = await tx
                .select()
                .from(matches)
                .where(eq(matches.id, numericMatchId))
                .limit(1);

            return {
                event: existingEvent,
                innings: currentInnings,
                match: currentMatch,
                isIdempotentReplay: true,
            };
        }

        // 2. Lock Match Row
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

        if (match.status !== "live") {
            const error = new Error(`Cannot score in match with status '${match.status}'. Match must be 'live'.`);
            error.status = 400;
            throw error;
        }

        // 3. Verify Scorer Assignment if actor is scorer
        if (actorRole === "scorer") {
            const [assignment] = await tx
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

            if (!assignment) {
                const error = new Error("Scorer is not actively assigned to this match");
                error.status = 403;
                throw error;
            }
        }

        // 4. Lock Active Innings Row
        if (!match.currentInningsId) {
            const error = new Error("No active innings found for this match. Start an innings first.");
            error.status = 400;
            throw error;
        }

        const [innings] = await tx
            .select()
            .from(matchInnings)
            .where(eq(matchInnings.id, match.currentInningsId))
            .for("update");

        if (!innings || innings.status !== "live") {
            const error = new Error("Active innings is not in 'live' state");
            error.status = 400;
            throw error;
        }

        // 5. Cricket Rules Validation & Calculation
        const runsBat = Math.max(Number(runsOffBat) || 0, 0);
        let extRuns = Math.max(Number(extrasRuns) || 0, 0);

        // Standard cricket law: wides and no-balls automatically yield at least 1 extra run
        if ((extrasType === "wide" || extrasType === "no_ball") && extRuns === 0) {
            extRuns = 1;
        }

        const isLegal =
            typeof requestedLegalDelivery === "boolean"
                ? requestedLegalDelivery
                : extrasType !== "wide" && extrasType !== "no_ball";

        const totalEventRuns = runsBat + extRuns;

        // Wicket validation
        const isWicket = wicketType && wicketType !== "none";
        if (isWicket && innings.wickets >= 10) {
            const error = new Error("Innings is already all-out (10 wickets reached)");
            error.status = 400;
            throw error;
        }

        // 6. Get Next Event Sequence
        const [seqResult] = await tx
            .select({ maxSeq: sql`COALESCE(MAX(${matchEvents.eventSequence}), 0)` })
            .from(matchEvents)
            .where(eq(matchEvents.matchId, numericMatchId));

        const eventSequence = Number(seqResult?.maxSeq || 0) + 1;

        // 7. Insert Match Event
        const [event] = await tx
            .insert(matchEvents)
            .values({
                matchId: numericMatchId,
                inningsId: innings.id,
                eventSequence,
                eventType,
                runsOffBat: runsBat,
                extrasType,
                extrasRuns: extRuns,
                totalRuns: totalEventRuns,
                isLegalDelivery: isLegal,
                wicketType,
                dismissedPlayer: isWicket ? dismissedPlayer || batter || "Batter" : null,
                batter: batter || null,
                bowler: bowler || null,
                scorerId: numericScorerId,
                idempotencyKey,
            })
            .returning();

        // 8. Update Innings Projections
        const updatedTotalRuns = innings.totalRuns + totalEventRuns;
        const updatedWickets = innings.wickets + (isWicket ? 1 : 0);
        const updatedLegalBalls = innings.legalBalls + (isLegal ? 1 : 0);
        const updatedExtras = innings.extras + extRuns;

        let inningsStatus = innings.status;
        // Check all-out
        if (updatedWickets >= 10) {
            inningsStatus = "completed";
        }
        // Check target chased
        if (innings.target && updatedTotalRuns >= innings.target) {
            inningsStatus = "completed";
        }

        const [updatedInnings] = await tx
            .update(matchInnings)
            .set({
                totalRuns: updatedTotalRuns,
                wickets: updatedWickets,
                legalBalls: updatedLegalBalls,
                extras: updatedExtras,
                status: inningsStatus,
                updatedAt: new Date(),
            })
            .where(eq(matchInnings.id, innings.id))
            .returning();

        // 9. Update Match Score Projections
        const isHomeBatting = innings.battingTeam === match.homeTeam;
        const [updatedMatch] = await tx
            .update(matches)
            .set({
                ...(isHomeBatting ? { homeScore: updatedTotalRuns } : { awayScore: updatedTotalRuns }),
            })
            .where(eq(matches.id, numericMatchId))
            .returning();

        // 10. Generate Automated Commentary
        const overString = formatOvers(updatedLegalBalls);
        let commentaryMsg = `Over ${overString}: `;
        if (bowler && batter) {
            commentaryMsg += `${bowler} to ${batter}, `;
        }

        if (isWicket) {
            commentaryMsg += `OUT! ${dismissedPlayer || batter || "Batter"} ${wicketType}! `;
        }

        if (extrasType === "wide") {
            commentaryMsg += `WIDE! (${extRuns} extra run${extRuns > 1 ? "s" : ""})`;
        } else if (extrasType === "no_ball") {
            commentaryMsg += `NO BALL! (${extRuns} extra${runsBat > 0 ? ` + ${runsBat} off bat` : ""})`;
        } else if (runsBat === 4) {
            commentaryMsg += "FOUR! Beautiful boundary driven through the gap!";
        } else if (runsBat === 6) {
            commentaryMsg += "SIX! Massive shot cleared over the boundary ropes!";
        } else if (runsBat === 0 && !isWicket && extrasType === "none") {
            commentaryMsg += "Dot ball. Good defensive play.";
        } else if (runsBat > 0) {
            commentaryMsg += `${runsBat} run${runsBat > 1 ? "s" : ""} taken.`;
        } else if (extRuns > 0) {
            commentaryMsg += `${extRuns} ${extrasType} run${extRuns > 1 ? "s" : ""}.`;
        }

        // Get next commentary sequence
        const [commSeqResult] = await tx
            .select({ maxSeq: sql`COALESCE(MAX(${commentary.sequence}), 0)` })
            .from(commentary)
            .where(eq(commentary.matchId, numericMatchId));

        const commentarySequence = Number(commSeqResult?.maxSeq || 0) + 1;

        const [createdCommentary] = await tx
            .insert(commentary)
            .values({
                matchId: numericMatchId,
                sequence: commentarySequence,
                minute: Math.floor(updatedLegalBalls / 6),
                period: `Innings ${innings.inningsNumber}`,
                eventType: isWicket ? "wicket" : extrasType !== "none" ? "extra" : "score",
                actor: batter || bowler || null,
                team: innings.battingTeam,
                message: commentaryMsg.trim(),
                eventId: event.id,
                source: "scorer",
                metadata: {
                    eventSequence: event.eventSequence,
                    runs: totalEventRuns,
                    legalBalls: updatedLegalBalls,
                    overs: overString,
                    wickets: updatedWickets,
                },
            })
            .returning();

        return {
            event,
            innings: updatedInnings,
            match: updatedMatch,
            commentary: createdCommentary,
            isIdempotentReplay: false,
        };
    });
}

/**
 * Administrative Scoring Correction (Admin only).
 * Requirements:
 * - Admin selects an existing event.
 * - Admin provides a mandatory correction reason.
 * - Original event remains preserved in database (never deleted).
 * - Reversal relationship is recorded with admin audit details.
 * - Innings score projection is accurately recalculated from all active events.
 * - Audit log and reconciliation commentary are generated.
 */
export async function correctScoringEvent({ matchId, eventId, reason, adminId }) {
    const numericMatchId = Number(matchId);
    const numericEventId = Number(eventId);
    const numericAdminId = Number(adminId);

    if (!reason || reason.trim().length < 3) {
        const error = new Error("A mandatory correction reason of at least 3 characters is required");
        error.status = 400;
        throw error;
    }

    return await db.transaction(async (tx) => {
        // 1. Lock Match & Event
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

        const [targetEvent] = await tx
            .select()
            .from(matchEvents)
            .where(
                and(
                    eq(matchEvents.id, numericEventId),
                    eq(matchEvents.matchId, numericMatchId)
                )
            )
            .for("update");

        if (!targetEvent) {
            const error = new Error("Scoring event not found");
            error.status = 404;
            throw error;
        }

        if (targetEvent.isReversed) {
            const error = new Error("Event has already been corrected/reversed");
            error.status = 400;
            throw error;
        }

        // 2. Mark event as reversed
        const [reversedEvent] = await tx
            .update(matchEvents)
            .set({
                isReversed: true,
                reversedBy: numericAdminId,
                reversalReason: reason.trim(),
            })
            .where(eq(matchEvents.id, targetEvent.id))
            .returning();

        // 3. Recalculate complete Innings score projection from all non-reversed events
        const inningsId = targetEvent.inningsId;
        const [recalculated] = await tx
            .select({
                totalRuns: sql`COALESCE(SUM(CASE WHEN ${matchEvents.isReversed} = false THEN ${matchEvents.totalRuns} ELSE 0 END), 0)`,
                wickets: sql`COALESCE(SUM(CASE WHEN ${matchEvents.isReversed} = false AND ${matchEvents.wicketType} != 'none' THEN 1 ELSE 0 END), 0)`,
                legalBalls: sql`COALESCE(SUM(CASE WHEN ${matchEvents.isReversed} = false AND ${matchEvents.isLegalDelivery} = true THEN 1 ELSE 0 END), 0)`,
                extras: sql`COALESCE(SUM(CASE WHEN ${matchEvents.isReversed} = false THEN ${matchEvents.extrasRuns} ELSE 0 END), 0)`,
            })
            .from(matchEvents)
            .where(eq(matchEvents.inningsId, inningsId));

        const safeTotalRuns = Number(recalculated?.totalRuns || 0);
        const safeWickets = Number(recalculated?.wickets || 0);
        const safeLegalBalls = Number(recalculated?.legalBalls || 0);
        const safeExtras = Number(recalculated?.extras || 0);

        const [updatedInnings] = await tx
            .update(matchInnings)
            .set({
                totalRuns: safeTotalRuns,
                wickets: safeWickets,
                legalBalls: safeLegalBalls,
                extras: safeExtras,
                updatedAt: new Date(),
            })
            .where(eq(matchInnings.id, inningsId))
            .returning();

        // 4. Update Match score
        const isHomeBatting = updatedInnings.battingTeam === match.homeTeam;
        const [updatedMatch] = await tx
            .update(matches)
            .set({
                ...(isHomeBatting ? { homeScore: safeTotalRuns } : { awayScore: safeTotalRuns }),
            })
            .where(eq(matches.id, numericMatchId))
            .returning();

        // 5. Insert Audit Log
        await createAuditLog({
            actorId: numericAdminId,
            action: "correct_scoring_event",
            matchId: numericMatchId,
            eventId: targetEvent.id,
            reason: reason.trim(),
            details: {
                reversedEventSequence: targetEvent.eventSequence,
                previousRuns: targetEvent.totalRuns,
                recalculatedRuns: safeTotalRuns,
                recalculatedWickets: safeWickets,
            },
            tx,
        });

        // 6. Reconciliation Commentary
        const [commSeqResult] = await tx
            .select({ maxSeq: sql`COALESCE(MAX(${commentary.sequence}), 0)` })
            .from(commentary)
            .where(eq(commentary.matchId, numericMatchId));

        const commentarySequence = Number(commSeqResult?.maxSeq || 0) + 1;

        const [createdCommentary] = await tx
            .insert(commentary)
            .values({
                matchId: numericMatchId,
                sequence: commentarySequence,
                minute: Math.floor(safeLegalBalls / 6),
                period: `Innings ${updatedInnings.inningsNumber}`,
                eventType: "correction",
                message: `[ADMIN CORRECTION] Event #${targetEvent.eventSequence} was corrected: "${reason.trim()}". Adjusted Score: ${safeTotalRuns}/${safeWickets} (${formatOvers(safeLegalBalls)} ov)`,
                source: "admin",
                metadata: {
                    correctedEventId: targetEvent.id,
                    recalculatedScore: {
                        runs: safeTotalRuns,
                        wickets: safeWickets,
                        overs: formatOvers(safeLegalBalls),
                    },
                },
            })
            .returning();

        return {
            reversedEvent,
            innings: updatedInnings,
            match: updatedMatch,
            commentary: createdCommentary,
        };
    });
}

/**
 * Retrieve match event history.
 */
export async function getMatchEvents(matchId, { inningsId = null, limit = 100, offset = 0 } = {}) {
    const numericMatchId = Number(matchId);
    if (!numericMatchId) return [];

    const conditions = [eq(matchEvents.matchId, numericMatchId)];
    if (inningsId) {
        conditions.push(eq(matchEvents.inningsId, Number(inningsId)));
    }

    return await db
        .select()
        .from(matchEvents)
        .where(and(...conditions))
        .orderBy(desc(matchEvents.eventSequence))
        .limit(Math.min(limit, 200))
        .offset(Math.max(offset, 0));
}

/**
 * Retrieve all innings for a match.
 */
export async function getMatchInnings(matchId) {
    const numericMatchId = Number(matchId);
    if (!numericMatchId) return [];

    return await db
        .select()
        .from(matchInnings)
        .where(eq(matchInnings.matchId, numericMatchId))
        .orderBy(matchInnings.inningsNumber);
}
