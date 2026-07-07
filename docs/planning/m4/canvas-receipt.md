# canvas — build receipt (M4 §3.4, 2026-07-06/07 · the Fable session)

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
