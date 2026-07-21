import { z } from 'zod';
import { boundedText } from '../sanitize';
import { compositionSchema } from '../composition';

// REQUEST/INPUT schemas for the M4 card substrate (rule-3 fidelity to api-contract 0.53; decision
// 0066). card_designs + style_presets are USER-OWNED: the actor is the authenticated principal ONLY —
// `.strict()` refuses any smuggled id. The composition validates against the shared compositionSchema
// (0064): typed vector elements + cap-30; the closed attributes ride the `.passthrough()` envelope.

export const CARD_NAME_MAX = 60; // a named save-target (CARD-24a); MOD-07-unscreened at M4 (0062)
export const PRESET_NAME_MAX = 40;
/** CARD-24 preset cap (SYS-04-tunable; owner-set 2026-07-05). Full → 409 PRESET_LIMIT. */
export const STYLE_PRESETS_MAX = 30;

/** POST /cards — create the draft document (CARD-14/24a). `name` defaults server-side (game title). */
export const createCardRequestSchema = z
  .object({
    gameId: z.string().uuid(),
    composition: compositionSchema,
    name: boundedText(CARD_NAME_MAX).optional(),
    // CARD-24a copy-on-write (decision 0067): editing a committed card spins a draft COPY that
    // records its origin here. The service validates it as the actor's OWN card for the SAME game.
    derivedFromCardId: z.string().uuid().optional(),
  })
  .strict();
export type CreateCardRequest = z.infer<typeof createCardRequestSchema>;
export const CREATE_CARD_FIELDS = Object.keys(createCardRequestSchema.shape) as Array<
  keyof CreateCardRequest
>;

/** PATCH /cards/:id — the autosave write (draft/private only; published is immutable, CARD-20). */
export const updateCardRequestSchema = z
  .object({
    name: boundedText(CARD_NAME_MAX).optional(),
    composition: compositionSchema.optional(),
  })
  .strict();
export type UpdateCardRequest = z.infer<typeof updateCardRequestSchema>;
export const UPDATE_CARD_FIELDS = Object.keys(updateCardRequestSchema.shape) as Array<
  keyof UpdateCardRequest
>;

// ── the community-gallery query params (api-contract 0.81 — sort + cursor paging) ────────────────────

/** GET /games/:gameId/cards ordering: `top` = adoption count (SQL-ranked), `new` = recency. */
export const gallerySortSchema = z.enum(['top', 'new']);
export type GallerySort = z.infer<typeof gallerySortSchema>;

/** The full-list page size (the contributor VIEW-ALL precedent) and the server's per-request cap. */
export const GALLERY_PAGE = 24;
export const GALLERY_LIMIT_MAX = 60;

/**
 * GET /games/:gameId/cards query params (api-contract 0.81). ALL OPTIONAL — absent params keep the
 * pre-0.81 behavior (the full published set, newest first), so the existing gallery mounts stay
 * whole. `sort=top` ranks by adoption count IN SQL; `cursor` is the opaque offset cursor the response
 * `nextCursor` hands back (the contributor VIEW-ALL grammar); `limit` bounds the page (1..60).
 * Query strings arrive as strings, so `limit` coerces; every string is bounded (rule-3 amendment).
 * Non-strict (stray params are stripped, not rejected) — mirrors `walletLedgerQuerySchema`, the GET
 * precedent: a cache-buster / analytics param tacked onto the URL must not 422 a read.
 */
export const gameGalleryQuerySchema = z.object({
  sort: gallerySortSchema.optional(),
  cursor: boundedText(40).optional(),
  limit: z.coerce.number().int().min(1).max(GALLERY_LIMIT_MAX).optional(),
});
export type GameGalleryQuery = z.infer<typeof gameGalleryQuerySchema>;

/**
 * The CARD-24b style recipe — the CLOSED attributes only (frame · effect+intensity · finish ·
 * nameplate · title font+ink), game-agnostic (api-contract 0.51). Ids are roster ids (client
 * constants at M4, cosmetic entities later — 0063/0066); bounded so no free-text rides in.
 */
export const stylePresetStyleSchema = z
  .object({
    frameId: boundedText(40).optional(),
    effect: z
      .object({ id: boundedText(40), intensity: z.number().min(0).max(1) })
      .strict()
      .optional(),
    finishId: boundedText(40).optional(),
    nameplateId: boundedText(40).optional(),
    title: z.object({ fontId: boundedText(40), ink: boundedText(40) }).strict().optional(),
    // COSM-05 (W-5, api-contract 0.77) — the CUSTOM hue an ULTIMATE frame/plate was wearing when the
    // preset was snapshotted, so a preset re-applies the picked colour, not the registry default.
    // Additive + only meaningful when the paired id is a colorCustomizable SKU (the client apply-path
    // ignores them otherwise; the flatten backstop force-corrects any hand-crafted misuse regardless).
    frameColor: boundedText(40).optional(),
    plateColor: boundedText(40).optional(),
  })
  .strict();
export type StylePresetStyle = z.infer<typeof stylePresetStyleSchema>;

/** POST /me/style-presets (CARD-24b). Cap-30 → 409 PRESET_LIMIT (service-enforced). */
export const createStylePresetRequestSchema = z
  .object({
    name: boundedText(PRESET_NAME_MAX),
    style: stylePresetStyleSchema,
  })
  .strict();
export type CreateStylePresetRequest = z.infer<typeof createStylePresetRequestSchema>;
export const CREATE_STYLE_PRESET_FIELDS = Object.keys(
  createStylePresetRequestSchema.shape,
) as Array<keyof CreateStylePresetRequest>;

/** PATCH /me/style-presets/:id — rename or re-snapshot. */
export const updateStylePresetRequestSchema = z
  .object({
    name: boundedText(PRESET_NAME_MAX).optional(),
    style: stylePresetStyleSchema.optional(),
  })
  .strict();
export type UpdateStylePresetRequest = z.infer<typeof updateStylePresetRequestSchema>;
export const UPDATE_STYLE_PRESET_FIELDS = Object.keys(
  updateStylePresetRequestSchema.shape,
) as Array<keyof UpdateStylePresetRequest>;
