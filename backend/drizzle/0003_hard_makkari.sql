CREATE TYPE "public"."innings_status" AS ENUM('upcoming', 'live', 'completed');--> statement-breakpoint
CREATE TYPE "public"."match_assignment_status" AS ENUM('active', 'revoked');--> statement-breakpoint
ALTER TYPE "public"."match_status" ADD VALUE 'paused';--> statement-breakpoint
ALTER TYPE "public"."match_status" ADD VALUE 'completed';--> statement-breakpoint
ALTER TYPE "public"."match_status" ADD VALUE 'abandoned';--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"actor_id" integer,
	"action" text NOT NULL,
	"match_id" integer,
	"target_user_id" integer,
	"event_id" integer,
	"reason" text,
	"details" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "match_assignments" (
	"id" serial PRIMARY KEY NOT NULL,
	"match_id" integer NOT NULL,
	"scorer_id" integer NOT NULL,
	"assigned_by_id" integer,
	"status" "match_assignment_status" DEFAULT 'active' NOT NULL,
	"assigned_at" timestamp with time zone DEFAULT now() NOT NULL,
	"revoked_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "match_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"match_id" integer NOT NULL,
	"innings_id" integer NOT NULL,
	"event_sequence" integer NOT NULL,
	"event_type" text NOT NULL,
	"runs_off_bat" integer DEFAULT 0 NOT NULL,
	"extras_type" text DEFAULT 'none' NOT NULL,
	"extras_runs" integer DEFAULT 0 NOT NULL,
	"total_runs" integer DEFAULT 0 NOT NULL,
	"is_legal_delivery" boolean DEFAULT true NOT NULL,
	"wicket_type" text DEFAULT 'none' NOT NULL,
	"dismissed_player" text,
	"batter" text,
	"bowler" text,
	"scorer_id" integer,
	"idempotency_key" text NOT NULL,
	"is_reversed" boolean DEFAULT false NOT NULL,
	"reversed_by" integer,
	"reversal_reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "match_innings" (
	"id" serial PRIMARY KEY NOT NULL,
	"match_id" integer NOT NULL,
	"innings_number" integer NOT NULL,
	"batting_team" text NOT NULL,
	"bowling_team" text,
	"total_runs" integer DEFAULT 0 NOT NULL,
	"wickets" integer DEFAULT 0 NOT NULL,
	"legal_balls" integer DEFAULT 0 NOT NULL,
	"extras" integer DEFAULT 0 NOT NULL,
	"status" "innings_status" DEFAULT 'upcoming' NOT NULL,
	"target" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "match_innings_runs_check" CHECK (total_runs >= 0),
	CONSTRAINT "match_innings_wickets_check" CHECK (wickets >= 0 AND wickets <= 10),
	CONSTRAINT "match_innings_legal_balls_check" CHECK (legal_balls >= 0),
	CONSTRAINT "match_innings_extras_check" CHECK (extras >= 0)
);
--> statement-breakpoint
ALTER TABLE "commentary" ADD COLUMN "event_id" integer;--> statement-breakpoint
ALTER TABLE "commentary" ADD COLUMN "source" text DEFAULT 'system' NOT NULL;--> statement-breakpoint
ALTER TABLE "matches" ADD COLUMN "created_by_id" integer;--> statement-breakpoint
ALTER TABLE "matches" ADD COLUMN "current_innings_id" integer;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "is_active" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_match_id_matches_id_fk" FOREIGN KEY ("match_id") REFERENCES "public"."matches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_target_user_id_users_id_fk" FOREIGN KEY ("target_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "match_assignments" ADD CONSTRAINT "match_assignments_match_id_matches_id_fk" FOREIGN KEY ("match_id") REFERENCES "public"."matches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "match_assignments" ADD CONSTRAINT "match_assignments_scorer_id_users_id_fk" FOREIGN KEY ("scorer_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "match_assignments" ADD CONSTRAINT "match_assignments_assigned_by_id_users_id_fk" FOREIGN KEY ("assigned_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "match_events" ADD CONSTRAINT "match_events_match_id_matches_id_fk" FOREIGN KEY ("match_id") REFERENCES "public"."matches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "match_events" ADD CONSTRAINT "match_events_innings_id_match_innings_id_fk" FOREIGN KEY ("innings_id") REFERENCES "public"."match_innings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "match_events" ADD CONSTRAINT "match_events_scorer_id_users_id_fk" FOREIGN KEY ("scorer_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "match_events" ADD CONSTRAINT "match_events_reversed_by_users_id_fk" FOREIGN KEY ("reversed_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "match_innings" ADD CONSTRAINT "match_innings_match_id_matches_id_fk" FOREIGN KEY ("match_id") REFERENCES "public"."matches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "audit_logs_match_id_created_at_idx" ON "audit_logs" USING btree ("match_id","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "audit_logs_actor_id_idx" ON "audit_logs" USING btree ("actor_id");--> statement-breakpoint
CREATE UNIQUE INDEX "match_assignments_active_unique_idx" ON "match_assignments" USING btree ("match_id") WHERE status = 'active';--> statement-breakpoint
CREATE INDEX "match_assignments_scorer_status_idx" ON "match_assignments" USING btree ("scorer_id","status");--> statement-breakpoint
CREATE INDEX "match_assignments_match_id_idx" ON "match_assignments" USING btree ("match_id");--> statement-breakpoint
CREATE UNIQUE INDEX "match_events_match_sequence_unique_idx" ON "match_events" USING btree ("match_id","event_sequence");--> statement-breakpoint
CREATE UNIQUE INDEX "match_events_scorer_idempotency_unique_idx" ON "match_events" USING btree ("scorer_id","idempotency_key");--> statement-breakpoint
CREATE INDEX "match_events_innings_idx" ON "match_events" USING btree ("match_id","innings_id","event_sequence");--> statement-breakpoint
CREATE UNIQUE INDEX "match_innings_match_number_unique_idx" ON "match_innings" USING btree ("match_id","innings_number");--> statement-breakpoint
ALTER TABLE "commentary" ADD CONSTRAINT "commentary_event_id_match_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."match_events"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "matches" ADD CONSTRAINT "matches_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;