# add-game — screen manifest (from add-game-states.html, 2026-07-04) · **R1-2 · STAGING DRAFT**

> **Surface:** R1-2 Add-game. **Board:** `docs/design/mockups/add-game/add-game-states.html` (P1–P9,
> C5 v2 · the pass-4 restack: name-above-the-fan). **Code:** `apps/mobile/app/add-game.tsx`.
>
> **STATUS: staged, not yet built.** This is the R1-2 starting contract, extracted at the owner's
> request while R1-1 closes. Per the **recalibration rules** (`m3r-build-task.md` §1, 2026-07-04): a
> build-state claim reads `UNVERIFIED` unless it carries a code cite / screenshot check — the R1-2
> builder + parvati verify each against the running app. The R1-1 build baseline below was only
> **lightly scanned** (`add-game.tsx` grep), so its rows are UNVERIFIED by construction.
>
> **Scope filter: M3-R.** Later-milestone elements are marked `EXPECTED(<milestone> · <cite>)`.
> **Status legend:** `OWED(R1-2)` = build this pass · `UNVERIFIED` = build-state unchecked, verify ·
> `EXPECTED(…)` = later-milestone · `LOCKED(§0.n)` = owner-accepted.

---

## R1-2 owner-notes fold-in (the fix list — `m3r-build-task.md` §3)

| Note | What it is | Lands on | Authority |
|------|-----------|----------|-----------|
| **S4-a** | FlowHeader: **left-aligned title**; the ✕ → a labeled **"‹ RETURN TO COLLECTION"** link | every state, head | board `.flow-head` + `.return-link` (`:755–756`, `:884–885`) |
| **S4-c (BIG)** | **The CardFan** — a 3-up fan: center **fore** card + two **rotated neighbours** (`.nb l`/`.nb r`), **‹ ● ● ● ›** dots + **SWIPE** hint beneath (`.fan-nav`) | P1 rails · P2/P3 results | board `.cfan`/`.fan-nav` (`:759–764`, `:890–896`) |
| **S4-f** | Fan-meta format: **NAME first**, meta **above** the fan; line 2 = **CAT-09 presence** ("IN 214 COLLECTIONS · 3 FRIENDS HAVE IT") + CAT-05 "ADDED BY" credit | P2/P3 | board `.fan-meta` (`:888–889`) |
| **S4-g** | Interim tap = **FOCUS-ONLY** (§0.7) — tapping a side card rotates it fore (auto-shows detail); tapping the fore card is inert until the M4 Game page swaps it to NAVIGATE (CARD-23) | fan | **LOCKED(§0.7)** |
| **S4-e** | The **count chip must NOT render** on this screen (it's not a collection-count surface) | head | board (no `.count` in add-game head) |
| **R0-follow** | **CREATE-mode keyboard**: the removed KAV also wrapped `CreateForm` — a focused lower field / Create button sits under the keyboard on iOS. Give the form a real fix (`KeyboardLift` on the tail, or `automaticallyAdjustKeyboardInsets`), verified at R2 device. | P5 create | murr R0 audit |

## Locked / deferred that touch this surface
- **§0.6** rails: **POPULAR FIRST ADDS / POPULAR** only for M3-R. **RECENTLY ADDED** (≈ CAT-11, M4) and
  **FRIENDS ARE PLAYING** (CAT-12, M6) → `EXPECTED`, not built (board draws all three at `:758/765/772`).
- **§0.7** S4-g focus-only (above).
- Per-game **card step** (P7/P7b community cards, CardPicker) → `EXPECTED(M4 · CARD-22/adopt)`.

---

## State: P1 — Entry (board `:745–812`)
FlowTakeover (NavBand untouched, COLLECTION keycap active) + FlowHeader (title + return link). The
**SearchField docks at the screen bottom** (like the collection in-place search); the body is the
discovery rails, each rendered **as a CardFan**.

| # | Element | Component | Variant/size | Docks | Copy | Status |
|---|---------|-----------|--------------|-------|------|--------|
| 1 | FlowHeader — left title + return link | `FlowHeader` | flow-head | head | "ADD GAME" · "‹ RETURN TO COLLECTION" | **OWED(R1-2 · S4-a)** (`:755–756`) |
| 2 | No count chip | — | — | head | (absent) | **OWED(R1-2 · S4-e)** |
| 3 | RECENTLY ADDED rail (CardFan) | `SectionHeader` + `CardFan` | fan | body §1 | "RECENTLY ADDED" | EXPECTED(M4 · CAT-11 · §0.6 · `:758`) |
| 4 | POPULAR rail (CardFan) | `SectionHeader` + `CardFan` | fan | body §2 | "POPULAR" | **OWED(R1-2 · S4-c · §0.6)** (`:765–771`) |
| 5 | FRIENDS ARE PLAYING rail (CardFan) | `SectionHeader` + `CardFan` | fan | body §3 | "FRIENDS ARE PLAYING" | EXPECTED(M6 · CAT-12 · §0.6 · `:772`) |
| 6 | Docked SearchField | `SearchField` + `KeyboardLift` | inset, bottom | tools slot | "SEARCH THE CATALOG…" | **OWED(R1-2)** — dock + lift (`:780–785`) |

## State: P2 — Searching (board `:814–872`)
Restacked (kbd-mode): the focused **name above** the fan, the field riding the keyboard, "MATCHING…".

| # | Element | Component | Variant/size | Docks | Copy | Status |
|---|---------|-----------|--------------|-------|------|--------|
| 1 | Fan-meta (name-first, above the fan) | Text (`.fan-meta`) | body/micro | above fan | "ELDEN RING · 2022 · FROMSOFTWARE" | **OWED(R1-2 · S4-f)** |
| 2 | CardFan (fore + 2 neighbours) | `CardFan` | fan | body | — | **OWED(R1-2 · S4-c)** |
| 3 | Docked field rides the keyboard | `SearchField` + `KeyboardLift` | inset | bottom | live query | **OWED(R1-2 · R0-2)** |

## State: P3 — Results (board `:874–952`)
"N MATCHES" + name-above-fan + the 3-up CardFan + `.fan-nav` (‹ dots › SWIPE) + hint "SWIPE TO
ROTATE · TAP THE FOREFRONT FOR ITS DETAIL" + "NONE OF THESE? CREATE A NEW ENTRY ›" hook.

| # | Element | Component | Variant/size | Docks | Copy | Status |
|---|---------|-----------|--------------|-------|------|--------|
| 1 | Match count header | `SectionHeader` | micro | body | "3 MATCHES" | **OWED(R1-2)** (`:887`) |
| 2 | Fan-meta line 1 (NAME · year · dev) | Text | body | above fan | "ELDEN RING · 2022 · FROMSOFTWARE" | **OWED(R1-2 · S4-f)** (`:888`) |
| 3 | Fan-meta line 2 — CAT-09 presence + CAT-05 credit | Text (`.fan-meta.sub`) | micro | above fan | "IN 214 COLLECTIONS · 3 FRIENDS HAVE IT" | **OWED(R1-2 · S4-f)** / CAT-05 credit EXPECTED(contributor, `:889`) |
| 4 | CardFan (fore + rotated neighbours) | `CardFan` | res-size fore + res-nb | body | — | **OWED(R1-2 · S4-c)** (`:890–894`) |
| 5 | fan-nav (‹ ● ● ● › + SWIPE) | `CardFan` nav | — | under fan | — | **OWED(R1-2 · S4-c)** (`:895`) |
| 6 | Tap forefront → CardDetail (P3b) / focus-only | `CardFan` tap | — | — | — | **LOCKED(§0.7 · S4-g)** — focus-only interim; P3b detail + navigate EXPECTED(M4) (`:896`) |
| 7 | CREATE hook | `TertiaryLink` | body | under fan | "NONE OF THESE? CREATE A NEW ENTRY ›" | **OWED(R1-2)** (`:897`) |
| 8 | gold ADD (→ P6 status beat) | `ScreenButton/add` | body + step | — | "ADD" | **UNVERIFIED** (build has an add() path; check vs board) |

## State: P3b — CardDetail + ReportSheet (board `:954–1052`) → EXPECTED(M4 · MOD-01 report)
The from-the-fan card detail + INCORRECT-INFO ReportSheet. `EXPECTED(M4)` — not an R1-2 item.

## State: P4 — No results (board `:1048–1106`)
Docked field + "0 MATCHES" → a blank materializes + the CREATE hook.
| 1 | 0-match blank + create hook | Text + `TertiaryLink` | — | body | "0 MATCHES" · "CREATE A NEW ENTRY ›" | **OWED(R1-2)** (`:1061`) |

## State: P5 — Create + dedup (board `:1108–1188`)
The create form (NEW ENTRY — HELD IN HAND) + the CAT-03 **dedup banner** (thumb-bearing, 409-driven).

| # | Element | Component | Variant/size | Docks | Copy | Status |
|---|---------|-----------|--------------|-------|------|--------|
| 1 | Create form fields | `TextField` ×N | inset | body | name · dev · publisher · year | **UNVERIFIED** (build has `CreateForm`; verify fields vs board) |
| 2 | Dedup warn banner (thumb + collision face) | `InlineBanner` + `GameCard/thumb` | — | above submit | "Did you mean…? / Already in the catalog" | **UNVERIFIED** (build has `InlineBanner` dedup) |
| 3 | Create + add (gold, F-02 step) | `ScreenButton/add` | body + step | foot | "CREATE + ADD" | **UNVERIFIED** — carries the intrinsic step (R1-1 ripple) |
| 4 | **Keyboard: form tail must lift** | `KeyboardLift` / insets | — | — | — | **OWED(R1-2 · R0-follow)** — murr R0 gap |

## State: P6 — Status pick (board `:1189–1254`)
"IN HAND — SET ITS STATUS": all six COL-02 status chips **off-card** (nothing prints on the art).

| # | Element | Component | Variant/size | Docks | Copy | Status |
|---|---------|-----------|--------------|-------|------|--------|
| 1 | Held card (no on-art stamp) | `GameCard` | grid | body | — | **UNVERIFIED** (build `StatusBeat` renders `GameCard/grid`) |
| 2 | Six status chips off-card | `GenreTag` ×6 | selected=accent | body | COL-02 set | **UNVERIFIED** (build has `StatusBeat` chips; verify all six + order) |
| 3 | DONE | `ScreenButton` | — | foot | "DONE" | **UNVERIFIED** |

## State: P7 / P7b — Card step + variant detail (board `:1255–1454`) → EXPECTED(M4 · CARD-22/adopt)
Community cards / CardPicker / CleanPeek — **not R1-2**.

## State: P8 — Filed (board `:1455–1536`)
Pure celebration, the card is the hero (+ a "VARIANT — IF YOU CREATED THE ENTRY" P5-path branch).
| 1 | Filed celebration | (celebration beat) | — | body | — | **UNVERIFIED / partial** — likely EXPECTED(polish) |

## State: P9a / P9b — Loading / Load-error (board `:1538–1640`)
Skeleton in the fan shapes (§1.6) · SIGNAL LOST + orange RETRY (§1.8). Same lifecycle family as
collection GAP-4 — likely `EXPECTED` (shared-component pass), confirm at R1-2.

---

## R1-1 build baseline — UNVERIFIED (light scan of `add-game.tsx`, 2026-07-04)
The current screen (pre-R1-2) renders, per grep — **each to be verified against the board by the R1-2 builder:**
- `SearchMode` (`:99`) — a **horizontal `ScrollView` of `GameCard size="cell"` seats** with an accent
  focus ring (`:166–175`), NOT the board's 3-up rotated **CardFan** → the S4-c gap.
- `FocusedMeta` (`:213`) — the focused card's meta (verify S4-f name-first + CAT-09 line).
- `StatusBeat` (`:236`) — off-card status chips (P6).
- `CreateForm` (`:267`) — create + `InlineBanner` dedup (P5); **no keyboard lift** on the tail (R0-follow).
- Return affordance / count-chip presence (S4-a/e) — **UNVERIFIED**, check the FlowHeader.

## Notes for the R1-2 builder
- The **CardFan** (S4-c) is the one genuinely new component — check `component-map.md` (it names
  `CardFan`) before building; it is **ACCURATE** in the map's built-components list, so compose from it.
- The docked SearchField + keyboard lift reuse the **R0 `KeyboardLift`** and the **collection
  search-morph** pattern just built in R1-1 (`collection.tsx` searchBar) — same grammar.
- Apply the **recalibration**: every `UNVERIFIED` row above must become a code-cited `PRE`/`OWED` or a
  flag before parvati; walk the fan's focus-state predicate through its table (S4-g).
