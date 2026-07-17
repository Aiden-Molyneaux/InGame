# economy — build receipt (M5 §P1–P4 + P11 · the server economy core)

> **Status: BUILT (§1 spike · P1 · P2 · P3 · P4 · P11 · P10 seed) · every server packet
> Fable-reviewed (murr lanes) with fixes applied · test-first throughout (the §5 invariant list WAS
> the failing-test list) · six-check CI green on `m5` · migrations 0008→0012 applied to the dev DB ·
> G-I PASSED at the gate-1 sitting (decision 0074, 23/23 on real Postgres) · refund demo shown ·
> §1-GO ratified · G-N deletion-ripple dry-run PASSED on a scratch DB (findings → M8, OQ-145) →
> ⛔ STILL OWED: the owner-watched G-D re-fire sitting · P2b + G-J + the manual sandbox pass (ride §6
> provisioning) · the §4 independent Opus cross-audit (no record it ever ran — flagged below) · the
> M8 AUTH-07 checklist (OQ-145).** Nothing committed by this receipt; the packet commits are on
> `m5` (`3eb1015`→`98d4af0`).

## TL;DR
The whole M5 economy substrate landed test-first behind decisions **0072** (adoption = component
acquisition + free design grant; the 7-tier ladder; the 5-SKU pack line; the −25 floor), **0073**
(the §0 seam rulings — the `SYS-01-PUBLIC-READ` read-class, the six 409s, the pinned
`currency_ledger.reason` enum, the StorageProvider seam), **0074** (the gate-1 generosity amendment —
10-PX start + the 7-day Newcomer Ladder; the full-reversal refund posture) and **0075** (the roster
tiering — 26 premium items @ 3/6/8 PX). The balance is **always derivable from the ledger** (the P1
invariant the G-I gate signed), every mutating path is authz- and F36-concurrency-tested, and no
cross-user read ever carries `composition`. **The economy is now the store's best aisle**: every
adoption is a component sale at full price (0072), priced per-caller off `card_designs.premium_component_ids`.

## What changed (packet · files · IDs · fix-notes)

- **§1 — the publish-thread spike** (`02e5ef9`, Opus, Fable review) — de-risked the thread every P3/P7/P8
  surface stands on: in-process **node-skia flatten inside the API runtime** (no worker-script fallback
  needed — the ~30ms-warm in-process render held, ratified at G-I/§1-GO) · the **`StorageProvider` seam**
  (local-disk impl, API-served `/media/…`; R2+CDN owed pre-M6-beta, provisioning-log #14) ·
  `publishedOnly()` + the `// SYS-01-PUBLIC-READ` marker + the `rule-02-scoping` lint extension (decision
  0073 §0.1) · `card_adoptions` (**migration 0009**) · publish/gallery/adopt skeletons. **6 integration
  tests prove the thread cross-user** (publish → gallery read by a *different* seeded user, composition
  absent → free adopt → count increment). (SYS-01, CARD-15/19, ECON-03/04)
- **P1 — economy substrate** (`3eb1015`, Opus, test-first, Fable review; owner checkpoint = **G-I**) —
  **migration 0008** (`wallets` · `currency_ledger` + `seq` · `store_products` · `iap_receipts`) · the
  **transactional ledger service** (`apps/api/src/services/economy/`): every balance change is
  `SELECT … FOR UPDATE` on the wallet row + a ledger insert in ONE transaction; wallet lazy-created on
  first touch; **append-only — no UPDATE path exists in code**; a reconcile-assertion helper the tests +
  a dev check use · `GET /me/wallet` · `GET /me/wallet/ledger` (paginated, opaque cursor; **LedgerEntry
  shape pinned** `{id,type,delta,refType?,refId?,createdAt}`) · `POST /me/daily-bonus` (idempotent per
  UTC-day via a period-scoped partial-unique index + lock) · **ECON-11 `adjustPixels`** service op (never
  a route → `admin_adjustment` ledger + `admin_audit_log`) · `INSUFFICIENT_BALANCE` 409 `{shortBy}`
  (F-17, first live use) · `wallet:spend` 30/60s bucket. **13 integration tests incl. the F36
  double-spend** (N parallel spends against a balance covering one → exactly one succeeds, real PG). ·
  **Fable-review floor clarification:** spend floor = **0** (no spending into debt); the **−25 floor is
  the ECON-09 refund-reversal floor** (P2's path); operator adjustments unfloored (ECON-11).
  api-contract **0.58**. (ECON-02/07/09/11, SYS-01)
- **P2 — IAP seam on the mocked provider** (`24cc953`, Opus, test-first, Fable review; owner checkpoint =
  **refund demo**) — the **`IapProvider` interface** + `MockRevenueCat` (deterministic receipts; the P2b
  swap point, `IAP_PROVIDER` env seam) · `POST /iap/validate` (idempotent grants keyed on
  `iap_receipts.receiptId` — **a replayed receipt never double-grants**; **restore rides the same
  endpoint** per 0073 §0.3, consumables never re-granted; `STARTER_PACK_CONSUMED` 409, ECON-10) ·
  `POST /iap/webhook` (Authorization-secret verified, **fail-closed when the secret is unset**; refund →
  `refund_reversal` ledger row, idempotent per receipt) · `GET /store` (packs live; premiumCosmetics/drops
  honest-empty until P4/P10). **10 integration tests** (replay no-double-grant · restore re-syncs nothing
  consumable · refund reverses exactly the granted amount · bad-signature 401 · second starter refused ·
  same-receipt-twice-in-parallel → one grant). · **ECON-09 build-review refinement (the divergence the
  owner ratified at G-I):** reversals debit **exactly `pixelsGranted`, unfloored** — clamping at −25 would
  *leak* refunded PX, so the floor is a **monitoring anchor** (`belowFloor` event), never a clamp.
  api-contract **0.59**. (ECON-06/09/10, SYS-05)
- **P3 — publish · adopt · gallery · unpublish · trending** (`16a5e5b`, Opus, test-first, **Fable review,
  heaviest**; owner checkpoint = cross-user walk + **G-D re-fire**) — the guard first (0073 §0.1), then:
  `POST /cards/:id/publish` (**CARD-19 gates live** — `MIN_COMPLEXITY` / global-exact `DUPLICATE_COMPOSITION`
  409s; **CARD-13 `PREMIUM_UNRECONCILED` 409 `{unowned,total}`** — client reconciles via P4; **flatten runs
  OUTSIDE the tx**; `cards:publish` 3/10min+10/day; published cards are immutable — edits fork via CoW
  `derivedFromCardId`, 0067) · `POST /cards/:id/adopt` (**decision 0072 shape** — one atomic transaction
  acquiring the caller's missing premium components via P4 + `acquire` ledger rows + the free
  `card_adoptions` grant + the count; **free if no premium / all owned**; `INSUFFICIENT_BALANCE{shortBy}` ·
  `ALREADY_ADOPTED` · `NOT_PUBLISHED`; **blocked-designer refusals are `NOT_PUBLISHED`-indistinguishable**,
  MOD-09; `cards:adopt` 30/min+200/day) · `POST /cards/:id/unpublish` (CARD-20 adopters-keep; adopted-published
  DELETE → **`HAS_ADOPTERS` 409**) · gallery + `GET /discover/trending-cards` carry per-caller **`priceForYou`**
  · `GET /users/:id/contributions` **built** (CAT-07 stats go real the moment adoptions exist) · the **OQ-141**
  idempotent copy-POST guard rides `POST /cards`. **migration 0011** (the `premium_component_ids` snapshot,
  set at publish after the CARD-13 reconcile proves ownership — the composition-free source for personalized
  pricing) · rule-02 corpus hardening. **25 new integration tests, 211/211.** api-contract **0.60** · product-spec
  **0.56** (`adoption_count` is **derived** via `SYS-01-COMMUNITY-AGGREGATE`, not a stored column — a
  denormalized counter would need the cross-owner write the scope-lint rightly refuses). (CARD-13/19/20,
  ECON-03/04, CAT-07, SOC-09, SYS-01)
- **P4 — acquire + entitlements** (`f3c90a5`, Sonnet, Fable review) — **migration 0010** `user_entitlements`
  (source enum `purchase·earned·operator_grant`, unique pair) · the **7-tier pricing config** · the
  **`acquireComponents` exec-primitive** (atomic batch, **lock-then-recheck** per F36) · `POST /cosmetics/:id/acquire`
  · `POST /cosmetics/acquire-batch` (CARD-13 ACQUIRE ALL, all-or-nothing) · `GET /me/entitlements` live ·
  **tier-aware CARD-06 `isPremium` derivation** (flips with the 0075 roster tags) · the ECON-11 entitlement
  grant/clawback path. **13 integration tests** (acquire idempotent · batch atomicity — one unaffordable
  item → nothing debits · already-owned no-op rows · derivation flips with tags). (COSM-03, ECON-03/04/11,
  CARD-06)
- **P11 — the Newcomer Ladder** (`49418a6`, Opus; **added at the gate-1 sitting, decision 0074**) — start
  grant **5 → 10 PX** · the ladder on the existing daily-claim seam: claims 1–7 (lifetime, non-consecutive,
  never lapses) grant **+2/+2/+3/+3/+4/+5/+6** + a `source:'earned'` cosmetic slot per step (config-seeded;
  **empty until the roster pass**, the grant no-ops gracefully) · claim 8+ = the standing +1 (lapses) ·
  `GET /me/wallet.dailyBonus` gains `ladderStep?` + `ladderReward?` · `POST /me/daily-bonus` gains `pixels`
  + `cosmeticId?`. **Fix-notes:** a **two-probe race defeat under the wallet lock** + a **reason-agnostic
  index backstop** (the ladder-step race). **14 new integration tests, 235/235 + 136 mobile; live-smoked a
  fresh user.** api-contract **0.61**. (ECON-02, COSM-03, SYS-01)
- **P10 — seeds + roster tiering** (`d007df4` + `dc5eabf`/`3a0e79f`, Sonnet `effort:low`; **decision 0075**)
  — the 26 premium items registered server (`config/cosmetics.ts`) + client @ **3/6/8 PX** (tiers 1 accent +
  10 ULTIMATE launch empty) · **BRACKETS frame + SUBTLE GLOSS finish removed** (checked no dev-seed card/preset
  referenced them) · **`GET /cosmetics` registered** (54 items, owned flags — the store INDEX + editor aisle
  source) · the 6 filled newcomer slots wired into P11 (D1 LINEN · D2 STENCIL · D3 CHROME · D4 BRASS · D5 MINT
  · D6 HALFTONE; D7 reserved empty) · `surpriseDeal` free-baseline fix · the idempotent `db:seed-dev` shelf
  grows (second demo user + published rival card + wallet states + consumed starter). product-spec **0.58**.
- **F-2 / F-2b — the COL-06 adopted-card thread + device premium gate + un-adopt** (`a2846e4` + `37e7cb1`,
  the P7/P8 parvati 🚩 fix-round) — `GET /me/collection/:entryId/cards` **unions the caller's adopted cards**
  (discriminated union on `origin`; `'adopted'` = FLATTENED-ONLY, never `composition`) · equip accepts an
  adopted design · adopted rows survive the designer unpublishing (read scoped through the grant) ·
  **`POST /me/blocks` + `DELETE /me/blocks/:userId` built** (SOC-09 §0.6 — the M2-deferred endpoints) ·
  **`PATCH /me/device` premium gate** (409 `PREMIUM_UNRECONCILED` pre-write) · **un-adopt via `revoked_at`
  soft-revoke** (**migration 0012**) — only the caller's copy goes; **all-time adoption count + designer clout
  untouched**; `CARD_EQUIPPED` guard; **re-adopt reactivates** (no re-charge, entitlements persist).
  api-contract **0.62 / 0.63**. **261 integration + 182 mobile.** (COL-06, CARD-14/15/20, ECON-04, SOC-09, DEV-01/02)

## The load-bearing decisions (the owner's eyes)
1. **The two-floor split (P1 build review, ratified at G-I).** There are **two** floors and they are not
   the same number: the **spend floor is 0** (a user can never spend into debt — ECON-01), while the
   **−25 refund floor** governs only the ECON-09 reversal path. Operator `adjustPixels` is **unfloored**
   (ECON-11). This is the single most confusable seam in the economy; it is now explicit in api-contract 0.58.
2. **Refund lands fully — the floor is a tripwire, not a clamp (decision 0074 §3+4).** A webhook refund
   reverses **exactly `pixelsGranted`**, even past −25 into a self-bricking negative hole; `belowFloor` is a
   telemetry event, never a clamp (clamping would leak refunded PX). **No automated clawback** (provenance
   punishes honest refunders); containment = Apple's refund gate → the self-punishing hole → **ECON-11
   operator clawback** (audited, human) for egregious cases. The owner walked the 140-PX abuse scenario and
   accepted this. Watch-lever: buy provenance complexity only if beta telemetry shows real abuse.
3. **`adoption_count` is derived, never stored (product-spec 0.56).** It is a `SYS-01-COMMUNITY-AGGREGATE`
   count over `card_adoptions`, not a denormalized column — a counter would need a cross-owner write the
   scope-lint refuses. CARD-20's "count freezes on unpublish" falls out for free (rows persist, no new
   adoptions), and the un-adopt `revoked_at` is deliberately **all-time** (a revoked row still counts — the
   designer's clout keeps every earn, F-2b).
4. **`premium_component_ids` is the personalized-pricing engine (product-spec 0.56, migration 0011).** Set
   at publish *after* the CARD-13 reconcile proves the publisher owns everything, it is the **composition-free**
   source every gallery/trending read prices against per-caller (`priceForYou` = the caller's missing-components
   sum). No cross-user composition read ever happens — the whole point of OQ-122.
5. **The adopted-read scoping story (F-2, api-contract 0.62).** An adopted card is **not** a `card_designs`
   row the adopter owns — it is a **grant** (`card_adoptions`). The switcher/rider/equip/share reads UNION the
   caller's own designs with their adoption grants, serialize adopted cards **FLATTENED-ONLY** (`origin:'adopted'`,
   never `composition`), and stay valid **through the designer unpublishing** (the read is scoped through the
   grant, not the card's publish status — CARD-20 adopters-keep, made literal).
6. **`revokedAt` un-adopt (F-2b, migration 0012).** `DELETE /cards/:id` by an *adopter* soft-revokes the grant
   rather than deleting anything: the caller's copy leaves their surfaces, the design/gallery/**all-time count**
   are untouched, `CARD_EQUIPPED` guards a worn card, and re-adopting **reactivates** the same row (no duplicate,
   `totalPaid` normally 0 since entitlements persist; a clawed-back component re-charges).

## Verification trail (builder ≠ verifier — Fable reviewed every server packet)
- **Test counts per packet:** §1 spike **6** · P1 **13** (incl. the F36 double-spend) · P2 **10** · P3
  **+25 → 211/211** · P9 share-image **+10 → 221/221** · P11 **+14 → 235/235** (+136 mobile) · P10 **244**
  (+150 mobile) · F-2 **253** (+182 mobile) · F-2b **261 integration + 182 mobile** — the suite at `m5`
  head. Every test ID-tagged (`describe('ECON-03: …')`); **SYS-07 authz per mutating endpoint · F06 per
  cross-principal read · F36 concurrency per ledger/adopt/acquire/receipt path**.
- **G-I — PASSED (gate-1 sitting, decision 0074, 2026-07-13).** The owner watched **23/23 on real
  Postgres**: the F36 double-spend (5 parallel debits → 1 success, reconcile holds) · exactly-once starting
  grant · parallel daily claims · parallel receipt replay · `sum(ledger.delta) == balance` across mixed ops
  · the full-reversal refund landing at −30 past the −25 floor, replay-safe. The economy change-class
  owner-approval for P1/P2/P4 is banked.
- **Refund demo — SHOWN** (P2 owner checkpoint): mock webhook refund → `refund_reversal` row → negative
  wallet → recovery by earn; the ECON-09 divergence (contract 0.59) was ratified as the ruled behavior at G-I.
- **§1-GO — RATIFIED** (decision 0074 §5): publish-flatten in-process (node-skia in the API, ~30ms warm) on
  local disk behind the `StorageProvider` seam; R2+CDN swap owed pre-M6-beta.
- **G-N deletion-ripple dry-run — PASSED** ([`gn-dryrun-findings.md`](gn-dryrun-findings.md), `98d4af0`): AUTH-07
  walked on a throwaway Testcontainers Postgres (migrations 0000→0012) against the new M5 tables. **4 passed**
  — INVENTORY (no deletion path sets `deletedAt` today; AUTH-07 is M8) · P-SOFT (a soft tombstone leaves the
  gallery at 200 + leaks the deletee's real username — `authorShapeFor` is unwired dead code) · P-HARD-1
  (`DELETE FROM users` REJECTED by `games_created_by_users_id_fk`, pg 23503 — anonymize-not-delete is mandated
  by the schema) · P-HARD-2 (a naive card-delete CASCADES B's adoption 1→0 + NULLs the equip + orphans the
  share-image). **Nothing is reachable today** (no deletion endpoint exists); the 2 M8-blockers were caught
  early and filed to **OQ-145** as the M8 implementation checklist. The scratch test was deleted after the run.
- **Live smokes:** migrations **0008→0012** applied to the dev DB; P11 live-smoked on a fresh user; the P8
  publish→adopt thread walked live cross-user at the P7/P8 parvati (demo adopted the Rival Cut, `acquire −3 ·
  bitter` ledger row, balance 106 derives exactly from the ledger — **no M4-style off-by-one this milestone**).

## ⛔ What's still owed (the honest remainder)
1. **The owner-watched G-D re-fire sitting.** The guard is built and the standing authz tests go RED when the
   `publishedOnly` predicate is stripped (the demo test exists; 0073 §0.1 cites it), but the **owner-watched
   2-minute re-fire** (strip predicate → RED, confirm test-count == mutating-endpoint count) has **not been
   sat** — it was folded into the P3 owner checkpoint, which the owner has not yet walked. DoD §8 line still open.
2. **P2b + G-J + the manual sandbox pass — carried on provisioning (§6).** `react-native-purchases` is **not
   installed**, the `RevenueCatProvider` swap is unbuilt, and the RevenueCat webhook is **not wired**
   (`REVENUECAT_WEBHOOK_AUTH` doesn't exist yet — provisioning-log #6/#7). **G-J (real-path IAP)** and the
   first manual StoreKit sandbox pass ride P2b, which rides **Google Play identity verification** (still
   percolating) — iOS-only G-J is acceptable, Play-side re-runs ride provisioning-log #3–#5. This is the one
   gate the plan explicitly allows to carry (§5 G-J rule); recorded, not silently dropped.
3. **The §4 independent Opus cross-audit — no record it ever ran (FLAG).** The plan (§4) calls for an
   independent Opus audit of the economy core (P1+P2+P3) with fresh context, adversarial on transaction
   boundaries / idempotency keys / authz, before the money endpoints are declared done. **The review-notes
   record no such audit** — only Fable's per-packet murr reviews + the G-I owner sitting. Per the records it
   **did not run**; DoD §8 line stays open. (See this receipt's return note.)
4. **The M8 AUTH-07 items (OQ-145).** The G-N findings — wire `authorShapeFor` into the four designer-attribution
   read paths + flip published cards to a non-`published` status on deletion (never DELETE the row) + the
   ledger/receipts PII kept-set owner ruling + orphaned share-image/block sweeps — are the M8 deletion-ripple
   implementation checklist, filed at OQ-145, gated by G-N (real gate = M8).

---

## Addendum — the §4 independent audit + F-3 (2026-07-13, after this receipt's first draft)
The blind adversarial audit of the economy core RAN (it was the one open §4 box): **every probed
attack surface CLEAN** (FOR-UPDATE discipline · cross-service tx atomicity · receipt/daily/ladder
idempotency under real races · un-adopt farming · UTC ladder farming · floor asymmetry · device gate
· webhook boundary) · **zero config drift** vs 0072/0074/0075 · test-suite verdict: "real invariant
testing, not happy-path theater". **One HIGH finding** — no production floor on `IAP_PROVIDER=mock`
(a P2b mis-deploy would be a silent forgeable free-Pixel faucet) — **fixed in F-3** with a
fail-closed startup guard (production + mock/unset = refuse to boot; behavior-matrix unit tests),
plus the hardening tail: the cross-user receipt-hijack test (the load-bearing UNIQUE-receiptId
invariant now has its net) · positive-amount asserts on credit/debit (poisoned-executor proven) ·
the publish TOCTOU guard (409 `COMPOSITION_CHANGED`, F-17 additive) · 4 stale-comment fixes.
**Audit verdict after F-3: GO.** Final counts: **263 integration · 173 unit · 182 mobile · contract
0.64 · /health 🟢.**
