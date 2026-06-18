# 0024 — Personal rating, card-back provenance, type-scale conformance, offline cache scope

- **Date:** 2026-06-18
- **Status:** accepted
- **Related IDs:** COL-03, CARD-01, CARD-05, SYS-10 (behavior, product-spec) · F-06 / §1.2 / §1.6 / §1.5 card-back (presentation, design-spec) · **narrows decision 0015** (card-back provenance)
- **Resolves:** OQ-058, OQ-069, OQ-066, OQ-038
- **Source:** owner rulings, 2026-06-18 (four batched open-questions from the Game-page converge + the 2026-06-16 state-file DS-conformance audit + the OQ-037 offline-scope split).

## Context
Four owner-ruled questions had accumulated in the inbox across the Game-page converge and the
design-system conformance audit:
- **OQ-058** — the collection entry already carried a `rating?` field and the Game-page draft surfaced
  it, but it was never deliberately confirmed; and there was a standing recommendation to keep cards
  free of any rating so adoption-count stays the sole card signal.
- **OQ-069** — the converged Game-page board kept the card-back clean (designer credit only), but
  CARD-01 (per decision 0015) named the printed back as **designer + adoption count**.
- **OQ-066** — the state-file audit found every `*-states.html` board passing the categorical rules
  but drifting **off-scale** against F-06's 21/15/11/9 (state-titles 17px shared across ~7 screens, etc.).
- **OQ-038** — SYS-10's offline baseline didn't pin **whose** data is cached (own only, or also
  recently-viewed friends?) — the residual left open when OQ-037 split.

## Decision

### OQ-058 — personal game rating kept, **private-only**; no card rating, ever
- The collection entry's per-game **personal rating** (the user's ⭐ for the **GAME**; api-contract
  `rating?` on `PATCH /me/collection/:entryId`) is **KEPT as a PRIVATE personal field** — never shown
  to others, never aggregated into any community/game score (private like notes, COL-05; honors the
  COL privacy rules). **No api-contract change** — the field already exists; private-only is product
  semantics. (product-spec **COL-03**.)
- There is **NO card rating anywhere — individual or aggregate.** Adoption-count (ECON-05) is the
  card's **only** social signal; this is **pinned** so a future card rating — a competing popularity
  metric the spec deliberately avoided — isn't introduced later. (product-spec **CARD-05**.)

### OQ-069 — card-back printed provenance is **designer-only**
- CARD-01's standardized card-**back** prints the **DESIGNER ATTRIBUTION ONLY** ("CARD ART DESIGNED BY"
  + creator name). The **adoption count is NOT printed on the back**; it surfaces only in the community
  gallery (`AdoptCount`, CARD-05) and the `CardDetail` inspect sheet. This **narrows decision 0015's**
  "designer + adoption count on the back" back-provenance detail — the back is the owner's clean trophy
  face; the social signal reads where adoption decisions happen. (product-spec **CARD-01**; design-spec
  §1.5 card-back gap annotated.)

### OQ-066 — conform the mockups to F-06; **F-06 is NOT amended**
- F-06 (the 21/15/11/9 type scale) **stays unchanged — it is law.** No `state-title` or `mini-button`
  role is carved out. Off-scale on-screen type **snaps to the nearest of 21/15/11/9** (17 → 15 · 13 → 15
  · 12/10.5/10 → 11 · stray 9px buttons → the button tier's 11px); error/empty **state-titles → emphasis
  15** (centered small-card titles read as 15, not display 21).
- Recorded in design-spec only (§1.2 + §1.6); **no product-spec change.** The actual ~7-board
  conformance **SWEEP** of the `*-states.html` mockups (worst offender Settings; cleanest
  Store/Collection/Report-sheet) is a **separate follow-up task, flagged OWED** — no board was edited in
  this pass.

### OQ-038 — offline cache scope = **own data only**
- SYS-10's offline baseline is amended: when offline, **only the user's own profile + collection** render
  read-only; **friends/feed/discover/store all require a connection** (calm `Offline` screen, writes
  gated). **Others' data is NOT cached at rest.** Settles the OQ-037-split scope question. (product-spec
  **SYS-10**.)

## Rationale / alternatives
- **Game rating, private vs aggregate** — keeping it private mirrors notes (COL-05) and sidesteps the
  moderation/quality-signal weight of a public rating; an aggregate game score was rejected because the
  catalog's honest social signal is the anonymous collections-count (CAT-09), not opinion scores.
- **Card rating** — *adding* one was rejected: a card rating would create a popularity metric that
  competes with adoption-count, the very thing ECON-05 chose (clout, not ratings/currency). Pinning the
  absence prevents a well-meaning future re-introduction.
- **Card back — restore the count (option b)** — rejected: the back is the trophy face that travels into
  every adopter's collection; the count belongs where an adoption decision is made (gallery/inspect), and
  the dual-face brevity favors the clean designer credit.
- **Amend F-06 to legitimize 17/9px (the owner's sub-call)** — rejected: the recurring off-scale values
  are drift, not uncodified roles; carving roles would erode a single clean law that otherwise holds
  categorically everywhere.
- **Cache recently-viewed friends** — rejected: caching others' data at rest raises privacy/staleness
  questions (a friend may have since blocked or gone private), and the offline value is in *your own*
  trophy case, not browsing others' — so others' surfaces honestly require a connection.
