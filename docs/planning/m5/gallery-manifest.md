# gallery — screen manifest (P8 · community gallery + adopt · 2026-07-13)

> **Surface:** M5 §P8 — the game page's **CARDS community gallery → inspect/adopt sheet**, plus the
> **CARD-21 client share** half + the **SOC-09-light block-the-designer** action. The gallery is the
> consumer of the whole §1-spike → P3 publish/adopt thread: it renders **other users'** published cards
> for a game (flattened images only, OQ-138), personalized adoption prices (decision 0072), and drops
> an adopted card into that game's switcher (COL-06).
> **Board:** `docs/design/mockups/game-page/game-page-states.html` — the **"M4 · CARDS — community
> gallery → adopt sheet"** artboard (`:654–719`; labeled M4 in-file, **re-tagged M5 by decision 0062**)
> + `docs/design/mockups/discover/discover-states.html` **P5** (the CardDetail tap-through grammar).
> **Authority stack:** design-spec **§2.4b** (game page) · product-spec **CARD-05/13/15/19/20/21 ·
> ECON-03/04/05 · SOC-09** · api-contract **0.60/0.61** (gallery `priceForYou` · adopt 0072 shape ·
> trending · share-image) · decisions **0072** (adoption = component acquisition + free design grant;
> personalized price = the caller's missing-components sum) · **0073 §0.6** (SOC-09-light) · **0073
> §0.10** (OQ-138 flattened-only · OQ-101 adopt online-only) · **0075** (roster) · component-map
> **§9** (`CommunityGallery`/`AdoptCount`) + **§10** (`SectionEmpty`).
> **Author/Builder:** P8 builder (this packet — client only, apps/mobile). **Reviewer:** murr + parvati
> + the owner's gate-5 taste walk. Server P3/P9 (publish/adopt/gallery/trending/share-image) committed
> by concurrent packets; this packet **consumes** those endpoints and never touches apps/api.
>
> **⚠ RTK ISOLATION (build constraint).** A concurrent agent owns `apps/mobile/src/store/api.ts`. My
> endpoints go in a **NEW file `src/store/communityApi.ts`** via `api.enhanceEndpoints({ addTagTypes })
> .injectEndpoints(...)` — zero edits to api.ts, the standard injection pattern. New tag types
> (`CommunityCards` · `TrendingCards`) are added via `enhanceEndpoints`; adopt/block cross-invalidate
> the base slice's existing tags (`Wallet · Ledger · Entitlements · Collection · Cards`).
>
> **⚠ FLATTENED-ONLY, NEVER COMPOSITION (OQ-138 / CARD-15 / 0066 §2).** Cross-user cards carry NO
> `composition` on the wire (`galleryCardSchema` = id·name·imageUrl·thumbUrl·isPremium·adoptionCount·
> priceForYou·designer). They render through a NEW **`FlatCardImage`** (RN `<Image>` on the flattened
> `thumbUrl`/`imageUrl`), **never `CardFace`/skia** — the live-canvas budget is editors-only (0073
> §0.10). A null url (should not happen for a published card — publish flattens) degrades to the
> `GameCard` default placeholder.
>
> **⚠ MEDIA-URL SEAM.** `imageUrl`/`thumbUrl` come back **API-relative** (`/media/<key>`, served OUTSIDE
> the `/api` mount, no auth — LocalDiskStorage). The client resolves them against the API **origin**
> (API_BASE minus `/api`) in a NEW `src/store/mediaUrl.ts` helper (the api.ts base-URL logic replicated,
> since API_BASE is not exported and api.ts is off-limits — a 3-line duplication, flagged).
>
> **Copy law (OQ-110):** no spec-ID strings in rendered copy. **F-06:** on-screen type is 21/15/11/9
> only. **0069:** ADOPT = orange `/primary` (the board calls it out `:695`); block = destructive-red
> ConfirmSheet; SHARE = cream `/secondary`. All themed-token-native (`useTheme`/`themedStyles`, 0070).
>
> **Status legend:** as the M4 device/store manifests — **OWED** (build now) · **PRE** w/ cite
> (already exists) · **EXPECTED(cite)** (a later packet/milestone owns it) · **ASSUMPTION** (a
> reasonable call recorded, owner may redirect) · **GAP** (a doc/data hole surfaced, not silently
> patched).

---

## Shared placement (the CARDS tab, game page)

| # | Element | Component | Notes | Status |
|---|---------|-----------|-------|--------|
| C1 | The CARDS tab scrolls past **your own cards** (`CardSwitcher`, PRE — M3/§3.1) to the community gallery. The M3 board's inert "BROWSE THE COMMUNITY / SEE ALL ›" placeholder (`:620–621`) becomes the **live `CommunityGallery`** | CommunityGallery | board `:669–677`; §2.4b; PRE placeholder = `[id].tsx` CARDS section (CardSwitcher only) | OWED |
| C2 | The inspect/adopt sheet + the share util + the block action mount at the **screen root** (the `PulledSheet`/`ConfirmSheet` screen-root contract; the game page's existing `CardDetailSheet`/`ConfirmSheet` precedent, `[id].tsx:219–271`) | AdoptCardSheet + ConfirmSheet | board `:680–696` | OWED |

## The gallery (board `:669–677`)

| # | Element | Component | Notes | Status |
|---|---------|-----------|-------|--------|
| 1 | Header — **"COMMUNITY CARDS — N"** (N = item count) + a SORT affordance | CommunityGallery head | board `:669` | OWED — SORT is **decorative/inert** (no sort param on the wire); **EXPECTED(later · sort/pagination)** |
| 2 | **3-up grid** of cells: each `FlatCardImage` (flattened `thumbUrl`) + **BY «designer»** credit + a foot row: **`PriceChip`** (`priceForYou` PX) OR a **FREE** chip (priceForYou 0) + **`AdoptCount`** ("N×") | CommunityGallery cells + FlatCardImage + PriceChip + AdoptCount | board `:671–676` (`gwrap`/`gw-credit`/`adopt-chip`/`adopt-count`); component-map §9 | OWED — data: `GET /games/:gameId/cards` (communityApi) |
| 3 | Tap a cell → the **inspect/adopt sheet** (C2); the tapped cell keeps a gold edge (board `:671` outline) | (press → onInspect) | board `:671` | OWED |
| 4 | **Empty** — no published community cards yet → **`SectionEmpty`** contributor-hook variant (gold DESIGN-A-CARD door → the Styler) | SectionEmpty | component-map §10; board has no empty draw (illustrative full grid) | OWED — build `SectionEmpty` as the thin `EmptyState` wrapper |
| 5 | Lifecycle — **loading** `Skeleton` (cell-row) · **error** `LoadError` inline ("couldn't load the community cards" + RETRY; the gallery is a *section*, not the whole screen — the switcher above stays) · **offline** inherits (adopt is the gated write, not the read) | lifecycle kit | §1.6; the store-manifest C4 precedent | OWED |

## The inspect / adopt sheet (board `:680–696`)

| # | Element | Component | Notes | Status |
|---|---------|-----------|-------|--------|
| 1 | Rises as a **`PulledSheet`**: head **"COMMUNITY CARD — «NAME»"** + ✕ · the flattened render **large** (`FlatCardImage` on `imageUrl`) · **"DESIGNED BY «designer» · ADOPTED N×"** credit line | AdoptCardSheet (PulledSheet) | board `:680–686`; the `CardDetailSheet` grammar | OWED |
| 2 | **Adopt bar** — "ADOPT — THE WHOLE CARD" + the CARD-15 honest sub ("you get the image, not the layers") + the **ADOPT** keycap carrying `priceForYou` (orange `/primary`; **FREE** when 0) | AdoptCardSheet adoptbar | board `:690–695`; ECON-04; 0069 | OWED |
| 3 | ADOPT → a **purchase-toned `ConfirmSheet`** (SOC-11 atomic) — the total (`priceForYou`) + "the whole card's premium components"; **FREE path** confirms with **no debit line**. Confirm → `POST /cards/:id/adopt` | ConfirmSheet (tone=purchase) | board `:708` confirm beat; SOC-11; 0072 | OWED — **per-component itemization is NOT on the gallery wire** (only the summed `priceForYou`); the confirm names the total + a general components line, not a line-item list → **GAP(no pre-adopt component breakdown on `galleryCardSchema`)**; the post-adopt `granted[]` breakdown IS available and drives the success line |
| 4 | **Success** → a quiet gold toast ("ADOPTED — «designer»'s card is yours · N PX spent · it's in your switcher") + the sheet closes; the card lands in the switcher (COL-06) + wallet/entitlements tick | (toast) | board `:708` | OWED — invalidates `Cards·Collection·Wallet·Ledger·Entitlements·CommunityCards` |
| 5 | **`INSUFFICIENT_BALANCE {shortBy}`** → the **can't-afford bridge**: a short-strip naming the gap ("SHORT N PIXELS") + a **TOP UP** door (`router.push('/store?view=topup')`) — matches P6's grammar | AdoptCardSheet (bridge) | store-manifest P5; 0073 §0.4 | OWED |
| 6 | **`ALREADY_ADOPTED`** → an owned state ("you already have this card") — refetch so the switcher shows it | (owned note) | 0073 §0.4; OQ-101 | OWED |
| 7 | **`NOT_PUBLISHED`** → the card vanished gracefully (close + gallery refetch) | (refetch) | 0073 §0.4 | OWED |
| 8 | **Offline (0073 §0.10 · OQ-101)** — adopt is **ONLINE-ONLY**; a transient network failure on ADOPT surfaces the disabled/"needs a connection" state (the store-manifest transient-write-failure signal, no client NetInfo yet) | (offline gate) | 0073 §0.10 | OWED — **ASSUMPTION(offline = transient-write-failure)**, inherited |

## SHARE — CARD-21 client half (board: the m4-review-notes EXPECTED row + `CardDetailSheet` SHARE)

| # | Element | Component | Notes | Status |
|---|---------|-----------|-------|--------|
| 1 | On the game page's **PLAY SHARE** action (`[id].tsx` action row, currently `disabled`) + the own-card `CardDetailSheet` SHARE (currently `disabled`): fetch **`GET /cards/:id/share-image`** (a raw branded PNG) and hand it to the platform share/save path | shareCard util | m4-review-notes EXPECTED; CARD-21 | OWED — **own PUBLISHED/adopted cards only**; an unpublished own card → `NOT_PUBLISHED`/404 → quiet "unavailable" |
| 2 | **Implementation (no new dependency).** `expo-sharing`/`expo-file-system`/`react-native-share` are **NOT installed** — adding one is a justified-dependency change (CONVENTIONS) I do not take unilaterally. **web** (the dev/test surface): authenticated blob fetch (through the RTK base query, so token + reauth ride along) → `URL.createObjectURL` → open in a new tab (view/save). **native:** RN core `Share.share` best-effort. | shareCard util | 0073 §0.5 storage; RN `Share` | OWED (web) · **ASSUMPTION(native = RN Share best-effort)**; the robust native branded-image share (temp-file write + `expo-sharing`) is **EXPECTED(P9/native-polish · needs a justified dep)** |
| 3 | Moderation-refused / 404 → a **quiet "sharing unavailable"** note (never a hard error) | (quiet fail) | CARD-21; MOD | OWED |

## Block-the-designer — SOC-09-light (0073 §0.6)

| # | Element | Component | Notes | Status |
|---|---------|-----------|-------|--------|
| 1 | An **overflow/long-press** on the inspect sheet's DESIGNED-BY credit → a **destructive `ConfirmSheet`** ("Block «designer»? Their cards leave your community views. This doesn't remove a card you already adopted.") → `POST /me/blocks {userId}` → the gallery + trending refetch (their cards vanish; MOD-09-indistinguishable) | AdoptCardSheet block action + ConfirmSheet (destructive) | 0073 §0.6; component-map §10 | OWED **client**; **⚠ GAP(server): `POST /me/blocks` is in api-contract `:155` but the ROUTE IS NOT REGISTERED** — only the block READ substrate exists (`relationship-repo.isBlockedBetween`/blocked-set filtering; the block/unblock *endpoints* were explicitly deferred at M2). The client wires to `POST /me/blocks` per the contract; **live block will 404 until the server registers the route** (P3/SOC tail). Filed below. |

## Discover trending tap-through (task step 5)

**GAP(no Discover surface).** `GET /discover/trending-cards` **exists server-side** (discover-routes) and
its client query is added to `communityApi` (`useGetTrendingCardsQuery`), BUT **there is NO Discover
screen in the app** — `app/(tabs)/` has only `collection` + `profile` (the DISCOVER nav slot is inert;
the Discover surface is **M6-scoped**). So there is **no trending rail to wire a tap-path into today**.
The **`AdoptCardSheet` is built reusable** (it takes a card + designer + gameId, not a collection entry)
so a future Discover trending rail can open the exact same inspect/adopt sheet. **Nothing built on the
Discover side this packet; the rail itself is M6.** Recorded, not silently skipped.

## Contributor live check (task step 6)

**PRE + verify-only.** `GET /users/:id/contributions` (CAT-07) is **live** (users-routes) and its stats
(`cardsDesigned`/`totalAdoptions`) go real the moment adoptions exist (P3). There is **no client screen
for another user's contributor profile** (social/M6) — the Profile tab's own stats read `getMe`
(`me.stats.cardsDesigned`, PRE). A `getContributions` query is **NOT** added (no consumer — would be dead
surface). The BOOT walk **verifies the rival's `totalAdoptions` via the live endpoint directly** (an
authenticated GET) and reports the number. **No new UI.**

---

## State-table walks (binding)

1. **Gallery load** — `useGetGameGalleryQuery(gameId)`: loading→Skeleton · error→inline LoadError ·
   `items:[]`→SectionEmpty(contributor-hook) · else the 3-up grid. Each cell's foot reads `priceForYou`
   (FREE at 0, else PriceChip) + `adoptionCount`.
2. **Inspect** — cell tap → `AdoptCardSheet` opens with that `GalleryCardView`. The sheet is pure
   presentation over the card + injected `onAdopt`/`onShare`/`onBlock`/`onTopUp` (container wires them).
3. **Adopt** — ADOPT → purchase ConfirmSheet (total or FREE-no-debit) → confirm → `onAdopt()`:
   `{ok:true, result}` → success toast + close + invalidations; `{ok:false, INSUFFICIENT_BALANCE, shortBy}`
   → the in-sheet bridge (short-strip + TOP UP); `ALREADY_ADOPTED` → owned note + refetch; `NOT_PUBLISHED`
   → close + refetch; transient network → offline/"needs a connection".
4. **Share** — PLAY SHARE / CardDetail SHARE → `shareCard(cardId)`: web opens the branded PNG in a new
   tab; native best-effort RN Share; 404/refused → quiet unavailable.
5. **Block** — long-press/overflow on the credit → destructive ConfirmSheet → `POST /me/blocks` →
   gallery+trending refetch. (Live-blocked on the missing server route — GAP above.)

## Component reuse (component-map §9/§10 — compose, don't fork)

NEW (§9/§10-named): `CommunityGallery` (§9) · `AdoptCount` (§9 — a tiny count chip; built inline in
the gallery cell + reused in the sheet credit) · `SectionEmpty` (§10 — thin `EmptyState` wrapper).
NEW infra (not §1.5 surfaces): `FlatCardImage` (the cross-user flattened-image renderer — RN `<Image>`,
never skia) · `AdoptCardSheet` (composes `PulledSheet` + `FlatCardImage` + `PriceChip` + the adopt bar +
the bridge) · `src/store/communityApi.ts` (the injected RTK endpoints) · `src/store/mediaUrl.ts`
(relative-`/media`→absolute) · `src/share/shareCard.ts`. REUSED verbatim: `PulledSheet` · `ConfirmSheet`
(tone `purchase`/`destructive`) · `PriceChip`/`PixelsMark` (commerce §7) · `ScreenButton`/`TertiaryLink`
(0069) · `GameCard` (the FlatCardImage null-url fallback) · the **lifecycle kit** (`Skeleton`/`LoadError`
/`EmptyState`) · `useAnnounceOnChange`. NEW RTK endpoints (communityApi injectEndpoints): `getGameGallery`
· `adoptCard` · `getTrendingCards` · `blockUser` · `getShareImage` (blob) — tags `CommunityCards` ·
`TrendingCards` added via `enhanceEndpoints`.

## Declared assumptions / gaps (none silent)

- **GAP(server · block route):** `POST /me/blocks` is in api-contract but **not registered** — only the
  block READ substrate exists. The client wires per contract; live block 404s until the server P3/SOC
  tail registers the route. **Not patched here** (client packet; apps/api is off-limits).
- **GAP(no Discover surface):** the DISCOVER tab/screen does not exist (M6). No trending tap-path to
  wire today; `AdoptCardSheet` is built reusable for it. `getTrendingCards` is added to the data layer.
- **GAP(no pre-adopt component breakdown):** `galleryCardSchema` carries only the summed `priceForYou`,
  not the per-component list — the adopt ConfirmSheet names the total + a general components line, not a
  line-item breakdown. The post-adopt `granted[]` gives the itemized result for the success line. Filed
  as the natural home for a card-detail read (or a `components[]` add to the gallery shape) if the owner
  wants the itemized pre-adopt list.
- **ASSUMPTION(share · no new dep):** SHARE ships web-complete (authenticated blob → open/download) +
  native best-effort RN Share; the robust native branded-image share needs `expo-sharing`+`expo-file-
  system` (a justified dependency) = EXPECTED(P9/native-polish). Owner may greenlight the dep.
- **ASSUMPTION(no game-page CurrencyCounter):** the game page header has no PX counter (the board draws
  none). Adopt cost/result is shown in the ADOPT chip + the success toast; the global CurrencyCounter
  (Store/Wallet) ticks via `Wallet` invalidation. Owner may want a counter on the CARDS tab.
- **ASSUMPTION(offline = transient-write-failure):** inherited from the store/device precedent — no
  client NetInfo; the adopt online-only gate is inferred from a write failing transiently.
- **ASSUMPTION(SORT inert):** the gallery header SORT is decorative (no sort param on the wire) —
  EXPECTED(later · sort/pagination on `/games/:gameId/cards`).
- **ASSUMPTION(media-url duplication):** `mediaUrl.ts` replicates api.ts's base-URL logic (API_BASE is
  private + api.ts is off-limits). A 3-line duplication; if api.ts later exports its base, collapse it.

## Browser BOOT check (binding)

Login (`demo@ingame.app`) → open the **Hollow Knight** game (the rival published "Hollow Knight — Rival
Cut" for it, premium font `bitter` = 3 PX, which demo does NOT own → `priceForYou 3`) → **CARDS** tab →
scroll past your own cards → the **CommunityGallery** shows the Rival Cut card (flattened thumb, BY
rival_curator, a **3** PriceChip, an adopt count) → tap it → the **AdoptCardSheet** (card large, DESIGNED
BY rival_curator, ADOPT · 3) → **ADOPT** → the purchase ConfirmSheet lists the 3-PX total → confirm →
success toast → the card appears in the **switcher** (COL-06) + a Wallet spend of 3 lands (verify the
Store/Wallet counter ticked down 3) → back to the gallery: the Rival Cut now reads owned/adopted →
**verify** the rival's `GET /users/:rivalId/contributions` reports `totalAdoptions: 1`. Report what
RENDERED and what LANDED (balance delta, switcher, contributor number), not what should. Zero console
errors.
