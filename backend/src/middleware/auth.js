import { getAuth } from "@clerk/express";
import { syncUserFromClerk, getUserByClerkId } from "../services/user.js";
import { isScorerAssignedToMatch } from "../services/assignment.js";

/**
 * Require valid Clerk authentication.
 * Verifies token via Clerk middleware, syncs local user, and attaches req.auth = { clerkId, user }.
 * Returns 401 if missing, invalid, or expired.
 * Returns 403 if account is marked inactive.
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

        // Account active check: inactive accounts cannot perform authenticated operations
        if (localUser && localUser.isActive === false) {
            return res.status(403).json({
                error: "Forbidden",
                message: "Account is inactive. Please contact an administrator.",
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

/**
 * Require the authenticated user to be either:
 * 1. An administrator, OR
 * 2. The actively assigned scorer for the match specified in req.params.id
 */
export function requireAssignedScorer() {
    return async (req, res, next) => {
        if (!req.auth || !req.auth.user) {
            return res.status(401).json({
                error: "Unauthorized",
                message: "Authentication required",
            });
        }

        const user = req.auth.user;

        // Administrators have universal access to all matches
        if (user.role === "admin") {
            return next();
        }

        if (user.role !== "scorer") {
            return res.status(403).json({
                error: "Forbidden",
                message: "Only assigned scorers or administrators can operate this match",
            });
        }

        const matchId = Number(req.params.id);
        if (!Number.isInteger(matchId) || matchId <= 0) {
            return res.status(400).json({
                error: "Invalid match ID",
            });
        }

        try {
            const isAssigned = await isScorerAssignedToMatch(matchId, user.id);
            if (!isAssigned) {
                return res.status(403).json({
                    error: "Forbidden",
                    message: "You are not the active assigned scorer for this match",
                });
            }

            return next();
        } catch (error) {
            return next(error);
        }
    };
}
