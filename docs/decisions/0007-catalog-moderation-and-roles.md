# 0007 — Catalog moderation, roles & admin console

- **Date:** 2026-06-08
- **Status:** accepted
- **Related IDs:** SYS-08, MOD-04/05/06/07/08, CAT-06

## Context
Letting users build the catalog and create shareable cards introduces light moderation needs that we
hadn't yet given a home or an actor.

## Decision
- **Roles** (SYS-08): every user has a role — user / moderator / admin. Moderator/admin tools are
  gated to the role.
- **Admin/Moderator console** (MOD-04): one moderator-only surface that is the home for the reports
  queue, edit-suggestion review, and catalog dedup/merge.
- **Dedup = merge, then soft-delete** (MOD-05): a moderator merges a duplicate game into the
  canonical entry — **re-pointing collection entries + cards so no user is orphaned** — then the empty
  duplicate is soft-deleted with a **3-day restore window** before a scheduled purge.
- **Edit-suggestions** (CAT-06) are approved/rejected in the console (MOD-06).
- **Text/glyph screening** (MOD-07): a banned-word pass on all user-entered text (card titles,
  freeform letters, game names) — because "no image uploads" does not make text-based abuse safe.
- **Entitlement-loss / takedown policy** (MOD-08): if a premium asset behind a published card
  disappears, the flattened card persists and existing adopters keep their grant; the asset becomes
  non-re-acquirable. **Exception:** a moderation/legal pull actively hides affected cards, which then
  fall back per the default-card guarantee (CARD-18) — so collections never break.

## Rationale / alternatives
- **"Merge" over "plain delete"** for dedup: a plain delete would orphan users who added the
  duplicate. Merge preserves their collections; it's a no-op when the dup is unused.
- **Takedown-with-fallback** over "always take down" or "never take down": protects users'
  collections in the common (refund) case while staying safe on the legal/moderation case.
- The product owner's earlier "moderation isn't a big deal" instinct largely holds — the vector-only
  (no-upload) model shrinks the surface to text screening + report/hide + a small console.
