CREATE TABLE "card_designs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_id" uuid NOT NULL,
	"game_id" uuid NOT NULL,
	"name" text NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"composition" jsonb NOT NULL,
	"composition_hash" text NOT NULL,
	"image_url" text,
	"thumb_url" text,
	"is_premium" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "style_presets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_id" uuid NOT NULL,
	"name" text NOT NULL,
	"style" jsonb NOT NULL,
	"is_premium" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "collection_entries" ADD COLUMN "active_card_design_id" uuid;--> statement-breakpoint
ALTER TABLE "card_designs" ADD CONSTRAINT "card_designs_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "card_designs" ADD CONSTRAINT "card_designs_game_id_games_id_fk" FOREIGN KEY ("game_id") REFERENCES "public"."games"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "style_presets" ADD CONSTRAINT "style_presets_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "card_designs_owner_game_idx" ON "card_designs" USING btree ("owner_id","game_id");--> statement-breakpoint
CREATE INDEX "style_presets_owner_idx" ON "style_presets" USING btree ("owner_id");--> statement-breakpoint
ALTER TABLE "collection_entries" ADD CONSTRAINT "collection_entries_active_card_design_id_card_designs_id_fk" FOREIGN KEY ("active_card_design_id") REFERENCES "public"."card_designs"("id") ON DELETE set null ON UPDATE no action;