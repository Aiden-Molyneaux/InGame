-- 0007 DOWN — the roll-back companion for 0007_conscious_roxanne_simpson.sql (drizzle-kit generates no
-- down files; this is the hand-authored, PR-reviewed reverse, per the 0006_down.sql convention). F03
-- posture applies: run ONLY against a disposable/scratch DB (DISPOSABLE_DB=1), manually via psql, never
-- by an automated runner. Both tables are ADDITIVE new tables (M4 §3.5 Device editor, decision 0030) —
-- dropping them is clean (no data reshaping). Drop the child looks table first for symmetry; both FK
-- cascade off `users`, so order does not actually matter here.
--
-- After running this, delete 0007's row from drizzle.__drizzle_migrations so the migrator re-applies it
-- on the next `db:migrate`:
--   DELETE FROM drizzle.__drizzle_migrations
--    WHERE hash = (SELECT hash FROM drizzle.__drizzle_migrations ORDER BY created_at DESC LIMIT 1);

DROP TABLE IF EXISTS "device_looks";
DROP TABLE IF EXISTS "device_configs";
