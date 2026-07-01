# 0054 — QA reviewer lanes: Parvati primary (build-side), Burt dormant, lead-audit on code

**Status:** LOCKED · **Date:** 2026-07-01 · **Author:** Aiden (product) + Claude Code
**Refs:** relates to `docs/spec/testing-strategy.md`; feeds `docs/planning/m<N>-review-notes.md`; supersedes
the working-name "Parity" reviewer (renamed to Parvati).

## Context
The project has crossed from **designing mockups** into **building the app** (M2). Design-side QA was
**Burt** — an auditor of the mockup *files* for Design-System conformance (F-01..F-09, the 21/15/11/9 type
scale, tokens, fonts, component names). Burt never sees the running app; he reads `docs/design/mockups/**`.
With the mockups now essentially converged, Burt has little left to audit. Meanwhile the live QA question has
shifted to **"does the built app match the agreed design + what this milestone actually promised?"** — which
Burt structurally cannot answer.

## Decision
Three reviewers, three lanes; **Parvati is now the primary build-side QA.**

| Reviewer | Looks at | Judges | Cadence |
|---|---|---|---|
| **Parvati** | the **running app** (device / Expo screenshots) | presence · placement (order/size/alignment) · count-coherence · rough fidelity — vs the **mockup + milestone DoD + data contract**; **and the built app's *visible* DS/polish** | per screen, each milestone build, before owner sign-off |
| **Burt** | the **mockup files** | DS-rule conformance (F-01..F-09, type scale, tokens) | **dormant** — reserved for late mockup edits only |
| **Lead-audit** (Claude Code, adversarial) | the **committed code + CI** | correctness, security, claim-vs-reality | at gates / on a build report-back |

Key reassignment: **the built app's *visible* DS/polish** (off-scale type, on-screen radius, gold/pink
misuse, rough spacing) is now **Parvati's** — surfaced as a 🎨 POLISH finding citing the F-rule — *not*
Burt's, because Burt can't see the running app. Parvati still cites Burt's `references/audit-checklist.md`
(F-01..F-09, the type scale, tokens) as the F-rule authority.

## Why
- Burt's lane (mockup files) is nearly empty post-convergence; the live risk is now **build-vs-design
  drift**, which needs eyes on the running app.
- Parvati measures against the **DoD**, so deferred-but-unbuilt features read ✅ EXPECTED, not false flags —
  she doesn't cry wolf the way a raw mockup-diff would.
- Two method sharpenings already banked from real M2 passes: **count-coherence** (a present, well-placed
  "15 OF 48" is still a finding if only 15 items exist and there's no way to reach the other 33) and
  **presence ≠ placement** (all profile sections present but scrambled in vertical order; the device hero
  rendered full-width instead of a small labelled thumbnail — presence passed, placement didn't).

## Consequence
- Parvati runs on every screen when a milestone build lands (first application: M2 profile + collection →
  `docs/planning/m2-review-notes.md`).
- Burt is **not retired** — a design change to a mockup still earns a Burt pass — but he's off the critical
  path.
- The lead-audit continues to gate code merges (e.g. the M2 fix-pass audit on commit `acde8b9`, whose
  finding is captured as OQ-118).
