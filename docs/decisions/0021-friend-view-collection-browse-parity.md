# 0021 — Friend-view collection browse parity (COL-11)

- **Date:** 2026-06-13
- **Status:** accepted
- **Related IDs:** **COL-11 (new)** · COL-07/09/10, SOC-11, PROF-03 (product-spec 0.21) ·
  `/users/:id/collection` (api-contract 0.20) · design-req §3.1 (0.16).
- **Source:** owner direction (2026-06-13), extending [decision 0020](0020-friend-card-detail-compare-adopt.md) —
  promotes its flagged "friend-view collection sort" ripple-debt into a tracked re-pass by widening it
  to full browse parity.

## Ruling
A friend's collection (the COL-10 friend-view) gets the **same browse/query tools as your own** —
full **sort** + ASC/DESC, **scoped search** (title/developer/publisher), genre/status **filter**, and
the **view-mode toggle** (shelf/grid/list) — but **read-only**: **no** manual-order/Arrange (OQ-031),
**no** per-entry editing. All tools operate **only over the friend-visible field set** (no
sort/search/filter on owner-only notes/rating/platforms). Privacy-gated (PROF-03).

**"Edit" parity was explicitly scoped OUT** (owner direction): you can't write to another user's
collection. The owned-state's inline editing lives on the Game page (4.2, decision 0020), not here.

## Why
Sorting and searching a friend's library — *by hours, by when they got a game* — is core to the app's
social **storytelling** (a Socializer return-driver, alongside Compare Hours, SOC-03). Decision 0020
added only hours/owned-since sort as a stopgap and flagged the rest as debt; this makes it true parity.

## Ripple
- **product-spec 0.21:** +COL-11; SOC-11's sort sentence now defers to COL-11.
- **api-contract 0.20:** `/users/:id/collection` accepts the full `/me/collection` query set
  (`?q=` · `sort` enum · `order` · genre/status filter) + `total`/`collectionTotal`, over the
  friend-visible field set only; **no write/reorder params**.
- **design-req §3.1 (0.16):** friend-view Modes note.
- **Design (owed at converge):** the **Collection board (3.1) friend-view re-pass** is briefed
  (reuse the own-collection tools-bar components verbatim, minus Arrange/edit); **design-spec §2.1**
  friend-view + **SCREEN-STATUS** 3.1 re-sync are owed when that pass lands.
