---
name: health
description: >-
  Regenerate the InGame project-health dashboard (docs/PROJECT-HEALTH.md) and report it
  exception-first. Use whenever the owner asks for a "health check", "project health", "is the doc
  graph in sync", "run /health", "refresh the dashboard" — or proactively after you touch the
  documentation graph (00-INDEX, product-spec, api-contract, design-spec, SCREEN-STATUS,
  open-questions, decisions). It runs the deterministic checks (doc version-register sync, decision
  traceability, formalization-debt list), writes docs/PROJECT-HEALTH.md, and surfaces only what
  needs attention. Per CLAUDE.md, clear red before declaring doc/design work done.
---

# /health — InGame project-health dashboard

Run the health check and report the exceptions. Keep it exception-first: the owner wants to read
red, trust green.

## Steps
1. From the repo root, run: `node scripts/health-check.mjs`
2. The script regenerates `docs/PROJECT-HEALTH.md` and prints a summary to stdout (and exits
   non-zero if anything is red).
3. Report to the owner: lead with the overall light (🟢 / 🔴) and any 🔴/🟠 items **with their exact
   fix**. If all green, say so in one line. Link [`docs/PROJECT-HEALTH.md`](../../docs/PROJECT-HEALTH.md).
4. Never hand-edit `docs/PROJECT-HEALTH.md` — it is generated. Fix the underlying doc instead, then
   re-run.

## What it checks (design phase)
- **Docs in sync** *(gate)* — each owning doc's `Version` vs its 00-INDEX §1 register cell.
- **Decision traceability** *(gate)* — every Resolved OQ in `open-questions.md` traces to a
  `decisions/` record (or cites a decision inline).
- **Formalization debt** *(info)* — converged SCREEN-STATUS rows still owing Design-spec/API
  formalization. Tracked outstanding work, not drift.

Catalog conformance (F-01..F-09) is the **`burt`** skill's job on changed mockups — the dashboard
links to it but does not run it. Code-phase lights (CI · authz · economy · secrets · DoD ·
migrations) are stubs that activate at M1.

## Extending it
Add a new deterministic check by adding a function to `scripts/health-check.mjs` and a row to the
rendered table. The script is the single source of check logic — the same file is the future CI
caller (road-to-market.md §5).
