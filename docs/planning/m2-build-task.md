# M2 Build Task — InGame: the Foundation floor + the first real vertical slice

> **Paste-once brief for the engineering agent. Read it top-to-bottom before touching anything.**
> You are running in **OpenCode**, which does **not** auto-load `CLAUDE.md` and has **no** Claude-Code skills, slash-commands, or persistent memory. Everything you need is named below or sits in the repo. Where any process refers to `/health`, run **`node scripts/health-check.mjs`** instead. Where any cited doc names a slash-command — including `CONVENTIONS.md` line 49's per-PR `/code-review` + `/security-review` — there is **no OpenCode equivalent**: satisfy the intent **manually** (review the diff for correctness and for security, and verify before claiming done) and do **not** attempt to invoke them. Never invoke a "skill", a "slash command", or a "memory" store — none exist here.

## Mission (one paragraph)

Turn the merged, ratified M1 scaffold spine into the **M2 Foundation floor + the first real vertical slice**. M1 shipped the monorepo, the lint mechanisms, the F29 golden-path slice (`PATCH /me { bio? }` with a **stubbed** actor), and the CI six-check spine — all green and owner-ratified (G-A + G-B done, decision 0052). M2 makes auth **real** (email+password in full, plus `POST /auth/apple` behind a stubbed verifier), lands the data layer + Drizzle migrations, builds out the M2-Foundation seams into working machinery, and delivers the **tangible win**: **sign in → your profile → the seeded, STYLED Collection shelf on a physical iPhone via Expo Go** — rendered in the InGame aesthetic, *not* a login form. You are building **strictly the M2 scope in `docs/planning/m2-entry-plan.md` §1–§6 as amended by the binding owner decisions below**; invent no scope. **Commit/push/PR only when the owner explicitly asks.**

---

## Step 0 — Bootstrap reading (do this first, in order)

Read these before writing a single line. They are authoritative; this brief is a faithful **convenience digest**, and the docs win on any conflict. Truth-precedence is by **concern**, not a flat file ranking (`docs/00-INDEX.md` §2): behavior / data / rules / economy → **product-spec** wins; FE↔BE endpoint or payload shape → **api-contract** wins; screen layout / flow / visual → **design-spec** wins. `CONVENTIONS.md` + decisions `0046`/`0051`/`0052` govern **how code is written**.

1. `CLAUDE.md` — working agreement (its `/health` + `burt` skill references are Claude-Code-specific; use `node scripts/health-check.mjs`, ignore skills).
2. `AGENTS.md` — the harness-agnostic entry point (OpenCode reads this by convention) + the **PR-for-everything** change workflow.
3. `docs/00-INDEX.md` — truth-precedence (§2, by concern), the stable feature-ID scheme, the §4 change protocol.
4. `CONVENTIONS.md` — **the rulebook every PR is held to** (rules 1–8 + the decision-0051 v2 amendments). This is your build spec for the lint mechanisms. Its line 49 `/code-review`+`/security-review` have no OpenCode equivalent — satisfy manually.
5. `docs/planning/m2-entry-plan.md` — **THE ratified M2 scope / sequence / gates / prerequisites. Follow it faithfully.** (This brief bakes the owner's §7 decisions into it; where this brief and an unresolved §7 line disagree, the decisions below win.)
6. `docs/planning/m1-scaffold-task.md` — for the **F29 four-layer clone pattern**, the seam-now/buildout-later cut, and the DoD/receipt shape you are mirroring.
7. `docs/decisions/0046-m1-entry-architecture-lock-in.md` — the architecture lock (✅ LOCKED). Amending any lock #1–#10 re-fires **G-A** — do not.
8. `docs/decisions/0051-m1-foundation-review-accepted-changes.md` — the ship-blockers + the priority map (must-now / M2-foundation / fast-follow / defer).
9. `docs/decisions/0052-m1-exit-ratification-and-m2-entry-carryover.md` — M1 ratified, G-B passed, the **branch-protection deviation** (`required_approving_review_count=0` + `enforce_admins`), the **Expo Go** device loop (no Apple enrollment), and the §4 M2-entry carryover checklist.
10. `docs/spec/product-spec.md` — **`AUTH-01..AUTH-11`, `PROF-01..PROF-09`**, `SYS-01/04/05/07/08`, MOD-07/09/10, §7 (observability), the §data-model `users`/`auth_identities`/`gamertags` rows. **Note `SYS-08`: `role ∈ user | admin` (+ `adminTier ∈ 1..4` for admins) — decision 0034 dropped/burned the old `moderator` value; do not re-introduce it.**
11. `docs/spec/api-contract.md` — the **Conventions** block (error envelope, 422, neutral auth, SYS-01 scoping, the `toPublicShape`/`toFriendShape` serializer) + all **`/auth/*`**, **`GET /me`**, **`PATCH /me`**, **`/me/gamertags`**, **`GET /users/:id`**.
12. `docs/spec/testing-strategy.md` — §2 tooling, §3 risk domains, §7 the CI six-check spine.
13. `docs/design/component-map.md` (**re-synced**) + `design-spec §1.5` + Foundation Rules **F-01..F-09** (F-06 type scale 21/15/11/9) — **client lane only; you CONSUME these, you do not author them** (see the client-lane gate below).

---

## The tangible win + the exit bar

**The win (state it as the target):** on the owner's physical iPhone, open Expo Go → **sign in (email+password)** → land on **your profile** (Device hero, Top-3 of the top-10, Now Playing, stats) → see the **seeded, STYLED Collection shelf** in the InGame aesthetic (mirrors the existing HTML mockups). **Not a login form** — the styled shelf is the whole point (it kills the "invisible for months" risk).

**EXIT BAR:** a real, tested, **CI-green** slice — email+password sign-in → your profile → the styled seeded Collection shelf — running on a physical iPhone **via the Expo Go managed loop against local/scratch-seeded data**, on the Foundation floor, with the M2 gate batch (gate-3 / G-D / G-E / G-F / G-G / G-M / G-K) cleared in **one owner sitting** pinned to the gate-3 window.

**This demo sits behind NEITHER Apple enrollment NOR the G-C infra cutover** (decision 0052 §2: the M1 device loop was satisfied via Expo Go with no Apple enrollment; the vertical develops against **local/scratch DBs**). Two things are explicitly OUT of the exit bar and follow separately: (i) **real SIWA end-to-end on device** (server verifier + client native SIWA button — both trail Apple enrollment / M1-P); (ii) the **real-infra seeded build** (G-C-gated). Neither is on the M2 critical path.

---

## The TWO LANES

### Lane A — BACKEND (starts IMMEDIATELY; gated on nothing)
Data layer + migrations → email/password auth in full → `POST /auth/apple` behind the stubbed verifier → profile endpoints (`PATCH /me` widening, `GET /users/:id`, gamertag CRUD, avatar shape-stubs) → the M2-Foundation build-outs. **Needs neither the component-map nor Apple nor G-C.** Begin here on day one.

### Lane B — CLIENT (GATED — start ONLY after the re-synced component-map lands)
The styled tab-nav shell + seeded STYLED Collection shelf + self-profile render, on a physical iPhone via **Expo Go against local/scratch-seeded data**.

**The gate is explicit and hard:** the client lane's **styled-shell / visual work** is **BLOCKED** until the **OQ-111 component-map re-sync** is delivered by the **spec/design owner (Claude), NOT you.** You are a **CONSUMER** of `docs/design/component-map.md` (re-synced) + `design-spec §1.5` + F-01..F-09: you **READ** them and use the canonical component names / variants / tokens. You **MUST NOT invent component names or author the map** (that is a STOP-and-file if it's missing). **What the map does NOT gate:** the **F14 (expo-secure-store token storage)** and **F20 (redux-persist purge/namespace/version)** client *plumbing* is coupled to email/password auth issuance, **not** to the styled component library — it may proceed with the auth client wiring independent of the OQ-111 map. The **OQ-112** privacy-enum pin (`friends`|`public` on `/me` + `/users/:id`) is likewise the spec-owner's job and is **non-blocking** — the client may proceed on the assumed spelling already tagged `// ASSUMPTION(OQ-112)` in `packages/shared/src/schemas/common.ts`. **Run Lane A to completion while Lane B's visual shell waits on the map.**

---

## The build sequence (from plan §4)

Every net-new endpoint **clones the F29 four-layer pattern**: `defineRoute({ mutates:true, authzTest })` → **controller** → **service** (`@mutation` marker, SYS-01 ownership via the scoped helper, `emitOnCommit` inside the mutation's own transaction) → **repository** (scoped-query). Request schema imported from `packages/shared` (the field-for-field api-contract transcription, `.strict()`, every string length-bounded + trimmed); response shaped by the F06 serializer. Add the **api-contract fidelity snapshot** (F09) for each new request schema. **The actor id is NEVER trusted from the body** — SYS-01 resolves the target from the authenticated principal only.

1. **Foundation floor first (un-retrofittable).** Widen the `AppError`→middleware error family (zod→**422** `VALIDATION_ERROR`, `SERVER_ERROR`→**500** generic body, neutral `AUTH_FAILED`). Wire **F18** observability round-trip (client Sentry + server pino/request-IDs; a thrown error reaches Sentry keyed by request-ID; a funnel event reaches the dash). Populate the **F24** DomainEventType envelope/registry off the M1 emit seam. Stand up the tab-nav shell (client lane). These land *with* the first real endpoints and gate at M2 exit.
2. **Data layer + migrations.** `users` (+ `email_verified_at`, **`role ∈ user|admin`** (+ **`adminTier ∈ 1..4`** for admins; `user` → none/null), `favourite_game_id`, `created_at`), `auth_identities` (Apple/OAuth subs, linked by verified email — AUTH-09), and the **refresh-token store** (built for rotation + reuse-detection per decision 1 below). **`role` is exactly `user|admin` per SYS-08 / api-contract 0.30 (decision 0034) — the `moderator` value was dropped/burned; do NOT re-introduce it from the stale api-contract changelog 0.29 row (0033), which 0.30 supersedes.** Drizzle migrations generated + committed + **reviewed in the PR**. **Any destructive/irreversible migration is change-class #1 → owner STOP-and-file, never assume.**
3. **Auth — issuance core.** `POST /auth/register` (AUTH-01/08/10: unique email, ≥8-char argon2/bcrypt password, `acceptedTerms`, sends verify email) → `POST /auth/login` (AUTH-02; suspended → `ACCOUNT_SUSPENDED` + `{reason, until?}`) → `POST /auth/refresh` (**rotation** — see decision 1) → `POST /auth/logout` (AUTH-05, invalidates the refresh token). Wire the **SYS-05 rate-limiter (F17)** on every auth route. **Neutral / anti-enumeration responses** (AUTH-11 / decision 0043): wrong password, unknown account, unverified account all return the same `AUTH_FAILED` — no existence disclosure.
4. **Auth — recovery + soft-verify.** `POST /auth/password-reset/{request,confirm}` (AUTH-04 — single-use, ~1-hour token; used/expired/invalid → `VALIDATION_ERROR reason:"invalid_token"`), `POST /auth/verify-email/{request,confirm}` (AUTH-08 — soft, gates nothing), `GET /auth/username-available?u=` (advisory, screened MOD-07 + uniqueness, rate-limited AUTH-11). **Email sender stubbed** (log/no-op in dev; real transport F39 is a non-gate-blocking fast-follow — you do NOT provision the provider account/secrets, that's the owner).
5. **`POST /auth/apple` (STUBBED verifier — decision 2).** Build the endpoint, `user.usernamePending=true`, link-by-verified-email (AUTH-09, private-relay emails accepted), the `auth_identities` write — **all downstream machinery now**. Isolate Apple JWT verification behind **ONE `AppleTokenVerifier` interface** with a stubbed/mock impl. **DEFER to enrollment (M1-P):** (a) the real server `AppleTokenVerifier` impl, (b) the client native SIWA button/entitlement (lives **outside Expo Go**, un-exercisable in the Expo Go loop). Until enrollment lands, the client **omits the SIWA button or wires it only against the mock**. **NEVER claim SIWA done before enrollment.**
6. **Profile widening — `PATCH /me`.** Grow the M1 bio-only body → `{ username?, bio?, favouriteGenreIds?, favouriteGameId?, privacy? }` (PROF-01/03; username cooldown-limited + screened, PROF-06/MOD-07; `usernamePending` completion path). `avatar` leaves this PATCH (PROF-08 — draft/publish shape-stubs, not the pipeline).
7. **`GET /users/:id` — the FIRST TARGET-ID route (this is gate G-D).** Build out the **F06 read-path serializer** (`toPublicShape` / `toFriendShape`, allowlist per PROF-03). Two privacy-gated shapes (friend/full vs non-friend/limited), a `relationship` field, and blocked/suspended/deleted collapsed into one **generic `NOT_FOUND`-style "unavailable"** non-disclosure (api-contract line 62 / changelog 0.11) — all three collapse to the **same status + body an unknown id returns**, never revealing which state (nor who blocked whom). **This is where the REAL cross-user 4xx / privacy-shape authz test finally becomes writable** — the standing test asserts the *shape returned to actor-B*, not merely a 4xx-on-write. Until this lands, SYS-07 is PROVISIONAL (0052 §4).
8. **Profile support endpoints.** Gamertag CRUD (`GET/POST /me/gamertags`, `PATCH/DELETE /me/gamertags/:id` — PROF-02, controlled platform list) + avatar draft/publish **shape-stubs**.
9. **Client vertical (Lane B — after OQ-111 map lands).** Tab-nav shell → seeded STYLED Collection shelf (F-01..F-09, F-06 21/15/11/9) → self-profile render (Device hero, Top-3 of top10, Now Playing, stats). Tokens bound to shared zod via **`z.infer` (F31)** — which needs the **F23** request/response split done first. Runs on a physical iPhone via **Expo Go against local/scratch-seeded data**.

---

## The M2-Foundation build-outs (land NOW; gated at M2 exit)

These are the M1 seams turned into working machinery (0051 / 0052 §4):

- **F14** — access/refresh tokens → **expo-secure-store** (secure token storage on device). *This is auth client plumbing, coupled to email/password issuance — **not** part of the OQ-111-map-gated styled shell; it may proceed with the auth client wiring.*
- **F15** — **refresh-revocation model** — built per **decision 1** (rotation + reuse-detection) from day one.
- **F20** — redux-persist **purge / namespace / version** (clean slate on logout / schema bump). *Like F14, this is auth/state plumbing — **not** blocked by the OQ-111 map.*
- **F16** — privilege-check seam + **transactional MOD-10 audit row** (written inside the mutation's own tx via the `@mutation` seam). *The privileged-OPS themselves stay M7 — build the seam + audit row only.*
- **F17** — **SYS-05 rate-limiter** wired on the auth routes (returns `RATE_LIMITED` / 429).
- **F23** — request/response schema **split build-out** (M1 shipped only the presence-lint). *Chain: **F23 → F31 → F09**.*
- **F24** — outbox event **envelope** + DomainEventType registry population (the table + `emitOnCommit` seam were M1).
- **F31** — RTK Query bound to `z.infer` off the shared schemas (**needs F23 first**).
- **F09** — the api-contract fidelity **snapshot test** (the one 0045 promised — distinct from the M1 presence-lint).
- **F18** — observability round-trip end-to-end (Sentry / pino / request-IDs / one funnel event).
- **F36** — **concurrent authz tests** as standing suites (fire N parallel, assert one wins / all-but-one 4xx).

**Explicitly OUT of M2 (do NOT build):** the **outbox relay / consumer / delivery infra** and the **rule-5 FAIL-PR lint teeth** (both **M7** — the emit *seam* + *envelope* are the only must-now parts); **M4** customization/render/CARD-15 composition-schema design/Skia pipeline (avatar endpoints are shape-stubs only); **M5** economy/IAP/ECON-*/RevenueCat (F13 IAP-IDOR stays M5); **restore-drill EXECUTION** (re-timed to M3-exit / M1-P-complete); the **AUTH-07 deletion-ripple + its real gate** (M7 — see decision 3, **build no partial deletion/teardown slice in M2**); F16 full privileged-ops (M7); F18 PII/Sentry label review (M8).

---

## The M2 gate batch (one batched owner sitting, pinned to the gate-3 window)

M2 is the heaviest owner sitting, but it's mostly "watch one demo / confirm one receipt," batched into one session pinned to the existing **gate-3** window. Build so each is demo-able. *(Provenance note: plan §5 names the mid-milestone gate "Gate #3" and lists **G-M** as light + **G-K** as async/always-on; plan §1's exit-bar sentence enumerates only "G-D/E/F/G" — so if you cross-check against that line, G-M and G-K are not invented here, they come from §5 and ride the same sitting.)*

- **Gate #3 — Auth + SYS-01 seam review** *(mid-milestone; the M2 owner-gate of record)*: owner eyeballs the auth model + confirms the standing-test pattern is real. This is where the prototype's cross-user vuln lived.
- **G-D — Authz "break-it" demo** *(M2 exit)*: **the REAL cross-user 4xx test M1 could not yet write.** With `GET /users/:id` live, the owner watches mutation-tests go RED when SYS-01 scoping is removed **and** a read-path test go red when a privacy predicate is removed; authz-test count == mutating/target-id-endpoint count; tests carry 4xx **teeth**, not mere existence. SYS-07 is PROVISIONAL until this lands.
- **G-E — Un-retrofittable lock-in** *(M2 exit, receipt)*: the single `emitOnCommit` seam is the only mutation path (un-bypassable); the **MOD-10 audit row writes transactionally** with privileged mutations; a one-line **observability round-trip** (thrown error → Sentry; a funnel event → the dash).
- **G-F — Recoverability** *(M2 exit)*: **migration roll-forward / roll-back demo ONLY.** The **restore-drill EXECUTION is deferred** (M3-exit / M1-P-complete) — off the M2 sitting.
- **G-G — Auth fidelity + abuse-levers** *(M2 exit, rides gate-3, light)*: **rotation rejects the old refresh token**; AUTH-04 reset is single-use; AUTH-11 neutral responses are real; the SYS-05 limiter returns **429 under burst**.
- **G-M — New-dependency glance** *(M2 exit, light)*: 30-second owner yes/no on dependency-manifest changes (rule 8, runtime *or dev*).
- **G-K — SYS-04/05 value sign-off** *(async, always-on)*: owner "yes" on the rate-limit numbers before they take effect (safe-default-until-approved; won't stall a release).

*(G-L is economy-only/M5 — not expected to fire.)*

---

## Governance & STOP rules (inline — obey throughout)

- **One spec editor.** Never hand-patch behavior/rules/data into a downstream doc or into code. A needed rule/shape that isn't specced → file it to `docs/open-questions.md`. **M2 IS the auth / SYS-01 change-class — the single highest-risk domain (the prototype's cross-user vuln lived exactly here).** Any **auth, SYS-01 authorization, or destructive-migration** gap is **STOP-and-file, MANDATORY — never assume, never proceed.** These also ride owner sign-off as change-classes even when specced (CONVENTIONS §"Three changes that need OWNER approval").
- **The `// ASSUMPTION(OQ-xxx)` third path** is for **trivial, reversible** gaps ONLY (e.g. the OQ-112 enum spelling) — tag it, file it, proceed, surface it at the G-M glance. It is **never** valid for a STOP domain above.
- **Reference behavior by stable ID** (`AUTH-04`, `PROF-03`, `SYS-01`…); don't restate it. IDs are append-only.
- **PR-for-everything cadence** (AGENTS.md / 0052): **branch → green CI (the six-check spine) → self-merge.** `main` is branch-protected with `enforce_admins`; `required_approving_review_count=0` (solo owner — GitHub forbids self-approval; the required `ci` check + strict + enforce_admins are the enforcement). **Never direct-to-main** — nobody, including the owner, bypasses `main`.
- **Filing an OQ or a decision?** Take the next free number by listing `docs/open-questions.md` / `docs/decisions/` first (parallel tracks claim numbers concurrently — collisions happen).
- **Git identity = personal `Aiden-Molyneaux`** (NOT `VTM-Aiden-Molyneaux`); local identity is already set — do not override; origin is HTTPS. **Commit / push / open a PR ONLY when the owner explicitly asks.**
- **Doc-graph health:** if you touch the doc graph (00-INDEX, product-spec, api-contract, SCREEN-STATUS, open-questions, decisions), run **`node scripts/health-check.mjs`** and clear red before declaring done. Never hand-edit `docs/PROJECT-HEALTH.md` (generated).
- **Don't touch unrelated code.** Simplest solution for simple problems. Surface design smells as a **separate** issue. If you see a clearly better approach, state the tradeoff in 2–4 bullets before implementing.

---

## Definition of Done (M2)

**Backend lane**
- [ ] Migrations: `users` (+`email_verified_at`, **`role ∈ user|admin`** (+ **`adminTier ∈ 1..4`** for admins; `user` → none/null — SYS-08 / api-contract 0.30; **`moderator` dropped/burned per decision 0034 — do NOT re-add from the stale 0.29 changelog row**), `favourite_game_id`, `created_at`), `auth_identities`, refresh-token store — generated, committed, reviewed in-PR; roll-forward/back demo-able (G-F).
- [ ] Email/password auth complete: register / login / **refresh (rotation)** / logout / password-reset{request,confirm} / verify-email{request,confirm} / username-available — neutral anti-enumeration responses, SYS-05 limiter (F17) on all.
- [ ] **F15 refresh reuse-detection:** replay of a rotated refresh token **REVOKES THE ENTIRE DESCENDANT TOKEN FAMILY** and forces re-auth (decision 1) — with a test proving it.
- [ ] `POST /auth/apple` behind ONE `AppleTokenVerifier` interface (stubbed impl); `usernamePending`, AUTH-09 link-by-verified-email, `auth_identities` write all built; real server verifier + client native button explicitly deferred to enrollment and NOT claimed done.
- [ ] `PATCH /me` widened (`{username?, bio?, favouriteGenreIds?, favouriteGameId?, privacy?}`); `GET /users/:id` with F06 `toPublicShape`/`toFriendShape` + `relationship` + generic **`NOT_FOUND`-style** unavailable non-disclosure (api-contract line 62 — blocked/suspended/deleted all collapse to the same status+body an unknown id returns); gamertag CRUD; avatar draft/publish shape-stubs.
- [ ] Every net-new endpoint clones F29 (defineRoute mutates+authzTest → controller → service `@mutation`+SYS-01+emitOnCommit → scoped repo), shared zod, F09 fidelity snapshot.
- [ ] **G-D:** a real actor-B-hits-actor-A **4xx** test on `GET /users/:id` + a read-path privacy-shape test; authz-test count == target-id/mutating-endpoint count.
- [ ] Foundation build-outs landed: F14, F15, F20, F16 seam + transactional MOD-10 audit row, F17, F23, F24 envelope, F31 (post-F23), F09, F18 round-trip, F36 concurrent suites.
- [ ] **NO** AUTH-07 deletion slice; **NO** outbox relay / rule-5 FAIL-PR teeth; **NO** M4/M5 work absorbed. Anything deferred is filed/noted.
- [ ] CI six-check spine green, in order; integration on a real Testcontainers Postgres; no secrets in repo or client bundle.

**Client lane** *(styled-shell work after the OQ-111 re-synced map lands; F14/F20 auth-plumbing NOT map-gated)*
- [ ] Tab-nav shell + seeded **STYLED** Collection shelf (F-01..F-09, F-06 21/15/11/9) + self-profile render — using ONLY canonical component-map names/variants/tokens (none invented).
- [ ] Tokens bound to shared zod via `z.infer` (F31); expo-secure-store token storage (F14); persist purge/namespace (F20). *(F14/F20 may land with the auth client wiring — they are not blocked by the OQ-111 map even though the visual shell is.)*
- [ ] The full win runs on a **physical iPhone via Expo Go against local/scratch-seeded data** (not a login form; no Apple, no G-C).

---

## Report-back receipt (end every substantial pass with this)

1. **What was built** — files created/changed, the stable IDs + F-numbers addressed, which build-sequence steps + Foundation build-outs are done, which lane, and any downstream docs chain-updated.
2. **What you assumed or decided, and why** — each `// ASSUMPTION(OQ-xxx)` you filed (**confirm none touched a STOP domain: auth / SYS-01 / destructive-migration**), plus tradeoffs taken.
3. **What's unsure / needs the owner's eyes** — OQs filed, anything blocked on a STOP-and-file domain or on the OQ-111 map (client styled shell) or on Apple enrollment (real SIWA), and any spec/contract gap you hit.
4. **Gate readiness** — the specific demo you can run for gate-3 / **G-D** (which authz test goes red-on-purpose, which privacy-shape test) / G-E (single emit seam + transactional audit + observability round-trip) / G-F (migration up/down) / G-G (rotation rejects old token, reset single-use, neutral responses, limiter 429 under burst) / G-M (dependency-manifest diff), and whether the Expo Go device win is standing.
