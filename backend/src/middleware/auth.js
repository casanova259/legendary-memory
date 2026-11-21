import { getAuth } from "@clerk/express";
import { syncUserFromClerk, getUserByClerkId } from "../services/user.js";

/**
 * Require valid Clerk authentication.
 * Verifies token via Clerk middleware, syncs local user, and attaches req.auth = { clerkId, user }.
 * Returns 401 if missing, invalid, or expired.
 */
export async function requireAuth(req, res, next) {
    try {
        let clerkUserId = null;
        let claims = null;

        // Support test fixture header strictly in test environments
        if (process.env.NODE_ENV === "test") {
            const authHeader = req.headers.authorization;
            if (authHeader && authHeader.startsWith("Bearer test_user_")) {
                clerkUserId = authHeader.replace("Bearer ", "").trim();
            } else if (req.headers["x-test-clerk-id"]) {
                clerkUserId = req.headers["x-test-clerk-id"];
            } else if (authHeader && !authHeader.startsWith("Bearer ")) {
                return res.status(401).json({
                    error: "Unauthorized",
                    message: "Invalid, expired, or missing authentication token",
                });
            }
        }

        // Standard Clerk authentication via @clerk/express
        if (!clerkUserId) {
            try {
                const clerkAuth = getAuth(req);
                if (clerkAuth && clerkAuth.userId) {
                    clerkUserId = clerkAuth.userId;
                    claims = clerkAuth.sessionClaims || {};
                }
            } catch (err) {
                // If getAuth throws due to missing/invalid token
                return res.status(401).json({
                    error: "Unauthorized",
                    message: "Invalid, expired, or missing authentication token",
                });
            }
        }

        if (!clerkUserId) {
            return res.status(401).json({
                error: "Unauthorized",
                message: "Authentication token is missing or invalid",
            });
        }

        // Extract metadata from claims if present
        const email =
            claims?.email ||
            claims?.primary_email_address ||
            (Array.isArray(claims?.email_addresses) ? claims.email_addresses[0] : null) ||
            req.headers["x-test-email"] ||
            null;

        const displayName =
            claims?.full_name ||
            claims?.name ||
            (claims?.first_name ? `${claims.first_name} ${claims?.last_name || ""}`.trim() : null) ||
            req.headers["x-test-name"] ||
            null;

        // Synchronize or fetch local user.
        // Role is ALWAYS retrieved from database, never trusted from client!
        let localUser = await getUserByClerkId(clerkUserId);
        if (!localUser) {
            localUser = await syncUserFromClerk({
                clerkId: clerkUserId,
                email,
                displayName,
            });
        }

        // Attach verified identity and local application role to request
        req.auth = {
            clerkId: clerkUserId,
            user: localUser,
            claims,
        };

        return next();
    } catch (error) {
        return next(error);
    }
}

/**
 * Require one of the specified application roles.
 * Must run after requireAuth.
 * Example: requireRole("admin") or requireRole("admin", "scorer")
 */
export function requireRole(...allowedRoles) {
    return (req, res, next) => {
        if (!req.auth || !req.auth.user) {
            return res.status(401).json({
                error: "Unauthorized",
                message: "Authentication required",
            });
        }

        const userRole = req.auth.user.role;
        if (!allowedRoles.includes(userRole)) {
            return res.status(403).json({
                error: "Forbidden",
                message: `Insufficient permissions. Required role: ${allowedRoles.join(" or ")}, but user has role: ${userRole}`,
            });
        }

        return next();
    };
}
