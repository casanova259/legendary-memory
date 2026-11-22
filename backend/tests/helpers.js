process.env.NODE_ENV = "test";
import { db } from "../src/db/db.js";
import { users } from "../src/db/schema.js";

export const TEST_ADMIN_CLERK_ID = "test_user_admin_fixed_id";
export const TEST_SCORER_CLERK_ID = "test_user_scorer_fixed_id";
export const TEST_SCORER_2_CLERK_ID = "test_user_scorer_2_fixed_id";
export const TEST_VIEWER_CLERK_ID = "test_user_viewer_fixed_id";
export const TEST_INACTIVE_USER_CLERK_ID = "test_user_inactive_fixed_id";

export async function ensureTestUsers() {
    // Admin
    await db
        .insert(users)
        .values({
            clerkId: TEST_ADMIN_CLERK_ID,
            email: "admin@livsportz.test",
            displayName: "Test Admin",
            role: "admin",
            isActive: true,
        })
        .onConflictDoUpdate({
            target: users.clerkId,
            set: { role: "admin", isActive: true },
        });

    // Scorer 1
    await db
        .insert(users)
        .values({
            clerkId: TEST_SCORER_CLERK_ID,
            email: "scorer@livsportz.test",
            displayName: "Test Scorer",
            role: "scorer",
            isActive: true,
        })
        .onConflictDoUpdate({
            target: users.clerkId,
            set: { role: "scorer", isActive: true },
        });

    // Scorer 2
    await db
        .insert(users)
        .values({
            clerkId: TEST_SCORER_2_CLERK_ID,
            email: "scorer2@livsportz.test",
            displayName: "Test Scorer 2",
            role: "scorer",
            isActive: true,
        })
        .onConflictDoUpdate({
            target: users.clerkId,
            set: { role: "scorer", isActive: true },
        });

    // Viewer
    await db
        .insert(users)
        .values({
            clerkId: TEST_VIEWER_CLERK_ID,
            email: "viewer@livsportz.test",
            displayName: "Test Viewer",
            role: "viewer",
            isActive: true,
        })
        .onConflictDoUpdate({
            target: users.clerkId,
            set: { role: "viewer", isActive: true },
        });

    // Inactive User
    await db
        .insert(users)
        .values({
            clerkId: TEST_INACTIVE_USER_CLERK_ID,
            email: "inactive@livsportz.test",
            displayName: "Inactive User",
            role: "viewer",
            isActive: false,
        })
        .onConflictDoUpdate({
            target: users.clerkId,
            set: { role: "viewer", isActive: false },
        });
}

export const adminHeaders = {
    Authorization: `Bearer ${TEST_ADMIN_CLERK_ID}`,
    "User-Agent": "supertest",
};

export const scorerHeaders = {
    Authorization: `Bearer ${TEST_SCORER_CLERK_ID}`,
    "User-Agent": "supertest",
};

export const scorer2Headers = {
    Authorization: `Bearer ${TEST_SCORER_2_CLERK_ID}`,
    "User-Agent": "supertest",
};

export const viewerHeaders = {
    Authorization: `Bearer ${TEST_VIEWER_CLERK_ID}`,
    "User-Agent": "supertest",
};

export const inactiveHeaders = {
    Authorization: `Bearer ${TEST_INACTIVE_USER_CLERK_ID}`,
    "User-Agent": "supertest",
};
