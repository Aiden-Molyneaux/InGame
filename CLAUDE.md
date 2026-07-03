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

### The browser-verification loop (recurring setup trap — read before web-testing the client)
The API sends **no CORS headers by default** (production posture), so browser logins fail with
`ERR_FAILED` / "Something went wrong" unless the API was launched with
`DEV_CORS_ORIGINS=http://localhost:8082` (OQ-120, localhost-only allowlist). The trap has two shapes:
1. **You own the API instance:** launch it with the full dev env —
   `DATABASE_URL=postgres://ingame:ingame@localhost:5432/local_ingame DISPOSABLE_DB=1
   JWT_SIGNING_SECRET=<any dev string> DEV_CORS_ORIGINS=http://localhost:8082 npm -w @ingame/api run dev`.
2. **The owner's API is already on :4000 serving the phone — do NOT restart it** (its JWT secret
   lives in its launching shell; a restart with a new secret invalidates the phone's sessions).
   Instead: run a **parallel API on :4001** with the env above (+`PORT=4001`), point the WEB bundle
   at it via `apps/mobile/.env.local` → `EXPO_PUBLIC_API_BASE_URL=http://localhost:4001/api`
   (expo loads `.env.local` over `.env`), and start Metro on **8082** (`.claude/launch.json`
   `expo-web`; **never** the phone's 8081). **Cleanup is mandatory:** delete `.env.local` (a Metro
   restarted while it exists points the PHONE at localhost and breaks it) and kill the :4001 node —
   task-stop orphans the tsx child, so find it with `netstat -ano | findstr :4001` and kill that PID.
Login: `demo@ingame.app` / `InGameDemo1!` (the idempotent `npm -w @ingame/api run db:seed-dev` shelf).
Gotcha: the preview tab often loads **before** Metro's first bundle (blank page, `scripts: 0`) —
reload after "Bundled" appears in the logs. *(Standing owner fix that retires shape 2: launch your
everyday dev API with `DEV_CORS_ORIGINS=http://localhost:8082` in its env.)*
