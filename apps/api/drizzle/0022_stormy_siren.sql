CREATE TABLE "game_edits" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"game_id" uuid NOT NULL,
	"editor_id" uuid NOT NULL,
	"field" text NOT NULL,
	"old_value" jsonb,
	"new_value" jsonb,
	"status" text DEFAULT 'live' NOT NULL,
	"reverted_by" uuid,
	"reverted_at" timestamp with time zone,
	"edited_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "game_edits" ADD CONSTRAINT "game_edits_game_id_games_id_fk" FOREIGN KEY ("game_id") REFERENCES "public"."games"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "game_edits" ADD CONSTRAINT "game_edits_editor_id_users_id_fk" FOREIGN KEY ("editor_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "game_edits_game_edited_idx" ON "game_edits" USING btree ("game_id","edited_at");--> statement-breakpoint
CREATE INDEX "game_edits_editor_idx" ON "game_edits" USING btree ("editor_id");