# 0066 — M4 card substrate: flatten posture, data model, equip semantics, draft document

**Status:** LOCKED (spec-owner rulings from the Fable architecture read; the flatten-timing refinement
is flagged for the owner's G-M glance) · **Date:** 2026-07-05 · **Author:** Claude Code (Fable session —
the §4 cross-model stop, pulled forward by the owner) · **Rules:** where the CARD-15 flatten runs at M4,
the `card_designs`/`style_presets` data model, the COL-06 equip semantics + CARD-18 chain, the CARD-24a
draft document model, and the OQ-133/OQ-134 resolutions. Companion to 0058 §6–7 (the deferral this
lands), 0062 (the DEFAULT boundary), 0064 (the render spike).

## Context
The §3.1 first article surfaced OQ-133: the card endpoints existed in the contract (0.51/0.52) but not
in the code — decision 0058 §7 deferred `card_designs` + `activeCardDesignId` "to M4 with their
substrates," and §3.1 was the first M4 surface. The owner accepted the build-at-§3.2 default and pulled
the Fable stop forward; this record is that read's architecture output, made before the Styler builds
on it.

## The Fable read of the render module (§4 item 1+3) — GO
`apps/mobile/src/render/` holds its boundary cleanly: the vector-element schema + cap live in
`@ingame/shared` (one source, server validates the same shape it stores); the closed attributes stay
render-local until the Styler formalizes them (0064); `buildCardElements` is source-agnostic (skia
components injected — the same builder drives the live `<Canvas>` and the headless flatten), the F-02
stepped clip reuses the shared helper, the cap is enforced at draw *and* schema, and the effect renders
as a runtime overlay (CARD-12/15 exactly). **Adjustments noted, none blocking:** (a) the text-width
approximation (`length × fontSize × 0.58` — canvaskit-web lacks `measureText`) means a headless flatten
can drift from the on-device render for text-heavy cards → **an M5-entry item when flatten-to-storage
lands** (mooted at M4 by ruling 1); (b) the untyped `SkiaCtx` interop is acceptable at this module size —
revisit only if a third consumer appears.

## Decisions

1. **M4 flatten posture — validate + hash at save-private; flatten-to-storage rides M5 (CARD-15 timing
   refinement).** Under the 0062 DEFAULT boundary there is **no cross-user viewer until M5** — private
   cards are seen only by their owner, whose device holds the composition and the render module.
   CARD-15's guarantee ("viewers download one image, not the layers") therefore has **no consumer at
   M4**, and the repo has **no image-storage/CDN substrate** to write to. So at M4:
   `POST /cards/:id/save-private` **parses the composition (shared schema), derives `compositionHash`
   (CARD-19's dedup substrate) + `isPremium` (CARD-06 — always false on the free baseline), and
   transitions draft→private**; `imageUrl`/`thumbUrl` stay **null**, and every owner surface renders
   **live from the composition** (proven fast at card sizes, 0064). The **flatten-to-storage seam lands
   at M5 entry with publish**, where it is load-bearing — alongside the storage/CDN decision and the
   text-measure fix (read-adjustment a). *Owner-glance flag: this refines the CARD-15/api-contract
   "flatten at save-private" wording to "flatten at publish; save-private validates + hashes" —
   contract 0.53 + product-spec 0.52 carry the ripple.*
2. **The card rider carries `composition` — OWNER-ONLY.** `/me/collection` (the entry `card`),
   `/me/cards`, and `/me/collection/:entryId/cards` include the equipped/listed design's `composition`
   so every owner surface (shelf, Profile, Game page, switcher) renders the real card live (the CARD-07
   payoff). **Hard guard: no cross-user serializer may ever emit `composition`** — viewers get flattened
   images only (CARD-15). `/users/:id/collection` + the M5 gallery shapes carry `imageUrl`/`thumbUrl` +
   the `equipped` display labels, never the JSON. (The F06 serializer split is the enforcement seam.)
3. **`card_designs`** — `id · owner_id→users (SYS-01 user-owned) · game_id→games · name (bounded;
   MOD-07-unscreened per 0062) · status ∈ draft|private|published (the CARD-14 lifecycle; `published`
   unused until M5 — no later migration) · composition jsonb (shared-schema-validated) ·
   composition_hash · image_url/thumb_url (null until M5) · is_premium (derived, CARD-06) · timestamps`;
   index `(owner_id, game_id)`. **Adoption is deliberately NOT modeled here** — an adopted card is a
   flattened-image *grant*, not a composition row; it gets its own table at M5 (ECON-03/04) rather than
   overloading this one.
4. **`style_presets`** — `id · owner_id · name (bounded) · style jsonb (the 0.51 closed-attribute
   recipe shape) · is_premium (false at M4) · timestamps`; the **cap-30 → `409 PRESET_LIMIT`** is
   service-enforced (SYS-04-tunable), not a DB constraint.
5. **Equip semantics (COL-06) + the CARD-18 chain.** `collection_entries.active_card_design_id uuid
   NULL → card_designs.id ON DELETE SET NULL`. `PATCH /me/collection/:entryId` accepts
   `activeCardDesignId?: uuid|null`; the service validates **own design · same game · status ∈
   private|published** — **drafts are not equippable** (a draft is unfinished; the switcher shows it as
   a resume-editing handle, CARD-14). `DELETE /cards/:id` keeps the **409 CARD_EQUIPPED** guard (0040);
   `ON DELETE SET NULL` is belt-and-braces so any leak degrades to the default face, never a broken ref.
   The serializer chain at M4 is **equipped design → else the CARD-18 default stub** — the spec's middle
   rung ("else another card they have") only matters for moderation-pull fallback (MOD-08, M7) and is
   unreachable while the guard holds; recorded, not built.
6. **The draft document (CARD-24a).** One `card_designs` row IS the draft document: opening the Styler
   creates one (`POST /cards`) or resumes an existing draft; **autosave = debounced `PATCH /cards/:id`**
   (draft *and* private stay editable per the contract; published is immutable, CARD-20); **crash
   recovery = the row** (re-open the draft); the Styler↔Canvas posture switch edits the **same row**;
   **SAVE AS NEW = `POST /cards` with the current composition** (no separate duplicate route needed);
   KEEP = save-private + the COL-06 equip PATCH. Multiple drafts per game are allowed (the CARD-14
   drafts shelf is plural).
7. **OQ-134 resolved — `notes` + `rating` join the `/me/collection` item** (owner-only serializer; the
   friend subset already excludes them by contract). The Game-page dossier reads back what it writes.
8. **OQ-133 resolved — built at §3.2 (this record + the accompanying implementation).** The §3.1
   switcher's default-card interim goes fully live once the seed carries a private design.

## Consequences
- **api-contract 0.53** — save-private wording (validate+hash now, flatten at M5 publish); the card
  rider's owner-only `composition`; `PATCH /me/collection/:entryId` `activeCardDesignId` LIVE (platforms
  COL-04 stays deferred); `/me/collection` items + `notes`/`rating`.
- **product-spec 0.52** — CARD-15 changelog note (flatten-at-publish timing under the 0062 boundary).
- **Implementation (this branch):** the shared request/response schemas, the drizzle tables + migration,
  repo→service→routes with `defineRoute` + SYS-07 actor-B tests (test-first — user-owned writes),
  domain events per mutation, the two 409 guards, the collection serializer chain, and a seeded demo
  design. **M5-entry items:** flatten-to-storage + CDN + text-measure fix; the adoption grant table;
  the cross-user serializer guard test extends to the gallery shapes.
