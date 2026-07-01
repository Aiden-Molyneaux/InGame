# AGENTS.md — InGame (agent working agreement)

> This repo's full working agreement lives in **`CLAUDE.md`**. This file exists so agent
> harnesses that read `AGENTS.md` by convention (OpenCode, Codex, etc.) pick up the same
> rules. **Read `CLAUDE.md`, `docs/00-INDEX.md`, and `CONVENTIONS.md` before doing any
> work** — they are authoritative; the summary below is convenience, and `CLAUDE.md` wins.

## Non-negotiables
- **Git identity = the PERSONAL account `Aiden-Molyneaux`** (NOT the work account
  `VTM-Aiden-Molyneaux`). The repo's local identity is already set correctly — do not
  override it. Remote `origin` is HTTPS. **Commit and push only when the owner asks.**
- **The product-spec has exactly ONE editor.** Never hand-patch behavior into a downstream
  doc. New/changed behavior → edit the owning doc, assign a stable ID, bump version +
  changelog (`docs/00-INDEX.md` §4 is the change protocol).
- **Reference behavior by stable ID** (e.g. `SYS-01`, `CARD-23`, `ECON-03`); don't restate it.
- **Ask, don't assume** on anything unclear. Exception — **STOP and file** is mandatory for
  **auth / `SYS-01` / economy / IAP / destructive-migration** behavior (never assumed). A
  trivial, reversible gap may instead be `// ASSUMPTION(OQ-xxx)`-tagged + filed and proceeded on.
- Run **`node scripts/health-check.mjs`** after touching the doc graph; keep it 🟢.

## Change workflow (M1+) — PR for everything
- **Branch + PR, not direct-to-main — for docs AND code.** As of the M1 merge, `main` is branch-protected
  with **`enforce_admins`** (decisions 0046/0052): **every** change (governance docs included) lands via a
  feature branch → green CI (the six-check spine) → **self-merge**. `required_approving_review_count=0`
  (solo owner — GitHub forbids self-approval, so ≥1 would deadlock; the required `ci` check + strict +
  enforce_admins are the enforcement, see 0052 §3). The docs/design phase's direct-to-main sweeps are
  **over** — nobody, including the owner, bypasses `main`.
- **Verify before you claim done.** Run the relevant checks (typecheck / lint / unit / integration) and
  read the result; never report green you didn't see.
- **Filing an OQ or a decision?** Take the next free number by listing `docs/open-questions.md` /
  `docs/decisions/` first — parallel design tracks claim numbers concurrently, so collisions happen (that's
  how decision 0047 collided → 0051); if two records share a number, the less-entangled one renumbers.

## Where things are
- **Source of truth:** `docs/spec/product-spec.md` (behavior/rules/economy) ·
  `docs/spec/api-contract.md` (FE↔BE seam) · `docs/spec/testing-strategy.md` (testing).
- **Why decisions were made:** `docs/decisions/` (each is dated, ID-linked).
- **Build plan:** `docs/planning/road-to-market.md` (milestones M0–M8, non-authoritative
  where it disagrees with the specs/decisions/CONVENTIONS).
- **The M1 rulebook every PR is held to:** `CONVENTIONS.md`.
- **The M1 architecture lock-in:** `docs/decisions/0046-m1-entry-architecture-lock-in.md`
  (✅ LOCKED — gate G-A signed) + its review hardening `docs/decisions/0051-*.md`.
- **Client UI component map (from M2, NOT M1):** `docs/design/component-map.md` — the catalog→code
  map (canonical RN component names, variants, tokens, build order); the UI-layer rulebook, paired with
  design-spec §1.5 + Foundation Rules F-01..F-09. **M1 builds no component library** — this governs the
  moment client screens are built (the M2 styled-profile slice). A re-sync is owed before then (OQ-111).
- **Current phase:** **entering M1** (tooling + monorepo scaffold). The prior design phase
  produced HTML mockups only under `docs/design/mockups/` (never PNGs).
