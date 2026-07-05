-- 0003 DOWN — the G-F roll-back companion for 0003_pretty_retro_girl.sql (drizzle-kit generates no
-- down files; this is the hand-authored, PR-reviewed reverse). DESTRUCTIVE BY NATURE (drops the M3
-- catalog + collection tables) — F03 posture applies: run ONLY against a disposable/scratch DB
-- (DISPOSABLE_DB=1), manually via psql, never by an automated runner.
--
-- Two notes for the G-F sitting:
--  * The 0003 UP data-fix (nulling pre-M3 dangling favourite_game_id values) is NOT reversible —
--    and needs no reverse: the nulled values referenced nothing (no games table existed).
--  * After running this, delete 0003's row from drizzle.__drizzle_migrations so the migrator will
--    re-apply 0003 on the next `db:migrate` (the roll-forward half of the demo):
--      DELETE FROM drizzle.__drizzle_migrations
--       WHERE hash = (SELECT hash FROM drizzle.__drizzle_migrations ORDER BY created_at DESC LIMIT 1);

ALTER TABLE "users" DROP CONSTRAINT IF EXISTS "users_now_playing_game_id_games_id_fk";
ALTER TABLE "users" DROP CONSTRAINT IF EXISTS "users_favourite_game_id_games_id_fk";
ALTER TABLE "users" DROP COLUMN IF EXISTS "now_playing_game_id";
DROP TABLE IF EXISTS "collection_entries";
DROP TABLE IF EXISTS "game_genres";
DROP TABLE IF EXISTS "games";
DROP TABLE IF EXISTS "genres";
