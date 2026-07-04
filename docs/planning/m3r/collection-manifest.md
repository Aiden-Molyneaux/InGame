# collection — screen manifest (from collection-states.html, 2026-07-03)

> **Surface:** R1-1 Collection (THE FIRST ARTICLE). **Board:** `docs/design/mockups/collection/collection-states.html` (C5 v2, Teal shell · Midnight screen).
> **Code:** `apps/mobile/app/(tabs)/collection.tsx` + `src/components/{ScreenHead,GameCard,ScreenButton,ToolButton,SearchField,PulledSheet,TextField,GenreTag,TertiaryLink,StateMark}`.
>
> **Scope filter: M3-R.** Elements owned by later milestones are listed and marked `EXPECTED(<milestone> · <ID/cite>)` — parvati must not flag them, the builder must not build them. Items the owner accepted as-is are marked `LOCKED(§0.n)` so nobody "fixes" them. Every row cites its board evidence as `collection-states.html:<line>` (abbreviated `:<line>`).
>
> **Status legend:** `OWED` = built/verified this pass · `FIX(S3-x)` = an R1-1 item changed this pass · `PRE` = pre-existing, correct, untouched · `EXPECTED(…)` = later-milestone, not built · `LOCKED(§0.n)` = owner-accepted, do not change · `GAP` = divergence from board, declared (see §Declared divergences).

---

## Shared chrome (every state — the DeviceShell frame, board `:38–71`, `:522–528`)

The device shell / NavBand / top-band render from `DeviceShell` + `NavBand` + `NavKeycap` (§5.1), one layer up from this screen (`app/(tabs)/_layout`). Not re-verified here except where R0/R1-5 touch them. Collection is the active tab: nav COLLECTION keycap pressed + pink `PipLight` (`:525`), pink accent cap tint (`.nav-btn.collection`, `:65`). Shell-frame polish (S1-a/b/c/d, S6-b) is **R1-5**, not R1-1.

| # | Element | Component | Variant/size | Docks | Copy | Status |
|---|---------|-----------|--------------|-------|------|--------|
| C1 | Device frame + screws + top-band (POWER/logo/grille) | DeviceShell | teal | wraps screen | INGAME | PRE (`:38–55`) |
| C2 | Nav band (5 keycaps, COLLECTION active) | NavBand·NavKeycap | active=pressed+PipLight | below screen | STORE·DISCOVER·COLLECTION·PROFILE·FRIENDS | PRE (`:522–528`) · R0-3 native shadow verified device @ R2 |

---

## State: shelf — the default populated view (board `:727–841` · **decision 0061 — the showcase**)

Screen head + the Now-Playing hero + the shelf-stack + the ToolsBar + gold ADD. This is the default `view === 'shelf'`. **Model (decision 0061, 2026-07-04 — supersedes 0057):** the shelf is **the showcase** — the Now-Playing hero over a **stack where every entry gets the hero treatment** (full hero-size face + stat-line *N HRS · STATUS* · title · catalog line *dev · year · genre*); LOG HOURS stays hero-exclusive; the ▶ NOW tag marks the pinned game in the stack. This is the board's "View mode — shelf (the showcase)" artboard (`:753–809`), restoring OQ-033/decision 0013. *(The earlier 0057 re-base — shelf = 2-up bare faces — was the owner's shelf/grid mix-up, corrected at the R1-1 first-article review; the 2-up faces belong to GRID.)*

| # | Element | Component (component-map) | Variant/size | Docks (section order) | Copy | Status |
|---|---------|---------------------------|--------------|----------------------|------|--------|
| 1 | Screen title | `ScreenHead` | display 21 (F-06) | head, left | "COLLECTION" | PRE (`:738`) |
| 2 | Count keycap | `CountTag` (display-only, gold) | micro 9 | head, right | unfiltered "48 GAMES" · **§0.3 copy** | **FIX(S3-j)** (`:738`) |
| 3 | Now-Playing hero card | `GameCard` | hero **138×193 (decision 0057's stated size; build `collection.tsx` heroCard matches)**, `custom`+`FoilTag` | hero row, left | — | PRE card / EXPECTED(M4·CARD-22 foil/custom art) (`:741–744`) |
| 4 | Hero eyebrow | Text (npl) | micro 9, scr.accent | hero-meta L1 | "NOW PLAYING" | PRE (`:746`) |
| 5 | Hero stat-line | Text | micro 9, dim | hero-meta L2 | "86 HRS · PLAYING" | PRE (`:747`) |
| 6 | Hero title | Text | display 21 | hero-meta L3 | "MARATHON" | PRE (`:748`) |
| 7 | Hero catalog line | Text | micro 9, dim | hero-meta L4 | "BUNGIE · 2025 · SHOOTER" | PRE (`:749`) |
| 8 | LOG HOURS button (hero-only) | `ScreenButton` primary (peach) + "+" icon | body 11 | hero-meta L5 | "LOG HOURS" | PRE / opens LogHoursSheet (`:750`) |
| 9 | Shelf-stack — **every entry at hero treatment** (card + stat-line · title · catalog line) | `GameCard` hero-size + meta | 138×193 + meta col | scroll body | stat · title · catalog | **FIX(0061)** built this round — the showcase stack (`:753–809`), reversing the 0057 bare-faces model |
| 10 | ▶ NOW tag on the pinned stack card | `GameCard nowPlaying` tag | micro 9, scr.accent | on stack card | "▶ NOW" | **FIX(0061)** (`:766`) |
| 11 | ToolsBar grip (ARRANGE shortcut) | (board `.grip`) | — | tools, far-left | — | EXPECTED(COL-13 ARRANGE · OQ-031 · `:812`) — **not built** |
| 12 | Search tool | `ToolButton` icon-only (magnifier SVG) | cream 32×30 | tools | — (a11y "Search") | **FIX(S3-n)** (`:813`) |
| 13 | Sort tool | `ToolButton` icon-only (up/down arrows SVG) + StateMark pip when active + asc/desc emphasis | cream 32×30 | tools | — (a11y "Sort") | **FIX(S3-n/i)** (`:814`) |
| 14 | Filter tool | `ToolButton` icon-only (funnel SVG) + StateMark pip when active | cream 32×30 | tools | — (a11y "Filter") | **FIX(S3-n/k)** (`:815–816`, board draws "ALL" text — overridden, see §divergences) |
| 15 | View tool | `ToolButton` icon-only (current-mode SVG) + StateMark pip when ≠ shelf | cream 32×30 | tools | — (a11y "View") | **FIX(S3-n)** (`:816`) |
| 16 | Gold ADD keycap | `ScreenButton/add` (gold, F-02 TL+BR step) + "+" SVG icon, enlarged | body 11 + icon | tools, right (after spacer) | "ADD" | **FIX(S3-o/p/n)** (`:818`) |

> **Board tools-bar order** (`:811–819`): grip · search · sort · filter · **view** · spacer · ADD. The active-sort chip carries a `chip-pip` (StateMark) `:814`. Default mode = shelf, so the view tool wears the shelf glyph un-pipped here.

## State: grid — dense 2-up (board `:843–910`)

Same head/hero/tools; the library below the hero is a 2-col grid of full card faces (`GameCard/grid`, never cropped, F-01). View tool shows the 4-square glyph, pipped (non-default).

| # | Element | Component | Variant/size | Docks | Copy | Status |
|---|---------|-----------|--------------|-------|------|--------|
| 0 | Now-Playing hero (persists in every browse mode — board stage-label `:723`, grid artboard `:857–869`) | shared `NowPlayingHero` | hero 138×193 | above library | NOW PLAYING · stats · LOG HOURS | **FIX(0061)** hero now persists in grid + list (shared component) (`:857–869`) |
| 1 | Grid cards (2-up, full face) | `GameCard` | fluid 63:88 (board grid-size 161×225), 2-col | scroll body | baked plate | **FIX(0061)** built as 2-up bare faces + hero (was `cell` 3-up) (`:870–881`) |
| 2 | ▶ NOW tag | `GameCard nowPlaying` | micro 9 | on pinned card | "▶ NOW" | **FIX(0061)** (`:873`) |
| 3 | View tool = grid glyph, pipped | `ToolButton` | cream | tools | — | **FIX(S3-n)** (`:888`) |
| — | Card tap → FLIP (COL-12) / VIEW GAME → Game page (CARD-23) | `GameCard` tap | — | — | — | EXPECTED(M4·D1 · CARD-23 · `:906`) |

## State: list — dense management rows (board `:912–1025`)

Head/hero/tools; library = `GameStrip` rows (thumb + title + HRS·STATUS + chevron). Thumb drops its plate (F-06, decision 0047); the row text names the game. View tool shows the 3-bar list glyph, pipped.

| # | Element | Component | Variant/size | Docks | Copy | Status |
|---|---------|-----------|--------------|-------|------|--------|
| 0 | Now-Playing hero persists in list (board `:926–938`) | shared `NowPlayingHero` | hero | above library | — | **FIX(0061)** built (`:926–938`) |
| 1 | Strip rows | `GameCard/thumb` (48×67) + strip-meta | thumb + meta | scroll body | title · "210 HRS · BEATEN" | **FIX(0061)** built as strip rows (was `mini` 64×89) (`:939–994`) |
| 2 | ▶ NOW inline (title-adjacent) | `nowInline` tag | micro 9 | in row title | "▶ NOW" | **FIX(0061)** inline by the title (`:957`) |
| 3 | Chevron → Game page | Text chev | title 15, faint | row right | "›" | **FIX(0061)** glyph built (`:949`); the tap-target → Game page is EXPECTED(M4) |
| 4 | View tool = list glyph, pipped | `ToolButton` | cream | tools | — | **FIX(S3-n)** (`:1002`) |

> **Board list row also draws a `MatchTag`** (dev/publisher hit, `:672`, `:684`) — only in the in-place-search results, not plain list. See search state.

## State: TOP — the curated Top-10 (read) (board `:1032–1085`)

The 4th view mode. #1 = hero seat, 2–10 = `/cell` shelf with rank chips. Count keycap reads "TOP 10". Tools show a TOP glyph + an **ARRANGE** `.btn.act` (orange) in place of ADD.

| # | Element | Component | Variant/size | Docks | Copy | Status |
|---|---------|-----------|--------------|-------|------|--------|
| 1 | Count keycap "TOP 10" | `CountTag` | micro 9 | head right | "TOP 10" | PRE-ish / current build renders a placeholder TOP list (see below) (`:1044`) |
| 2 | #1 hero seat + rank-1 chip (accent) | `GameCard` hero + `RankChip/first` (StateMark, **not gold** C6/F-02) | hero | scroll | "YOUR #1" · title | PRE build renders orange #1 marker (`:1048`) |
| 3 | Seats 2–10 `/cell` + rank chips | `GameCard` cell + `RankChip` | cell 96×134 | tv-shelf 3-up | ranks 2–10 | **PRE build = hours-derived placeholder list** (D3); full COL-13 curated grid → EXPECTED(M4·COL-13 · decisions 0049/0050 · `:1051–1061`) |
| 3 | View tool = TOP glyph, pipped | `ToolButton` | cream | tools | — | **FIX(S3-n)** (`:1067`) |
| 4 | ARRANGE action (replaces ADD in TOP) | `ScreenButton/action-alt` (.btn.act) | body 11 | tv-bar | "ARRANGE" | EXPECTED(M4·COL-13 ARRANGE · OQ-031 · `:1069`) — build keeps the ADD keycap in TOP for now (GAP-1) |
| 5 | TOP explainer sub-line | Text (tv-sub) | micro 9, dim | above #1 seat | "YOUR TOP 10 — the curated showcase…" | board `:1046` — **spot-audit addition**; build omits (rides the M4 COL-13 pass with the curated grid) |
| 6 | Board TOP tools bar has **no Sort chip** (grip · search · filter · view · ARRANGE, `:1063–1070`) | — | — | tools | — | **spot-audit addition** — build keeps Sort in TOP; low-stakes while TOP is the D3 placeholder, noted for the M4 COL-13 pass |

> The current build's TopView (`collection.tsx:267`) is the D3 **read-only, hours-derived** placeholder for COL-13 — parvati: the drag-rerank ARRANGE, CardPicker, `+ seat` ghosts, and rank-chip curation are **all EXPECTED(M4·COL-13)**, cites `:1087–1144` (ARRANGE+picker) and the map §12.

## State: empty — first-run (board `:479–539`)

No count keycap (absent until first add). Ghost card + INSERT-FIRST-GAME eyebrow + BUILD-YOUR-SHELF + sub + gold ADD; then POPULAR FIRST ADDS rail + BE-THE-FIRST hook. Tools sit **dimmed** (geography without dead ends).

| # | Element | Component | Variant/size | Docks | Copy | Status |
|---|---------|-----------|--------------|-------|------|--------|
| 1 | No count keycap | — | — | head | (absent) | **FIX(S3-j)** hide count when total 0 (`:491`) |
| 2 | Ghost card | `EmptyState` ghost (card silhouette, dashed, F-02 step) | 138×193 | empty block | "+" | PRE build (plain, no ghost silhouette) → GAP-2 (`:494`) |
| 3 | Eyebrow · title · sub | Text | micro/display/body | empty block | "INSERT FIRST GAME" · "BUILD YOUR SHELF" · sub | PRE build renders "YOUR SHELF IS EMPTY" + sub → GAP-2 copy (`:495–497`) |
| 4 | Gold ADD (CTA) | `ScreenButton/add` (step + "+") | — | empty block | "ADD A GAME" | **FIX(S3-p)** step now intrinsic (`:498`) |
| 5 | POPULAR FIRST ADDS rail (3 cards) | `SectionHeader` + `GameCard/grid` ×3 | grid | below | "POPULAR FIRST ADDS" | EXPECTED(M4·CAT-09 catalog rail — build shows none · `:500–508`) → GAP-2 |
| 6 | BE-THE-FIRST hook | `TertiaryLink` dim | body 11 | below | "CAN'T FIND YOUR GAME?…" | PRE (`:509`) |
| 7 | Tools keycaps + ADD sit **dimmed** on empty (also loading/error) | `ToolButton`/`ScreenButton` | dim ~45% | tools | — | board `:511–518` (empty) · `:1860–1866` (loading) — **spot-audit addition**; build renders full-strength tools in all lifecycle states → GAP-2 family |

> **GAP-2 (declared, not an R1-1 item):** the current `EmptyShelf` (`collection.tsx:287`) is a simpler empty than the board (no ghost-card silhouette, no POPULAR FIRST ADDS rail, different eyebrow/title copy). None of these are in the R1-1 list (S3-d/f/g/h/i/k/n/o/p/j/m). Left as PRE; filed as an observation. The R1-1 fix that DOES land here is the ADD step (S3-p) + count-hidden (S3-j).

## State: drawer — sort/filter PulledSheet (board `:541–645`)

Opens over shelf/grid; scrim + in-screen sheet (R0-1). Sections in order: (scoped SEARCH field) · VIEW · SORT BY · STATUS · GENRE · foot (RESET · DONE). **Drawer look = orange-button version LOCKED(§0.2)** — mechanics only (R0), not a visual re-approach; the board draws a different (chip) drawer but §0.2 wins.

| # | Element | Component | Variant/size | Docks (section order) | Copy | Status |
|---|---------|-----------|--------------|----------------------|------|--------|
| 1 | Grab handle + scrim, opens in-frame | `PulledSheet` | grab-handle | overlay bottom | — | PRE (R0-1 done, murr-SOUND) (`:580–581`) |
| 2 | Scoped SEARCH field | `SearchField` | inset | §1 | "TITLE · DEVELOPER · PUBLISHER…" | PRE (`:582`) |
| 3 | VIEW chips | `GenreTag` ×4 (SHELF·GRID·LIST·**TOP 10**) | selected=accent border | §2 | "SHELF"·"GRID"·"LIST"·**"TOP 10"** | **FIX(S3-d)** TOP→"TOP 10" (`:583–589`) |
| 4 | SORT BY chips | `GenreTag` ×N; active shows ↑/↓, re-tap flips | selected=accent | §3 | "MY ORDER"·"HOURS"·"OWNED SINCE"·**"RECENT"**·"A–Z" | **FIX(S3-h + OQ-128)** standalone ASC/DESC folded in; **RECENT added** (interim: ownedSince DESC, addedAt owed — OQ-128) (`:591–597`) |
| 5 | ~~Standalone ASC/DESC chip~~ | — | — | (removed) | — | **FIX(S3-h)** deleted (was `collection.tsx:352`; board had no standalone chip either) |
| 6 | ARRANGE hint (MY ORDER) | Text hint | micro 9 | under §3 | "TAP THE ACTIVE SORT TO FLIP…" | EXPECTED(OQ-031 ARRANGE · build omits · `:598`) |
| 7 | STATUS chips incl. **ALL** | `GenreTag`; ALL selected when set empty, clears set | selected=accent | §4 | "ALL"·"PLAYING"·"BACKLOG"·"BEATEN"·"COMPLETED 100%"·"DROPPED"·"WISHLIST" | **FIX(S3-f)** (`:600–608`; board abbreviates the chip to "100%" `:605` — the long form is the COL-02 display name, judge as polish) |
| 8 | GENRE chips incl. **ALL** | `GenreTag`; ALL selected when set empty, clears set | selected=accent | §5 | "ALL"·<genres from shelf> | **FIX(S3-g)** (`:610–617`) |
| 9 | RESET · DONE foot | `TertiaryLink` + `ScreenButton` | — | foot | "RESET" · "DONE" | PRE (`:618`) |

> **"ALL" semantics (S3-f/g):** ALL = the empty filter set. Selected (accent border) when `statusFilter.size === 0` / `genreFilter.size === 0`; pressing ALL clears that set. Matches board's active "ALL" first chip (`:601`, `:611`).

## State: in-place search — keyboard up (board `:647–720`)

Tap the search tool → the ToolsBar morphs to a docked `SearchField` that rises above the keyboard (R0-2); results live-filter the current view; count narrows. `MatchTag` on rows for dev/publisher hits.

| # | Element | Component | Variant/size | Docks | Copy | Status |
|---|---------|-----------|--------------|-------|------|--------|
| 1 | In-place search field — the tools bar MORPHS into a docked `SearchField` + ⊗ clear, lifts over the keyboard | `SearchField` + `ClearIcon` + `KeyboardLift` | inset | replaces tools (`:689–695`, clear ⊗ `:693`) | live query | **FIX(1c)** built this round — the bar now morphs in place (was: field under the head) |
| 1b | RESULTS section header | Text (resultsHead) | micro | above results | "RESULTS — TITLE · DEVELOPER · PUBLISHER" | **FIX(1c)** built (`:661`; gated to non-empty shelves) |
| 1c | **Keyboard SEARCH = non-destructive exit** — dismisses + un-morphs, **keeps the query** (Search keycap returns pressed + pip); ⊗ = the clearing exit; the hero **yields while a query is active** | `SearchField onSubmit` | — | dock | — | **FIX(fix-round · murr)** built per the board caption (`:711–713`) — was missing from this manifest (extraction gap: the caption, not the artboard, carries it) |
| 2 | Count narrows | `CountTag` | micro 9 | head | "2 OF 48 GAMES" (§0.3) | **FIX(S3-j)** filtered copy (`:659`) |
| 3 | Result rows + MatchTag | `GameStrip` + `MatchTag` | thumb | scroll | title · HRS·STATUS · match | PRE strip / `MatchTag` EXPECTED(match-highlight · build omits · `:672`) |
| 4 | System keyboard (theme-matched) | OS | — | bottom | — | PRE (OQ-035 · `:698–704`) |

## State: log-hours — PulledSheet from the hero (decision 0011)

Hero LOG HOURS → a `PulledSheet` with a pre-filled hours `TextField` (rises over keyboard, R0-2) + Save.

| # | Element | Component | Variant/size | Docks | Copy | Status |
|---|---------|-----------|--------------|-------|------|--------|
| 1 | Sheet + handle, opens in-frame, lifts over keyboard | `PulledSheet` | grab-handle | overlay | — | PRE (R0-1/2) |
| 2 | Hours field **pre-filled with current value** | `TextField` | number-pad | §1 | value = current hours; placeholder "0" | **FIX(S3-m · §0.4)** |
| 3 | Save (empty→error guard) | `ScreenButton` block | — | foot | "SAVE" | PRE (empty save-guard is reference-good) |

> Not board-drawn (the board's log-hours is the hero LOG HOURS beat + R0 mechanics); this is the built sheet. §0.4: pre-fill the value, Save-as-is keeps it, **clearing** is what errors.

## State: now-playing unset — the set-your-pin nudge (board `:1767–1834`)

Has games, no pin: the hero slot becomes a "SET YOUR NOW PLAYING" nudge.

| # | Element | Component | Variant/size | Docks | Copy | Status |
|---|---------|-----------|--------------|-------|------|--------|
| 1 | Set-your-pin nudge (the picker affordance) | — | — | hero slot | "SET YOUR NOW PLAYING" | **build renders the nudge text but the picker is deferred** — S3-a/S5-b: per-game set-now-playing → M4 Game page. Current build shows the nudge copy (inert). See GAP-3 / EXPECTED(M4 · §0.5/0.8 · `:1789` region) |

> §0.8 rules **HIDE** the SET-NOW-PLAYING *affordance* until M4 on the Profile (S5-b). On Collection the board *draws* the nudge (§3.1); the M3 build has no reachable picker (S3-a → M4). The nudge display is acceptable as long as it is not a dead-end tap. **GAP-3 (declared):** confirm the Collection nudge is display-only (no inert tap) — parvati to verify; if it taps to nothing, it should be inert. Not an R1-1 named item; flagged for the owner.

## State: loading — skeleton (board `:1835–1884`)

| # | Element | Component | Variant/size | Docks | Copy | Status |
|---|---------|-----------|--------------|-------|------|--------|
| 1 | Skeleton (hero card + 2-up mini, solid fills, stepped) + dimmed tools | `Skeleton` | — | body | — | **build renders a centered `ActivityIndicator`** (`collection.tsx:91`), not the shelf-silhouette skeleton → GAP-4. Not an R1-1 item; EXPECTED polish (`:1847–1867`) |

## State: load-error — SIGNAL LOST + retry (board `:1886–1932`)

| # | Element | Component | Variant/size | Docks | Copy | Status |
|---|---------|-----------|--------------|-------|------|--------|
| 1 | Error card (dashed, F-02 step, accent "!") | `LoadError` | — | body | — | build renders text-only (no card) → GAP-4 (`:1901`) |
| 2 | Eyebrow · title · sub | Text | micro/title/body | body | "SIGNAL LOST" · "COULDN'T LOAD YOUR SHELF" · sub | build: "SIGNAL LOST" title + "Couldn't load your collection." → GAP-4 copy (`:1902–1904`) |
| 3 | RETRY (orange, F-02 step) + GO BACK | `ScreenButton/action-alt` + `TertiaryLink` | — | body | "RETRY" · "GO BACK" | build has RETRY (action-alt), no GO BACK (`:1905–1906`) |

> **GAP-4 (declared):** loading + load-error render simpler than the board's `Skeleton`/`LoadError` family. Not in the R1-1 list; the lifecycle family (§5.6) is a shared-component pass. Filed as observation.

---

## Later-milestone states — listed, EXPECTED, NOT built (parvati: do not flag)

| State | Board | Owned by | Mark |
|-------|-------|----------|------|
| Peek-flip (grid/shelf/friend) — tap flips to CARD-01 stats back + VIEW GAME | `:1196–1463` | M4 (COL-12/CARD-23) | EXPECTED(M4·D1 · decision 0026/0048) |
| TOP — ARRANGE (drag-rerank) + CardPicker | `:1087–1144` | M4 (COL-13) | EXPECTED(M4 · decisions 0049/0050 · OQ-031) |
| Friend's Collection (default · view-in-their-device · sorted · read-only drawer) | `:1464–1766` | M6 (COL-10/11 · SOC friend graph · decision 0012) | EXPECTED(M6 · COL-10/11) |
| Friend TOP (read-only) | `:1146–1193` | M6 (COL-13 friend) | EXPECTED(M6) |
| Unavailable (blocked/suspended/deleted → generic mask) | `:1935–1979` | M6 (MOD-09/SYS-10) | EXPECTED(M6 · MOD-09) |
| Offline (self from cache · friend unreachable) | `:1981–2088` | M4+ (SYS-10 offline cache) | EXPECTED(later · SYS-10) |
| Per-game action surface (set-now-playing, change status, remove, log-anywhere) | — | M4 Game page (S3-a §0.5) | EXPECTED(M4 · §0.5 — RTK hooks dormant) |

---

## Owner-notes fold-in (S3 items → manifest lines)

| Note | What it is | Manifest line(s) it lands on | Authority |
|------|-----------|------------------------------|-----------|
| **S3-d** | view chip → "TOP 10" | drawer §3 (VIEW chips, row 3) | board `:588` + note |
| **S3-f** | Status "All" option | drawer §7 (STATUS · ALL) | board `:601` + note |
| **S3-g** | Genre "All" option | drawer §8 (GENRE · ALL) | board `:611` + note |
| **S3-h** | remove standalone ASC/DESC chip; fold into Sort | drawer §4/§5 (rows 4–5) | note (board has no standalone chip) |
| **S3-i** | Sort tool indicates asc/desc when active | shelf/grid/list tools row 13 (Sort) | note + board `:814` chip-pip |
| **S3-k** | Filter tool orange pip (StateMark, not PipLight, F-05) when filters active | tools row 14 (Filter) | note (overrides board's "ALL" text) |
| **S3-n** | tools icon-only, board icons | tools rows 12–15 (search/sort/filter/view) | note + board SVGs `:813–816` |
| **S3-o** | gold ADD larger | tools row 16 (ADD) | note |
| **S3-p** | ADD gets F-02 TL+BR pixel-step (theme.step, decision 0041) | tools row 16 + empty row 4 | note + 0041 (step intrinsic to `.btn.add`) |
| **S3-j** | count copy: "N game(s)" / "N of M games" singular-aware; absent when empty | head count (rows 2 across states) | **§0.3 LOCKED** (refines board "N OF M") |
| **S3-m** | Log-Hours pre-fills the current value | log-hours row 2 | **§0.4 LOCKED** |

### Locked decisions honoured on this surface (do NOT "fix")

| Lock | Manifest effect |
|------|-----------------|
| **§0.2** drawer orange-button look accepted | drawer state header — mechanics only (R0); board's chip-drawer visual **not** adopted |
| **§0.3** count copy | S3-j copy is the ruling, not the board's "N OF M" |
| **§0.4** log-hours pre-fill | S3-m |
| **§0.5** per-game actions → M4 | now-playing-unset picker, card-tap actions EXPECTED(M4) |
| **§0.11** drawer does not block nav band | `PulledSheet` covers routed screen only (R0 owner-call) — do not re-block |

## Declared divergences from the board (builder-intentional, so parvati reads them as reconciled)

- **DIV-1 (tools icon-only overrides board on-chip text):** the board's tools-bar draws the sort chip as icon + "A–Z ↑" (`:814`) and the filter chip as icon + "ALL" (`:815`). **S3-n** rules the tools **icon-only, no labels** → the sort-key text and the "ALL" filter text are dropped. Direction is shown iconically (S3-i, arrow emphasis), filter-active by the orange StateMark pip (S3-k). The owner notes (S3-n/i/k) win over the board's on-chip text.
- **DIV-2 (ADD keeps its keycap in TOP, GAP-1):** the board swaps ADD for an orange ARRANGE `.btn.act` in TOP view (`:1069`). ARRANGE is EXPECTED(M4·COL-13), so the build keeps the gold ADD in all modes for now. Declared, not fixed.
- **GAP-2/3/4** (empty rail/ghost, now-playing picker, skeleton/load-error family) — pre-existing, not in the R1-1 list; see each state above. Filed as observations, not fixed this pass.

## Spot-audit corrections + the R1-1 fix round (verification lane 2026-07-03 → owner ruling + build 2026-07-04)

The R1-1 verifier audited this manifest against the board + decisions before parvati ran; parvati confirmed the divergences live; the owner then ruled at the first-article review (2026-07-04) and the fixes were built.
1. **Shelf/grid model — RESOLVED by decision 0061.** The spot-audit had re-based the shelf on decision 0057 (shelf = 2-up bare faces). At the first-article review the owner identified 0057 as a shelf/grid **mix-up** and reversed it: **[`0061`](../../decisions/0061-collection-shelf-showcase-restore.md)** restores shelf = the **showcase** (hero-treatment rows, per-entry stats, OQ-033/0013) and sets grid = **2-up full faces + persistent hero**. Both were rebuilt this round; manifest shelf/grid/list rows updated to the 0061 model.
2. **The false-PRE structural rows were BUILT** (parvati-confirmed flags → fix round): grid 2-up faces + hero (was `cell` 3-up, no hero); hero persistence in grid + list (shared `NowPlayingHero`); list strip rows + chevron + inline ▶ NOW (was `mini`, no chevron); in-place-search **morph dock** + ⊗ clear + RESULTS header (was field-under-head). See `r1-1-fixlist.md` (now closed) + the R1-1 fix-round receipt.
3. **RECENT sort added** (OQ-128, owner-ruled in) — interim over `ownedSince` DESC; a distinct immutable `addedAt` stays owed (OQ-128).
4. **Still-declared observations** (NOT built — later-milestone / lifecycle family): TOP `tv-sub` explainer + board TOP tools dropping the Sort chip (M4 COL-13); empty/loading **dimmed tools** + empty ghost/rail (GAP-2); skeleton/load-error family (GAP-4); STATUS "COMPLETED 100%" vs board "100%" (COL-02 long form, polish).

## Notes for the verifier

- **Component reuse:** every changed control composes from the map — `ToolButton` (icon-only re-shape, §5.3; only consumer is this screen), `ScreenButton/add` (gold + intrinsic F-02 step, §5.3), `GenreTag` (drawer chips incl. ALL, §5.4), `CountTag`/`ScreenHead` (§5.4), `StateMark` (tool pips, §5.4), `PulledSheet`/`TextField` (§5.7/§6). No new §1.5 component was invented; the pixel-step is an internal SVG helper on `ScreenButton`, not a catalog entity.
- **Filed OQs this pass:** see `r1-1-receipt.md` §Filed OQs (GameCard F-02 step not rendered in RN app-wide; board's RECENT sort not in the build's SORTS).
