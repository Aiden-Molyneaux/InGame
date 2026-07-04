# 0060 — Standing dev stack: file-based dev env, one shared API, idempotent supervisor

**Date:** 2026-07-03 · **Owner:** Aiden · **Scribe:** Claude Code
**IDs:** none (dev tooling / workflow) · **Relates:** OQ-120 (dev-CORS allowlist) · SYS-03 (env-only config) · AUTH-02 (JWT signing secret)
**Bumps:** none (records a dev-workflow change; no spec/behavior change)

## Context
Agent sessions doing browser verification were rebuilding the dev environment from scratch every
time: the owner's `:4000` API held its `JWT_SIGNING_SECRET` in the launching shell (restart ⇒ phone
logged out ⇒ a standing "never restart :4000" rule), and it sent no CORS headers, so agents spun up
a **parallel** API on `:4001` + a second Metro + an `apps/mobile/.env.local` override per session.
Cost: minutes of cold-start waiting per session, token burn on polling, and two recurring traps
(a leaked `.env.local` re-pointing the phone at localhost; orphaned `tsx` children holding `:4001`).
Both traps were found **live in the tree** when this work started.

## Decision
Replace the per-session parallel-stack recipe with **one standing, shared, restart-safe dev stack**:

1. **File-based dev env** — `apps/api/.env.dev` (gitignored) holds `DATABASE_URL`, `DISPOSABLE_DB=1`,
   `PORT=4000`, a **stable dev `JWT_SIGNING_SECRET`**, and `DEV_CORS_ORIGINS=http://localhost:8082`.
   Loaded by the new `npm -w @ingame/api run dev:local` (node `--env-file`). Because the secret
   lives in the file, **restarting the API no longer invalidates sessions** — the "never restart
   :4000" rule is retired. `apps/api/.env.example` (committed) documents the template.
2. **One shared dev API on `:4000`** serving both the phone (Expo Go, LAN IP) and the agent
   browser lane (Expo web on `:8082`, allowed via the OQ-120 CORS allowlist). The web bundle uses
   the same `apps/mobile/.env` LAN-IP base URL as the phone — a browser on this machine reaches the
   LAN IP fine — so **`apps/mobile/.env.local` is never needed and must never be created**.
   A parallel `:4001` API remains appropriate **only** for destructive DB work (resets/seed churn).
3. **Idempotent supervisor** — `scripts/dev-stack.mjs` (`up`/`status`/`down`, alias `npm run stack`).
   `up` ensures docker Postgres + API `:4000` + Metro web `:8082` are healthy and **pre-warms the
   web bundle**, exiting in ~1s when everything already runs. `down` kills only pidfile-tracked
   processes (incl. the orphaned-`tsx` tree via `taskkill /T`). Runtime state in `.devstack/`
   (gitignored). Agents run `up` as their first move instead of hand-building services.

**SYS-03 posture note:** the dev signing secret moves from a shell to a **gitignored** file — still
outside the repo, dev-only, on a disposable local DB. Production posture (host secret store, no
CORS headers) is unchanged.

## Ripple
- `CLAUDE.md` §browser-verification-loop **rewritten** → §"The dev stack" (the new recipe; the
  `.env.local` / parallel-`:4001` dance is retired as the default path).
- `.claude/launch.json` gains `api-dev`; root `package.json` gains `stack`; `.gitignore` gains
  `.devstack/`.
- No spec/api-contract/design changes; no stable IDs touched; no version bumps.
