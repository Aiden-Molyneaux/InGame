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
**Two concurrent phases as of 2026-06-30.** (1) **Design** — still closing out boards under
`docs/design/` (design-spec is live); the **design-phase workflow rules below apply to *design* work**.
(2) **Build — M1 is entering.** Gate **G-A is signed** ([`0046`](docs/decisions/0046-m1-entry-architecture-lock-in.md)
LOCKED + [`CONVENTIONS.md`](CONVENTIONS.md)); the monorepo scaffold (Expo client + Express API) runs
**in OpenCode** per [`docs/planning/m1-scaffold-task.md`](docs/planning/m1-scaffold-task.md). **Code work
follows [`CONVENTIONS.md`](CONVENTIONS.md)** (the rulebook every PR is held to) — *not* the design-phase
HTML/SCREEN-STATUS workflow. The active deliverables still live under `docs/`.
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
| UI component names → RN code (the client, **from M2**) | `docs/design/component-map.md` |

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
**M1 scaffold merged; M2 (auth + first vertical slice) in progress** (built in OpenCode). The stack +
invariants are locked in [`0046`](docs/decisions/0046-m1-entry-architecture-lock-in.md); the rulebook is
[`CONVENTIONS.md`](CONVENTIONS.md); CI is the six-check spine ([`testing-strategy.md`](docs/spec/testing-strategy.md) §7);
M1/M2 build briefs live in [`docs/planning/`](docs/planning/). **Client:** Expo **SDK 54** (RN 0.81.5 / React 19.1 —
pinned to match iOS Expo Go, decision [`0053`](docs/decisions/0053-expo-sdk-54-bump.md)); dev loop is Expo web
(`npm -w @ingame/mobile run web`, phone viewport) + Expo Go on device. Concrete `npm` scripts + the seed/mock
data layer get documented here as they settle.

### The dev stack (how agents run & test the app — decision 0060)
One **standing, shared, restart-safe** stack. Do NOT hand-build parallel services; run the supervisor:
```
node scripts/dev-stack.mjs up      # idempotent first move — ~1s no-op when already running
node scripts/dev-stack.mjs status  # one-shot health JSON (db/api/metro)
```
`up` ensures docker Postgres (`ingame-dev-db`), the API on **:4000**, Metro web on **:8082**, and
pre-warms the web bundle. Logs/pidfiles live in `.devstack/` (gitignored).
- **API :4000 is shared** (phone + agents) and **safe to restart** — its env, incl. a stable
  `JWT_SIGNING_SECRET` and `DEV_CORS_ORIGINS=http://localhost:8082` (OQ-120), lives in
  `apps/api/.env.dev` (gitignored; committed template: `apps/api/.env.example`), loaded by
  `npm -w @ingame/api run dev:local`. Restarts no longer log the phone out.
- **The web bundle needs no base-URL override** — it uses `apps/mobile/.env` (LAN IP), which a
  browser on this machine reaches fine; CORS allows the `:8082` origin. **NEVER create
  `apps/mobile/.env.local`** (retired trap: a Metro restarted while it exists points the PHONE at
  localhost and breaks it).
- **Metro :8081 is the owner's phone lane — never touch it.** Agents use :8082 only.
- **Metro :8082 ownership:** the supervisor's detached Metro is the standing one — it survives
  session ends (preview_start-owned servers do NOT; observed 2026-07-03). `preview_start` cannot
  attach to it and errors "port 8082 in use" — that error means the standing Metro is UP: do NOT
  kill it to free the port (that re-pays the cold start); verify in the browser via the
  claude-in-chrome tools at `http://localhost:8082` instead. `up` adopts any healthy Metro it
  finds and only starts its own when :8082 is empty.
- **Prefer supertest integration tests** (`npm run test:integration`) over the browser loop for
  behavior checks; reserve the :8082 browser lane for visual/UI verification.
- **Destructive DB testing only** (resets / seed churn): that's the one remaining case for a
  parallel API — `PORT=4001` + a disposable DB; kill it after (task-stop orphans the tsx child —
  find it with `netstat -ano | findstr :4001`).
Login: `demo@ingame.app` / `InGameDemo1!` (the idempotent `npm -w @ingame/api run db:seed-dev` shelf).
Gotcha: the preview tab can load **before** Metro's first bundle (blank page, `scripts: 0`) —
reload after "Bundled" appears in the logs (rare now that `up` pre-warms the bundle).
