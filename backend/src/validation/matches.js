
import { z } from "zod";

export const MATCH_STATUS = {
    SCHEDULED: "scheduled",
    LIVE: "live",
    FINISHED: "finished",
    PAUSED: "paused",
    COMPLETED: "completed",
    ABANDONED: "abandoned",
};

export const isValidIsoDateString = (value) => {
    if (typeof value !== "string") return false;

    // Strict ISO 8601 format: YYYY-MM-DDTHH:mm:ss[.sss](Z|±HH:mm)
    const isoRegex = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d+)?(Z|[+-]\d{2}:?\d{2})$/;
    const match = value.match(isoRegex);
    if (!match) return false;

    const [_, yearStr, monthStr, dayStr, hourStr, minStr, secStr] = match;
    const year = Number(yearStr);
    const month = Number(monthStr);
    const day = Number(dayStr);
    const hour = Number(hourStr);
    const minute = Number(minStr);
    const second = Number(secStr);

    if (month < 1 || month > 12) return false;
    if (hour < 0 || hour > 23) return false;
    if (minute < 0 || minute > 59) return false;
    if (second < 0 || second > 59) return false;

    // Verify calendar days (including leap years)
    const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
    if (day < 1 || day > daysInMonth) return false;

    const date = new Date(value);
    return !Number.isNaN(date.getTime());
};

export const listMatchesQuerySchema = z.object({
    limit: z.coerce.number().int().positive().max(100).optional(),
});

export const matchIdParamSchema = z.object({
    id: z.coerce.number().int().positive(),
});

export const createMatchSchema = z
    .object({
        sport: z.string().trim().min(1, "Sport is required"),
        homeTeam: z.string().trim().min(1, "Home team is required"),
        awayTeam: z.string().trim().min(1, "Away team is required"),

        startTime: z.string().refine(isValidIsoDateString, {
            message: "startTime must be a valid ISO date string",
        }),

        endTime: z.string().refine(isValidIsoDateString, {
            message: "endTime must be a valid ISO date string",
        }),

        homeScore: z.coerce.number().int().nonnegative().optional(),
        awayScore: z.coerce.number().int().nonnegative().optional(),
    })
    .superRefine((data, ctx) => {
        const start = new Date(data.startTime);
        const end = new Date(data.endTime);

        if (end <= start) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: ["endTime"],
                message: "endTime must be after startTime",
            });
        }
    });

export const updateScoreSchema = z.object({
    homeScore: z.coerce.number().int().nonnegative(),
    awayScore: z.coerce.number().int().nonnegative(),
});
