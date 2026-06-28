# CLAUDE.md — InGame

InGame is a **mobile-first (iOS/Android)** app to build, customize, and share a personal game
collection — a retro arcade-styled trophy case, with a community-built game catalog, deep card/device
customization, a cosmetic economy, friends, and achievements. This is **v2 / greenfield** (see
`README.md`); no prototype code is reused.

## Collaboration rules
1. **Ask, don't assume.** If something is unclear, ask before writing a single line. Never make silent assumptions about intent, architecture, or requirements. When running unattended, pick the most reasonable interpretation, proceed, and record the assumption rather than blocking.
2. **Implement the simplest solution for simple problems, better solutions for harder problems.** Do not over-engineer or add flexibility that isn't needed yet.
3. **Don't touch unrelated code** but please do surface bad code or design smells you discover with me so we can address them as a separate issue.
4. **Flag uncertainty explicitly.** If you're unsure about something, see point 1 above. If it makes sense to do so, conduct a small, localised and low-risk experiment and bring the hypothesis and results to me to discuss. Confidence without certainty causes more damage than admitting a gap.
5. **If you see a clearly better approach, say so before implementing.** Explain the tradeoff in 2–4 bullets. If the current request is still reasonable, proceed unless the alternative avoids serious risk or wasted work.

## Current state
**Docs-only, design phase. There is no application code yet.** The active deliverables live under
`docs/`. Code (Expo client + Express API) is scaffolded later, after the UI design phase and a
dev-tooling plan.
- **The over-arching plan** (design → market): [`docs/planning/road-to-market.md`](docs/planning/road-to-market.md)
  (slide view: `road-to-market-deck.html`).
- **Project health:** [`docs/PROJECT-HEALTH.md`](docs/PROJECT-HEALTH.md) — a generated dashboard; run
  `/health` (or `node scripts/health-check.mjs`) to refresh it.

## Read this first
**`docs/00-INDEX.md`** is the working agreement — which document owns the truth for what,
truth-precedence when they disagree, the stable feature-ID scheme, and the change protocol. The
summary below is convenience; **00-INDEX wins**.

## Source-of-truth documents
| Concern | Document |
|---|---|
| Behavior, rules, economy, data model | `docs/spec/product-spec.md` ← the authority |
| Frontend↔backend endpoint/payload shapes | `docs/spec/api-contract.md` |
| Testing approach | `docs/spec/testing-strategy.md` |
| Why a decision was made | `docs/decisions/` |
| Unresolved items (the inbox) | `docs/open-questions.md` |
| UI requirements / design (later) | `docs/design/` |

## Working rules (non-negotiable)
1. **The product-spec has exactly ONE editor.** Never hand-patch behavior into a downstream doc.
   New or changed behavior → edit the owning doc, assign a **stable ID**, bump its version + add a
   changelog line. (00-INDEX §4)
2. **Triage first:** behavior/data/rules → `product-spec` (+ `api-contract`); pure look/flow →
   `design-spec`. If a design need contradicts the spec, that's a *spec change*, not a quiet edit.
3. **Capture, don't lose:** mid-task ideas/questions → append to `docs/open-questions.md`.
4. **Reference behavior by ID** (e.g. `CARD-01`, `ECON-03`) — don't restate it.
5. **Commit messages name the IDs touched**, e.g. `spec: add CARD-12 (spoiler blur); ripple api-contract`.

## Staying grounded & legible (every task)
1. **Ground first.** Before substantial work, know **(a)** which milestone in
   [`road-to-market.md`](docs/planning/road-to-market.md) it serves and **(b)** which screen + stable IDs
   are in scope. The rules that bite: the **change protocol** (00-INDEX §4), the **Design-System Catalog**
   Foundation Rules **F-01..F-09** + the **F-06 type scale (21/15/11/9)**
   ([`InGame Design System Catalog.dc.html`](docs/design/mockups/InGame%20Design%20System%20Catalog.dc.html);
   audit with the `burt` skill), and **SCREEN-STATUS.md** as the live design dashboard. When unsure, that's
   Collaboration rule 1 — ask, or record the assumption; don't guess silently.
2. **Stay healthy.** Run **`/health`** when you touch the doc graph (00-INDEX, product-spec, api-contract,
   design-spec, SCREEN-STATUS, open-questions, decisions). **Clear red before declaring doc/design work done.**
   Don't hand-edit [`docs/PROJECT-HEALTH.md`](docs/PROJECT-HEALTH.md) — it's generated.
3. **Leave a receipt.** End every substantial task with a short receipt so the owner can trust without
   re-reading everything:
   1. **What changed** — files + stable IDs touched + which downstream docs you chain-updated.
   2. **What you assumed or decided, and why.**
   3. **What's unsure / needs the owner's eyes.**

## Design-phase workflow (owner directives, 2026-06-12)
1. **HTML deliverables only — never PNGs.** The owner reviews mockups by opening the HTML files
   directly. Headless-Edge screenshots are for self-verification only and must be **deleted before
   the turn ends** — no `_gate-*.png` or other image artifacts left in the repo.
2. **After every draft pass, update `docs/design/SCREEN-STATUS.md`** — the per-screen dashboard
   (design state · queue order · mockup version · **implements-from file** · states board? ·
   **design-spec current for that board?** · **api-contract current for that page?**) — and surface
   the changed rows + UP NEXT to the owner in the wrap-up. The Design-spec and API columns are the
   tripwires: a converged board must be formalized into design-spec, and functionality drawn on a
   page must reach the contract (or the inbox), before those columns read ✅.

## Git identity (important — personal project)
Use the **personal** GitHub account **`Aiden-Molyneaux`** — **NOT** the work account
`VTM-Aiden-Molyneaux`. The repo's local identity is already set to
`Aiden Molyneaux <83593233+Aiden-Molyneaux@users.noreply.github.com>`; do not override it. Remote
`origin` uses **HTTPS** (no SSH key on this machine) — push over HTTPS.

## Tech direction (when code begins — see product-spec §9)
- **Client:** Expo / React Native (iOS + Android); Redux Toolkit + **RTK Query** + redux-persist;
  expo-router; Reanimated; expo-notifications; **RevenueCat** for IAP.
- **Server:** Node / Express + TypeScript; layered routes→controllers→services→repositories; **zod**
  validation; PostgreSQL via **Drizzle** + migrations.
- **Web** is a dev/testing convenience (Chrome) only — not a shipped surface.

## Testing (see `docs/spec/testing-strategy.md`)
Risk-based and **meaningful-tests-first**: no coverage-chasing, no trivial tests, keep the suite
fast. Test-first for the high-risk domains (economy, authorization, auth, dedup); targeted
test-after for UI once screens settle. Tooling: Vitest · Jest + React Native Testing Library ·
supertest + Testcontainers (Postgres) · Maestro · GitHub Actions.

## Build / run
No app scaffold yet. This section will be filled in when the Expo and Express projects are created,
including the Chrome + iPhone dev/test loop and a seed/mock data layer.
