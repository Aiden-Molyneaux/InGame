# M1 Scaffold — InGame Monorepo Foundation (the "spine")

> **Paste-once brief for the engineering agent. Read it top-to-bottom before touching anything.**
> You are running in **OpenCode**, which does **not** auto-load `CLAUDE.md` and has **no** Claude-Code skills, slash-commands, or persistent memory. Everything you need is named below or sits in the repo. Where any process refers to a "/health" command, run **`node scripts/health-check.mjs`** instead. Where any cited doc names a slash-command — including `CONVENTIONS.md` line 49's per-PR `/code-review` + `/security-review` — there is **no OpenCode equivalent**: satisfy the intent manually (review the diff for correctness and security, and verify before claiming done) and do **not** attempt to invoke them as commands. Never invoke a "skill", a "slash command", or a "memory" store — none exist here.

## Mission (one paragraph)

Scaffold the **M1 foundation** of InGame — a mobile-first (iOS/Android) Expo/React-Native app with a Node/Express + TypeScript API — as an **npm-workspaces monorepo**. This serves milestone **M1** on the road-to-market: the tooling + monorepo scaffold that makes the M2 "on-device sign-in → styled-profile" win buildable on a green, self-guarding floor. **Gate G-A is signed (owner, 2026-06-30) — proceed.** You are building the **7-item Minimum-M1 spine and the 6 ship-blockers — and nothing else.** No M2 auth stack, no M5 economy, no M4 render pipeline. Your deliverable is the scaffold commit (or a working tree ready for it); **do not commit or push unless the owner explicitly asks.**

---

## Step 0 — Bootstrap reading (do this first, in order)

Read these before writing a single line. They are authoritative; this prompt is a faithful **convenience digest**, and the docs win on any conflict. Truth-precedence is by **concern**, not a flat file ranking (`docs/00-INDEX.md` §2): behavior / data / rules / economy → **product-spec** wins; FE↔BE endpoint or payload shape → **api-contract** wins; screen layout / flow / visual / interaction → **design-spec** wins. `CONVENTIONS.md` + decision `0046` govern **how code is written**; defer to them over this prompt on build mechanics.

1. `CLAUDE.md` — working agreement (note: its "/health" and "burt skill" references are Claude-Code-specific; use `node scripts/health-check.mjs`, ignore skills).
2. `AGENTS.md` — the harness-agnostic entry point (OpenCode/Codex read this by convention).
3. `docs/00-INDEX.md` — truth-precedence (§2, by concern), the stable feature-ID scheme, the §4 change protocol.
4. `CONVENTIONS.md` — **the M1 rulebook every PR is held to** (rules 1–8 + the v2 decision-0051 amendments). This is your build spec for the lint mechanisms. **Note:** its line 49 names `/code-review` + `/security-review` — Claude-Code slash-commands with **no OpenCode equivalent**; satisfy the intent manually (review the diff for correctness/security, verify before claiming done), do not attempt to invoke them as commands.
5. `docs/decisions/0046-m1-entry-architecture-lock-in.md` — the architecture lock (✅ LOCKED, G-A). Amending any lock #1–#10 re-fires G-A — do not.
6. `docs/decisions/0051-m1-foundation-review-accepted-changes.md` — the 6 ship-blockers + the priority map (must-now / M2-foundation / fast-follow / defer).
7. `docs/spec/product-spec.md` — **§7 (observability), §8 (phasing), §9 (tech direction)** + `SYS-01/02/03/05/06/07`.
8. `docs/spec/api-contract.md` — the **Conventions** block (error envelope, 422, neutral auth, SYS-01 scoping) + `GET /me`, `PATCH /me`.
9. `docs/spec/testing-strategy.md` — §2 tooling, §3 risk domains, §7 the CI six-check spine, §9 the harness to stand up now.
10. `docs/planning/m1-architecture-review/LEDGER.md` — full per-finding rationale (F01..F44). Reference, not a checklist.

---

## The Backbone — the verbatim 7-item Minimum-M1 spine

**M1 = the spine, nothing else.** Build exactly these seven items. Stamp anything you're tempted to add as must-now / fast-follow(M2) / defer and, if it isn't must-now, leave it out and file it.

> **The 7-item spine to the M2 on-device sign-in→styled-profile win:**
> **(1)** monorepo + shared zod;
> **(2)** SYS-01 scoped helper + route↔authz-test inventory-diff + lint;
> **(3)** AppError→422 middleware;
> **(4)** emit() seam + typed event registry ONLY (no outbox/teeth);
> **(5)** fail-closed migration runner + key taxonomy + bundle-grep;
> **(6)** CI spine green + F22 self-test + F29 slice + F30 route-helper;
> **(7)** Expo Chrome+iPhone loop.

### Item 1 — Monorepo + shared zod
- **npm workspaces** (NOT pnpm — its strict symlinks fight Metro/RN; NOT Turborepo/Nx). Layout: `apps/mobile`, `apps/api`, `packages/shared`.
- `packages/shared` holds the **zod schemas as the single executable FE↔BE contract** (the `api-contract.md` made executable) plus shared types.
- Commit **`.nvmrc`** and `package.json` **`engines`** at scaffold time (pin Node/toolchain). **F41:** native deps go through **`expo install`, never bare `npm i`** — document this and add a guard/note so cold agents and CI don't drift.
- Add the **F32 global-table manifest** in `packages/shared` (`catalog` / `cosmetics` / `achievements` / `genres`). This manifest **is** the allowlist the rule-2 scope-lint reads. Any table not on it = user-owned = **fails closed**.
- Add the **F37 Minimum-M1 manifest** (the 7-item spine, as a checklist artifact in-repo).

### Item 2 — SYS-01 scoped helper + route↔authz-test inventory-diff + lint
- Build the **SYS-01 scoped-query helper** at the repository/service layer; the actor id is **non-optional**. Every read/write of user-owned data passes through it (`CONVENTIONS.md` rules 2 & 4).
- **`defineRoute({ method, path, mutates, authzTest })`** typed helper (F30): route inventory is **data**, not regex-scraped. `mutates` is an **explicit flag** — a state-changing GET still trips it.
- **CI inventory-diff lint:** every `mutates:true` route (and every read route returning another principal's data) must have a paired **SYS-07** cross-user authz test. Coverage counts **only** when a test hits the real route as **actor-B and asserts 4xx (403/404)** — a name-match satisfied by `expect(200)` does not count. This guard stays wired for the life of the app.

### Item 3 — AppError → 422 middleware
- One **`AppError`** hierarchy → Express error middleware → mapped to `api-contract` error codes.
- **zod validation failure → HTTP `422` `VALIDATION_ERROR`** (NOT 400 — correct any road-map drift before sign-off, decision 0043/F08).
- Error envelope **exactly**: `{ error: { code: string, message: string } }`, codes from the fixed set: `AUTH_FAILED`, `NOT_FOUND`, `VALIDATION_ERROR`, `FORBIDDEN`, `RATE_LIMITED`, `SERVER_ERROR`, `ACCOUNT_SUSPENDED`.
- **`SERVER_ERROR` (500) carries a generic body** — a fixed safe string, never the exception text/stack (internals to Sentry keyed by request-ID).
- **Auth failures stay neutral:** wrong password, unknown account, unverified account all return the **same `AUTH_FAILED`** — no account-existence disclosure.

### Item 4 — emit() seam + typed event registry ONLY (no outbox teeth)
- Build the in-process **`emitOnCommit`** seam: every mutation emits a domain-event row **inside the mutation's own transaction** (the transactional **outbox table**).
- Typed **append-only `DomainEventType` registry** — emitting an unregistered type is a **TypeScript compile error**, not a runtime check.
- **OUT of M1:** the **relay/consumer/delivery** infrastructure (deferred to M7) and the **rule-5 FAIL-the-PR lint teeth** (checklist-only until a consumer exists; pull to M3 only if discipline slips). Build the write-side seam now; do not wire enforcement teeth.

### Item 5 — fail-closed migration runner + key taxonomy + bundle-grep
- **F03:** destructive DB runners **fail closed** on absence of a **`DISPOSABLE_DB`** sentinel — an **allowlist, not a denylist**. This must cover the CI-secret-injected `DATABASE_URL` path. (G-C later verifies the guard FIRES.)
- **F04:** the 3-bucket **key-naming taxonomy** (server-only / intentional-public allow-list / lint) enforced by a **grep over the real built bundle** — never a secret in the repo or client bundle.
- **SYS-03 / SYS-03 secret hygiene:** env-only config; `.env*` gitignored; secrets in the host secret store; **gitleaks** secret-scan required-green in CI.

### Item 6 — CI spine green + F22 self-test + F29 slice + F30 route-helper
- The required-green **CI six-check spine** (see below) passes.
- **F22 `fixtures/bad-pr-corpus`:** one deliberately-bad fixture **per `[LINT]` rule** + a meta-test asserting each lint **rejects** its fixture. Runs every PR. This IS the F22 self-test, G-B's evidence, and the new-agent worked example. **Every lint mechanism you add ships with its bad fixture + meta-test.**
- **F29 golden-path slice** (see its own section) — the living, CI-run worked exemplar.
- **F30 `defineRoute` helper** — already in item 2; the F29 slice registers through it.
- Add **concurrent** economy/authz integration tests pattern (fire N parallel, assert exactly one wins / all-but-one 4xx) and a test asserting a **real Postgres container actually started** (Testcontainers, not a mocked repo).

### Item 7 — Expo Chrome + iPhone loop
- Stand up the `apps/mobile` Expo client dev/test loop running in **Chrome** (the dev/test convenience surface — web is **not** a shipped surface) and toward a **physical iPhone**.
- **F05:** complete the Windows/Docker pre-flight. G-B clauses **(a) red-on-purpose, (b) refused bad-PR, (c) lint-teeth** fire at M1-exit (an emulator / Expo Go satisfies the loop); clause **(d) physical iPhone** detaches to an **M1-P** completion tripwire (decision 0045 §102, F05).
- **Apple Developer enrollment (M1-P) runs in parallel starting day-one and is NOT a scaffold blocker** — it gates only G-B clause (d), not the scaffold commit.

---

## The 6 ship-blockers (must land at / before the scaffold commit)

These are concrete deliverables, not aspirations:

1. **F03 — fail-closed DB runner.** Destructive DB scripts abort unless `DISPOSABLE_DB` sentinel present (allowlist). Covers the CI-injected `DATABASE_URL` path.
2. **F06 — read-path privacy guard.** A typed **`toPublicShape` / `toFriendShape`** serializer (allowlist per the PROF-03 privacy state), including an **anonymized-author shape for AUTH-07-deleted users**, plus a **relationship-matrix test** over an explicit read-route inventory. `GET /me` is the self-shape exemplar; the serializer **pattern** lands now even though most read routes come later. (The broader read-path build-out is M2-foundation — ship the seam + the matrix test harness, not every endpoint.)
3. **F21 — composition schemaVersion.** The card composition JSON carries a **`schemaVersion`** from the first persisted draft + a **version-aware hash**; asset/effect IDs are **append-only**. **OUT of M1:** the full composition schema DESIGN and the skia flatten/render pipeline (deferred to M4 / G-H).
4. **F22 — bad-pr-corpus self-test.** As in spine item 6.
5. **F29 — the living golden-path slice.** See next section.
6. **F30 — the `defineRoute` helper.** As in spine item 2; 4xx-asserting authz coverage counts only on a real actor-B hit.

---

## The F29 golden-path slice — spelled out

Build **exactly one** user-owned mutation end-to-end, CI-run, as **the worked exemplar every future endpoint clones and the gates demo against**:

- **The mutation:** `PATCH /me { bio? }` — `bio` is one editable profile field, **bound to ≤140 chars, trimmed**, per SYS-02. A zod failure serializes as `VALIDATION_ERROR` `422`.
- **The actor is STUBBED/SEEDED — NOT real Sign-in-with-Apple.** Seed a user and stub the authenticated principal so the mutation has an owner. **Do NOT build** `POST /auth/apple`, token issuance, refresh rotation, or password hashing — that is M2.
- **Full stack, all four layers:** `route (registered via defineRoute, mutates:true)` → `controller` → `service (@mutation, enforces ownership via the SYS-01 helper, emits via emitOnCommit)` → `repository (scoped-query, persists)`; **request schema imported from `packages/shared`**; **SYS-07 authz test** proving actor-B cannot modify actor-A's bio (asserts 4xx).
- **SYS-01 ownership:** the server **never trusts an id in the body** to identify the actor — `PATCH /me` resolves the target from the authenticated principal only.
- **Persistence:** a real `users`/profile table + its **Drizzle migration** must exist so the mutation has a real row to mutate.
- This slice runs **green in CI** and is the cold-agent reference example. Wire the **`@mutation`** marker on the service method so the authz-test, outbox-emit, and (future) audit-row checks all key off the one seam.

---

## The required-green CI six-check spine (in this order)

`main` is branch-protected: **no direct pushes, linear history, required green CI + required review.** Per PR, ordered cheapest-first, fail-fast:

1. **typecheck + lint** (all the custom lint rules below run here)
2. **unit** (Vitest)
3. **integration** — **Testcontainers Postgres**; the job must **start a real PG container and FAIL on zero containers** (mocked repos cannot fake green) + run Drizzle migrations against it
4. **gitleaks** (secret-scan)
5. **SCA** (`npm audit`)
6. **build** (compiles)

**E2E (Maestro) runs nightly/on-demand — NOT per PR, and NOT stood up in the M1 scaffold.**

**Harness to wire now** (testing-strategy §9 Foundation): Vitest, supertest + Express + Testcontainers (throwaway PG + Drizzle migrations — the integration heart), React Native Testing Library, jest-expo/Jest config, and the **GitHub Actions** workflow running the six checks.

---

## CONVENTIONS mechanisms — make them real (these are CI code, not prose)

The seven `[LINT]`-marked rules (rules 1–6 and 8) must become **real CI mechanisms**, each shipping with its bad-pr-corpus fixture + meta-test:

- **Rule 1 (layering):** a raw DB query (Drizzle `db.*` / SQL exec) **outside the repository layer** fails CI.
- **Rule 2 (SYS-01 scoping):** a repository method touching user-owned data that **bypasses the scoped helper** fails CI. The lint's allowlist **IS the F32 global-table manifest**. An unlisted table = user-owned = **fails closed**. `// SYS-01-EXEMPT` is valid **only** against a listed global table, else CI fails. (Lint proves the helper was *called*; the actor-id correctness is proven by the SYS-07 4xx tests.)
- **Rule 3 (zod):** an un-validated request body fails CI; schemas imported from `packages/shared`. **Split request/input schemas (field-for-field api-contract fidelity) from response/view schemas (owned by the F06 serializer — the sanctioned divergence).** Every user-supplied string **length-bounded + trimmed**. The **server-side parse is the security boundary**; client validation is never enforcement. **Plus** a CI **snapshot test** checking shared request/input schemas field-for-field against `api-contract.md` (the fidelity check decision 0045 promised — distinct from the presence-lint).
- **Rule 4 (authz):** `defineRoute` substrate + the inventory-diff + 4xx-asserting actor-B coverage (above).
- **Rule 5 (events):** `emitOnCommit` + transactional outbox table + `DomainEventType` registry + the **`@mutation`** marker seam (audit-row + emit + authz all key off it). **FAIL-PR teeth deferred to M7** — checklist only now.
- **Rule 6 (spec-ID tags):** generate an **id-registry** from the specs; an **unknown/unregistered spec ID** fails CI; an **untagged test in an enumerated risk-domain dir** fails CI (grep a stable ID → spec + test + code all return).
- **Rule 8 (dependency surfacer):** widened to **runtime OR dev** deps. A **lockfile-diff surfacer** flags any new dependency at milestone exit for a written-justification owner glance (why needed, why no stdlib/existing path, provenance) — a malicious dev tool runs in CI with FS+secret access (gate G-M).

**The hinge mechanisms to get exactly right:** `@mutation` (F43) and `defineRoute` (F30) are real typed helpers, not conventions — a non-CRUD-named mutating method (`claimDailyBonus`, `adoptCard`) must not escape the three checks.

**Explicitly REJECTED — do NOT add:** Turborepo/Nx, pnpm, blanket runtime validation, broader spec-ID tagging beyond risk domains, per-PR dependency gates, a new pre-scaffold gate, HTML/SQLi sanitizer theater.

---

## Seam-now / buildout-later cut (read this once; it resolves every "how far do I go" question)

The deferral boundaries are scattered through the prose below — this table is the single readable cut so you never confuse a seam with its build-out:

| Finding | Build NOW (the seam) | Deferred build-out (milestone) |
|---|---|---|
| **F06** (read-path privacy) | `toPublicShape`/`toFriendShape` serializer pattern + AUTH-07 anonymized author + relationship-matrix **test harness**; `GET /me` self-shape | Every other read endpoint's serializer (**M2-foundation**) |
| **F21** (composition) | `schemaVersion` + version-aware hash on the composition JSON; append-only asset/effect IDs | Full composition schema DESIGN + skia flatten/render pipeline (**M4 / G-H**) |
| **F23** (schema split) | Request/input vs response/view schema split **seam** + the api-contract fidelity snapshot | Schema-split build-out beyond the seam (**M2-foundation**) |
| **Outbox (rule 5)** | `emitOnCommit` write-side seam + outbox table + typed `DomainEventType` registry | Relay / consumer / delivery — outbox **table consumption** (**M7**) |
| **Rule-5 lint teeth** | Checklist only (no FAIL-PR enforcement) | FAIL-PR teeth (**M7**; pull to M3 only if discipline slips) |

---

## Out of M1 scope (build the seam if named must-now above; otherwise leave out + file)

- **M2-foundation (land with first real endpoints; NOT this commit):** expo-secure-store token storage + redux-persist purge/namespace (F14/F20); refresh-token rotation + reuse-detection (F15); request/response schema split build-out beyond the seam (F23); AppError surface build-out; transactional outbox **table consumption**; F16 privilege-check + MOD-10 audit row; F17 rate-limiter presence (the `RATE_LIMITED` code belongs in the envelope now, but no limiter wiring on the slice — `PATCH /me bio` isn't on the SYS-05 list); F31 RTK Query bound to `z.infer`; F36 concurrent tests as standing suites; F18 observability round-trip (Sentry/pino/request-IDs); F09 schema snapshot; rule-5 lint teeth (M2, non-blocking); F39 transactional-email transport; F28 Drizzle journal CI check; F35 lint hardening; migration expand-contract on data-bearing DBs; backup provider + daily-backup schedule; prod/staging/local DB provisioning (G-C).
- **DEFER to owning milestone:** F13 IAP-IDOR (M5); F16 full privileged-ops (M7); F07 deletion-ripple (M7-exit/M8); F18 PII/Sentry label review (M8/G-O); F38 backup restore-drill (pre-M4-beta/G-F); **CARD-15 composition schema design + skia render pipeline (M4/G-H)** — only the F21 `schemaVersion`+hash is must-now; event relay/delivery (M7).

---

## Governance & STOP rules (inline — obey while scaffolding)

- **One spec editor.** Never hand-patch behavior/rules/data/economy into a downstream doc or into code. New/changed behavior → the owning doc (`product-spec` + `api-contract` if the seam moves), assign a **stable ID**, bump version + changelog (00-INDEX §4). Triage: behavior/data → `product-spec`; pure look/flow → `design-spec`.
- **Reference behavior by stable ID** (`SYS-01`, `CARD-15`, `ECON-03`…); don't restate it. IDs are append-only.
- **Ask, don't assume.** Unattended, pick the most reasonable interpretation, proceed, and **record it**: a trivial/reversible gap → `// ASSUMPTION(OQ-xxx)` tag + file it to `docs/open-questions.md` and proceed.
- **STOP-and-file is MANDATORY (never assume, never proceed)** for: **auth, SYS-01 authorization, economy/IAP, and destructive-migration behavior.** File to `docs/open-questions.md` and escalate.
- **Don't touch unrelated code.** Simplest solution for simple problems; no unneeded flexibility. Surface design smells as a **separate** issue, not an inline fix. If you see a clearly better approach, state the tradeoff in 2–4 bullets before implementing.
- **Git identity = personal `Aiden-Molyneaux`** (NOT `VTM-Aiden-Molyneaux`); local identity is already set — do not override; origin is HTTPS. **Commit and push ONLY when the owner explicitly asks** — never as a scaffolding side-effect.
- **Doc-graph health:** if you touch the doc graph (00-INDEX, product-spec, api-contract, SCREEN-STATUS, open-questions, decisions), run **`node scripts/health-check.mjs`** and clear red before declaring done. Never hand-edit `docs/PROJECT-HEALTH.md` (generated).
- Scaffold-time doc hygiene (F08/F10/F12/F44): zod failure → **422** (not 400) everywhere; truth-precedence note; citation hygiene; §8/§9 anchors; rule-8 dev-deps note; a "Start here" block for cold agents.

---

## Gate context

- **G-A is signed — proceed.** Amending any architecture lock #1–#10 (decision 0046) re-fires G-A; don't.
- **Next owner gate = G-B, the "floor is real" demo, at M1 EXIT.** Build the scaffold so it is **demo-able against G-B**: a risk-domain test you can flip **red-on-purpose**, a **planted bad PR refused by CI** (the bad-pr-corpus + meta-test), and the lint mechanisms with teeth where they're must-now. G-B splits (decision 0045 §102): clauses **(a) red-on-purpose, (b) refused bad-PR, (c) lint-teeth** fire at M1-exit (an emulator / Expo Go satisfies the loop); clause **(d) physical iPhone** detaches to the **M1-P** tripwire (Apple enrollment — parallel, not a scaffold blocker).

---

## Definition of Done (M1 scaffold)

- [ ] npm-workspaces monorepo: `apps/mobile`, `apps/api`, `packages/shared`; `.nvmrc` + `engines` pinned; `expo install` rule documented.
- [ ] `packages/shared`: zod request/response split; F32 global-table manifest; F37 spine manifest.
- [ ] SYS-01 scoped helper (non-optional actor id) + `defineRoute` helper + `@mutation` marker, all real typed helpers.
- [ ] `AppError` → Express middleware → fixed error envelope; zod fail → 422; SERVER_ERROR generic body; neutral AUTH_FAILED.
- [ ] `emitOnCommit` seam + transactional outbox table + append-only `DomainEventType` registry (compile-checked); NO relay, NO rule-5 teeth.
- [ ] Fail-closed `DISPOSABLE_DB` migration runner; F04 key-taxonomy bundle-grep; gitleaks green; env-only config.
- [ ] F29 slice: `PATCH /me bio`, stubbed actor, all 4 layers, shared zod, real `users` table + migration, SYS-07 actor-B 4xx test — green in CI.
- [ ] F06 serializer pattern (`toPublicShape`/`toFriendShape` + AUTH-07 anonymized author) + relationship-matrix test harness; `GET /me` self-shape.
- [ ] F21 `schemaVersion` + version-aware hash on composition JSON (schema design itself deferred).
- [ ] CI six-check spine green, in order; integration starts a real PG container and fails on zero; concurrent + real-container assertions present.
- [ ] `fixtures/bad-pr-corpus`: one bad fixture per `[LINT]` rule + meta-test, running every PR; each lint rejects its fixture.
- [ ] Rules 1/2/3/4/5/6/8 enforced as real CI mechanisms (rule-5 teeth deferred = checklist).
- [ ] Expo Chrome dev loop runs; Windows/Docker pre-flight done; iPhone path noted as M1-P (not blocking).
- [ ] `main` branch protection configured (no direct push, linear history, required CI + review).
- [ ] No M2/M5/M7/M4 work silently absorbed; anything deferred is filed/noted.
- [ ] No secrets in repo or client bundle; no leftover artifacts; nothing committed/pushed unless the owner asked.

---

## Report-back receipt (end every substantial pass with this)

1. **What was built** — files created/changed, the stable IDs and findings (F-numbers) addressed, which spine items + ship-blockers are done, and any downstream docs chain-updated.
2. **What you assumed or decided, and why** — each `// ASSUMPTION(OQ-xxx)` you filed (and confirm none touched a STOP domain), plus tradeoffs taken.
3. **What's unsure / needs the owner's eyes** — open questions filed to `docs/open-questions.md`, anything blocked on a STOP-and-file domain, and the G-B demo readiness (which red-on-purpose test + which planted-bad-PR proves the floor).