# InGame — Design Spec

> The design-side source of visual truth. **Part 1 (Foundations)** names every token and component;
> **Part 2 (Screens)** composes from the catalog by name. Mirrors the product-spec's shape per
> [`design-process.md`](design-process.md). No net-new component without adding it here first.

**Version:** 0.10 (Phase B + state passes + Store) · **Last updated:** 2026-06-12 · **Owner:** Claude Design
**Source mockups:** `H2 Underlay — Corner System C5 Hybrid` (Collection + Profile + shell, Phase A direction) · `Button System Drafts` (OQ-006 exploration) · `Collection States` + `Profile States` (state matrices) · `Store States` (converged Store board, store track) · `Currency Identity v2` (the PIXELS ruling) · `Design System Catalog` v0.3
**Canonical baseline:** **Teal shell + Midnight screen theme** (all token values below are Midnight unless noted).

---

## Part 1 — Foundations

### 1.0 Foundation rules (F-IDs)

| ID | Rule |
|---|---|
| **F-01** | **Never crop a Game Card.** Every surface renders the full face, scaled — never cropped, never slivered. (OQ-014; ties to CARD-07) |
| **F-02** | **The step diagonal belongs to the card.** The TL+BR pixel-step is the GameCard's signature; all other chrome is square 90°. A button may borrow the step at **half scale (2/4)**, and **colour disambiguates intent** (OQ-036): **gold + step = a card-creating action** (ADD) · **system-orange + step = a prominent non-card action** (RETRY, ADD FRIEND). Step + a card's own colour = a GameCard; step + gold = makes a card; step + orange = borrows the geometry, not the identity. *(The avatar "design" affordance is a circular corner badge — no step — and is exempt.)* |
| **F-03** | **Keycap physics on both surfaces.** The shell's tactile key language extends to on-screen actions: solid keycaps with a hard drop edge (4px on shell, 3px on-screen actions, 2px tools) that travel down when pressed. (OQ-006 re-resolved to the Keycap take, 2026-06-11) |
| **F-04** | **Nav legibility beats customization.** Shell colours/stickers may never obscure the 5 nav keycaps or their labels. (DEV-01) |
| **F-05** | **Pips are lights, not chrome.** Indicator pips stay round in every corner system — they're LEDs, not panels. |
| **F-06** | **The 4-step type scale is law on screen** (21/15/11/9). Card plates are *print on the card object* and scale with the card instead. |
| **F-07** | **Radius lives on plastic.** Rounded corners exist only on the physical shell (device, bezel, keycaps). On-screen chrome is square (C5). |
| **F-08** | **One font per surface.** Chakra Petch is THE screen font (every text on the app screen, incl. card plates, buttons, tags, links); Paytone One is THE plastic font (silkscreened shell labels). No third voice. |
| **F-09** | **No sunken containers.** Panels, wells, tiles, rows, and selection states never render inset/"carved-in" — surfaces are flat planes one step lighter than their background; **selection = an accent border (+ `ChipPip`)**, never an inset shadow or a darkened recess. *Exceptions by name:* **pressed/active keycaps** (they physically travel — that's F-03's metaphor) and **text inputs** (the cream inset field). (Owner rulings: "flat panels — not something Game Boy had," 2026-06-10; the report-drawer selection, 2026-06-12.) |

### 1.1 Colour tokens

#### Shell palettes (`shell.*`) — 5 colourways, Teal canonical
Each palette sets the full physical set; derived alphas use `shell.ink` via `color-mix`. Carbon inverts `shell.silk` to a light tone (labels on dark plastic).

| Token | Teal ★ | Grape | Sunset | Pink | Carbon |
|---|---|---|---|---|---|
| `shell.plastic` | `#2bb6b0` | `#8a76e8` | `#ff9051` | `#ff8ab0` | `#3a3a42` |
| `shell.plasticHi` | `#3ec9c2` | `#9f8df2` | `#ffa76f` | `#ffa5c4` | `#4a4a54` |
| `shell.plasticLo` | `#1f9a94` | `#7460cc` | `#ea7437` | `#e96d96` | `#2c2c33` |
| `shell.silk` (labels) | `#0d524e` | `#392c7a` | `#7c3a12` | `#8a2247` | `#b9b9c6` |
| `shell.ink` (logo/grille/key-shadow @ 28–70%) | `#08433f` | `#2d2164` | `#6b2f0c` | `#76183a` | `#0a0a0e` |
| `shell.screwHi / screwLo` | `#2aa39d / #137671` | `#7d6cd8 / #5b49b4` | `#f08148 / #c75e26` | `#f07da6 / #c75880` | `#45454f / #26262d` |
| `shell.pipOff` | `#117672` | `#5e4cb8` | `#c96a2e` | `#c0577f` | `#16161c` |

#### Screen themes (`scr.*`) — 3 dark + 3 light, Midnight canonical

| Token | Midnight ★ (dark) | Deep Sea (dark) | Berry (dark) | Paper (light) | Mint (light) | Lilac (light) |
|---|---|---|---|---|---|---|
| `scr.bg` | `#232045` | `#0f2e2b` | `#2f1733` | `#ece5d1` | `#ddeee9` | `#e6e1f4` |
| `scr.well` | `#2c2950` | `#173d38` | `#3d2042` | `#f9f5e9` | `#f4faf7` | `#f7f5fc` |
| `scr.tools` | `#1a1733` | `#0a1f1d` | `#1f0e23` | `#dfd6bd` | `#c8e0d8` | `#d2c9ec` |
| `scr.accent` / `accentInk` | `#ff9f43` / `#2a1430` | `#ffd23f` / `#3c2a09` | `#ff3d77` / `#2a1430` | `#c75c12` / `#fff` | `#117672` / `#fff` | `#6c4fd8` / `#fff` |
| `scr.btn` / `btnInk` | `#ffb38a` / `#2a1430` | `#ffe27a` / `#3c2a09` | `#ff8aab` / `#3d0a1d` | `#c75c12` / `#fff` | `#117672` / `#fff` | `#6c4fd8` / `#fff` |
| `scr.head` | `#f5f1e4` | `#f5f1e4` | `#f5f1e4` | `#1d2a4a` | `#143a36` | `#2c2260` |
| `scr.text` / `dim` / `soft` | `#fff / #9b97c0 / #c9c5e6` | `#fff / #84aaa2 / #bcd6cf` | `#fff / #b18ab8 / #dcc4e0` | `#2a2633 / #8a8270 / #5d5747` | `#16302c / #5f827b / #3c5a54` | `#2a2444 / #7d76a0 / #4a4466` |
| `scr.panel` / `hairline` | `α-white .065 / .08` | `α-white .06 / .08` | `α-white .06 / .09` | `α-navy .06 / .12` | `α-teal .07 / .14` | `α-violet .07 / .13` |
| `scr.grip` | `#565178` | `#3f655d` | `#6b4a72` | `#b9b09a` | `#9cc0b7` | `#a89ed0` |
| `scr.chip` | `#f5f1e4` | `#f5f1e4` | `#f5f1e4` | `#fff` | `#fff` | `#fff` |

#### Brand constants (`brand.*`) — theme-invariant
| Token | Value | Use |
|---|---|---|
| `brand.accent` | `#ff3d77` | Lit pips, notification dots, Collection nav keycap |
| `brand.gold` | `#ffd23f` | Value marker: ADD keycap, CountKeycap, RankChip/first, PctPill, Store nav keycap |
| `brand.cream` | `#f5f1e4` | Keycaps, dark-theme chips |
| `brand.navy` | `#1d2a4a` | Keycap iconography, `PlateButton/secondary` |
| `brand.bezel` | `#14122a` | Screen bezel |
| `brand.alert` | `#e3414e` | Destructive keycaps (KeycapButton/destructive) |

### 1.2 Typography (`type.*`)
- **Families (F-08):** `type.ui` = Chakra Petch — the screen font (all on-screen text incl. card plates, buttons, tags, links) · `type.shell` = Paytone One — the plastic font (shell labels only). *Silkscreen retired in v0.3.*
- **Scale (screen, F-06):** `type.display` 21px · `type.emphasis` 15px · `type.body` 11px · `type.micro` 9px. Weights 600–700; micro labels letterspaced 1–2px, uppercase.
- **Card print (size-exempt, F-06):** plate = `type.ui` 700, ≈ 10px @ hero/grid → 4.5px mini → 3.2px thumb (scales with the card).

### 1.3 Spacing, corners, elevation
- **Spacing scale:** 2 · 4 · 6 · 8 · 12 · 16 (+18 panel padding). Grid gutter 12; Top-5 gutter 6; screen gutter 12–16.
- **Corner system (C5):** on-screen chrome square. GameCard step (TL+BR): 4/8 double-step @ hero/grid · 3 single @ mini · 2.5 @ thumb; art and plate repeat the diagonal at smaller steps. ADD exception = 2/4 (F-02). Shell radii: device 30 · bezel 20 · keycap 15 · screen 13 · mini-device 7.
- **Elevation:** shell = soft physical (inset highlights + `0 4px 0` ink edges). Screen keycaps = `shadow.key`: `0 3px 0` darkened fill (`color-mix` 45% black; 2px at chip/tool size) + inset top highlight; rendered via `drop-shadow` filter when the shape is clipped (ADD). `shadow.card` `0 4px 7px rgba(0,0,0,.35)` drop · `glow.pip` `0 0 6–9px` accent.

### 1.4 Motion (`motion.*`)
| Token | Spec | Status |
|---|---|---|
| `motion.keyPress` (shell + screen) | translateY 2–3px, drop edge →0–1px, inset press shadow, ~80ms ease-out; active keys stay pressed | ✓ designed |
| `motion.foilSweep` | 18° highlight band, 3.4s ease-in-out loop, screen blend (custom cards) | ✓ designed (parked) |
| `motion.pipLight` | pip swaps to `brand.accent` + glow | ✓ designed |
| `motion.holdToBuy` | BUY keycap sits pressed while a darker fill sweeps it (~rated hold); release early = cancel, nothing spent. The spend confirm for instant-PX purchases (OQ-046; a11y non-hold alternative owed) | ✓ designed (store track) |
| `motion.counterTick` | `CurrencyCounter` glows + a `+N` tick chip beside it; the quiet success beat for grants/claims | ✓ designed (store track) |
| `motion.cardFlip` · `powerOn` · `celebration` | — | **Phase C/D** |

### 1.5 Component catalog
**Shell (3D, F-03):** `DeviceShell` (frame/screws/grille/LED/logo) · `NavBand` + `NavKeycap` (5 tabs; variants: gold Store, pink Collection; active = pressed + `PipLight`) · `MiniDevice`.
**The card:** `GameCard/hero|grid|mini|thumb` (face = art + plate title only; plate in `type.ui` 700; step per 1.3) · `GameCard+custom` (owner shell colour + `FoilTag`; `motion.foilSweep`) · `NowTag` · `FoilTag` (tags: `type.ui` 700 9px) · `RankChip` (+`/first`).
**Buttons (screen — the Keycap system, F-03):**
- `KeycapButton` — action tier. `type.ui` 700 11px (letterspaced 1px), solid keycap + `shadow.key`. Variants: `/primary` (`scr.btn` fill) — **as ADD: `brand.gold` fill + the 2/4 step via drop-shadow** (gold marks card-creating actions, F-02) · `/action-alt` (**`scr.accent` system-orange + 2/4 step** — prominent *non-card* actions: RETRY, ADD FRIEND) · `/secondary` (`brand.cream`, navy ink) · `/destructive` (`brand.alert`, white ink). Pressed = `motion.keyPress`.
- `ToolKeycap` — tool tier. Cream keycap 28–32px (icon, or icon+label), navy ink, 2px edge; active = stays pressed-in + `ChipPip` when stateful.
- `TertiaryLink` — `type.ui` 600 11px accent (`►` prefix optional); dim variant for CANCEL.
**Screen furniture:** `ScreenHead` (display title + `CountKeycap`) · `CountKeycap` (`brand.gold`) · `Well` (hairline-ruled panel) · `ToolsBar` (grip + `ToolKeycap`s + spacer + `KeycapButton/primary`) · `SectionHeader` (micro caps + optional `TertiaryLink`) · `StatTile` · `PctPill` (`brand.gold` fill, dark-gold ink) · `GTag` (+`/add` dashed) · `ListRow` (`RowIcon` + label + value + chevron) · `Strip` (thumb card + meta + chevron) · `Avatar` (+`DesignBadge` — circular corner badge opening the avatar in the Card editor, PROF-08) · `IdentityBlock` · `ChipPip`.
**Inputs & search:** `SearchField/in-place` (cream inset field; live-filters the current view, COL-09) · `MatchTag` (dev/publisher hit). *(Multi-line/numeric, dropdown/picker/slider/toggle — to design.)*
**States & feedback (§1.6):** `EmptyState/inviting` · `Skeleton` (solid fills) · `LoadError` ("Signal Lost" + RETRY) · `Unavailable` (terminal — person glyph, no retry, MOD-09) · `Offline` + `OfflineStrip` (calm, SYS-10) · `Toast` (transient failure — full-bleed under-header banner, plain words + orange RETRY).
**Currency & commerce (the Store set, store track 2026-06-12):** the **PIXELS mark** (the Customizer currency's in-app face, ECON-01/02 — pixel-gem v3: flat solid facets, opaque ink outline, solid blue glint pixels; gold = value F-02, blue lives **inside the mark only**; grammar PIXELS · 1 PIXEL · ticker PX; replaces the ◈ placeholder app-wide) · `CurrencyCounter` (gold header keycap → Wallet; `/negative` alert-red, ECON-09; tick moment) · `PriceChip` (+`/big`; the adopt chip "1 [gem]", ECON-03) · `BuyBar` (sheet-bottom row; **hold-to-buy** = the instant-PX spend confirm, OQ-046; bridge + disabled states) · `PackTile` (2×2 grid tile w/ **value math** PX-per-$; `+/starter` one-time spanning tile, OQ-044; **$ prices ride `KeycapButton/secondary`** — the only dollars, ECON-01/06) · `LedgerRow` (signed badge · what · when · gem amount; earn/spend/reversal) · `OwnedTag` / `LockedTag` / `EarnedOnlyTag` (earned = gold-**outlined**, never gold-filled — can't read as a price, COSM-04) · `ItemTile` (sample preview + name + type micro + PriceChip/tag) · `DailyBonusBar` (+1 PX claimed ON the Store, OQ-043; `/claimed` quiet) · `AisleIndex` (THE INDEX category rows) · `PreviewStrip` (gold whole-page theme-preview banner, DEV-04) · `PreviewStage` (preview-on-YOUR-stuff: card / the one pocket device / whole screen; pack contents grid for multi-item packs — sticker packs are SHELL items, OQ-047).
**To design (Phase C/D gaps):** text inputs (multi-line/numeric) · dropdown/picker/slider/toggle · segmented control (Discover needs it) · modals/confirm dialogs/sheets · celebration moment (OQ-040) · card back · sticker placed-on-shell preview (OQ-045) · hold-to-buy a11y alternative (OQ-046) · `motion.cardFlip`/`powerOn`/`celebration`.

### 1.6 States & feedback (the §1.8 pattern, visual side)
Every screen's load/empty/error cells resolve to one family (OQ-037; behavior in design-req §1.8). All share the **dashed stepped-card silhouette** so they read as kin, split by intent:
- **Retryable** — `LoadError` "Signal Lost" (network/timeout/5xx): accent **!** + orange `KeycapButton/action-alt` **RETRY**.
- **Terminal** — `Unavailable`: muted grey person-glyph, **no retry**, GO BACK. MOD-09 non-disclosure — blocked/suspended/deleted all collapse here, indistinguishable. **Lone exception:** your *own* block shows **Unblock**.
- **Offline** — `Offline`/`OfflineStrip` (SYS-10): calm wifi-off glyph, **auto-recovers**, never an alarm; your own data stays read-only-usable, writes gated.
- **Loading** — `Skeleton`: **solid** fills (not dashes), so loading never reads as an invitation.
- **Empty** — `EmptyState/inviting`: a doorway, never a dead end (design-req §1.7).
- **Transient** failures (save/publish/purchase) → `Toast`: a **full-bleed banner sliding under the header** — what failed + a plain-words reassurance ("nothing was charged — your pixels are safe") + orange `KeycapButton/action-alt` RETRY where safe to repeat. *(Designed on the Store board; reusable verbatim by every transient write.)*

### 1.7 Inputs & keyboard (OQ-035)
Text entry uses the **system keyboard** — `keyboardAppearance` matched to the active `scr` theme (dark themes → dark keyboard), the focused field **riding just above** it. The nav band may be occluded while typing; that's accepted (typing is a focused sub-task; dismissing the keyboard returns to it). This keeps autocorrect / swipe / dictation / i18n / screen-reader support — the "stay conventional in forms" half of the art-direction split (design-req §1.1). A device-skinned **in-app keycap keyboard** (maximum metaphor) was considered and **deferred** for its autocorrect/swipe/dictation loss + i18n/a11y cost. Goes live with **Add Game**, the first heavy text surface. Field components themselves are §1.5 gaps.

---

## Part 2 — Screens (composition by name)

### 2.1 Collection (3.1)
**Compose.** `DeviceShell` + `NavBand` (Collection active). `ScreenHead`("COLLECTION", `CountKeycap`). Now-Playing hero: `GameCard/hero`(+custom) + meta (`type.micro` NPL label, `type.display` title, `type.body` sub) + `KeycapButton/primary` LOG HOURS; **unset → nudge** ("set your Now Playing" → pick from collection, WTP-03). `ToolsBar`: grip, `ToolKeycap`×4 (search · sort+`ChipPip` · filter · view), spacer, `KeycapButton/primary` ADD (gold + 2/4 step, F-02).
**View modes (COL-07, decision 0012):** the `view` keycap cycles **shelf** (hero rows + per-game stats eyebrow, OQ-033) ↔ **compact grid** (`GameCard/grid`, full faces, no added labels) ↔ **dense list** (`Strip` rows: thumb + title + hours/status — the densest scan). Now-Playing hero persists in all three.
**Tools-bar model (OQ-034):** keycaps *act*, the drawer *configures* — tap search → in-place `SearchField` live-filtering the view (+`MatchTag` on dev/publisher hits, COL-09); tap sort → flip ASC/DESC; tap view → cycle modes; **filter** (multi-choice) opens the pulled-up sort/filter sheet; long-press any keycap opens the sheet at that section. One shared query state between in-place search and the sheet.
**Manual order (OQ-031):** an **Arrange** mode entered from the sort sheet (long-press-drag); manual order is saved as one more sort choice.
**Friend-view (COL-10, decision 0012):** read-only; your own chrome by default + a **"view in their device"** toggle (obvious exit); reached from a friend's Top-5.
**State matrix:** populated (3 modes) ✓ · first-run empty (inviting first-add, AUTH-06) ✓ · Now-Playing-unset nudge ✓ · loading `Skeleton` ✓ · `LoadError`+RETRY ✓ · `OfflineStrip` read-only ✓ · friend-view + chrome toggle ✓ · friend unreachable (`Unavailable`/calm offline) ✓.

### 2.2 Profile (3.5)
**Compose.** `DeviceShell` + `NavBand` (Profile active). `ScreenHead`("PROFILE", `ToolKeycap` **settings/gear** — privacy is *not* here; it lives in Settings, decision 0011). `Well`: `IdentityBlock` (`Avatar`+`DesignBadge` PROF-08, name `type.display`, sub, bio, `GTag`s). `SectionHeader` STATS → `Well` of `StatTile`×6 (+ optional `PctPill`, PROF-07 — every tile renders cleanly without its chip). `SectionHeader` PINNED FAVOURITE → hero row (`GameCard/hero` + meta + `KeycapButton/secondary` VIEW GAME). `SectionHeader` TOP 5 (+`TertiaryLink`) → `GameCard/mini`×5 + `RankChip`s. NOW PLAYING → `Strip`. MY DEVICE → `Strip` w/ `MiniDevice`. `Well` of `ListRow`s (Achievements · Contributions gateways).
**Edit mode:** in-place (identity + curation, PROF-01/02/06/08); Top-5 re-rank via the OQ-031 drag.
**Friend-view (PROF-05, decision 0012):** adds friend count + mutual friends, `KeycapButton/action-alt` ADD FRIEND + COMPARE, Share, overflow Report/Block; hides edit/management; your chrome default + the "view in their device" toggle. **Privacy-limited** non-friend = reduced card.
**State matrix:** self populated ✓ · edit mode ✓ · fresh account (inviting empties, chip-less tiles) ✓ · friend-view + chrome toggle ✓ · privacy-limited ✓ · loading `Skeleton` ✓ · `LoadError`+RETRY ✓ · terminal `Unavailable` (MOD-09; Unblock exception) ✓ · offline (own from cache read-only · friend unreachable calm) ✓.

### 2.3 Store (3.4 · 4.11 · 4.12) — converged board, store track
**Compose.** `DeviceShell` + `NavBand` (Store keycap **permanently gold**; active = pressed + `PipLight`). `ScreenHead`("STORE", `CurrencyCounter`). **Browse:** `DailyBonusBar` (claim +1 PX in-store, OQ-043) → the drop cover (ECON-08) → dense 3-up `ItemTile` grid → **THE INDEX** (`AisleIndex` rows — the full COSM-01 taxonomy incl. **DEVICE SHELLS** (OQ-042) and **PIXELS → Top Up**; COSM-02: the free baseline is not stocked). **Detail = the pulled-up sheet family** — the drop page, single items, and multi-item pack contents are all the same drawer: `PreviewStage` previews on **your own stuff** (your card · the one pocket device wearing a new shell · the **whole page** for screen themes, under `PreviewStrip`) · title row + `PriceChip` · `BuyBar` with **hold-to-buy**.
**Money path:** can't-afford → the **in-sheet bridge** (`PackTile` minis at the point of intent; the native IAP sheet runs **inline**, BUY re-arms in place) · **Top Up** landing (2×2 `PackTile` grid + `PackTile/starter` + per-tile **value math**; `↺ Restore`, OQ-041) · success = **the landed moment** (centered +N · arithmetic · one gold rule · `motion.counterTick`) · failure `Toast` · restore quiet.
**Wallet:** balance hero + `LedgerRow` history (grant · daily claim · adoption · pack · acquire · **refund reversal**) + the **ECON-09 negative variant** (alert-red hero + counter); reached everywhere via `CurrencyCounter`, which the Wallet header drops (the hero IS the counter).
**Ownership:** `OwnedTag` (price never returns) · `LockedTag` (a date, never a price — the drop-window lock) · the **earned-only trophy module** with `EarnedOnlyTag` (COSM-04, never purchasable).
**State matrix:** browse + daily claim (+claimed) ✓ · drop drawer ✓ · item sheets (finish · screen theme · device shell · sticker-pack contents) ✓ · bridge ✓ · Top Up + native IAP sheet ✓ · landed moment / `Toast` failure / restore ✓ · wallet + negative ✓ · ownership ✓ · `Skeleton` ✓ · `LoadError` + RETRY ✓ · `Offline` (browse-from-cache, **writes gated**) ✓ · sticker placed-on-shell preview **deferred** (OQ-045).
**Source:** `store-states.html` (P1–P12 + P1b/P2b). Behavior questions raised → OQ-041..OQ-044, OQ-046, OQ-047 (the inbox; spec-owner batch).

### 2.4 OQ traceability
**Resolved here (decision 0013):** OQ-006 → F-03 + the Keycap system (`KeycapButton`/`ToolKeycap`) · OQ-014 → F-01 · OQ-036 → F-02 (colour-disambiguated step) · OQ-037 → §1.6 · OQ-035 → §1.7 · OQ-031 (Arrange) · OQ-033 (shelf stats) · OQ-034 (tools-bar model) → §2.1 · OQ-012 → resolved (decision 0012; friend-chrome toggle).
**Still open** (owed before the screens that touch them): OQ-007 (break-out → Card editor) · OQ-005 (egg presentation → Achievements) · OQ-038 (offline cache scope, SYS-10) · OQ-045 (sticker placed-on-shell preview → Device editor pass) · OQ-046 (hold-to-buy a11y alternative).

---

## Changelog
| Date | Version | Change |
|---|---|---|
| 2026-06-11 | 0.1 | Phase B draft: foundation rules F-01..07, full token set (shell/screen/brand/type/space/motion), named component catalog incl. the OQ-006 "Mix" button system, Collection + Profile recomposed by name, Phase C/D gap list. |
| 2026-06-11 | 0.2 | **Card plates → `type.ui` (Chakra Petch 700).** Silkscreen (`type.print`) rescoped to sticker print: PlateButton labels, tags, tertiary links. Catalog + H2 mockup updated to match. |
| 2026-06-11 | 0.3 | **F-08: one font per surface.** Chakra Petch = the screen font (PlateButton, tags, links now `type.ui`); Paytone One = the plastic font. **Silkscreen retired.** Catalog + H2 mockup updated. |
| 2026-06-11 | 0.4 | **Buttons → Keycap system** (owner picked Take A; supersedes the Mix). F-03 revised: keycap physics on both surfaces. `PlateButton`/`ToolChip` → `KeycapButton`/`ToolKeycap`; `shadow.plate` → `shadow.key`; `motion.platePress` retired. H2 mockup retrofitted (theme-aware keycap edges via color-mix). |
| 2026-06-11 | 0.5 | **`brand.storeYellow` → `brand.gold`** (generic value marker). `PctPill` now gold-filled (was dashed accent outline). |
| 2026-06-11 | 0.6 | **Brand constants pruned:** `brand.hazard` retired (was Printed-Plate destructive only). **Shell palettes:** Bone removed; **Pink** + **Carbon** added (5 colourways; Carbon flips `shell.silk` light). Tweaks + catalog updated. |
| 2026-06-11 | 0.7 | **ADD keycap → `brand.gold`** (gold = acquire/value actions). Applied in both H2 mockups + catalog. |
| 2026-06-11 | 0.8 | **Synced to the Collection-states + Profile-states passes** (decision 0013): added the **States & feedback** family + **§1.6**, **§1.7 Inputs & keyboard** (OQ-035 system keyboard), `KeycapButton/action-alt` (orange non-card step) + **F-02 colour-disambiguation** (OQ-036), in-place `SearchField`+`MatchTag`, `Avatar`+`DesignBadge` (PROF-08). Recomposed Collection (3 view modes, tools-bar model, Arrange, friend-chrome) + Profile (Settings gear not privacy; friend-view; state matrices). Fixed stale OQ-012 ("open"→resolved) + header version. | OQ-006/012/014/031/033/034/035/036/037 |
| 2026-06-12 | 0.9 | **F-09: no sunken containers** — flat planes; selection = accent border + pip; pressed keycaps + text inputs the named exceptions. Formalizes the 2026-06-10 flat-panels ruling + the Add Game pass-4 report-drawer ruling. |
| 2026-06-12 | 0.10 | **Store + PIXELS formalized (store track, owner-directed):** §1.5 gains the **Currency & Commerce set** — the **PIXELS mark** (pixel-gem v3; replaces the ◈ placeholder app-wide) · `CurrencyCounter` (+negative) · `PriceChip` · `BuyBar` w/ **hold-to-buy** (OQ-046) · `PackTile` (+`/starter`, value math, $ on `/secondary`) · `LedgerRow` · `Toast` (§1.6 transient slot filled) · `OwnedTag`/`LockedTag`/`EarnedOnlyTag` · `ItemTile` · `DailyBonusBar` (OQ-043) · `AisleIndex` · `PreviewStrip` · `PreviewStage`. §1.4 +`motion.holdToBuy`/`counterTick`. New **§2.3 Store** composition + state matrix (lifecycle incl.; sticker-on-shell preview deferred OQ-045); old §2.3 → §2.4. Catalog HTML → **v0.3**. Gaps pruned (toasts · currency counter). Source: `store-states.html` (5 owner rulings, 2026-06-12). |
