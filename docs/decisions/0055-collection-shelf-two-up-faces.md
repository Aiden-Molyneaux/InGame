# 0055 — Collection SHELF = two-per-row card faces + the Now-Playing hero (OQ-033 reversed)

**Status:** LOCKED · **Date:** 2026-07-01 · **Author:** Aiden (owner ruling, on-device M2 pass)
**Refs:** COL-07 (view modes) · COL-12 (peek-flip) · reverses the OQ-033 item of decision 0013;
design-spec §2.1 view-modes line updated (0.50); implemented in the M2 client the same day.

## Context
Decision 0013 resolved OQ-033 as "shelf rows show per-game stats" — every shelf entry drawn as a
hero-treated row (full card + an HRS·STATUS eyebrow + title + catalog line), with the dense list's
rationale shifting to *density*. The canonical `collection-states.html` carries BOTH depictions: the
older baseline (the drawer/search artboards — a Now-Playing hero over a **two-column grid of bare
card faces**) and the newer "View mode — shelf (the showcase)" artboard drawn to the OQ-033
direction, whose own caption still marked it a **spec ripple "if adopted."**

The M2 build initially rendered the shelf as a single bare-card column; the Parvati review flagged
the missing row-meta *against the showcase artboard*. Reviewing the built app on his phone
(2026-07-01), the owner ruled the other way.

## Decision
**The SHELF view is the binder, not a stats readout:**
- **One Now-Playing hero** leads the shelf — the hero card (`GameCard`, mockup hero-size 138×193)
  with its meta beside it (NOW PLAYING eyebrow · `{hours}H · {status}` stat-line · title). LOG HOURS
  (an M3 action) and the catalog line (M3 data) join the hero when their milestones land.
- Below it, **every entry renders two-per-row as a bare card FACE** (the mockup `.grid` grammar:
  1fr/1fr, faces fluid at the 63:88 ratio, ▶ NOW tag riding in-flow) — **no per-row meta**.
- **Stats come from the flip, not the row:** tapping a face flips it to its CARD-01 stats back
  (**COL-12 peek-flip**, already specced/decision 0026 — rides a later milestone) — and the **LIST**
  view remains the per-row hours/status scan.

The OQ-033 "shelf rows show per-game stats" resolution is **reversed**; the showcase artboard's
hero-row treatment is recorded as not-adopted (the artboard stays in the board for history).

## Consequences
- design-spec §2.1 view-modes: shelf described as "Now-Playing hero + 2-up card faces (stats via
  the COL-12 flip; the list is the stats scan)" (0.50).
- The M2 client (`apps/mobile/app/(tabs)/collection.tsx` ShelfView) implements this ruling.
- The dense list's *density* rationale from 0013 stands unchanged — it is now also the only
  always-visible per-row stats mode, restoring part of decision 0012's original framing.
