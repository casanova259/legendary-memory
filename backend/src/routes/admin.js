import { Router } from "express";
import { requireAuth, requireRole } from "../middleware/auth.js";
import {
    bootstrapSchema,
    listUsersQuerySchema,
    updateUserRoleSchema,
    userIdParamSchema,
} from "../validation/admin.js";
import {
    bootstrapFirstAdmin,
    listUsers,
    updateUserRole,
} from "../services/user.js";

export const adminRouter = Router();

/**
 * POST /admin/bootstrap
 * One-time admin creation mechanism.
 * Requires:
 * 1. Valid Clerk-authenticated user.
 * 2. Correct ADMIN_BOOTSTRAP_SECRET.
 * Permanently disabled once an admin exists.
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

/**
 * GET /admin/users
 * List users (Admin only)
 */
adminRouter.get("/users", requireAuth, requireRole("admin"), async (req, res, next) => {
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
 * PATCH /admin/users/:id/role
 * Modify a user's application role (Admin only)
 */
adminRouter.patch("/users/:id/role", requireAuth, requireRole("admin"), async (req, res, next) => {
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
