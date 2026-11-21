import { Router } from "express";
import { Webhook } from "svix";
import { syncUserFromClerk } from "../services/user.js";
import { db } from "../db/db.js";
import { users } from "../db/schema.js";
import { eq } from "drizzle-orm";

export const webhookRouter = Router();

/**
 * POST /webhooks/clerk
 * Verify and process Clerk webhook events.
 * Safely handles user.created, user.updated, user.deleted.
 */
webhookRouter.post("/clerk", async (req, res) => {
    const webhookSecret = process.env.CLERK_WEBHOOK_SECRET;

    if (!webhookSecret) {
        return res.status(500).json({
            error: "Clerk webhook secret not configured",
        });
    }

    const svixId = req.headers["svix-id"];
    const svixTimestamp = req.headers["svix-timestamp"];
    const svixSignature = req.headers["svix-signature"];

    if (!svixId || !svixTimestamp || !svixSignature) {
        return res.status(400).json({
            error: "Missing required Svix verification headers",
        });
    }

    // Must verify using raw body
    const rawPayload = req.rawBody ? req.rawBody.toString("utf8") : JSON.stringify(req.body);

    let event;
    try {
        const wh = new Webhook(webhookSecret);
        event = wh.verify(rawPayload, {
            "svix-id": svixId,
            "svix-timestamp": svixTimestamp,
            "svix-signature": svixSignature,
        });
    } catch (err) {
        return res.status(400).json({
            error: "Invalid webhook signature",
            message: err.message,
        });
    }

    const eventType = event.type;
    const data = event.data;

    try {
        if (eventType === "user.created" || eventType === "user.updated") {
            const clerkId = data.id;
            const email = data.email_addresses?.[0]?.email_address || null;
            const firstName = data.first_name || "";
            const lastName = data.last_name || "";
            const displayName = `${firstName} ${lastName}`.trim() || null;

            // Safe sync: NEVER overwrites role
            await syncUserFromClerk({
                clerkId,
                email,
                displayName,
            });
        } else if (eventType === "user.deleted") {
            const clerkId = data.id;
            if (clerkId) {
                await db.delete(users).where(eq(users.clerkId, clerkId));
            }
        }

        return res.status(200).json({ success: true, received: true });
    } catch (err) {
        console.error("Error processing Clerk webhook event:", err);
        return res.status(500).json({
            error: "Failed to process webhook event",
        });
    }
});
