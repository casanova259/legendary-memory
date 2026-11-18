import { Router } from "express";
import { matchIdParamSchema } from "../validation/matches.js";
import {
    createCommentarySchema,
    listCommentaryQuerySchema,
} from "../validation/commentary.js";
import { db } from "../db/db.js";
import { commentary, matches } from "../db/schema.js";
import { eq, desc } from "drizzle-orm";

const MAX_LIMIT = 100;

export const commentaryRouter = Router({
    mergeParams: true,
});

// GET /matches/:id/commentary
commentaryRouter.get("/", async (req, res, next) => {
    const paramsResult = matchIdParamSchema.safeParse(req.params);

    if (!paramsResult.success) {
        return res.status(400).json({
            error: "Invalid match ID",
            details: paramsResult.error.issues,
        });
    }

    const queryResult = listCommentaryQuerySchema.safeParse(req.query);

    if (!queryResult.success) {
        return res.status(400).json({
            error: "Invalid query parameters",
            details: queryResult.error.issues,
        });
    }

    try {
        const { id: matchId } = paramsResult.data;

        // Verify match exists
        const [existingMatch] = await db
            .select({ id: matches.id })
            .from(matches)
            .where(eq(matches.id, matchId))
            .limit(1);

        if (!existingMatch) {
            return res.status(404).json({
                error: "Match not found",
            });
        }

        const { limit = 100 } = queryResult.data;
        const safeLimit = Math.min(limit, MAX_LIMIT);

        const results = await db
            .select()
            .from(commentary)
            .where(eq(commentary.matchId, matchId))
            .orderBy(desc(commentary.createdAt))
            .limit(safeLimit);

        return res.status(200).json({
            data: results,
        });
    } catch (error) {
        next(error);
    }
});

// POST /matches/:id/commentary
commentaryRouter.post("/", async (req, res, next) => {
    const paramsResult = matchIdParamSchema.safeParse(req.params);

    if (!paramsResult.success) {
        return res.status(400).json({
            error: "Invalid match ID",
            details: paramsResult.error.issues,
        });
    }

    const bodyResult = createCommentarySchema.safeParse(req.body);

    if (!bodyResult.success) {
        return res.status(400).json({
            error: "Invalid commentary payload",
            details: bodyResult.error.issues,
        });
    }

    try {
        const { id: matchId } = paramsResult.data;

        // Verify match exists before inserting
        const [existingMatch] = await db
            .select({ id: matches.id })
            .from(matches)
            .where(eq(matches.id, matchId))
            .limit(1);

        if (!existingMatch) {
            return res.status(404).json({
                error: "Match not found",
            });
        }

        const [result] = await db
            .insert(commentary)
            .values({
                matchId,
                ...bodyResult.data,
            })
            .returning();

        if (res.app.locals.broadcastCommentary) {
            res.app.locals.broadcastCommentary(result.matchId, result);
        }

        return res.status(201).json({
            data: result,
        });
    } catch (error) {
        // Handle Postgres foreign key constraint violation code
        if (error?.code === "23503") {
            return res.status(404).json({
                error: "Match not found",
            });
        }
        next(error);
    }
});
