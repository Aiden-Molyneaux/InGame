# QA Lessons Ladder + Doctor Nick — design

**Date:** 2026-07-05 · **Status:** owner-approved direction, spec for implementation
**Scope:** InGame + shipwright (generalized). Covers the full QA/verify lane: dev-stack/preview
workflow, Parvati screenshot capture, integration-test running, reviewer-trio mechanics.

## Problem

Agents (Parvati and Murr runs especially) burn large amounts of time on QA *workflow* friction —
servers not responding, unknown server states, preview gotchas — rather than on QA itself. The
lessons that would prevent repeats live only as hand-curated prose in CLAUDE.md's dev-stack
section, which grows only when someone remembers to edit it and still requires every agent to
re-reason from prose when stuck. There is no capture loop, no promotion path, and shipwright
ships none of this to new projects.

## Design: the lessons ladder

Lessons about QA workflow graduate through three tiers of hardness. The rule of the ladder:
**capture instantly in prose; twice = automate; stable = law.**

### Tier 1 — Capture: `docs/qa-runbook.md`

A living runbook agents append to mid-task, zero ceremony. Strict entry format:

```markdown
## <short symptom title>
- **Symptom:** what the agent observed (error text, blank page, hang…)
- **Diagnosis:** actual cause
- **Fix:** exact commands / steps that resolved it
- **Verified:** YYYY-MM-DD · **Hits:** 1
```

Sections: **Active lessons** (full entries) · **Promoted** (one-liners pointing at the
`doctor` check that now owns them) · **Canonized** (one-liners pointing at CLAUDE.md law).
An agent that re-hits an existing entry increments **Hits** and updates **Verified**. At
Hits ≥ 2 the entry is flagged for promotion (tier 2).

### Tier 2 — Promote: `node scripts/dev-stack.mjs doctor`

A read-only diagnostic command in the existing supervisor. It checks every *known* failure
signature deterministically and prints the exact fix per failure; exit code non-zero when
anything is red. **Doctor never mutates state** — it diagnoses and prescribes; the agent (or
`up`) applies the fix. It must never kill Metro :8082 or touch :8081.

Initial check set (from the current CLAUDE.md lore + runbook seed):

| Check | Red condition | Prescription printed |
|---|---|---|
| Docker DB | `ingame-dev-db` not running | `node scripts/dev-stack.mjs up` |
| API health | :4000 not answering health | `up` (safe to restart; env in apps/api/.env.dev) |
| API CORS | `DEV_CORS_ORIGINS` missing :8082 origin | fix apps/api/.env.dev, restart API |
| `.env.local` trap | `apps/mobile/.env.local` exists | delete it (retired trap — breaks the phone) |
| Metro :8082 | port empty | `up` (starts + pre-warms) |
| Metro bundle | :8082 up but bundle cold (`scripts: 0` symptom) | wait for "Bundled" in .devstack logs, reload |
| Phone lane | :8081 state | report only — NEVER act on :8081 |
| Orphan :4001 | leftover tsx child on :4001 | `netstat -ano | findstr :4001` → kill PID |

Promotion procedure: when a runbook entry reaches Hits ≥ 2 and is deterministically checkable,
add a doctor check, shrink the entry to a one-liner under **Promoted**.

### Tier 3 — Canonize: CLAUDE.md

Standing invariants that are *rules of the environment*, not failure fixes (e.g. ":8081 is the
phone lane — never touch"), get one line in CLAUDE.md. CLAUDE.md stays short because the runbook
and doctor absorb the churn; the existing dev-stack section is trimmed to the invariants + a
pointer to Doctor Nick once the runbook/doctor exist.

## Enforcement: the **Doctor Nick** skill

`doctor-nick` — the QA-process skill that owns the loop. Installed at `.claude/skills/doctor-nick/`
(InGame) and `shipwright/skills/doctor-nick/` (generalized template). Triggered whenever an agent
starts QA/verification of the running app, gets blocked by workflow (not product) failures, or is
wrapping up a task that involved QA. Three rules:

1. **Preflight** — QA starts with `node scripts/dev-stack.mjs up` then `doctor`. Green board
   before any preview/screenshot/test work.
2. **Stuck rule** — blocked on *workflow* for more than ~2 minutes → run `doctor` → check
   `docs/qa-runbook.md` → only then investigate from scratch. (Product bugs are exempt — that's
   real QA, use systematic-debugging.)
3. **Retro rule** — the wrap-up receipt of any QA-involving task answers: *"Workflow friction
   this run?"* If yes and novel → append a runbook entry before ending the turn. If a re-hit →
   increment Hits; at ≥ 2, flag (or perform) promotion to a doctor check.

Parvati's screenshot-capture preflight (both repos' SKILL.md) gets one added line pointing at
Doctor Nick's preflight — that is where she stalls today.

## Deliverables

**InGame**
1. `docs/qa-runbook.md` — seeded with the current known lessons (the CLAUDE.md gotchas, as
   Promoted/Canonized one-liners once doctor lands; anything not yet codified as Active entries).
2. `scripts/dev-stack.mjs` — `doctor` subcommand with the check table above.
3. `.claude/skills/doctor-nick/SKILL.md` — the three rules + the ladder procedure.
4. CLAUDE.md — trim the dev-stack gotcha prose to invariants + pointer to Doctor Nick/runbook/doctor.
5. `.claude/skills/parvati` + shipwright parvati — preflight pointer line.
6. A short decision doc (`docs/decisions/`) recording the ladder, per the change protocol.

**shipwright**
1. `starter-kit/`: `qa-runbook.md` template + the ladder convention documented in the
   starter-kit CLAUDE.md template and lifecycle-playbook (QA lane section).
2. `skills/doctor-nick/SKILL.md` — generalized (project-agnostic wording: "the project's dev
   supervisor", parameterized command names).
3. Supervisor guidance: starter-kit documents that a project's dev supervisor must expose
   `up` / `status` / `doctor`, with the doctor-scaffold check-shape described (no InGame paths).
4. `skills/README.md` lane table + `DECISIONS.md` entry.

## Error handling & testing

- Doctor is read-only; worst case is a wrong prescription, corrected by editing the check. Each
  check times out individually (a hung port probe must not hang doctor).
- Test doctor against the live green stack (all-green run) plus cheap simulated reds:
  `.env.local` created temporarily, doctor run with API stopped. No destructive simulation of
  the Metro lanes.
- Skill verified by a dry run: one agent turn following Doctor Nick end-to-end on a real
  Parvati-style QA task.

## Explicitly out of scope

- Auto-fixing (`doctor --fix`) — YAGNI until prescriptions prove stable.
- Any automation touching Metro :8081.
- Cross-session analytics on the runbook (hit-count in the file is enough).
