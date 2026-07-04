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
