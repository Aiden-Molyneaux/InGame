CREATE TABLE "collection_entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"game_id" uuid NOT NULL,
	"status" text DEFAULT 'backlog' NOT NULL,
	"hours" integer DEFAULT 0 NOT NULL,
	"hours_source" text DEFAULT 'manual' NOT NULL,
	"percent_complete" integer,
	"owned_since" date,
	"rating" integer,
	"notes" text,
	"position" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "game_genres" (
	"game_id" uuid NOT NULL,
	"genre_id" uuid NOT NULL,
	CONSTRAINT "game_genres_game_id_genre_id_pk" PRIMARY KEY("game_id","genre_id")
);
--> statement-breakpoint
CREATE TABLE "games" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"normalized_name" text NOT NULL,
	"studio" text,
	"publisher" text,
	"release_date" date,
	"created_by" uuid NOT NULL,
	"deleted_at" timestamp with time zone,
	"deleted_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "genres" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "genres_name_unique" UNIQUE("name")
);
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "now_playing_game_id" uuid;--> statement-breakpoint
ALTER TABLE "collection_entries" ADD CONSTRAINT "collection_entries_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "collection_entries" ADD CONSTRAINT "collection_entries_game_id_games_id_fk" FOREIGN KEY ("game_id") REFERENCES "public"."games"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "game_genres" ADD CONSTRAINT "game_genres_game_id_games_id_fk" FOREIGN KEY ("game_id") REFERENCES "public"."games"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "game_genres" ADD CONSTRAINT "game_genres_genre_id_genres_id_fk" FOREIGN KEY ("genre_id") REFERENCES "public"."genres"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "games" ADD CONSTRAINT "games_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "collection_entries_user_game_idx" ON "collection_entries" USING btree ("user_id","game_id");--> statement-breakpoint
CREATE INDEX "collection_entries_user_idx" ON "collection_entries" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "collection_entries_user_position_idx" ON "collection_entries" USING btree ("user_id","position");--> statement-breakpoint
CREATE INDEX "game_genres_genre_idx" ON "game_genres" USING btree ("genre_id");--> statement-breakpoint
CREATE UNIQUE INDEX "games_normalized_name_live_idx" ON "games" USING btree ("normalized_name") WHERE deleted_at IS NULL;--> statement-breakpoint
CREATE INDEX "games_created_by_idx" ON "games" USING btree ("created_by");--> statement-breakpoint
-- M3 data-fix (must precede the favourite-game FK below): pre-M3 there WAS no games table, so any
-- non-NULL favourite_game_id is a dangling uuid by construction (M2 validated shape only, existence
-- validation was explicitly deferred to M3 — see the users schema comment). Nulling them loses no
-- referenceable data; without this the ADD CONSTRAINT would fail on scratch DBs that set one.
UPDATE "users" SET "favourite_game_id" = NULL WHERE "favourite_game_id" IS NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_favourite_game_id_games_id_fk" FOREIGN KEY ("favourite_game_id") REFERENCES "public"."games"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_now_playing_game_id_games_id_fk" FOREIGN KEY ("now_playing_game_id") REFERENCES "public"."games"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
-- CAT-04 controlled genre list — reference data seeded WITH the table so every environment
-- (dev / Testcontainers / future real infra) agrees on ids. FIXED ids (not gen_random_uuid()) keep
-- environments and tests deterministic. The list CONTENT is the owner's call — seeded set is
-- ASSUMPTION(OQ-125); the canonical list is P4 config (SYS-08). Idempotent (ON CONFLICT DO NOTHING).
INSERT INTO "genres" ("id", "name") VALUES
	('a0000000-0000-4000-8000-000000000001', 'Action'),
	('a0000000-0000-4000-8000-000000000002', 'Adventure'),
	('a0000000-0000-4000-8000-000000000003', 'RPG'),
	('a0000000-0000-4000-8000-000000000004', 'Shooter'),
	('a0000000-0000-4000-8000-000000000005', 'Platformer'),
	('a0000000-0000-4000-8000-000000000006', 'Puzzle'),
	('a0000000-0000-4000-8000-000000000007', 'Strategy'),
	('a0000000-0000-4000-8000-000000000008', 'Simulation'),
	('a0000000-0000-4000-8000-000000000009', 'Sports'),
	('a0000000-0000-4000-8000-00000000000a', 'Racing'),
	('a0000000-0000-4000-8000-00000000000b', 'Fighting'),
	('a0000000-0000-4000-8000-00000000000c', 'Horror'),
	('a0000000-0000-4000-8000-00000000000d', 'Roguelike'),
	('a0000000-0000-4000-8000-00000000000e', 'Metroidvania'),
	('a0000000-0000-4000-8000-00000000000f', 'Soulslike'),
	('a0000000-0000-4000-8000-000000000010', 'Survival')
ON CONFLICT ("name") DO NOTHING;