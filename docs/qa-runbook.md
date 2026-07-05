# QA Runbook — the lessons ladder (tier 1: capture)

Workflow lessons for the QA/verify lane (dev stack, preview, screenshot capture, test running).
Owned by the **doctor-nick** skill (`.claude/skills/doctor-nick/`); decision 0065.

**The ladder:** capture instantly here → **twice = automate** into `node scripts/dev-stack.mjs
doctor` → stable invariants become CLAUDE.md law. When stuck on *workflow* (not product bugs):
run `doctor` → check this file → only then investigate from scratch.

**Entry format** (append under Active lessons; zero ceremony, do it mid-task):

    ## <short symptom title>
    - **Symptom:** what you observed (error text, blank page, hang…)
    - **Diagnosis:** actual cause
    - **Fix:** exact commands / steps that resolved it
    - **Verified:** YYYY-MM-DD · **Hits:** 1

Re-hit an existing entry → increment **Hits**, update **Verified**. At **Hits ≥ 2** and
deterministically checkable → promote to a `doctor` check and shrink the entry to a one-liner
under Promoted.

---

## Active lessons

*(none yet — first agent to hit novel QA friction appends here)*

---

## Promoted (owned by `doctor` — run `node scripts/dev-stack.mjs doctor`)

- Postgres container down → `doctor` **db :5432** check.
- API :4000 dead / unhealthy → `doctor` **api :4000** check (restart-safe; env in `apps/api/.env.dev`).
- Web login CORS-blocked → `doctor` **api CORS env** check (`DEV_CORS_ORIGINS` must include `http://localhost:8082`, OQ-120).
- Phone broken after Metro restart → `doctor` **.env.local trap** check (`apps/mobile/.env.local` must NOT exist).
- Preview unreachable / `preview_start` says "port 8082 in use" → `doctor` **metro :8082** check (that error means the standing Metro is UP — never kill it).
- Blank preview page (`scripts: 0`) → `doctor` **web bundle** check (tab loaded before first bundle; reload after "Bundled" appears in `.devstack/metro.log`).
- Leftover parallel API on :4001 → `doctor` **orphan :4001** check.

## Canonized (CLAUDE.md law — the invariants)

- Metro **:8081 is the owner's phone lane — never touch it**; agents use :8082 only.
- **Never create `apps/mobile/.env.local`** (also doctor-checked).
- Behavior checks → **supertest integration tests first**; the :8082 browser lane is for visual/UI verification.
- Destructive DB testing → parallel API on :4001 + disposable DB, killed after.
