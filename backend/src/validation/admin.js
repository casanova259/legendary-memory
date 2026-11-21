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
});
