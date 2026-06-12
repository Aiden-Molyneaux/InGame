# CLAUDE.md — InGame

InGame is a **mobile-first (iOS/Android)** app to build, customize, and share a personal game
collection — a retro arcade-styled trophy case, with a community-built game catalog, deep card/device
customization, a cosmetic economy, friends, and achievements. This is **v2 / greenfield** (see
`README.md`); no prototype code is reused.

## Current state
**Docs-only, design phase. There is no application code yet.** The active deliverables live under
`docs/`. Code (Expo client + Express API) is scaffolded later, after the UI design phase and a
dev-tooling plan.

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
