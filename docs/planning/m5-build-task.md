# M5 Build Task — Community & Economy

> **What this is.** The paste-once build brief for **M5** ([road-to-market §4, row M5](road-to-market.md)):
> publish/adopt cards · wallet + ledger · store + IAP (receipt validation ECON-06 · refund reversal
> ECON-09 · restore) · CARD-13 premium reconcile · OQ-122 published-read guard · contributor profile
> goes live · CARD-21 share · SOC-09-light. **Filed 2026-07-12** by the Fable-5 orchestrator session.
> Execution begins **the moment M4 closes** (owed: the light-theme floor sweep + the owner's gate-5
> sign-offs + one close-out commit — see [m4-review-notes.md](m4-review-notes.md) tail).
>
> Owner: Aiden · Execution: **Claude Code** (Fable-5 orchestrator session + delegated builder agents)
> · Branch: **`m5`**, cut from `m4` head after the M4 close-out commit (M4 merges to `main` when the
> owner says so) · Depends on: M4 signed · M1-P **partial** (Apple Dev ✓ · Google Play ✗ ·
> RevenueCat ✗ — see §6, the owner-parallel lane).
>
> **Owner-gating mode for this milestone (owner directive 2026-07-12): GATE AS WE GO.** The owner is
> present through the build day; each economy packet lands into a short owner checkpoint rather than
> one end-of-milestone sitting. The named gates (§5) fire at their packet's completion, not at the end.

---

## MODEL PLAN (read first — owner directive in CLAUDE.md)

- **Orchestrator + reviewer: Fable-5 (this session).** Writes the §0 rulings with the owner, writes
  the packet manifests, reviews **every** packet diff (builder≠verifier holds: Fable never reviews
  its own build output — anything Fable builds inline gets an Opus independent review), runs the
  owner checkpoints, files receipts.
- **Builders (fresh-context subagents, one per packet):**
  - **Opus-4.8** — everything user-facing (P5–P8: taste ≥ 7) and the test-first server cores
    (P1–P3: economy, IAP, publish — hard enough to want strong intelligence, reviewed by Fable).
  - **Sonnet-5** — clear-spec mechanical packets (P4 acquire endpoints once P1's ledger service
    exists, P9 share-image, P10 seeds). `effort: 'low'` for the pure sweeps. **Standing permission:
    if Sonnet output misses the bar, the reviewer reruns the packet on Opus/Fable without asking.**
  - **Never Haiku.**
- **Reviews:** every server packet gets a **murr-style fresh-context diff review** (Fable) **plus**
  the packet's integration suite green; the economy core (P1+P2 together) additionally gets an
  **independent Opus cross-audit** before the owner's G-I sitting ("for anything important, run
  both" — owner directive). Client surfaces get **parvati** against their manifest + the states board.
- **Builder packet prompts must say:** *"do the work directly yourself; never spawn sub-agents or
  poll-wait"* (standing lesson, 2026-07-10).

---

## §0 — M5-ENTRY GATE (blocking rulings, ~45 min owner sitting; file `m5-entry-decision-log.md` + decision 0072)

Nothing in §3 builds until §0.1 is ratified; §0.2's pricing sheet blocks **content** (seeds, store
tiles, premium tags) but not **substrate** (tables, services, endpoints) — P1/P2 may start the
moment §0.1 + §0.3–0.5 are recorded.

| §0 | Item | The question + Fable's recommendation | Blocks |
|---|---|---|---|
| **0.1** | **OQ-122 read-class (gate-3 — guard-surface change, owner eyes required)** | Ratify the third read class: a `// SYS-01-PUBLIC-READ` marker + `publishedOnly(table)` repo helper, valid **only** for reads carrying an explicit `status = 'published'` (or equivalent visibility) predicate + never selecting `composition` (flattened images only cross-user); plus the bearer-token `AUTH-LOOKUP` variant scoped to an enumerated repo list (M6's invite tokens pre-named). Folds **OQ-126** (`SYS-01-COMMUNITY-AGGREGATE` unifies under it). `rule-02-scoping` lint extended to admit the marker only when the predicate is present. **Recommend: as proposed in OQ-122.** | P3, P8, §1 spike |
| **0.2** | **The pricing sheet — ✅ RULED EARLY (decision 0072, 2026-07-12)** | **LOCKED ahead of the sitting** to unblock the §6 provisioning lane: **adoption = component acquisition + free design grant** (ECON-03/04 rewritten — product-spec 0.54 / api-contract 0.56; personalized price chips; free-if-owned; adopt-then-edit sheds its reconcile) · base **5 PX/$** · 7-tier ladder **1/2/3/4/6/8/10 ULTIMATE** · 5-SKU pack line **$0.99 starter-12 / $1.99-10 / $4.99-30 / $9.99-65 / $19.99-140** (conforms to the ruled Top-Up board) · floor **−25**. **Still owed at the sitting:** the per-item **0063 roster re-tag** (which effects/shells land in which tier — owner taste) and **OQ-137** title-ink (recommend: free, no economy dimension). | ~~content~~ unblocked; re-tag blocks P10 seed data only |
| **0.3** | **IAP restore — the one undrawn endpoint** | Roadmap names restore in the M5 exit; api-contract 0.55 has no path for it. **Recommend:** restore rides `POST /iap/validate` (`{platform, rcUserId}` → re-validate + entitlement re-sync; consumables never re-granted, ECON-06/decision 0017) — draw it as a documented reuse, no new endpoint. Contract bump. | P2 |
| **0.4** | **New refusal codes + the ledger reason enum** | Pin per the LOOK_CAP 409 precedent: `INSUFFICIENT_BALANCE` (409, carries `{shortBy}`) · `ALREADY_ADOPTED` (409) · `NOT_PUBLISHED` (409, adopt/share against non-published) · `MIN_COMPLEXITY` (409, CARD-19) · `DUPLICATE_COMPOSITION` (409, CARD-19 hash-dedup, carries nothing — no card leakage) · `STARTER_PACK_CONSUMED` (409, ECON-10). 422 stays zod-only. Pin `currency_ledger.reason` enum: `starting_grant · daily_claim · pack_purchase · adoption · acquire · milestone · refund_reversal · admin_adjustment` (product-spec data-model formalization — the ECON-07 prose becomes a schema field). Contract + spec bump. **Recommend: as listed.** | P1–P4 |
| **0.5** | **Flattened-render storage seam** | Where do publish-time images (CARD-15 image + thumb + CARD-21 share variant) live? **Recommend:** a `StorageProvider` seam in the API (put/get/delete by key) with a **local-disk implementation now** (API-served `/media/…`, dev-stack friendly); Cloudflare R2 + CDN is a **swap-in before the M6 beta**, provisioned in the owner lane (§6) — not today's blocker. `imageUrl/thumbUrl` columns already exist NULL. | §1 spike, P3, P9 |
| **0.6** | **SOC-09-light definition** | The spec has **no** "light" variant (product-spec flag) — SOC-09 is one full-severance block. **Recommend the M5 slice:** (a) gallery/trending reads exclude blocked-either-direction designers' cards; (b) CardDetail's designer context carries the block action (existing `POST /me/blocks`); (c) **blocking a designer does NOT claw back an already-adopted card** (MOD-08 "flattened card persists" pattern) — your copy stays, their gallery presence disappears; (d) attribution on your kept copy stays (it's on the flattened image anyway). Full block UX (Settings list, mutual-invisibility sweep on profiles/search/feed) lands M6 with SOC proper. Spec gets a SOC-09 sub-clause; decision recorded. | P3, P8 |
| **0.7** | **CARD-19 defaults + rate limits (G-K async — safe defaults, owner may adjust later)** | Min-complexity: **≥ 3 elements or ≥ 2 distinct element types** (drafts/private exempt). Publish rate limit: **3/10 min + 10/day** (`cards:publish`, stacked pair per `catalog:create` pattern). Adopt: **30/min + 200/day** (`cards:adopt` — closes OQ-097's uncapped-bulk-adopt hole). Spend: `wallet:spend` 30/min. IAP: `iap:validate` 10/min. Hash-dedup scope: **global exact-match refuse** (simplest true reading of CARD-19). All SYS-04/SYS-05 tunable. | P1, P3 |
| **0.8** | **ECON-09 negative floor + OQ-092 copy** | Floor default: **−25 PX** (SYS-04). Copy ruling: v2 has **no clawback on refund** (ECON-09) so the "nothing you own is taken back" store copy is TRUE for users; the one exception is **operator** clawback (ECON-11) — reconcile the copy to "purchases are yours to keep" phrasing that doesn't promise against ECON-11. Closes OQ-092 for v2. | P2, P6 copy |
| **0.9** | **AUTH-01 breach-list check — re-slot** | Spec text says "breach-list check deferred to M5" but it's security backlog, not economy; it adds a runtime dependency + network call. **Recommend: re-slot to M6** (pre-beta hardening, where it belongs). Spec line edit + changelog if agreed. | — |
| **0.10** | **Deferred-carryover ruling table** (accounted, not forgotten) | **OQ-140** canvas-compositions-as-presets → ⟨stretch⟩, builds only if the day has room. **OQ-136** pick-a-card in Add-Game → ⟨stretch⟩. **OQ-138** render budget: the gallery consumes **flattened images, never live skia canvases** (CARD-15's whole point) — the WebGL ceiling doesn't apply to M5's gallery; recorded as the app-wide stance (live canvases = editors only). **OQ-141** CoW copy-POST idempotency → a cheap guard rides P3 (hash+`derivedFromCardId` uniqueness check on create), else stays deferred. **OQ-100** adoption-count privacy: gallery `AdoptCount` is public **by design** (OQ-069/decision 0024 already surfaced it there); the hour-inference half stays M7. **OQ-101** offline adopt: adopt is **online-only** (disabled offline state per store board P12 pattern); idempotency via `ALREADY_ADOPTED`. Light-theme M5 surfaces (wallet, PIXELS CountTag, price chips, published tags, ReconcileSheet) **inherit the 0070 themed tokens** — build to them from birth. | — |
| **0.11** | **M1-P lane kickoff** | Apple Dev ✓ enrolled. **Google Play Console ($25, identity verification takes days) — start enrollment TODAY, first thing**, it runs while agents build. RevenueCat account + apps + products/entitlements follow the 0.2 pricing sheet (§6 walkthrough). **Not build-blocking** — P2 builds against the mocked seam (testing-strategy §5 prescribes exactly this); the **real-sandbox swap-in (P2b) and G-J land whenever provisioning completes**, today or later. | G-J, sandbox pass |

**Exit §0: ✅ GATE CLOSED 2026-07-12** — rulings recorded in **decision 0072** (pricing/adoption
model) + **decision 0073** (everything else) + [`m5-entry-decision-log.md`](m5-entry-decision-log.md)
· product-spec **0.54/0.55** · api-contract **0.56/0.57** · open-questions swept (11 entries cite
0073) · `/health` 🟢. **Still owed before §3:** the M4 close-out commit + `m5` branch cut (owner) ·
the §1 spike (first build act) · the roster tier re-tag (focused pass — blocks P10 only).

---

## §1 — THE PUBLISH-THREAD SPIKE (de-risk before surfaces build on it)

M4's render spike proved flatten **node-side and on-device** (`apps/mobile/src/render/`, decision
0064). What's *not* proven is the same flatten **inside the API runtime at publish time**, writing
through a storage seam, read back cross-user under the new guard. That thread is what every P3/P7/P8
surface stands on — so it goes first, thin, end-to-end:

1. `POST /cards/:id/publish` (happy-path only: no reconcile, no dedup, no rate limit yet) →
2. server-side flatten (reuse/port the M4 render module into `apps/api` — **node skia in the API
   process**; if the API runtime fights skia, fallback = a render worker script the API shells to,
   decision recorded) →
3. `StorageProvider.put()` (local-disk impl) → `imageUrl`/`thumbUrl` set, `status='published'` →
4. `GET /games/:gameId/cards` under `publishedOnly(card_designs)` returns it to a **different** seeded
   user (composition **not** in the payload — flattened urls only) →
5. that user `POST /cards/:id/adopt` (free path) → `card_adoptions` row + `adoption_count` increment →
   the adopted card equips on their collection entry.

**Budget cap:** if the spike isn't threading by ~90 min of agent time, STOP — Fable + owner re-scope
(the known fallback: worker-script render). **Go/no-go is an owner checkpoint** (the first
gate-as-we-go stop). Spike code may be rough but must yield the reusable `render` + `storage` modules;
the OQ-122 guard mechanics it proves are P3's foundation. Builder: **Opus**, Fable review.

---

## §2 — THE PIPELINE (per-packet process — unchanged from M4, it works)

**Server packets (P1–P4, P9):** packet brief (this doc §3 + the manifest) → **test-first** (the §5
invariant list IS the failing-test list, written before implementation) → build → six-check CI green
→ **Fable diff review** (murr lanes: SYS-01 scoping · transaction boundaries · idempotency · error
codes vs contract · zod coverage · rate-limit wiring · no invented behavior) → findings to 0 →
receipt entry.

**Client surfaces (P5–P8):** **manifest first** (`docs/planning/m5/<surface>-manifest.md`, extracted
state-by-state from the converged board, statuses OWED/PRE/EXPECTED/ASSUMPTION/GAP, ARCH callouts,
browser BOOT check) → build (component-map names only; CONVENTIONS.md; 0069 button convention; 0070
themed tokens from birth) → **murr** diff review → **parvati** against manifest + running app →
route findings (🚩 fix now · ✅ defer with cite · 🎨 owner's eye) → loop to 0 flags → receipt.

**First-article rule:** the **Store screen (P6)** is the first client surface through the pipeline —
it goes to the owner ALONE (walk + taste) before P7/P8 surfaces mass-produce against its patterns.

**Environment:** `node scripts/dev-stack.mjs up` first move · doctor-first on friction · Metro :8082
only (never :8081) · supertest integration > browser loop for behavior · browser lane for visual only
· demo login `demo@ingame.app` / `InGameDemo1!` · destructive DB testing → disposable `PORT=4001` API.

---

## §3 — BUILD ORDER (packets, dependencies, models)

**Dependency graph:**

```
§0 rulings ──▶ §1 SPIKE (publish thread) ──▶ P3 ──▶ P7, P8, P9
     │
     ├──▶ P1 (economy substrate) ──▶ P2 (IAP seam) ──▶ [P2b real-RC swap-in ◀── §6 M1-P]
     │            └──────────────▶ P4 (acquire/entitlements)
     ├──▶ P5 (lifecycle kit) ──▶ P6 (Store+Wallet) ──▶ P7 (premium-in-editor)
     └──▶ P10 (seeds — content after §0.2)
Parallel lanes at any moment: {P1→P2 server} ∥ {§1 spike→P3 server} ∥ {P5→P6 client} ∥ {§6 owner}
```

### P1 — Economy substrate (server · **test-first** · Opus · Fable review · owner checkpoint = G-I)
- **Migration 0008:** `wallets` (userId unique, balance int, floor per SYS-04 config not schema) ·
  `currency_ledger` (userId, delta, reason enum per §0.4, refType/refId nullable, createdAt;
  append-only — no UPDATE path exists in code) · `store_products` (productId, pixels, oneTime,
  active) · `iap_receipts` (userId, platform, receiptId **unique**, productId, pixelsGranted,
  raw jsonb, validatedAt).
- **Ledger service** (`apps/api/src/services/economy/`): every balance change is
  `SELECT … FOR UPDATE` on the wallet row + ledger insert **in one transaction**; wallet
  lazy-created on first touch (starting grant = 5 PX, `starting_grant` ledger row); **the balance is
  always derivable from the ledger** (a reconcile assertion helper used by tests + a dev-only
  reconcile check). Spends refuse below floor → `INSUFFICIENT_BALANCE {shortBy}`.
- **Endpoints:** `GET /me/wallet` (balance + dailyBonus availability/nextResetAt UTC-day) ·
  `GET /me/wallet/ledger` (paginated) · `POST /me/daily-bonus` (idempotent per UTC-day via a
  period-scoped ledger uniqueness — unclaimed lapses, no banking).
- **ECON-11 tail:** `adjustPixels(operator, userId, delta, reason)` service-layer op (never a route)
  → `admin_adjustment` ledger row + `admin_audit_log` row. Service + tests only, no UI (OQ-080).
- **Rate buckets:** `wallet:spend` 30/60s · daily-bonus rides the fallback.
- **Tests (ID-tagged, the failing list first):** ECON-02 starting grant exactly-once (concurrent
  first-touch race) · ECON-02 daily idempotent per UTC-day, lapses · ECON-07 ledger↔balance reconcile
  after arbitrary op sequence · INSUFFICIENT_BALANCE at floor · **concurrency: N parallel spends
  against a balance that covers one — exactly one succeeds (real PG, Testcontainers)** · ECON-11
  adjustment writes both rows · SYS-07 authz on every read/write.
- **Owner checkpoint (gate-as-we-go): G-I** — watch the double-spend test demonstrated on real PG +
  the reconcile invariant; confirm the invariants are the RIGHT ones (§5).

### P2 — IAP seam (server · **test-first** · Opus · Fable review)
- **Provider seam:** `IapProvider` interface (`validateReceipt`, `verifyWebhookSignature`) with
  `MockRevenueCat` implementation (deterministic receipts for tests/dev-seed) — the swap-in point
  for P2b.
- **Endpoints:** `POST /iap/validate` ({platform, receipt|rcUserId} → validate → grant pixels via
  P1 ledger (`pack_purchase`), idempotent on `iap_receipts.receiptId` — **a replayed receipt never
  double-grants**; ECON-10 Starter Pack once/account → `STARTER_PACK_CONSUMED`) · restore = the same
  endpoint per §0.3 (re-validate + entitlement re-sync; **consumables never re-granted**) ·
  `POST /iap/webhook` (server-to-server, signature-verified, refund event → `refund_reversal`
  ledger row, **balance may go negative to the §0.8 floor**, no cosmetic clawback).
- **Tests:** ECON-06 replay no-double-grant · ECON-06 restore grants nothing consumable, re-syncs
  entitlements · ECON-09 refund reverses exactly the granted amount, negative balance lands, future
  earns recover · webhook bad-signature 401 · ECON-10 second starter-pack refused · concurrency:
  same receipt validated twice in parallel → one grant.
- **Owner checkpoint:** refund-reversal demo (mock webhook fire → ledger + negative wallet visible).

### P2b — Real-RevenueCat swap-in (server · Sonnet · fires **when §6 provisioning completes**)
- `react-native-purchases` into `apps/mobile` (written dep justification: the locked IAP layer,
  decision 0046) · real `RevenueCatProvider` (API key config via env, never repo) · webhook
  signature against real RC secret · product-mapping table seeded from the §0.2 sheet. → unblocks
  **G-J** + the first manual sandbox pass (§5).

### P3 — Publish · adopt · gallery (server · **test-first** · Opus · **Fable review, heaviest**)
- **Guard first:** implement §0.1 — `publishedOnly(cardDesigns)` helper + `// SYS-01-PUBLIC-READ`
  marker + `rule-02-scoping` lint extension. **G-D re-fire:** strip the predicate → the standing
  authz tests go RED (owner watches, 2 min).
- **Migration 0009:** `card_adoptions` (adopterId, cardDesignId, gameId, currencyPaid, createdAt,
  **unique(adopterId, cardDesignId)**) — the separate grants table 0066 §3 promised.
- **Endpoints:** `POST /cards/:id/publish` (CARD-19 gate: min-complexity §0.7 · global hash-dedup
  `DUPLICATE_COMPOSITION` · `cards:publish` limits · **CARD-13 reconcile gate: refuses if composition
  contains unowned premium** → the client reconciles via P4 · flatten via §1 modules → storage →
  `status='published'`, immutable thereafter — PATCH refuses, edits fork via CoW `derivedFromCardId`,
  decision 0067's design intent lands) · `POST /cards/:id/adopt` (**decision 0072 semantics**: one
  transaction = atomic acquire of the card's premium components the caller doesn't own (debit =
  missing sum via P1 + per-component entitlements via P4's service + `acquire` ledger rows) + the
  free design grant (`card_adoptions` row) + `adoption_count` increment; **free if no premium /
  all owned**; `INSUFFICIENT_BALANCE{shortBy}` · `ALREADY_ADOPTED` · `NOT_PUBLISHED`;
  blocked-designer refused per §0.6; **gallery payloads carry the personalized missing-components
  price**) ·
  `POST /cards/:id/unpublish` (CARD-20: delist, adopters keep grant, count freezes; never-adopted
  published may DELETE) · `GET /games/:gameId/cards` (publishedOnly + block-filtered + `toPublicShape`
  designer attribution, **no composition on the wire**) · `GET /discover/trending-cards` (OQ-055
  shape, same guards).
- **Contributor data goes live for free:** `cardsDesigned`/`totalAdoptions`/`signatureCard`/`topCards`
  on the already-built CAT-07 endpoints stop honest-zeroing the moment adoptions exist — verify with
  an integration test, no new endpoint work.
- **Tests:** CARD-19 each gate independently · CARD-20 lifecycle (immutability, unpublish semantics,
  adopters-keep) · ECON-03/04 (0072): debit == missing-components sum exactly · already-owned
  components never re-charged · free-if-owned and free-if-no-premium adopt at 0 with the grant +
  count still landing · entitlements granted are account-wide (usable on the adopter's own next
  save) · **concurrency: parallel adopts of the same card by one user → one row; parallel adopts
  against a balance covering one missing-component set → one succeeds** ·
  OQ-122 guard: cross-user read returns published only, never composition, never draft/private ·
  F06 cross-principal serialization · SOC-09 both-direction filtering · SYS-07 per mutating endpoint.
- **Owner checkpoint:** publish→gallery→adopt walked live cross-user (two seeded accounts) + G-D re-fire.

### P4 — Acquire + entitlements (server · Sonnet, Fable review; escalate to Opus if the bar slips)
- **Migration (rides 0009):** `user_entitlements` (userId, cosmeticId, source enum
  `purchase·earned·operator_grant`, unique pair). `GET /me/entitlements` reads it for real.
- **Endpoints:** `POST /cosmetics/:id/acquire` (idempotent; debit via P1; entitlement + ledger
  `acquire`) · `POST /cosmetics/acquire-batch` (CARD-13's ACQUIRE ALL: **atomic all-or-nothing**
  against the total, already-owned = silent no-op, one ledger row per item) · premium derivation:
  `isPremium` (CARD-06) computed from composition/style against the §0.2 re-tagged roster —
  live everywhere a card saves.
- **Tests:** acquire idempotent · batch atomicity (one unaffordable item → nothing debits) ·
  batch already-owned no-op rows · ECON-11 operator grant/clawback entitlement path · CARD-06
  derivation flips with roster tags.

### P5 — Shared lifecycle kit (client · Opus)
- The component-map's ✅⭐ "build first" family, still unbuilt and blocking every M5 screen's state
  matrix: `Skeleton` · `LoadError` · `EmptyState` · `Offline` · `Unavailable` · `Toast`
  (`apps/mobile/src/components/lifecycle/`). Themed-token-native (0070), F-06 scale, RTK-Query-shaped
  props (`isLoading/isError/refetch`). Jest per state; retrofit nothing at M5 — existing screens
  migrate opportunistically later (recorded, not swept).

### P6 — Store + Wallet (client · Opus · **FIRST ARTICLE** · manifest: `m5/store-manifest.md` from `store/store-states.html`)
- **Commerce kit** (component-map §7, all unbuilt): `PixelsMark`/`CurrencyCounter` (the persistent
  header counter — ECON-07's entry point everywhere) · `PriceChip`/`BuyBar` (hold-to-buy
  `motion.holdToBuy` **+ the OQ-046 non-hold accessible alt — a launch gate, not a trim**: recommend
  press-then-confirm `ConfirmSheet` path when a11y settings demand, parvati verifies both paths) ·
  `PackTile`/`ItemTile` · `LedgerRow` (incl. `admin_adjustment` + negative-balance render, board P8)
  · `OwnedTag`/`LockedTag`/`EarnedOnlyTag` · `DailyBonusBar` · `AisleIndex` · `PreviewStrip`/`PreviewStage`.
- **Screen:** `app/store.tsx` per the converged board P1–P12 (browse+daily-claim · drop drawer
  *render-capable, no seasonal content authored — ECON-08 is P2 priority, empty-drops state ships* ·
  item detail sheets · live previews · can't-afford bridge → P6 Top Up · IAP purchase via P2 (mock
  until P2b) · landed-purchase moment · **P8 Wallet** · ownership states · lifecycle via P5 kit ·
  writes-gated offline).
- **Owner checkpoint (first-article + gate-5 taste):** the full store walk on device/web — pricing
  feel, hold-to-buy feel, wallet history honesty, daily claim.

### P7 — Premium-in-editor: CARD-13 reconcile (client · Opus · manifests append to styler/canvas/device receipts)
- The `EXPECTED(M5)` rows across three signed M4 surfaces come due: **Styler** — PX `CurrencyCounter`,
  price-chips/PREVIEW flags/cost-stack/premium-picks header/owned-tags, **P6 `ReconcileSheet`** with
  funded/short fragments, KeepBeat PX-spent line, received-base adopt-then-edit fragment · **Canvas**
  — ◆ PUBLISH enabled → CARD-19 checklist UI → **P8 `PrintRitual` full-tier** (the publish ritual,
  OQ-040) wired to P3 · **Device** — the D7/D7b/D7c premium row (`KeepBar`, cost-flag, cart →
  `acquire-batch`), PIXELS CountTag, D9 locked-premium offline half. All inherit 0070 themed tokens.
- **Rule:** these are **additive slips into signed surfaces** — murr's diff lane guards against
  regressions on the signed M4 behavior; parvati re-walks only the premium states + one smoke pass.
- **Owner checkpoint:** preview→short→top-up→reconcile→KEEP, and Canvas publish ritual end-to-end.

### P8 — Community gallery + adopt (client · Opus · manifest: `m5/gallery-manifest.md` from `game-page-states.html` CARDS-gallery artboard + `discover-states.html` P5)
- Game page **CARDS community gallery** (`CommunityGallery` 3-up + `AdoptCount` + DESIGNED-BY +
  `PriceChip`/FREE — flattened thumbs only, OQ-138 stance; **price chips personalized** = the
  caller's missing-components sum, decision 0072) · **adopt confirm** (SOC-11 `ConfirmSheet` listing
  the components being acquired + total — the ReconcileSheet pattern with a card preview; FREE path
  confirms without a debit line) · adopted card lands in the switcher (COL-06) ·
  CardDetail SHARE/EDIT enable (edit = CoW fork per CARD-20) · block-the-designer action (§0.6) ·
  Discover trending-cards tap-through · contributor profile live-data spot-check (`SectionEmpty`
  contributor hook lands with P5 kit).
- **Owner checkpoint (gate-5 taste):** browse→inspect→adopt→equip on device, both price paths.

### P9 — CARD-21 share-image (server+client · Sonnet)
- `GET /cards/:id/share-image` — server-composited share variant (flattened render + "made in
  InGame" mark + designer attribution) via §1 modules, storage-cached; refused while
  moderation-hidden. Client: native share sheet from Game page PLAY SHARE + CardDetail. Image-only
  (deep links stay parked §10).

### P11 — The Newcomer Ladder (cross-stack · Opus · **added at the gate-1 sitting, decision 0074**)
- **Server:** starting grant 5 → **10 PX** (config + tests) · the ladder service on the existing
  daily-claim seam: claims 1–7 (lifetime count = `milestone`-reason ledger rows with
  refType `newcomer_ladder`, refId = step) grant **+2/+2/+3/+3/+4/+5/+6** + an earned-cosmetic
  entitlement slot per step (`source:'earned'`; cosmetic ids from a SYS-04 config seed — **empty
  until the roster pass picks the newcomer set**, the grant no-ops gracefully on an empty slot) ·
  claim 8+ = the standing +1 (lapses; the ladder never lapses) · `GET /me/wallet.dailyBonus` gains
  `{ladderStep?, ladderReward?}` so the client renders the escalation · same UTC-day idempotency +
  wallet-lock discipline (F36 tests on the ladder step race).
- **Client:** `DailyBonusBar` goes ladder-aware (step N of 7 · tomorrow's tease · the cosmetic-drop
  moment when the slot is filled) — an additive slip into the signed P6 surface (murr diff-guard).
- Contract bump (mine, at close): the wallet response extension.

### P10 — Seeds + demo content (Sonnet · `effort: low` · after §0.2)
- `store_products` seed from the pricing sheet · roster re-tag data (premium flags + PX prices) ·
  dev-seed: second demo user with published cards (adoptable both price paths), wallet states
  (fresh/rich/negative), consumed starter pack — the `db:seed-dev` shelf grows idempotently ·
  shared factories (`makeWallet`, `makeLedgerRow`, `makePublishedCard`, `makeAdoption`) serving
  tests + seed both (testing-strategy §6).

---

## §4 — INDEPENDENT AUDIT POINT (cross-model, owner-triggered)

After P1+P2+P3 are Fable-reviewed and green (the economy core), an **independent Opus audit** runs
before the money endpoints are declared done: fresh context, no access to Fable's review notes,
prompt = the §5 invariant list + the diff + "find what the review missed; adversarial on transaction
boundaries + idempotency keys + authz." Findings route through the normal fix loop. (Mirrors M4's §4
stop-point with roles inverted — Fable orchestrates, so the outside eyes are Opus.)

---

## §5 — GATES + DoD MECHANICS

**The named gates (fire gate-as-we-go at their packet):**

| Gate | When | What the owner watches |
|---|---|---|
| **G-I** economy concurrency + intent | P1 done | Double-spend demonstrated RED→GREEN on real PG · ledger↔balance reconcile · confirm the invariants encode the *intent* (ECON-01..11), not just the tests |
| **Refund demo** | P2 done | Mock webhook refund → `refund_reversal` row → negative wallet → recovery by earn |
| **G-D re-fire** authz break-it | P3 done | `publishedOnly` predicate stripped → standing tests RED · test-count == mutating-endpoint count still holds |
| **§1 go/no-go** | spike end | The publish thread runs end-to-end cross-user |
| **First-article + gate-5** | P6, then P7/P8 | Store walk alone first; then reconcile + publish ritual + gallery/adopt on device — the taste gates |
| **G-J IAP-live** | **P2b (rides §6)** | Real-path: sandbox purchase grants once · refund hits the floor rule · webhook signature + product mappings verified. **If provisioning isn't done today, G-J is the one gate that carries over — recorded in the receipt, not silently dropped.** *Known trap: if sandbox returns no products, check the products' "Missing Metadata" status first (a placeholder review screenshot bumps them to "Ready to Submit" — the known fix); also confirm the sandbox tester's storefront region is inside product availability* |
| **Manual IAP sandbox pass** | with G-J (full re-run at M8) | Real StoreKit/Play purchase UX by hand — automation's documented blind spot (testing-strategy §5) |
| **G-N dry-run** deletion ripple | P3 done (real gate = M8) | AUTH-07 walked against the NEW M5 tables on a scratch DB: deleting a user with published+adopted cards → cards unpublish, adopters keep grants, attribution anonymizes, wallet/ledger/receipts/adoptions handled per the kept-set — no orphaned adopters, no retained PII. Findings feed the M8 gate, nothing ships broken |

**The standing spine (every packet, non-negotiable):** six-check CI green (typecheck → lint → unit →
integration/Testcontainers-PG → gitleaks → SCA) · **test-first for everything in this milestone's
server surface** (economy + publish are both §3 risk domains) · every test ID-tagged
(`describe('ECON-03: …')`) · **SYS-07 authz test per mutating endpoint + F06 for every
cross-principal read** · **F36 concurrency test on every ledger/adopt/acquire/receipt path** · zod on
every input · api-contract bumped when a seam changes (error codes land in `ERROR_CODES` +
`isErrorCode()` only as their endpoint builds — F-17) · no new runtime dependency without written
justification (expected: `react-native-purchases` at P2b; anything else = stop and ask) · **economy
is an owner-approval change-class** — every P1–P4 merge gets the owner's explicit go at its
checkpoint (which gate-as-we-go provides by construction).

---

## §6 — THE M1-P OWNER LANE — see [`m1p-provisioning-log.md`](m1p-provisioning-log.md), the live register

**State (2026-07-12, the Apple/RevenueCat sitting — DONE):** Apple Dev ✓ · **bundle ID
`com.aidenmolyneaux.ingame`** (com.ingame.app was taken; app.json updated) · Paid Apps agreement
submitted (W-8BEN filed; **GST/HST Form 506 deliberately deferred → M8**) · app record + IAP key +
sandbox tester ✓ · **RevenueCat project/app/keys/server-notifications ✓** (keys in the gitignored
envs per `.env.example` taxonomy) · **5 IAP consumables live** per decision 0072
(`px_pack_starter/010/030/065/140`; "Missing Metadata" = correct resting state until M8
screenshots) · **Google Play enrollment started** — identity verification percolating.

**Owed items live in the log's §3 table (16 rows, each with its due-gate)** — the ones that bite
*this* milestone: **#6 webhook wiring + #7 react-native-purchases → P2b** · **#8 G-J + first
sandbox pass** (iOS-only is acceptable; Play-side G-J re-run rides #3–#5) · **#2 Android device**
(acquire/borrow — also the M6 QA unit). Everything else (GST/HST, DSA, screenshots, 12 testers,
R2, APNs/FCM, EAS) is parked with M6–M8 due-dates in the log — **do not re-litigate here**.

---

## §7 — OUT OF SCOPE (accounted, not forgotten)

- **ECON-05a** currency-kickback (reserved toggle, off in v2) · real revenue-share (§10).
- **ECON-05 prestige/milestones** — raw adoption count ships now; the celebration/milestone half
  rides the **M7** achievements engine (roadmap note).
- **Operator UI** (OQ-080; ECON-11 stays a service-layer op) · P4 config/authoring tools.
- **Per-user-timezone daily boundary** (UTC-day stands, ECON-02; possible refinement later).
- **Deep links + public web card page** (parked §10; CARD-21 is image-only).
- **Full SOC-09 UX** (Settings blocked-list, mutual-invisibility sweep on profiles/search/compare,
  report flow) → **M6/M7**; M5 ships only the §0.6 slice.
- **MOD-07 text screening** → M7 (M5 write paths accept unscreened text — acceptable pre-beta).
- **CAT-12** friends-are-playing → M6 · seasonal **drops content** (ECON-08, P2) — the drawer
  renders, authoring is later · **AUTH-01 breach-list** → M6 if §0.9 agreed.
- **⟨stretch⟩ only if the day has room:** OQ-140 composition presets · OQ-136 pick-a-card in Add-Game.
- **No beta at M5** — M5 completes internally; the ◆ closed beta is M6's exit (decision 0071).

---

## §8 — DEFINITION OF DONE

- [ ] §0 rulings recorded → decision 0072 + `m5-entry-decision-log.md` · spec/contract/OQ bumps · `/health` 🟢
- [ ] §1 spike GO recorded (or the fallback decision recorded)
- [ ] P1 built test-first · G-I passed at the owner checkpoint · ECON-11 service op tested
- [ ] P2 built on the mock seam · replay/restore/refund invariants green · refund demo shown
- [ ] P2b + G-J + manual sandbox pass — **done, or explicitly recorded as owed on provisioning** (§6)
- [ ] P3 built · G-D re-fire RED shown · publish→gallery→adopt walked cross-user · contributor stats live-verified
- [ ] P4 batch-atomicity green · premium derivation live against the re-tagged roster
- [ ] P5 lifecycle kit built · consumed by every M5 surface
- [ ] P6 Store+Wallet through the full pipeline (manifest→murr→parvati→0 flags) · **first-article owner walk passed** · OQ-046 non-hold alt built + verified
- [ ] P7 reconcile/publish/premium rows landed on all three editors · no regression on signed M4 behavior (murr diff lane) · owner walked reconcile + publish ritual
- [ ] P8 gallery+adopt through the pipeline · owner walked browse→adopt→equip both price paths
- [ ] P9 share-image live · moderation-hidden refusal tested
- [ ] P10 seeds idempotent · factories shared test↔seed
- [ ] G-N dry-run walked on a scratch DB against the new M5 tables · findings filed for M8
- [ ] §4 independent Opus audit run on the economy core · findings closed
- [ ] Six-check CI green on `m5` · every new test ID-tagged · SYS-07/F06/F36 counts reconcile
- [ ] Receipts: `m5/economy-receipt.md` (P1–P4) + per-surface receipts (P6/P7/P8) · SCREEN-STATUS rows updated · component-map bumped (commerce kit + lifecycle kit built) · `/health` 🟢
- [ ] Owner gate-as-we-go log complete — every checkpoint above has a ✓ or an explicit carry-over line

---

## §9 — INPUTS (the fresh builder/reviewer reading list)

- **This brief** · [CLAUDE.md](../../CLAUDE.md) · [CONVENTIONS.md](../../CONVENTIONS.md) · [00-INDEX](../00-INDEX.md)
- **Scope:** [road-to-market §4 row M5 + §11 gates](road-to-market.md) · decisions **0062** (the §0.8 DEFAULT boundary M5 now pays down) · **0071** (no beta at M5) · **0067** (CoW = the published-editing model) · **0063** (roster split) · **0017/0030/0035/0040** (economy rulings) · **0072** (this gate, once filed)
- **Spec:** product-spec §5.4 (CAT-05/07/10) · §5.6 (CARD-04/06/13/14/15/19/20/21) · §5.9 (ECON-01..11) · §6 data model · api-contract §Cards/§Cosmetics-store-economy + error registry · testing-strategy §§2–7
- **Design:** `store/store-states.html` · `game-page-states.html` (CARDS gallery artboard) · `canvas-states.html` P6–P8 · `styler-states.html` (reconcile fragments) · `contributor-states.html` · design-spec §2.3/§2.4b/§2.5/§2.5b/§2.16 · component-map §5.6/§7/§9 · Design System Catalog (F-01..F-09, F-06 scale) · SCREEN-STATUS
- **Open questions in play:** OQ-046 · OQ-092 · OQ-097 · OQ-100 · OQ-101 · OQ-122+126 · OQ-136/137/138/140/141 · OQ-011/002
- **Precedent:** `m4-build-task.md` (this brief's template) · `m4/device-manifest.md`+`device-receipt.md` (manifest/receipt pattern) · `m4-review-notes.md` (the EXPECTED(M5) rows P7/P8 pay down) · `m4-entry-decision-log.md` (the §0 log template)
- **Skills:** murr · parvati · burt · doctor-nick · health · superpowers:test-driven-development · superpowers:verification-before-completion
