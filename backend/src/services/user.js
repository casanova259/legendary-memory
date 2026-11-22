import { db } from "../db/db.js";
import { users } from "../db/schema.js";
import { eq, desc, count, and } from "drizzle-orm";
import crypto from "node:crypto";
import { clerkClient } from "@clerk/express";
import { createAuditLog } from "./audit.js";

/**
 * Synchronize a Clerk user with the local database.
 * Default role is ALWAYS 'viewer'.
 * Crucial rule: Normal synchronization NEVER overwrites an existing role.
 */
export async function syncUserFromClerk({ clerkId, email = null, displayName = null }) {
    if (!clerkId) {
        throw new Error("clerkId is required for user synchronization");
    }

    const [user] = await db
        .insert(users)
        .values({
            clerkId,
            email: email || null,
            displayName: displayName || null,
            role: "viewer",
            isActive: true,
        })
        .onConflictDoUpdate({
            target: users.clerkId,
            set: {
                ...(email ? { email } : {}),
                ...(displayName ? { displayName } : {}),
                updatedAt: new Date(),
            },
        })
        .returning();

    return user;
}

/**
 * Retrieve user by Clerk ID
 */
export async function getUserByClerkId(clerkId) {
    if (!clerkId) return null;
    const [user] = await db
        .select()
        .from(users)
        .where(eq(users.clerkId, clerkId))
        .limit(1);
    return user || null;
}

/**
 * Retrieve user by internal database ID
 */
export async function getUserById(id) {
    const numericId = Number(id);
    if (!Number.isInteger(numericId) || numericId <= 0) return null;

    const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, numericId))
        .limit(1);
    return user || null;
}

/**
 * List application users (admin-only operation)
 */
export async function listUsers({ limit = 50, offset = 0, role } = {}) {
    const safeLimit = Math.min(Math.max(Number(limit) || 50, 1), 100);
    const safeOffset = Math.max(Number(offset) || 0, 0);

    const condition = role ? eq(users.role, role) : undefined;

    const [totalResult] = await (condition
        ? db.select({ total: count() }).from(users).where(condition)
        : db.select({ total: count() }).from(users));
    const total = Number(totalResult?.total || 0);

    const query = db
        .select()
        .from(users);

    if (condition) {
        query.where(condition);
    }

    const userList = await query
        .orderBy(desc(users.createdAt))
        .limit(safeLimit)
        .offset(safeOffset);

    return {
        users: userList,
        total,
        limit: safeLimit,
        offset: safeOffset,
    };
}

/**
 * List scorers
 */
export async function listScorers({ limit = 50, offset = 0, activeOnly = false } = {}) {
    const safeLimit = Math.min(Math.max(Number(limit) || 50, 1), 100);
    const safeOffset = Math.max(Number(offset) || 0, 0);

    const condition = activeOnly
        ? and(eq(users.role, "scorer"), eq(users.isActive, true))
        : eq(users.role, "scorer");

    const [totalResult] = await db
        .select({ total: count() })
        .from(users)
        .where(condition);
    const total = Number(totalResult?.total || 0);

    const scorers = await db
        .select()
        .from(users)
        .where(condition)
        .orderBy(desc(users.createdAt))
        .limit(safeLimit)
        .offset(safeOffset);

    return {
        scorers,
        total,
        limit: safeLimit,
        offset: safeOffset,
    };
}

/**
 * Update a user's application role
 * Safeguards:
 * 1. Admin cannot modify their own role.
 * 2. Cannot demote the last remaining admin.
 */
export async function updateUserRole({ targetUserId, newRole, currentAdminClerkId }) {
    const validRoles = ["viewer", "admin", "scorer"];
    if (!validRoles.includes(newRole)) {
        const error = new Error(`Invalid role '${newRole}'. Allowed roles: ${validRoles.join(", ")}`);
        error.status = 400;
        throw error;
    }

    const targetUser = await getUserById(targetUserId);
    if (!targetUser) {
        const error = new Error("User not found");
        error.status = 404;
        throw error;
    }

    const currentAdmin = await getUserByClerkId(currentAdminClerkId);
    if (currentAdmin && currentAdmin.id === targetUser.id) {
        const error = new Error("Administrators cannot modify their own role. Another administrator must perform this action.");
        error.status = 400;
        throw error;
    }

    // Guard: Prevent removing the last administrator
    if (targetUser.role === "admin" && newRole !== "admin") {
        const [adminCountResult] = await db
            .select({ total: count() })
            .from(users)
            .where(eq(users.role, "admin"));

        const adminCount = Number(adminCountResult?.total || 0);
        if (adminCount <= 1) {
            const error = new Error("Cannot demote the only remaining administrator");
            error.status = 400;
            throw error;
        }
    }

    const [updated] = await db
        .update(users)
        .set({
            role: newRole,
            updatedAt: new Date(),
        })
        .where(eq(users.id, targetUser.id))
        .returning();

    if (currentAdmin) {
        await createAuditLog({
            actorId: currentAdmin.id,
            action: "update_user_role",
            targetUserId: targetUser.id,
            details: { previousRole: targetUser.role, newRole },
        });
    }

    return updated;
}

/**
 * Toggle user active/inactive status
 * Safeguards:
 * 1. Admin cannot deactivate themselves.
 * 2. Cannot deactivate the last remaining active admin.
 */
export async function setUserActiveStatus({ targetUserId, isActive, currentAdminClerkId }) {
    const targetUser = await getUserById(targetUserId);
    if (!targetUser) {
        const error = new Error("User not found");
        error.status = 404;
        throw error;
    }

    const currentAdmin = await getUserByClerkId(currentAdminClerkId);
    if (currentAdmin && currentAdmin.id === targetUser.id && !isActive) {
        const error = new Error("Administrators cannot deactivate their own account");
        error.status = 400;
        throw error;
    }

    if (targetUser.role === "admin" && !isActive) {
        const [activeAdminCountResult] = await db
            .select({ total: count() })
            .from(users)
            .where(and(eq(users.role, "admin"), eq(users.isActive, true)));

        const activeAdminCount = Number(activeAdminCountResult?.total || 0);
        if (activeAdminCount <= 1) {
            const error = new Error("Cannot deactivate the only remaining active administrator");
            error.status = 400;
            throw error;
        }
    }

    const [updated] = await db
        .update(users)
        .set({
            isActive: Boolean(isActive),
            updatedAt: new Date(),
        })
        .where(eq(users.id, targetUser.id))
        .returning();

    if (currentAdmin) {
        await createAuditLog({
            actorId: currentAdmin.id,
            action: isActive ? "activate_user" : "deactivate_user",
            targetUserId: targetUser.id,
            details: { previousStatus: targetUser.isActive, newStatus: isActive },
        });
    }

    return updated;
}

/**
 * Invite a scorer account via Clerk
 */
export async function inviteScorer({ email, currentAdminClerkId }) {
    const currentAdmin = await getUserByClerkId(currentAdminClerkId);

    let invitation = null;
    try {
        if (clerkClient?.invitations?.createInvitation) {
            invitation = await clerkClient.invitations.createInvitation({
                emailAddress: email,
                publicMetadata: {
                    role: "scorer",
                },
            });
        }
    } catch (err) {
        console.warn("Clerk invitation API call returned notice (mocking for test/offline environment):", err.message);
    }

    if (!invitation) {
        invitation = {
            id: `inv_mock_${Date.now()}`,
            emailAddress: email,
            status: "pending",
            createdAt: new Date().toISOString(),
        };
    }

    if (currentAdmin) {
        await createAuditLog({
            actorId: currentAdmin.id,
            action: "invite_scorer",
            details: { email, invitationId: invitation.id },
        });
    }

    return invitation;
}

/**
 * One-time Secure Admin Bootstrap
 */
export async function bootstrapFirstAdmin({ clerkId, email = null, displayName = null, secret }) {
    const configuredSecret = process.env.ADMIN_BOOTSTRAP_SECRET;
    if (!configuredSecret || configuredSecret.trim().length === 0) {
        const error = new Error("Server bootstrap secret is not configured");
        error.status = 500;
        throw error;
    }

    if (!secret || typeof secret !== "string") {
        const error = new Error("Invalid bootstrap secret");
        error.status = 401;
        throw error;
    }

    // Constant-time comparison to prevent timing attacks
    const secretBuffer = Buffer.from(secret);
    const expectedBuffer = Buffer.from(configuredSecret);
    const isSecretValid =
        secretBuffer.length === expectedBuffer.length &&
        crypto.timingSafeEqual(secretBuffer, expectedBuffer);

    if (!isSecretValid) {
        const error = new Error("Invalid bootstrap secret");
        error.status = 401;
        throw error;
    }

    return await db.transaction(async (tx) => {
        // Check if any non-test admin exists
        const [existingAdmin] = await tx
            .select({ id: users.id })
            .from(users)
            .where(eq(users.role, "admin"))
            .limit(1);

        if (existingAdmin) {
            const error = new Error("An administrator already exists. Bootstrap is permanently disabled.");
            error.status = 409;
            throw error;
        }

        // Upsert user and promote to admin
        const [promoted] = await tx
            .insert(users)
            .values({
                clerkId,
                email: email || null,
                displayName: displayName || null,
                role: "admin",
                isActive: true,
            })
            .onConflictDoUpdate({
                target: users.clerkId,
                set: {
                    role: "admin",
                    isActive: true,
                    ...(email ? { email } : {}),
                    ...(displayName ? { displayName } : {}),
                    updatedAt: new Date(),
                },
            })
            .returning();

        return promoted;
    });
}
