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
| 1 | FlowHeader — left title + return link | `FlowHeader` | flow-head | head | "ADD GAME" · "‹ RETURN TO COLLECTION" | **OWED(R1-2 · S4-a)** — baseline renders a centered title + a ✕ (`add-game.tsx:70–76`), not the left title + labeled return link (`:755–756`) |
| 2 | No count chip | — | — | head | (absent) | **OWED(R1-2 · S4-e)** — baseline renders a `CountTag` "N IN" (`add-game.tsx:75`); must be removed |
| — | **Fore-focus model (builder decision, §0.7):** the CardFan's centered card is the fore and is focused-by-default (index 0), so its fan-meta + ADD show without a first tap — the board's P1 static frame draws no meta only because nothing is mid-interaction. Tapping a neighbour rotates it fore; tapping the fore is inert (M4 navigate). Chevrons give a non-gesture rotate path (a11y + web-testable) | `CardFan` | — | — | — | **OWED(R1-2)** — recorded per collaboration rule |
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
| 8 | gold ADD (→ P6 status beat) | `ScreenButton/add` | block, gold + intrinsic step | under fan | "ADD TO COLLECTION" | **PRE** — `SearchMode` renders a block gold ADD, disabled until a card is focused, `inCollection` → "In your collection ✓" disabled (`add-game.tsx:180–192`); no literal "+" prefix so the icon-prop rider is a no-op (board's ADD is text) |

## State: P3b — CardDetail + ReportSheet (board `:954–1052`) → EXPECTED(M4 · MOD-01 report)
The from-the-fan card detail + INCORRECT-INFO ReportSheet. `EXPECTED(M4)` — not an R1-2 item.

## State: P4 — No results (board `:1048–1106`)
Docked field + "0 MATCHES" → a blank materializes + the CREATE hook.
| 1 | 0-match blank + create hook | Text + `TertiaryLink` | — | body | "0 MATCHES" · "CREATE A NEW ENTRY ›" | **OWED(R1-2)** (`:1061`) |

## State: P5 — Create + dedup (board `:1108–1188`)
The create form (NEW ENTRY — HELD IN HAND) + the CAT-03 **dedup banner** (thumb-bearing, 409-driven).

| # | Element | Component | Variant/size | Docks | Copy | Status |
|---|---------|-----------|--------------|-------|------|--------|
| 1 | Create form fields | `TextField` name · genre chips · studio · publisher · release-date | inset | body | name · genres · studio · publisher · YYYY-MM-DD | **PRE** — all present with per-field 422 error render (`add-game.tsx:362–390`) |
| 2 | Dedup warn banner (thumb + collision face) | `InlineBanner` + `GameCard/thumb` | — | above submit | "Did you mean…? / Already in the catalog" | **PRE** — 409 `DUPLICATE_SUSPECTED` → suggestions + "Create anyway" (non-exact only), tap a suggestion → pick existing (`:332–360`) |
| 3 | Create + add (gold, F-02 step) | `ScreenButton/add` | body + intrinsic step | foot | "CREATE + ADD" | **PRE** — gold `add` variant carries the R1-1 intrinsic step; disabled until name+genre (`:394–400`) |
| 4 | **Keyboard: form tail must lift** | `automaticallyAdjustKeyboardInsets` | — | ScrollView | — | **FIX(R1-2 · R0-follow)** built — see receipt; native, R2-device-confirmed |

## State: P6 — Status pick (board `:1189–1254`)
"IN HAND — SET ITS STATUS": all six COL-02 status chips **off-card** (nothing prints on the art).

| # | Element | Component | Variant/size | Docks | Copy | Status |
|---|---------|-----------|--------------|-------|------|--------|
| 1 | Held card (no on-art stamp) | `GameCard` | grid | body | — | **PRE** — `StatusBeat` renders `GameCard/grid`, no stamp (`add-game.tsx:252`) |
| 2 | Six status chips off-card | `GenreTag` ×6 | selected=accent | body | COL-02 set | **PRE** — all six via `STATUSES`+`GenreTag` (`:256–260`); **order fixed this pass** to playing-first (rider) |
| 3 | DONE | `ScreenButton` | — | foot | "DONE" | **PRE** (`:261`) · copy: build says "ADDED TO YOUR SHELF"/"SET A STATUS" vs board "IN HAND — SET ITS STATUS" → 🎨 POLISH |

## State: P7 / P7b — Card step + variant detail (board `:1255–1454`) → EXPECTED(M4 · CARD-22/adopt)
Community cards / CardPicker / CleanPeek — **not R1-2**.

## State: P8 — Filed (board `:1455–1536`)
Pure celebration, the card is the hero (+ a "VARIANT — IF YOU CREATED THE ENTRY" P5-path branch).
| 1 | Filed celebration | (celebration beat) | — | body | — | **GAP (declared)** — build has no P8 celebration; the status beat (P6) doubles as the landing. Full celebration = EXPECTED(polish/M4); not an R1-2 item |

## State: P9a / P9b — Loading / Load-error (board `:1538–1640`)
Skeleton in the fan shapes (§1.6) · SIGNAL LOST + orange RETRY (§1.8). Same lifecycle family as
collection GAP-4 — likely `EXPECTED` (shared-component pass), confirm at R1-2.

---

## R1-2 build + verification outcome (2026-07-04)

Built this pass (all OWED(R1-2) rows above → done): the **CardFan** (`CardFan.tsx`, S4-c), the FlowHeader
restack (S4-a/e), the fore-driven FocusedMeta (S4-f), §0.7 focus-only (S4-g), the CreateForm keyboard
insets (R0-follow), and the STATUSES mirror. Verified by murr (diff) + parvati (live, vs this manifest).

**Findings routed:**
- **murr major — PanResponder stale closure (`CardFan.tsx`)** → FIXED (a `live` ref feeds the swipe
  handler the current `step`/`n`; the responder no longer freezes the mount-time fore). Delta re-verified.
- **parvati R14 — results header was static "RESULTS"** → FIXED to the board's count ("N MATCHES" ·
  "MATCHING…" while fetching; board `:827`/`:887`).
- **parvati R13 — entry (POPULAR) fore "not enlarged"** → surfaced to the owner (the board P1 fore is
  `.fan-size` 96×134 = neighbour size, so this was a board-faithfulness call, not a build defect). **Owner
  ruled 2026-07-04: enlarge it** — the fore is now always 138×193 (salient in every state), a deliberate
  divergence from the board's same-size P1 fore. The `variant` prop was removed (fore always enlarged).

### Owner iteration — 2026-07-04 (review feedback, all built)
- **D1** enlarge the focused/fore card → fore always 138×193 (`CardFan.tsx`); `variant` prop removed.
- **D3** hoist the duplicated `STATUSES`/`STATUS_LABEL` → one shared `src/constants/collection.ts`
  consumed by collection.tsx + add-game.tsx (kills the murr drift-debt).
- **D4 / OQ-128 RESOLVED** — `addedAt` commissioned end-to-end: shared schema + `toItem` serializer
  (`entry.createdAt.toISOString()`) + api-contract 0.50 + the client RECENT sort re-pointed onto it.
  Verified by the collection integration slice (26 tests) + unit/typecheck.
- **Notes:** N1 the NavBand stays LIVE on Add-game (ShellNav treats `/add-game` as Collection context —
  COLLECTION keycap active, keypress switches tabs; was rendering `locked`/gray); N2 the "ADD GAME"
  header is now display-21 (= the Collection ScreenHead); N3 the header→POPULAR divider removed; N4 the
  focused game's details are centered; N5 the RETURN link is orange (`scr.accent`).
- **Fore-focus-by-default** kept (owner: "keep how it's done now").
- **Polish (deferred, declared):** fan-nav one-dot-per-item (board draws 3; a cap/window is the likely
  refinement) · plain-square dots (OQ-127 notch family) · status-beat copy ("ADDED TO YOUR SHELF" vs
  "IN HAND — SET ITS STATUS") · the standing "SWIPE TO ROTATE · TAP THE FOREFRONT" hint is **omitted
  intentionally** — its second clause promises the M4 fore-tap→detail (§0.7 inert now), so the full
  board hint would be a dead-end promise; the SWIPE affordance lives in the fan-nav.
- **Owner-call (declared, parvati ✅ EXPECTED):** fore-focus-by-default changes the Add target to the
  centered card (was explicit-tap). §0.7-consistent; owner may re-rule to explicit-tap.
- **Spot-audit SA-1 (fore size while live-typing):** the board's P2 (keyboard up, typing) uses the
  small fore (`.cfan`), P3 (settled) the big fore (`.cfan.res`); the build shows a spinner while
  fetching and the big-fore fan only once results resolve — so the P2 small-fore fan state maps to the
  spinner, and the resolved fan is P3-faithful. Accepted; noted for the owner.

## R1-1 build baseline — GROUNDED (read of `add-game.tsx`, 2026-07-04, Task 1)
Verified against the code before building:
- `SearchMode` (`:99`) — a **horizontal `ScrollView` of `GameCard size="cell"` seats** with an accent
  focus ring, NO fore/neighbour/rotation, NO fan-nav (`:166–178`) → the **S4-c gap** (OWED).
- `FocusedMeta` (`:213`) — **S4-f content is already correct**: name-first title, year·studio, genres,
  the CAT-09 presence line ("IN N COLLECTIONS · N FRIENDS HAVE IT"), the CAT-05 "ADDED BY" credit. It
  renders only when a card is tapped (`focused`); the CardFan makes the fore focused-by-default so the
  meta shows for the centered card. **Reuse the component, drive it from the fore.**
- `FlowHeader` (`:70–76`) — centered "ADD GAME" between a **✕** (left) and a **`CountTag` "N IN"**
  (right). S4-a wants a LEFT title + a "‹ RETURN TO COLLECTION" link and NO ✕; S4-e wants NO count →
  both OWED.
- `StatusBeat` (`:236`) — off-card `GenreTag` chips + `GameCard/grid`, no on-art stamp — **PRE**; the
  status order is backlog-first (diverges from collection's playing-first) → **mirror this pass** (rider).
- `CreateForm` (`:267`) — create + `InlineBanner` dedup + per-field 422 — **PRE**; a plain `ScrollView`,
  **no keyboard inset/lift** on the tail → **R0-follow OWED**.

## Notes for the R1-2 builder
- The **CardFan** (S4-c) is the one genuinely new component — check `component-map.md` (it names
  `CardFan`) before building; it is **ACCURATE** in the map's built-components list, so compose from it.
- The docked SearchField + keyboard lift reuse the **R0 `KeyboardLift`** and the **collection
  search-morph** pattern just built in R1-1 (`collection.tsx` searchBar) — same grammar.
- Apply the **recalibration**: every `UNVERIFIED` row above must become a code-cited `PRE`/`OWED` or a
  flag before parvati; walk the fan's focus-state predicate through its table (S4-g).
