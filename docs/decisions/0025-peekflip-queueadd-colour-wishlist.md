# 0025 — Collection peek-flip, Discover queue-add colour, WISHLIST in the owned editor

- **Date:** 2026-06-18
- **Status:** accepted
- **Related IDs:** §4.2 card-flip / §3.1 dense-list (presentation) · F-02 colour-intent (presentation) · COL-02 / WTP-02 (behavior) · OQ-033 (shelf stats)
- **Resolves:** OQ-059, OQ-068, OQ-070
- **Source:** owner confirmations, 2026-06-18 — three "confirm-and-close" inbox items from the Game-page converge + the 2026-06-16 state-file DS-conformance audit, each a recommendation the converged boards (or an existing foundation rule) already reflected.

## Context
Three low-risk questions each carried a clear recommendation the converged boards already honored; the owner confirmed each rather than reopening:
- **OQ-059** — should Collection gain a quick in-place peek-flip, or stay Game-page-only for the card flip?
- **OQ-068** — the Discover queue-add (+ ADD FROM COLLECTION) rendered gold, but it creates no card.
- **OQ-070** — should the owned-entry editor offer WISHLIST as a settable status?

## Decision

### OQ-059 — the card flip stays Game-page-only (no Collection peek-flip)
The face→back card flip (stats + provenance, CARD-01) remains a **Game-page (§4.2) deep-inspect** interaction. Collection does **not** gain an in-place peek-flip — stats are scanned via the dense-list mode + the shelf stats-eyebrow (OQ-033), per §3.1's "without flipping a single card." A peek-flip would add interaction load to a browse surface with no strong scan-the-backs case. **No board/spec change.**

### OQ-068 — the Discover queue-add is NOT gold
**+ ADD FROM COLLECTION** (and any Up-Next add that creates no card) reads **cream/orange, not gold** — per **F-02** (gold = card-creating intent only). The true card-creating ADDs (ADD TO COLLECTION / ADD & DESIGN IT) stay gold. **Board recolor OWED:** `discover-states.html` still renders the queue-add gold (`.btn.add`); recolor to cream/secondary (or orange non-card) — a one-line tweak **deferred** here because the board carried uncommitted parallel changes; fold it into the next discover-states pass or the OQ-066 conformance sweep. The retired `discover-states-fan.html` (already cream/orange) needs nothing.

### OQ-070 — WISHLIST stays out of the owned-entry editor
The owned-entry edit form offers the COL-02 statuses **minus WISHLIST** (BACKLOG · PLAYING · BEATEN · COMPLETED · DROPPED). WISHLIST is the **pre-ownership/unowned** state — you wishlist a game you don't own; Up Next / Discover handle it (**WTP-02**). Moving an owned entry to WISHLIST is nonsensical (handled by removal). The converged Game-page board (M2) already omits it. **Follows the existing WTP-02 semantic — no spec change.**

## Rationale / alternatives
- **OQ-059 — add a peek-flip** — rejected: dense-list + the stats-eyebrow already answer "what are the stats" without a flip; a browse-surface flip adds load for an interaction the Game page already owns as deep-inspect.
- **OQ-068 — keep gold** — rejected: it violates F-02's colour-intent (gold = card-creating). A queue-add creates no card, so it must read cream/orange; the two Discover boards had disagreed (the fan board was already correct, now retired).
- **OQ-070 — offer WISHLIST when owned** (e.g. "want to replay / lapsed") — rejected: WISHLIST is definitionally the unowned state (WTP-02); an owned entry set aside uses a status like BACKLOG/DROPPED or removal, not a wishlist that means "don't own it."
