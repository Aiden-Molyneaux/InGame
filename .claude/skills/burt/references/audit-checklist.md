# Burt — layered audit checklist

The exhaustive per-layer checklist behind the Foundation Rules in `SKILL.md`. Read during step 2 of
the audit. Order: **Type → Tokens/Fonts → Components → Buttons & Marker → Lifecycle → Standalone-HTML**.
Card plates (`.plate`, print) and the outer artboard chrome (`.canvas-head` / `.caption` /
`.stage-label` / `.artboard-label`) are **exempt from on-screen rules** throughout — they are not app UI.

## 0 · GameCard sizes (F-01) — five sizes, nothing in between
A GameCard is **one of the catalog's 5 sizes** — there is no "scale it to fit" size:

| size | dims | use |
|------|------|-----|
| **/hero** | 138×193 | the hero / inspect card (+custom art, FoilTag) |
| **/grid** | 161×225 | collection 2-up (NowTag) |
| **/cell** | 96×134 | 3-up grid / picker / fan cell (ratified 2026-06-18) |
| **/mini** | 64×89 | dense grids, RankChip/first |
| **/thumb** | 44×62 | rows, peeks — the smallest |

All five hold the **63:88 ratio** — so **a right ratio at a wrong size is still off-guide.** Check the
real `width` (height follows): it must be **138 / 161 / 96 / 64 / 44**. A card below /thumb (e.g. a 28×39
feed "peek") or any in-between size is a **finding** — either snap it to the nearest catalog size
(usually /thumb) or raise the new size as an **owner-ratification** call (never a silent custom size).
`scripts/preflight.sh` flags any `.gcard.*` whose width isn't one of the four. *(Historical drift: some
sibling boards use `cell 60×84` / an old `grid 92×129`; those are off-guide too, not a 5th blessed size.)*

## 1 · Type scale (F-06) — the most-missed layer
On-screen Chakra-Petch (`var(--pk)`) sizes are **only** 21 / 15 / 11 / 9. Role map:

| px | role | used for |
|----|------|----------|
| **21** | `type.display` | headers, hero titles, profile name, deep-view page titles |
| **15** | `type.emphasis` | stat values, strip titles, count keycap, **avatar monograms** |
| **11** | `type.body` | buttons, chips, row titles, subs, links |
| **9** | `type.micro` | section heads, tags, stat labels, timestamps, badges |

Common off-scale culprits and where they map: **8 / 8.5 → 9** · **10 / 12 → 11** · **13 → 11 or 15**
(monograms 15) · **14 → 15** · **16 / 17 → 15 or 21** (page/empty-state titles → 21). Glyph-only
chevrons (`›`, `⋮`) snap to 15. Empty-state / error titles → 21 (display) by default. Card plates keep
their tiny print sizes (e.g. 3.2px) — exempt.

## 2 · Colour tokens (F-08 colour) — flag off-token colour
Use CSS variables / the catalog hexes; flag raw off-token colours on screen. Brand constants
(theme-invariant): **`--accent` #ff3d77 (pink, SHELL only)** · **`--gold` #ffd23f (card-creating only)**
· `--cream` #f5f1e4 · `--navy` #1d2a4a · `--bezel` #14122a · `--alert` #e3414e.
Default shell **TEAL**: `--plastic` #2bb6b0 (hi #3ec9c2 / lo #1f9a94) · `--silk` #0d524e · ink #08433f.
Default screen **MIDNIGHT**: `--scr-bg` #232045 · `--scr-well` #2c2950 · `--scr-tools` #1a1733 ·
**`--scr-accent` #ff9f43 (orange — THE on-screen accent / StateMark)** · `--scr-accent-ink` #2a1430 ·
`--scr-text` #fff · `--scr-dim` #9b97c0 · `--scr-soft` #c9c5e6 · `--scr-grip` #565178 ·
`--scr-chip` #f5f1e4 · `--scr-hairline` rgba(255,255,255,.08) · `--scr-panel` rgba(255,255,255,.065).
**Pink vs orange is load-bearing:** pink `--accent` = the *shell* LED (NavBand pip, power LED) only;
orange `--scr-accent` = every on-screen accent/selection. A pink accent **inside the screen** is a
finding (F-05/F-09). Other shells (GRAPE/SUNSET/PINK/CARBON) and themes (Deep Sea/Berry; light:
Paper/Mint/Lilac) exist — most boards build the default TEAL+MIDNIGHT.

## 3 · Fonts (F-08) — exactly two voices
- Screen text → **Chakra Petch** (`var(--pk)`); plastic labels → **Paytone One** (`var(--shell)`).
- Loaded via `<link … media="print" onload="this.media='all'">` **plus** a `<noscript>` fallback link.
- **No third font** — Silkscreen is retired (v0.3); no system-font fallback, no external icon font.
- SVG is **hand-drawn / built-in only** — no external icon library, no `<img>`.

## 4 · Locked component names (§1.5) — reuse, don't reinvent
A new screen should **compose from the catalog** and reuse these names; a genuinely-new component is
allowed but must be **flagged for gate ratification** (owner-ratification note), never silently dropped
in as a near-dupe of an existing one. The roster (working names; confirm against the catalog + the
page's converged board):
- **Shell/nav:** `DeviceShell` · `NavBand` / `NavKeycap` (5 tabs — **Store = gold, Collection = pink**,
  active = pressed + `PipLight`) · `ScreenHead`.
- **Cards:** `GameCard` (`/hero` `/grid` `/cell` `/mini` `/thumb` `/custom`) · `FoilTag` · `NowTag` ·
  `RankChip` · `CardDetail` · `AdoptCount`.
- **Rows/containers:** `Strip` · `ListRow` · `SectionHeader` · `Well` · `EmptyState`.
- **Inputs/search:** `SearchField` · `ResultRow` · `MatchTag`.
- **Keycaps/controls:** `KeycapButton` · `ToolKeycap` · `CountKeycap` · `TertiaryLink` ·
  `SegmentedKeycap` (Discover toggle) · `SectionSwitch` (game-page / device rail) · `Toggle`.
- **Sheets:** `ConfirmSheet` · `ReportSheet` / `ReportConfirm` · the bottom-sheet/drawer family.
- **Page-specific (reuse where they fit):** `QueueRow` · `ReleaseRow` / `NotifyToggle` · `RecRow`
  (Discover); `TriageCard` / `FeedbackConfirm` / `LogAttach` (Settings); `CanvasStage` / `AssetShelf`
  / `ElementTray` / `LayerRack` / `PrintRitual` (Canvas); `StickerStage` / `TransformBox` /
  `PlacedSticker` / `StickerTray` / `SavedLook` / `LooksGrid` (Device).
- **The marker:** `StateMark` (the orange pixel-square, on-screen selection) — **not** `ChipPip` /
  `PipLight`, which are the **shell** LED only (F-05). The StateMark rename is in-flight (per
  SCREEN-STATUS); the old `ChipPip`/`PipLight` names may linger in prose — the *on-screen* selection
  must render as the orange square regardless.

## 5 · Buttons & marker (F-02 / F-03 / F-09)
- **Flat keycaps (owner pick, 2026-06-17 — Inset Recess):** on-screen `KeycapButton` / `ToolKeycap` /
  chips are **flat** (idle flat fill); **pressed/selected = darkened fill + inner shadow, NO travel,
  NO raised drop-edge**. No `filter: drop-shadow(0 Npx 0 …)`, no press `translateY` on screen controls.
- **Shell NavBand keys stay physical:** `box-shadow: 0 4px 0 …` + `.nav-item.active .nav-btn { transform: translateY(3px) }`. This is correct — never flag it.
- **Colour intent (F-02):** gold+step = **acquisitive** (create a card · move PIXELS · primary add-to-collection);
  orange+step = prominent **non-acquisitive** (RETRY · ADD FRIEND · SHARE); the avatar badge (no step) is exempt.
  **No gold on a non-acquisitive control.**
- **Selection marker (F-09):** an **accent border + the orange StateMark** (square, corner-notched,
  `--scr-accent`). Never a pink pip, never an inset recess (except the pressed-keycap exception).
- The **C5 step** on cards/buttons is a `clip-path` (TL+BR notch), **not** a `border-radius` (F-07).

## 6 · Lifecycle / states (§1.8 / §1.6) — if the board claims them
A converged states board should render the lifecycle family; a draft may defer them **with a caption
note**. The grammar (reuse verbatim from the sibling boards):
- **`Skeleton`** — solid quiet fills (`--scr-panel`); **dashes are reserved for invitations**, not loading.
- **`LoadError` "Signal Lost" + RETRY** — the retryable error (the dashed `err-card` + bang + RETRY).
- **`Unavailable`** — terminal, **no retry** (MOD-09 collapse; "Unblock" is the lone exception).
- **`Offline`** — calm strip; **reads from cache, writes gated** (the `gated` dim + a reconnect note), SYS-10.
Check the offline write-gating actually dims the write affordances, and that the error copy matches
(retryable vs terminal).

## 7 · Standalone-HTML hygiene
- **Self-contained** — Claude Design exports lack local deps, so each artboard is standalone (inline
  `<style>`, inline SVG `<defs>`). No external `<script src>` / non-font `<link href>`.
- **No raster artifacts** — no `.png` / `.jpg` / `.webp` / `<img>`; the repo is **HTML-only** (and
  Headless-Edge self-check screenshots must be deleted before the turn ends — never committed).
- **The Store nav key stays gilt/yellow**; Collection pink (the locked NavBand colours).
- **No PIXELS mark / `ic-pix`** on a non-commerce screen (it belongs to the Store/economy surfaces).

## 8 · Pre-flight grep patterns (the mechanical net — candidates, confirm by reading)
`scripts/preflight.sh` runs these. They over-report (greps can't read intent); every hit is a place to
look, not a confirmed violation. Exclusions noted.

- **F-06 off-scale type:** `font(-size)?:[^;}]*(8|8\.5|10|10\.5|12|12\.5|13|14|16|17|18|19|20)px[^;}]*var\(--pk\)`
  — exclude lines matching `\.plate|canvas-head|\.caption|stage-label|artboard-label`.
- **F-08 foreign font:** `font[^;]*(arial|helvetica|times|courier|silkscreen|system-ui|-apple-system|monospace|serif|sans-serif)` (case-insensitive); and confirm the `media="print" onload` link + `<noscript>` exist.
- **F-02 gold:** `--gold|#ffd23f|#f0d36e` — confirm each is **acquisitive** (card-creating · PIXELS economy · primary add-to-collection) or the Store nav key; flag gold on a **non-acquisitive** `.btn`/key (SHARE, nav, a generic CTA).
- **F-03 raised-edge (should be flat on screen):** `filter:\s*drop-shadow\(0 [0-9]+px 0|box-shadow:[^;]*\b0 3px 0|translateY` — exclude `.nav-btn|nav-item` (the shell keys legitimately travel).
- **F-05/F-09 pink on screen:** `--accent\b|#ff3d77` used as a `background` on a pip/dot/marker — confirm it is the shell LED, not on-screen selection.
- **F-07 on-screen radius:** `border-radius:\s*[1-9]` — exclude the shell classes (`\.device|\.screen|screen-bezel|\.nav-btn|\.screw|\.led|mini-dev|power`); anything else is a candidate.
- **Raster / external deps:** `\.png|\.jpe?g|\.webp|<img|<script src|<link [^>]*href="(?!https://fonts)`.
- **PIXELS on non-commerce:** `ic-pix|PIXELS` — confirm the screen is a Store/economy surface.

## Notes on judgment calls (don't over-flag)
- **Gold as non-button decoration** (an achievement/trophy glyph, a rank chip) is established sibling
  grammar — list it as **owner-ratification**, not a violation, unless it's a *button*.
- **"It matches discover-states / the other boards"** is **not** a conformance argument — the
  `*-states.html` boards carry known drift (OQ-066 type, OQ-067 pip). Audit to the catalog + the
  in-flight directives, not to a peer board.
- A finding already in `open-questions.md` is reported as **"known — OQ-0xx"** (so the owner sees it's
  tracked), still listed, but never presented as a fresh surprise.
