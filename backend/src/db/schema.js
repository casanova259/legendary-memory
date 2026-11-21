import {
    pgTable,
    pgEnum,
    serial,
    integer,
    text,
    timestamp,
    jsonb,
    index,
} from "drizzle-orm/pg-core";

/**
 * Match Status Enum
 */
export const matchStatusEnum = pgEnum("match_status", [
    "scheduled",
    "live",
    "finished",
]);

/**
 * User Role Enum
 */
export const userRoleEnum = pgEnum("user_role", [
    "viewer",
    "admin",
    "scorer",
]);

/**
 * Users Table (Local application user synchronized with Clerk)
 */
export const users = pgTable(
    "users",
    {
        id: serial("id").primaryKey(),

        clerkId: text("clerk_id").notNull().unique(),

        email: text("email"),

        displayName: text("display_name"),

        role: userRoleEnum("role").notNull().default("viewer"),

        createdAt: timestamp("created_at", {
            withTimezone: true,
        })
            .defaultNow()
            .notNull(),

        updatedAt: timestamp("updated_at", {
            withTimezone: true,
        })
            .defaultNow()
            .notNull(),
    },
    (table) => [
        index("users_clerk_id_idx").on(table.clerkId),
    ]
);

/**
 * Matches Table
 */
export const matches = pgTable(
    "matches",
    {
        id: serial("id").primaryKey(),

        sport: text("sport").notNull(),

        homeTeam: text("home_team").notNull(),

        awayTeam: text("away_team").notNull(),

        status: matchStatusEnum("status").notNull().default("scheduled"),

        startTime: timestamp("start_time", {
            withTimezone: true,
        }).notNull(),

        endTime: timestamp("end_time", {
            withTimezone: true,
        }),

        homeScore: integer("home_score").notNull().default(0),

        awayScore: integer("away_score").notNull().default(0),

        createdAt: timestamp("created_at", {
            withTimezone: true,
        })
            .defaultNow()
            .notNull(),
    },
    (table) => [
        index("matches_created_at_idx").on(table.createdAt.desc()),
    ]
);

/**
 * Commentary Table
 */
export const commentary = pgTable(
    "commentary",
    {
        id: serial("id").primaryKey(),

        matchId: integer("match_id")
            .notNull()
            .references(() => matches.id, {
                onDelete: "cascade",
            }),

        minute: integer("minute"),

        sequence: integer("sequence").notNull(),

        period: text("period"),

        eventType: text("event_type").notNull(),

        actor: text("actor"),

        team: text("team"),

        message: text("message").notNull(),

        metadata: jsonb("metadata"),

        tags: text("tags").array(),

        createdAt: timestamp("created_at", {
            withTimezone: true,
        })
            .defaultNow()
            .notNull(),
    },
    (table) => [
        index("commentary_match_id_created_at_idx").on(
            table.matchId,
            table.createdAt.desc()
        ),
    ]
);
