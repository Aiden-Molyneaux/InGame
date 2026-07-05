-- 0004 DOWN — the G-F roll-back companion for 0004_fixed_rockslide.sql (drizzle-kit generates no down
-- files; this is the hand-authored, PR-reviewed reverse). F03 posture applies: run ONLY against a
-- disposable/scratch DB (DISPOSABLE_DB=1), manually via psql, never by an automated runner.
--
-- Note for the G-F sitting: re-adding the exact-case UNIQUE can FAIL if the DB now holds usernames
-- that differ only by case (e.g. 'Aiden' + 'aiden') — a legal state under 0004 but not under the old
-- exact-case constraint. That is inherent to reversing a semantic tightening; resolve the collisions
-- first if this reverse is ever needed on post-0004 data.
--
-- After running this, delete 0004's row from drizzle.__drizzle_migrations so the migrator re-applies
-- it on the next `db:migrate` (the roll-forward half of the demo):
--   DELETE FROM drizzle.__drizzle_migrations
--    WHERE hash = (SELECT hash FROM drizzle.__drizzle_migrations ORDER BY created_at DESC LIMIT 1);

DROP INDEX IF EXISTS "users_username_normalized_idx";
ALTER TABLE "users" DROP COLUMN IF EXISTS "username_normalized";
ALTER TABLE "users" ADD CONSTRAINT "users_username_unique" UNIQUE ("username");
