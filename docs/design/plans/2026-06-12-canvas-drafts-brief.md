# Card Editor — CANVAS posture: design-track kickoff (0014 stage 3)

Authored by the canvas track (self-briefed from 0014/0015/0018 + the styler-track precedent);
owner green-lit stage 3 with the standing multi-draft rule ("Go ahead", 2026-06-12 — 3 distinct
treatments → gate → converge). This file is the plan; gate rulings get appended.

## The contract (decision 0014, stage 3)
- The Canvas = the **open-ended graphic**: base + vector elements (CARD-02) — the editor's
  **breakout posture**. "Breakout is a state the editor enters": the device frame **yields to
  maximal canvas**; the posture seam IS the two-form seam (closed attributes stay in-frame with
  the Styler).
- **Receives the composition** from the Styler's EDIT ART door; hands it back on exit. The closed
  attributes (frame · effect · finish · nameplate · title — decision 0018) are NOT edited here;
  the Canvas edits base + vector layers only.
- **Publish lives HERE** (canvas-tier, 0014) — surfaced at the moment of maximum pride
  (publish-at-peak, 0015). Outcomes: back-to-Styler / save draft / save private / PUBLISH.
- **OQ-007 is resolved here** (the breakout treatment = each draft's thesis) and **OQ-040's FULL
  "first print" ritual** is designed here (flatten-as-anticipation · layer-assembly replay ·
  gallery staging · routing: shelf slot · publish-at-peak · NOTIF-04 pre-prompt · share CARD-21).

## The requirements (complete inventory)
- **CARD-02**: vector primitives (shapes · letters · numbers · icons — **all free**, 0017) +
  optional colour/gradient base; no uploads, no AI.
- **CARD-08**: layers panel — reorder/select/rename/lock/hide/duplicate/delete · stacked-tap
  disambiguation · multi-select + group/ungroup · z-order.
- **CARD-09**: pan/zoom · snapping/smart-guides/align/distribute · nudge + numeric input ·
  surfaced undo/redo + scoped reset.
- **CARD-10**: per-element controls — opacity · solid/gradient fill · stroke · shadow/glow ·
  flip/mirror · blend · corner-radius.
- **CARD-11**: palettes/eyedropper/curated themes · fonts + curved/arc text (canvas text elements).
- **CARD-14**: drafts/autosave/crash recovery · unsaved-exit guard · duplicate.
- **CARD-15**: flatten pipeline; **true-to-life preview** (mid-edit **hold-to-preview**, 0015);
  thumbnail safe-area. **Element cap: 30** (OQ-008 ruling — draw the at-cap state).
- **CARD-16**: coachmarks · screen-reader/non-gesture path + reduce-motion (note at converge).
- **CARD-17**: asset library — searchable/categorized/recents/favourites (free-only post-0017).
- **CARD-19/20**: publish integrity (min-complexity · dedup) · published immutable
  ("edit" = duplicate-to-draft).
- **CARD-13** at publish: unowned premium closed attributes riding the card reconcile via the
  Styler's `ReconcileSheet` (reused verbatim; `POST /cosmetics/acquire-batch`).
- **OQ-048 ruling**: intensity effects-only, persists in composition. **OQ-049 ruling**:
  private cards land in the switcher + `/me/cards`.

## The three models (genuinely distinct; each proposes a breakout treatment — the OQ-007 axis)
- **A "Floating HUD"** — TOTAL breakout: the frame fully yields, edge-to-edge dark stage; tools
  are floating translucent clusters; selection summons a **contextual pill** beside the element.
  Direct-manipulation pole. `canvas/canvas-draft-a-hud.html`
- **B "Cockpit rails"** — PARTIAL breakout: the bezel persists as a thin workbench rail; a
  persistent left **tool rail** (icon keycaps) + a bottom **ElementTray** that swaps with
  selection. Zero-modality pole (the Styler-C lineage). `canvas/canvas-draft-b-rails.html`
- **C "Print shop"** — DIEGETIC breakout: entering the Canvas = the card **goes to the press** —
  shell swings away, workshop surface behind; the **LayerRack** (layers as physical slips) is the
  primary navigation; bottom-sheet grammar for tools. Metaphor pole. `canvas/canvas-draft-c-press.html`

## Panel contract (each draft renders P1–P8; lifecycle deferred WITH a caption note)
P1 Entry/breakout — the transition from the Styler (the frame yielding per the draft's treatment;
the composition arriving) — the OQ-007 thesis · P2 The editing surface — canvas + a selected
element mid-edit (THE model thesis) · P3 ADD (bucket ①) — `AssetShelf`: shapes/letters/icons +
the colour/gradient base picker · P4 EDIT (bucket ②) — `ElementTray`: CARD-10 controls + text
element w/ curve (CARD-11) · P5 LAYERS + PRECISION — `LayerRack` (CARD-08) + zoom/guides/nudge/
undo + **the 30-element at-cap state** · P6 DRAFTS + PREVIEW — autosave/crash-recovery/exit-guard
(CARD-14) + **hold-to-preview** (CARD-15) · P7 OUTCOMES — back-to-Styler · save private · PUBLISH
(CARD-19 checks + the reconcile if premiums ride + true-preview w/ thumbnail safe-area) ·
P8 **THE PRINT RITUAL** (OQ-040 full tier) — flatten-as-anticipation → layer-assembly replay →
gallery staging → routing (shelf slot · NOTIF-04 ask · SHARE, CARD-21).
Deferred to converge: loading/error/offline cells · reduce-motion + non-gesture notes.

## Hard rules (carried from the styler track)
- Compose from the catalog + these locked names: `CanvasStage` · `AssetShelf` · `ElementTray` ·
  `LayerRack` · `PrintRitual` (+ `ReconcileSheet` reused). FORM is each draft's; names fixed.
  Extras: build + flag at the gate, never silently.
- Tokens verbatim (Teal + Midnight); standalone HTML; Google Fonts via `media="print" onload`;
  built-in SVG; `ic-pix` verbatim where commerce appears. Sample data: Destiny — the diamond art
  **decomposed into its layer stack** (backdrop · orbit ring · diamond · facet · core ·
  satellites); Riko/Vanta/Maverick; values illustrative (OQ-002/OQ-011).
- **HTML only — no PNGs in the repo**; headless-Edge self-checks to TEMP, deleted before the turn
  ends. Behavior questions → APPEND to `docs/open-questions.md` only. No edits to product-spec /
  api-contract / design-spec / catalog / other tracks' files / SCREEN-STATUS rows other than 4.3
  Canvas. `git pull --rebase` before every push.
- Judgment call carried in: the canvas shows the BARE composition (base + vectors); a **CARD
  CONTEXT ghost toggle** previews the closed layers without editing them (flag at gate).

## Process
1. Brief (this file) → commit/push; SCREEN-STATUS 4.3 Canvas → in-pass.
2. Draft A → verify headless (delete shots) → README row → commit → push. Same for B, C.
3. **Owner gate in THIS session**: model summaries + judgment calls + each draft's OQ-007
   breakout proposal + the OQ-040 ritual treatment. Append the ruling here verbatim.
4. Converge → `canvas/canvas-states.html` (full matrix incl. lifecycle) → SCREEN-STATUS (row +
   UP NEXT) → STOP. OQ-007/040 resolutions = design-side; any behavior finds → the inbox.
