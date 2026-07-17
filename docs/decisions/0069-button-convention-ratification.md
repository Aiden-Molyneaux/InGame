# 0069 — Button-convention ratification: the one cream secondary/keycap voice

**Status:** accepted (owner rulings, 2026-07-10) · **Date:** 2026-07-10 ·
**Author:** Claude Code (spec-owner) · **Rules:** the owner's rulings on the M4 button-convention
audit (2026-07-10). Companion to **0041** (F-02 intrinsic-step grammar), **0067** (§3.4 Canvas
gate-5 batch), and the Design System Catalog Foundation Rules **F-02/F-03/F-07/F-08**.

## Context
The §3.4 Canvas introduced CREAM keycaps in the *built* app for the first time (PROOF · TRANSFORM ·
the panel-door EDIT · undo/redo · the AssetShelf category tabs) but built them as **bespoke inline
`theme.brand.cream` Pressables**, not via the catalog. A cross-cutting audit of every built + mockup
button found the app's button language had forked two ways:

1. **`ScreenButton/secondary` rendered GREY** (`scr.panelHi`) on every signed screen — even though
   **design-spec §1.5 already specifies `/secondary` = `brand.cream`, navy ink** (and the token table
   assigns `brand.cream` the role "Keycaps, dark-theme chips"). The **build** was the sole outlier.
2. **DESIGN NEW rendered ORANGE** (`scr.accent`) in `CardSwitcher` — even though **design-spec §1.5
   already specifies the DESIGN NEW tile as gold-step, F-02** (and the code's own comment said "gold,
   card-creating"). Again the build was the outlier.

The owner ruled **Option B — honour the spec**: cream is the one quiet-key voice; the build conforms.
This record formalizes that plus the genuinely-new catalog additions the Canvas needed. The bespoke
Canvas cream keys are folded into the catalog **before the §3.4 tree commits**, so they aren't touched
twice.

## Rulings

### 1 — `ScreenButton/secondary` = cream (build conforms to design-spec §1.5)
The `ScreenButton` FILL map flips `secondary: scr.panelHi (grey) → brand.cream`, ink `scr.ink →
brand.navy`. **This is a build fix, not a spec change** — §1.5 already said cream. One edit re-skins all
~13 signed secondary instances (Collection, Profile, Game page, CardSwitcher/CardDetailSheet,
Add-game). Pressed = the existing opacity scanline-energize (F-03, no travel), consistent with the
other variants. **A Parvati visual re-walk of those five signed surfaces is OWED** (rides the already-
owed device walk + the CARD-16 a11y pass — cream reads louder than grey on `scr.bg`).

### 2 — the cream keycap system is catalog components, not bespoke Pressables (no new `key` variant)
Because §5.3 `secondary` is now cream, a separate `key`/`cream` variant would fork a component for
**zero visual difference** — forbidden by the naming law (variants are props, don't fork). The labelled
cream Canvas keys collapse into existing catalog components:
- **PROOF · TRANSFORM · panel-door EDIT → `ScreenButton/secondary`.** Two additive props serve their
  stateful, momentary nature (backed by real needs, not speculation): **`size="mini"`** (the compact
  ~30px keycap geometry — TRANSFORM, EDIT-door) and **`active`** (a darkened-cream ON state for the
  mode-keys — PROOF while proofing, TRANSFORM while its drawer is open). PROOF's hold-or-tap uses the
  new `onPressIn/onPressOut` passthrough.
- **↺/↻ undo/redo → `ToolButton`** (the catalog's icon-only cream keycap — they already fit its 32×30
  spec). `ToolButton` gains a **`disabled`** state (dim + inert at the ends of history).
- **AssetShelf category tabs (SHAPES/LETTERS/NUMBERS/ICONS/★)** — a `cream` tone of `SectionSwitch`
  was built and then **REVERTED on the owner's visual review (2026-07-10)**. The tabs keep their
  **original bespoke cream chips** (cream cap · navy ink · orange corner-pip active), which read better
  in the Add-Slip menu than the SectionSwitch treatment (inline StateMark + accent border). `SectionSwitch`
  is unchanged from its pre-0069 form.
- The duplicated pressed-cream literal `#d9d4c2` (copy-pasted across EditBar/CanvasSurface/AssetShelf)
  is retired to a token: **`brand.creamPressed = #d9d4c2`**.

### 3 — DESIGN NEW = gold (build conforms to design-spec §1.5; F-02)
DESIGN NEW creates a card → acquisitive → gold. `CardSwitcher`'s `newTile`/`newPlus`/`newLabel` flip
`scr.accent → brand.gold`. **Build fix, not a spec change** — §1.5 already said "gold-step, F-02".

### 4 — destructive severity: alert FILL, not red text on grey
The Canvas `Op` and `Tog` DELETE actions rendered red *text* on a grey chip (understated). They now
take the **`brand.alert` fill** with cream ink — the `ScreenButton/destructive` grammar.

### 5 — three mockup F-rule violations resolved RULE-WINS (fix the boards; the build was already correct)
- **`styler-states.html` `.chip.canvas`** — the raised `box-shadow: 0 2px 0` 3D drop-edge is removed
  (F-03: on-screen buttons are flat; the build renders CANVAS as a flat orange `stepped` ScreenButton).
- **`game-page-states.html` duplicate `.btn.cream:active`** — the superseded "Inset Recess" `:active`
  press block is deleted; the F-03 "Scanline Energize" block is the single press model.
- **`game-page-states.html` `.newtile`** — flipped to gold (consistent with ruling 3).

### 6 — deferred (no-visual refactor): the grey toggle extraction
The ~28 grey `Tog`/`boxTog` toggles (EditSlipSheet · TransformDrawer) keep their look; extracting them
into **one shared catalog toggle** (which needs a §1.5 name → gate ratification) is deferred to the
CARD-16 / pre-beta polish pass. Only their DELETE severity (ruling 4) changed now.

## Ripple / owning docs
- **design-spec §1.5** (v0.57): `brand.creamPressed` token added; `/secondary` mini + `active` noted;
  `ToolButton` `disabled` noted. (The cream-secondary and gold-DESIGN-NEW text was already present —
  this records the build conforming to it.)
- **component-map §5.3** (v0.9): `ScreenButton` secondary=cream (build conformed) + `active`;
  `ToolButton` `disabled`. (`SectionSwitch` unchanged — the cream tone was reverted, see §2.)
- **Code (folded into the uncommitted §3.4 Canvas):** `theme` · `ScreenButton` · `ToolButton` ·
  `EditBar` · `CanvasSurface` · `EditSlipSheet` · `AssetShelf` · `CardSwitcher`.
  typecheck ✓ · lint ✓ · 41 jest + 136 vitest ✓.
- **Not touched:** product-spec (pure look, no behavior/data change — 00-INDEX triage).
