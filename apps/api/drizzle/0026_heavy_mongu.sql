DROP INDEX "domain_events_actor_idx";--> statement-breakpoint
DROP INDEX "domain_events_type_idx";--> statement-breakpoint
CREATE INDEX "domain_events_actor_type_time_idx" ON "domain_events" USING btree ("actor_id","event_type","occurred_at");--> statement-breakpoint
CREATE INDEX "domain_events_type_time_idx" ON "domain_events" USING btree ("event_type","occurred_at" DESC NULLS LAST);