# 0016 — Community presence stats at search (CAT-09)

- **Date:** 2026-06-12
- **Status:** accepted
- **Related IDs:** **CAT-09 (new)**. Ripples: product-spec 0.15 · api-contract 0.13
  (`collectionsCount`/`friendsHaveCount` on search results + the game payload) ·
  ui-design-requirements 0.11 (4.1 results, 4.2 presence pulled forward).
- **Source:** owner direction during Add Game pass 3 (C-v3 review, 2026-06-12): "how many users have
  this game in their collection, how many friends have this in their collection — a social aspect.
  This may require spec changes."

## The behavior
Every catalog entry carries two **presence stats**: the **collections count** (how many users'
collections contain it — an anonymous aggregate) and the viewer-relative **friends-have-it count**.
Surfaced in **catalog search results** (the add flow's focused-card meta + the card-detail state)
and on the **Game page**.

## Why it's safe and honest
- **Privacy:** the community number is an anonymous aggregate; the friends number only counts the
  viewer's own mutual friends, whose collections are already visible to them (PROF-03 default,
  COL-10). Blocks sever friendships (SOC-09), so blocked users fall out of the friends count with
  no special-casing.
- **Cold start:** unlike PROF-07's percentiles (threshold-gated because "top 25% of 8 users" is
  nonsense), a **raw count is honest at any size** — "IN 2 COLLECTIONS" is true, legible, and even
  motivating (the early-adopter/contributor angle). No gating needed.

## Scope boundary
This pulls **only the presence half** of the Game page's "community aggregate stats — later phase"
forward into v2. Richer aggregates (average hours, completion rates, rating distributions) **stay
later-phase** — they carry real cold-start and self-report-quality problems the counts don't.

## Where it shows (design)
Add-flow search: the focused card's meta block (year · studio + "IN N COLLECTIONS · N FRIENDS") and
the `CardDetail` state's meta rows. Game page: among the shared-content facts. First drawn in
`add-game-draft-c4-cardled.html` (pass 3).
