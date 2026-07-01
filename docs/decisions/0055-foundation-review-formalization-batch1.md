# 0055 — Foundation-review formalization (batch 1) + branch consolidation

**Status:** LOCKED · **Date:** 2026-07-01 · **Author:** Aiden (product) + Claude Code
**Refs:** ledger `docs/planning/foundation-review-findings.md` (F-01..F-20) · resolves OQ-114 · files OQ-122 · feeds `docs/planning/m2-guardrail-fix-task.md`

## Context
An independent foundation red-team (Claude **Fable**, separate session) audited spec↔contract↔design
consistency, the quality-rule (lint) coverage, and the OQ backlog — a 20-finding ledger. Claude Code then
**independently verified all 20** (a 20-agent adversarial pass): **18 CONFIRMED · 2 PARTIAL (F-09, F-10) · 0
refuted.** The findings cluster on one theme: *the quality harness verifies the behavior of code that opts
into its seams, but almost nothing verifies the opting-in.*

Before formalizing, the branch pile-up was consolidated: **PR #6** (api-contract 0.42, decision 0053) and
**PR #7** (OQ-118, decision 0054, Parvati tooling) merged to `main` for a single clean base.

## Owner rulings (this decision)
1. **OQ-114 / F-20 — Profile Top-3 card size = `GameCard/cell` (96×134) + 10px plate.** The `/grid` label in
   decision 0047 §B was a typo (96×134 is `/cell`, not `/grid` 161×225); 0047 corrected. The build
   (`profile.tsx`) + component-map already render `/cell`. **OQ-114 resolved.**
2. **F-05 — AUTH-11 acknowledges register as a disclosure point.** Register's field-targeted
   `duplicate email`/`duplicate username` rejection is a second, SYS-05-rate-limited existence signal
   (industry-standard; a neutral always-202 flow was considered and not adopted for v2). Wording only, no
   behavior change. (product-spec 0.44)
3. **F-07 — COL-03 hours anomaly = cap-only; pending-review deferred to M7.** Only the sanity-cap ships in
   M2/M3; the reviewer surface (flag column · MOD-04 queue · endpoint) waits for moderation (M7).
   (product-spec 0.44)
4. **F-16 — drop `privacy` from the friend serializer.** The shipped `friendProfileSchema` exposed the
   target's own `privacy` value, which no contract line grants; it's dropped. The generic `staff?: true`
   marker (PROF-09) is added to the enumerated friend + limited `/users/:id` shapes to match the code + the
   §MOD footnote. (api-contract 0.43; the code drop rides the guardrail/cleanup fix-task.)

## Disposition of all 20 findings
- **Formalized here (batch 1):** F-05 · F-06 (stale `/me/lists` editor note → Collection TOP) · F-07 · F-16 ·
  F-20/OQ-114.
- **→ Guardrail / M2-cleanup fix-task** (`docs/planning/m2-guardrail-fix-task.md`, OpenCode, **pre-M3**):
  F-01 (seam-adoption lints) · F-02 (=OQ-118, rule-02 relational/raw-SQL/insert coverage + dead EXEMPT) ·
  F-03 (query/param + per-occurrence + hand-rolled zod) · F-04 (authz-credit conjunction + `mutates`
  backstop) · F-08 (lockfile-diff surfacer) · F-19 (harness hygiene); plus the F-16 code drop + OQ-121
  session-shape.
- **Milestone-gated (decide at entry gate):** F-09 → **OQ-122** (read-taxonomy, M4) · F-10 → OQ-056
  StylePreset batch (pre-M4) · F-11 → OQ-117 + OQ-100 resolve-together (M3, `public` privacy per-surface) ·
  F-12 → OQ-092 (M5, refund/clawback posture).
- **Batch-2 doc hygiene (owed, non-blocking):** F-13 (relationship enum superset) · F-14 (duplicate
  changelog version numbers) · F-15 (register CONVENTIONS + component-map in 00-INDEX §1) · F-17 (business
  error-code registry) · F-18 (Top-5→10 stragglers in §8 + road-map + COL-11 filter wording) · the
  resolved-OQ-under-Open cleanup (~11 stubs → Resolved).

## Consequence
- product-spec **0.44** · api-contract **0.43**; 00-INDEX register updated; health 🟢.
- OQ-114 resolved · OQ-122 filed · the guardrail fix-task + batch-2 owed.
- The F-16 privacy code-drop + OQ-121 must land on the **`m2`** code branch — the running API still exposes
  `privacy` (and the mismatched session gamertags) until then.
