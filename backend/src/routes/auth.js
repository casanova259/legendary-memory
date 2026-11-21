import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { syncUserFromClerk } from "../services/user.js";

export const authRouter = Router();

/**
 * GET /auth/me
 * Returns verified authenticated user identity and local application role.
 */
authRouter.get("/me", requireAuth, async (req, res) => {
    return res.status(200).json({
        data: req.auth.user,
    });
});

/**
 * POST /auth/sync
 * Allows the frontend to synchronize any newly updated Clerk profile fields.
 * Notice: This will NEVER modify the user's role!
 */
authRouter.post("/sync", requireAuth, async (req, res, next) => {
    try {
        const { email, displayName } = req.body || {};
        const updated = await syncUserFromClerk({
            clerkId: req.auth.clerkId,
            email: typeof email === "string" ? email : undefined,
            displayName: typeof displayName === "string" ? displayName : undefined,
        });

        return res.status(200).json({
            data: updated,
        });
    } catch (error) {
        next(error);
    }
});
