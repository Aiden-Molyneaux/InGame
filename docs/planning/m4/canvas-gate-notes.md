# Canvas gate — owner change-request ledger (§3.4 acceptance walk, 2026-07-08)

> The owner's device acceptance walk of the **entire** Canvas feature (M4 §3.4 + the breakout
> follow-up), formalized for hand-back to **Claude Code** (agent review + build). Same lanes as
> [`gate5-notes.md`](gate5-notes.md): **FIX** (build as stated) · **DESIGN** (bigger, buildable from
> the note) · **SPEC** (ripples an owning doc / files an OQ) · **DECISION-NEEDED** (owner or
> spec-owner ruling required before build — listed with my recommendation). Triage per 00-INDEX §4
> (behaviour/data → product-spec [+ api-contract]; presentation → design-spec).
>
> **Under test:** `m4` head `d9157fb` + the uncommitted breakout diff (chrome-hide). **The walk
> record + per-item results:** [`canvas-acceptance-walk.md`](canvas-acceptance-walk.md).
> **Authority stack:** design-spec §2.5b/§2.5/§1.5 · `canvas-manifest.md` (+ ADDENDUM) · decisions
> **0014** (breakout tier) · **0015** (celebration tiers) · **0063** (roster/plate) · **0066**
> (CARD-24a one-document · autosave · crash recovery) · CARD-08/09/10/11/15/16/24a/24b · OQ-007/008/
> 040/046/110/135 · Foundation Rules F-02 (gold = currency) / F-06.
>
> **⚠ Process implication (CR-01):** the owner is **redirecting the breakout mechanism** (zoom, not
> chrome-hide). The uncommitted chrome-hide breakout diff is therefore **superseded — do NOT commit
> it as-final, and murr/parvati should run on the reworked zoom implementation, not the current
> diff.** The `canvas-manifest.md` C1/ARCH rows still need correcting (they wrongly say the shell
> "never leaves — drawn dressing"; §2.5b/0014 stage-3 = the shell **yields** to full-screen, however
> the transition is done) — fold that into the CR-01 rework.

---

## Master table

| CR | Owner ref | Change (one line) | Lane | Owning doc / IDs | Conflict / note |
|----|-----------|-------------------|------|------------------|-----------------|
| 01 | §0a | Breakout via **zoom in/out**, not chrome-fall-away | **RULED** → DESIGN | design-spec §2.5b · 0014 · OQ-007 | RULED: zoom **replaces** cabinet-swing; remove swing decor; transform-only (no remount) |
| 02 | §0b | Copy: "Add a slip"→**"Add slip"**, "Edit this slip"→**"Edit slip"** | FIX | design-spec §2.5b / manifest P3–P4 | — |
| 03 | §1a | Cap-meter **orange** (not gold) | FIX | design-spec §1.5 / manifest P1·5 | aligns F-02 (gold = currency) |
| 04 | §1b | "AUTOSAVED Ns ago" ticks **~every 15s**, not 1s — **Styler too** | FIX | manifest C2/C4 · §2.5 | display cadence only; CARD-24a autosave unchanged |
| 05 | §2a | **Toggle isolation off** while editing a layer | DESIGN + SPEC | product-spec CARD-08 · design-spec §2.5b | isolation currently always-on when pulled |
| 06 | §2b | Drag-Z: keep the **held** slip highlighted through the z-stack (not the displaced one) | FIX | manifest P5·5 (LayerRack) | interaction correctness |
| 07 | §3a | **Larger** shape/number/icon tiles in ADD | FIX | design-spec §1.5 / manifest P3·5 | — |
| 08 | §3b | **Base = an immutable, recolourable slip**; drop BASE from ADD categories | **RULED** → DESIGN | product-spec CARD-15 · design-spec §2.5b | RULED: field-backed **pseudo-slip** (no schema churn, no cap-30/Z impact); OQ-135/0063§4 precedent |
| 09 | §3c | A newly-added slip **immediately opens its EDIT sheet** | DESIGN | design-spec §2.5b | reverses manifest state-walk 5 ("sheet closes; bed is confirmation") |
| 10 | §4a | **TRANSFORM drawer** (joystick + size/rotation sliders + steppers) on the editbar | **RULED** → DESIGN | product-spec CARD-09/16 · design-spec §2.5b · component-map | RULED: name TRANSFORM · drawer · separate · subsumes NumPop · +bigger sel-ring handles |
| 11 | §4b | **Colourpicker + hex** field everywhere colours are chosen | DESIGN + SPEC | product-spec CARD-10/11 · design-spec §2.5/§2.5b | matures the deferred eyedropper/at-scale interim |
| 12 | §4c | Ops row needs a clear **close** affordance | FIX | manifest P5·1 | today only closes by tapping the slip-thumb top |
| 13 | §4d | **Lock = a glyph** (not text/emoji) | FIX | design-spec §1.5 | glyph language (cf. C.11) |
| 14 | P6a | PROOF stays **hold + tap** (a11y); swap **👁 → a glyph** only | **RULED** → FIX | design-spec §2.5b · OQ-110/DS | RULED: hold-only **REJECTED** (keep CARD-16 twin); glyph swap only |
| 15 | P6b | **Hide the editbar** (RESET/UNDO/REDO) during PROOF | FIX | manifest P6 / state-walk 6 | — |
| 16 | P6c + Misc | **Remove the bottom hint tooltip(s)** (bench + proof-ladder hints) | FIX | manifest P2·8 / P6·4 | owner walked it, doesn't need the coaching copy |
| 17 | P7a | **SAVE PRIVATE → gold + a LIGHT press beat** (press moment reachable at M4; don't discourage private) | **RULED** → DESIGN | decision 0015 · product-spec (OQ-040) · design-spec §2.5b | RULED: **lighter** beat, distinct from the full M5 publish PrintRitual |
| 18 | P7b | **Remove CANCEL** on the PRESS sheet (keep handle/scrim dismiss) | FIX | manifest P7·7 | ensure it stays dismissible |
| 19 | Misc | **Remove the orange pip** on the selected slip | FIX | manifest P2·1 | — |
| 20 | Misc | **Cross-posture save disclaimer** — KEEP/PRESS/SAVE-PRIVATE from either posture discloses it also saves the other posture's pending edits | DESIGN + SPEC | product-spec CARD-24a · design-spec §2.5/§2.5b | one document ⇒ any save persists both postures' edits |
| 21 | Misc | **Crash/close draft safety** — retain the ORIGINAL; drafted version lands as a separate **"Draft"** card (no in-place overwrite) | **RULED** → SPEC (STOP-and-file) | product-spec CARD-24a · api-contract · decision 0066 | RULED: **copy-on-write confirmed**; spec-owner files OQ/decision + specs before build |
| 22 | Misc | Game-page CARDS switcher: **revert 2-up → 3-up** | FIX | design-spec (game page) · game-page manifest | `CardSwitcher.tsx:20` `CELL_W=120` (gate-5 C.10/C.11); 3-up re-tensions "bigger cells" |
| 23 | Misc | **Canvas compositions saveable as presets** (like style-presets) | **RULED** → SPEC (M5) | product-spec CARD-24b · api-contract (`style_presets`) · design-spec | RULED: **deferred to M5**; file an OQ |

---

## FIX — build as stated
- **CR-02** copy trim · **CR-03** cap-meter → `scr.accent` orange · **CR-04** save-line label
  updates on a ~15s interval (both Canvas + Styler; the debounced PATCH is untouched) · **CR-06**
  the LayerRack drag-Z highlight tracks the dragged slip, not the slot it currently overlaps ·
  **CR-07** grow the ADD glyph cells (keep the single-context strip builder — the WebGL ceiling,
  ADDENDUM) · **CR-12** add an explicit ops-row dismiss (tap-out / a close affordance) · **CR-13**
  lock → a glyph badge · **CR-14** swap the PROOF **👁 emoji → a glyph** (interaction unchanged — see
  RULED) · **CR-15** editbar hidden while `proofing` · **CR-16** delete the bench hint
  (P2·8) + the proof-ladder hint (P6·4) · **CR-18** drop CANCEL from the PressSheet (handle/scrim
  still dismiss) · **CR-19** remove the selected-slip pip.
- **CR-22** (game page, not Canvas): revert the CARDS switcher grid to 3-up. **Cause found:**
  `apps/mobile/src/components/game/CardSwitcher.tsx:20` `CELL_W = 120` (fixed-width cells wrap-laid at
  `styles.grid`/`cellWrap`, lines 248–249) — 120px fits 2 per row on a ~390pt phone. *Note the
  tension:* CELL_W=120 came from **gate-5 C.10/C.11 ("a bit bigger" cells)** — going back to 3-up
  means smaller cells (≈96 or a 3-column percentage grid). Owner wants 3-up; flag the C.10/C.11
  re-tension for the spec-owner.

## DESIGN — bigger, buildable from the note
- **CR-05 · toggle isolation.** A per-session ISOLATION on/off (the pulled element still selects/
  edits; the others simply stop ghosting). Ripples CARD-08 ("solved spatially") — the isolation
  becomes optional, not automatic. Small chip/toggle near the existing "ISOLATION · ON" stat.
- **CR-09 · add → open EDIT.** On pick, land the slip pulled **and** raise its EDIT sheet
  immediately (colour-first). Reverses state-walk 5's "sheet closes, bed is the confirmation."
  Pairs naturally with **CR-08** (pick a glyph → edit it) and **CR-11** (colour there).
- **CR-11 · colourpicker + hex.** Everywhere a colour is chosen (Canvas FILL/STROKE, Styler TITLE
  ink): a real picker (HS wheel/area + value) + a **hex field**, alongside the existing swatches +
  in-card used-colours. Matures the CARD-10/11 eyedropper interim; one shared `ColorPicker`
  component (component-map) so Styler + Canvas share it.
- **CR-20 · cross-posture save disclaimer.** Because Styler↔Canvas is ONE document (CARD-24a), a
  KEEP / SAVE PRIVATE / PRESS from either side flushes **all** pending edits. Surface an honest line
  on the outcome sheet when the other posture has unsaved edits (e.g. "Also saving your Styler
  changes."). Applies on **both** surfaces' outcome sheets.

## RULED — owner decisions (2026-07-08); build from these
- **CR-01 · zoom breakout — RULED: zoom REPLACES the cabinet-swing.** The diegetic "device swings
  open like a cabinet" (OQ-007/§2.5b) is retired; the breakout is now a **scale-transform zoom** —
  the screen area grows to full-bleed on Canvas entry, shrinks back on exit. **Remove the shell-swing
  decor** (CanvasSurface + manifest C3). Keep the DeviceShell mounted and animate a transform only →
  **no-remount invariant preserved** (CARD-24a session/skia bed never unmount). §2.5b + OQ-007 need a
  spec-owner rewrite (the diegetic is a zoom now). *Watch:* the end-relayout re-triggers the rn-skia-
  **web** paint race (native unaffected — verified 2026-07-08).
- **CR-08 · base-as-slip — RULED: field-backed pseudo-slip (owner took the rec).** `base` stays a
  composition **field**, rendered as a **pinned, non-deletable, recolour-only pseudo-slip** at the
  rack bottom; **drop BASE from the ADD categories**; base controls surface only when that slip is
  pulled. No schema churn, no cap-30 / Z-order impact (plate-immutability precedent, OQ-135/0063 §4).
- **CR-10 · TRANSFORM drawer — RULED: owner took the full rec.** Name = **TRANSFORM**; a **drawer**
  (reuse the one-summoned-drawer grammar), **separate** from the EDIT slip-sheet; opened by an editbar
  button **between RESET SLIP and UNDO**. Contents: **position** (joystick + X/Y steppers) · **size**
  (W/H sliders + steppers) · **rotation** (dial/slider + stepper). **Subsumes NumPop** (one precision
  surface). Complementary FIX bundled in: **enlarge the sel-ring corner hit-areas**. Novel surface →
  may warrant the 0014 multi-draft design pass. product-spec CARD-09/16 + design-spec §2.5b + a
  component-map `TransformDrawer` entry.
- **CR-14 · PROOF — RULED: hold-only REJECTED; keep the a11y behaviour.** No interaction change —
  **keep PROOF as hold (momentary) + the tap-toggle non-gesture twin** (CARD-16 intact). The
  presentation half **survives as a FIX**: swap the **👁 emoji → a glyph** (no emoji in UI, OQ-110/DS).
  *(Reclassified DECISION → FIX; only the glyph swap builds.)*
- **CR-17 · SAVE PRIVATE — RULED: a lighter press beat (owner took the rec).** SAVE PRIVATE gains gold
  weight + a **light press/print beat** at M4, **distinct from** the full M5 publish `PrintRitual`
  (PUBLISH keeps the big ritual for M5). Route through **decision 0015** (a new light-tier press beat
  slots beside KEEP's beat) + OQ-040; design-spec §2.5b.
- **CR-21 · crash-draft safety — RULED: copy-on-write CONFIRMED (STOP-and-file → spec-owner).**
  Editing an **existing** card works on a **draft copy**; the original is **untouched until KEEP**; a
  crash/close leaves the copy listed as a **DRAFT** card (the switcher already renders DRAFT). Claude
  Code (spec-owner) designs this against **CARD-24a/0066** — autosave target, resume, equip, and the
  extra-row storage — and **files the OQ/decision + edits product-spec + api-contract** (this is the
  mandatory STOP-and-file lane; do not build before it is specced).
- **CR-23 · canvas presets — RULED: deferred to M5.** File an OQ. Extends **CARD-24b** `style_presets`
  to carry a whole **composition** (payload + save/apply entry points + naming + cap). Not built at M4.

## Notes closed at triage (no build)
- **§0 breakout** rendered "like it was supposed to be" (functional pass) — but the *mechanism* is
  redirected by CR-01 (zoom replaces chrome-hide/cabinet-swing).
- **P7 PRESS** "looks good" apart from CR-17 (SAVE PRIVATE weight) + CR-18 (drop CANCEL).
