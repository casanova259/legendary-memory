import { db } from "../src/db/db.js";
import { users } from "../src/db/schema.js";

export const TEST_ADMIN_CLERK_ID = "test_user_admin_fixed_id";
export const TEST_SCORER_CLERK_ID = "test_user_scorer_fixed_id";
export const TEST_VIEWER_CLERK_ID = "test_user_viewer_fixed_id";

export async function ensureTestUsers() {
    // Admin
    await db
        .insert(users)
        .values({
            clerkId: TEST_ADMIN_CLERK_ID,
            email: "admin@livsportz.test",
            displayName: "Test Admin",
            role: "admin",
        })
        .onConflictDoUpdate({
            target: users.clerkId,
            set: { role: "admin" },
        });

    // Scorer
    await db
        .insert(users)
        .values({
            clerkId: TEST_SCORER_CLERK_ID,
            email: "scorer@livsportz.test",
            displayName: "Test Scorer",
            role: "scorer",
        })
        .onConflictDoUpdate({
            target: users.clerkId,
            set: { role: "scorer" },
        });

    // Viewer
    await db
        .insert(users)
        .values({
            clerkId: TEST_VIEWER_CLERK_ID,
            email: "viewer@livsportz.test",
            displayName: "Test Viewer",
            role: "viewer",
        })
        .onConflictDoUpdate({
            target: users.clerkId,
            set: { role: "viewer" },
        });
}

export const adminHeaders = {
    Authorization: `Bearer ${TEST_ADMIN_CLERK_ID}`,
};

export const scorerHeaders = {
    Authorization: `Bearer ${TEST_SCORER_CLERK_ID}`,
};

export const viewerHeaders = {
    Authorization: `Bearer ${TEST_VIEWER_CLERK_ID}`,
};
