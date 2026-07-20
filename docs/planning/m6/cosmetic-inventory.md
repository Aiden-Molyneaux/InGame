# M6 cosmetic inventory — the pre-beta design-round sitting artifact

> **What this is.** The owner wants "another round of new designs for each cosmetic category" before
> beta — some destined for beta, some full-launch, some post-launch — and wants "an inventory and feel
> that I have the right ones in the app for launch" first. This is that inventory: the full current
> roster by category, a balance table showing thin spots, the slot/tier machinery, a gap analysis
> (suggestions only — **the owner decides**), and a blank grid to fill at the sitting.
>
> **Sources of truth read for this doc:** `apps/api/src/config/cosmetics.ts` (server `COSMETIC_CATALOG`
> — the priced, ownable roster) · `apps/mobile/src/styler/roster.ts` (Styler client mirror — frames,
> effects, finishes, nameplates, fonts, inks) · `apps/mobile/src/theme/palettes.ts` (Device editor client
> mirror — shells, screen themes) · `apps/mobile/src/components/device/deviceStickers.tsx` (stickers —
> **client-only, no server catalog entry at all**, see §6 finding) · `apps/mobile/src/render/buildCard.ts`
> (render code — the visual descriptions below are read off the actual drawing logic, not guessed).
> Filed 2026-07-20.

---

## 1. Full current roster, by category

Tier key: **free** (0 PX) · **standard** (3 PX) · **big** (6 PX) · **showpiece** (8 PX) · **ultimate**
(10 PX). Two tiers — **accent** (1 PX) and **trim** (2 PX) — plus **deluxe** (4 PX) exist in the
7-tier ladder (`COSMETIC_TIERS`) but hold **zero items in every category** (launch-empty seed
vocabulary per decision 0075, pending this content pass — see §4).

### Frames (15 — Styler §FRAME · `type: 'frame'`)

| id | Name | Tier | PX | Colour-custom | Visual (read off `buildCard.ts` `frameNodes`) |
|---|---|---|---|---|---|
| `clean` | CLEAN | free | 0 | – | No border — the bare card face. |
| `thin-line` | LINE | free | 0 | – | Plain lavender (`#c9c5e6`) stroked band, no ornament. |
| `double-line` | DOUBLE LINE | free | 0 | – | Two concentric muted-purple (`#9b97c0`) rules — full outer + half-width inner, offset in. The band-thickness reference. |
| `ticket-notch` | TICKET | free | 0 | – | Cream (`#f3ecd9`) band with two stroked circular "punch" notches at the left/right mid-edges. |
| `stub` | STUB | free | 0 | – | Same ticket-notch band, in accent-orange (`#ff9f43`) — the orange twin of TICKET, kept distinct on purpose. |
| `lime` | LIME | free | 0 | – | Plain lime-green (`#a9e34b`) thin-line band. |
| `bubblegum` | BUBBLEGUM | free | 0 | – | Plain magenta-pink (`#e85ad0`) thin-line band. |
| `thin-gold` | GOLD | standard | 3 | – | Plain gold (`#e8c14a`) thin-line band. |
| `chrome` | CHROME | standard | 3 | – | Silver/lavender (`#d8d5ec`) double-line band. |
| `ember-glow` | EMBER GLOW | standard | 3 | – | Red (`#ff5a5a`) band with a soft blurred bloom behind it. |
| `plasma` | PLASMA | standard | 3 | – | Same glow treatment as EMBER GLOW, in cyan-blue (`#5ad0ff`). |
| `ornate-gold` | ORNATE GOLD | standard | 3 | – | Gold vertical-gradient band + a fine cream pinstripe inlay + 4 corner diamond rosettes. |
| `holo-foil` | HOLO FOIL | standard | 3 | – | Diagonal 4-stop iridescent spectrum band (pink → cyan → gold → pink). |
| `marquee` | MARQUEE | showpiece | 8 | – | Dim gilded band in the static keyframe; the bright chase-light only animates in the live editor (`render/animated.tsx`). |
| `marquee-ultimate` | MARQUEE ULTIMATE | **ultimate** | 10 | **yes** | Same MARQUEE design, band colour is the owner's free pick. |

### Effects (9 — Styler §EFFECT · `type: 'effect'`)

| id | Name | Tier | PX | Colour-custom | Visual (`effectOverlay`) |
|---|---|---|---|---|---|
| `none` | NONE | free | 0 | – | No overlay. |
| `soft-glow` | SOFT GLOW | free | 0 | – | Soft white-blue radial glow, centered high on the card. |
| `gradient-sheen` | SHEEN | free | 0 | – | One diagonal light band sweeping the face. |
| `dust` | DUST | free | 0 | – | ~26 floating cream motes drifting over the card (deterministic). |
| `vignette` | VIGNETTE | free | 0 | – | Radial black darkening at the card's outer edges. |
| `halftone` | HALFTONE | standard | 3 | – | Regular grid of small dark dots — a comic-print dot-screen. |
| `scanline` | SCANLINE | standard | 3 | – | Horizontal 1px black CRT scanlines. |
| `frost` | FROST | showpiece | 8 | – | Icy corner blooms + animated crystalline shards spiking inward from each corner. |
| `embers` | EMBERS | showpiece | 8 | – | Warm orange glow rising from the bottom + floating ember motes. |

### Finishes (5 — Styler §FINISH · `type: 'finish'`)

| id | Name | Tier | PX | Colour-custom | Visual (`finishOverlay`) |
|---|---|---|---|---|---|
| `none` | STANDARD | free | 0 | – | No overlay — the bare face. |
| `matte` | MATTE | free | 0 | – | Flat dark anti-gloss wash that kills highlights. |
| `linen` | LINEN | standard | 3 | – | Faint woven crosshatch texture. |
| `holographic` | HOLOGRAPHIC | showpiece | 8 | – | Banded diagonal rainbow spectrum + a counter-diagonal white shimmer streak. |
| `metallic` | METALLIC | showpiece | 8 | – | Brushed-gold diagonal hairline strokes + one strong specular streak. |

### Nameplates (9 — Styler §PLATE · `type: 'nameplate'`)

| id | Name | Tier | PX | Colour-custom | Visual (`buildPlate`) |
|---|---|---|---|---|---|
| `slab` | SLAB | free | 0 | – | Plain flat-bottom rectangle — the default. |
| `ribbon` | RIBBON | free | 0 | – | Hexagonal banner, pointed left/right tips. |
| `bevel` | BEVEL | free | 0 | – | Rectangle with angled-cut top-left/top-right corners. |
| `capsule` | CAPSULE | free | 0 | – | Fully rounded pill shape. |
| `tab` | TAB | free | 0 | – | Rectangle + a small raised tab protruding above the top-left edge. |
| `arch` | ARCH | free | 0 | – | Rounded top corners, flat bottom — "a cabinet marquee." |
| `dogtag` | DOGTAG | free | 0 | – | Hexagonal pointed dog-tag shape (sharper point than RIBBON). |
| `brass` | BRASS | standard | 3 | – | Metallic gold gradient plate (`BRASS_RAMP`: `#f6d879` → `#c9971f` → `#8a6410`) + a bright top-edge bevel highlight. |
| `brass-ultimate` | BRASS ULTIMATE | **ultimate** | 10 | **yes** | Same BRASS shape/ramp treatment, hue is the owner's free pick (`brassPlateRamp()` derives light/dark stops from it). |

### Fonts (8 — Styler §TITLE · `type: 'font'`) + curated inks

| id | Name | Tier | PX | Colour-custom | Visual |
|---|---|---|---|---|---|
| `clean-sans` | CHAKRA | free | 0 | – | Clean geometric sans (Chakra Petch). |
| `bold-display` | PAYTONE | free | 0 | – | Bold rounded display face (Paytone One). |
| `press-start` | PIXEL | free | 0 | – | 8-bit pixel face (Press Start 2P), drawn at 0.6× optical scale. |
| `bitter` | SLAB | standard | 3 | – | Slab-serif face (Bitter). |
| `space-mono` | MONO | standard | 3 | – | Monospace face (Space Mono). |
| `pacifico` | SCRIPT | standard | 3 | – | Flowing script face (Pacifico). |
| `stencil` | STENCIL | standard | 3 | – | Stencil-cut face (Allerta Stencil). |
| `pacifico-ultimate` | SCRIPT ULTIMATE | **ultimate** | 10 | **yes** | Same Pacifico face; the title **ink** is a free owner pick instead of the curated 6 below. |

**Curated title inks** (not a priced catalog type — a free, fixed 6-colour set every non-ultimate font
is server-side forced to): CREAM `#f3ecd9` · MIDNIGHT `#14121f` · GOLD `#e8c14a` · PINK `#e85ad0` ·
CYAN `#7ad0e8` · MOSS `#a8c980`.

### Device shells (5 — Device editor §SHELL · `type: 'device_shell'`, client mirror `theme/palettes.ts`)

| id | Name | Tier | PX | Visual |
|---|---|---|---|---|
| `teal` | TEAL | free | 0 | Teal/turquoise plastic body — the canonical default. |
| `grape` | GRAPE | free | 0 | Purple plastic body. |
| `sunset` | SUNSET | big | 6 | Orange sunset-gradient plastic body. |
| `pink` | PINK | big | 6 | Pink plastic body. |
| `carbon` | CARBON | showpiece | 8 | Dark grey/black plastic body — the one shell with **grey** keycaps instead of cream. |

### Screen themes (6 — Device editor §THEME · `type: 'screen_theme'`, client mirror `theme/palettes.ts`)

| id | Name | Tier | PX | Visual |
|---|---|---|---|---|
| `midnight` | MIDNIGHT | free | 0 | Dark navy/purple screen — the canonical default. |
| `paper` | PAPER | free | 0 | Light cream/paper screen — the light-theme default. |
| `deepsea` | DEEP SEA | big | 6 | Dark teal-green screen. |
| `berry` | BERRY | big | 6 | Dark magenta/purple screen. |
| `mint` | MINT | big | 6 | Light mint-green screen. |
| `lilac` | LILAC | big | 6 | Light lilac/lavender screen. |

### Stickers (8 — Device editor §STICKERS · declared type `shell_sticker_pack`, **client-only roster**)

All eight ship `tier: 'basic'` (free) with **no price, no pack, and no server catalog row of any
kind** — see the drift finding in §6.

| id | Name | Tone | Visual |
|---|---|---|---|
| `rocket` | ROCKET | cream | Line-art rocket glyph. |
| `star` | STAR | gold | Filled star glyph (reused from the Essentials icon set). |
| `heart` | HEART | accent | Filled heart glyph (reused from the Essentials icon set). |
| `bolt` | BOLT | gold | Filled lightning-bolt glyph (reused from the Essentials icon set). |
| `cassette` | CASSETTE | cream | Line-art cassette-tape glyph. |
| `saturn` | SATURN | cream | Line-art ringed-planet glyph. |
| `cat` | NEON CAT | accent | Line-art cat-face glyph. |
| `rainbow` | RAINBOW | gold | Line-art nested rainbow arcs. |

**Drift check result:** the client rosters (`roster.ts`, `palettes.ts`) and the server
`COSMETIC_CATALOG` were cross-read id-for-id and tier-for-tier for frames/effects/finishes/
nameplates/fonts/shells/themes — **every id and tier matches exactly, no drift found** in those 7
categories. The one real mismatch is structural, not a typo — see §6.

---

## 2. Category balance table (counts by tier)

| Category | free | standard (3) | big (6) | showpiece (8) | ultimate (10) | **Total** |
|---|---|---|---|---|---|---|
| Frame | 7 | 6 | 0 | 1 | 1 | **15** |
| Effect | 5 | 2 | 0 | 2 | 0 | **9** |
| Finish | 2 | 1 | 0 | 2 | 0 | **5** |
| Nameplate | 7 | 1 | 0 | 0 | 1 | **9** |
| Font | 3 | 4 | 0 | 0 | 1 | **8** |
| Device shell | 2 | 0 | 2 | 1 | 0 | **5** |
| Screen theme | 2 | 0 | 4 | 0 | 0 | **6** |
| Sticker (client-only) | 8 | 0 | 0 | 0 | 0 | **8*** |
| **Server catalog total** (excl. stickers) | **28** | **14** | **6** | **6** | **3** | **57** |

\* Stickers hold no server catalog row at all — the 8 total is a client-side count, not a priced
tier count. **29 premium items** total across the priced catalog (14 standard + 6 big + 6 showpiece +
3 ultimate), matching the `cosmetics.ts` file banner.

**Thin spots visible at a glance:**
- **Finish** is the smallest priced category (5 items) and its free tier is binary — STANDARD or MATTE.
- **Nameplate** and **Font** both have **zero showpiece items** — their premium ladder jumps straight
  from standard (3 PX) to ultimate (10 PX), skipping the 8 PX rung entirely.
- **Device shell** and **Screen theme** both have **zero standard-tier items** — their premium ladder
  starts at big (6 PX), skipping the 3 PX rung entirely.
- **Screen theme** has no showpiece and no ultimate item at all.
- **Sticker** has no premium item at all, despite a storefront aisle built to sell one (§6).
- **accent (1 PX), trim (2 PX), deluxe (4 PX)** are empty in every single category — the biggest open
  canvas for this design round.

---

## 3. Slots and machinery

- **Styler exposes** (`components/styler/SectionChips.tsx`): FRAME · EFFECT · FINISH · PLATE
  (nameplate) · TITLE (font + ink) — 5 sections, one closed attribute per page.
- **Device editor exposes** (`components/device/DeviceSectionRail.tsx`): SHELL · THEME · STICKERS ·
  LOOKS — 4 sections. LOOKS isn't its own cosmetic category — it's a saved shell+theme+sticker
  snapshot (`SavedLook`), not a purchasable slot.
- **Storefront `AisleIndex`** (`components/commerce/AisleIndex.tsx`) lists 8 browse aisles keyed to
  `CosmeticType`, one per server category — `frame · effect · finish · nameplate · font ·
  device_shell · screen_theme · shell_sticker_pack` — plus the PIXELS top-up row. The
  `shell_sticker_pack` aisle always renders 0 items (§6).
- **Tier-to-category coverage:** `accent`/`trim`/`deluxe` = empty everywhere · `big` = device_shell +
  screen_theme **only** · `showpiece` = frame, effect, finish, device_shell **only** (never nameplate/
  font/screen_theme) · `ultimate` = frame, nameplate, font **only** (never effect/finish, by design —
  see below).
- **Ultimate flag mechanics (decision 0080, one line):** a per-design `colorCustomizable` flag on a
  catalog entry lets the owner free-pick that design's colour via the shared ColorPicker in the
  Styler/Canvas; it's minted as a **separate 10-PX SKU alongside** the design's normal-tier version
  (no promotion, no grandfathering) — effects and finishes are deliberately excluded from Ultimate at
  the beta cut (their colour would need a cross-user runtime-overlay descriptor, an M7 seam per 0080).

---

## 4. Gap analysis for the owner's eye

*(All framed as "consider" — nothing here is a decision. The owner calls it at the sitting.)*

- **Consider:** FRAME's only showpiece item (MARQUEE, 8 PX) is gold — the same hue family as 2 of its
  6 standard frames (GOLD, ORNATE GOLD) and the ultimate SKU. 4 of 15 frames read gold; the showpiece
  rung reads as "more gold" rather than a distinct colour statement. A cool-toned showpiece frame
  (blue/cyan/silver) would balance the ladder against PLASMA sitting only at standard.
- **Consider:** NAMEPLATE and FONT both skip showpiece entirely — a player climbing either ladder goes
  straight from a 3 PX item to a 10 PX item with nothing at 8 PX to build toward first.
- **Consider:** DEVICE SHELL and SCREEN THEME both skip standard entirely — their premium floor is
  6 PX. At the 0074 daily-ladder pay rate (+1..+6 PX/day), a new player may go several days before
  affording a first shell or theme purchase, with no cheaper stepping-stone.
- **Consider:** FINISH is the thinnest priced category (5 items, 2 free) — with only 12 beta testers,
  expect most decks to read as "matte or nothing" until someone spends into LINEN/HOLOGRAPHIC/METALLIC.
- **Consider:** DEVICE SHELL's free tier is just 2 colours (TEAL, GRAPE) — the shell is one of the
  first things a brand-new account sees; two options is a thin first impression for launch.
- **Consider (the big one): the STICKER PACKS aisle is structurally empty.** `shell_sticker_pack` is a
  fully wired `CosmeticType` — it has a label, an aisle row, a taxonomy entry — but `COSMETIC_CATALOG`
  has **zero rows of that type**. The 8 stickers that exist (ROCKET, STAR, HEART, BOLT, CASSETTE,
  SATURN, NEON CAT, RAINBOW) are free/basic, hard-coded client-side, with no price, no pack grouping,
  and no acquire flow — a beta tester who taps STICKER PACKS finds an empty shelf. The original store
  mockups (`store-states.html`, decision 0017/OQ-047) describe sticker packs as purchasable **shell**
  items with a "12-sticker starter pack" contents grid; only 8 individual stickers ever shipped, and
  none of them are packaged or priced. This category has shipped nothing to sell — it's the most open
  slot in the whole roster for this design round.
- **Consider:** 3 whole price rungs (accent 1 PX, trim 2 PX, deluxe 4 PX) sit empty across all 7 priced
  categories — the largest open canvas here. Candidates: a genuinely cheap "starter" rung under
  standard (accent/trim), or using deluxe as the missing showpiece-adjacent step for nameplate/font/
  screen_theme.
- **Consider:** EFFECT's and FINISH's showpiece pairs (FROST/EMBERS, HOLOGRAPHIC/METALLIC) already
  read as matched hot/cold or light/dark pairs — worth deciding whether new showpiece designs in other
  categories should follow that same "one warm, one cool" convention, or break from it deliberately.

---

## 5. Blank decision grid (fill at the sitting)

### Frames

| NAME | CATEGORY | TIER | BETA / FULL-LAUNCH / POST-LAUNCH | NOTES |
|---|---|---|---|---|
| | Frame | | | |
| | Frame | | | |
| | Frame | | | |
| | Frame | | | |
| | Frame | | | |
| | Frame | | | |
| | Frame | | | |
| | Frame | | | |

### Effects

| NAME | CATEGORY | TIER | BETA / FULL-LAUNCH / POST-LAUNCH | NOTES |
|---|---|---|---|---|
| | Effect | | | |
| | Effect | | | |
| | Effect | | | |
| | Effect | | | |
| | Effect | | | |
| | Effect | | | |
| | Effect | | | |
| | Effect | | | |

### Finishes

| NAME | CATEGORY | TIER | BETA / FULL-LAUNCH / POST-LAUNCH | NOTES |
|---|---|---|---|---|
| | Finish | | | |
| | Finish | | | |
| | Finish | | | |
| | Finish | | | |
| | Finish | | | |
| | Finish | | | |
| | Finish | | | |
| | Finish | | | |

### Nameplates

| NAME | CATEGORY | TIER | BETA / FULL-LAUNCH / POST-LAUNCH | NOTES |
|---|---|---|---|---|
| | Nameplate | | | |
| | Nameplate | | | |
| | Nameplate | | | |
| | Nameplate | | | |
| | Nameplate | | | |
| | Nameplate | | | |
| | Nameplate | | | |
| | Nameplate | | | |

### Fonts

| NAME | CATEGORY | TIER | BETA / FULL-LAUNCH / POST-LAUNCH | NOTES |
|---|---|---|---|---|
| | Font | | | |
| | Font | | | |
| | Font | | | |
| | Font | | | |
| | Font | | | |
| | Font | | | |
| | Font | | | |
| | Font | | | |

### Device shells

| NAME | CATEGORY | TIER | BETA / FULL-LAUNCH / POST-LAUNCH | NOTES |
|---|---|---|---|---|
| | Device shell | | | |
| | Device shell | | | |
| | Device shell | | | |
| | Device shell | | | |
| | Device shell | | | |
| | Device shell | | | |
| | Device shell | | | |
| | Device shell | | | |

### Screen themes

| NAME | CATEGORY | TIER | BETA / FULL-LAUNCH / POST-LAUNCH | NOTES |
|---|---|---|---|---|
| | Screen theme | | | |
| | Screen theme | | | |
| | Screen theme | | | |
| | Screen theme | | | |
| | Screen theme | | | |
| | Screen theme | | | |
| | Screen theme | | | |
| | Screen theme | | | |

### Stickers (packs)

| NAME | CATEGORY | TIER | BETA / FULL-LAUNCH / POST-LAUNCH | NOTES |
|---|---|---|---|---|
| | Sticker pack | | | |
| | Sticker pack | | | |
| | Sticker pack | | | |
| | Sticker pack | | | |
| | Sticker pack | | | |
| | Sticker pack | | | |
| | Sticker pack | | | |
| | Sticker pack | | | |
| | Sticker pack | | | |
| | Sticker pack | | | |

---

## 6. Cross-references

- **Decision [0068](../../decisions/0068-roster-expansion-animation-driver.md)** — the font/frame/
  effect/finish/nameplate roster expansion that put most of §1's items in the app (all shipped
  `tier: 'basic'` at the time; re-tagged by 0075).
- **Decision [0069](../../decisions/0069-button-convention-ratification.md)** — button/colour
  convention ratification (the cream-secondary + gold-action rules the storefront's PriceChip/
  ScreenButton treatments follow).
- **Decision [0080](../../decisions/0080-m6-w5-ultimate-cosmetics.md)** — the Ultimate
  colour-customizable tier mechanics (§3 above).
- **[`design-spec.md` §1.5](../../design/design-spec.md)** — the component catalog; its
  `PackTile`/`PreviewStage` entry is the source for the "sticker packs are SHELL items" framing (OQ-047)
  cited in §6's drift finding.
- **[`ach-starter-content-candidates.md`](ach-starter-content-candidates.md)** — the precedent for how
  a content-candidate sitting document is structured in this repo (owner-reacts-to-a-sheet pattern,
  not author-from-blank); this doc follows the same shape for cosmetics.
- **[`cosmetics-ledger.md`](../../design/cosmetics-ledger.md)** — the historical record of every
  cosmetic ever added/retired (BRACKETS, PIXEL, GRAIN, SUBTLE GLOSS); consult before reviving a
  retired name/kind at this sitting.
