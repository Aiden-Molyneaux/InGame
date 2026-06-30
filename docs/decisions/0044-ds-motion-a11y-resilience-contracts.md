# 0044 — Design-system contracts: reduce-motion · a11y baseline · content-resilience

**Date:** 2026-06-29 · **Owner:** Aiden · **Scribe:** Claude Design (via Claude Code)
**IDs:** none (design-system foundation) · **Closes:** OQ-104 · OQ-105 · OQ-106 (UX-audit findings)
**Bumps:** design-spec 0.42

## Context
The UX persona audit surfaced three cross-cutting design-system gaps (LEDGER L029/L030/L031/L034 ·
L032/L033/L044/L059/L060 · L061) that should be **foundation contracts adopted before screens are
coded** (M2+), not retrofitted per board. Owner-ruled "adopt all three" in the 2026-06-29 walkthrough.

## Ruling (owner) — adopt all three into the design-spec foundation
**104 — Reduce-motion contract + motion tokens.** Every animation declares a **reduced-motion
fallback** (`prefers-reduced-motion: reduce` → the documented still/fade form); the marquee moments
(`motion.cardFlip` · `powerOn` · `celebration` · `foilSweep` · count-up · KEEP-beat · redraw)
reference a **shared timing/easing token set** (durations + curves) instead of ad-hoc per-board
values; the **F-03 Scanline-Energize** is applied consistently across boards (some boards had added a
stray `transition`).

**105 — A11y baseline.** Global **`:focus-visible`** ring on every interactive control; **form
semantics** (`<label>` association · `aria-required` · `aria-describedby` for errors/hints · real
`<input>`/checkbox elements, not styled divs); **modal/sheet focus management** (`role="dialog"` +
`aria-modal` + focus-trap + Esc-dismiss + return-focus on close); **live-region announcements**
(`role="status"`/`aria-live`) for async results (toast · save · claim · count-up · "card N of M");
**ARIA roles** on toggles (`role="switch"`), chips, and carousels; a **non-gesture path** for the
gesture-only reorder (discover/lists) + CardFan keyboard nav.

**106 — Content-resilience.** Long text (game titles · usernames · bios · list names) gets a
**truncation cue** (tooltip / 2-line clamp), never a silent ellipsis; **numbers are formatted +
width-guarded** — pairs with the OQ-091 ≤99,999 hours cap so a dossier/stat never blows its layout.

## Ripple
- **design-spec 0.42:** §1.4 Motion gains a **`motion.reduceMotion`** contract row + the shared
  timing/easing token note; a new **§1.x A11y & resilience baseline** paragraph captures 105 + 106.
- **Engineering note:** these are conventions the RN component library bakes in once (focus rings,
  form primitives, an `AnimatedWithReducedMotion` wrapper, a `<Truncated>`/number-format helper) —
  built at M2/M4, not per screen. The board-level execution (applying reduce-motion fallbacks +
  focus states to each mockup) folds into the same DS-conformance sweep as OQ-066 / OQ-078 / OQ-085.
