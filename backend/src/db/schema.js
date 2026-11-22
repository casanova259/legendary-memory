import {
    pgTable,
    pgEnum,
    serial,
    integer,
    text,
    timestamp,
    jsonb,
    index,
    uniqueIndex,
    boolean,
    check,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

/**
 * Match Status Enum
 * Extended to support: scheduled, live, finished, paused, completed, abandoned
 */
export const matchStatusEnum = pgEnum("match_status", [
    "scheduled",
    "live",
    "finished",
    "paused",
    "completed",
    "abandoned",
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
 * Match Assignment Status Enum
 */
export const matchAssignmentStatusEnum = pgEnum("match_assignment_status", [
    "active",
    "revoked",
]);

/**
 * Innings Status Enum
 */
export const inningsStatusEnum = pgEnum("innings_status", [
    "upcoming",
    "live",
    "completed",
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

        isActive: boolean("is_active").notNull().default(true),

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

        createdById: integer("created_by_id").references(() => users.id, {
            onDelete: "set null",
        }),

        currentInningsId: integer("current_innings_id"),

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
 * Match Assignments Table (Tracks scorer assignments with strict one-active-scorer constraint)
 */
export const matchAssignments = pgTable(
    "match_assignments",
    {
        id: serial("id").primaryKey(),

        matchId: integer("match_id")
            .notNull()
            .references(() => matches.id, {
                onDelete: "cascade",
            }),

        scorerId: integer("scorer_id")
            .notNull()
            .references(() => users.id, {
                onDelete: "cascade",
            }),

        assignedById: integer("assigned_by_id").references(() => users.id, {
            onDelete: "set null",
        }),

        status: matchAssignmentStatusEnum("status").notNull().default("active"),

        assignedAt: timestamp("assigned_at", {
            withTimezone: true,
        })
            .defaultNow()
            .notNull(),

        revokedAt: timestamp("revoked_at", {
            withTimezone: true,
        }),

        createdAt: timestamp("created_at", {
            withTimezone: true,
        })
            .defaultNow()
            .notNull(),
    },
    (table) => [
        // Partial unique index: Guarantees at most ONE active scorer per match
        uniqueIndex("match_assignments_active_unique_idx")
            .on(table.matchId)
            .where(sql`status = 'active'`),
        index("match_assignments_scorer_status_idx").on(table.scorerId, table.status),
        index("match_assignments_match_id_idx").on(table.matchId),
    ]
);

/**
 * Match Innings Table (Cricket-specific innings)
 */
export const matchInnings = pgTable(
    "match_innings",
    {
        id: serial("id").primaryKey(),

        matchId: integer("match_id")
            .notNull()
            .references(() => matches.id, {
                onDelete: "cascade",
            }),

        inningsNumber: integer("innings_number").notNull(),

        battingTeam: text("batting_team").notNull(),

        bowlingTeam: text("bowling_team"),

        totalRuns: integer("total_runs").notNull().default(0),

        wickets: integer("wickets").notNull().default(0),

        legalBalls: integer("legal_balls").notNull().default(0),

        extras: integer("extras").notNull().default(0),

        status: inningsStatusEnum("status").notNull().default("upcoming"),

        target: integer("target"),

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
        uniqueIndex("match_innings_match_number_unique_idx").on(table.matchId, table.inningsNumber),
        check("match_innings_runs_check", sql`total_runs >= 0`),
        check("match_innings_wickets_check", sql`wickets >= 0 AND wickets <= 10`),
        check("match_innings_legal_balls_check", sql`legal_balls >= 0`),
        check("match_innings_extras_check", sql`extras >= 0`),
    ]
);

/**
 * Match Events Table (Cricket ball-by-ball scoring events)
 */
export const matchEvents = pgTable(
    "match_events",
    {
        id: serial("id").primaryKey(),

        matchId: integer("match_id")
            .notNull()
            .references(() => matches.id, {
                onDelete: "cascade",
            }),

        inningsId: integer("innings_id")
            .notNull()
            .references(() => matchInnings.id, {
                onDelete: "cascade",
            }),

        eventSequence: integer("event_sequence").notNull(),

        eventType: text("event_type").notNull(), // 'ball', 'wicket', 'extra', 'innings_completed', 'match_completed', 'correction'

        runsOffBat: integer("runs_off_bat").notNull().default(0),

        extrasType: text("extras_type").notNull().default("none"), // 'none', 'wide', 'no_ball', 'bye', 'leg_bye', 'penalty'

        extrasRuns: integer("extras_runs").notNull().default(0),

        totalRuns: integer("total_runs").notNull().default(0),

        isLegalDelivery: boolean("is_legal_delivery").notNull().default(true),

        wicketType: text("wicket_type").notNull().default("none"), // 'none', 'bowled', 'caught', 'lbw', 'run_out', 'stumped', 'hit_wicket', 'handled_ball', 'obstructing_field', 'timed_out', 'retired_out'

        dismissedPlayer: text("dismissed_player"),

        batter: text("batter"),

        bowler: text("bowler"),

        scorerId: integer("scorer_id").references(() => users.id, {
            onDelete: "set null",
        }),

        idempotencyKey: text("idempotency_key").notNull(),

        isReversed: boolean("is_reversed").notNull().default(false),

        reversedBy: integer("reversed_by").references(() => users.id, {
            onDelete: "set null",
        }),

        reversalReason: text("reversal_reason"),

        createdAt: timestamp("created_at", {
            withTimezone: true,
        })
            .defaultNow()
            .notNull(),
    },
    (table) => [
        uniqueIndex("match_events_match_sequence_unique_idx").on(table.matchId, table.eventSequence),
        uniqueIndex("match_events_scorer_idempotency_unique_idx").on(table.scorerId, table.idempotencyKey),
        index("match_events_innings_idx").on(table.matchId, table.inningsId, table.eventSequence),
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

        eventId: integer("event_id").references(() => matchEvents.id, {
            onDelete: "set null",
        }),

        source: text("source").notNull().default("system"), // 'system', 'scorer', 'admin'

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

/**
 * Audit Logs Table
 */
export const auditLogs = pgTable(
    "audit_logs",
    {
        id: serial("id").primaryKey(),

        actorId: integer("actor_id").references(() => users.id, {
            onDelete: "set null",
        }),

        action: text("action").notNull(),

        matchId: integer("match_id").references(() => matches.id, {
            onDelete: "cascade",
        }),

        targetUserId: integer("target_user_id").references(() => users.id, {
            onDelete: "set null",
        }),

        eventId: integer("event_id"),

        reason: text("reason"),

        details: jsonb("details"),

        createdAt: timestamp("created_at", {
            withTimezone: true,
        })
            .defaultNow()
            .notNull(),
    },
    (table) => [
        index("audit_logs_match_id_created_at_idx").on(table.matchId, table.createdAt.desc()),
        index("audit_logs_actor_id_idx").on(table.actorId),
    ]
);
