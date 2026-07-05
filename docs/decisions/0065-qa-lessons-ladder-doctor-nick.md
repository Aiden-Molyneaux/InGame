# 0065 — QA lessons ladder + Doctor Nick (qa-runbook · dev-stack doctor · skill)

**Status:** LOCKED · **Date:** 2026-07-05 · **Author:** Claude Code, owner-approved design
([`docs/planning/qa-lessons-ladder-design.md`](../planning/qa-lessons-ladder-design.md)) ·
**Rules:** how QA-workflow lessons are captured, promoted, and canonized; the doctor contract.

## Context

Agents (Parvati/Murr runs especially) burned time on QA *workflow* friction — unknown server
states, preview gotchas — with lessons living only as hand-curated CLAUDE.md prose and no loop to
improve. Owner directed: agents improve their QA process iteratively, in InGame and shipwright.

## Decisions

1. **The lessons ladder.** Capture instantly in [`docs/qa-runbook.md`](../qa-runbook.md)
   (Symptom → Diagnosis → Fix → Verified → Hits) → **twice = automate** into
   `node scripts/dev-stack.mjs doctor` → stable invariants become CLAUDE.md law (CLAUDE.md stays
   short; runbook + doctor absorb churn). Agents write the runbook directly, mid-task.
2. **The doctor contract.** `doctor` is **read-only** — diagnoses and prescribes, never mutates,
   never kills :8082, never acts on :8081. Exit 1 on blocking failures. Initial check set: db,
   api health, api CORS env (OQ-120), `.env.local` trap, metro :8082, bundle warmth, :8081
   report-only, orphan :4001.
3. **Enforcement = the `doctor-nick` skill** (preflight `up`+`doctor` · stuck rule: doctor →
   runbook → investigate · retro rule: receipts answer "workflow friction this run?"). Parvati's
   capture preflight points at it. Canonization (tier 3) is owner-gated; tiers 1–2 are not.
4. **Shipwright ships the generalized loop** (runbook template · `doctor-nick` skill · the
   `up/status/doctor` supervisor contract in starter-kit + lifecycle-playbook Stage 4).
5. **Deferred:** `doctor --fix` (YAGNI until prescriptions prove stable); any Metro-lane
   automation; runbook analytics beyond the in-file Hits counter.
