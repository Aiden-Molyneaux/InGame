CREATE TABLE "device_configs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"active_shell_id" text DEFAULT 'teal' NOT NULL,
	"screen_theme_id" text DEFAULT 'midnight' NOT NULL,
	"sticker_composition" jsonb DEFAULT '{"version":1,"stickers":[]}'::jsonb NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "device_configs_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "device_looks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"active_shell_id" text NOT NULL,
	"screen_theme_id" text NOT NULL,
	"sticker_composition" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "device_configs" ADD CONSTRAINT "device_configs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "device_looks" ADD CONSTRAINT "device_looks_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "device_looks_user_idx" ON "device_looks" USING btree ("user_id");