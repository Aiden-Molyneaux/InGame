# 0067 — §3.4 Canvas gate-5 acceptance: breakout-zoom, copy-on-write, and the CR batch

**Status:** accepted (owner rulings, 2026-07-08 acceptance walk) · **Date:** 2026-07-08 ·
**Author:** Claude Code (spec-owner, the §3.4 fix/revision pass) · **Rules:** the design + data-model
rulings from the owner's device acceptance walk of the entire Canvas feature. Companion to **0014**
(the breakout tier), **0015** (celebration tiers), **0063** (roster/plate), **0066** (the M4 card
substrate + CARD-24a draft document). Capture: [`planning/m4/canvas-gate-notes.md`](../planning/m4/canvas-gate-notes.md)
(the 23-CR ledger) + [`planning/m4/canvas-acceptance-walk.md`](../planning/m4/canvas-acceptance-walk.md).

## Context
The §3.4 Canvas (the Styler's breakout posture) shipped, passed murr + parvati, and reached the
owner's gate-5 first-article + taste stop. The owner walked the **entire** feature on device and
returned **23 change requests**; the 7 that needed a ruling were decided same-day. This record
formalizes the rulings that ripple an owning document; the FIX-lane CRs (copy trims, glyph swaps,
hint removals, cap-meter colour, etc.) are presentation-only and land straight in the build against
the design-spec/manifest — enumerated in the ledger, not re-listed here.

## Rulings

### 1 — CR-01 · the breakout is a **zoom**, not a cabinet-swing (re-resolves OQ-007)
The diegetic "the device swings open like a cabinet" (OQ-007's original resolution, design-spec
§2.5b) is **retired**. The breakout is now a **scale-transform zoom**: the screen area grows to
full-bleed on Canvas entry and shrinks back on exit. Rationale: on device the swing read as decor,
not as a spatial move; a zoom is legible, cheap, and reduce-motion-friendly. **Load-bearing
constraint:** the transition is a **transform only** — the `/styler` route and the rn-skia bed
**never unmount** across the posture switch (CARD-24a one-document; the same tree, animated). The
shell-swing decor is removed. This corrects the `canvas-manifest.md` **C1/ARCH** rows, which wrongly
said the shell "never leaves — drawn dressing": per 0014 stage-3 the frame **yields** to full-screen
(however the transition is done). Owning doc: design-spec §2.5b + §1.5; OQ-007 re-resolved.

### 2 — CR-21 · **copy-on-write** for committed-card edits (the data-model change; resolves OQ-139)
Under 0066, editing an existing card resumed its `card_designs` row and autosaved **in place**; a
`resumeSnapshotRef` (client-only) reverted it on ✕. That left a **crash window**: an autosave writes
the edits into the committed row, then a crash/close occurs before the ✕-revert — the original is
lost (the D.23 data-loss lineage that shipped two bugs this milestone). **Ruling — copy-on-write,
expressed as one invariant:**

> **Autosave never PATCHes a committed (private) row.** The **first edit** against a committed card
> spins off a **draft copy** (a new `card_designs` row carrying `derived_from_card_id → origin`); the
> copy becomes the autosave target. The original is never touched mid-session.

- **KEEP** commits the copy back onto the origin — `PATCH origin ← copy composition` → save-private →
  re-equip → **delete the copy**. The origin keeps its **id + equip pointer** → *one* card.
- **SAVE AS NEW** promotes the copy as its own private card (fork) → the origin untouched → *two* cards.
- **✕ discard** deletes the copy → the origin untouched (the `resumeSnapshotRef` revert is no longer
  needed on this path — it existed only to undo in-place autosaves).
- A **crash/close** leaves the copy as a resumable **DRAFT** (the origin pristine); resuming then
  KEEPing merges it home via `derived_from_card_id`.
- Editing a **draft** stays **in-place** (a draft is already the scratch document — no origin to protect).

**Data model:** `card_designs` gains **`derived_from_card_id uuid NULL → card_designs.id ON DELETE
SET NULL`** — one additive, non-destructive column. `POST /cards` accepts `derivedFromCardId?` (own ·
same-game); `GET /me/cards` items carry it. **No new endpoints** — the lifecycle is client-orchestrated
over existing `PATCH`/`save-private`/`equip`/`DELETE`. This is the natural model for M5 **published**
editing too (published is immutable — you always fork it); CR-21 brings the private path in line early.
Owning docs: product-spec CARD-24a (0.53) + api-contract (0.54). **Owner-glance flag:** the
`derived_from_card_id` column is the one migration in this pass; it makes crash-recovery whole. If the
owner prefers the memory-link-only variant (recovered draft KEEPs as a new card), it is a one-column
revert — recorded for the gate-5 review.
**→ SIGNED OFF (owner, 2026-07-10):** the column + the copy-on-write model are **approved as ruled**
(the memory-link-only fallback is retired unexercised). Migration 0006 ships with the §3.4 commit.

### 3 — CR-08 · base = a field-backed **pseudo-slip**
`base` stays a composition **field** (no schema change), but the rack renders it as a **pinned,
non-deletable, recolour-only pseudo-slip** at the rack bottom; its controls surface only when it is
pulled. **BASE is dropped from the ADD categories** (you never "add" a base — every card has exactly
one). No cap-30 / Z-order impact (the plate-immutability precedent, OQ-135 / 0063 §4). Owning doc:
design-spec §2.5b; product-spec CARD-15 referenced (base is composition, unchanged).

### 4 — CR-10 · the **TRANSFORM drawer** (subsumes NumPop)
The numeric transform input (CARD-09) is surfaced as a **TRANSFORM drawer** — a one-summoned drawer
(the app's PulledSheet grammar), **separate** from the EDIT slip-sheet, opened by an editbar button
**between RESET SLIP and UNDO**. Contents: **position** (joystick + X/Y steppers) · **size** (W/H
sliders + steppers) · **rotation** (dial + stepper). It **subsumes NumPop** (one precision surface,
not two). The sel-ring corner **hit-areas are enlarged** (bundled FIX). It is the CARD-16 non-gesture
alternative for move/scale/rotate (was NumPop). Owning docs: design-spec §2.5b + component-map
(`TransformDrawer`); product-spec CARD-09/16 referenced (behavior unchanged — this is its surfacing).

### 5 — CR-11 · a shared **ColorPicker + hex**, everywhere colours are chosen
Everywhere a colour is picked (Canvas FILL/STROKE, Styler TITLE ink) gains a real **picker** (HS
wheel/area + value) **+ a hex field**, alongside the existing swatches + in-card used-colours. This
matures the CARD-10/11 eyedropper/at-scale **interim** (the in-card used-colours stand-in). **One
shared `ColorPicker` component** (component-map) so the Styler and Canvas share it. Owning docs:
design-spec §2.5/§2.5b + component-map (`ColorPicker`); product-spec CARD-10/11 referenced.
**Reconciled with OQ-137 (title-ink picker):** OQ-137 (owner, §3.2 gate-5) parks a **free-pick/premium
picker for the Styler *title ink*** to the M5 cosmetics/economy batch. So at M4 the shared picker serves
the **Canvas *element* FILL/STROKE** (unambiguously free-pick, no cosmetic gating); the **Styler title
ink stays curated swatches** — it adopts the shared picker only when OQ-137 rules its value space at M5.
This keeps CR-11 ("picker everywhere colours are freely chosen") from silently pre-resolving the
title-ink economy question.

### 6 — CR-17 · SAVE PRIVATE gains gold weight + a **light press beat**
SAVE PRIVATE gains gold weight and a **light press/print beat** at M4 — **distinct from** the full M5
publish `PrintRitual` (which PUBLISH keeps for M5). This is the M4-reachable "press moment" so private
saving is not discouraged. Routed through the **0015 celebration tiers** (a new light-tier press beat
slots beside KEEP's light beat; repetition-kills-ritual respected) + OQ-040. Owning doc: design-spec
§2.5b; decision 0015 tier note; OQ-040 referenced.

### 7 — the design refinements (CR-05 · CR-09 · CR-20)
- **CR-05 · isolation is a session toggle.** The pull-to-isolate ghosting (CARD-08 "solved
  spatially") becomes **optional** — a per-session ISOLATION on/off near the existing "ISOLATION · ON"
  stat; the pulled element still selects/edits, the others simply stop ghosting. Design-spec §2.5b.
- **CR-09 · add → open EDIT.** A newly-added slip lands pulled **and** raises its EDIT sheet
  immediately (colour-first). Reverses manifest state-walk 5 ("sheet closes; the bed is the
  confirmation"). Pairs with CR-08 + CR-11. Design-spec §2.5b.
- **CR-20 · cross-posture save disclaimer.** Because Styler↔Canvas is **one document** (CARD-24a), a
  KEEP / SAVE PRIVATE / PRESS from either posture flushes **all** pending edits. An honest line on the
  outcome sheet discloses it when the other posture has unsaved edits ("Also saving your Styler
  changes."). Presentation of an existing truth — design-spec §2.5/§2.5b, both surfaces.

### 8 — CR-23 · canvas compositions as presets → **M5** (files OQ-140)
Saving a whole **composition** as a reusable preset (like style-presets) extends CARD-24b
`style_presets` to carry a full composition payload + save/apply/naming/cap. **Deferred to M5** (rides
the publish/gallery substrate). Filed as OQ-140; not built at M4.

## Consequences
- **product-spec 0.53** — CARD-24a copy-on-write + `card_designs.derived_from_card_id` (§6). The
  design CRs (1, 3–8) are presentation → design-spec, referenced by existing CARD IDs, not re-specced
  into product-spec (00-INDEX §4 triage).
- **api-contract 0.54** — `POST /cards` `derivedFromCardId?`; `GET /me/cards` `derivedFromCardId?`.
- **design-spec** — §2.5b/§1.5 rewrites (zoom · pseudo-slip · TRANSFORM · light-press-beat ·
  add→EDIT · isolation toggle) + §2.5/§2.5b (ColorPicker · cross-posture disclaimer) + component-map
  (`TransformDrawer` · `ColorPicker`).
- **open-questions** — OQ-007 re-resolved (zoom); OQ-139 filed+resolved (copy-on-write); OQ-140 filed
  (canvas presets → M5); OQ-040 referenced (light beat).
- **canvas-manifest.md** — C1/ARCH corrected (frame yields via zoom), C3 swing decor removed, the CR
  ripples folded in.
- **Build (this branch):** the additive migration + `POST /cards` `derivedFromCardId` (test-first,
  SYS-07 actor-B) + the client copy-on-write session rework; the zoom rework (transform-only,
  no-remount); the TRANSFORM drawer; the base pseudo-slip; CR-05/09/11/20; the FIX bundle; CR-22
  (game-page 3-up). **M5-entry items unchanged:** flatten-to-storage, published editing (which reuses
  copy-on-write), canvas presets (CR-23/OQ-140).
