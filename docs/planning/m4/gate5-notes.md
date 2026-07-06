# Gate-5 owner notes — triage ledger (2026-07-06)

> The owner's device walk verdict on §3.1 + §3.2 (27 steps, `gate5-walkthrough.md`), triaged for
> the amendment round that runs BEFORE the Canvas (§3.4). Lanes: **FIX** (build as stated) ·
> **DESIGN** (bigger change, buildable from the note) · **RULED** (a taste call now decided) ·
> **SPEC** (ripples an owning doc / files an OQ) · **ANSWERED** (question answered, no build) ·
> **BLOCKED** (needs an owner answer — listed at the bottom).

## Closed at triage (no build)
- **B.4 · B.7 · B.9 · C.13 · C.15 · C.16 · D.19 · D.25** — pass, no notes.

## FIX — build as stated
- **A.1** Cards flash unstyled on login, then style. → Preload the skia render module behind the
  auth gate so faces are live when the Collection lands. (Owner: "might be fine for now" — doing
  the cheap preload; a real branded loading beat can ride later polish.)
- **A.2** Pinned-favourite card clipped at the bottom (applied border invisible). → layout fix.
- **A.3 + C.12** Card tap targets broken on native: Collection cards don't navigate; Profile only
  partially; only sub-regions of a card respond. → suspect the native skia `<Canvas>` swallowing
  touches inside `CardFace`; make the WHOLE card one target (`pointerEvents` on the canvas +
  Pressable at the wrapper) everywhere a card is tappable.
- **B.5** Game-page hero cards one size larger; tighten the title → facts → cards gaps.
- **B.6** NOTES field hidden behind the keyboard while typing. → KeyboardLift (the M3-R frame-aware
  helper) on the game-page form.
- **C.11** Equipped marker on tiles that also carry status tags → drop the word: **orange box + ◆
  glyph only**.
- **C.14** CardDetail sheet: card larger · the sheet gets a TITLE · "«game» — your design" drops
  the game-name prefix.
- **D.17** BaseRail behaves like the Add-Game fan: **swipeable + tap a neighbour to bring it
  forefront**; the fore card's style details render as **tiles/chips** (like EquipReadout
  elsewhere), not the prose label line; the BROWSE label goes.
- **D.18** START WITH THIS moves ABOVE Surprise me.
- **D.20** Kill the context line; the header line becomes `ELDEN RING — EDITING · SAVED 0s AGO`
  (all-caps where it will). Fix the ticker (it only updates on re-render → interval). **⤢ CANVAS
  leaves the section chips → the tools bar as an orange pixel-stepped button** (disabled until
  §3.4 — which is next).
- **D.21a** Drop the FREE tag from every free tile (too frequent); when priced tiles arrive (M5),
  the price overlays the tile's TOP-LEFT instead of a row under it.
- **D.21b** PLATE rail shows **the plate itself** (the bottom-of-card polygon + centred title,
  legible), not the whole card. TITLE rail shows **the game title rendered in each font**, not the
  whole card.
- **D.27** The delete/confirm sheet must rise from the bottom of the IN-APP screen (inside the
  device shell), not the OS screen bottom. → sheet positioning on native.

## DESIGN — bigger, buildable from the note
- **B.8** EDIT-STATS reworked: ALL stats display under YOUR PLAY; each stat is **individually
  editable in place** (open one stat's editor without opening a whole form and without shifting
  the layout). The full-form flip goes.
- **C.10** The garbage "DEFAULT" card dies: the blank default becomes **implicit** — not a tile,
  not counted in "YOUR CARDS — N". A game with no designs shows the implicit blank only. (The
  add-game-time card pick is future — SPEC below. The un-equip path is BLOCKED below.)
- **D.23/24/26** Exit-model consolidation — proposal delivered separately; BLOCKED on approval +
  the truncated D.26.

## RULED — taste calls now decided
- **D.22 → OQ-135 RESOLVED: a plate is required.** NONE leaves the plate rail; every composition
  carries a plate (min SLAB); legacy `shape:'none'` documents render as SLAB. (Walkthrough taste
  items #3 settled; #1 BaseRail label-doubling is mooted by D.17's tile readout; #2 gold START
  stays as built unless re-flagged; #4 ◆ glyph lands via C.11's glyph language + KEEP button pass.)

## SPEC — doc ripples / new OQs (routed this round)
- **OQ-135** → resolve (plate required); ripple decision 0063 §4 (drop `none` from the nameplate
  roster) + the CARD-01 "name always renders" note.
- **C.10** → CARD-18 display semantics change (implicit default; switcher lists REAL designs only;
  count excludes the blank) → product-spec + game-page manifest ripple; **new OQ**: pick-a-card
  joins the ADD-GAME flow (M5 lane).
- **D.21c** → **new OQ**: ink colour-picker for title inks (owner "might allow" — future).
- **A.1** → noted in the manifest as the sanctioned interim (preload now, branded loading beat
  later).

## ANSWERED — no build
- **D.21 "live skia tiles — resource expensive later?"** Each tile is a small live canvas; at the
  free roster's size (≤10/rail) it's cheap on-device. It would bite at a big premium roster — but
  that surface is already designed to change shape at scale (CARD-17 "ALL N" browser), D.21b makes
  the two heaviest rails cheaper (plate/font previews replace full cards), and tiles can be
  rasterized-once later without changing the UI. Not a now-problem; flagged on the M5-entry ledger.

## BLOCKED — owner answers needed
1. **Exit model** (D.23/24/26) — approve/adjust the two-door proposal (see chat).
2. **D.26 is cut off** — "I think that 'Save Private' should become …" — become what?
3. **C.10 un-equip path** — with the DEFAULT tile gone, how does the user go back to the blank
   default (or delete their only, currently-equipped design)?
