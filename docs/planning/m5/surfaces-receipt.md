# surfaces — build receipt (M5 §P5–P8 + F-1/F-2/F-2b · the client economy surfaces)

> **Status: BUILT (P5 lifecycle kit · P6 Store+Wallet FIRST ARTICLE · P7 premium-in-editors · P8
> community gallery+adopt · P9 client share half) · each surface manifest-first (`store-manifest.md`
> · `gallery-manifest.md`) → murr diff review → **parvati** against the manifest + running app ·
> component-map names only (0069 buttons · 0070 themed tokens from birth) · P6 first-article parvati
> clean (1 🚩 traced to a hand-mutated dev ledger, CLOSED server-side) · owner Store walk round 1
> done → **F-1 fix-round built** · P7/P8 parvati done (1 🚩 → **F-2/F-2b built**, re-verified) → ⛔
> STILL OWED: the owner's device walk (the taste gates web can't judge — enumerated below).** Nothing
> committed by this receipt; the packet commits are on `m5` (`8cfbac7`→`37e7cb1`).

## TL;DR
The four client surfaces that spend the P1–P4 economy, built to their manifests. **P6 Store is the
first article** — it went to the owner alone (walk + taste) before P7/P8 mass-produced against its
patterns. The whole premium storefront is drawn but **roster-empty by construction at P6-review time**
(0072/0073 §0.2 — `premiumCosmetics`/`drops` are `[]`, the registry empty); by the P7/P8 walk the
**P10 roster re-tag (0075) HAD landed**, so premium states became reachable-live. Everything inherits
the **0070 themed tokens** and obeys **0069** (gold = economy/value; cream `ScreenButton/secondary`
dollar keycaps; orange `/primary` ADOPT). The device is the acceptance surface for feel; web is the
build-verification lane.

## What changed (packet · files · IDs · fix-notes)

- **P5 — the shared lifecycle kit** (`8cfbac7`, Opus) — the component-map §5.6 "build-first" family, the
  blocker on every M5 screen's state matrix: `Skeleton` · `LoadError` · `EmptyState` · `Unavailable` ·
  `Offline` · `Toast` (`apps/mobile/src/components/lifecycle/`). **Themed-token-native (0070), F-06 scale,
  RTK-Query-shaped props** (`isLoading/isError/refetch`), reduce-motion + announce. **25 jest.** Retrofit
  nothing at M5 — existing screens migrate opportunistically later (recorded). (SYS-10)
- **P6 — Store + Wallet** (`7299ecf`, Opus, **FIRST ARTICLE**; manifest [`store-manifest.md`](store-manifest.md)
  from `store/store-states.html`) — the **commerce kit** (component-map §7, all previously unbuilt):
  `PixelsMark`/`CurrencyCounter` (the persistent header counter, ECON-07's entry point) · `PriceChip`/`BuyBar`
  (**hold-to-buy `motion.holdToBuy` + the OQ-046 non-hold accessible alt** — press-then-confirm `ConfirmSheet`
  under reduce-motion; both paths the launch gate, fake-timer unit-tested) · `PackTile`/`ItemTile` · `LedgerRow`
  (incl. `admin_adjustment` + negative-balance render) · `OwnedTag`/`LockedTag`/`EarnedOnlyTag` · `DailyBonusBar`
  · `AisleIndex` · `PreviewStrip`/`PreviewStage` · plus `LandedMoment` · `ItemSheet` · `packMeta.ts` · `storeCopy.ts`
  · `store/mockReceipt.ts` (the `__DEV__` receipt encoder mirroring `MockRevenueCat` — the P2b seam). ·
  `app/store.tsx` per the converged board P1–P12 (browse+daily-claim · item sheets · live previews · can't-afford
  bridge · IAP via P2-mock · landed moment · **P8 Wallet** · ownership · lifecycle via P5 · writes-gated offline)
  · **8 RTK endpoints** · the STORE nav keycap goes live (gold, permanent). **25 jest kit tests, 132 suite green;
  BOOT walk verified** (claim tick · 5 packs · mock buy +30 · wallet ledger). (ECON-01/02/07/09, COSM-01/03)
- **P7 — premium-in-editors: CARD-13 reconcile** (`078df68`, Opus; additive slips into the three signed M4
  surfaces) — the `EXPECTED(M5)` rows come due: **Styler** — PX `CurrencyCounter`, PriceChips/PREVIEW flags,
  the **cost-stack**, `ReconcileSheet` (funded/short fragments), the KeepBeat PX-spent line · **Canvas** — the
  **CARD-19 press checklist** UI → ◆ PUBLISH → the full-tier **`PrintRitual`** wired to P3 · **Device** — the
  premium row (`KeepBar` cart → `acquire-batch`, cost-flag, PIXELS CountTag). · **Fix-note (task-0):** a
  **derivation fix** — closed-attribute kinds now feed CARD-06 / `collectCosmeticRefs`, and the seed was
  hardened for derivation (premium was reading as free without it). All inherit 0070 tokens; **murr's diff lane
  guarded the signed M4 behavior against regressions.** (CARD-13/19, ECON-03/04, DEV-01)
- **P8 — community gallery + adopt** (`c7c670d`, Opus; manifest [`gallery-manifest.md`](gallery-manifest.md)
  from the game-page CARDS-gallery artboard) — the Game page **CARDS community gallery**: `CommunityGallery`
  (3-up **flattened `FlatCardImage` thumbs**, OQ-138 stance — RN `<Image>`, never skia) + `AdoptCount` +
  DESIGNED-BY + **personalized `PriceChip`/FREE** (the caller's missing-components sum, 0072) · **`AdoptCardSheet`**
  (the 0072 component-list confirm; the **TOP-UP bridge** on `INSUFFICIENT_BALANCE {shortBy}`; adopt online-only,
  OQ-101) · adopted card lands in the switcher · CARD-21 SHARE via `/cards/:id/share-image` · block-the-designer ·
  `SectionEmpty` contributor-hook · a **new `communityApi.ts`** (`injectEndpoints`, zero edits to the concurrently-owned
  `api.ts`) + `mediaUrl.ts` + `shareCard.ts`. (CARD-05/13/15/21, ECON-03/04, SOC-09)
- **P9 — CARD-21 share-image** (`5321040`, Sonnet, server+client) — `GET /cards/:id/share-image` server-composited
  (flatten + "MADE IN INGAME" mark + artist credit), **storage-cached ROUTE-ONLY** (a `PUBLIC_MEDIA_PREFIXES`
  allowlist scopes `/media` to published full/thumb — private renders are never statically served), adopter-keeps-access
  after unpublish, cache invalidation on unpublish/delete. **10 integration tests, 221/221.** Client: web = authenticated
  blob → object-URL → new tab; native = RN `Share` best-effort (robust branded-image share = EXPECTED, needs a justified dep).
- **F-1 — owner Store walk round 1** (`18ad90b` + `3a0e79f`, 2026-07-13) — **nine notes triaged, 7 → fix-round F-1**:
  Top-Up entries gold (F-02) · taller aisle rows · wallet-hero↔BUY spacing · quiet pack borders (Starter + BEST RATE
  only) · **purchase-toned `ConfirmSheet`** on mock BUY (absorbs the 🎨 destructive-red confirm — kills the red confirm)
  + the OQ-046 a11y path · **`LandedMoment` pause→pixel-burst celebration** (reduce-motion-safe) · `CurrencyCounter` on
  Collection/Profile headers + X-GAMES chip-height harmonized (ECON-07's "entry point elsewhere"). **2 answered** (no
  hold-to-buy visible = premium aisles empty until the roster re-tag, by design · Restore = Apple re-sync, App-Store-required,
  0017). **144 mobile tests.**
- **F-2 / F-2b — the P7/P8 parvati 🚩 fix-round** (`a2846e4` + `37e7cb1`) — the client half of the adopted-card thread:
  **adopted cards land in the switcher** (`CardSwitcher` adopted rows — `FlatCardImage`, no edit/delete; origin union) ·
  equip accepts adopted designs + the collection rider renders them · `PrintRitual` **real share** · premium-only aisle
  counts · an **honest demo device** (GRAPE + owned DEEP SEA) · the block action reaches a live route · **F-2b**: the
  Device **KeepBar** flow regression-proven against the server premium gate + the CardSwitcher **REMOVE** (un-adopt).
  **253 → 261 integration + 182 mobile.** (COL-06, CARD-14/15/20, SOC-09, DEV-01/02)

## The load-bearing decisions (the owner's eyes)
1. **The store is roster-empty by construction at P6 — EXPECTED, not broken.** At the first-article review the
   server was authored to honest-empties (`premiumCosmetics`/`drops` = `[]`, `GET /cosmetics` unregistered, the
   registry empty → 404 on every real id). The **components are built + unit-tested**; live reachability was
   EXPECTED(P4/P10). By the P7/P8 walk the **0075 roster HAD landed** — premium is live entitlements now
   (chrome/deepsea/bitter owned by demo; 26 items tiered), so P7's premium states are reachable-live.
2. **Both BUY paths are the launch gate (OQ-046).** `BuyBar` ships hold-to-buy AND the non-hold accessible
   alternative (press → `ConfirmSheet`), triggered on OS reduce-motion (ASSUMPTION recorded — the owner may prefer a
   dedicated "confirm purchases with a tap" toggle when Settings lands). **The hold-to-buy *feel* is owed on device.**
3. **The DEV-MOCK IAP seam is the P2b seam.** The client mints a `__DEV__` mock receipt mirroring
   `MockRevenueCat.encodeMockReceipt` and POSTs to `/iap/validate`; the server validates + grants exactly as it will
   for a real receipt. The real StoreKit path is a flagged `TODO(P2b)` at the one call-site.
4. **Adopt is a grant, not a card the adopter owns (F-2).** The switcher unions owned designs with adoption grants;
   adopted rows are FLATTENED-ONLY and carry no edit/delete (you hold the image, not the layers — CARD-15). The
   original P8 build asserted "it's in your switcher" but the read didn't union adoptions — the **P8 parvati 🚩 flag**
   that F-2 fixed.

## Verification trail (manifest → murr → parvati; full verdicts in [`m5-review-notes.md`](../m5-review-notes.md))
- **P6 first-article — parvati (2026-07-12): 1 🚩 · 14 ✅ expected · 1 🎨 · many ✔.** The whole OWED-live spine
  rendered + functioned to the board (STORE keycap gold-active · CurrencyCounter ticked 67→77 on the mock BUY ·
  claimed DailyBonusBar · Top-Up 5-pack ladder with arithmetically-correct value-math · mock BUY → LandedMoment ·
  Wallet hero + LedgerRow history · flow-nav). The 1 🚩 (**wallet balance ↔ ledger off by 1 PX**) was traced to a
  **hand-deleted `daily_claim` ledger row on the shared dev DB** (not a code defect — the ECON-07 invariant holds in
  code, 211 integration tests incl. reconcile); the demo balance was re-derived (76==76), a qa-runbook rule filed
  (**never hand-delete ledger rows — the ledger is append-only**). **🚩 CLOSED.** The 🎨 (aisle H1↔eyebrow double-print)
  rode to F-1/P10.
- **P7/P8 — parvati (2026-07-13): 1 🚩 · 6 ✅ expected · 3 🎨 · many ✔.** Reviewed from a real-Chrome `:8082` walk
  driven off the a11y tree + `get_page_text` + live DB/ledger reads (CDP screenshots froze on animated surfaces — the
  known freeze). The 1 🚩 (**adopted card never lands in the switcher, COL-06** — `listMyCards` filtered strictly on
  `ownerId`, never unioned `card_adoptions`; the "it's in your switcher" copy was false, the DoD browse→adopt→**equip**
  walk couldn't complete) → **F-2/F-2b BUILT** (the origin-union read + equip-accepts-adopted + CardSwitcher adopted rows
  + REMOVE); **re-verified** (demo adopted the Rival Cut, `acquire −3 · bitter`, wallet 106 == ledger 106, **no
  off-by-one**). ✔ matches: CommunityGallery cell (personalized FREE because demo owns `bitter`) · the ADOPT FREE-path
  ConfirmSheet (no debit line) · `ALREADY_ADOPTED` owned state · Styler premium states (CurrencyCounter 106 · PriceChips ·
  OwnedTag on CHROME) · the Canvas publish thread (PRESS checklist → PrintRitual → card `db648bb0` published, contributor
  stat ticked to 18) · Device KeepBar cart (BERRY 6 PX → CANCEL reverted clean).
- **The 3 🎨 (owner's eye, iteration lane):** PrintRitual success SHARE reads "arrives with card sharing" while
  CARD-21 share is **live** (wire it or drop the copy) · the Store INDEX aisle count over-promises vs the empty aisle
  ("FRAMES · 14 items" → "being stocked…"; the count reads the full catalog while buyable ItemTiles aren't wired —
  P10/store lane) · the device wears premium shell SUNSET without an owning entitlement (a pre-economy shell-pref
  carry-over; owner's call whether worn premium shells must be entitlement-gated at M5).

## ⛔ The owner-walk checklist (only the device can judge these)
The web lane proved structure/data; these are the **feel** gates reserved for the owner's device walk:
1. **Hold-to-buy feel** — the `motion.holdToBuy` gesture + its rated-hold cadence (web showed the "HOLD TO BUY · N PX"
   bar but never exercised the gesture; premium aisles were empty at P6, reachable-live only after the roster re-tag).
2. **`PrintRitual` motion** — the full-tier publish ritual (the press runs · slips fly in · print lifts off); CDP capture
   froze on it, so the animation is unjudged.
3. **Reduce-motion** — a manual reduce-motion pass once an acquirable item exists: the OQ-046 non-hold `ConfirmSheet`
   BUY path + the a11y confirm tone (the previously-filed destructive-red 🎨, re-check as the F-1 purchase-toned variant).
4. **Native share** — the robust native branded-image share (temp-file write + `expo-sharing`) is EXPECTED — needs a
   justified dep; web ships complete (authenticated blob → new tab), native is RN `Share` best-effort today.
5. **Styler `ReconcileSheet` funded path** — the in-Styler premium-frame selection → cost-stack → KEEP → confirm-acquire
   + KeepBeat PX line was **not walkable in the web lane** (the Styler skia frame-rail didn't register synthetic clicks —
   not a product bug, a web-lane quirk; the sibling acquire-batch funded cart works via the Device KeepBar). Confirm
   premium frame selection + ReconcileSheet end-to-end on device.

*(Workflow lesson, doctor-nick: the foreground P/Invoke no longer holds on this box — the MCP Chrome window lived
whole-hidden and CDP `captureScreenshot` timed out on animated RN-web/skia surfaces; the whole P7/P8 walk ran off the
a11y tree + `get_page_text` + live DB reads. The device walk is the visual gate for these five items.)*
