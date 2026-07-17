---
name: doctor-nick
description: >-
  Doctor Nick owns the QA-workflow loop — the lessons ladder that keeps agents from burning time
  on dev-stack/preview friction. Use Doctor Nick whenever you START QA or verification against the
  running app (preview, screenshots for Parvati, integration-test runs), whenever you are BLOCKED
  by workflow failures rather than product bugs (server not responding, unknown server state,
  blank preview, CORS/login failures on web, port confusion), and at the WRAP-UP of any task that
  involved QA. Also triggers on "run doctor nick", "doctor", "why is the preview broken", "metro
  won't respond", "is the stack up". Do NOT use him for product bugs found BY QA (that is
  systematic-debugging's lane) or for judging the app's output (parvati/murr/burt own that).
---

# Doctor Nick — the QA lessons ladder ("Hi, everybody!")

QA workflow problems are cheap the second time IF the first time was captured. The ladder:
**capture instantly in prose → twice = automate → stable = law.**

- **Tier 1 — capture:** [`docs/qa-runbook.md`](../../../docs/qa-runbook.md) (Symptom → Diagnosis →
  Fix → Verified → Hits).
- **Tier 2 — automate:** `node scripts/dev-stack.mjs doctor` — read-only; probes every known
  failure signature, prints the exact fix. Never mutates; never touches :8081.
- **Tier 3 — law:** CLAUDE.md dev-stack invariants (:8081 is the phone lane; never `.env.local`;
  supertest-first; :4001 for destructive DB only).

## The three rules

1. **Preflight.** Before ANY preview/screenshot/browser/integration-test work:
   `node scripts/dev-stack.mjs up` then `node scripts/dev-stack.mjs doctor`. Green board before
   QA. Do not hand-build servers; do not use preview_start on :8082.
2. **Stuck rule.** Blocked on *workflow* (stack, ports, env, preview — NOT a product bug) for
   more than ~2 minutes → run `doctor` → check the runbook's Active lessons → only then
   investigate from scratch. Product bugs are exempt: that's real QA — use systematic-debugging.
3. **Retro rule.** The wrap-up receipt of every QA-involving task answers: **"Workflow friction
   this run?"** — Novel friction you solved → append a runbook entry (the format is in the
   runbook header) before ending the turn. Re-hit → increment **Hits** + update **Verified**.
   **Hits ≥ 2** and deterministically checkable → promote: add a `doctor` check in
   `scripts/dev-stack.mjs`, shrink the entry to a Promoted one-liner. A lesson that is really a
   standing environment invariant → propose a CLAUDE.md line to the owner (don't self-canonize).

## Boundaries

- Doctor Nick diagnoses the *workflow*; he never judges the *work* (parvati/burt/murr) and never
  fixes product code.
- `doctor` and this skill never kill Metro :8082 (cold start is expensive) and never act on :8081.
- Runbook entries need evidence — the actual symptom text and the verified fix, not a guess.
