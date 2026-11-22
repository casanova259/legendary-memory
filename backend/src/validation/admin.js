import { z } from "zod";

export const updateUserRoleSchema = z.object({
    role: z.enum(["viewer", "admin", "scorer"], {
        errorMap: () => ({ message: "Role must be one of: viewer, admin, scorer" }),
    }),
});

export const userIdParamSchema = z.object({
    id: z.coerce
        .number({ invalid_type_error: "User ID must be an integer" })
        .int("User ID must be an integer")
        .positive("User ID must be a positive integer"),
});

export const bootstrapSchema = z.object({
    secret: z.string().min(1, "Bootstrap secret is required"),
});

export const listUsersQuerySchema = z.object({
    limit: z.coerce.number().int().positive().max(100).optional(),
    offset: z.coerce.number().int().min(0).optional(),
    role: z.enum(["viewer", "admin", "scorer"]).optional(),
});

export const setUserStatusSchema = z.object({
    isActive: z.boolean({ required_error: "isActive is required" }),
});

export const inviteScorerSchema = z.object({
    email: z.string().trim().email("Valid email address is required"),
});

export const assignScorerSchema = z.object({
    scorerId: z.coerce
        .number({ invalid_type_error: "Scorer ID must be an integer" })
        .int("Scorer ID must be an integer")
        .positive("Scorer ID must be a positive integer"),
});

export const revokeAssignmentSchema = z.object({
    reason: z.string().trim().min(3, "Revocation reason must be at least 3 characters").optional(),
});

export const reassignScorerSchema = z.object({
    newScorerId: z.coerce
        .number({ invalid_type_error: "New Scorer ID must be an integer" })
        .int("New Scorer ID must be an integer")
        .positive("New Scorer ID must be a positive integer"),
    reason: z.string().trim().min(3, "Reassignment reason must be at least 3 characters").optional(),
});

export const adminOverrideStatusSchema = z.object({
    status: z.enum(["scheduled", "live", "paused", "completed", "abandoned", "finished"], {
        errorMap: () => ({ message: "Status must be scheduled, live, paused, completed, abandoned, or finished" }),
    }),
    reason: z.string().trim().min(3, "Mandatory audit reason is required (at least 3 characters)"),
});

export const adminCorrectEventSchema = z.object({
    reason: z.string().trim().min(3, "Mandatory correction reason is required (at least 3 characters)"),
});
