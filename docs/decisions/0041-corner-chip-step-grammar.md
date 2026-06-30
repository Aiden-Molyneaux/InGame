# 0041 — Corner-chip step-grammar ratified (the single corner rule)

**Date:** 2026-06-29 · **Owner:** Aiden · **Scribe:** Claude Code
**IDs:** none (presentation / design-system) · **Closes:** OQ-085
**Bumps:** design-spec 0.41 (F-02 mirror — authoritative) · Catalog note OWED (see Ripple)

## Context
A board-wide audit found the **TL+BR pixel-step** (the GameCard corner signature) leaking onto
on-screen chrome that F-02/F-07 say should be square. Root cause: ~12 boards deliver even the
*legit* chips via a board-level `.c5` descendant gate (`.c5 .gcard`, `.c5 .btn.add`) instead of
intrinsically per-component — and that gate enabled a **blanket `.c5 .btn { clip-path }`** on 3
boards (`friends`, `compare-hours`, `discover`) that chipped **every** button regardless of intent
(discover even band-aided it back with `.c5 .btn.secondary { clip-path:none }` — proof the blanket
is wrong). Two discrete accents weren't enumerated in F-02/F-05/F-09: report-sheet `.confirm .seal`
and achievements `.cel-badge`.

## Ruling (owner)
**Adopt the recommended cleanup; the two un-enumerated accents stay SQUARE.**
1. **Ratify F-02 step-grammar as the single corner rule.** The pixel-step belongs to: **GameCard**
   (+ art/plate/size-variants + card-silhouette ghost/skeleton/error placeholders) · **StateMark &
   position pips** · **intent-buttons only** — *gold+step = acquisitive* (ADD / currency /
   add-to-collection), *system-orange+step = prominent non-acquisitive* (RETRY · ADD FRIEND · SHARE).
   **Everything else on-screen is square** (F-07: rounding lives on plastic; on-screen chrome is 90°).
2. **Make the step intrinsic to components** (`.gcard*`, `.btn.add`/`.btn.act`, `StateMark`) and
   **retire the board-level `.c5` chip gate.** Any square-chrome reset (`border-radius:0`) becomes its
   own explicit rule — don't overload one class with two jobs.
3. **Fix the 3 blanket-chip boards** (`friends`, `compare-hours`, `discover`) to intent-scoped chips;
   delete the `.c5 .btn.secondary` band-aid.
4. **`.seal` (report-sheet) and `.cel-badge` (achievements) stay square** — they are not cards,
   StateMark/pips, or intent-buttons, so they get no corner step.
5. **Not drift (left as-is):** nameplate RIBBON/BEVEL plate *shapes*; the many intent-button chips on
   add-game/collection/styler/profile/contributor/report/onboarding/store (F-02 permits these);
   `admin-console` (already intrinsic + legit).
6. **Code-hygiene (not an F-07 violation):** `.le-retry`/`.err-retry` duplicate the step inline →
   should use the named `.btn`/`.kc.step` component (cleanup, non-blocking).

## Ripple
- **design-spec 0.41 (DONE, authoritative):** §1.1 Corner-system F-02 mirror now states the step is
  **intrinsic per component**, the board-level `.c5` chip gate is retired, and `.seal`/`.cel-badge`
  are square.
- **Catalog (note still OWED; design-spec is authoritative):** the F-02 rule is **unchanged**
  (ratified) — owed is only a clarifying note ("step is intrinsic; no board-level `.c5` gate;
  `.seal`/`.cel-badge` square"). Left untouched for now because the catalog carries active
  parallel-track uncommitted edits. **Stale-base correction (2026-06-29):** a worktree agent on the
  old committed base reported the catalog at `v0.8` with the 0038 carve-outs missing — but the **live
  working tree is `v0.10` with the carve-outs present** (`prestige` + `#e85ad0` both in the body), so
  there is **no carve-out drift** and **no OQ filed**. Add the F-02 note on the next catalog pass.
- **Boards — DONE (2026-06-29): 15/15 swept + Burt-PASS.** 7 brought in from the worktree (friends,
  settings, collection, compare-hours, contributor, find-add-friends, styler) + 8 re-swept fresh on
  their current versions (achievements, add-game, discover, game-page, onboarding, profile,
  report-sheet, store — one per parallel agent, each Burt-PASS on the F-02/F-07 corner dimension; the
  board-level `.c5` chip gate is retired, the step is intrinsic per component, square-reset its own
  rule). The 2 stray siblings `admin-console` + `welcome-auth` were **already compliant** — their
  `.seal` is square and neither is a `.c5` board (the earlier "stray seal step" flag was a stale-base
  artifact). **Owner-glance items:** discover's "+ QUEUE" mini-pill went square per the rule;
  game-page carries a pre-existing `.half-panel` `border-radius:8px` nit (unrelated to this sweep).
