CREATE TABLE "card_adoptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"adopter_id" uuid NOT NULL,
	"card_design_id" uuid NOT NULL,
	"game_id" uuid NOT NULL,
	"currency_paid" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "card_adoptions" ADD CONSTRAINT "card_adoptions_adopter_id_users_id_fk" FOREIGN KEY ("adopter_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "card_adoptions" ADD CONSTRAINT "card_adoptions_card_design_id_card_designs_id_fk" FOREIGN KEY ("card_design_id") REFERENCES "public"."card_designs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "card_adoptions" ADD CONSTRAINT "card_adoptions_game_id_games_id_fk" FOREIGN KEY ("game_id") REFERENCES "public"."games"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "card_adoptions_adopter_card_idx" ON "card_adoptions" USING btree ("adopter_id","card_design_id");--> statement-breakpoint
CREATE INDEX "card_adoptions_card_idx" ON "card_adoptions" USING btree ("card_design_id");--> statement-breakpoint
CREATE INDEX "card_adoptions_adopter_idx" ON "card_adoptions" USING btree ("adopter_id");