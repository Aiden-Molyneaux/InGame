# M6 Build Task — Social (+ Achievements pulled forward) · ◆ the closed beta

> **What this is.** The paste-once build brief for **M6** ([road-to-market §4, row M6](road-to-market.md)):
> friends · profiles (friend-view) · compare hours (SOC-03) · Top-10 · recommendations · What to Play ·
> full SOC-09 block UX · SOC-10 invite links — **plus two owner amendments (2026-07-15):**
> **(1) ACH — the achievements + easter-eggs engine pulled forward from M7** (the owner wants beta
> friends to *experience* the achievement/egg flow and recommend new eggs) and **(2) the report
> affordance ships now** (minimal capture; the moderation console stays M7). **Exit = the first
> external ◆ closed beta** (decision 0071), with an **alpha wave (close friends) as beta's first
> step**. Filed **2026-07-16** by the Fable-5 orchestrator session.
>
> Owner: Aiden · Execution: **Claude Code** (Fable-5 orchestrator + delegated builder agents) ·
> Branch: **`m6`**, cut from `m5` head (PR #12 `m5`→`main` was open at filing; its squash `73dd884`
> landed 2026-07-16 and is reconcile-merged in `be952ba` — content identical, m6 supersedes main) ·
> Depends on: M5 signed (owner walk PASSED 2026-07-15) · M1-P **partial** (Apple+RC ✓ · Google Play
> percolating · R2/hosting/EAS owed — §6).
>
> **Sizing note:** the roadmap buckets M6 as **M**; the two amendments + the beta-infrastructure
> reality (a deployed API/DB is implicit in "external beta") re-size it **L**. Budget owner attention
> like M4/M5.
>
> **Owner-gating mode: GATE AS WE GO** (the M5 mode, unchanged — it worked). Named gates (§5) fire at
> their packet's completion; the beta sign-off is the one end-of-milestone sitting.

---

## MODEL PLAN (read first — owner directive in CLAUDE.md)

- **Orchestrator + reviewer: Fable-5 (this session).** Writes the §0 rulings with the owner, writes
  the packet manifests, reviews **every** packet diff (builder≠verifier holds — anything Fable builds
  inline gets an Opus independent review), runs the owner checkpoints, files receipts.
- **Builders (fresh-context subagents, one per packet):**
  - **Opus-4.8** — everything user-facing (P8–P13: taste ≥ 7) and the test-first server cores
    (P1–P4, P6: the friend-read guard, the privacy read-fabric, feed aggregation, the achievements
    engine — all hard enough to want strong intelligence, reviewed by Fable).
  - **Sonnet-5** — clear-spec mechanical packets (P5 queue/lists CRUD, P7 reports-capture + breach
    check, P6c content seed, P14 P2b swap-in). `effort: 'low'` for pure sweeps. **Standing
    permission: if Sonnet output misses the bar, rerun on Opus/Fable without asking.**
  - **Never Haiku.**
- **Reviews:** every server packet gets a **murr-style fresh-context diff review** (Fable) plus its
  integration suite green; the **social privacy fabric (P1+P2+P3 together) additionally gets an
  independent Opus cross-audit** (§4) before the beta — *scheduled explicitly this time; M5's §4
  audit initially went un-run and had to be flagged by the receipt.* Client surfaces get **parvati**
  against their manifest + the states board.
- **Builder packet prompts must say:** *"do the work directly yourself; never spawn sub-agents or
  poll-wait"* (standing lesson, 2026-07-10).

---

## §0 — M6-ENTRY GATE (blocking rulings, ~60 min owner sitting; file `m6-entry-decision-log.md` + decision 0076)

Nothing in §3 builds until §0.1 is ratified; §0.4's content sheet blocks the **ACH seed** only (the
engine builds against fixtures) — P1–P7 may start the moment §0.1–0.3 + 0.5–0.10 are recorded.

| §0 | Item | The question + Fable's recommendation | Blocks |
|---|---|---|---|
| **0.1** | **The friend-read class (gate-3 — guard-surface change, owner eyes required)** | M6's whole read surface is cross-user-under-friendship — a **new SYS-01 read class** beside 0073's `PUBLIC-READ`/`COMMUNITY-AGGREGATE`/`AUTH-LOOKUP`. Ratify: a `// SYS-01-FRIEND-READ` marker + `friendScoped(...)` repo helper, lint-valid **only** with an explicit accepted-friendship predicate; every cross-user payload serializes through **allowlist shapes** (friend/full vs non-friend/limited per api-contract `/users/:id`), PROF-03 privacy gates applied server-side; **blocked / suspended / deleted collapse to ONE indistinguishable "unavailable"** (MOD-09 non-disclosure — a standing test asserts the three are byte-identical). `rule-02-scoping` extended **statement-scoped** (the M5 neighbor-launder fix pattern). **G-D re-fires on this class** (strip the predicate → RED, owner watches). **Recommend: as stated.** | §1 spike, P1–P4, P8–P13 |
| **0.2** | **OQ-146 — CARD-22 equipped readout on cross-user cards** | The drawn `equipped` display summary can't be computed cross-user without a composition read (forbidden, OQ-122). **Recommend: publish-time label denormalization** — an additive migration snapshotting the display-label set beside `premium_component_ids` at publish (the same seam, proven by M5); backfill existing published cards from their compositions in the migration. Unlocks SOC-11 / compare / gallery readouts cleanly. Fallback if declined: `components[]` (contract 0.67) stays the ceiling. | P2, P9 |
| **0.3** | **OQ-145 — deletion-ripple posture (rule now, implement M8)** | Beta brings real accounts, so ratify the posture before them: deletion **flips status, never DELETEs the row** (adopters-keep, the G-N P-HARD findings) · `authorShapeFor` **must be wired** into the four attribution read paths · the **ledger/receipts PII kept-set** ruling (recommend: keep financial rows, anonymize the user row — accounting-grade retention). Implementation stays **M8/G-N**; the beta ships **without in-app deletion** (App Store 5.1.1(v) binds at store submission, not TestFlight) — the beta welcome note promises a support-channel manual path. | — (recorded) |
| **0.4** | **ACH pull-forward scope + starter content (OQ-004 pulled forward from M7)** | **Engine = full** (ACH-01/02/03/04/09: data-driven definitions · event-driven idempotent triggers on the ACH-08 spine · milestone/egg visibility · rewards = badge + optional PX (`milestone` ledger reason, exists) + earn-only cosmetic entitlements (`source:'earned'`, exists)). **Content = a starter set** (~12 milestones + ~6 easter eggs) in a **SYS-04-style seed** so new eggs ship without an app release (ACH-01) — beta friends recommending eggs is a config edit, the explicit design goal. **ECON-05's prestige/milestone half now rides THIS engine** (adoption-count milestones = natural starter content — the roadmap note re-lands a milestone early). ACH-06 celebration = **in-app only at M6**; the push half lands M7 (accepted gap). Content picks = owner taste, a focused pass like the 0075 roster sitting. | P6c seed only |
| **0.5** | **Report slice (E8b, owner amendment)** | **Capture-only:** `reports` table + `POST /reports` (MOD-01 reason enum, `details` required where the reason demands, rate-bucketed) + the **ReportSheet** UX (board 4.16) on card / user / game contexts with the **Block cross-link** (SOC-09). **MOD-02 threshold auto-hide, MOD-03 queue, MOD-04 console = M7.** With block, this completes the App-Store-Guideline-1.2 pair for the beta. **Recommend: as stated.** | P7, P12 |
| **0.6** | **SOC-10 invite links + OQ-096 (TTL / cap / signature)** | Implement the **pre-named `AUTH-LOOKUP` bearer read-class** (decision 0073 §0.1) for `GET /invites/:token` — enumerated-repo, token-scoped, never session-authed. Token mechanics (recommend): **signed opaque token · TTL 7 days · ≤5 active per user · multi-redemption within TTL** (a party QR must survive multiple scans); revocation = create-new-invalidates-oldest. **Beta-window fallback:** universal links stay parked (§10) — invites are the **in-app QR** (client-rendered, OQ-073) + a tokenized URL on the project domain (a static landing → TestFlight while in beta; store-listing routing lands M8). Closes OQ-096 for invite links; share-link TTL rides M8. | P3, P8 |
| **0.7** | **New refusal codes + rate buckets (G-K async — safe defaults, owner may adjust)** | Per the LOOK_CAP/0073 §0.4 precedent, all 409 + F-17 additive: `ALREADY_FRIENDS` · `REQUEST_PENDING` · `REQUEST_COOLDOWN` (carries `{cooldownUntil}`, SOC-08) · `SELF_TARGET` (friend/recommend/report yourself) · `NOT_FRIENDS` (compare/recommend against a non-friend) · `LIST_FULL` (Top-10 cap-10, already in contract; reused for the queue cap) · `INVITE_INVALID` / `INVITE_EXPIRED`. Buckets (SYS-05, all tunable): `friends:request` **10/hr + 30/day** · `invites:create` **5/day** · `reports:create` **10/day** (the reporter-cap half of OQ-093 lands early; dedupe stays M7) · `users:search` **30/min** · recommend **20/day**. **Queue length cap 50** (`LIST_FULL`) — closes the OQ-097 WTP half. Re-request cooldown default **7 days** (SYS-04). | P1–P7 |
| **0.8** | **The Discover-screen M6 slice** | The converged two-rooms board (3.2) hosts WTP. **Recommend:** build the screen shell + **UP NEXT room in full** (WTP-01/02/03 queue · drag-reorder · wishlist tags · SOC-05 rec'd-by rows + the recs feed) · **DISCOVER room = browse-only slice** (trending-cards — the endpoint is live since M5 P3 — + upcoming rows); **notify-me toggles defer to M7** (inert without push, NOTIF-01) and DISC-02/03 browse/search defer with the M7 discovery batch. **CAT-12 FRIENDS-ARE-PLAYING rail lands on Add Game** (`/catalog/friends-active`, drawn 0.23; slotted M6 by decision 0062 — it hard-needs the P1 graph). | P5, P10 |
| **0.9** | **AUTH-01 breach-check (the 0073 §0.9 re-slot, now due)** | HaveIBeenPwned **range API (k-anonymity)** on register + password change; **fail-open on provider outage** (availability beats the check; telemetry on failures + a `breachCheckSkipped` event) · no new runtime dep (plain fetch) · SYS-04 kill-switch. **Recommend: as stated.** | P7 |
| **0.10** | **Settings M6 slice** | Settings (4.15, converged) has no built screen but must house the SOC-09 blocked-list. **Recommend:** the **lean-list shell + the BLOCKED page** (list `GET /me/blocks` · unblock w/ `ConfirmSheet` — the MOD-09 lone-exception affordance) + account basics already live elsewhere linked in (sign-out, verified-email state); **notifications page → M7** (rides push), **feedback pages → M7**, admin-console row → M7, account-delete row → M8 (0.3). | P12 |
| **0.11** | **Beta mechanics (decision 0071 mechanics — the exit gate's shape)** | Cohort = **5–20, majority iOS, 2–4 Android** (owner, 2026-07-15). **Alpha = beta's first step:** the close-friends wave (~3–5) onto **TestFlight internal** as soon as the first EAS build exists — *before* M6 code completes (they alpha the M5 product; social lands under them). Then the external TestFlight group for the full cohort (Apple **Beta App Review** on the first external build — days of lead, submit early); Android riders join via **Play internal** when Google clears (§6). Feedback channel = the **group chat** (push is M7 — group-chat nudges are the accepted return mechanism for the beta window). At the exit sitting the owner records the **safety-rail acceptance** (report ✓ *now in-scope* · block ✓ · delete trails M8) per the roadmap M6 row. **The Google 12-tester quota (provisioning #9) needs recruiting beyond the cohort — owner lane, start now.** | §5 beta gate |
| **0.12** | **Deferred-carryover ruling table** (accounted, not forgotten) | **OQ-136** pick-a-card in Add-Game → re-triage (recommend: defer to the onboarding era — it wants new-user context). **OQ-140** composition presets → ⟨stretch⟩ again, only if the window has room. **OQ-142** sticker-zone cap → ratify the shipped ~6/zone (async nod). **Worn-premium-shell entitlement gate** (the P7/P8 🎨) → recommend: gate at M6 (a one-line server check rides P14's contract bump) or explicitly bless the carry-over. **Store INDEX aisle-count honesty** (the remaining 🎨) → a P10-lane copy fix if unresolved. **OQ-100's** hour-inference half stays M7. **OQ-143** (§1.1 token-mapping footnote) → a 5-min doc errand, ride any design-spec touch. | — |

**Exit §0: ✅ GATE CLOSED 2026-07-16** (owner: "I'll take your recommendations" — all twelve ruled
as recommended) — recorded in **decisions 0076 + 0077** (the §0.4 content picks) +
[`m6-entry-decision-log.md`](m6-entry-decision-log.md) · product-spec **0.60** · api-contract
**0.69** · open-questions swept (OQ-096-invite-half · OQ-097-closed · OQ-142 · OQ-146 resolved;
OQ-145-posture · OQ-004 · OQ-136 · OQ-140 annotated) · `/health` re-run at the close commit ·
**the §1 spike is the first build act (launched at gate close).** Still owed from the owner lane:
the R2/hosting sitting · the EAS first build · the B7 production-target nod (rides P16).

---

## §1 — THE FRIEND-FABRIC SPIKE (de-risk the guard before twelve surfaces build on it)

M5's spike proved the publish thread; M6's risk concentrates in the **friend-read guard + the
non-disclosure collapse** — every P2/P8/P9/P13 surface stands on it. Thread it thin, end-to-end:

1. **Migration:** `friendships` (userA/userB canonical-ordered, unique pair, status) +
   `friend_requests` (from, to, status, cooldown stamp) — the P1 schema, happy-path only →
2. `POST /friends/requests` → accept → `GET /users/:id` returns the **friend/full shape** under
   `friendScoped()` + the `// SYS-01-FRIEND-READ` marker (allowlist serializer; PROF-03 hours-gate
   honored) →
3. a **third seeded user** gets the **limited shape** (field-diff asserted — nothing leaks) →
4. `POST /me/blocks` (exists, M5) → friendship severed + **both directions** now return the one
   generic "unavailable" — and a **byte-identical-collapse test** proves blocked ≡ suspended ≡
   deleted (MOD-09) →
5. the `rule-02-scoping` extension admits the marker only with the friendship predicate —
   **strip it → lint RED** (the G-D mechanism, demonstrated).

**Budget cap ~90 min of agent time** — if it isn't threading, STOP; Fable + owner re-scope.
**Go/no-go = the first gate-as-we-go checkpoint.** Spike yields the reusable `social` service +
guard mechanics P1 formalizes. Builder: **Opus**, Fable review.

---

## §2 — THE PIPELINE (per-packet process — unchanged from M4/M5, it works)

**Server packets (P1–P7):** packet brief (§3 + manifest) → **test-first** (the §5 invariant list IS
the failing-test list) → build → six-check CI green → **Fable diff review** (murr lanes: SYS-01
scoping **incl. the new friend-read class** · privacy serializer allowlists · non-disclosure collapse
· transaction boundaries · idempotency · error codes vs contract · zod coverage · rate-limit wiring ·
**event-emission completeness** · no invented behavior) → findings to 0 → receipt entry.

**Client surfaces (P8–P13):** **manifest first** (`docs/planning/m6/<surface>-manifest.md`,
state-by-state from the converged board, statuses OWED/PRE/EXPECTED/ASSUMPTION/GAP, ARCH callouts,
browser BOOT check) → build (component-map names only · CONVENTIONS.md · 0069 buttons · 0070 themed
tokens from birth · **the `EntryCard` wrapper for every card face** — never hand-render `imageUrl`
fallbacks, F-20 killed that class at the root · **the hook-lint guard stands on all client code**,
F-16) → **murr** diff review → **parvati** against manifest + running app → route findings
(🚩 fix now · ✅ defer with cite · 🎨 owner's eye) → loop to 0 flags → receipt.

**First-article rule:** the **Friends tab (P8)** is the first client surface through the pipeline —
it goes to the owner ALONE (walk + taste) before P9–P13 mass-produce against its patterns.

**Environment:** `node scripts/dev-stack.mjs up` first move · doctor-first on friction · Metro :8082
only (never :8081) · supertest integration > browser loop for behavior · browser lane for visual only
· demo login `demo@ingame.app` / `InGameDemo1!` (the seed grows a **friend cohort**: second/third
demo users with friendships, pending requests, a block, feed history — P1's seed slice) · destructive
DB testing → disposable `PORT=4001` API.

---

## §3 — BUILD ORDER (packets, dependencies, models)

**Dependency graph:**

```
§0 rulings ──▶ §1 SPIKE (friend-read guard) ──▶ P1 ──▶ P2 ──▶ P9, P13
     │                                            ├──▶ P3 ──▶ P8 (first article)
     │                                            └──▶ P4 ──▶ P8 (feed) · P11 (via P6)
     ├──▶ P5 (WTP + Top-10) ──▶ P10
     ├──▶ P6 (ACH engine) ──▶ P11        [P6c seed ◀── §0.4 content sitting]
     ├──▶ P7 (reports + breach) ──▶ P12
     ├──▶ P14 (P2b + G-J ◀── the Google email / §6)
     └──▶ P15 (beta infra ◀── §6 owner lane, R2 + hosting EARLY) ──▶ P16 (EAS/TestFlight lane) ──▶ ◆ beta
Parallel lanes at any moment: {P1→P2→P3 server} ∥ {P5, P6, P7 server} ∥ {P8→P9… client} ∥ {§6 owner}
```

### P1 — Social graph core (server · **test-first** · Opus · Fable review · owner checkpoint = G-D re-fire M6)
- **Migration 0013:** `friendships` (canonical-ordered unique pair) · `friend_requests` (status enum
  `pending·accepted·declined·cancelled`, cooldown stamp) · blocks table exists (M5).
- **Guard first (§0.1):** `friendScoped()` + `// SYS-01-FRIEND-READ` + the statement-scoped
  `rule-02-scoping` extension + the non-disclosure collapse helper (one "unavailable" shape).
- **Endpoints:** `GET /me/friends` + `/me/friends/requests` · `POST /friends/requests` (SELF_TARGET ·
  ALREADY_FRIENDS · REQUEST_PENDING · REQUEST_COOLDOWN{cooldownUntil} · **mutual-pending →
  auto-accept** (both asked = both agreed, no deadlock) · `friends:request` bucket) ·
  accept/decline (decline silent, cooldown starts) · `DELETE /friends/requests/:id` (cancel) ·
  `DELETE /me/friends/:userId` (unfriend, silent to target) · `GET /me/blocks` (the Settings list
  read) · block now **severs friendship + pending requests both directions** (SOC-09 full semantics
  onto the M5 endpoint).
- **Events (ACH-08):** `friend.added` emitted on accept — the P4 feed + P6 engine both consume it;
  an **emission-completeness audit** rides this packet (friend/game/card/entry events the M6
  consumers need all emit through `emitOnCommit`).
- **Tests:** SOC-01/08 lifecycle each transition · cooldown enforced + expires · F36 concurrency:
  simultaneous mutual requests → exactly one friendship row · simultaneous accept+cancel → one
  terminal state · block severs both directions atomically · SYS-07 per mutating endpoint ·
  MOD-09 **byte-identical collapse** (blocked ≡ suspended ≡ deleted, both directions).
- **Owner checkpoint: G-D re-fire (M6 class)** — strip the friendship predicate → standing tests +
  lint RED, 2 minutes, watched live *(the M5 re-fire caught a real leak + a lint hole — this is the
  gate that bites)*.

### P2 — Friend-view read fabric (server · **test-first** · Opus · **Fable review, heaviest**)
- **Migration 0014 (§0.2):** the CARD-22 display-label denormalization at publish + backfill.
- **Endpoints live:** `GET /users/:id` friend/full shape for real (device · stats+percentiles ·
  top10 · now-playing · achievements teaser · friendsCount/mutualFriendsCount · relationship) ·
  `GET /users/:id/collection` (COL-10 friend subset — notes/rating/platforms NEVER serialize,
  COL-04/05) + the friend collection-entry detail feed (SOC-11: their card + equipped readout via
  0.2 + per-game context, privacy-gated) · `GET /me/compare/:friendId` (contract 0.25 shape —
  totals face-off · shared-set matchups · leaderboard · **PROF-03 omission semantics** exactly as
  drawn) · `/catalog/games/:id` `friendsWhoOwn` goes live (CAT-09c) · `/users/:id/contributions`
  + `/users/:id/achievements` friend/limited gating verified.
- **The mutual-invisibility sweep (SOC-09 full):** blocked-either-direction excluded from
  `users/search` · feed · compare · friendsWhoOwn · contributions · invite resolve — gallery/trending
  already filter (M5); one ID-tagged test per surface.
- **Tests:** F06 field-diff per shape pair (friend vs limited vs unavailable — assert the exact
  allowlist, catch strays like M2's `privacy` leak) · PROF-03 hours/collection omission · SOC-11
  owner-only fields never cross · the sweep tests · no composition on any wire (standing).

### P3 — Find + invite (server · **test-first** · Opus · Fable review)
- `GET /users/search?username=` (exact-match, PersonRow shape + relationship enum, blocked invisible,
  `users:search` bucket — the SOC-07 people-finder; **neutral on non-existent** per AUTH-11 posture).
- **`AUTH-LOOKUP` read-class lands** (§0.6, the 0073 pre-naming): `POST /me/invites` (signed token ·
  TTL 7d · cap 5 active · `invites:create` bucket) · `GET /invites/:token` (bearer-class resolve →
  sender summary + relationship + prefilled request; INVITE_INVALID/EXPIRED; **enumerated-repo
  scope** — the lint knows exactly which reads the class admits) · redemption → the normal
  `POST /friends/requests` (P1 rules apply).
- **Tests:** token forge/expiry/cap/revocation · resolve honors blocks (inviter blocked you →
  unavailable) · relationship-aware resolve (already-friends link ≠ duplicate ADD) · rate buckets ·
  F36: same token redeemed in parallel → one request.

### P4 — Feed + recommendations (server · **test-first** · Opus · Fable review)
- `POST /recommendations` (SOC-05: friend-only `NOT_FRIENDS` · note screened later, M7 — accepted
  unscreened for the trusted beta · lands in the **feed, not auto-queued**, contract 0.21) ·
  `GET·DELETE /me/recommendations` · queue-add via `POST /me/queue {source:'friend_rec', fromRecId}`
  (P5's endpoint, carries recommendedBy + note through).
- `GET /me/feed` (SOC-06): **aggregation by actor+type over the ACH-08 `domain_events` spine**
  (windowed, capped object peek ≤3, cursor-paginated) · **import-flood suppression** (an add-burst
  collapses to one capped item) · **trivia exclusion** (stat tweaks never feed) · block+privacy
  filtered · event types: `added_games · beat_game · completed_game · published_card ·
  unlocked_achievement` (the last arrives with P6 — the feed renders it the day the engine lands).
- **Tests:** OQ-071 aggregation shape · flood-suppression (100-game import → 1 item) · trivia
  exclusion · block filtering both directions · cursor stability under concurrent inserts ·
  rec lifecycle (recommend → feed → queue-add carries note → dismiss).

### P5 — What-to-Play + Top-10 substrate (server · Sonnet, Fable review; escalate if the bar slips)
- **Migration (rides 0014):** `queue_items` (rank, source enum, fromRecId?) · `lists`/`list_items`
  (kind `top10`, rank, cap 10).
- **Endpoints:** `GET/POST/DELETE /me/queue` + `PATCH /me/queue/reorder` (full-permutation 422 rule,
  mirrors collection/reorder; **cap 50 → LIST_FULL**, §0.7 — closes OQ-097's WTP half; `owned` flag ·
  wishlist semantics · rec-sourced rows carry note) · `/me/lists` CRUD + `PATCH {orderedGameIds[]}`
  re-rank (SOC-04 cap-10 + uniqueness; `LIST_FULL`) · `top10` inlines onto `/me` + `/users/:id`
  (P2's serializers reserve the seam).
- **Tests:** cap + uniqueness + permutation validation · rank integrity under F36 concurrent
  reorders · queue source/note threading · SYS-07 per endpoint.

### P6 — Achievements engine (server · **test-first** · Opus · Fable review · owner checkpoint = the no-farm demo)
- **Migration 0015:** `achievement_definitions` (key, criterion jsonb, tier ACH-09, kind
  milestone|secret, reward jsonb, active) · `user_achievements` (unique(userId, achievementId),
  unlockedAt, progress snapshot).
- **The trigger engine (ACH-02):** consumes `domain_events` post-commit (the ACH-08 spine — no
  retrofit, the M2 bet pays off); definitions evaluated data-driven (counter-threshold + event-match
  criteria cover the starter set; ACH-07 entity-targeting = the egg mechanism) · **unlocks
  idempotent + non-farmable** (once per user; repeatable actions can't re-trigger; self-inflatable
  signals excluded per the §5.15 design rule) · **rewards in one transaction:** badge row + optional
  PX via the P1-era ledger (`milestone` reason, exists) + optional earn-only cosmetic entitlement
  (`source:'earned'`, exists — never store-purchasable, ACH-04).
- **Endpoints:** the three contract 0.36 payloads — `GET /achievements` (defs, **secret-masked**
  `???`) · `GET /me/achievements` (summary/earned/inProgress/secrets) · `GET /users/:id/achievements`
  (earned-only, privacy-honored, **no secret-existence leak** — P2's gating).
- **P6c — the starter-content seed (Sonnet · after the §0.4 sitting):** the owner-picked ~12
  milestones + ~6 eggs into the SYS-04-style seed (tiers per ACH-09 · rewards per the sheet ·
  adoption-count milestones landing ECON-05's half) · **egg-recommendation loop documented** (a
  beta friend's egg idea = a seed edit + deploy, no release).
- **Tests:** ACH-02 idempotency (replay the event → no second unlock) · F36: the same threshold
  crossed by parallel events → one unlock, one reward grant · reward tx atomicity (ledger + badge +
  entitlement all-or-nothing) · secret masking on every read · farm-resistance (repeat/delete-re-add
  cycles don't re-trigger) · retro-grant does NOT fire (ACH-08's no-back-granting stance).
- **Owner checkpoint:** watch an unlock fire live off a real event (add the Nth game → celebration
  payload) + the replay/no-farm tests green; confirm the criteria encode the *intent*.

### P7 — Reports capture + AUTH-01 breach check (server · Sonnet · Fable review)
- **Migration (rides 0015):** `reports` (reporterId, targetType card|game|user, targetId, reason
  enum, details?, createdAt, status `open` — the M7 console reads it later).
- `POST /reports` (MOD-01: reason enum + details-required-where-specific · `reports:create` 10/day ·
  SELF_TARGET · duplicate-report accepted idempotently) — **capture-only per §0.5**; no hide, no queue.
- **AUTH-01 (§0.9):** HIBP range-API k-anonymity check on register + password change; fail-open +
  telemetry; SYS-04 kill-switch; spec line updated (the 0073 §0.9 re-slot lands).
- **Tests:** reason/details validation matrix · rate bucket · breach-check refuses a known-pwned
  fixture, fail-open on provider timeout (mocked), kill-switch honored.

### P8 — Friends tab + Find/Add Friends (client · Opus · **FIRST ARTICLE** · manifests: `m6/friends-manifest.md` from `friends-states.html` + `find-add-friends-states.html`)
- The **4th tab goes live** (the nav's FRIENDS keycap): feed landing P1–P2 (aggregated `FeedRow`s ·
  quiet-feed Q1) · roster (`FriendRow` → actions sheet: VIEW / COMPARE / RECOMMEND / UNFRIEND-confirm
  / REPORT / BLOCK-confirm — decision 0040 ConfirmSheets) · requests (`RequestRow` accept/decline ·
  banner) · **Find/Add hub** (4.8): `PersonRow` relationship spine (all 6 states) · bottom-docked
  `SearchField` · `QrCard` (client-rendered QR, OQ-073) · invite share · **`InviteLanding`
  FlowTakeover** (SOC-10 one-tap prefilled ADD, ✕ close) · cooldown microcopy · lifecycle via the P5
  kit (M5's — reused, not rebuilt).
- **Owner checkpoint (first-article + gate-5 taste):** the full friend loop walked on device with a
  second real account — search → request → accept → feed tick → actions sheet.

### P9 — Friend profile · friend collection · Compare (client · Opus · manifests: `m6/friend-view-manifest.md` + `m6/compare-manifest.md` from `profile-states.html` friend artboards · `collection-states.html` friend/COL-11 boards · `compare-states.html` · `game-page-states.html` M7)
- Profile friend-view (PROF-05: device row + "view in their device" chrome toggle · Top-3 → VIEW TOP
  10 → their Collection TOP read-only · ADD FRIEND / FRIEND tag off `relationship` · staff badge ·
  privacy-limited + unavailable states) · **friend Collection** (COL-10/11: read-only browse tools ·
  sort/filter drawer, no Arrange) · **SOC-11 entry detail** (their card + equipped readout (§0.2) +
  hours/status/owned-since · **adopt-their-card** = the M5 AdoptCardSheet re-pointed · add-to-mine ·
  **compare-with-mine** side-by-side) · **Compare screen** (4.6: face-off totals · card-vs-card
  matchups · friends leaderboard · P2 no-overlap · PROF-03-limited · privacy omission renders
  honestly) · game-page M7 friend artboard.
- **Owner checkpoint (gate-5 taste):** compare walked with a real friend account — the core
  return-driver has to *feel* like a face-off.

### P10 — Top-10 curation + What-to-Play surfaces (client · Opus · manifest: `m6/wtp-manifest.md` from `collection-states.html` TOP stage + `discover-states.html`)
- **The Collection TOP view goes curated** (COL-13 for real — today's hours-sorted placeholder
  [collection.tsx:610] replaced): `/me/lists` top10 · ARRANGE drag-rerank (the COL-07 gesture,
  exists) · `CardPicker` add/remove · cap-10 refusal · friend read-only variant (P9 consumes) ·
  **Profile Top-3 set-pieces + VIEW TOP 10 door** (decision 0050's three doors).
- **Discover screen ships its §0.8 slice** (a new route + the 5th nav key if the shell has one —
  board 3.2): UP NEXT room full (queue rows · wishlist tags · REC'D-BY + note · drag-reorder ·
  add-from-collection/discovery · now-playing pin hand-off) · FROM-FRIENDS recs section (accept →
  queue, dismiss) · DISCOVER room browse-slice (trending-cards → CardDetail tap-through · upcoming
  rows, no notify toggle) · **CAT-12 rail on Add Game**.
- **Owner checkpoint:** curate a Top-10 + queue walk on device.

### P11 — Achievements screen + celebration (client · Opus · manifest: `m6/achievements-manifest.md` from `achievements-states.html`)
- The 14-artboard board (4.10): P1 trophy-case summary (SUMMARY → EARNED → IN PROGRESS → SECRETS,
  VIEW ALL views V1–V3) · node-detail sheets D1–D3 (locked `???` stays sealed) · tier colours
  (PRESTIGE gold · STANDARD theme-accent re-themes per DEV-04 · SECRET magenta — the ratified
  F-02/F-05 carve-outs) · **`CelebrationMoment`** (ACH-06 in-app, reduce-motion-safe; the push half
  = M7) wired to unlock events · friend-view earned-only (P3 artboard) · privacy-limited ·
  **profile achievements teaser + showcase row** (ACH-05) · lifecycle via the kit.
- **Owner checkpoint (gate-5 taste):** earn one live on device — the celebration moment is the
  arcade soul, judged like M4's rituals.

### P12 — Settings shell · blocked-list · report affordance (client · Opus · manifest: `m6/settings-report-manifest.md` from `settings-states.html` + `report-states.html`)
- **Settings §0.10 slice:** the lean-list shell (row grammar per the board; unshipped rows absent,
  not disabled) + the **BLOCKED page** (list · unblock `ConfirmSheet` — the lone-exception
  affordance) · sign-out relocates in (if Profile hosts it today, one home).
- **ReportSheet** (4.16, `/drawer`): card (CardDetail/gallery context) · user (profile actions) ·
  game (game-page overflow) · reason picker + required-details · filed-confirm (MOD-02 copy
  *without* promising review speed — console is M7) · **Block offered alongside on user reports** ·
  offline writes-gated.
- Safety surfaces — built with care (Guideline 1.2 is what the beta's UGC stands on).

### P13 — Contributor profile screen (client · Opus · manifest: `m6/contributor-manifest.md` from `contributor-states.html`)
- **E8a lands** — the designer-tap finally has a destination: `IdentityBlock` → boxless STATS +
  `PctPill` standing (CAT-10, threshold-gated) → SIGNATURE CARD hero → CARDS DESIGNED `/cell` grid +
  GAMES ADDED rows → VIEW ALL V1/V2 (cursor pagination) · P2b self-partial nudge · friend/limited/
  P4 states (P2's gating) · `SectionEmpty` hooks (kit, exists). Endpoints live since M5 P3 — this is
  pure client. Every DESIGNED-BY / ADDED-BY tap app-wide routes here.

### P14 — P2b real-RevenueCat + G-J (cross-stack · Sonnet · **fires when the Google email arrives** — designed now, gated on §6)
- The carried M5 packet, unchanged in shape (m5-build-task §3 P2b · provisioning-log #6/#7/#8):
  `react-native-purchases` in (the one sanctioned dep, decision 0046) · real `RevenueCatProvider`
  behind the `IAP_PROVIDER` seam (the F-3 fail-closed guard already refuses prod+mock) · invent
  `REVENUECAT_WEBHOOK_AUTH` + register the webhook URL (**needs the P15 deployed API** — the tunnel
  problem solves itself) · product-mapping from the 0072 sheet · Play-side products/RC app ride
  provisioning #4/#5. → **G-J + the first manual sandbox pass** (iOS-only acceptable; Play re-run
  follows). *Known trap recorded in §5 G-J.*

### P15 — Beta infrastructure: the G-C cutover (cross-stack · Opus for the infra plan + Sonnet execution · owner-heavy · **START EARLY, it's the pre-beta blocker**)
- **Provision (owner clicks, Fable-guided — the §6 lane):** managed Postgres (auto-backups) + API
  host (e.g. Render/Neon per road-to-market §3) · **Cloudflare R2 + CDN** (provisioning #14 — the
  owner is game; schedule FIRST) · the project domain's static landing (privacy/ToS URL — App Store
  Connect wants it for external TestFlight).
- **Build:** the `StorageProvider` R2 implementation (the 0073 §0.5 seam — a swap, not a rewrite;
  media URLs go CDN) · prod/staging env separation (distinct DBs; agent-destructive paths only ever
  at disposable DBs — **G-C's core demand**) · secrets into the host store (SYS-03; nothing in the
  repo, `.env.example` taxonomy extended) · migrations 0000→001x roll-forward on the fresh prod DB ·
  **Sentry verified live client+server** (roadmap §7 says wired from M2 — verify, wire if drifted) ·
  pino/request-ids in prod config · **the G-F restore drill re-run against the prod backup** ("one
  tested restore before real users" — beta users are real users).
- **Gate: G-C** (owner watches env separation + billing-is-mine + the restore drill).

### P16 — The EAS / TestFlight release lane (cross-stack · Sonnet, Fable review · owner-in-the-loop)
- EAS Build/Submit config (provisioning #16 — bundle IDs exist both stores) · iOS build → TestFlight
  **internal** (the alpha wave installs — §0.11: this fires as soon as a build exists, alpha rides
  the M5 product while M6 builds) · **external group + Beta App Review submitted early** (days of
  lead) · Android `.aab` ready for **Play internal** when Google clears (#3–#5) · build points at the
  P15 prod API · crash-visible via Sentry release tagging.
- **The beta welcome note** (owner + Fable): what works · known gaps (push M7 · no in-app deletion
  yet, support path per §0.3) · how to report (in-app report + the group chat) · the egg-recommendation
  invitation (§0.4 — the explicit ask of the beta cohort).

---

## §4 — INDEPENDENT AUDIT POINT (cross-model, scheduled — not optional)

After P1+P2+P3 are Fable-reviewed and green (the **social privacy fabric**), an **independent Opus
audit** runs before any beta invite goes out: fresh context, no access to Fable's review notes,
prompt = the §5 invariant list + the diff + *"find what the review missed — adversarial on privacy
leaks (field-diff the three shapes), block bidirectionality, enumeration oracles (search/invites/
requests as presence probes), invite-token forgery, and the non-disclosure collapse."* Findings
route through the normal fix loop. **M5's lesson applied: this audit is a scheduled §3 step with its
own receipt line, not a remembered intention** — it initially went un-run at M5 and was caught only
by the receipt's honesty pass.

---

## §5 — GATES + DoD MECHANICS

**The named gates (fire gate-as-we-go at their packet):**

| Gate | When | What the owner watches |
|---|---|---|
| **§1 go/no-go** | spike end | The friend-fabric thread runs end-to-end: request→accept→friend-shape→block→indistinguishable-collapse |
| **G-D re-fire (M6 — the friend-read class)** | P1 done | Predicate stripped → standing tests + lint RED · test-count == mutating-endpoint count still holds · the collapse test byte-identical |
| **ACH intent + no-farm** | P6 done | A live unlock off a real event → the celebration payload · replay/farm tests green · criteria encode the *intent* (can't self-inflate) |
| **First-article + gate-5** | P8, then P9–P13 | Friends tab alone first; then compare face-off · Top-10 curation · achievement celebration · report/block flow — the taste gates, walked with a second real account |
| **G-C live-infra cutover** | P15 | Distinct prod/staging/local DBs · destructive agent paths only at disposable DBs · secrets in the host store · billing owner-held · **the restore drill executed** |
| **G-J IAP-live + the manual sandbox pass** | **P14 (rides §6 Google/webhook)** | The carried M5 gate: real sandbox purchase grants once · refund reversal lands per 0074 · webhook signature + product mappings verified. *Known trap: empty sandbox products → check "Missing Metadata" status + the tester's storefront region first.* iOS-only acceptable; Play re-run rides #3–#5. **If it can't fire this window either, it carries AGAIN explicitly — never silently** |
| **G-K value sign-offs** | async, per §0.7 | Cooldown 7d · buckets · queue cap 50 · invite TTL/cap · achievement reward numbers (the §0.4 sheet) |
| **◆ BETA SIGN-OFF** | M6 exit (the one end-sitting) | The roadmap M6 gate: the *social* trophy case walked whole · **safety-rail acceptance recorded** (report ✓ in-scope early · block ✓ · delete trails M8, per 0071) · the welcome note approved · the invite list goes out |

**The standing spine (every packet, non-negotiable):** six-check CI green (typecheck → lint → unit →
integration/Testcontainers-PG → gitleaks → SCA) · **test-first for the M6 server surface** (authz/
privacy + achievements are this milestone's risk domains) · every test ID-tagged
(`describe('SOC-09: …')`) · **SYS-07 authz per mutating endpoint + F06 field-diff per cross-principal
read shape** · **F36 concurrency per request/accept/block/unlock/redeem path** · zod on every input ·
api-contract bumped when a seam changes (error codes land in `ERROR_CODES` + `isErrorCode()` only as
their endpoint builds — F-17) · no new runtime dependency without written justification (expected:
`react-native-purchases` at P14, a QR-render lib at P8 if `react-native-qrcode-svg`-class is needed,
possibly an R2 SDK at P15 — each gets its G-M glance; anything else = stop and ask) · **auth/SYS-01
is an owner-approval change-class** — P1/P2/P3 merges get the owner's explicit go at their checkpoints
(gate-as-we-go provides this by construction).

---

## §6 — THE M1-P OWNER LANE — see [`m1p-provisioning-log.md`](m1p-provisioning-log.md), the live register

**State (2026-07-16):** Apple Dev ✓ · RevenueCat iOS ✓ · 5 SKUs live ("Missing Metadata" = correct
resting state) · **Google Play identity verification still percolating — watch email; when it lands,
the chain fires: #3 device verification → #4 Play app record + the 5 SKUs → #5 RC Play app +
service-account JSON → P14.**

**The rows that bite THIS milestone (the log's §3 table owns the detail — do not re-litigate):**
- **#14 R2 + CDN — FIRST, this week** (owner is game, 2026-07-15): the pre-beta blocker; pairs with
  the P15 hosting sitting (API host + managed PG ride the same ~60-min provisioning sitting; the log
  gains rows for host + DB when provisioned).
- **#16 EAS signing/build** → P16 (first device-build need is NOW — the alpha wave).
- **#2 Android device** (~$40–80 used Pixel/Samsung, FB Marketplace) — Play device verification AND
  the M6 Android QA unit; **the 2–4 Android cohort members can't be QA'd blind.**
- **#1/#3/#4/#5 the Google chain** → unblocks P14 Play-side + the Play internal track.
- **#9 the 12 warm-body Play testers:** the cohort (5–20, majority iOS, 2–4 Android) **cannot
  satisfy the 12-Android quota — recruit beyond the cohort toward 12 now** (they need only accept +
  install; the 14-day clock runs at M8, but warm bodies take time to find).
- **Beta cohort assembly (new, not in the log):** the alpha list (~3–5 close friends) + the full
  invite list + the group chat (the M6 feedback + nudge channel — push is M7).
- **The §0.4 content sitting** (~30 min, owner taste): the starter achievement/egg sheet.

---

## §7 — OUT OF SCOPE (accounted, not forgotten)

- **Push (NOTIF-01/02/04 + APNs/FCM, provisioning #15) → M7's FIRST packet** (§10). ACH-06's push
  half, adoption/friend-request notifications, DISC-01 notify-me, and the NOTIF-04 priming moments
  all land there. **The beta's return mechanism is the group chat — an accepted gap.**
- **Moderation console (MOD-03/04) + MOD-02 threshold auto-hide** → M7; M6 reports are capture-only
  (§0.5). **MOD-07 text screening** → M7 (recommendation notes ship unscreened — acceptable for the
  trusted beta, recorded).
- **Settings notifications page + feedback pages** → M7 (§0.10) · **account deletion** → M8 (§0.3,
  OQ-145) · **SYS-11 diagnostic bundles** → M7 (OQ-060).
- **DISC-02/03 browse/search + notify-me** → M7 (§0.8 slice) · **Onboarding** → near-launch (0062).
- **Universal links / public web card page / post-install invite attribution** → §10 parked; M6
  invites = QR + tokenized URL on the static landing (§0.6).
- **OQ-100 hour-inference half** → M7 · **operator UI** (OQ-080) → external tool, parked.
- **⟨stretch⟩ only if the window has room:** OQ-140 composition presets (per §0.12).
- **The 14-day/12-tester Play closed test** → runs at M8; M6 only recruits (§6).

---

## §8 — DEFINITION OF DONE

- [ ] §0 rulings recorded → decision 0076 + `m6-entry-decision-log.md` · spec/contract/OQ bumps
      (OQ-096 · OQ-097-WTP-half · OQ-145-posture · OQ-146 · the §0.12 set) · `/health` 🟢
- [ ] §1 spike GO recorded (friend-fabric thread + the collapse proof)
- [ ] P1 built test-first · **G-D re-fire (friend-read class) PASSED at the owner sitting** ·
      mutual-request race + block-severance F36 green
- [ ] P2 read fabric live · F06 field-diff tests per shape pair · the SOC-09 mutual-invisibility
      sweep complete (one test per surface) · OQ-146 denormalization landed + backfilled
- [ ] P3 invites live on the `AUTH-LOOKUP` class · token forge/TTL/cap tested · QR resolves on device
- [ ] P4 feed aggregation honest (flood-suppression + trivia-exclusion proven) · recs thread
      end-to-end (recommend → feed → queue with note)
- [ ] P5 queue + Top-10 substrate green (caps · permutation · F36 rank integrity)
- [ ] P6 engine: idempotent/no-farm unlocks proven · reward tx atomic · secret masking on every
      read · **P6c starter set seeded per the §0.4 sheet** · the ACH intent checkpoint sat
- [ ] P7 reports capturing + rate-bucketed · AUTH-01 breach check live (fail-open tested) · spec
      line updated
- [ ] P8 Friends tab through the full pipeline (manifest→murr→parvati→0 flags) · **first-article
      owner walk passed** with a second real account
- [ ] P9 friend profile/collection/compare walked · PROF-03 omission renders honestly · SOC-11
      adopt-from-friend works (the M5 sheet re-pointed)
- [ ] P10 Top-10 curated for real (placeholder retired) · Profile three doors · Discover §0.8 slice ·
      CAT-12 rail live
- [ ] P11 achievements screen + celebration walked · an unlock earned live on device · profile
      teaser/showcase live
- [ ] P12 Settings shell + BLOCKED page + ReportSheet on all three targets · block/report pair
      walkable end-to-end
- [ ] P13 contributor screen live · every DESIGNED-BY/ADDED-BY tap routes there (E8a closed)
- [ ] **P14 P2b + G-J + the manual sandbox pass** — fires on the Google email; if provisioning
      doesn't clear this window either, the carry is **explicitly re-recorded** (never silently)
- [ ] P15 **G-C PASSED**: prod/staging separation · R2 swapped in (media on CDN) · restore drill
      executed · Sentry verified live · secrets in the host store
- [ ] P16 TestFlight lane live: alpha wave installed (internal) · external group through Beta App
      Review · Android .aab ready for Play internal · welcome note approved
- [ ] §4 independent Opus cross-audit of the privacy fabric **RUN + findings closed** (scheduled,
      receipt-lined — the M5 lesson)
- [ ] Six-check CI green on `m6` · every new test ID-tagged · SYS-07/F06/F36 counts reconcile
- [ ] Receipts: `m6/social-receipt.md` (P1–P7) + per-surface receipts (P8–P13) + `m6/beta-receipt.md`
      (P14–P16) · SCREEN-STATUS rows updated · component-map bumped · `/health` 🟢
- [ ] **◆ BETA SIGN-OFF sat**: safety-rail acceptance recorded (report ✓ · block ✓ · delete trails
      M8) · invites out to the alpha wave → cohort · **M6 exits with external users on the build**

---

## §9 — INPUTS (the fresh builder/reviewer reading list)

- **This brief** · [CLAUDE.md](../../CLAUDE.md) · [CONVENTIONS.md](../../CONVENTIONS.md) · [00-INDEX](../00-INDEX.md)
- **Scope:** [road-to-market §4 row M6 + §11 gates](road-to-market.md) · decisions **0071** (beta
  re-timed to M6) · **0073** (the read-class law + the AUTH-LOOKUP pre-naming) · **0072/0074/0075**
  (economy context the social surfaces price against) · **0040** (ConfirmSheet law) · **0010** (silent
  unfriend) · **0036** (friendsWhoOwn) · **0038** (ACH-09 tiers) · **0047/0049/0050** (Top-10 + the
  three doors) · **0076** (this gate, once filed)
- **Spec:** product-spec §5.10 (SOC-01..11) · §5.11 (WTP-01..03) · §5.13 (NOTIF — for what M6 does
  NOT build) · §5.14 (MOD-01 + MOD-09 non-disclosure) · §5.15 (ACH-01..09 + the content design rule)
  · §5.4 CAT-07/09c/10/12 · AUTH-01 · §6 data model · api-contract §§Social/WTP/Achievements/Reports
  + error registry · testing-strategy §§2–7
- **Design:** `friends-states.html` · `find-add-friends-states.html` · `compare-states.html` ·
  `profile-states.html` (friend artboards) · `collection-states.html` (friend/COL-11 + TOP stage) ·
  `game-page-states.html` (M7 friend artboard) · `discover-states.html` · `achievements-states.html`
  · `contributor-states.html` · `settings-states.html` · `report-states.html` · design-spec
  §2.2/§2.7/§2.10/§2.11/§2.12/§2.16/§2.19/§2.6/§2.8 · component-map · Design System Catalog
  (F-01..F-09, F-06 scale; the F-02 PRESTIGE-gold + F-05 SECRET-magenta carve-outs) · SCREEN-STATUS
- **Open questions in play:** OQ-096 · OQ-097 (WTP half) · OQ-145 · OQ-146 · OQ-075 (recommend-compose
  = the one design gap — P8 scopes a minimal compose sheet or files it) · OQ-136/140/142 (§0.12) ·
  OQ-004 (content, pulled forward) · OQ-093 (bucket half)
- **Precedent:** `m5-build-task.md` (this brief's template) · `m5/economy-receipt.md` +
  `m5/surfaces-receipt.md` (what exists — the substrate M6 stands on) · `m5-entry-decision-log.md`
  (the §0 log template) · `m5-review-notes.md` (E8a/E8b filed-forward + the walk-round rulings) ·
  [`m1p-provisioning-log.md`](m1p-provisioning-log.md) (the owner lane)
- **Skills:** murr · parvati · burt · doctor-nick · health · superpowers:test-driven-development ·
  superpowers:verification-before-completion

---

## §10 — M7 FORWARD-LOOK (so nothing lands cold)

**M7's first packet is PUSH** (owner directive 2026-07-15): APNs/FCM creds (provisioning #15) →
expo-notifications → NOTIF-01 types (friend activity · adoption Nx · release · drop) + NOTIF-02
prefs (the Settings notifications page deferred from §0.10) + **NOTIF-04 priming** (the one-shot OS
prompt fired only at the high-intent moments — publish-a-card being the highest, decision 0015) +
ACH-06's push half. The beta cohort is the perfect priming audience: they're already in the group
chat, and push replaces it. Then: moderation console (MOD-03/04, reading P7's table) · MOD-02
auto-hide · MOD-07 screening · DISC completion · SYS-11 (OQ-060 first) · the feed→push bridge.
