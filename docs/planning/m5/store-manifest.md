# store — screen manifest (from store-states.html, 2026-07-12)

> **Surface:** M5 §P6 Store + Wallet — the milestone's **FIRST-ARTICLE client surface** (the owner walks
> it alone before the other M5 surfaces mass-produce). The Store nav-slot (gold keycap) is the app's
> permanent commerce door; Wallet + Top Up are its flow sub-views.
> **Board:** `docs/design/mockups/store/store-states.html` (P1 browse+daily · P1b drop drawer ·
> P2/P2b item sheet + hold-to-buy · P3 whole-page theme preview · P4 device-shell preview · P5
> can't-afford bridge · P6 Top Up · P7 landed moment/Toast/restore · P8 Wallet + negative · P9
> ownership/trophy · P10 skeleton · P11 load-error · P12 offline; converged 2026-06-12, B-frame ×
> C-mechanics, **PIXELS** currency; 1604 lines). **Authority stack:** design-spec **§2.3** + §1.6
> (lifecycle) + §1.1 (Teal/Midnight tokens) · product-spec **ECON-01..11 · COSM-01..04** ·
> api-contract §Cosmetics&store&economy (0.57 — `/store` · `/me/wallet[/ledger]` · `/me/daily-bonus`
> · `/iap/validate` · `/cosmetics/:id/acquire` · `/cosmetics/acquire-batch` · `/me/entitlements`) ·
> component-map **§7** (the commerce set — locked code names) · decisions **0072** (the economy model
> + the 5-SKU pack line + the 7-tier ladder) · **0073** (§0 entry rulings — restore rides
> `/iap/validate`, the 409 refusal family, the pinned `currency_ledger.reason` enum, roster re-tag
> deferred) · **0069** (button convention — cream secondary; gold = economy/add) · **0070** (light-theme
> legibility) · **0068** (all-basic-until-re-tag posture, inherited).
> **Author/Builder:** P6 builder (this packet — client only, apps/mobile). **Reviewer:** parvati +
> the owner's first-article walk. Server P1/P2/P4 committed by a concurrent agent; this packet
> **consumes** those endpoints and never touches apps/api.
>
> **⚠ THE 0072/0073 §0.2 ROSTER REALITY GOVERNS THIS BOARD — MORE THAN ANY OTHER.** The board draws a
> **rich premium storefront** (a seasonal EMBER drop · six priced ItemTiles in NEW THIS WEEK · nine
> populated aisles · priced item sheets · the can't-afford bridge). **Almost none of that content
> exists yet.** The server is authored to honest-empties by construction:
> - `GET /store` → `{ packs, premiumCosmetics: [], drops: [] }` — **premiumCosmetics + drops are
>   ALWAYS `[]`** at M5 (iap-service.ts hard-codes them; "content authored at P4/P10"). So the drop
>   cover, the NEW-THIS-WEEK grid, and the aisle *item content* are **EXPECTED(P4/P10 roster +
>   ECON-08 drops)** — the surfaces render empty-graceful, no cosmetic art invented.
> - **`GET /cosmetics` (the library listing) is NOT REGISTERED** (cosmetic-routes.ts: "a P10/store-front
>   concern"). The only cosmetics reads that exist are `GET /me/entitlements` (what you own — empty for
>   a fresh account) + the two acquire writes. So aisle *browse* pages have **no list source** at M5 →
>   the AisleIndex renders the static COSM-01 taxonomy with **no live counts**, and an aisle tap lands
>   on an honest-empty category page (EXPECTED(P4/P10)).
> - The cosmetic **registry is intentionally empty in real data** (config/cosmetics.ts) — every real
>   cosmeticId is UNKNOWN (404) until the P10 re-tag. So **no premium item is acquirable** in the running
>   app → the **item sheet · PreviewStage · the P5 bridge · `INSUFFICIENT_BALANCE` are unreachable-live**
>   (their COMPONENTS are still OWED + unit-tested now; the LIVE walk is EXPECTED(P4)).
> - `store_products` is **not seeded by `db:seed-dev`** (verified) — a fresh dev DB serves `packs: []`.
>   The 0072 5-SKU ladder is the expected content once seeded (server P2/P10 seed). **The client
>   renders whatever `/store` serves** — 5 packs when seeded, honest-empty otherwise. (BOOT check seeds
>   the ladder into the dev DB as data so the Top-Up + mock-BUY flow can be walked — see the boot
>   section; it is decision-0072 data, not a code change, and idempotent.)
>
> **What IS live at M5 (OWED, wired to real endpoints):** the header **CurrencyCounter** (`/me/wallet`
> balance) · the **DailyBonusBar** claim (`/me/wallet` → `POST /me/daily-bonus`, counterTick) · **Top
> Up** (`/store` packs → `POST /iap/validate` with the DEV-MOCK receipt → the **landed moment** P7) ·
> **Restore** (same `/iap/validate` rcUserId path) · the **Wallet** (`/me/wallet` hero + `/me/wallet/
> ledger` paginated history + the ECON-09 negative variant) · **ownership** states via `/me/entitlements`.
>
> **⚠ THE OQ-046 BUY GATE (a launch gate — build BOTH paths).** `BuyBar` ships hold-to-buy
> (design-spec `motion.holdToBuy` — the gold keycap sits pressed while a darker fill sweeps a ~rated
> hold; release early = cancel, nothing spent) **AND the non-hold accessible alternative** (a single
> press → `ConfirmSheet`, so a motor-impaired user is never gated behind a timed gesture). The a11y
> path is triggered by the OS **reduce-motion** setting (`useReducedMotion` — the app's one accessible
> signal today) — **ASSUMPTION(a11y-trigger = reduce-motion)**; the owner may prefer a dedicated
> "confirm purchases with a tap" setting when Settings lands. Both paths funnel to the same
> `acquireCosmetic` spend.
>
> **⚠ THE DEV-MOCK IAP SEAM (the obvious P2b seam).** A real StoreKit/RevenueCat purchase (P2b) will
> hand the client a signed receipt from the native sheet. Until then, the client mints a **mock receipt**
> mirroring `MockRevenueCat.encodeMockReceipt` (`mockrcpt.v1.` + base64url(JSON `{receiptId, productId,
> platform}`)) behind a `__DEV__`-only helper (`src/store/mockReceipt.ts`), POSTs it to `/iap/validate`,
> and the server validates + grants exactly as it will for a real receipt. The real path is a clearly
> flagged TODO(P2b) at the one call-site — **EXPECTED(P2b · real StoreKit purchase)**.
>
> **Copy law (OQ-110):** no spec-ID strings in rendered copy. **F-06:** on-screen type is 21/15/11/9
> only. **0069:** gold = economy/value (the PIXELS mark, PriceChip, the BUY keycap, the CurrencyCounter,
> pack amounts); **dollar keycaps are cream `ScreenButton/secondary`** (component-map §7); the STORE nav
> keycap is permanently gold. All themed-token-native (`useTheme`/`themedStyles`).
>
> **Status legend:** as the device/canvas manifests — **OWED** (build now) · **PRE** w/ cite (already
> exists) · **EXPECTED(cite)** (a later packet/roster/StoreKit owns the live content) · **ASSUMPTION**
> (a reasonable call recorded, owner may redirect) · **GAP** (a doc/data hole surfaced, not silently
> patched).

---

## Shared chrome (every Store view)

| # | Element | Component | Notes | Status |
|---|---------|-----------|-------|--------|
| C1 | The **Store nav-slot goes live** — ShellNav wires `/store` (gold keycap active on any `/store*` path; a keypress navigates there). PRE: the slot renders but is inert (`built:false`) | ShellNav | board nav-band (STORE active, gold); design-spec §2.3 "keycap permanently gold" | OWED — ShellNav `ROUTES.store` + `onStore` + `activeKey` |
| C2 | `ScreenHead`("STORE") + the header **CurrencyCounter** (gold PX count from `/me/wallet.balance`; the ECON-09 `negative` alert-red variant; the `counterTick` glow + `+N` chip after a grant/claim) | ScreenHead + CurrencyCounter | board `:529` etc; §2.3; motion.counterTick | OWED |
| C3 | The three **flow sub-views** (Top Up · Wallet · an aisle page) render in-screen with a **`‹ RETURN TO STORE`** link; the STORE nav keycap stays active throughout (they are destinations OF the Store, not tab routes — the device-editor `FlowTakeover` precedent) | store.tsx `view` state | board `:1131` return-link, flow-head; §2.3 | OWED — one route, a `view` switch (browse\|topup\|wallet\|aisle) |
| C4 | Lifecycle — **P10 Skeleton** (solid fills; chrome immediate) · **P11 LoadError** ("SIGNAL LOST" + RETRY; "a connection problem, not a wallet problem"; the cached counter stays) · **P12 Offline** (browse-from-cache, **writes gated** — BUY/CLAIM sleep "needs a connection") | lifecycle kit (Skeleton/LoadError/Offline) reuse | board `:1417–1598`; §1.6; SYS-10 | OWED — reuse `src/components/lifecycle` |

## P1 — Browse (board `:517–643`)

| # | Element | Component | Notes | Status |
|---|---------|-----------|-------|--------|
| 1 | **DailyBonusBar** — unclaimed: "DAILY BONUS READY — +1 PX" + gold **CLAIM +1** → `POST /me/daily-bonus`; claimed: the bar goes quiet ("✓ CLAIMED — BACK TOMORROW") + the counter ticks +1 (motion.counterTick). Reads `/me/wallet.dailyBonus.{available,amount,nextResetAt}` | DailyBonusBar | board `:531–537`, `:619–627`; §2.3 (OQ-043 in-store claim); ECON-02 | OWED — LIVE |
| 2 | The **drop cover** (ECON-08 seasonal — EMBER SERIES · countdown · OPEN THE DROP → the P1b drawer) | (cover) | board `:538–555` | **EXPECTED(P10 · ECON-08 drops — `/store.drops` is `[]`)** — render only when a drop exists |
| 3 | **NEW THIS WEEK** — dense 3-up **ItemTile** grid (each: cosmetic preview · name · type · **PriceChip**) | ItemTile | board `:556–593`; §2.3 | **EXPECTED(P4/P10 · `/store.premiumCosmetics` is `[]`)** — grid renders empty-graceful; ItemTile is OWED + unit-tested |
| 4 | **THE INDEX — all aisles** — the COSM-01 taxonomy rows (STICKER PACKS · EFFECTS · FINISHES · FRAMES · NAMEPLATES · FONTS · DEVICE SHELLS · SCREEN THEMES · **PIXELS → TOP UP**); tap an aisle → the aisle page, tap PIXELS → Top Up | AisleIndex | board `:594–605`; §2.3 | OWED — the taxonomy + the TOP-UP row are live doors; **the per-aisle counts are EXPECTED(P10 · no `GET /cosmetics`)** so counts render as `›` only |
| 5 | The COSM-02 free-baseline hint ("the free baseline isn't sold here — it lives in the editors") | (hint) | board `:606` | OWED — static copy |

## P1b — The drop drawer (board `:645–713`)

**EXPECTED(P10 · ECON-08).** The drawer grammar (a `PulledSheet` carrying the issue eyebrow + countdown +
story + the drop's ItemTiles) is OWED as a **component shape**, but `/store.drops` is `[]` so it is
**unreachable-live** until drops author. The OPEN-THE-DROP door only renders when a drop exists (P1·2).

## P2 · P2b — Item detail sheet + hold-to-buy (board `:715–898`)

| # | Element | Component | Notes | Status |
|---|---------|-----------|-------|--------|
| 1 | Tap an ItemTile → detail **rises as a `PulledSheet`** (browse dims, the tile keeps a gold edge): **PreviewStage** (the cosmetic live on YOUR own card/device/whole-page) + swap line · title row + **PriceChip/big** · **BuyBar** | ItemSheet (PulledSheet) + PreviewStage + PriceChip + BuyBar | board `:751–771`, `:922–941`; §2.3 | OWED **components** (unit-tested); **live content EXPECTED(P4 roster — no acquirable items exist)** |
| 2 | **BuyBar hold-to-buy** — the gold keycap held-pressed while a darker fill sweeps a ~rated hold; release early cancels (nothing spent); complete → `POST /cosmetics/:id/acquire`. Balance + the ECON-01 "spends pixels instantly" fact in the bar | BuyBar | board `:766–769` HOLD TO BUY; design-spec motion.holdToBuy; OQ-046 | **OWED — LAUNCH GATE** (fake-timer unit-tested) |
| 3 | **The OQ-046 non-hold accessible alt** — under reduce-motion the BUY keycap is a single **press → ConfirmSheet** (no timed gesture) → the same acquire | BuyBar (a11y path) + ConfirmSheet | design-spec "a11y non-hold alternative owed"; OQ-046 | **OWED — LAUNCH GATE**; ASSUMPTION(trigger = reduce-motion) |
| 4 | P2b — **multi-item pack contents** (the glyph grid) inside the same sheet | ItemSheet (pack variant) | board `:799–898` | EXPECTED(P4/P10 — pack rosters author later); the glyph-grid shape is a light OWED add |

## P3 — Whole-page theme preview (board `:882–961`)

**EXPECTED(P4 · screen-theme roster).** Opening a screen-theme item re-themes the whole page live under a
gold **PreviewStrip** ("◆ PREVIEWING — «name»" + EXIT ✕), the sheet reading "preview free — keep with
BUY". `PreviewStrip` + the whole-page re-theme are **OWED as components** (the theme engine from §3.5
already re-themes live; the strip is a thin gold bar); the **live trigger is EXPECTED(P4)** (no premium
theme is acquirable). Screen themes apply in the Device editor, not here (the sheet says so). DEV-04
legibility floor + F-04 shell-stays-plastic hold.

## P4 — Device-shell preview (board `:962–1042`)

**EXPECTED(P4 · shell roster).** Same sheet grammar with a before→after **MiniDevice** pair ("NOW · TEAL
➔ CARBON WRAP") — shells are outfits on the one pocket (OQ-042). `MiniDevice` already carries `shellId`
(§3.5). OWED as a sheet composition; **live trigger EXPECTED(P4)**.

## P5 — The can't-afford bridge (board `:1049–1115`)

| # | Element | Component | Notes | Status |
|---|---------|-----------|-------|--------|
| 1 | On `INSUFFICIENT_BALANCE {shortBy}`: BUY goes quiet, a **short-strip** names the exact gap ("SHORT 3 PIXELS — YOU HAVE 5"), and the sheet grows **TOP UP RIGHT HERE** — 2 **PackTile** minis (the cheapest packs that cover the gap) + ALL PACKS → Top Up; buying a pack inline re-arms BUY in place | ItemSheet (bridge state) + PackTile | board `:1084–1094`; §2.3; the `{shortBy}` from the 409 body | **OWED components**; **live trigger EXPECTED(P4 — no acquirable item can 409)** |

## P6 — Top Up (board `:1117–1186`)

| # | Element | Component | Notes | Status |
|---|---------|-----------|-------|--------|
| 1 | The pixels landing: a **`PackTile/starter`** row (once/account — `oneTime`, dims when `purchased`) + a **2×2 PackTile grid**; each tile does the **value math** (base rate · +20/29/39% more PX/$), $ on a cream **ScreenButton/secondary** keycap | PackTile (+ starter) + packMeta | board `:1133–1147`; §2.3; decision 0072 5-SKU ladder | OWED — **LIVE** (`/store.packs`); the **USD price + value-math** ride a client `packMeta` map keyed by productId (USD is not on the wire — it comes from StoreKit at P2b) → **ASSUMPTION(dev price map)** |
| 2 | **BUY a pack** — DEV-MOCK: mints a mock receipt (mirrors `encodeMockReceipt`) → `POST /iap/validate` → the P7 landed moment. The real StoreKit sheet is the P2b seam (flagged TODO) | (Top Up view) + mockReceipt | board native-sheet fragment `:1150–1162`; decision 0073 §0.3 | OWED — **LIVE (mock)**; **EXPECTED(P2b · real StoreKit)** |
| 3 | **↺ Restore Purchases** — the `rcUserId` path of `/iap/validate` (consumables never re-granted → a quiet "all caught up") | (Top Up view) + mockReceipt | board `:1149`, `:1235–1244`; decision 0073 §0.3 | OWED — **LIVE (mock)** |
| 4 | The free-earn hint ("PIXELS ARE EARNABLE FREE — +1 DAILY · MILESTONES. PACKS SKIP THE WAIT.") | (hint) | board `:1148`; ECON-02 | OWED |

## P7 — The landed moment / Toast / restore (board `:1187–1255`)

| # | Element | Component | Notes | Status |
|---|---------|-----------|-------|--------|
| 1 | Success = **LandedMoment** — a single clean beat: centered **+N** (display scale) + the "5 ➔ 35" arithmetic + one gold rule + the header counter glows & ticks; BACK TO «intent» + VIEW WALLET. No pack grid here (OQ-040 — big rituals stay with cards) | LandedMoment + CurrencyCounter tick | board `:1202–1212`; §2.3 | OWED — **LIVE** (drives off the `/iap/validate` `{granted,pixels,balance}`) |
| 2 | Failure = **Toast** (the §1.6 under-header banner; "nothing was charged — your pixels are safe" + orange RETRY) | Toast (lifecycle reuse) | board `:1225–1233`; §1.6 | OWED — reuse `lifecycle/Toast` |
| 3 | Restore = the quiet "✓ all caught up" line | (Top Up view) | board `:1235–1244` | OWED |

## P8 — Wallet + the negative variant (board `:1262–1326`)

| # | Element | Component | Notes | Status |
|---|---------|-----------|-------|--------|
| 1 | **Balance hero** — "YOUR PIXELS" + the big gold count (the Wallet header drops the counter — the hero IS the number) + BUY PIXELS → Top Up. Reads `/me/wallet.balance` | (bal-hero) + PixelsMark | board `:1277–1282`; §2.3 | OWED — **LIVE** |
| 2 | **LedgerRow** history — signed badge · what · when · PX amount, paginated (`/me/wallet/ledger` `{items,nextCursor}`). Types: earn (grant/daily/pack/reversal-credit) · spend (adoption/acquire) · **refund_reversal** (⊘ alert-red row) · **admin_adjustment** ("OPERATOR ADJUSTMENT" — reason never serialized, ECON-11) | LedgerRow | board `:1284–1292`, `:1313`; §2.3; the pinned reason enum (0073) | OWED — **LIVE** (paginated / load-more) |
| 3 | The **ECON-09 negative variant** — hero + header counter go alert-red; the ⊘ reversal row; "nothing you own is taken back" reassurance; BUY PIXELS is the way back | (bal-hero neg) + CurrencyCounter/negative + LedgerRow/rev | board `:1305–1315`; ECON-09 | OWED — **LIVE** (balance < 0) |

## P9 — Ownership (board `:1328–1411`)

| # | Element | Component | Notes | Status |
|---|---------|-----------|-------|--------|
| 1 | An aisle/category page wearing entitlement states: **OwnedTag** ("✓ OWNED — in your editor", the price never returns) · the normal **PriceChip** · **LockedTag** ("returns with its drop" — a date, never a price) | OwnedTag · LockedTag · PriceChip | board `:1344–1367`; §2.3; COSM-03/ECON-08 | OWED **components**; the **item rows are EXPECTED(P4/P10 roster)** — `/me/entitlements` is empty for a fresh account, and there is no `GET /cosmetics` to list an aisle → the page renders honest-empty |
| 2 | **THE TROPHY SHELF — earned only** — **EarnedOnlyTag** (gold-*outline* never fill, so it can't read as a price) on achievement exclusives ("EARNED ONLY", never sold) | EarnedOnlyTag | board `:1368–1389`; COSM-04 | OWED **component**; **content EXPECTED(M7 · ACH earned cosmetics)** |

## P10 · P11 · P12 — Lifecycle (board `:1417–1598`) — per C4.

---

## State-table walks (binding)

1. **View (`view: browse | topup | wallet | aisle`)** — the header + nav persist; a `‹ RETURN TO STORE`
   link returns to browse. Default landing: browse. The counter (except in Wallet, where the hero is the
   number) rides the header everywhere and reflects the live balance.
2. **Daily claim** — CLAIM +1 → `POST /me/daily-bonus`; optimistic-safe (server is idempotent per
   UTC-day). On `{granted:true}` the counter ticks (+amount) and the bar goes quiet; `{granted:false}`
   (already claimed today) also quiets the bar (no double-grant). `nextResetAt` drives the "back
   tomorrow" copy. Wallet + ledger invalidate.
3. **Pack purchase (mock)** — tap a PackTile $ → mint a mock receipt for that `productId` →
   `POST /iap/validate` → on `{granted:true, pixels, balance}` swap to the **LandedMoment** (the
   from→to arithmetic uses the pre-call balance → `balance`); wallet/ledger/store invalidate (the
   Starter tile flips `purchased`). `{granted:false}` (replay) is a quiet no-op success. Failure →
   Toast + RETRY. `STARTER_PACK_CONSUMED` (409) → an inline "already claimed once" note on the starter.
4. **Acquire a premium item (the BUY gate)** — hold-to-buy completes (or, reduce-motion, press →
   ConfirmSheet) → `POST /cosmetics/:id/acquire`. `INSUFFICIENT_BALANCE {shortBy}` → the P5 bridge in
   the same sheet. Success → the item flips to OwnedTag; wallet/entitlements invalidate. *(No acquirable
   item exists at M5 — this walk is component-tested, live-EXPECTED(P4).)*
5. **Restore** — ↺ → `/iap/validate` `{rcUserId}` → the quiet "all caught up" line (consumables never
   re-granted).
6. **Offline (SYS-10)** — the writes gate: CLAIM + BUY + acquire sleep with "needs a connection";
   browse + Wallet render from cache; auto-recovers. (No client NetInfo exists yet — the offline signal
   is a transient write-failure, the device-editor precedent; recorded as ASSUMPTION.)

## Component reuse (component-map §7 — compose, don't fork)

NEW (§7-named): `PixelsMark` · `CurrencyCounter` (`negative` · counterTick) · `PriceChip` (`big`) ·
`BuyBar` (hold-to-buy + the OQ-046 non-hold alt) · `PackTile` (`starter`) · `ItemTile` · `LedgerRow`
(earn·spend·reversal·**admin_adjustment**) · `OwnedTag`·`LockedTag`·`EarnedOnlyTag` · `DailyBonusBar` ·
`AisleIndex` · `PreviewStrip` · `PreviewStage`. NEW infra (not §1.5 surfaces): `LandedMoment` (P7 beat) ·
`ItemSheet` (composes `PulledSheet` + PreviewStage + PriceChip + BuyBar + the bridge) · `packMeta.ts`
(productId → USD + value-math, the dev price map) · `storeCopy.ts` (copy helpers) ·
`store/mockReceipt.ts` (the `__DEV__` receipt encoder mirroring MockRevenueCat). REUSED verbatim:
`PulledSheet` · `ConfirmSheet` · `ScreenButton`/`TertiaryLink` (0069) · `ScreenHead` · `MiniDevice`
(shell preview) · the **lifecycle kit** (`Skeleton`/`LoadError`/`Offline`/`Toast`) · `useReducedMotion`
· `useAnnounceOnChange` · the theme engine (`useTheme`/`themedStyles`). NEW RTK endpoints in `store/api.ts`:
`getStore`·`getWallet`·`getLedger`·`claimDailyBonus`·`validateIap`·`getEntitlements`·`acquireCosmetic`·
`acquireCosmeticBatch` (+ tags `Store`·`Wallet`·`Ledger`·`Entitlements`). ShellNav gains the `/store` route.

## Declared assumptions / gaps (none silent)

- **EXPECTED(roster-empty):** the entire premium storefront (drop cover · NEW-THIS-WEEK grid · aisle
  item lists · item sheets · the bridge · ownership item rows · `INSUFFICIENT_BALANCE`) is drawn but
  **has no server content at M5** — `/store.premiumCosmetics`+`.drops` are `[]`, `GET /cosmetics` is
  unregistered, the cosmetic registry is empty (404 on every real id). The **surfaces render
  empty-graceful and the COMPONENTS are built + unit-tested**; live reachability is EXPECTED(P4 roster
  re-tag · P10 · ECON-08 drops · M7 earned).
- **EXPECTED(P2b · real StoreKit):** the pack BUY + Restore run through a `__DEV__` mock receipt today;
  the real RevenueCat/StoreKit purchase replaces the one flagged call-site behind the same
  `/iap/validate`.
- **ASSUMPTION(a11y-trigger = reduce-motion):** the OQ-046 non-hold BUY path triggers on the OS
  reduce-motion setting (the only accessible signal in the app today). The owner may prefer a dedicated
  "confirm purchases with a tap" toggle when Settings (§2.x) lands. **Both BUY paths are built + tested
  (the launch gate).**
- **ASSUMPTION(dev price map):** USD prices + value-math ride a client `packMeta` map keyed by the 0072
  productIds (USD is store-owned metadata, not on the `/store` wire; StoreKit supplies it at P2b). If a
  served pack's productId is unmapped, its tile shows the PX value + a neutral "$—" and still buys.
- **ASSUMPTION(offline = transient-write-failure):** no client NetInfo exists yet (the device-editor
  precedent) — the P12 offline gate is inferred from a write failing transiently. A real connectivity
  probe is a cross-cutting later add.
- **GAP(store_products not dev-seeded):** `db:seed-dev` does not seed the pack ladder, so a fresh dev DB
  serves `packs: []`. The client renders that honest-empty; the BOOT walk seeds the 0072 ladder into the
  dev DB **as data** (idempotent, not a code change) to walk Top-Up. Flagged for the server P2/P10 seed
  to own permanently.
- **GAP(no aisle-count source):** THE INDEX cannot show per-aisle counts (`n ›`) with no `GET /cosmetics`
  — the rows render with a plain `›`. Filed as the natural home for the P10 store-front listing endpoint.

## Browser BOOT check (binding)

Login (`demo@ingame.app`) → the **STORE nav keycap navigates to `/store`** (gold, active) → **browse**
renders (the DailyBonusBar, the CurrencyCounter reading the live balance, the AisleIndex taxonomy, the
free-baseline hint; the premium grid + drop cover honest-empty) → **CLAIM +1** ticks the counter + quiets
the bar (a `daily_claim` ledger row lands) → **PIXELS → TOP UP**: the 5-SKU pack ladder renders (after
the dev-DB seed) with value-math + the starter row → **BUY the $4.99 / 30-pack** (mock receipt →
`/iap/validate`) → the **LandedMoment** shows +30 and the header counter glows/ticks → **VIEW WALLET**:
the balance hero + the LedgerRow history (the grant · the daily claim · the pack) → back to Store. Report
what RENDERED and what LANDED (balance deltas, ledger rows), not what should. Zero console errors; the nav
keycaps stay legible.
