# Nameplate legibility audit — game-card title plates under 9px

**Date:** 2026-06-29 · **Scope:** every converged `*-states.html` board · **Trigger:** owner —
illegible game-title nameplates on small card renders, to be resolved before M1 Engineering.

## What was measured

The game card (`GameCard` / `.gcard`) bakes the title into a **nameplate** (`.plate`) that is part of
the card artwork. The plate font scales with the card size. The base rule is `font: 700 10px` (legible);
every smaller card variant overrides it downward. The **F-06 type floor is 9px**, so any plate rendering
**< 9px** is the target of this audit. (9.0px is on the floor and counts as legible.)

**Root cause / why these passed Burt:** the on-screen type-scale pass explicitly treated card plates as
**print-exempt** ("plate type … scales with the card"), i.e. the nameplate has been considered part of the
card *art*, not a UI label. That exemption is exactly what this audit puts back on the table.

## The size ladder (plate font-size by card class)

| Card class (px) | Plate font | Verdict |
|---|---|---|
| `.gcard .plate` base — hero 138×193 / grid 161×225 / 96×134 | **10px** | ✅ legible |
| discover `.grid-size` · welcome `.show-size` · onboarding `fan-size`/`fan-nb` · styler/add-game forefront+nb | **9–10.5px** | ✅ already floored at/above 9 |
| lists `.cell` · canvas `.pc-grid` | **7.5px** | ❌ |
| contributor `.cell` | **6px** | ❌ |
| store `.fan-size` | 5.2px | ❌ (cosmetic, see Group C) |
| canvas `.pc-mini` | 5px | ❌ |
| game-page `.cell` 64×89 | 4.8px | ❌ (same-game, see Group D) |
| profile `.mini-size` · lists `.mini`(unused) | **4.5px** | ❌ |
| discover `.cell-size` · store `.cell-size` · styler `.cell-size` | 3.6px | ❌ |
| canvas `.pc-thumb` | 3.4px | ❌ |
| `.thumb` 44×62 (almost every board) + friends base plate | **3.2px** | ❌ |

## Findings grouped by likeness

### Group A — the plate IS the only game-title label, and it is illegible → genuine problem
These need a real decision; no legible title sits beside the card.

1. **Profile — Top-5 trophy case** · `mini-size` **4.5px**, 5 cards. Only a rank number accompanies each
   card. Recurs across self / arrange / friend-view artboards. `profile-states.html:108`, rendered
   `:507–517, 631–640, 849–858, 945–954, 1099+, 1335–1355`.
2. **Contributor — CARDS DESIGNED grid + V1 "VIEW ALL" all-cards** · `cell` **6px**. An adoption count
   sits beside (`312 ADOPTIONS`) but **not** the title. `contributor-states.html:92`, rendered `:773–779`.
3. **Lists / Top-5 editor — ranked seats #2–5 and the CardPicker grid** · `cell` **7.5px**. Rank/badge
   only, no title beside. (The #1 seat is a `hero` at 10px — legible.) `lists-states.html:104`, rendered
   `:384, 400–405, 595–598`.
4. **Canvas — CARD-07 "survives-downscale" demo strip** · `pc-grid` **7.5px** / `pc-mini` **5px** /
   `pc-thumb` **3.4px**. This strip deliberately renders one card at shelf / Top-5 / list scales to show
   CARD-07's universal representation; the plate is the label and is illegible by ~`pc-mini`.
   `canvas-states.html:241–247`, rendered `:765–773`. *(Conceptual — it's demonstrating the very issue.)*

### Group B — sub-9px plate, but the title already reads legibly beside/above → solution #2 already in place
The tiny plate here is redundant decoration; the game is named in legible body text.

- **Contributor — GAMES ADDED rows** (`thumb` 3.2px) → `.gt` title 11px beside. ✓
- **Collection — friend-view "library" list strips** (`thumb` 3.2px) → `.strip-title` beside. ✓
  *(Collection's own grid 2-up + shelf use the legible 10px base plate.)*
- **Discover — NOW PLAYING (`cell-size` 3.6px), QUEUE / rec / TRENDING rows (`thumb` 3.2px)** →
  `.np-title` / `.q-title` / `.rc-title` / `.t-title` beside. ✓ (UPCOMING rail is `grid-size` 9.5px.)
- **Friends — feed now-playing / published-card peek** (`thumb` 3.2px) → game named in the feed sentence. ✓
- **Admin-console — report-queue target preview** (`thumb` 3.2px) → report row names the target; board
  comment already marks the mini plate as CONTENT. ✓
- **Report-sheet — report target preview** (`thumb` 3.2px) → target named in the sheet. ✓
- **Add-game — type-ahead match row** (`thumb` 3.2px) → title in the field + row; board comment already
  declares "thumb exempt". ✓
- **Onboarding — compact added-games confirmation thumbs** (3.2px) → adjacent labels; primary add cards
  are `fan` 10/9px. ✓ *(spot-confirm at fix time)*

### Group C — plate isn't a game title (cosmetic / effect sample cards) → outside the literal ask
- **Store** · `fan-size` 5.2px / `cell-size` 3.6px / `thumb` 3.2px — plates read "Sample" / "Ember" /
  "Cinder" (finish & effect previews), not game titles.
- **Styler** · `cell-size` 3.6px — effect-picker tiles read "Sample" / "NONE" / "GHOST" with `.at-name`
  beside.

### Group D — same-game design gallery (page context already gives identity)
- **Game-page — YOUR CARDS + COMMUNITY CARDS switcher/gallery** · `cell` 64×89 **4.8px**. Every card is a
  different *design* of the **same** game (the page's game — e.g. all "Destiny"); differentiated by
  art/finish + a "BY <designer>" credit beside. The plate is decorative redundancy, not a wayfinding label.
  `game-page-states.html:102`, rendered `:610–614, 678–683, 1204–1209`.

### Group E — dead/unused CSS (no rendered instance; tidy up regardless)
- **Lists** `.gcard.mini` (4.5px) — defined, never used in markup.
- **Profile** `.gcard.thumb` (3.2px) — defined; Top-5 uses `mini-size`; thumb appears unused.

## Boards already at/above the 9px floor (the precedent for "solution 1")
add-game (10px forefront / 9px neighbour, thumb exempted), onboarding (10/9), styler (10),
discover `grid-size` (9.5), welcome-auth (9). These show the "bigger card / floor the plate at 9" path is
already partly walked elsewhere.

## Recommendation (not one global fix)

- **Group B / C / D** — no action required for legibility (title already legible beside, or not a game
  title, or identity comes from page context). Optionally drop the redundant tiny plate as cleanup.
- **Group A** — the real call. Two sub-shapes:
  - **Trophy seats (Profile Top-5, Lists seats #2–5)** are the same pattern — showcase "set pieces".
    Solution #1 (fewer-up, larger cards with ≥9px plates) preserves the trophy feel but fights the 5-up
    width budget on a ~318px screen; Solution #2 (drop plate, rank + title row) always fits.
  - **Contributor CARDS DESIGNED** can mirror its own GAMES ADDED treatment — a title caption beside the
    adoption count (solution #2), cheap and self-consistent.
  - **Canvas CARD-07 demo** is a spec question, not a CSS tweak: does CARD-07 require the plate to survive
    downscale, or do small renders drop the plate in favour of context labels?
- **The root principle to rule:** is the nameplate **card art** (print — scales down, exempt) or a **UI
  label** (must hold the 9px floor)? That ruling (an OQ / decision) determines every Group A fix and should
  be settled before M1.
