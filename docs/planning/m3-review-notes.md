# M3 / M3-R — Parvati review notes

> Per-screen build-vs-design verdicts, appended by parvati as each M3-R surface exits its loop
> (`m3r-build-task.md` §1). **A surface without a filed report here is not done, by definition —
> and this file being empty at a milestone exit is itself a red flag.** Same conventions as
> [`m2-review-notes.md`](m2-review-notes.md); measured against the surface's
> `docs/planning/m3r/<surface>-manifest.md` (never an improvised enumeration), at the M3-R
> calibration: divergence-from-board = 🚩 FLAG; EXPECTED requires the manifest's cite.

## R1-1 · Collection — parvati (M3-R, 2026-07-03)

**Verdict:** 11 🚩 flag · 12 ✅ expected · 2 🎨 polish (measured vs the M3-R DoD `m3r-build-task.md` §3 R1-1,
the manifest `m3r/collection-manifest.md` — the fixed enumeration — and `GET /me/collection`).
**Reviewed from:** live Expo web @ 390×844 (fresh-context agent, own captures + DOM measurements),
signed in as the seeded `demo@ingame.app` (13-game shelf), isolated :4001 API, reads-only — no
log-hours save, no adds, no pin changes. States exercised: shelf · grid · list · TOP · drawer
(Filter-tap **and** keycap long-press) · STATUS/GENRE ALL round-trips · sort re-tap flip (drawer +
keycap) · in-place search (title + developer hits) · log-hours sheet (pre-fill verified, not saved) ·
count chip unfiltered/filtered ("13 GAMES" → "3 OF 13 GAMES" → "1 OF 13 GAMES").

### 🚩 Flag (divergence from the converged board — M3-R DoD)
| # | Observation | Bucket | Cite / note |
|---|---|---|---|
| R1 | **Grid view renders `/cell` 96×134 in a ~3-up wrap** (DOM-measured 96×134), not the board's 2-up **full `grid-size` faces** (161×225) | MISPLACED | manifest grid row 1 **VERIFY → confirmed**; board `:870–881`; `collection.tsx:329–337` |
| R2 | **Now-Playing hero renders ONLY in shelf view** — grid and list open straight into the library; board persists the hero in every view mode | ABSENT | manifest grid row 0 + list row 0 **VERIFY → confirmed**; board stage-label `:723`, grid `:857–869`, list `:926–937`; `collection.tsx:213–221` (one root cause, two states) |
| R3 | **List rows use `GameCard/mini` 64×89**, not the board's thumb strip variant (48×67; caption 44×62) — the "~8 rows/screen" density rung reads ~4 | MISPLACED | manifest list row 1 **VERIFY → confirmed**; board `:939–994` |
| R4 | **List rows render no chevron `›`** on the row right (the glyph itself; the Game-page tap-target is EXPECTED M4) | ABSENT | manifest list row 3 **VERIFY → confirmed**; board `:949` |
| R5 | **List-row ▶ NOW tag sits ON the mini card face**, not inline next to the title — board: "the badge moves inline — the thumb is too small to wear a tag" | MISPLACED | board `:957` (`now-inline`); manifest list row 2 was marked PRE — spot-audit miss, corrected here |
| R6 | **In-place search docks UNDER the ScreenHead at top; the tools bar stays put** — board morphs the tools bar into a bottom-docked field. Also missing from the field: the in-field magnifier + **⊗ clear** (`:691–693`); missing above results: the **RESULTS — TITLE · DEVELOPER · PUBLISHER** section head (`:661`) | MISPLACED | manifest search row 1 **VERIFY → confirmed** (+rows 1b); board `:689–695`; `collection.tsx:206–208`. Not an R1-1 named item — fixlist candidate per manifest |
| R7 | **Stat-line copy "11H · PLAYING"** — board grammar is **"86 HRS · PLAYING"** ("HRS", spaced) — hero L2, every list row, TOP rows | UNPOLISHED (copy) | board `:747`, `:947` etc.; `collection.tsx:302–304`, `:349–351` — one format helper fixes all |
| R8 | **Hero catalog line drops the genre segment** — build "FROMSOFTWARE · 2022"; board "BUNGIE · 2025 · SHOOTER" (dev · year · genre). Genres are in the payload (the drawer's chips derive from them) — a contract-fed field the render drops | ABSENT (data) | board `:749`; `collection.tsx:306–308` |
| R9 | **Hero LOG HOURS button has no "+" icon** (0 SVGs in the DOM) — board draws the 11px plus before the label | ABSENT | board `:750`; `ScreenButton` accepts `icon` (the ADD uses it) — one-prop fix |
| R10 | **TOP view count keycap reads "13 GAMES"** — board reads **"TOP 10"**; also incoherent as rendered (10 rows under a 13 count, the other 3 unreachable in this view) | UNPOLISHED (copy/coherence) | board `:1044`; manifest TOP row 1 was "PRE-ish" — the copy is cheap and not gated on the M4 curated grid |
| R11 | **Drawer STATUS chip order: BACKLOG · PLAYING** — board leads PLAYING · BACKLOG | MISPLACED (minor) | board `:602–603`; `collection.tsx:34` (`STATUSES` array) — trivial reorder |

### ✅ Expected (deferred — proceed; manifest cites)
- **ToolsBar grip** (ARRANGE shortcut) — EXPECTED(COL-13 · OQ-031 · `:812`).
- **ARRANGE replacing ADD in TOP** — EXPECTED(M4·COL-13); DIV-2/GAP-1 declared (`:1069`).
- **TOP curated grid** (#1 hero seat + rank chips + 2–10 `/cell` shelf + `tv-sub` explainer + the board's no-Sort-chip TOP bar) — build shows the D3 hours-derived placeholder rows; EXPECTED(M4·COL-13 · decisions 0049/0050 · `:1046–1070`).
- **Card tap → COL-12 flip / VIEW GAME → Game page** — EXPECTED(M4·D1 · CARD-23 · `:906`).
- **MatchTag** on dev/publisher search hits — EXPECTED(match-highlight · `:672`); the dev-hit scope itself works (verified: "fromsoft" → Elden Ring).
- **Hero foil/custom art** — EXPECTED(M4·CARD-22 · `:741–744`).
- **ARRANGE hint under SORT** — EXPECTED(OQ-031 · `:598`).
- **Per-game actions / set-now-playing picker** — EXPECTED(M4 · §0.5).
- **Empty-state family** (ghost card, INSERT-FIRST-GAME copy, POPULAR FIRST ADDS rail, dimmed tools) — GAP-2 declared; not exercisable this run (needs an empty account).
- **Lifecycle family** (skeleton + LoadError card) — GAP-4 declared; the centered `ActivityIndicator` loading state was observed live; load-error not exercised.
- **RECENT sort absent** — known, **OQ-128** (filed by the builder; not re-filed).
- **GameCard F-02 step not rendered app-wide** — known, **OQ-127**.

### 🎨 Polish / iteration (built-app, token-level)
- **Search placeholder copy/case** — drawer field "Title · studio · publisher" and in-place field "Search title · studio" vs the board's "TITLE · DEVELOPER · PUBLISHER…" (`:582`): sentence-case vs caps, and the in-place copy under-names the publisher scope (which the query actually covers).
- **STATUS chip "COMPLETED 100%"** vs the board's "100%" (`:605`) — per the manifest ruling the long form IS the COL-02 display name; build follows spec, the board abbreviates. No action owed the build; noting so nobody "fixes" it backwards.

### ✔ Matches (verified live)
Screen head "COLLECTION" (display 21) + gold `CountTag` (micro) · **S3-j count copy** — "13 GAMES" unfiltered, "3 OF 13 GAMES" status-filtered, "1 OF 13 GAMES" on a single hit, live even while the drawer is open · **hero block** — 138×193 card (DOM-measured; decision 0057) + NOW PLAYING eyebrow (accent) / stat-line / display title / catalog line / LOG HOURS stack, docked above the library · **shelf 2-up bare faces, no per-row meta** (LOCKED 0057) + ▶ NOW tag on the pinned face · **S3-n tools icon-only** — 4 cream 32×30 keycaps wearing the board's SVG glyphs, no labels · **S3-i** Sort keycap tap flips MY ORDER (order verified reversed) and the icon emphasizes the active direction when a sort is on · **S3-k** Filter keycap wears the orange StateMark pip when filters are active (orange, not pink — F-05) · **view keycap cycles shelf→grid→list→top**, wears the current mode's glyph, pipped when ≠ shelf · **S3-o/p gold ADD** — 98×39 (visibly the biggest control) with the F-02 TL+BR stepped SVG face (path verified in DOM) · **drawer** — opens in-frame (R0-1) via Filter tap AND keycap long-press (OQ-034), grab handle + scrim, nav band never blocked (§0.11), section order SEARCH → VIEW → SORT → STATUS → GENRE → RESET·DONE · **S3-d** VIEW chips SHELF·GRID·LIST·**TOP 10** · **S3-h** no standalone ASC/DESC chip; active sort chip carries ↑/↓ and re-tap flips (MY ORDER ↓→↑→↓ verified) · **S3-f/g** STATUS + GENRE **ALL** = the empty set — selected when nothing filtered, tap clears (round-tripped both, count restored) · **S3-m log-hours** — in-frame sheet, field pre-filled `value="11"` (a real value, not placeholder), Save present, **not saved** · TOP #1 marker orange accent, never gold (C6/F-02) · nav band COLLECTION pressed + pink PipLight.

### Not exercised (and why)
- **Empty shelf** (manifest empty rows 1–7, incl. the S3-j count-hidden half and the empty-state dimmed tools) — needs an empty account; reads-only run.
- **Now-playing-unset nudge (GAP-3 inert-tap check)** — the demo shelf has a pin; unpinning is a mutation. The GAP-3 "confirm the nudge is display-only" check is still owed (code review shows the nudge `View` has no press handler — likely inert — but not verified live).
- **Load-error state** (SIGNAL LOST + RETRY) — would need a mid-session API failure; GAP-4 already declares it simpler than board.
- **True singular count "1 GAME"** — needs a 1-game shelf (the pluralizer keys off the TOTAL).
- **R0-2 keyboard-rise + native shadows** — native behaviors; the R2 physical-device pass owns them (web loop is the iteration loop only).

### Delta re-check after verifier fixes (parvati, 2026-07-03 — same web loop, reads-only, fresh captures + DOM measurements)

The verification lane's mechanical fixes to the working tree, re-verified live (R1–R6 structural
flags NOT re-checked — routed to the builder fixlist per the coordinator):

| Row | Check | Verdict |
|---|---|---|
| R7 | Stat-line grammar — hero "11 HRS · PLAYING" · list rows "96 HRS · BEATEN", "61 HRS · COMPLETED 100%" · TOP rows "300 HRS" | ✔ **FIXED** |
| R8 | Hero catalog line "FROMSOFTWARE · 2022 · SOULSLIKE" (dev · year · genre) | ✔ **FIXED** |
| R9 | LOG HOURS carries the "+" icon — 1 SVG, 11×11, accent-ink stroke | ✔ **FIXED** |
| R10 | TOP-view count keycap reads **"TOP 10"** (gold CountTag) | ✔ **FIXED** |
| R11 | Drawer STATUS chips lead **PLAYING** · BACKLOG · BEATEN · COMPLETED 100% · DROPPED · WISHLIST | ✔ **FIXED** |
| murr sort-fold | Default shelf, Sort keycap tap → library order reverses **and** the keycap wears the orange StateMark pip + the ↑ arrow emphasized (down 0.3 / up 1.0); the drawer chip agrees ("MY ORDER ↑"); re-tap → pip off, arrows neutral, original order restored | ✔ **FIXED** |
| Regression | S3-j count copy — "13 GAMES" (shelf/grid/list) · "3 OF 13 GAMES" filtered (3 faces rendered, coherent) · restored on ALL-clear; TOP shows "TOP 10" filtered or not (board `:1044` draws no narrowed variant — fine while TOP is the D3 placeholder) · log-hours still pre-fills `value="11"` (not saved) · Filter pip still lights/clears | ✔ no regressions |

**Updated tally: 6 🚩 open** (R1–R6, all structural, on the builder fixlist) **· 5 🚩 closed**
(R7–R11) **· murr's sort-fold closed · 12 ✅ expected · 2 🎨 polish unchanged.**

### Read of it
The ten R1-1 items (S3-d/f/g/h/i/j/k/m/n/o/p) **all landed and verified live** — the flags are
concentrated in what the spot-audit predicted: the **view-mode fidelity family** (grid faces, hero
persistence, list thumb/chevron — R1–R5) plus the **search dock** (R6), with four smaller
board-copy/element drops the manifest had as PRE (R7–R11). Nothing in the flag list touches a LOCKED
ruling. The screen's R1-1 *fix ledger* is honest; the surface as a whole is not yet
"matches the converged board" until the R1–R6 family is resolved or explicitly re-scoped (they are
board-accurate rows, not R1-1 named items — the owner's call at the R1-1 hard stop).

## R1-1 · Collection — parvati fix-round re-review (M3-R, 2026-07-04)

**Verdict:** 1 🚩 flag · 12 ✅ expected · 2 🎨 polish (measured vs the M3-R DoD `m3r-build-task.md` §3 R1-1,
the **0061-updated** manifest `m3r/collection-manifest.md` — the fixed enumeration — decision `0061`,
and `GET /me/collection`). **The R1–R6 structural family is CLOSED** (all six verified fixed live);
one **new** divergence surfaced (R12, search-state hero).
**Reviewed from:** live Expo web @ 390×844 (fresh-context agent, own captures + DOM measurements),
signed in as `demo@ingame.app`, reads-only — no log-hours save, no adds, no pin/order mutations.
Standing stack used: shared API :4000 + DB adopted untouched; Metro :8082 was down and
`dev-stack.mjs up` could not keep its spawn alive (3 attempts, incl. unsandboxed — child dies
instantly, 0-byte log), so a fallback Metro was started via the preview harness on :8082 and stopped
after the run. `apps/mobile/.env.local` verified absent throughout; the phone's :8081 untouched.
**Environment note:** the demo shelf is now **15 games** (was 13) — three new seeds ("min",
"Gears of War", "hentai sniper wwII") with partial catalog fields (no dev/year); all counts below
were re-checked coherent at 15, and the catalog line degrades gracefully by omitting missing
segments (e.g. "HEYO · RACING") — seed-data, not a build defect.

### Fix-round claims re-verified (the receipt's table, live)
| Prior flag | Check | Verdict |
|---|---|---|
| R1 (grid faces) | Grid = **2-up full faces**, DOM-measured 154×215 (63:88 fluid, F-01 uncropped), no per-row meta (0 stat-lines beyond the hero), ▶ NOW in-flow on the pinned face | ✔ **FIXED** (0061 grid) |
| R2 (hero persistence) | Shared `NowPlayingHero` renders in **shelf, grid, AND list** — eyebrow · stat · title · catalog · LOG HOURS, docked above the library in all three | ✔ **FIXED** |
| R1a (shelf model, 0061) | Shelf = **the showcase**: hero + a stack where **every entry is hero-treated** — 138×193 face (DOM-measured, all 15) + stat-line · display title · catalog line beside; **LOG HOURS hero-exclusive** (exactly one on screen); ▶ NOW on the pinned stack card | ✔ **BUILT** (board `:753–809`) |
| R3/R4/R5 (list) | List = strip rows: **48×67 thumbs** (DOM-measured), TITLE + **inline ▶ NOW** beside it, "N HRS · STATUS" line, **› chevron** on all 15 rows, hero above | ✔ **FIXED** (board `:939–994`) |
| R6 (search dock) | Tap Search → **the entire tools bar morphs** into a docked `SearchField` + ⊗ (tools + ADD gone); "bun" → **RESULTS — TITLE · DEVELOPER · PUBLISHER** header + count narrows **"2 OF 15 GAMES"** + dev-scope hits (Destiny 2 + Marathon via BUNGIE); ⊗ → query cleared, tools bar + ADD restored, count "15 GAMES" | ✔ **FIXED** (board `:689–695`, `:661`) |
| OQ-128 (RECENT) | **RECENT** chip present in SORT; select → stack reorders newest-adds-first (ownedSince DESC interim) + Sort keycap pips **orange** (F-05); keycap re-tap flips **↓→↑** (order verified reversed) and the drawer chip agrees ("RECENT ↑") | ✔ **BUILT** |

### 🚩 Flag (divergence from the converged board — M3-R DoD)
| # | Observation | Bucket | Cite / note |
|---|---|---|---|
| R12 | **The Now-Playing hero does NOT yield during an active search** — with a query live, the build renders the RESULTS header and then the full hero block (eyebrow + LOG HOURS) *above* the result rows; the board's search artboard begins the scroll at the RESULTS sec with no hero, and the caption is explicit: "The Now-Playing hero yields while a query is active" | MISPLACED | board `:660–662`, caption `:711–713`; `collection.tsx:252–265` (view renders with `hero` unconditionally; `q` doesn't gate it). Not manifest-cited as EXPECTED/LOCKED — a search-state row the spot-audit didn't extract |

### ✅ Expected (deferred — proceed; manifest cites, all carried from the prior pass)
ToolsBar grip (COL-13 · OQ-031 · `:812`) · ARRANGE-replaces-ADD in TOP (M4·COL-13, DIV-2/GAP-1 ·
`:1069`) · TOP curated grid + `tv-sub` explainer + the board's no-Sort TOP bar (M4·COL-13 · 0049/0050;
build shows the D3 hours-derived placeholder — re-verified live, #1 orange marker, ranks 2+) ·
card-tap flip / VIEW GAME (M4·D1 · CARD-23 · `:906`) · MatchTag on dev/publisher hits
(match-highlight · `:672`; dev-scope itself verified working) · hero foil/custom art (M4·CARD-22) ·
ARRANGE hint under SORT (OQ-031 · `:598`) · per-game actions / set-now-playing picker (M4 · §0.5) ·
empty-state family (GAP-2; not exercisable) · lifecycle family (GAP-4; skeleton/load-error) ·
distinct immutable `addedAt` for RECENT (OQ-128, interim ownedSince DESC is the blessed shape) ·
GameCard F-02 step app-wide (OQ-127).

### 🎨 Polish / iteration (built-app, token-level)
- **Docked search-field composition** — the board draws the magnifier glyph *inside* the field and ⊗
  *in-field* right (`:690–694`); the build's field has no in-field magnifier and docks ⊗ as an
  adjacent keycap. Mechanics are exactly the board's (morph · clear · restore) — composition only.
  Placeholder is sentence-case "Title · developer · publisher" vs the board's caps (the prior pass's
  under-named publisher IS fixed).
- **Drawer search placeholder copy** (carried) — "Title · studio · publisher" vs board "TITLE ·
  DEVELOPER · PUBLISHER…" (`:582`): "studio" vs DEVELOPER + case.
- *(No-action note, carried: STATUS chip "COMPLETED 100%" is the COL-02 display name — the board's
  "100%" abbreviates; don't "fix" backwards.)*

### ✔ Matches (verified live this run)
Shelf showcase per 0061 — hero (138×193, NOW PLAYING accent eyebrow, "11 HRS · PLAYING", display
title, "FROMSOFTWARE · 2022 · SOULSLIKE", LOG HOURS + icon) over a 15-row hero-treatment stack, ▶ NOW
on the pinned card, LOG HOURS nowhere else · grid 2-up faces + persistent hero + in-flow ▶ NOW + view
keycap grid-glyph pipped · list strips (48×67 thumb · title + inline ▶ NOW · HRS·STATUS · ›) +
persistent hero + list-glyph pipped · view keycap cycles shelf→grid→list→top and returns · TOP count
**"TOP 10"** (gold), #1 orange never gold · S3-j count copy round-trips: "15 GAMES" → "3 OF 15 GAMES"
(STATUS PLAYING, 3 rendered, coherent) → "15 GAMES" (ALL) → "1 OF 15 GAMES" (GENRE SOULSLIKE) →
restored; live while the drawer is open · drawer in-frame (grab handle + scrim, nav band never
blocked §0.11), section order SEARCH → VIEW (SHELF·GRID·LIST·**TOP 10**) → SORT (MY ORDER · HOURS ·
OWNED SINCE · **RECENT** · A–Z, no standalone ASC/DESC, active chip wears ↑/↓) → STATUS (PLAYING
leads; ALL = empty set, selected-when-clear, tap-clears) → GENRE (ALL ditto) → RESET · DONE · Filter
keycap orange StateMark pip lights on filter, clears on ALL · Sort keycap pip + arrow emphasis agree
with the drawer in both directions · log-hours sheet in-frame, "LOG HOURS — ELDEN RING", field
pre-filled `value="11"` (real value), numeric pad, SAVE present, **closed without saving** (hero
still "11 HRS · PLAYING") · gold ADD 98×39 with the F-02 TL+BR stepped SVG face + "+" icon, visibly
the largest control · tools 4× cream 32×30 icon-only keycaps (S3-n).

### Not exercised (and why)
- **Empty shelf** (S3-j count-hidden, dimmed tools, ghost/rail — GAP-2 family) — needs an empty
  account; reads-only run.
- **Now-playing-unset nudge (GAP-3 inert-tap check)** — the demo has a pin; unpinning is a mutation.
  Still owed a live check.
- **Load-error** (SIGNAL LOST family, GAP-4) — needs a mid-session API failure.
- **True singular "1 GAME"** — needs a 1-game shelf.
- **Keyboard-rise (`KeyboardLift`) + "keyboard SEARCH dismisses keeping the filter → Search keycap
  pips"** — OS-keyboard behaviors the web loop can't drive; code shows the keycap pip is wired
  (`collection.tsx:293` `active={q.trim() !== ''}`); the R2 device pass owns both.
- **Behavior note (not scored):** selecting a *new* sort key inherits the previous direction rather
  than resetting to ↓ (MY ORDER re-selected after RECENT ↑ came back as "MY ORDER ↑"). The board
  doesn't specify; flagging for the owner's taste, not the fixlist.

### Read of it
The fix round **holds**: all six structural flags (R1–R6) are closed and DOM-verified against the
0061 model, RECENT landed with correct pip/flip mechanics, and every prior regression row (count
copy, ALL round-trips, pips, pre-fill, TOP 10, stepped ADD) re-verified green at the new 15-game
seed. The one open flag is small and sharply scoped — the search state renders the hero the board
says must yield (R12) — plus two token-level field-composition polish items. Nothing touches a
LOCKED ruling. One more builder pass on R12 (a `q`-gate around the hero in the three views) and this
surface reads "matches the converged board" within its declared GAP/EXPECTED envelope.

## R1-2 · Add-game — parvati (M3-R, 2026-07-04)

**Verdict:** 2 🚩 flag · 3 ✅ expected · 4 🎨 polish (measured vs the M3-R DoD `m3r-build-task.md` §3
R1-2, the grounded manifest `m3r/add-game-manifest.md` — the fixed enumeration, states P1–P9 — and
`GET /catalog/popular` · `GET /catalog/search` · `GET /genres`). **The R1-2 named fixlist (S4-a/c/e/f/g
+ R0-follow) all landed and verified live.** Two board-divergences surfaced beyond the builder's
declared gaps; the builder's 4 declared gaps + the fore-focus DECISION resolve to 3 polish + 2 expected.
**Reviewed from:** live Expo web (fresh-context Chrome, own captures), signed in as `demo@ingame.app`,
reads-only — search + fan-rotate + create-form exercised, **NO game added, NO catalog entry created**
(create form inspected without submit). States reached: **P1 entry** (fore-focus meta + gold ADD),
**fan rotate** (3× via Next chevron — fore + meta + lit-dot all updated; fore-tap inertness confirmed
via the a11y tree, the fore is not a button), **P3 results** (query "a" → 8-match fan, fore enlarged),
**P5 create** (full form + dedup-driven banner not exercised — 409-only). **P6 status beat / P8 filed
NOT exercised** (would require an add = mutation; optional per brief, skipped). **Viewport caveat:**
Chrome's minimum window width pinned the web viewport at **1280w** (the 390×844 resize could not shrink
the inner viewport below Chrome's floor) — the single-column layout, section order, fan geometry, meta
ordering, header, and copy are all faithfully assessable at 1280, but true phone-width stacking/thumb-
reach and the `KeyboardLift`/`automaticallyAdjustKeyboardInsets` rise are **not** web-observable (native,
R2 device pass owns them). **Metro instability** (task `f5628409`): the renderer froze twice mid-run
(30s CDP screenshot timeouts) but recovered each time after a short wait — the full walk completed; I
started no Metro (reused the standing :8082 expo-web, PID-confirmed) and stopped none.

### R1-2 fixlist claims re-verified (the receipt's ledger, live)
| Item | Check | Verdict |
|---|---|---|
| S4-a (FlowHeader) | LEFT "ADD GAME" title + "‹ RETURN TO COLLECTION" labeled link, **no ✕**; RETURN navigates back to /collection (verified) | ✔ **BUILT** |
| S4-e (no count) | No count chip in the head (the R1-1 `CountTag "N IN"` is gone) | ✔ **BUILT** |
| S4-c (CardFan) | 3-up fan — centered fore + two neighbours rotated ±4°/translateY, ‹ dots › + SWIPE beneath; replaces the flat cell scroll | ✔ **BUILT** (see R13 for the entry-fore size) |
| S4-f (fan-meta) | Name-first meta ABOVE the fan: "DESTINY 2 · 2017 · BUNGIE" / "SHOOTER" / "IN 2 COLLECTIONS · 0 FRIENDS HAVE IT" (accent) / "ADDED BY DEMO_CURATOR_M3" — all fields, updates with the fore | ✔ **BUILT** |
| S4-g (focus-only) | Neighbour/chevron/swipe rotate the fore; **the fore's own tap is inert** — a11y tree shows the fore is a plain View, only "Focus <neighbour>" + Prev/Next are buttons | ✔ **BUILT** (LOCKED §0.7) |
| Fore-focus-by-default (GAP-3 decision) | The centered fore shows its meta + gold ADD with no first tap; Destiny 2 fore (owned) → "IN YOUR COLLECTION ✓" disabled + "ITS DETAIL OFFERS THE GAME PAGE…" hint | ✔ **BUILT** — accepted §0.7-consistent decision |
| R0-follow (create keyboard) | `automaticallyAdjustKeyboardInsets` on the CreateForm ScrollView | — **not web-observable** (native; R2 device) |

### 🚩 Flag (divergence from the converged board — M3-R DoD)
| # | Observation | Bucket | Cite / note |
|---|---|---|---|
| R13 | **The ENTRY (POPULAR) fan's fore is NOT enlarged** — it renders at 96×134, identical to the neighbour `/cell` (96×134), so the "bigger centered fore" reads as same-size-but-upright, differentiated only by the neighbours' ±4° rotation + drop. The board's `.fan-size` fore is drawn meaningfully larger than `.fan-nb`. *(The RESULTS fan is correct — fore 138×193 vs cell 96×134, visibly bigger.)* | MISPLACED (size) | board `:761/:768/:775` (`.fan-size` > `.fan-nb`); manifest S4-c "a bigger centered fore + two smaller rotated neighbours"; `CardFan.tsx:47` (`foreW = variant==='results' ? 138 : 96`) + `:74` — the entry branch never enlarges the fore |
| R14 | **The results header reads a static "RESULTS", not the board's match COUNT** — board P3 heads the scroll with "3 MATCHES" (`:887`), the manifest OWES it as an R1-2 item (P3 row 1); the build renders a fixed "RESULTS" label with no count, so a searcher can't see how many the fan holds without walking the dots | ABSENT (count) | board `:887`; manifest P3 row 1 **OWED(R1-2)**; `add-game.tsx:156` (`querying ? 'RESULTS' : 'POPULAR FIRST ADDS'`) — the count is in `searchState.data.items.length`, cheap to render |

### ✅ Expected (deferred — proceed; manifest cites)
- **Fore-focus-by-default add-target** (GAP-3) — a recorded builder decision, §0.7-consistent (the fore
  auto-shows its detail, so it's addable without a first tap). Owner may re-rule to require an explicit
  tap; not a defect. Cite: manifest P1 fore-focus row `OWED(R1-2)` + §0.7.
- **Fore-tap → CardDetail / navigate** (P3b) — the fore tap is inert now; detail + M4 navigate are
  EXPECTED(M4 · CARD-23 · `:896`). LOCKED §0.7 interim.
- **RECENTLY ADDED + FRIENDS ARE PLAYING rails** — only POPULAR is built for M3-R; the other two rails
  EXPECTED(M4·CAT-11 / M6·CAT-12 · §0.6 · board `:758/:772`). P3b report · P7/P7b community cards ·
  P8 full celebration · P9 lifecycle → all EXPECTED / declared GAPs, not R1-2.

### 🎨 Polish / iteration (built-app, token-level)
- **R13-adjacent / GAP-1 — fan-nav dot count**: the build renders **one dot per catalog item** (8 dots
  on the "a" results, ~12 on POPULAR); the board draws a fixed **3-dot** affordance (`:764/:895`). A
  windowed/capped 3-dot indicator is the likely refinement (builder-declared GAP-1). Not a blocker — the
  fan rotates and the lit dot tracks correctly.
- **GAP-2 — dot shape**: plain 6px square vs the board's corner-notched `.fdot` (clip-path) — same
  OQ-127 family (the F-02 pixel-step/notch isn't rendered app-wide). Known-OQ.
- **GAP-4 — status-beat copy**: "ADDED TO YOUR SHELF / SET A STATUS" vs board "IN HAND — SET ITS STATUS"
  (`:1189`). Copy only; builder-declared. *(P6 not exercised live — from code `add-game.tsx:255/:257`.)*
- **Standing SWIPE/TAP hint absent (P3)**: the board draws "SWIPE TO ROTATE · **TAP THE FOREFRONT** FOR
  ITS DETAIL" under the fan (`:896`); the build shows no standing hint (only the inCollection-specific
  "ITS DETAIL OFFERS THE GAME PAGE…" line when the fore is owned). The `SWIPE` label on the fan-nav
  partly carries the swipe affordance; the tap-for-detail half is M4 anyway. Minor.
- *(No-action note: the P1 rail head "POPULAR FIRST ADDS" vs the board's bare "POPULAR" (`:765`) — the
  build's label matches the CAT-09 "POPULAR FIRST ADDS" empty-state naming used on collection; a
  deliberate label, not a drop. Noting so nobody "fixes" it to "POPULAR" and desyncs the two surfaces.)*

### ✔ Matches (verified live)
FlowHeader — LEFT "ADD GAME" + "‹ RETURN TO COLLECTION" link, no ✕, no count chip, RETURN works ·
docked SearchField "Search the catalog" at the screen bottom · **fan-meta above the fan, name-first,
all S4-f fields** (title · year·studio · genres · CAT-09 presence in accent · CAT-05 "ADDED BY" credit),
**updates with the fore** on every rotate (Destiny 2 → Celeste → Elden Ring → Forza, meta + lit dot
tracked) · **§0.7 focus-only** — neighbour/chevron rotate; fore-tap inert (a11y-confirmed) · gold ADD
present under the fan, fore-focused-by-default; owned fore → "IN YOUR COLLECTION ✓" disabled + hint
(inCollection gate works) · **RESULTS fan fore enlarged** (138×193 vs 96×134 neighbours) · CREATE hook
"NONE OF THESE — CREATE "<q>" ›" under the fan · **create form** — "CREATE A CATALOG ENTRY" head, NAME
pre-filled from the query, the full genre-chip set (16 chips), STUDIO · PUBLISHER · RELEASE DATE
(YYYY-MM-DD placeholder), gold "CREATE + ADD" (disabled until name+genre) + "Back to search" secondary ·
nav band COLLECTION keycap active (FlowTakeover intact).

### Not exercised (and why)
- **P6 status beat** (held card, 6 off-card COL-02 chips, DONE) + **P8 filed** — reaching them adds a
  game (mutation); optional per brief, skipped. Code shows `StatusBeat` (`add-game.tsx:238`) with the
  playing-first `GenreTag` chips + `GameCard/grid` no-stamp; the GAP-4 copy divergence is code-read.
- **P5 dedup banner (CAT-03)** — 409-`DUPLICATE_SUSPECTED`-driven; requires a create submit against a
  colliding name (a mutation attempt). Inspected the form only; banner is `PRE` per the receipt.
- **KeyboardLift rise + create-form keyboard inset (R0-follow)** — native, not web-observable; R2 device.
- **True phone-width stacking / thumb-reach** — Chrome pinned the viewport at 1280w (min-window floor);
  section order + geometry assessed at 1280, but the narrow-viewport layout the board frames is a device-
  pass check.
- **The enabled (non-owned) gold ADD** — every POPULAR + "a"-result game is owned by the demo shelf's
  curator, so the fore was always `inCollection`; the enabled gold state is the same `variant="add"`
  component verified gold on collection (R1-1), not re-shot here to avoid an add.

### Read of it
The R1-2 named fixlist is **honest and landed**: the FlowHeader restack (S4-a/e), the CardFan (S4-c) with
name-above-the-fan meta (S4-f), and the §0.7 focus-only interaction (S4-g) all verify live, and the
create form carries the full field set. Two real board-divergences remain — the **entry-fan fore isn't
enlarged** (R13, the "bigger fore" is only in the results variant) and the **results header shows
"RESULTS" not the owed match count** (R14) — both cheap, both manifest-cited as OWED. The builder's four
declared gaps resolve as expected (fan-dot count, dot shape, status copy → polish; fore-focus decision →
accepted). Nothing touches a LOCKED ruling. One builder pass on R13 (enlarge the entry fore) + R14 (render
the count) + optionally the 3-dot window (GAP-1) and this surface reads "matches the converged board"
within its declared GAP/EXPECTED envelope. The native keyboard fix (R0-follow) and P6/P8 remain owed to
the R2 device pass.

## R1-2 owner-iteration — parvati (M3-R, 2026-07-04)

**Verdict:** 0 🚩 flag · 0 ✅ expected · 0 🎨 polish — **8 code-confirmed, 0 live-confirmed this pass**
(the running app could not be reached past sign-in — see Not-exercised). Measured vs the manifest's
**"Owner iteration — 2026-07-04"** enumeration (`m3r/add-game-manifest.md:131–153`: D1/D3/D4 + notes
N1–N5) and the Add-game / Collection surfaces. This is a deferred re-review of commit **236fecc** (the
owner-feedback iteration built + self-verified in one session).
**Reviewed from:** the committed diff (236fecc) + a read of the working tree — **the live web loop was
blocked** (login barrier, below). No screenshots of the changed states were obtainable. Reads-only intent
throughout; `apps/mobile/.env.local` verified **absent** at start and end; no game added, no catalog
entry created. Standing stack adopted untouched (DB + API :4000 + Metro :8082 all external/owner-owned —
I started none, stopped none).

### Live barrier (why this pass is code-confirmed, not live-confirmed)
The Expo-web bundle targets **`http://192.168.68.58:4000/api`** (the LAN IP baked into `apps/mobile/.env`
for the owner's phone; `.env.local` is correctly absent, so the web bundle inherits it). Every browser
login attempt failed — the CORS preflight (`OPTIONS`) returns **200** (origin `localhost:8082` IS
allowed), but the follow-up `POST /api/auth/login` from the renderer either returns **503** or never
completes, surfacing the app's "Something went wrong" toast. The **API itself is healthy**: shell `curl`
to the *identical* LAN-IP URL + origin returned **200 on 5/5 rapid attempts (~90 ms each)** and `{"ok":true}`
on health for both localhost and the LAN interface. So the failure is **renderer-side network under the
session's Metro/renderer instability** (task `f5628409` — screenshots also CDP-timed-out at 30 s repeatedly
this run), not a credential, CORS-allowlist, or API-liveness problem. The canonical repoint-to-localhost
fix (`.env.local` → `EXPO_PUBLIC_API_BASE_URL=http://localhost:4000/api`) is **forbidden by this brief**
(no `.env.local`), and restarting :4000 / the phone's :8081 is likewise forbidden — so there was no
honest path past sign-in this session. Attempts made: 6+ login submissions across 2 fresh page loads,
2 shell health+login confirmations. The eight observable changes below are therefore verified against the
**diff + working tree**, and the two collection-side changes were **already verified LIVE in the prior
R1-1 fix-round pass** (this file, 2026-07-04) — noted per item.

### Code-confirmed (commit 236fecc + working tree) — the 8 enumerated changes
| # | Change (manifest ref) | Verdict | Evidence |
|---|---|---|---|
| 1 | **Fore enlarged 138×193** (D1) — bigger than the 96×134 neighbours in *every* state incl. entry | ✔ CODE-CONFIRMED | `CardFan.tsx:53–55` `foreW=138/foreH=193/dropY=16` unconditional; `variant` prop **removed** (`:16–20`). Directly closes the prior-pass **R13** (entry fore was 96×134). Neighbours stay `/cell` 96×134. *(Live pixel check owed — not reachable this pass.)* |
| 2 | **"ADD GAME" header = display-21** (N2) — same as Collection's "COLLECTION" title | ✔ CODE-CONFIRMED | `add-game.tsx` `flowTitle` `fontSize: theme.type.display` (was `theme.type.title`). Matches the Collection `ScreenHead` display size (F-06 21). |
| 3 | **No divider between header and POPULAR** (N3) | ✔ CODE-CONFIRMED | `add-game.tsx` `flowHead` — `borderBottomWidth/Color` removed (comment "N3 — no divider"). |
| 4 | **Focused game details centered** (N4) — name·year·studio·genres·presence·credit | ✔ CODE-CONFIRMED | `meta` `alignItems:'center'` + `textAlign:'center'` on all five meta styles (metaTitle/Sub/Genres/Presence/Credit). |
| 5 | **RETURN link orange** (N5) — the on-screen accent | ✔ CODE-CONFIRMED | `returnLink` `color: theme.scr.accent` (was `theme.scr.dim`). |
| 6 | **NavBand stays LIVE on Add-game** (N1) — COLLECTION keycap active, keycaps tappable | ✔ CODE-CONFIRMED | `ShellNav.tsx:33` `onCollection = pathname.startsWith('/collection') \|\| pathname.startsWith('/add-game')` → `/add-game` no longer falls to `locked`; COLLECTION is `activeKey`, keypresses route. **The key behavioural change — live tap-through owed to a device/live pass.** |
| 7 | **Collection RECENT sort → immutable `addedAt`** (D4/OQ-128) — chip present, reorders shelf | ✔ CODE-CONFIRMED **+ LIVE (prior pass)** | `collection.tsx:36` RECENT chip; `:206–207` sorts on `a.addedAt.localeCompare(...)` (immutable ISO), re-pointed off `ownedSince`; server `toItem`/`entry.createdAt` + shared schema + api-contract 0.50. RECENT chip + reorder + Sort-keycap pip were **verified LIVE** in the R1-1 fix-round pass (this file) on the `ownedSince`-interim; this pass confirms the re-point onto `addedAt` in code. |
| 8 | **STATUS chips lead PLAYING** after the shared-constant hoist (D3) | ✔ CODE-CONFIRMED **+ LIVE (prior pass)** | `COLLECTION_STATUSES = ['playing','backlog',…]` in the new shared `src/constants/collection.ts:6`; consumed by `collection.tsx:16/568` **and** `add-game.tsx` StatusBeat — one home, no drift. PLAYING-first STATUS row was **verified LIVE** in the R1-1 fix-round pass; the hoist preserves the same array order. |

### Not exercised (and why)
- **The entire Add-game live walk** (fore enlargement vs neighbours, display-21 header side-by-side with
  Collection, divider-gone, centered meta, orange RETURN, and critically the **live NavBand tap-through**
  N1) — **not exercised: Metro/renderer instability (task `f5628409`)** blocked the browser at the
  sign-in gate (LAN-IP `POST /login` 503s/hangs in-renderer while the API answers 200 from shell; the
  localhost-repoint fix needs `.env.local`, forbidden here). All 8 changes are code-confirmed; the
  pixel/interaction confirmation is owed to the next live or R2 device pass.
- **Collection RECENT reorder + PLAYING-first** — code-confirmed this pass **and** already live-verified
  in the prior R1-1 fix-round pass (2026-07-04, this file); not re-shot live given the barrier.

### Read of it
All eight owner-iteration changes (D1 enlarged fore, D3 shared STATUSES, D4 `addedAt` RECENT, and notes
N1–N5) are **present and correct in the committed code** — D1 directly closes the prior pass's **R13**
(entry-fore-not-enlarged) flag, and the two collection-side changes were already confirmed live in the
R1-1 fix-round. **No divergences and no new flags at the code level.** The one change that genuinely
needs eyes-on rather than a diff-read is **N1 (live NavBand tap-through on Add-game)** — the code wires
`/add-game` into Collection context, but "tapping COLLECTION/PROFILE navigates away" is a behaviour a
live or R2 device pass must exercise. Recommend the owner treat this pass as **code-verified, live-pending**:
the changes are sound on paper; the running-app confirmation was defeated by session-level Metro
instability, not by anything in the build. Cleanup: nothing started by me to stop; `.env.local` absent;
:4000 + :8081 left running.

## R1-5 · Shell polish (device-frame tweaks) — parvati (M3-R, 2026-07-04)

**Verdict:** 0 🚩 flag · 0 ✅ expected · 1 🎨 polish — **4/4 frame changes confirmed correct + the
keycap-depth guard INTACT** (a FRAME SPOT-CHECK, not a per-surface enumeration — the shell is
root-mounted so there is no manifest; measured vs the four owner device-feel notes in
`m3-walkthrough-iteration-notes.md` Steps 1 & 6 and the canonical device in `profile-states.html:48–80`).
**Reviewed from:** live Expo web on the **sign-in frame** (`/sign-in`, the guaranteed-reachable
full-frame surface — no login needed), own captures + DOM measurements, isolated fresh Chrome tab
group. Chrome clamped the window to a **1280×575** viewport (the 390-wide resize could not shrink below
Chrome's min-window floor), so the **vertical** frame geometry (which is what all four changes touch) is
what I judged, per the brief's clamp note. Signed-in active-keycap state **not exercised** — see below.

### The four device-frame changes (owner notes)
| # | Change (owner note) | Bucket | Verdict / evidence |
|---|---|---|---|
| S1-a | Top bar (POWER LED · INGAME engraving · grille) nudged **up ~¼cm** | MATCHES | ✔ Top-band content rides high near the frame top — INGAME logo top y=17, grille y=20, POWER y=31 (DOM). Source: `DeviceShell.tsx:53–54` `TOP_BAND 64→56 · TOP_PAD 16→8` (band centred, both drop together for a clean ~8px raise with alignment kept). Direction + cleanliness correct. |
| S1-b | Nav band's 5 keycaps nudged **down ~¼cm** (closer to device bottom) | MATCHES (web-capped) | ✔ Band content-sized, `paddingBottom` DOM-measured **10px**, band bottom flush to viewport bottom (gap 0), caps low near the device floor. On web `bottomInset=0` so the `Math.max(inset−8, 10)` lands on the **10px floor** — the down-nudge direction is correct but the true ¼cm magnitude is inset-driven (owner's R2 device pass is the real calibration). `NavBand.tsx:40`. |
| S1-d | **DISCOVER** + **PROFILE** above-labels a couple px **higher** over their caps | MATCHES | ✔ Both above-labels carry `translateY(-11)` (DOM `matrix(1,0,0,1,0,-11)`), sitting at y=456 vs the below-labels (STORE/COLLECTION/FRIENDS) at y=550. Board is −8; build raises to −11 (deliberate, code-commented "board −8 → −11"). `NavKeycap.tsx:145`. |
| S6-b | Black bezel border between device frame and Midnight screen **thinner** (9px→6px) | MATCHES | ✔ Bezel padding **6** in source (`DeviceShell.tsx:111`, was 9); the zoomed top-left corner shows a thin, clean black border ring between the teal plastic and the rounded Midnight screen. RN-web flattens the bezel/screen nodes so a direct child-inset read wasn't obtainable, but the source value + the visible thin ring both confirm it. |

### Regression guard (S1-c / R0 keycap depth — my diff must NOT have flattened it)
| Check | Verdict / evidence |
|---|---|
| Raised 3D drop-edge on all 5 caps | ✔ **INTACT.** DOM: every one of the 5 cream/tinted caps carries `boxShadow: rgb(10,43,40) 0px 4px 0px 0px` (the hard `0 4px 0 ink` drop edge, web branch). Zoom on the DISCOVER cap shows the dark drop-band offset ~4px beneath the cap face — reads as a physical raised key (muted slightly because the band is `locked`/greyed pre-auth at 0.45 opacity, but unmistakably present). The active-cap **sink** (collapse to `0 1px 0` + `translateY(3)`) is coded (`NavKeycap.tsx:167–174`) but only observable on a pressed/active cap — see Not-exercised. **No flattening from the shell-polish diff.** |

### 🎨 Polish / iteration (built-app, token-level — not a blocker)
- **Bezel token colour** — the app's bezel resolves to `rgb(20,18,31)` (#14121f) vs the mockup `--bezel: #14122a` (rgb(20,18,42)). A hair less blue-purple. Token-level only; the thinner-border S6-b change itself is correct. Noting so it isn't mistaken for a regression from this pass (it predates the shell-polish diff — `theme.shell.bezel`).

### Not exercised (and why)
- **Signed-in active-keycap state** (the active cap **pressed/sunk** with collapsed drop-edge + its **pink PipLight lit**) — **not exercised: web login instability.** `POST /login` to the LAN-IP base returned the app's "Something went wrong" toast on 3 attempts (the documented renderer-side LAN-IP failure under Metro instability, task `f5628409`; the localhost-repoint fix needs `.env.local`, forbidden by this brief). The frame is root-mounted and identical on every screen — only the active-pip/pressed-cap differs when signed in — so the four changes + the raised-edge guard are all fully evaluated on the sign-in frame; only the *active/sunk* half of the depth (already code-verified) awaits a live signed-in or R2 device pass.
- **True ¼cm magnitudes** (S1-a/S1-b down-nudge in real cm, and S1-b's inset-driven lower travel) — device-feel targets; the owner's **R2 physical-device look is the final calibration** per the brief. Web confirms direction + cleanliness, not the exact physical offset (no safe-area insets in a browser; the 1280w clamp is a desktop-width viewport).

### Read of it
The four shell-frame tweaks all landed cleanly and in the right **direction**, and — the point of the
guard — **the R0 keycap depth survived the diff**: all five caps still wear the hard 3D drop-edge
(DOM-confirmed `0 4px 0 ink` on every cap, visible in the zoom). S1-a raises the top bar (band + pad
drop together, alignment kept), S1-d puts the DISCOVER/PROFILE above-labels at −11 (a touch higher than
the board's −8, deliberately), and S6-b thins the bezel to 6px (clean thin ring in the corner zoom).
S1-b's down-nudge is correct in shape but web-capped at the 10px floor (it's home-indicator-inset-driven,
so the felt ¼cm only shows on a device). No divergence from the owner's intent, so nothing to flag — the
one 🎨 note is a pre-existing bezel-token hue, not a regression. The signed-in *active/sunk* keycap and
the real-cm magnitudes are the R2 device pass's to confirm; everything web-observable is clean.
