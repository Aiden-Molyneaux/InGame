# InGame — The Road to Market (over-arching build plan)

> **What this is:** the whole road from *"design phase, no code"* to a *market-ready* mobile app,
> sized for a **hands-off solo owner** who leans on agents + automation and reviews at a few
> well-chosen gates. It is a **planning artifact, not a source-of-truth doc** — it references
> behavior by stable ID (`SYS-01`, `ECON-06`, …) per [`00-INDEX`](../00-INDEX.md) §3 and never
> restates or changes it. It builds **on** product-spec §8 phasing and `testing-strategy.md`, not
> beside them. Where it implies a spec/behavior change, that routes through `open-questions.md` (§4).

**Version:** 0.4 · **Date:** 2026-06-30 · **Author:** Claude Code · **Owner:** Aiden ·
**M1 foundation review folded in (decision 0051):** npm pinned · **Apple enrollment day-one** (G-B(d) depends on it) · the **Minimum-M1 manifest** (7-item spine, F37) governs M1 scope · this planning doc is **non-authoritative** where it disagrees with the specs / decisions / CONVENTIONS. ·
**Status:** M0 audit ruled — **full v1.0 scope, staged release** (decision 0027). Milestones are pure
build-order; v1.0 = the complete feature set.

---

## 0. Read-me & the four answers that re-size everything

Read §1 (the map) in ~5 minutes; that's enough to start M0. The rest is detail you pull when you
reach it. **Depth is proportional to imminence:** M0–M2 are spelled out; M5–M8 are stubs with a
trigger, because they're months away and the design is still converging.

I need four answers; I've assumed defaults so nothing blocks. **Correct these and I re-size in one
pass** — budget and hours are *hard* inputs once known.

| # | Question | My working default (correct me) |
|---|---|---|
| 1 | **Recurring $ ceiling** for paid services + **AI-token tolerance** per phase | ~**$30–50/mo** during build (+ $99/yr Apple, $25 once Google); free tiers first. Tokens: agents do the volume, owner gates the spend — bounded per milestone, heaviest in M4–M7. Full cost table in §3. |
| 2 | **Hours/week** + **target launch window** | ~**12 hr/wk**, evenings/weekends; **no hard date**. Sizing below is in *effort buckets* (S/M/L), not calendar — the binding constraint for a hands-off owner is **review throughput at the gates**, not code volume. |
| 3 | **Feature-audit aggressiveness** (the keep/cut/defer bar) | **RULED (decision 0027): full v1.0 scope.** The M0 audit ran; the owner chose to build the complete feature set — nothing newly cut (only the pre-parked §10 items stay out). "Defer" is now **build-order**, not exclusion; de-risking comes from **staged release**, not a smaller cut. |
| 4 | **Where this plan lives** + how hands-off is hands-off | `docs/planning/` as `road-to-market.md` + `road-to-market-deck.html` (this pair). **Confirm the names — I have not committed.** Hands-off = owner acts only at the §11 gates; agents + CI carry everything else. |

A fifth, smaller one I assumed rather than asked: **platform priority** — build **both** from the one
Expo codebase, but take **iOS first** to TestFlight/sandbox (Apple's lead time + review is the
critical path), Android following close behind on the same binary logic.

---

## 1. The map of the whole road (hold this in your head)

```
        ┌── M0 Design close-out + FEATURE AUDIT ◀ owner gate (cut/defer BEFORE code)
 DESIGN │
 ───────┼──────────────────────────────────────────────────────────────────────────
 BUILD  │   M1 Tooling gate ──▶ M2 Foundation ──▶ M3 Catalog+Collection ──▶ M4 Customization
        │   (the C gate)        (auth + 1st        (core usable)             ("TROPHY CASE" —
        │                        vertical slice)    ★ tangible win            ◆ closed beta)
        │        ╲
        │         ╲ M1-P  External accounts & provisioning (OWNER, parallel, long-lead) ─────────┐
        │                                                                                        │
        │   M4 ──▶ M5 Community & Economy ──▶ M6 Social ──▶ M7 Engagement ──▶ M8 Public launch   │
        │           (economy + IAP)            (friends)     (push/ach/mod)   (full v1.0) ◀───────┘
 ───────┴──────────────────────────────────────────────────────────────────────────
   Spine: every change rides an ENFORCED merge gate (green CI + review + secret/dep scan).
   3 change-classes need OWNER sign-off: destructive migration · auth/SYS-01 · economy/IAP.
   The few manual gates sit exactly where agent review is BLIND (taste · real-money · authz-under-load).
```

- **v1.0 = the complete feature set** (M1→M7); the public launch (M8) comes when it's all in. The
  milestones are pure **build-order**, not a cut line (decision 0027).
- **Release in stages, not all at once** (§2): a real build on your phone at **M2**, a **closed beta
  ◆ at ~M4** (the trophy case), the **public launch after M7**. "Feature-complete" ≠ "first release."
- **M1-P runs hidden under the build** — start Apple enrollment during M1, not at M8.

---

## 2. Scope & release rhythm (full v1.0, staged release — decision 0027)

**v1.0 is the complete product** — the full feature set across M1→M7. Nothing is cut for launch (only
what's already parked in product-spec §10 stays out). The M0 audit's prune list is re-read as
**build-order**, not exclusion.

De-risking comes from **how you release, not how much you build** — ship to real hands in stages while
the full product comes together, so "feature-complete" and "first release" aren't the same date:

| Stage | When | What testers get | Why |
|---|---|---|---|
| **On-device build** | end of **M2** | the styled shell + your profile on a physical iPhone | proves the stack + the aesthetic; kills the "invisible for months" risk early |
| **Closed beta** (TestFlight / Play internal) | ~end of **M4** | the trophy case — collection + full customization | the morale + validation hit; real feel before the economy lands |
| **Public launch** | after **M7** → **M8** | the complete v1.0 | launch when it's as complete as you want |

**Why full scope is right here:** a collection app without customization, economy, and social isn't a
smaller InGame — it's a lesser, different app; and for a passion-driven solo build the *motivation* a
gutted v1 would cost is itself the top risk. The honest tradeoff is **time-to-public**: full scope
before launch is a long road at ~12 hr/wk even with agents — which is exactly why the staged releases
above are non-negotiable, not optional.

---

## 3. Architecture & foundational decisions (cheap now, expensive later)

**Verdict on the stack (product-spec §9):** it's well-chosen for a solo, agent-driven, hands-off
build — **keep it.** Expo/RN + RTK Query + Express/TS + Drizzle/Postgres + zod + RevenueCat is
boring-on-purpose, which is what you want. The decisions below are the ones that are painful to
reverse, so they're settled (as a `decisions/` record) **as M1 entry criteria**, not discovered mid-build.

| Decision | Recommendation | Why / ID |
|---|---|---|
| **Repo shape** | **Monorepo**, npm/pnpm workspaces: `apps/mobile` · `apps/api` · `packages/shared` (zod schemas + types). Skip Turborepo/Nx for now. | The shared zod schemas make `api-contract.md` *executable* — one source for FE+BE payloads. Don't over-tool. |
| **Env / config & secrets** | Env-only; `.env*` gitignored; secrets in the host's secret store; **gitleaks secret-scan in CI**. Never a secret in the repo. | `SYS-03` |
| **Ownership scoping** | A scoped-query helper at the **repository/service** layer; every mutating endpoint carries a standing authz test. | `SYS-01` enforced by `SYS-07` — the cross-cutting law; the prototype's original sin |
| **Error handling** | One `AppError` hierarchy → Express error middleware → `api-contract` error codes; zod failure → **422** (decision 0043/0051); `SERVER_ERROR` 500 carries a generic body (internals to Sentry); auth failures stay neutral `AUTH_FAILED`. Established in M2. | consistent client handling of `SYS-10`/error family |
| **Domain events** | An in-process emit/outbox convention in **Foundation** so every mutation emits events; achievements (M7) **and** analytics (§7) consume them — no retrofit. | `ACH-08` |
| **Migrations** | Drizzle migrations generated + **committed + reviewed in the PR**; expand-contract for column changes; **destructive/irreversible = owner-approval change-class** (§5). | migration discipline |
| **Backup / restore (lean)** | Managed-Postgres **automated daily backups** (PITR if the tier offers it) + **one tested restore drill** (restore to a scratch DB, verify) **before real users**. Not DR. | "can we recover," right-sized |
| **Render pipeline** | Composition JSON → flatten to CDN image via react-native-skia; effect/finish as runtime overlays. The single hardest piece — prototype it early in M4. | `CARD-15` |

### Recurring cost (assumed — every line the plan introduces)

| Service | Role | Cost (build phase) |
|---|---|---|
| Apple Developer Program | TestFlight + App Store | **$99/yr** (~$8/mo) — required, long lead (M1-P) |
| Google Play Console | Play distribution | **$25 once** |
| Managed Postgres + API host (e.g. Render, or Neon DB + Render API) | server + DB w/ auto-backups | **~$14–25/mo** (free tiers exist; backups want paid) |
| Object storage + CDN (e.g. Cloudflare R2) | flattened card images | **~$0–5/mo** (generous free tier) |
| Sentry | client crash + server errors | **$0** (free tier) |
| Analytics (e.g. PostHog) | thin funnel | **$0** (free tier) |
| RevenueCat | IAP layer | **$0** until >$2.5k/mo tracked revenue |
| EAS Build/Submit | device builds + store submit | **$0** free tier (or build locally; ~$0–19/mo if heavier) |
| GitHub Actions | CI | **$0** (free minutes; watch overage) |
| Domain | privacy/ToS page | **~$1/mo** |

**Build-phase recurring ≈ $25–50/mo** + the $99/yr Apple + $25 Google. RevenueCat/EAS/Sentry/PostHog
stay free at this scale. Token spend isn't listed (depends on Q1) but is heaviest M4–M7 and trickles
steadily through the per-PR agent reviews + per-phase audits.

---

## 4. The milestone roadmap (defined ONCE — §6 and §11 reference these IDs)

| ID | Goal | Entry | Exit / "Done" | Verifier | Owner-gate? | Stable IDs delivered |
|---|---|---|---|---|---|---|
| **M0** | Design close-out **+ feature audit** | now | **Audit ruling first** (keep/cut/defer → a `decisions/` record); then design only the *surviving* not-started screens to converged + clear their formalization debts. `SCREEN-STATUS.md` all ✅ or consciously deferred; `open-questions.md` triaged | owner + agent (Burt DS audit · doc-fidelity audit) | **YES** | (scope ruling) — gates the 4.4/4.7/4.9/4.10/4.13/4.14 + 4.6 rows |
| **M1** | **Tooling gate** (the gate 00-INDEX names) | architecture decided (§3) | Monorepo scaffold · Expo **Chrome+iPhone** loop from one codebase · **seed/mock layer** (shared factories) · test harness + CI green (typecheck→lint→unit→integration/Testcontainers) · strict TS/ESLint/Prettier · **lockfile committed + SCA + secret-scan in CI** · local↔CI parity | auto (CI green on a hello-world slice) + owner (one-time: the loop runs on *your* iPhone) | small | `SYS-06`, `SYS-03`, `SYS-02` (harness) |
| **M1-P** | **External accounts & provisioning** (parallel, owner-only) | starts **with M1** | Apple Dev + Google Play enrolled (identity verification = multi-week) · bundle IDs + signing · RevenueCat acct + per-store products/entitlements · APNs/FCM push creds | owner | **YES** | (provisioning) — unblocks IAP (M5) + push (M7) + ship (M8) |
| **M2** | **Foundation** + the first vertical slice | M1 green | auth (refresh rotation + SIWA) · users/profile · data layer + migrations · **`SYS-01` scoping w/ standing `SYS-07` authz tests** · tab-nav shell · `ACH-08` events. **Vertical slice:** sign in → your profile → tested → green in CI → **running on a physical iPhone, rendered in the InGame aesthetic** | auto + agent + **owner (authz seam + device smoke)** | **YES** (auth/SYS-01) | `AUTH-*`, `PROF-01..`, `SYS-01/02/06/07`, `ACH-08` |
| **M3** | **Catalog + Collection** — core usable | M2 | create/search/**dedup** catalog (`CAT-03` test-first) · collection CRUD · status/hours/stats. **You can build a real collection on your phone.** | auto + agent + owner (device feel) | no | `CAT-*`, `COL-*` |
| **M4** | **Customization** — the trophy case · ◆ **closed beta** | M3 | Card editor (Styler+Canvas) + Device editor (free assets) · **composition→flatten render** (`CARD-15`) · effects/finishes. **Build-order:** `CARD-15` pipeline **before** the editor depth tails (`CARD-09/10/11`); `CARD-16` non-gesture editor path is a launch gate, not a trim · **+ Game page (§4.2) hub shell** — the CARD-23 NAVIGATE target + M3-deferred per-game host (CARDS switcher `OQ-056`/`CARD-24` · status/hours/now-playing/remove · card INSPECT/enlarge). **Scope = free/private only** (§0.8 **DEFAULT**, decision 0062): make · style · compose · save-private · equip your own with free assets — **publish/adopt/premium-reconcile are M5** (drawn, not built); **Onboarding deferred**, but its **CAT-11 NEW-RELEASES rail lands here** on Add Game (0062) | auto + agent + **owner (aesthetic — the product's soul)** | **YES** (taste) | `CARD-*` (incl. `CARD-24`), `DEV-*`, `COSM-*` (free), `CAT-11` |
| **M5** | **Community & Economy** | M4 **+ M1-P done** | publish/adopt cards **(+ the M4-deferred premium preview→reconcile `CARD-13` + the `OQ-122` published-read guard; §0.8 boundary, decision 0062)** · wallet + ledger · store + **IAP + receipt validation** (`ECON-06`) + **refund reversal** (`ECON-09`) + restore · contributor profile. **Economy/IAP seam is test-first.** **Notes:** `ECON-05` reward arrives progressively — raw adoption count here, prestige/milestones with the achievements engine (M7); the **non-hold purchase a11y** alt (`OQ-046`) is a launch gate; ship block-against-card-designer (`SOC-09` light) — `CAT-05` credit is attributable UGC | auto (idempotent grants · ledger reconciles · refund reverses) + agent + **owner (manual IAP sandbox pass)** | **YES** (economy/IAP) | `CARD-15/19/20`, `ECON-*`, `CAT-05/07` |
| **M6** | **Social** (in v1.0) | M5 | friends · profiles · compare hours (`SOC-03`) · Top-10 · recommendations · What to Play | auto + agent | no | `SOC-*`, `WTP-*` |
| **M7** | **Engagement** (in v1.0) | M6; **OQ-004/005 + OQ-060 first** | push (expo-notifications) · activity feed · discovery · moderation console (`MOD-04`) · **achievements engine + celebration** (rides `ACH-08`, completes the `ECON-05` reward). **Note:** `NOTIF-01` push cannot ship without `NOTIF-04` priming (the OS prompt is one-shot) | auto + agent + owner (push creds) | small | `NOTIF-*`, `DISC-*`, `MOD-*`, `ACH-*` |
| **M8** | **Public launch readiness** | the full feature set (M1–M7) is exit-green | store requirements met · **manual IAP sandbox pass** · privacy/ToS + App Privacy labels + 13+ rating (`AUTH-10`) · UGC compliance (`SYS-09` + report/block) · **`AUTH-07` deletion ripple wired against the kept set** (no hollow row-delete) · public beta → launch checklist | owner + auto (Maestro journeys, testing-strategy §5) | **YES** (submission) | (release) |

> **M4-entry orphan + mis-slot resolutions (decision 0062, from the phase-coverage audit).** The
> **Game-page hub shell → M4** (was a P0 orphan — no prior build owner; now the first-article surface +
> the CARD-23 NAVIGATE target). **Onboarding (O1–O10) → deferred past M4** (P1 orphan — recorded, *not
> dropped*; lands near public-launch when real new users arrive; AUTH-06 + NOTIF-04 travel with it; the **CAT-11 NEW-RELEASES rail is pulled out to M4** on Add Game, endpoint exists).
> **CAT-12** (FRIENDS ARE PLAYING) → **M6** (hard-needs the SOC-01 friend graph). **MOD-07** screening
> stays **M7** — M2–M4 write paths accept **unscreened** text (acceptable for the closed/trusted beta).
> **CARD-15 standin:** M2/M3 shelves render the CARD-18 default + static art, **not** composed renders
> (the flatten pipeline lands M4). **CARD-21** external image-share → **M5**.

**Effort buckets (caveated; agent-accelerated):** M0 M · M1 S–M · M2 M · M3 M · M4 **L** · M5 **L** ·
M6 M · M7 M–L · M8 S (owner-heavy). M4 (render pipeline) and M5 (real-money) are the two genuinely
hard milestones — budget the most agent + owner attention there.

### The early tangible win (anti-abandonment)

The danger zone is a long plumbing stretch with nothing pretty on the phone. Mitigation, baked into
the exits above: **M2's vertical slice renders the seeded, *styled* Collection shelf** (the design
mockups already exist as HTML — the RN shell mirrors them) so Foundation ends with something that
*looks like InGame* on your device, not a login form. From there each milestone adds visible payoff;
no stretch runs >~2 weeks dark. The full aesthetic payoff lands at **M4** — the closed-beta checkpoint.

---

## 5. Hands-off quality guardrails — THE SPINE

The premise: you won't read every line. So quality is **enforced by the pipeline**, and the few
things you *do* look at are placed exactly where automation is blind.

### The enforced merge gate (not advisory)
- **Branch protection on `main`:** no direct pushes; **required green CI** + **required review**
  before merge; linear history.
- **CI gates, per PR:** typecheck → lint → unit → integration (Testcontainers PG); **secret-scan
  (gitleaks)** + **`npm audit`/SCA**; the build must compile. (E2E nightly, not per-PR.)
- **Definition-of-Done checklist** every task must satisfy (also §8): spec-ID referenced · tests for
  any risk-domain behavior · **`SYS-07` authz test if the endpoint mutates** · zod validation on
  input · `api-contract` updated if the seam changed · CI green · **no new runtime dependency
  without written justification.**

### Conventions a coding agent must follow (a `CONVENTIONS.md`, enforced in review)
Layered `routes→controllers→services→repositories`; every query **`SYS-01`-scoped**; every input
**zod-validated**; every test **tagged with its spec ID** (grep traceability, testing-strategy §6);
**behavior is never invented in code** — a needed change is filed to `open-questions.md`, never
hand-patched (00-INDEX §4). Tooling: `superpowers:test-driven-development` for the §3 risk domains;
`superpowers:requesting-code-review` + `/code-review` + `/security-review` per PR;
`superpowers:verification-before-completion` before any "done."

### Change-classes that require OWNER approval (everything else = agent review + green CI)
1. **Destructive / irreversible migrations** (drop/rewrite data).
2. **Auth / `SYS-01` authorization** changes.
3. **Economy / IAP / ledger** changes (`ECON-*`).

### Honest limits of agent review (why the manual gates sit where they do)
**Agents reliably catch:** convention violations, missing input validation, obvious logic/type/lint
errors, missing happy-path tests, leaked secrets (with the scanner), and *omitted* `SYS-01` scoping
**if** the authz-test pattern is enforced. **Agents do NOT reliably catch — needs a real test or
your eyes:** authorization correctness *under concurrency* (→ the integration test, not review),
economy invariants under race/double-spend (→ the concurrency test), real IAP/refund behavior (→ the
sandbox pass), product-intent drift from spec, and **anything aesthetic** ("does it feel like the
trophy case"). The §11 owner gates map 1:1 onto that blind list — they **cover** automation's gaps,
they don't duplicate its work.

---

## 6. Testing & verification, operationalized (references M-IDs — see testing-strategy.md)

- **Test-first (the §3 risk shortlist):** authorization `SYS-01/07` — standing per-endpoint from
  **M2** onward; auth `AUTH-*` at **M2**; catalog dedup `CAT-03` at **M3**; economy
  `ECON-03/06/07/09` (idempotent grants · ledger reconciles · replayed receipt never double-grants ·
  refund reverses · double-spend concurrency) at **M5**.
- **Test-after, targeted:** RNTL component tests as screens settle — **M3/M4** onward; not before
  (keeps design iteration fast, testing-strategy principle 4).
- **Per-PR vs nightly:** per-PR = typecheck/lint/unit/integration + secret-scan + SCA. Nightly/
  on-demand = the **4 Maestro journeys** (testing-strategy §5).
- **The three critical junctures of extensive testing:**
  - **(a) automated suites** — economy concurrency/ledger + IAP idempotency via *mocked RevenueCat
    webhook* (**M5**); per-endpoint authz (**M2+**); dedup (**M3**).
  - **(b) agent-driven review/verification** — every PR; plus a per-phase **doc↔code fidelity** pass
    (§8).
  - **(c) manual owner testing** — the **IAP sandbox pass before M5 ships** (automation's documented
    blind spot, testing-strategy §5), device-feel at **M3/M4**, the **TestFlight/Play beta at M8**.

---

## 7. Observability & error handling (right-sized — "know it broke and where users drop")

- **Server:** structured JSON logging (pino) + request IDs; errors to **Sentry**.
- **Client:** **Sentry crash/error reporting wired from the first real build (M2)** — same vendor,
  client + server.
- **Analytics:** a **thin funnel** (e.g. PostHog free) on the **`ACH-08` event spine** — the same
  emission convention feeds it: install → first collection add → first card published → first
  purchase. Enough to see drop-off, nothing more.
- **`SYS-11` diagnostic-log bundles:** **deferred to M7** — `OQ-060` (bundle format/redaction/
  retention) is undecided; v2 reserves the endpoint + UI room and treats the body as opaque. Don't
  build capture before that's resolved.
- **Explicitly NOT now:** APM, distributed tracing, custom dashboards. Sentry + a funnel is the line.

---

## 8. Drift control & definition-of-done (brief — proportional to imminence)

- **Definition-of-Done per task** (the §5 checklist) is the unit of "done" — no task merges without it.
- **Spec carried into code:** tests are spec-ID-tagged (grep an ID → spec + test + code); the
  `packages/shared` zod schemas **are** the executable `api-contract`; behavior changes route through
  `open-questions.md`, never code.
- **Periodic audits:** a **per-phase doc↔code fidelity audit** (agent-run, mirroring the existing
  `docs/design/audit/` passes) at each milestone exit; `/code-review` at high effort at each exit; a
  quarterly dependency/security sweep. These keep later phases honest as they stack on earlier ones.

---

## 9. External accounts & provisioning (M1-P — owner track, starts with M1)

Long-lead, owner-only, and **blocking for IAP/push/ship** — so it runs *hidden under the build*, not
after it. Kick off at **M1**, not M8.

| Item | Lead time | Blocks |
|---|---|---|
| **Apple Developer Program** enrollment (identity verification) | days–weeks | TestFlight, App Store, push (M2 device build onward) |
| **Google Play Console** enrollment | days | Play distribution |
| **Bundle IDs + signing** (certs, provisioning, keystore) | hours, after enrollment | every device/store build |
| **RevenueCat** account + per-store products/entitlements | hours, after store accounts | IAP (M5), the sandbox pass (M8) |
| **APNs / FCM** push credentials | hours, after enrollment | push (M7) |

---

## 10. Release readiness (lean — see also M8, M1-P)

A short checklist, not a program: privacy policy + ToS (`AUTH-10`, already specced) on a real domain ·
**App Privacy labels** · 13+ age rating · **UGC compliance** (`SYS-09` contact + report/block —
already specced, good) · IAP products live (M1-P) · **the manual IAP sandbox pass** (the §11 gate) ·
TestFlight (iOS) + Play internal testing (Android) beta · a one-page launch checklist. Provisioning
that gates all of this was started back at M1-P.

---

## 11. Owner decision-gates (ranked) + risk register

**Default everywhere else is agent/automated verification.** These seven are the load-bearing
exceptions — each names why an agent can't own it. (~7, per the brief.)

| # | Gate | Milestone | Why automation can't own it |
|---|---|---|---|
| 1 | **Feature-audit ruling** (keep/cut/defer) — ✅ **ruled: full v1.0 scope (decision 0027)** | M0 | Product scope is judgment about *worth*, not correctness — only the owner can rule it |
| 2 | **Provisioning approvals** (Apple/Google/signing) | M1-P | Legal identity, payment, signing keys — the human principal is required by definition |
| 3 | **Auth + `SYS-01` authz seam** | M2 | The prototype's cross-user vuln lived here; eyeball the model + confirm the standing-test pattern is real |
| 4 | **Destructive/irreversible migration** | any (change-class) | Data loss is unrecoverable from review; needs a human "yes, and backed up" |
| 5 | **Customization render payoff** (taste) | M4 | "Does it feel like the trophy case" is aesthetic — agents can't judge it |
| 6 | **Manual IAP sandbox pass** | M5 / M8 | Real-money StoreKit/Play sandbox UX is automation's documented blind spot (testing-strategy §5) |
| 7 | **Store submission / public launch** | M8 | The irreversible outward-facing act |

### Additional owner gates (decision 0045 — right-sized, owner-ratified 2026-06-29)
Layered onto the 7 above, weighted to the M1/M2 groundwork; front-loaded + tapering. Full detail + the
deliberately-cut candidates are in `decisions/0045-owner-gate-scheme-build-phase.md`. Cadence: most fire
once at a milestone exit (batched into one sitting); G-K/L/M are per-event always-on tripwires; none add
per-PR load (the spine + the 3 change-classes already cover per-PR).

| Gate | Milestone | Weight | What the owner does |
|---|---|---|---|
| G-A Architecture + CONVENTIONS lock-in | M1 entry | heavy·1× | Sign the §3 architecture record + `CONVENTIONS.md` before scaffold (= decision 0046) |
| G-B "Floor is real" demo | M1 exit | 1 sitting | Watch a test go RED on purpose · a bad PR refused · CONVENTIONS lint-teeth · loop on your iPhone |
| G-C Live-infra cutover + env-separation | M1-P | heavy·1× | Distinct prod/staging/local DBs; agent-destructive paths only at disposable DBs; secrets in host store; billing yours |
| G-D Authz "break-it" demo | M2 exit (re-fire M3/M5) | demo | Watch 2 mutation-tests go RED when SYS-01 scoping removed; test-count == mutating-endpoint count |
| G-E Un-retrofittable lock-in | M2 exit | receipt | Append-only audit log · ACH-08 emission completeness · server-enforced role/tier ladder |
| G-F Recoverability proof | M2 exit | receipt | One executed restore drill + a migration roll-forward/back |
| G-G Auth fidelity + abuse-levers | M2 exit (rides gate 3) | light | Refresh-rotation rejects old token · AUTH-11 neutral responses real · SYS-05 429-under-burst |
| G-H CARD-15 render-spike budget cap | M4 entry | heavy·1× | A hard time/token ceiling before the flatten spike (distinct from gate 5 taste) |
| G-I Economy concurrency + intent | M5 | heavy | Double-spend demonstrated on real PG; confirm the agent encoded the RIGHT invariants |
| G-J IAP-live check | M5 (1 sitting) | heavy | Real-path refund hits negative-floor/no-clawback; webhook signature + product mappings verified |
| G-K SYS-04 / SYS-05 value sign-off | always-on | per-event | Approve the actual economy + rate-limit NUMBERS before they take effect (ride no PR) |
| G-L ECON-11 operator-adjustment auth | always-on | per-op | Per-op yes on any manual Pixel grant/clawback (real money, no UI) |
| G-M New-dependency glance | milestone exit | light | 30-sec yes/no on dependency-manifest changes (catches what SCA can't) |
| G-N AUTH-07 deletion-ripple | M8 (dry-run M5) | heavy | Hard-delete vs anonymize-and-keep; no orphaned adopters, no retained PII |
| G-O App Privacy / data-safety labels | M8 (with gate 7) | review | Declaration checked vs the actual ACH-08 analytics + SYS-11 bundle contents |

### Risk register (top handful)

| Risk | Severity | Mitigation |
|---|---|---|
| **Solo-builder abandonment** (the #1 risk — *amplified by full scope*) | High | **Staged release** (M2 on-device · ~M4 closed beta · public after M7) so you're never invisible for long · early tangible win (styled shelf at M2) · milestone chunks each <~2wk visible payoff |
| **Hands-off quality erosion** | High | The §5 enforced merge gate + CI + the manual gates placed at automation's blind spots |
| **Economy/IAP correctness** (real money) | High | Test-first ledger/idempotency/refund + the manual sandbox pass + the economy change-class owner gate |
| **Authorization regressions** (the original sin) | High | Standing `SYS-07` per-endpoint authz tests + integration against real Postgres (mocks would hide it) |
| **Long road to first public release** (full scope) | Med→High | Staged release (above) is the primary mitigation · build strictly in milestone order · `SCREEN-STATUS.md` + `PROJECT-HEALTH.md` as live tripwires · resist *new* scope beyond the spec (full ≠ unbounded) |
| **Cost / token overrun** | Med | The §3 costed list + free-tiers-first + per-milestone token budget |
| **Data loss / lock-in** | Med | Managed auto-backups + the one tested restore drill before real users |

---

## 12. Immediate next 1–3 actions

1. **Resume design in build-order** — start **4.13 Welcome & Auth** (the front door, still
   undesigned), then **4.14 Onboarding**; the other not-started screens (Compare · Lists · Contributor ·
   Achievements · Admin/Mod) follow their phases. All in scope (decision 0027).
2. **Start M1-P in parallel** — begin **Apple Developer Program enrollment**; its identity-verification
   lead time is the one clock you can't compress, so run it under the build.
3. **Clear the standing formalization debts** when convenient — Device editor (4.5) + Compare Hours
   (4.6) → `OQ-076/077`, plus the Styler/Canvas converge sets owed (see `SCREEN-STATUS.md`).
```
