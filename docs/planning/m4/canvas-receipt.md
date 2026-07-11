# canvas — build receipt (M4 §3.4)

## DEVICE-WALK ROUND 5 (2026-07-10 · Claude Fable, spec-owner)

> **Status: the owner's 6 round-5 notes BUILT · design-spec 0.56 + component-map 0.8 + manifest ROUND 5
> · fresh murr 0 open (1🔴+2🟠+7🟡 across three passes — all fixed/dispositioned + re-verified CLOSED)
> · fresh parvati 0 🚩 (8/8 directives MATCH; 1 🎨 fixed same-pass) · typecheck ✓ · lint ✓ · 267/267
> vitest ✓ · 41/41 jest ✓ · /health 🟢 · seed pristine → ⛔ HARD STOP: the owner's device walk — **the
> zoom feel is the headline** — + the STILL-OWED CR-21 sign-off (0067 §2).**

### What changed (all presentation/flow — design-spec 0.56 owns it; CR-21/server untouched)
**(1) The zoom, rebuilt.** The dip-through-background is retired (it read as a blink after two tuning
rounds). New mechanism: a **boundary-continuous zoom** — the screen container transform-animates its
EDGES from the framed rect to the **measured** full-bleed rect; the real layout swaps only at the frame
where the two boundaries coincide; the reverse plays on exit. Nothing goes dark and the boundary never
jumps; the ~12% mid-motion aspect stretch (the two rects differ in aspect) is the accepted cost. Still
transform-only — the route + rn-skia bed never remount, and the bed relayouts exactly once at the swap,
same as before. Native-only; web instant. **If the feel STILL misses on device, the recorded fallback
is a clean instant cut** (no transition beats a mediocre one) — say the word and it's a two-line change.
**(2)** the caption row reverted to round 3. **(3)** the ops/rename height-shift solved by
**slot-swapping** them into the bench-button slot (fixed height; ops = one scrolling line; rename rides
`KeyboardLift` so the keyboard can't cover it). **(4)** the **persistent editbar** — RESET · cream
TRANSFORM · unlabelled ↺/↻, one cluster, available in EDIT/TRANSFORM, never moves. **(5)** EDIT-sheet
MORE under RESIZE BOX. **(6)** the TransformDrawer's sliders → **◀ value ▶ arrow-stepper rows**
(POSITION's four arrows inline + the X·Y read-out; 1° rotate taps; the same tap/hold-ramp grammar).

### Verification trail (builder ≠ verifier — full detail in `m4-review-notes.md` ROUND 5 entry)
- **murr (three passes) → 0 open.** The big catch: 🔴 the exit swap re-measured the framed rect
  THROUGH the covering transform, poisoning the cached rects after ONE cycle — the zoom would have
  silently reverted to the blink right after the first use (exactly the failure a one-cycle device walk
  misses). Measurement is now animation-gated + re-measured at rest + invalidated on breakout resizes.
  Also closed: two undo-strands-a-panel leaks, a rename-retarget hole, scroll-on-arrow mutations,
  two-finger chain kills, SR-increment suppression, stranded keyboards on every rename exit.
- **parvati → 8/8 MATCH** with pixel/DOM-rect evidence (slot swaps leave the card pixel-unmoved; the
  editbar is rect-identical across modes; 0.5%/1° step-exactness + per-step undo proven; 3 clean zoom
  cycles; zero console errors; CR-21 re-confirmed live). 1 🎨 (the pressed TRANSFORM key read) fixed
  same-pass.
- **Suite:** typecheck ✓ · lint ✓ · 267/267 vitest ✓ · 41/41 jest ✓ · `/health` 🟢 · seed restored.

### The ⛔ stop
**Owner:** the device walk on round 5 — **the boundary-continuous zoom in and out** (the headline; the
fallback if it still misses = an instant cut), the slot-swapped ops/rename (no more height shift; the
keyboard-lifted rename), the persistent editbar, the stepper drawer feel — plus the **CR-21
`derived_from_card_id` sign-off (decision 0067 §2)**, still owed. §3.5 Device does not start until you
say so.

---

## DEVICE-WALK ROUND 4 (2026-07-10 · Claude Fable, spec-owner)

> **Status: the owner's 13 round-4 notes BUILT · design-spec 0.55 + component-map 0.7 + manifest
> ROUND 4 addendum · fresh murr 0 open (1🔴+2🟠+3🟡 → all fixed/dispositioned, re-verify 5/5 CLOSED) ·
> fresh parvati 0 🚩 · 0 🎨 (10/10 directives MATCH on `:8082`, incl. web drag-to-rotate + the ring
> pivot) · typecheck ✓ · lint ✓ · 267/267 vitest ✓ · 41/41 mobile jest ✓ · /health 🟢 · seed pristine
> → ⛔ HARD STOP for the owner's device walk (rotation-handle + nudge FEEL · cream keys · PROOF∥PRESS)
> + the STILL-OWED CR-21 data-model sign-off (0067 §2).**

### What changed (all presentation/flow — design-spec 0.55 owns it; CR-21/server untouched)
The 13 notes: cream **TRANSFORM keys** (PROOF's voice; editbar + head doors) · head doors **both ways**
(EDIT↔TRANSFORM) · the drawer **condensed** (ROTATE inside POSITION; RESIZE BOX in the EDIT row
grammar) · **tap = one 0.5% nudge** (~350ms repeat delay) + a **harder hold ramp** (1% fast beats) ·
the **sel-ring rotates with the slip** (bug fix — same pivot as the renderer; grabs unrotate the touch;
corner-scale deltas rotate into local space) · a **rotation handle on the ring** (drag-to-rotate,
quarter snaps, flips below near the bed top; the drawer slider stays the CARD-16 pair) · editbar
**divider dropped** · rack **caption + cap-chip under the rail** (chip left) · **PROOF∥PRESS**
right-docked, **held through PROOFING** (PRESS works from the proof) · EDIT sheet **meta-line removed +
OPACITY under FILL** · ISOLATION chip **higher + accent-when-ON**.

### Verification trail (builder ≠ verifier — full detail in `m4-review-notes.md` ROUND 4 entry)
- **murr:** rotation math verified sound; 🔴 fumbled-knob-grab deselect (mode-aware release now) ·
  🟠 slider history flood (one undo entry per sweep via `IntensitySlider onBegin`) · 🟠 dead knob at the
  bed top (flips below) · 🟡 hidden-slip blind editing (the `editable` gate) · 🟡 knob/corner tie
  (corners first) — **re-verify 5/5 CLOSED, zero open**; one residual extreme-pose knob reach
  dispositioned to the ledger (drawer slider covers it).
- **parvati:** **10/10 directives MATCH** with computed-style + DOM-rect evidence; drag-to-rotate
  worked via CDP; the ring pivot is correct on web (closes murr's F6 question); one UNDO reverts a
  whole slider sweep; zero console errors. Feel items (zoom · snap · ramp) deferred to your device walk.
- **Suite:** typecheck ✓ · lint ✓ · 267/267 vitest ✓ · 41/41 mobile jest ✓ · `/health` 🟢 · seed
  restored (Aurora private+equipped · 17/17).

### The ⛔ stop
**Owner:** the device walk on round 4 — the **rotation handle** (drag feel + quarter snaps), the
**tap/hold nudge feel**, the **cream TRANSFORM keys**, **PROOF∥PRESS through proofing** — plus the
**CR-21 `derived_from_card_id` data-model sign-off (decision 0067 §2)**, still owed. §3.5 Device does
not start until you say so.

---

## DEVICE-WALK ROUND 3 (2026-07-09 · Claude Fable, spec-owner)

> **Status: the owner's 13 in-app notes BUILT · design-spec 0.54 + component-map 0.6 + manifest ROUND 3
> addendum · fresh murr 0 open (1🔴+5🟠+4🟡 found across two passes, all fixed + re-verified CLOSED) ·
> fresh parvati 0 🚩 (8/8 directives MATCH on `:8082`; 2 🎨 fixed same-pass) · typecheck ✓ · lint ✓ ·
> 267/267 vitest ✓ · 41/41 mobile jest ✓ · /health 🟢 · seed pristine → ⛔ HARD STOP for the owner's
> device walk (zoom feel · finger taps · round-3 taste) + the STILL-OWED CR-21 data-model sign-off.**

### What changed (all presentation/flow — design-spec 0.54 owns it; CR-21/server untouched)
The 13 notes, each built: **(1)** the breakout is **one continuous zoom** (outgoing scales into the move,
the `scr.bg` dip masks the swap, incoming settles — entry grows 1→1.05·0.96→1, exit mirrors; no-remount
held; a mask-free measured-rect zoom is not realistic — aspect distortion + rn-skia re-surfacing) ·
**(2)** slip rail **z-ascending L→R, BASE leading** · **(3)** TRANSFORM = an accent chip + an EDIT-panel
door · **(4)** ONE bench-measured panel height (PROOF/PRESS exempt) · **(5)** finer transform: 0.5%
nudges, slow→fast hold ramp, live X·Y read-out; RESIZE BOX OFF hides the WHOLE ring; the toggle also in
EDIT · **(6)** the app-wide **scroll-lock rule** (new `src/components/ScrollLock.tsx`; held sliders/
pickers freeze their host scroll; web `touchAction:none`) · **(7)** the colour picker **applies on
release**, cursor echo-proof, SV area taller · **(8)** GROUP: present-but-disabled by design (CARD-08
at-scale/§3.6) — answered, not built · **(9)** ADD grid spans the panel width · **(10)** the ADD panel
carries the rack's orange cap-meter chip (retires a leftover gold count, CR-03/F-02) · **(11)** LIGHT →
separate GLOW/BLEND rows · **(12)** titles "EDITING THE '«NAME»' SLIP" · **(13)** FROM CARD carries every
card colour incl. the base (recents-filter removed).

### Verification trail (builder ≠ verifier — full detail in `m4-review-notes.md` round-3 entry)
- **murr** (fresh, adversarial, two passes): 🔴 frozen-PanResponder-closure family (the picker's
  hue-then-SV snap-back — the owner's exact complaint — + Transform W/H cross-revert + stale-slip
  OPACITY) fixed by ref-routing every live callback; the re-verify flushed the same class in two
  pre-existing spots (CanvasStage `onPull` → the RESET-rebase bug resurrected on bed taps; LayerRack
  drag-Z `onReorder` → pull desync) — both fixed; + mount-transition guard, echo-guard clear, benchH
  min-capture, scroll-lock unmount unlock, rotation 359 cap, re-toggle pop, stranded-editOpen. **All
  murr-re-verified CLOSED — zero open.**
- **parvati** (fresh, `:8082`): **8/8 round-3 directives MATCH** with evidence (bed pixel-pinned across
  all panel modes; one autosave per picker gesture; no hue snap-back; base colour in FROM CARD; zero
  scroll displacement; zero console errors; copy-on-write PRIVATE→DRAFT re-confirmed). 2 🎨 fixed
  same-pass (RESIZE BOX label unification · web label text-selection).
- **Suite:** typecheck ✓ · lint ✓ · 267/267 vitest ✓ · 41/41 mobile jest ✓ · `/health` 🟢 · seed
  restored (Aurora private+equipped · 17/17).

### The ⛔ stop
**Owner:** the device walk on round 3 — the **continuous-zoom feel** (native-only; web can't show it),
**real-finger arrow taps + the hold ramp**, and the round-3 taste overall — plus the **CR-21
`derived_from_card_id` data-model sign-off (decision 0067 §2), still owed from the gate-5 fix pass.**
§3.5 Device does not start until you say so.

---

## GATE-5 FIX PASS (2026-07-08 · Claude Code, spec-owner)

> **Status: 23 owner CRs from the gate-5 acceptance walk BUILT · specs formalized (decision 0067) ·
> murr 0 flags (1🟠 M1 fixed + murr-verified CLOSED, 2🟡 fixed, 1🟡 documented) · typecheck ✓ · lint ✓ ·
> 267/267 vitest ✓ · 20/20 mobile ✓ · /health 🟢 · migration applied to the dev DB + live-API
> copy-on-write smoke test PASSED · seed pristine → ⛔ HARD STOP for the owner's gate-5 taste + the
> parvati VISUAL walk (owed on device — the web preview lane was infra-blocked this pass; native is the
> acceptance surface). §3.5 Device NOT started.**

### What changed — spec first (00-INDEX §4), then build

**Doc graph (decision 0067 anchors it):** product-spec **0.53** (CARD-24a copy-on-write +
`card_designs.derived_from_card_id`) · api-contract **0.54** (`POST /cards` `derivedFromCardId?`;
`GET /me/cards` carries it) · design-spec **0.53** (§2.5b/§1.5/§2.5 rewritten) · component-map **0.5**
(`TransformDrawer` subsumes `NumPop`; new shared `ColorPicker`) · OQ-139 (copy-on-write, resolved) ·
OQ-140 (canvas presets → M5) · OQ-007 re-resolved (zoom) · OQ-040 amended (light beat) · the
**canvas-manifest C1/C3/ARCH corrected** + a GATE-5 REVISION ADDENDUM.

**The 23 CRs (canvas-gate-notes.md ledger):**
- **RULED (owner):** **CR-01** breakout = a **scale-transform ZOOM** (not a cabinet-swing;
  transform-only, the `/styler` route + rn-skia bed never unmount) · **CR-08** `base` = a pinned,
  non-deletable, recolour-only **pseudo-slip**, BASE off the ADD categories · **CR-10** the
  **`TransformDrawer`** (position joystick + X/Y · size W/H sliders · rotation dial + steppers)
  subsumes `NumPop`, opened from an editbar button between RESET SLIP and UNDO, + bigger sel-ring
  handles · **CR-17** SAVE PRIVATE gains gold + a **light press beat** (0015 tier) · **CR-21**
  **copy-on-write** (the data-model change — see below) · **CR-23** canvas presets → **M5** (OQ-140).
- **DESIGN:** **CR-05** isolation session toggle · **CR-09** a picked glyph opens its EDIT sheet ·
  **CR-11** a shared **`ColorPicker`**+hex on the Canvas element FILL/STROKE (title ink stays curated —
  OQ-137/M5) · **CR-20** cross-posture save disclaimer (both outcome sheets).
- **FIX:** **CR-02** copy trims · **CR-03** cap-meter orange · **CR-04** ~15s save-tick · **CR-06**
  drag-Z held-slip highlight · **CR-07** bigger ADD cells · **CR-12** ops-row close · **CR-13** lock
  glyph · **CR-14** PROOF 👁→glyph (hold+tap kept, CARD-16) · **CR-15** editbar hidden in PROOF ·
  **CR-16** bench + proof-ladder hints removed · **CR-18** PressSheet CANCEL dropped · **CR-19**
  selected-slip pip removed · **CR-22** game-page CARDS switcher 3-up.

### The load-bearing decisions (the owner's eyes at the stop)
1. **CR-21 copy-on-write — the data-model change (STOP-and-filed, decision 0067 §2).** Editing a
   committed (private) card never PATCHes it: the **first edit spins a draft copy**
   (`card_designs.derived_from_card_id → origin`, one additive nullable FK, `ON DELETE SET NULL`);
   autosave targets the copy; **KEEP** commits copy→origin (stable id + equip) + deletes the copy;
   **SAVE AS NEW** forks; **✕** deletes the copy; a **crash** leaves the copy as a resumable DRAFT and
   the original pristine. Closes the resume-then-crash overwrite window (the D.23 lineage). **The one
   migration in this pass — flagged for your sign-off.** *(The memory-link-only variant is a
   one-column revert if you'd rather defer the column.)*
2. **CR-01 zoom — the no-remount invariant is now load-bearing.** The DeviceShell zooms the screen to
   full-bleed via a transform (native only; web skips it — the rn-skia-web compositing quirk); the
   shell-swing decor is gone. `{children}` is never conditionally unmounted → the one-document session
   + skia bed survive the posture switch.
3. **CR-11 ↔ OQ-137 reconciled:** the shared `ColorPicker`+hex serves the **Canvas element** fill/stroke
   (free-pick); the **Styler title ink stays curated** at M4 (OQ-137 owns the M5 premium-gating call).

### Verification trail (builder ≠ verifier)
- **Fresh murr** (adversarial diff review) → 1🟠 **M1** (an in-flight-copy-POST race: KEEP/SAVE tapped
  mid-copy leaked an orphan + re-pointed the kept session) + 2🟡 (TransformDrawer clamp/slider-range
  mismatch vs the ops bounds) + 1🟡 (documented dead assignment). **M1 fixed** — the copy POST is now
  tracked in `copyInflightRef`, every exit/save path settles it first and reads the hot `cardRef`, and
  the copy-vs-fork decision derives from `originRef` (not stale closures). **murr re-verified the fix:
  CLOSED** across all four points (orphan leak, microtask ordering, POST-failure path, double-nav) +
  the crash-recovered-copy resume case. **The six lanes murr confirmed clean:** copy-on-write origin
  preservation, no-remount-across-zoom, two-door exit/CARD-24a (draft path unchanged), base-pseudo-slip
  immutability, roster→composition patch-correctness, autosave/BackHandler/lock.
- **Suite:** typecheck ✓ · eslint + custom lint ✓ · **267/267** vitest (incl. 4 new copy-on-write
  integration tests: origin-untouched, cross-owner-422, wrong-game-422, ON-DELETE-SET-NULL degrade) ·
  **20/20** mobile jest · **/health 🟢**.
- **Live dev environment:** migration 0006 applied to the dev DB (`local_ingame`); the running API
  `:4000` (the owner's phone lane) **serves the new schema** — an end-to-end copy-on-write POST
  round-tripped (`derivedFromCardId` accepted + returned); test cards cleaned up, seed pristine.
- **Owed to the owner's gate-5 (native):** the **parvati visual walk** — the web preview `:8082` was
  infra-blocked (an expo-cli dependency-validation crash `EXPO_OFFLINE` didn't dodge; runbook noted),
  and web can't show the native zoom + comes up bed-blank anyway. The zoom *feel*, the bed paint, and
  the taste of the new `TransformDrawer`/`ColorPicker`/base-pseudo-slip are the owner's native call.

### The ⛔ stop
**Owner:** first-article + gate-5 taste on the reworked Canvas (screen + the zoom + `canvas-manifest`
GATE-5 REVISION ADDENDUM + this receipt + the murr verdict), and **sign-off on the CR-21
`derived_from_card_id` data-model** (decision 0067 §2). Run **parvati on device** during the walk.
**§3.5 Device does not start until you say so.**

---

# canvas — build receipt (M4 §3.4, 2026-07-06/07 · the Fable session — the original build)

> **Status: BUILT · murr CLEAN (1🔴+4🟠+10🟡 all closed) · parvati 0 OPEN FLAGS (2🚩 closed same-day)
> · seed shelf restored → ⛔ HARD STOP: the owner's first-article + gate-5 taste review.** §3.5
> (Device) is NOT started, per the handoff. The Canvas is an aesthetic surface — parvati verified
> board-fidelity; "does the workshop feel like the trophy case's back room" is the owner's call.

## TL;DR
The whole §3.4 vertical landed in one session: **manifest** → the Canvas as **a POSTURE of the one
Styler session** (the two-door exit model extended, never forked — one draft row, one autosave, one
snapshot, one history) → the press-shop surface (bed · slips · ops · NumPop · ADD/EDIT drawers ·
PROOF · PressSheet) → a live BOOT walk that caught three real defects (fixed) → fresh murr (15
findings, all closed, blocker live-reproved) → fresh parvati (2 flags, closed + live-verified) →
seed restored. **No new endpoints; no server code changed** — the shared element schema grew
additively at v1.

## What changed (commits · IDs)
| Commit | What |
|---|---|
| `156f811` | the **canvas manifest** (surface contract: 0062 boundary map · ARCH one-document rule · the CARD-16 gesture/tap pairs table) |
| `3cfaa43` | the **build**: posture switch in `/styler/[gameId]` + `CanvasSurface`/`CanvasStage`/`LayerRack`/`Slip`/`EditBar`/`NumPop`/`AssetShelf`/`EditSlipSheet`/`ProofView`/`PressSheet` + render-module element kinds (icon/polys/CARD-10 fields/arc text) + `src/canvas/ops.ts` (+tests) + the additive shared schema + session undo/redo + both Canvas doors live |
| `08738fd` | **BOOT-walk fixes**: ONE-canvas strips (the WebGL ~16-context ceiling — observed 33 canvases/17 lost) · Slip nested-button · PROOF toggle handler set |
| `890b718` | manifest **ADDENDUM** (interims, walk evidence) + **OQ-138** (the app-wide canvas budget) |
| `cd6cd1f` | **murr round**: the discard predicate (`createdHere && !explicitSave && status==='draft'` deletes; else REVERT) + snapshot rebaselines at SAVE-AS-NEW/KEEP/SAVE-PRIVATE + in-flight-PATCH ordering + CARD-08 lock on NumPop/RESET + web drag-Z disarm + 10 minors + 4xx autosave no-retry |
| *(this)* | **parvati round**: the `· PROOFING` sub-line + `SkiaErrorBoundary` (F21 catch-and-degrade on skia surface creation) + review-notes/runbook/receipt |

IDs: CARD-02/07/08/09/10/11/15/16/17 · CARD-24a · COSM-02 (0063 §1 Essentials) · OQ-105/110 fold-ins
· OQ-138 filed. EXPECTED(M5·0062): PUBLISH · CARD-19/20 · P8 PrintRitual · SHARE(CARD-21) · P11.

## The load-bearing decisions (owner's eyes at the stop)
1. **The Canvas is a posture, not a route.** `/styler/[gameId]` gains `posture: 'styler'|'canvas'`;
   the session (draft row, autosave timer, `resumeSnapshotRef`, `userEdits`/`createdHere`/
   `explicitSave`) never unmounts across the switch — CARD-24a's "the switch edits the same row"
   holds literally, and both prior data-loss bug classes are covered by ONE implementation.
2. **The discard predicate** (murr blocker fix): delete ONLY a session-created, never-explicitly-
   saved, still-draft row; **everything else reverts** to the baseline snapshot, which now
   rebaselines at KEEP / SAVE-PRIVATE / SAVE-AS-NEW. Live-reproved: the SAVE-AS-NEW copy survived
   ✕-discard, reverted.
3. **History clears at the KEEP boundary** (murr's owner-call, taken conservatively): undo cannot
   walk an EQUIPPED card behind its kept state with no door. If you want cross-KEEP undo, say so —
   one line to change.
4. **One-canvas strips** (found live): per-cell skia `<Canvas>`es evict WebGL contexts at rack
   scale; the rack/shelf draw through single-context strip builders (≤5 contexts at cap-30), and
   `SkiaErrorBoundary` is the last-resort F21 degrade. **OQ-138** owns the app-wide budget stance
   (Collection GRID at scale / the M5 gallery inherit the same ceiling).
5. **PROOF is the real CARD-15 flatten** (`flattenComposition` PNG + the effect/finish painted live
   over it — the viewer architecture M5 publish ships), with the size ladder at the app's true
   dims (CELL·96 · MINI·64 · THUMB·48; plate 96-only per F-06/0047).
6. **Every gesture shipped WITH its tap pair** (the handoff rail): drag↔NumPop steppers ·
   scale↔W/H · rotate↔ROT (numeric-only by design) · drag-Z↔◂▸ ops · long-press↔the ⋯ badge ·
   PROOF hold↔tap toggle. parvati walked both columns; LOCK refuses both lanes.

## Assumptions / interims (all in the manifest ADDENDUM, none silent)
Icons 20-of-~30 (0063 §6 pre-launch pass) · ★/search EXPECTED(CARD-17 at-scale) · GROUP
present-but-disabled (CARD-08 at-scale/§3.6) · pan/zoom · align/distribute · eyedropper · text
spacing/align/case (at-scale, not drawn on the board) · slip tilt dropped (strip architecture) ·
entry swing = a fade beat (motion polish owns the full hinge) · P9/P10 subsumed by the Styler's
lifecycle (the posture switch fetches nothing) · schema additive at v1 (F21 note — flag if you
want a version bump instead).

## Owed later (not this surface's debt to hold the stop)
- §3.6 CARD-16 pass: swipe-sections gesture · long-press coachmarks · SR-Close activation on
  sheets · reduce-motion audit (the design-first board per 0062 §4).
- M5-entry ledger adds: **OQ-138** render budget · text-slip font warmup · flatten-to-storage/CDN
  (0066) · text-measure drift.
- Refactor debt (murr): extract the session/history/exit machinery from the ~1000-line route into
  a hook; per-kind `patchElement` typing.

## Verification trail
murr + parvati verdicts: `docs/planning/m4-review-notes.md` (§3.4 section + fix-rounds). Suite at
head: typecheck ✓ · eslint+custom lint ✓ · 20/20 mobile · 136/136 unit · 127/127 integration ·
zero console errors on the final walk. Seed restored: "YOUR CARDS FOR ELDEN RING — 1" (pristine
Aurora ◆). Workflow lessons → `docs/qa-runbook.md` (window re-fronting · stepped-mouse drags ·
LogBox tap-stealing).

## ⛔ The stop
**Owner:** first-article-grade review + gate-5 taste on the Canvas (screen + `canvas-manifest.md`
+ the parvati report + this receipt). Decisions parked for you: the KEEP-boundary undo clear (§3
above) · the F21 v1-additive schema call · the 🎨 pair (font warmup timing, SR-Close). **§3.5
Device does not start until you say so.**
