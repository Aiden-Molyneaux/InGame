# 0020 — Friend card-detail, opt-in compare, and atomic adoption

- **Date:** 2026-06-13
- **Status:** accepted
- **Related IDs:** **SOC-11, CARD-22 (new)** · CARD-01/15/16, ECON-03/04, COL-04/05/07/10, PROF-03,
  SOC-03 (product-spec 0.20) · `/users/:id/collection`, the card `equipped` readout,
  `/cards/:id/adopt` (api-contract 0.19) · design-req §4.2 (0.15).
- **Source:** owner direction (2026-06-13), surfaced while auditing the *"tap a GameCard from your
  own or a friend's collection"* gap — the friend-collection card-tap had **no defined destination**,
  and the card-object **flip-to-back** view had **no host screen**.

## Context — the gap
Tapping a card in **your own** collection was routed to the Game page owned-state (design-req §3.1),
but the **friend-collection** card-tap had **no destination**, and the card's **flip-to-back** (stats +
provenance) was an unbuilt design-spec gap with nowhere to live. The Game page's states keyed only on
*your* ownership, so a friend's selected card + their per-game context had nothing to fold into.

## The rulings
- **The Game page (4.2) is the card-tap target, with entry-context states.** Tapping a card opens the
  Game page: from **your** collection → the **owned-state**; from a **friend's** collection → a new
  **friend-view state**. (Owner framed this as states of the game page — *not* a separate card-detail
  screen; revisit only if the page overloads.)
- **Owned-state stats are inline-editable** (hours / % / status / owned-since / rating / notes); the
  page **hosts the card-object / flip view** (the back = stats + provenance, CARD-01). Editing the
  card **art** still routes to the Card editor (4.3) — *viewing never edits the art.*
- **Friend-view state (SOC-11):** their displayed card + per-game context — **hours, status,
  owned-since** (privacy-gated, PROF-03); their **notes / rating / platforms stay owner-only**
  (COL-04/05). **owned-since is newly friend-visible** (hours/status already were). Primary action
  **adopt their card**; if you don't own the game, **add to collection** instead.
- **Compare is opt-in, not the default (SOC-11).** A *compare-with-mine* action sets your card + your
  stats **side-by-side** against theirs — the single-game cousin of SOC-03. The default friend-view
  stays **their** perspective.
- **Adoption is atomic — the whole card (clarifies CARD-15 / §10).** There is **no "adopt just the
  canvas."** Adopters receive the **flattened image + effect/finish overlays, never the editable
  layers** (CARD-15); separating canvas from style-combo, or re-styling someone's composition, is
  **remix/fork — parked §10.** CARD-16's loose phrase *"adopt then edit-your-copy"* is read as:
  adopt as-is, **or** design your own from a start-from — not edit the adopted card. *(If we ever
  want a literal "tweak an adopted card," that is the parked remix/fork feature, not this.)*
- **Equipped readout (CARD-22).** Cards expose a **read-only** equipped summary (base · effect+intensity
  · finish · frame · nameplate · font) as **display metadata, not the composition**, so the
  friend-view / compare / galleries can show "what makes this card" and drive adoption.
- **Friend-view collection sort (storytelling).** Friend collections may be **sorted by hours /
  owned-since** (SOC-11 / COL-07) — relaxes the prior "no sort tools" on `/users/:id/collection`.

## Ripple notes
- **product-spec (0.20):** +SOC-11, +CARD-22; the friend-visible field set + atomic-adoption
  clarification.
- **api-contract (0.19):** `/users/:id/collection` items add `ownedSince` + hours/owned-since **sort**;
  every card payload gains a read-only **`equipped`** readout (CARD-22); the friend single-entry detail
  + opt-in compare **compose client-side** from existing reads (+ `/me/collection/:entryId`); adopt is
  the existing `POST /cards/:id/adopt`. No new endpoint minted (rides existing reads).
- **design-req (0.15):** §4.2 rewritten with the entry-context states; Part-2 row 7 updated.
- **Ripple debt (flagged, not done):** the **friend-view collection sort** (hours / owned-since)
  touches the **converged Collection board (3.1)** — a design re-pass is owed there. Logged so the next
  Collection pass picks it up rather than silently changing a converged board.

## Why on the Game page (not a new screen)
Owner framing ("the game page … two distinct states"). It reuses the existing catalog hub, gives the
flip-to-back view a home without minting a surface, and keeps the two-mode pattern (yours / a friend's)
consistent with Collection and Profile. The card-centric vs game-centric split was considered and
**not** taken for v2.
