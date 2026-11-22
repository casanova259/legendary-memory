import { z } from "zod";

export const WICKET_TYPES = [
    "none",
    "bowled",
    "caught",
    "lbw",
    "run_out",
    "stumped",
    "hit_wicket",
    "handled_ball",
    "obstructing_field",
    "timed_out",
    "retired_out",
];

export const EXTRAS_TYPES = [
    "none",
    "wide",
    "no_ball",
    "bye",
    "leg_bye",
    "penalty",
];

export const EVENT_TYPES = [
    "ball",
    "wicket",
    "extra",
    "innings_completed",
    "match_completed",
];

export const scoringEventSchema = z.object({
    eventType: z.enum(EVENT_TYPES).default("ball"),
    runsOffBat: z.coerce.number().int().min(0, "Runs off bat cannot be negative").max(6, "Maximum runs off bat per ball is 6").default(0),
    extrasType: z.enum(EXTRAS_TYPES).default("none"),
    extrasRuns: z.coerce.number().int().min(0, "Extras runs cannot be negative").max(10).default(0),
    isLegalDelivery: z.boolean().optional(),
    wicketType: z.enum(WICKET_TYPES).default("none"),
    dismissedPlayer: z.string().trim().optional().nullable(),
    batter: z.string().trim().optional().nullable(),
    bowler: z.string().trim().optional().nullable(),
    idempotencyKey: z.string().trim().min(1, "Idempotency key is required").max(128, "Idempotency key max 128 characters"),
}).superRefine((data, ctx) => {
    // If wide or no_ball is specified, extrasRuns should normally be at least 1 unless explicitly 0
    if ((data.extrasType === "wide" || data.extrasType === "no_ball") && data.extrasRuns === 0) {
        data.extrasRuns = 1;
    }

    // A wicket requires a dismissed player if a dismissal is recorded
    if (data.wicketType !== "none" && !data.dismissedPlayer && data.batter) {
        data.dismissedPlayer = data.batter;
    }
});

export const createInningsSchema = z.object({
    inningsNumber: z.coerce.number().int().min(1).max(4),
    battingTeam: z.string().trim().min(1, "Batting team is required"),
    bowlingTeam: z.string().trim().min(1, "Bowling team is required").optional(),
    target: z.coerce.number().int().positive().optional().nullable(),
});

export const eventIdParamSchema = z.object({
    id: z.coerce.number().int().positive("Match ID must be a positive integer"),
    eventId: z.coerce.number().int().positive("Event ID must be a positive integer"),
});
