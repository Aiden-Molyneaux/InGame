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
