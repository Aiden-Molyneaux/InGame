# canvas — screen manifest (from canvas-states.html, 2026-07-06)

> **Surface:** M4 §3.4 Canvas (the deep gesture editor — decision 0014 stage 3, the breakout tier).
> **Board:** `docs/design/mockups/canvas/canvas-states.html` (P1–P11, converged 2026-06-13 "Let's go
> with C" — the print-shop grammar; the two ruled changes baked in: editbar-above-rack ·
> PROOF-at-set-sizes). **Authority stack:** design-spec **§2.5b** + §1.5 Canvas set (v0.18 entry) ·
> product-spec **CARD-02/07/08/09/10/11/14/15/16/17** · decisions **0062** (free/private boundary ·
> MOD-07 unscreened · CARD-21 out) · **0063** (the Essentials vector pack §1 + OQ-135 plate-required
> amendment §4) · **0064/0066** (render module · the ONE draft document · flatten-at-publish) · the
> gate-5 two-door exit model (`m4-review-notes.md` amendment round). **Code:**
> `apps/mobile/app/styler/[gameId].tsx` (the session holder — the Canvas is a POSTURE of it, see
> ARCH below) + NEW `src/components/canvas/*` + the render module (`src/render/`) + the shared
> element schema (`packages/shared/src/schemas/composition.ts`).
>
> **⚠ THE 0062 BOUNDARY GOVERNS THIS BOARD.** The board draws the publish path throughout — the gold
> **PRESS ▸ → ◆ PUBLISH**, the **CARD-19 checklist** (complexity · hash-dedup · premium-owned →
> ReconcileSheet), **CARD-20 immutability**, the **P8 PrintRitual** (OQ-040 first-print three-beat)
> with **SHARE (CARD-21)** and the **NOTIF-04 adoption-ask**. **ALL of it is
> `EXPECTED(M5 · decision 0062 §2/§7)`** — drawn, marked, NOT built. The M4 Canvas is the
> **free-asset vector editor**: ADD/EDIT/arrange vector slips (all free, 0017/0063 §1) → **PROOF**
> (client-side flatten + the size ladder — CARD-15's real in-app flatten consumer) → **SAVE
> PRIVATE / TO THE STYLER**. PUBLISH renders **present-but-disabled** (the surface's standing
> posture for deferred doors — the ⤢ CANVAS chip precedent).
>
> **⚠ ARCH — ONE DRAFT DOCUMENT, TWO-DOOR EXIT, EXTENDED NOT FORKED (the handoff's #1 rail).**
> The Canvas is **not a new route**: `/styler/[gameId]` gains a `posture: 'styler' | 'canvas'`
> state. The ⤢ CANVAS tools-bar button (PRE: `apps/mobile/app/styler/[gameId].tsx:742–748`,
> disabled until now) flips the posture; the ENTIRE session — the draft, `cardRow`, the debounced
> autosave timer, `resumeSnapshotRef`, `userEdits`/`createdHere`/`explicitSave`, the busy guards —
> stays in the one component that already owns it (PRE: `[gameId].tsx:118–205`). Consequences,
> all load-bearing:
> - **CARD-24a holds literally:** the posture switch edits the SAME `card_designs` row (0066 §6);
>   element edits ride the same debounced `PATCH /cards/:id`; crash recovery = the row (resume
>   lands in the Styler posture; the Canvas is always re-entered through it).
> - **Two-door extends:** the Canvas's **◂ returns TO THE STYLER posture** (session continues —
>   never an exit, never a loss); door 1 (✕ revert-to-snapshot / session-delete) and door 2
>   (SAVE ▸) remain the Styler posture's exits and now cover Canvas element edits for free — the
>   open-snapshot revert (PRE: `[gameId].tsx:439–466`) reverts the whole composition, elements
>   included. The PressSheet's SAVE PRIVATE calls the SAME `savePrivateQuiet()`
>   (PRE: `[gameId].tsx:312–343`); no second exit implementation exists.
> - **Canvas edits count as `userEdits`** — ✕ after canvas work confirms before discarding,
>   exactly as styler picks do (the D.23/D.24 lane; murr's named attack surface).
>
> **⚠ ELEMENT SCHEMA — ADDITIVE AT VERSION 1 (F21 note, recorded).** The board's editor needs
> element kinds/fields the M4-formalized schema doesn't carry yet: **`icon`** elements (the 0063 §1
> Essentials icons), poly shapes beyond star/diamond/triangle, and the CARD-10 per-element fields
> (opacity · stroke · gradient fill2 · glow · blend · flip · radius · name/locked/hidden ·
> text fontId/arc). These land **inside `cardElementSchema`/`compositionSchema` in
> `packages/shared`** (PRE envelope: `packages/shared/src/schemas/composition.ts:17–32`) as
> **additive** optional fields + union members, **schemaVersion stays 1**: client+server ship
> together in this monorepo; an older parser safeParse-fails a newer document → the default face
> (the F21 graceful degrade, `CardFace.parseComposition`, PRE: `CardFace.tsx:60–64`); the
> version-aware hash is content-sensitive over new fields automatically. Cap-30 unchanged —
> enforced at schema AND draw (PRE: shared `:30` + `buildCard.ts:216–218`).
>
> **⚠ CARD-16 — EVERY GESTURE SHIPS WITH ITS TAP ALTERNATIVE (built alongside, not retrofitted —
> the handoff's #2 rail).** The pairs table below is binding; parvati should walk BOTH columns.
> The full a11y board still rides §3.6 (decision 0062 §4) — this is the in-build baseline.
>
> | Gesture | Built-alongside non-gesture alternative |
> |---|---|
> | drag an element on the bed | **NumPop** X/Y steppers + tap-to-type (CARD-09 numeric input) |
> | corner-handle scale (sel-ring) | NumPop W/H steppers |
> | rotation (no handle drawn — numeric-only by design) | NumPop ROT stepper |
> | pull a slip (it's a TAP — tap toggles pulled) | already non-gesture |
> | drag-Z reorder (long-press-drag a slip L/R) | **◂ ▸ MOVE ops** in the ops row (OQ-105 non-gesture reorder) |
> | long-press → ops row | the pulled slip's **⋯ badge** taps the ops row open |
> | PROOF press-and-hold (momentary) | **tap toggles** proof on/off (OQ-046 kin) |
> | swipe/scroll the rack | plain horizontal ScrollView (scrollable by SR/keyboard) |
>
> **Copy law (OQ-110):** no spec-ID strings in rendered copy. Screen palette = `theme.scr.*`
> Midnight + `theme` tokens only — the board's `--bench` workshop tones map to the app's
> panel/bg ramp (the workshop is diegetic dressing, not a new palette).
>
> **Data seams:** NO new endpoints. Autosave `PATCH /cards/:id` · `POST /cards/:id/save-private` ·
> equip via the existing KEEP path — all PRE (`src/store/api.ts`, exercised by the Styler). PROOF
> is a **client-side flatten** (`flattenComposition`, PRE: `src/render/CardComposition.tsx:46–49`)
> — no server call (P11's offline-PROOF posture is architectural truth at M4).
>
> **Status legend:** as game-page/styler manifests (OWED · PRE w/ cite · EXPECTED(cite) ·
> ASSUMPTION · GAP · INTERIM→ADDENDUM).

---

## Shared chrome (every canvas-posture state)

| # | Element | Component | Notes | Status |
|---|---------|-----------|-------|--------|
| C1 | DeviceShell + NavBand (COLLECTION active) persist — the breakout is a posture INSIDE the routed screen, the shell never actually leaves (the swing is drawn dressing) | DeviceShell·NavBand | decision 0014: FlowTakeover tier + NavBand persist | PRE — the styler route already lives in the shell (`[gameId].tsx` renders inside ShellNav) |
| C2 | Top bar — **◂** key (returns TO THE STYLER posture) · "CANVAS" (display 21) · sub-line "«GAME» · DRAFT/PRIVATE · SAVED Ns AGO / SAVING… / NOT SAVED — RETRYING" (ticking) | flow-head + saveLine | board `:417–420`, `:468–470`; the save-line is the styler's existing ticking line re-labeled | OWED — reuses the PRE saveLine machinery (`[gameId].tsx:207–213, 676–682`) |
| C3 | The workshop dressing — bench-tone backdrop + the shell-swing edge decor on ENTRY (P1 beat, fades; reduce-motion = fade only, CARD-16) | CanvasStage backdrop | board `:413–415`, `:434`, caption `:455–459` | OWED — token-mapped (scr.bg ramp + shell.plastic edge at low opacity); the swing is a brief entry beat, not a persistent layout |
| C4 | Autosave — every canvas mutation runs the SAME `patchDraft` → debounced PATCH + retry + honest save-line | (session) | CARD-24a/0066 §6 | PRE (`[gameId].tsx:164–223`) — canvas ops call `patchDraft`, nothing new |

## P1 — Entry: the card goes to the press (board `:410–461`)

| # | Element | Component | Notes | Status |
|---|---------|-----------|-------|--------|
| 1 | Entry door — the Styler tools-bar **⤢ CANVAS** button goes LIVE (was disabled) | ScreenButton primary stepped | handoff §3; styler-manifest gate-5 D.20 | OWED — enable + `setPosture('canvas')` (`[gameId].tsx:742–748` PRE-disabled) |
| 2 | Second door — the KeepBeat "EDIT ART" Canvas door goes LIVE (was "arrives with the deep editor") | KeepBeat door | styler-manifest P7 row 4 → EXPECTED(§3.4) — that cite matures NOW | OWED — from `kept`, back to `edit` + canvas posture |
| 3 | The press bed — registration corners + the composition lying BARE: **base + vector elements ONLY** (closed attributes not drawn here — "shown only on PROOF") | `CanvasStage` | board `:422–433` + P1 hint `:434`; bed draw = base + elements, NO frame/plate/effect | OWED — NEW `buildBedElements` in the render module (same `element()` internals as the flatten — WYSIWYG holds by construction) |
| 4 | The slip rack fans in at the foot, dim/inert on the entry beat; editbar waits dim ("nothing to undo yet") | `LayerRack` + `EditBar` | board `:436–451` | OWED |
| 5 | Cap-meter "N / 30" (gold; alert-red at cap) | cap-meter in rack head | board `:442`, OQ-008 | OWED — client mirror of the schema cap (PRE: shared `:30`) |

## P2 — The surface: pull a slip, edit in isolation (board `:463–524`)

| # | Element | Component | Notes | Status |
|---|---------|-----------|-------|--------|
| 1 | **Slip pull = tap** — tapping a slip pulls it (raised, accent ring + square pip); tapping again releases; ONE pulled at a time | `Slip` (pulled variant) | board `:497–504`; CARD-16: tap IS the interaction | OWED |
| 2 | **Isolation** — with a slip pulled, every other element on the bed ghosts to ~28%; the pulled element draws full; "ISOLATION · ON" stat-chip top-right | CanvasStage + stat-chip | board `:477–488`, CARD-08 "solved spatially" | OWED — per-element opacity in `buildBedElements` |
| 3 | **Sel-ring** on the pulled element — accent box + 4 cream corner handles; drag body = move, drag corner = scale; center-snap guides flash at x/y center (CARD-09 snapping, drawn `:691`) | sel-ring overlay (RN views over the canvas) | board `:483–486`, `:110–114` | OWED — PanResponder overlay; the bed canvas itself stays display-only (faces are `pointerEvents="none"` — the gesture surface is the OVERLAY, handoff §3) |
| 4 | Stacked-tap disambiguation — tapping overlapping elements selects the topmost; repeat-tap cycles deeper | CanvasStage hit-test | CARD-08 | OWED |
| 5 | Locked slips (🔒 badge) refuse bed edits + drag; hidden slips (HID badge, 42%) leave the bed entirely | Slip badges + bed filter | board `:499`, `:503` | OWED |
| 6 | **Editbar** — RESET SLIP (scoped: reverts the pulled element to its state at PULL-time) · ↺ UNDO · ↻ REDO; dim when empty | `EditBar` | board `:490–494`, CARD-09; **history = the whole session** (styler picks + canvas ops share one bounded stack — one document, one history) | OWED |
| 7 | **Bench row** — + ADD A SLIP · EDIT THIS SLIP (disabled unless pulled) · 👁 PROOF · spacer · **PRESS ▸** (gold) | benchrow (ScreenButton/mini family) | board `:505–511` | OWED |
| 8 | Bench hint — "HOLD 👁 PROOF FOR THE TRUE PRINT · TAP PRESS ▸ TO FINISH UP" | hint micro | board `:512`, copy cleaned (no publish promise at M4 — "finish up") | OWED |

## P3 — ADD: the AssetShelf sheet (board `:526–593`)

| # | Element | Component | Notes | Status |
|---|---------|-----------|-------|--------|
| 1 | ADD A SLIP raises the app's ONE drawer (grab-handle sheet) over the dimmed bed | `AssetShelf` (reuses `PulledSheet`) | board `:548–583`; PRE primitive: `src/components/PulledSheet.tsx` | OWED |
| 2 | Sheet head — "ADD A SLIP — ALL FREE" | sh-h | board `:551`; 0017/0063 (all vectors free); meta spec-IDs are board-notes, not copy (OQ-110) | OWED |
| 3 | Category row — **SHAPES · LETTERS · NUMBERS · ICONS · BASE** (active = pip) | cat chips | board `:552–559` | OWED |
| 4 | **★ favourites + SEARCH** | — | board `:558`, `:551` | **INTERIM→ADDENDUM (CARD-17 at-scale — the free roster fits the grid; the styler "ALL N ›" precedent)** |
| 5 | The glyph grid — SHAPES (0063 §1 ~12: rect · rounded-rect · circle · ellipse · triangle · poly 5/6/8 · star · heart · diamond · line · arrow) · ICONS (0063 §1 gaming set — the build ships a REAL subset, see ADDENDUM) · LETTERS A–Z · NUMBERS 0–9 (placeable text glyphs riding the title fonts, 0063 §1/§4) | glyph grid (gcell) | board `:560–574` | OWED — icon registry NEW `src/render/icons.ts` |
| 6 | LETTERS also carries **ADD TEXT…** (typed text slip — the P4 "GUARDIAN" fragment's origin; MOD-07: ships unscreened per decision 0062 §6, closed beta) | text input row | board P4 `:654` fragment; CARD-11 | OWED |
| 7 | BASE row — solid/gradient swatches; picking one patches `base` (not an element) | base-row | board `:575–582` | OWED — sources the roster BASE_GRADIENTS + solids |
| 8 | A picked glyph lands on the bed **as a new pulled slip**, counts against 30; at cap the meter reds + picks disable | — | board `:581`, `:591`, OQ-008 | OWED |
| 9 | "No uploads, no AI — stated by omission" | — | CARD-02 | PRE by construction (no such affordance exists) |

## P4 — EDIT: the slip's sheet (board `:600–670`)

| # | Element | Component | Notes | Status |
|---|---------|-----------|-------|--------|
| 1 | EDIT THIS SLIP raises the second drawer; **the bed stays visible in isolation above it (no scrim-dim on the work — the no-scrim lesson)** | `EditSlipSheet` (PulledSheet-based, scrim transparent over the bed zone) | board `:622–651`, caption `:663–668`; §1.5 prose-names it "the EDIT slip-sheet" — code symbol `EditSlipSheet` PROVISIONAL (SaveBar precedent, map §12 note) | OWED |
| 2 | Sheet head — "THE «NAME» SLIP" + kind meta | sh-h | board `:624` | OWED |
| 3 | **OPACITY** slider (the catalog slider, re-labeled) | `IntensitySlider` (gains a label prop — variant, not fork) | board `:625–629`, CARD-10 | OWED (PRE base: `src/components/styler/IntensitySlider.tsx`) |
| 4 | **FILL** — swatch palette + colors-already-in-this-card (the recents/eyedrop stand-in) + SOLID/GRADIENT toggle (gradient = second stop `fill2`) | swatches + tog | board `:630–639`; true eyedropper → **INTERIM→ADDENDUM (CARD-11 at-scale)** | OWED |
| 5 | **STROKE** (color + width 0/thin/thick) · **GLOW** on/off · **BLEND** NORMAL/SCREEN/MULTIPLY | ctl rows | board `:641–646`, CARD-10 | OWED — render support lands with the schema fields |
| 6 | **MORE** — FLIP ↔ · FLIP ↕ · RADIUS (rect only) · DUP · DELETE (danger; undo-covered, no ConfirmSheet — 0040 reserves the sheet for non-undoable destroys) | tog row | board `:647–650` | OWED |
| 7 | **Text slips** — FONT (CHAKRA/PAYTONE — the two real title fonts) · CURVE NONE/ARC (CARD-11 arc text) · the text content editable | text fragment | board `:653–661`; fonts 2-of-5 = the styler ADDENDUM interim carries; spacing/align/case → **INTERIM→ADDENDUM (CARD-11 parity, at-scale pass)** | OWED |

## P5 — The rack in full: ops + precision + the cap (board `:672–735`)

| # | Element | Component | Notes | Status |
|---|---------|-----------|-------|--------|
| 1 | **Long-press a slip → the ops row** (also: the pulled slip's ⋯ badge taps it open — CARD-16 pair) | slip-ops row | board `:707–719`, caption `:728–734`, CARD-08 | OWED |
| 2 | Ops — **RENAME** (inline bounded input) · **LOCK** · **HIDE** · **DUPLICATE** · **DELETE** (danger, undo-covered) | op chips | board `:718` | OWED — name/locked/hidden persist on the element (additive schema fields) |
| 3 | **GROUP** op | — | board `:718`; CARD-08 multi-select+group | **INTERIM→ADDENDUM — present-but-disabled; multi-select/group rides the CARD-08 at-scale pass (§3.6 lane); recorded, not silent** |
| 4 | **◂ ▸ MOVE ops** (non-gesture Z-reorder — CARD-16/OQ-105 pair for drag-Z) | op chips | manifest CARD-16 table (an a11y-mandated addition beyond the drawn row — cite OQ-105/0044) | OWED |
| 5 | **Drag-Z** — long-press-drag a slip left/right reorders; **Z-order IS the rack order** (rack index = elements array index) | LayerRack gesture | board `:708`, CARD-08 | OWED |
| 6 | **NumPop** — the numeric X/Y (+W/H/ROT) popover: live readout while dragging + steppers + tap-to-type; opened via the ops row's **X·Y** op (CARD-09 numeric input; the CARD-16 alternative for move/scale/rotate) | `NumPop` | board `:697–700`, `:115–119`, CARD-09 | OWED — values are the normalized composition truth displayed in bed pixels |
| 7 | Center snap guides (accent hairline flash at x/y center while dragging near) | guide overlay | board `:691`, CARD-09 snapping | OWED |
| 8 | At-cap state — meter reds ("30 / 30"), ADD picks disable | cap-meter.full | board `:134`, caption `:733` | OWED |

## P6 — PROOF: the true print + the size ladder (board `:737–800`)

| # | Element | Component | Notes | Status |
|---|---------|-----------|-------|--------|
| 1 | **Hold 👁 PROOF** stamps the true print on the bed: the composition **client-flattened** (`flattenComposition` → PNG — CARD-15's real flatten, its first in-app consumer) with the **closed attributes live** — frame · plate (REQUIRED, OQ-135/0063 §4) · the effect+finish as RUNTIME overlays painted over the image (the CARD-15 viewer architecture, demonstrated) | `ProofView` | board `:746–757`, caption `:788–798`; render module gains `buildOverlayElements` (effect+finish only) | OWED |
| 2 | **Tap toggles** proof (the non-hold pair); release/re-tap lifts it, the slips return | — | CARD-16 table / OQ-046 kin | OWED |
| 3 | **The size ladder** — the print at the GameCard set sizes: **CELL·96 · MINI·64 · THUMB·48** (the app's real dims, `CardFace SIZE_DIMS` PRE: `CardFace.tsx:50–57`; the board labels GRID·96/THUMB·44 — the app truth wins, recorded); plate legible at 96, DROPPED at mini/thumb (F-06/0047 — PRE: `buildCard.ts:224–225`) | proof-sizes panel | board `:764–786`, CARD-07/15, decision 0047 (`:351–353`) | OWED |
| 4 | Ladder hint — "what you proof is what the shelf, top-5 & list rows show" | hint | board `:780` | OWED |
| 5 | Top-bar sub reads "· PROOFING" during | saveLine variant | board `:743` | OWED |

## P7 — PRESS: the finish-up sheet (board `:806–852`)

| # | Element | Component | Notes | Status |
|---|---------|-----------|-------|--------|
| 1 | **PRESS ▸** raises the finish-up sheet over the true preview (bed dims) | `PressSheet` (PulledSheet-based) | board `:828–841` | OWED |
| 2 | Sheet head — "THE PRESS — WHERE DOES IT GO?" | sh-h | board `:830` | OWED |
| 3 | The **CARD-19 checklist** (complexity ✓ · hash-dedup ✓ · premium-owned ✓ → ReconcileSheet) | — | board `:831–833` | **EXPECTED(M5 · CARD-19/CARD-13, decision 0062 §2)** — not rendered at M4 (publish-integrity has no publish to guard) |
| 4 | **◆ PUBLISH** (gold) | — | board `:835` | **EXPECTED(M5 · CARD-04/19/20, 0062 §2)** — present-but-**disabled** with a quiet "arrives with the community release" sub-line (the ⤢ CANVAS chip posture) |
| 5 | **SAVE PRIVATE** — the quiet exit: flush + save-private + back to the Game page; the card lists PRIVATE in the switcher | SaveOption row | board `:836`; OQ-049 | OWED — calls the PRE `savePrivateQuiet()` (`[gameId].tsx:312–343`) — ONE implementation |
| 6 | **TO THE STYLER** — posture switch back (session continues; nothing written) | SaveOption row | board `:837` | OWED |
| 7 | **CANCEL** (dim tert) — sheet closes, editing continues | tert | board `:838` | OWED |
| 8 | Publish rate-limit (SYS-05) note | — | board `:850` | EXPECTED(M5 — rides publish) |

## P8 — The first-print ritual (board `:854–927`)

**EXPECTED(M5 · OQ-040/decision 0062 §2) — the whole state.** `PrintRitual` fires on PUBLISH
(first-print tier); no publish at M4 → not built. SHARE (CARD-21) is EXPECTED(M5, 0062 §7);
the NOTIF-04 adoption-ask rides it. *(The Styler's light KeepBeat remains the M4 celebration —
0015 tiers respected.)*

## P9–P11 — Lifecycle (board `:931–1067`)

| # | State | Status |
|---|-------|--------|
| 1 | **P9 skeleton** ("opening the press") + **P10 SIGNAL LOST + RETRY** (draft-safe copy, CARD-14) | **SUBSUMED by the Styler's PRE lifecycle** (`[gameId].tsx:570–599, 654–674`): the Canvas posture is a synchronous switch on an in-memory session — it performs NO fetch of its own; every load/error/dead-resume path is crossed in the Styler posture BEFORE ⤢ CANVAS is reachable. parvati: not independently reachable (the §3.1 L1/L2 stance); the draft-safe copy lives on the Styler states (PRE: `:584, :662`) |
| 2 | **P11 offline** — editing + PROOF from cache, PRESS gated | **EXPECTED(SYS-10 — no offline infra at M4; the §3.1 L3 stance).** Architecturally honored anyway: PROOF is a client flatten (no server), autosave fails SOFT with retry + the honest "NOT SAVED — RETRYING" line (PRE: `[gameId].tsx:175–191`) — murr's autosave lane re-attacks it here with element churn |

---

## State-table walks (binding rule (b))

1. **Posture (`posture: styler | canvas`)** — `edit` mode only. ⤢ CANVAS (tools bar) or the KeepBeat
   EDIT-ART door → `canvas` (entry beat: swing decor + fade; reduce-motion: fade). ◂ (canvas head)
   or TO THE STYLER (PressSheet) → `styler`. The session object never unmounts across the switch;
   the autosave timer, snapshot, and flags carry. `pick`/`kept` modes never render canvas.
2. **Pull (`pulledIndex: number | null`)** — tap slip N: pulled = N (isolation ON, sel-ring on
   element N, EDIT THIS SLIP enables, NumPop available); tap again or tap another: release/switch.
   Locked slip: pullable (to unlock/ops) but bed-immutable. Hidden slip: pullable via rack;
   unhide via ops.
3. **Mutation → one pipeline** — EVERY canvas op (move/scale/rotate/add/delete/dup/reorder/
   field-edit/base-pick) runs `patchDraft(fn)` → local redraw + `userEdits++` + debounced PATCH +
   history push. No second write path exists.
4. **Undo/redo/reset** — one bounded session stack (styler picks + canvas ops); UNDO/REDO walk it
   (each step schedules a save); RESET SLIP replaces the pulled element with its pull-time snapshot
   (one history entry). Undone work still counts as `userEdits` (conservative — ✕ still confirms).
5. **ADD** — pick → element appended (array end = rack end = topmost Z), pulled, sheet stays up for
   multi-add? NO — sheet closes on pick (board: "lands pulled" — the bed is the confirmation);
   cap 30: meter red + picks disabled (schema would reject anyway).
6. **PROOF (`proofing: boolean`)** — hold (momentary) or tap (toggle). Entering: flatten current
   draft → PNG + overlays + ladder; slips/editbar hide behind the proof-sizes panel; leaving
   restores. Flatten failure → inline error on the bench, editing intact (never a crash).
7. **PRESS outcomes** — SAVE PRIVATE = flush → save-private → `router.back()` (the PRE quiet-exit,
   status recorded before nav); TO THE STYLER = posture switch; PUBLISH disabled; CANCEL closes.
   A `busyExit` guard covers double-taps (PRE: `[gameId].tsx:134–136`).
8. **Exit-model regression walk (murr priority)** — canvas-edit → ◂ → ✕ → confirm-discard: a
   RESUMED card REVERTS to open-snapshot (elements too — the D.23 kill-path re-armed by this
   surface); a session-created never-kept zero-edit draft still evaporates; SAVE-AS-NEW after
   canvas edits settles the old row first (PRE: `[gameId].tsx:390–424`).

## Component reuse (map §8b — compose, don't fork)

NEW (named in component-map §8/design-spec §1.5 v0.18): `CanvasStage` · `AssetShelf` (ElementTray
alias) · `LayerRack` · `Slip` · `EditBar` · `NumPop` · `ProofView` · `PressSheet`. NOT built:
`PrintRitual` (M5, above). PROVISIONAL name: `EditSlipSheet` (§1.5 prose "the EDIT slip-sheet" —
flag to the spec owner, SaveBar precedent). REUSED: `PulledSheet` (all three drawers — the one
summons), `IntensitySlider` (opacity — label variant), `ScreenButton`/`ConfirmSheet`/`CardFace`,
the 0064 render module (bed + proof + ladder — MANDATORY, no second draw source), the roster's
BASE_GRADIENTS (exported). Render module additions: `icons.ts` registry · `buildBedElements` ·
`buildOverlayElements` · new element kinds/fields in `buildCard.ts` — flatten and live stay one
tree by construction.

## Declared assumptions / gaps

- **ASSUMPTION(schema-additive-at-v1):** the F21 note in the banner — additive fields/members,
  version 1, monorepo-shipped-together; older parses degrade to the default face. If the spec owner
  wants a version bump instead, it is a one-line change at review.
- **ASSUMPTION(icons subset):** the build ships a real ~16-icon Essentials subset (+ shapes +
  A–Z/0–9); the full ~30 of 0063 §1 rides the pre-launch roster design pass (0063 §6) — the
  styler fonts-2-of-5 precedent. Recorded in the ADDENDUM at build with the exact list.
- **GAP(CARD-08/09/10/11 at-scale):** multi-select+GROUP · pan/zoom · align/distribute · true
  eyedropper · saved palettes · text spacing/align/case — NOT drawn on the converged board (or
  drawn as a single disabled op); ride the at-scale/§3.6 passes. Each is an ADDENDUM line, none
  silent.
- **Styler integration flips:** the ⤢ CANVAS chip/button + the KeepBeat door drop their
  "arrives with the deep editor" posture — update the styler-manifest rows (P2 row 2 / P7 row 4)
  via this manifest's cite at parvati time.

## Browser BOOT check (binding rule (c))

Login → Game page → EDIT IN STYLER (the seeded Aurora or a fresh draft) → **⤢ CANVAS mounts the
workshop** (no hook/early-return crash; the bed renders base + elements bare) → pull a slip →
drag + corner-scale + NumPop nudge → ADD a shape + an icon + a letter (cap-meter ticks) → EDIT
sheet: opacity/fill/stroke → ops: rename/lock/hide/dup/◂▸ → UNDO/REDO/RESET → **PROOF (tap +
hold): flatten PNG + overlays + the 96/64/48 ladder** → PRESS ▸ → TO THE STYLER (session
continues, picks intact) → back to CANVAS → PRESS ▸ → SAVE PRIVATE (lands on the Game page,
card PRIVATE) → re-enter → ✕ → confirm-discard REVERTS the elements (the D.23 walk). Autosave
PATCHes observed per mutation batch; zero console errors.
