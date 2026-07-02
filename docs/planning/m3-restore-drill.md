# M3 restore drill — EXECUTED 2026-07-01 (the 0052 §4 deadline)

> Decision 0052 §4 re-timed the restore-drill EXECUTION to M3-exit. Executed against the
> local/scratch dev DB (`ingame-dev-db` docker Postgres 16, `local_ingame`) — the same posture the
> M3 vertical develops against (the real-infra variant re-runs after the G-C cutover).

## The drill (all steps verified live, 2026-07-01)

| Step | Command / action | Evidence |
|---|---|---|
| 0. Baseline | row counts | `users 5 · games 12 · collection_entries 12 · genres 16` |
| 1. Backup | `docker exec ingame-dev-db pg_dump -U ingame --clean --if-exists local_ingame` → file | 70,926-byte SQL dump |
| 2. DESTROY | `DROP SCHEMA public CASCADE; CREATE SCHEMA public; DROP SCHEMA drizzle CASCADE` | `0 tables left` (all 14 tables + the migration journal gone) |
| 3. Restore | `docker cp` the dump → `psql -f /tmp/restore.sql` (BOM stripped — see gotchas) | clean apply |
| 4. Verify data | row counts re-queried | `users 5 · games 12 · entries 12 · genres 16` — **exact match** |
| 5. Verify LIVE | `POST /api/auth/login` (demo@ingame.app) against the restored DB | `login OK — demo_curator_m3, games: 12, hours: 900` (the full widened self-shape served) |

## G-F migration roll-back / roll-forward (run the same day, before the drill)

- **Down:** `apps/api/drizzle/down/0003_down.sql` (the hand-authored, PR-reviewed reverse) + delete
  the newest `drizzle.__drizzle_migrations` row → the four M3 tables + the two users columns gone;
  the M2 tables untouched (the down file is surgically scoped — the demo user survived it).
- **Up:** `npm -w @ingame/api run db:migrate` re-applied 0003 → tables back, the **16 genres
  re-seeded by the migration itself** (reference data rides the DDL, so every fresh environment
  agrees on ids).
- **Restock:** `npm -w @ingame/api run db:seed-dev` (idempotent, F03-guarded) → `12 OF 12` shelf.

## Gotchas captured for the real-infra runbook (G-C)

1. **PowerShell `Out-File` writes a UTF-8 BOM** — psql rejects a BOM'd dump; strip the first three
   bytes (or dump inside the container). The runbook should pipe dumps container-side.
2. `--clean --if-exists` makes the dump self-cleaning, but a schema-level DROP beforehand is the
   honest "total loss" simulation.
3. The drizzle journal (`drizzle.__drizzle_migrations`) lives OUTSIDE `public` — a public-only
   restore would desync it; the dump includes it (verified).
4. F03 posture held throughout: every destructive step ran against the DISPOSABLE_DB-marked scratch
   DB; the seed + reset runners refuse anything else.
