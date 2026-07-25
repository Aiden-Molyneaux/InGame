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
**Build — M6 in flight on branch `m6` (as of 2026-07-25).** M1–M5 are **CLOSED and merged**; M6's
13 buildable packets are **BUILT + reviewed** (entry gate: decisions
[`0076`](docs/decisions/0076-m6-entry-gate-rulings.md)/[`0077`](docs/decisions/0077-m6-ach-starter-content.md)),
and the current mode is **owner acceptance walks + fix waves**. **Code work follows
[`CONVENTIONS.md`](CONVENTIONS.md)** (the rulebook every PR is held to); the design-phase workflow
below applies only when a design board is actually being drafted.
- **The M6 working set** (ground here before milestone work):
  [`docs/planning/m6-review-notes.md`](docs/planning/m6-review-notes.md) is the ledger (what
  landed, which gates recorded); walk findings accumulate in `docs/planning/m6/walk*-notes.md`
  stashes; the owner's live acceptance route is
  [`docs/planning/m6/acceptance-suite-w4-to-now.md`](docs/planning/m6/acceptance-suite-w4-to-now.md);
  per-epic manifests/receipts sit alongside in [`docs/planning/m6/`](docs/planning/m6/).
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
**M1–M5 merged; M6 in flight on `m6`** (M1/M2 were built in OpenCode; M3 onward in Claude Code). The
stack + invariants are locked in [`0046`](docs/decisions/0046-m1-entry-architecture-lock-in.md); the rulebook is
[`CONVENTIONS.md`](CONVENTIONS.md); CI is the six-check spine ([`testing-strategy.md`](docs/spec/testing-strategy.md) §7);
milestone briefs/manifests live in [`docs/planning/`](docs/planning/). **Client:** Expo **SDK 54** (RN 0.81.5 / React 19.1,
decision [`0053`](docs/decisions/0053-expo-sdk-54-bump.md)); dev loop is Expo web
(`npm -w @ingame/mobile run web`, phone viewport) + **the EAS dev client on device** (it replaced
Expo Go 2026-07-22 — see the M1-P section below; JS still streams live from Metro).

### The dev stack (how agents run & test the app — decision 0060)
One **standing, shared, restart-safe** stack. Do NOT hand-build parallel services; run the supervisor:
```
node scripts/dev-stack.mjs up      # idempotent first move — ~1s no-op when already running
node scripts/dev-stack.mjs status  # one-shot health JSON (db/api/metro)
node scripts/dev-stack.mjs doctor  # stuck? read-only diagnosis of known failure signatures + the exact fix
```
`up` ensures docker Postgres (`ingame-dev-db`), the API on **:4000**, Metro web on **:8082**, and
pre-warms the web bundle. Logs/pidfiles live in `.devstack/` (gitignored).
- **QA workflow friction? `doctor` first, runbook second, investigation last** — and capture what
  you learn: the **doctor-nick** skill + [`docs/qa-runbook.md`](docs/qa-runbook.md) own the QA
  lessons ladder (decision 0065). Wrap-up receipts answer "workflow friction this run?".
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

### Seed & load-harness layer (apps/api/scripts/)
- **Demo shelf:** `npm -w @ingame/api run db:seed-dev` — idempotent, owns the demo account above.
- **Walk seeds** (richer acceptance-walk data): `walk-seed.ts` + `walk-seed-rich.ts` — write through
  the REAL service layer, **strictly additive `walkseed_*` users, never touch demo/curator rows**;
  safe to re-run. Run: `npm -w @ingame/api exec tsx --env-file=.env.dev scripts/walk-seed-rich.ts`.
- **Card-volume load harness:** `vol-seed.ts` / `vol-measure.ts` against a **disposable** DB + a
  `:4001` parallel API (never the shared stack) — method + findings in
  [`docs/planning/m6/load-harness-notes.md`](docs/planning/m6/load-harness-notes.md).

### Device builds & store provisioning (M1-P state)
The register is [`docs/planning/m1p-provisioning-log.md`](docs/planning/m1p-provisioning-log.md)
(§3 = the owed table; **§4 = the iOS dev-build rebuild/install/connect runbook**) — read it before
any store/IAP/device-build work; never re-ask recorded state.
- **iOS: EAS lane LIVE** (2026-07-22) — `apps/mobile/eas.json` (development + production
  profiles), EAS project `e0c1989a`, owner's iPhone registered, EAS-managed credentials
  (non-interactive rebuilds work). **The dev client replaces Expo Go on device** — JS streams
  from Metro; rebuild only on native-layer changes (runbook §4). **SIWA verified E2E** on build
  `f9c012e6`; `apps/api/.env.dev` runs the REAL Apple verifier (`APPLE_VERIFIER=apple` — the
  stub's `mock.*` tokens now 401 against the dev API). Still owed: ATS scope-out before store
  builds (#17), TestFlight P16 (#18).
- **Android: accounts ready, no build lane yet** — Play Console verified + a physical device in
  hand (2026-07-18), but the Play app record, RevenueCat Play app, and the eas.json android
  section are all owed (log §3 #3–#5). P2b (`react-native-purchases`) will force the first
  Android (and a new iOS) dev build.

## Model selection for workflows & subagents (owner directive, 2026-07-09)
Rankings, higher = better. Cost reflects what the owner actually pays, not list price.
Intelligence is how hard a problem you can hand the model unsupervised. Taste covers UI/UX,
code quality, API design, and copy.

| model    | cost | intelligence | taste |
|----------|------|--------------|-------|
| sonnet-5 | 5    | 5            | 7     |
| opus-4.8 | 4    | 7            | 8     |
| fable-5  | 2    | 9            | 9     |

How to apply:
- **Defaults, not limits.** Standing permission to override: if a cheaper model's output
  doesn't meet the bar, rerun or redo the work with a smarter model without asking. Judge
  the output, not the price tag. Escalating costs less than shipping mediocre work.
- **Cost is a tie-breaker only**; when axes conflict for anything that ships,
  intelligence > taste > cost.
- **Bulk/mechanical work** (clear-spec implementation, data analysis, migrations):
  sonnet-5 — the cheapest model that clears the bar.
- **Anything user-facing** (UI, copy, API design) needs taste ≥ 7 — opus-4.8 or fable-5;
  sonnet-5 only for low-stakes surfaces.
- **Anything hard enough that you'd want to double-check the answer:** fable-5.
- **Reviews of plans/implementations:** fable-5 or opus-4.8; for anything important, run
  both as independent perspectives.
- **Never use Haiku.**
- **Mechanics:** all three run via the Agent/Workflow `model` parameter (`sonnet`, `opus`,
  `fable`). Omit the parameter to inherit the session model; pair cheap models with
  `effort: 'low'` for mechanical stages and reserve higher effort tiers for the hardest
  verify/judge stages.
