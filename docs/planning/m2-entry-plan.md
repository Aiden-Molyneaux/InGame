# M2 ENTRY PLAN — InGame

> **STATUS: FINALIZED — the §7 decisions are RESOLVED (owner, 2026-06-30):** (1) refresh = **rotation + reuse-detection** (revoke family on replay); (2) SIWA = **stub now, swap later** — lead on Expo Go, real SIWA (server verifier + client button) deferred to enrollment; (3) AUTH-07 account deletion = **wholly at M7**, no M2 slice; (4) the **OQ-111 component-map re-sync + OQ-112 pin are done by Claude (spec-owner)** before the client lane. The OpenCode build brief [`m2-build-task.md`](m2-build-task.md) bakes these in and is the build source-of-truth; this plan is the scope / sequence / gate rationale behind it.


*Lead-engineer scope for M2 (Foundation floor + first real vertical slice). Built strictly from the ratified docs (road-to-market §2/§3/§4/§6/§7/§11, product-spec AUTH-\*/PROF-\*/SYS-\*, api-contract, m1-scaffold-task F29/F06, decisions 0045/0046/0051/0052, open-questions OQ-111/112/113). M2 runs in OpenCode.*

---

## 1. M2 in one paragraph + the minimum vertical slice

M2 turns the M1 scaffold spine into the **Foundation floor + the first real vertical slice**: real auth (email+password *and* Sign-In-With-Apple, with refresh-rotation), the data layer + migrations, SYS-01 ownership-scoping backed by standing SYS-07 authz tests, the AppError→422/500 error family, the ACH-08 emit seam, a tab-nav shell, and Sentry+pino observability. The proof is the **early tangible win**: **sign in → your profile → tested → green in CI → running on a physical iPhone (via the Expo Go managed loop), rendered in the InGame aesthetic.** The device build must show the **seeded, STYLED Collection shelf** (mirrors the existing HTML mockups) — *not* a login form — which is the whole point (kills the "invisible for months" risk and is the first stage of the staged release).

**EXIT BAR:** a real, tested, CI-green slice — email+password sign-in → your profile → the styled seeded Collection shelf in the InGame aesthetic — running on a physical iPhone **via the Expo Go managed loop against local/scratch-seeded data**, on the Foundation floor, with the M2 gate batch (G-D/E/F/G) cleared in one owner sitting pinned to the gate-3 window. **This morale demo sits behind NEITHER Apple enrollment NOR the G-C infra cutover** (0052 §2: the M1 device loop was satisfied via Expo Go with no Apple enrollment). Two things are explicitly OUT of the exit bar and follow separately: (i) **real SIWA end-to-end on device** (server verifier + client native SIWA button — both trail M1-P); (ii) the **real-infra seeded build** (G-C-gated). Neither is on the M2 critical path.

**IN M2:**
- Auth stack: `/auth/register`, `/auth/login`, `/auth/refresh` (rotation), `/auth/logout`, `/auth/password-reset/{request,confirm}`, `/auth/verify-email/{request,confirm}`, `/auth/username-available`, `/auth/apple` (SIWA, stubbed verifier until enrollment). Neutral/anti-enumeration responses (0043). SYS-05 rate-limiting on all of them.
- Data layer + Drizzle migrations: `users`, `auth_identities`, refresh-token store.
- Profile vertical: widen `PATCH /me` (bio-only → full body), net-new `GET /users/:id` (first target-id route), gamertag CRUD, avatar draft/publish.
- Foundation build-outs (§6 below): F14/F15/F20, F16-check+MOD-10 audit row, F17, F23, F31, F09, F18, F24-envelope, **F36** (concurrent economy/authz tests).
- Client: tab-nav shell + the styled seeded Collection shelf + self-profile render.
- **AUTH-\* auth-relevant deletion slice (PROPOSED decomposition — owner to confirm):** the token/session + push-token teardown portion only. This is a *proposed* carve-out of AUTH-07 for M2, **not an already-ratified scope item** — no cited doc scopes a partial AUTH-07 into M2 (road-map §2 lists "AUTH-\*" generically). The **AUTH-07 deletion-ripple REAL gate + broad anonymization stay at M7** (F07 → M7, M8 re-verify, per 0051/0045). If the owner declines the decomposition, drop this line; nothing else in the plan depends on it.

**Explicitly OUT of M2:**
- **No M4 customization/render** — no CARD-15 composition schema design, no Skia flatten pipeline, no closed-beta trophy-case. Avatar endpoints land as *shape stubs* (harden during design), not the full pipeline.
- **No M5 economy/IAP** — no Pixels/grants, no RevenueCat, no ECON-\*, F13 IAP-IDOR stays M5. G-L / G-I / G-J do not fire.
- **No M7 privileged-ops** (F16 privileged-OPS), **no outbox relay/consumer/delivery** and **no rule-5 FAIL-PR teeth** — those are M7 (the emit *seam* + *envelope* are all M2 builds).
- **No restore-drill execution** (re-timed to M3-exit / M1-P-complete), no deletion-ripple real gate (M7), no PII/Sentry label review (M8).

---

## 2. Prerequisites & ownership (do these FIRST)

| Prereq | What it is | Owner | Blocks client coding? |
|---|---|---|---|
| **OQ-111** component-map re-sync | Re-derive the map against design-spec §1.5 (v0.41→v0.49 drift) + **lock the two 🔶 provisional name-sets** (Achievements 4.10, Admin 4.4). Boards are already converged (0038/0037); this is §1.5 formalization + name-lock, not board work. | **spec/design (Claude Design)** — build agent is a *consumer* of the map, not its author | **HARD BLOCK on client-UI / component-library coding.** Can run in PARALLEL with M1/backend (M1 built no component library). Must land at the M2 boundary before OpenCode writes shared components. |
| **OQ-112** privacy-enum pin | Pin canonical PROF-03 token values (`friends`\|`public`) into api-contract on `GET /me` + `PATCH /me`. Already coded+tagged `ASSUMPTION(OQ-112)` in `packages/shared/src/schemas/common.ts`; reversible. | **spec/api-owner (Claude)** | **Non-blocking** — client can proceed on the assumed spelling in parallel; just formally pin at M2. Independent of SYS-01 enforcement. |
| **OQ-113** SCA gate tighten | Move `npm audit` gate from `--audit-level=critical` toward `high`; consider audit-ci / osv-scanner to filter Expo-tooling noise. Gated on external triggers (next Expo SDK major + vitest 2→4). | **build/CI agent** | **Non-blocking** — CI-hardening item, runs independently. |
| **Apple Developer enrollment** | Real Service ID / Team ID / Key ID / .p8 to verify SIWA `identityToken`/nonce against Apple's public keys; unlocks the client native SIWA module/entitlement outside Expo Go. | **owner (in flight)** | Blocks only the **real SIWA path (server verifier + client native button)** — build behind a stubbed verifier meanwhile (see §3). **Does NOT block the M2 morale demo** (Expo Go, email+password), per 0052 §2. |
| **G-C** live-infra + env separation | Distinct prod/staging/local DBs; agent-destructive paths only at disposable DBs; secrets in host store; billing owned. Scoped to **M1-P** in the gate table. | **owner / infra** | Blocks only the **real-infra seeded build**. The vertical develops — and the exit-bar demo runs — against **local/scratch DBs** (no G-C needed); the *device build against real infra* is a separate, G-C-gated follow. |
| **Transactional email provider** | Real delivery for AUTH-04 reset + AUTH-08 verify (SYS-03 secrets). | **owner** — provider account + SYS-03 secret provisioning (F39 real transport); **build agent** — stubbed log/no-op sender in dev only | Non-blocking — dev runs on the stub; the agent does **not** provision the real account/secrets (owner task, matches the M1-P provisioning pattern). Real transport is F39 fast-follow (non-gate-blocking). |
| **G-K** SYS-04/05 value sign-off | Owner "yes" (now async, safe-default-until-approved) on the rate-limit numbers before they take effect. | **owner** | Non-blocking — async, won't stall a release. |

---

## 3. The Apple-enrollment dependency + sequencing recommendation

Only the **real SIWA credential/token-verification path** is gated on the owner's Apple Developer enrollment (in flight). Everything *downstream* of the verified-identity claim — `usernamePending=true`, linking-by-verified-email (AUTH-09), the `auth_identities` row, the whole username-pending completion flow — is buildable **now behind a stubbed/mock Apple-token verifier**, exactly mirroring M1's stubbed-actor precedent.

**The morale demo does not sit behind Apple.** Per 0052 §2, the M1 physical-iPhone loop was satisfied via the **Expo Go managed loop with no Apple enrollment required**; only the standalone / custom-dev-client build trails M1-P. So the entire tangible-win half (styled seeded Collection shelf + email/password sign-in + self-profile) runs on a physical iPhone via Expo Go **now**, zero Apple dependency. *(Road-to-market line 252 — "Apple Developer… M2 device build onward" — and line 254 predate 0052 and are non-authoritative where they disagree with a decision; 0052 supersedes.)*

**Recommendation: run two lanes in parallel and swap real SIWA in last.**

**Proceed NOW (independent of Apple):**
1. **Data layer + migrations** — `users`, `auth_identities`, refresh-token store. Hard prerequisite for every auth handler; zero Apple dependency.
2. **Email+password auth in full** — register/login/refresh-rotation/logout/password-reset/verify-email/username-available. No Apple dependency; fully specced and buildable.
3. **`POST /auth/apple` behind a stubbed verifier** — build the endpoint, `usernamePending`, linking-by-verified-email, `auth_identities` write. Isolate Apple JWT verification behind one `AppleTokenVerifier` interface so only that impl swaps.
4. **Profile vertical + client styled-shell** — self-profile render off `GET /me` (already built at M1), `PATCH /me` widening, `GET /users/:id`, gamertags, tab-nav shell, seeded Collection shelf, **on a physical iPhone via Expo Go against a local/scratch-seeded DB**. This is the *tangible-win* half and depends on **OQ-111 clearing**, not on Apple and not on G-C.

**WAITS on enrollment (real SIWA — TWO halves, both M1-P-gated):**
- **(a) Server** — swap the stub for the real `AppleTokenVerifier` impl (validate `identityToken`/nonce against Apple's public keys). Because it's a single interface impl, this is a late, low-risk swap.
- **(b) Client** — the native SIWA button / entitlement that produces a real Apple token on-device. This native module lives **outside Expo Go** (0052 §2: the custom-dev-client path "unlocks the first native module outside Expo Go") and therefore **cannot be exercised end-to-end in the Expo Go morale loop**. Until enrollment lands, the Expo Go client **omits the SIWA button (or wires it only against the mock)** — SIWA is called out as **un-verifiable-on-device pre-enrollment**, never claimed "done."

**Net:** enrollment does not sit on the critical path for the M2 morale demo or most of M2. Lead with data-layer + email-password auth + profile-read/write + the client styled profile UI on Expo Go; keep both halves of SIWA at the seam; swap the real server verifier + wire the real client button when enrollment lands.

---

## 4. Build sequence for the OpenCode agent

Every net-new endpoint **clones the F29 four-layer pattern**: `defineRoute(mutates:true)` → controller → service (`@mutation`, SYS-01 ownership via the scoped helper, `emitOnCommit`) → repository (scoped-query); request schema imported from `packages/shared`; api-contract fidelity snapshot (F09). The actor id is **never trusted from the body** — SYS-01 resolves the target from the authenticated principal.

1. **Foundation floor first (un-retrofittable).** AppError hierarchy → Express error middleware → error codes (zod→422, SERVER_ERROR→500 generic, neutral AUTH_FAILED). Sentry (client) + pino/request-IDs (server). ACH-08 emit seam + DomainEventType envelope. Tab-nav shell. These land *with* the first real endpoints and are gated at exit.
2. **Data layer + migrations.** `users` (+ `email_verified_at`, role, adminTier), `auth_identities`, refresh-token store. Drizzle migrations committed + reviewed in the PR (destructive = owner change-class).
3. **Auth — issuance core.** `register` → `login` → `refresh` (rotation: new pair) → `logout` (server-side refresh store/blocklist). Wire SYS-05 rate-limiter (F17) on all auth routes. Neutral/anti-enumeration responses. **Owner decision needed: refresh-token reuse-detection** (see §7).
4. **Auth — recovery + soft-verify.** password-reset/{request,confirm} (single-use, time-boxed), verify-email/{request,confirm} (soft, non-blocking), username-available (advisory). Email sender stubbed (F39 fast-follow for real transport).
5. **`POST /auth/apple` (stubbed verifier).** usernamePending, linking-by-verified-email (AUTH-09), auth_identities write. **Two Apple-gated swaps deferred to enrollment (M1-P):** (a) the server `AppleTokenVerifier` real impl, and (b) the client native SIWA button/entitlement (lives outside Expo Go, un-verifiable in the Expo Go loop). Until then the client omits the button or wires it against the mock.
6. **Profile widening — `PATCH /me`.** Grow bio-only → `{username?, bio?, favouriteGenreIds?, favouriteGameId?, privacy?}`; username cooldown+screened (PROF-06/MOD-07); avatar leaves this PATCH.
7. **`GET /users/:id` — the first TARGET-ID route.** F06 read-path serializer build-out (`toPublicShape`/`toFriendShape`). Two privacy-gated shapes (friend/full vs non-friend/limited), `relationship` field, blocked/suspended/deleted → generic "unavailable" non-disclosure. **This is where the real cross-user 4xx / privacy-shape authz test first becomes writable** (G-D). The standing test asserts *shapes for actor-B*, not just 4xx-on-writes.
8. **Profile support endpoints.** Gamertag CRUD (`GET/POST /me/gamertags`, `PATCH/DELETE /me/gamertags/:id`), avatar draft/publish shape-stubs.
9. **Client vertical.** After OQ-111 lock: tab-nav shell → seeded STYLED Collection shelf (F-01..F-09, F-06 21/15/11/9) → self-profile render (Device hero, Top-3 of top10, Now Playing, stats). Tokens bound to shared zod via z.infer (F31), which needs the F23 request/response split first. Runs on a physical iPhone via **Expo Go against local/scratch-seeded data**.

---

## 5. The M2 gate batch

M2 is the **heaviest owner sitting** but it's mostly "watch one demo / confirm one receipt," batched into **one session pinned to the existing gate-3 window**.

- **Gate #3 — Auth + SYS-01 seam review** (*AT M2, mid-milestone*): the M2 owner-gate of record (auth/SYS-01 change-class). Owner eyeballs the auth model + confirms the standing-test pattern is real — this is where the prototype's cross-user vuln lived.
- **G-D — Authz "break-it" demo** (*M2 exit*): **the real cross-user 4xx test M1 could not yet write.** M1's SYS-07 only proved actor-B can't *write* actor-A's bio via `PATCH /me`. With `GET /users/:id` (first target-id route), the owner watches 2 mutation-tests go RED when SYS-01 scoping is removed **and** a read-path test go red when a privacy predicate is removed; authz-test count == mutating-endpoint count; tests carry 4xx *teeth*, not mere existence. **Highlight: this gate only becomes meaningful in M2 — SYS-07 is PROVISIONAL until this lands.**
- **G-E — Un-retrofittable lock-in** (*M2 exit, receipt*): prove the single ACH-08 emit seam is the only mutation path (un-bypassable); MOD-10 audit row writes **transactionally** with privileged mutations; one-line observability round-trip (thrown error → Sentry; a funnel event → the dash).
- **G-F — Recoverability** (*M2 exit*): **migration roll-forward/back demo only.** The restore-drill EXECUTION is re-timed (v2) OUT to M3-exit/M1-P-complete — off the morale-critical M2 sitting.
- **G-G — Auth fidelity + abuse-levers** (*M2 exit, rides gate-3, light*): refresh-rotation rejects the old token · AUTH-04 reset single-use · AUTH-11 neutral responses real · SYS-05 limiter returns 429 under burst.
- **G-M — New-dependency glance** (*M2 exit, light*): 30-sec owner yes/no on dependency-manifest changes.
- **Always-on during M2:** **G-K** (SYS-04/05 value sign-off, async). **G-L** is economy-only (M5) — listed for completeness, not expected to fire.
- **Per-event tripwires:** auth/SYS-01 changes (change-class #2) and any destructive migration (change-class #1 / gate 4) ride owner sign-off. **Governance:** amending a 0046 architecture lock-in re-fires the heavy **G-A**.
- **Agent-run at exit:** per-phase doc↔code fidelity audit + `/code-review` at high effort.

---

## 6. M1 seams → M2 build-outs

**Land now (M2-FOUNDATION — build out at M2, gated at M2 exit):**
- **F14** — tokens → expo-secure-store (secure token storage).
- **F15** — refresh-revocation model.
- **F20** — redux-persist purge / namespace / version.
- **F16** — privilege-check + **transactional MOD-10 audit row** (the *seam*; privileged-OPS themselves defer to M7).
- **F17** — rate-limiter presence wired.
- **F23** — request/response schema split build-out (M1 shipped only the presence-lint). *Chain: F23 → F31 → F09.*
- **F24** — outbox event **envelope** + DomainEventType registry population (the *table* + emitOnCommit seam were M1).
- **F31** — RTK Query `z.infer` binding (needs F23 first).
- **F09** — api-contract fidelity **snapshot test** ("the one 0045 promised" — distinct from the M1 presence-lint).
- **F18** — observability round-trip (Sentry/pino/request-IDs/funnel end-to-end).
- **F36** — concurrent economy/authz tests (fire N parallel, assert one wins / all-but-one 4xx).

**Fast-follow during M2 (NOT gate-blocking):** F39 email transport · F28 Drizzle journal check · F35 lint hardening · rule-5 lint teeth (seam is must-now; teeth deferred to M7, "pull to M3 if discipline slips").

**Stay PAST M2:**
- **Outbox relay / consumer / delivery infra + rule-5 FAIL-PR teeth → M7.**
- F16 privileged-OPS → M7 · F13 IAP-IDOR → M5 · F07 **AUTH-07 deletion-ripple real gate → M7-exit** (M8 re-verify) · F18 PII/Sentry label review → M8 (G-O) · F38 restore-drill → before M4 beta · CARD-15 composition schema design → M4/G-H.

*(Watch-out: F21 card `schemaVersion` was a MUST-NOW **M1** ship-blocker — not to be confused with CARD-15 composition-schema design, which is M4.)*

---

## 7. Open decisions for the owner (before the build agent runs)

See the structured `openDecisions` array. In brief:

1. **Refresh-token reuse-detection** — spec says "refresh rotation" but never specifies revoke-family-on-replay. This is security-defining and must be settled *before* the refresh store is built.
2. **Apple sequencing** — confirm the "build behind a stubbed verifier, swap real SIWA (server verifier + client native button, both M1-P-gated) when enrollment lands, lead with data-layer + profile on Expo Go" lane (§3).
3. **AUTH-07 M2 decomposition** — confirm (or decline) carving the auth-relevant deletion slice (token/session + push-token teardown) into M2 while the deletion-ripple real gate stays M7. No doc scopes this partial slice today; it's a plan proposal.
4. **OQ-111 / OQ-112 coordination timing** — confirm Claude (spec/design) does the OQ-112 api-contract pin *and* drives the OQ-111 component-map re-sync + 🔶 name-lock **now**, so the map is locked at the M2 boundary before OpenCode writes any shared components.
5. **G-C infra / provider timing** — confirm the M2 exit-bar demo runs on **local/scratch-seeded data via Expo Go** (no G-C, no Apple), with the real-infra seeded build a separate G-C-gated follow; and note when the prod/staging/local DB cutover + email provider land (email delivery can stay stubbed).
