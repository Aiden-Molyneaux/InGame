# 0061 — Collection SHELF = the showcase (hero-treatment rows); GRID = 2-up faces. Reverses 0057.

**Status:** LOCKED · **Date:** 2026-07-04 · **Author:** Aiden (owner ruling, M3-R R1-1 first-article review)
**Supersedes:** [`0057`](0057-collection-shelf-two-up-faces.md) (which reversed OQ-033; this restores it).
**Refs:** COL-07 view modes · OQ-033/decision 0013 (per-row shelf stats — **restored**) · design-spec §2.1
view-modes line (reverted, 0.51) · board `collection-states.html` shelf `:727–841` / grid `:843–910` /
list `:912–1025`. **Bumps:** design-spec 0.50→0.51.

## Context
Decision 0057 (2026-07-01, on-device M2 pass) ruled the SHELF view = one Now-Playing hero over
**two-per-row bare card faces** (no per-row meta), and recorded the "showcase" artboard (every entry
at hero treatment, with per-row stats) as *not adopted*. Reviewing the M3-R R1-1 first-article build
on 2026-07-04, the owner identified 0057 as a **mistake made under a shelf/grid mix-up**: the
bare-faces model he blessed at 0057 is what **GRID** should be, not SHELF. SHELF was always meant to
be the showcase — "flip through your binder", every entry hero-treated — as the canonical
`collection-states.html` "View mode — shelf (the showcase)" artboard draws it.

## Decision
**Restore the pre-0057 model — the two browse modes swap back to their board depictions:**

- **SHELF = the showcase** (`:727–841`): the Now-Playing hero leads, then a **shelf-stack where every
  entry gets the hero treatment** — a full `GameCard` hero-size (138×193) face + meta beside it
  (`stat-line` = *N HRS · STATUS* · title (`type.display`) · catalog line *dev · year · genre*).
  **LOG HOURS stays hero-exclusive** (only the pinned hero carries it; stack rows do not). The **▶ NOW**
  tag marks the pinned game where it appears in the stack. This restores **OQ-033 / decision 0013**.
- **GRID = compact 2-up full faces** (`:843–910`): the Now-Playing hero persists above, then a
  **two-per-row grid of bare `GameCard` faces** (the `.grid` 1fr/1fr grammar, fluid at 63:88, never
  cropped F-01), **no per-row meta**, ▶ NOW in-flow on the pinned face.
- **LIST unchanged** (`:912–1025`): dense `Strip` rows (thumb + title + *HRS · STATUS* + chevron; ▶ NOW
  inline by the title) — the always-visible per-row stats scan.
- **The Now-Playing hero persists across all three browse modes** (design-spec §2.1); unset → the
  "set your Now Playing" nudge in every mode.

Stats-on-shelf-rows (the OQ-033 direction 0057 had reversed) is **back**. The dense list keeps its
density rationale (decision 0012/0013) as the *scan* mode.

## Consequences
- design-spec §2.1 view-modes line reverted to the showcase-shelf / 2-up-grid language (0.51).
- The M3-R R1-1 client (`apps/mobile/app/(tabs)/collection.tsx`) rebuilds `ShelfView` (hero-treatment
  rows), `GridView` (2-up faces + persistent hero), and `ListView` (adds the persistent hero + the
  chevron + inline ▶ NOW). A shared `NowPlayingHero` block renders across the three.
- The R1-1 manifest's shelf/grid/list rows are rewritten to this model (the 0057 re-base in the
  spot-audit is undone).
- The COL-12 peek-flip (decision 0026, M4) still applies to shelf + grid; the list stays flip-excluded.
- No economy/authz/data surface touched; a view-layer + design-doc change only.
