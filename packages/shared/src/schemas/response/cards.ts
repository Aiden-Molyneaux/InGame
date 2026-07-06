import { z } from 'zod';
import { compositionSchema } from '../composition';
import { stylePresetStyleSchema } from '../request/cards';

// RESPONSE/VIEW schemas for the M4 card substrate (api-contract 0.53 / decision 0066). OWNER-ONLY
// shapes: the design's `composition` may appear here (the owner renders live) — it must NEVER appear
// on a cross-user shape (CARD-15: viewers get flattened images, not layers; the 0066 §2 guard).

export const cardDesignStatusSchema = z.enum(['draft', 'private', 'published']); // CARD-14 lifecycle
export type CardDesignStatus = z.infer<typeof cardDesignStatusSchema>;

/** One of MY designs (the CARD-24a document): /me/cards · /me/collection/:entryId/cards items. */
export const cardDesignSchema = z
  .object({
    id: z.string().uuid(),
    gameId: z.string().uuid(),
    name: z.string(),
    status: cardDesignStatusSchema,
    composition: compositionSchema, // owner-only (0066 §2)
    compositionHash: z.string(),
    imageUrl: z.string().nullable(), // null until the M5 flatten-to-storage (0066 §1)
    thumbUrl: z.string().nullable(),
    isPremium: z.boolean(), // CARD-06 derived; always false on the M4 free baseline
    createdAt: z.string(), // ISO-8601
    updatedAt: z.string(),
  })
  .strict();
export type CardDesignView = z.infer<typeof cardDesignSchema>;

/** GET /me/cards — my designs across games (drafts · private · published; CARD-14). */
export const myCardsResponseSchema = z.object({ items: z.array(cardDesignSchema) }).strict();
export type MyCardsResponse = z.infer<typeof myCardsResponseSchema>;

/** GET /me/collection/:entryId/cards — the per-game switcher feed (COL-06). */
export const entryCardsResponseSchema = z.object({ items: z.array(cardDesignSchema) }).strict();
export type EntryCardsResponse = z.infer<typeof entryCardsResponseSchema>;

/** One saved style preset (CARD-24b). GET /me/style-presets returns the BARE ARRAY (api 0.51). */
export const stylePresetSchema = z
  .object({
    id: z.string().uuid(),
    name: z.string(),
    style: stylePresetStyleSchema,
    isPremium: z.boolean(), // derived (any premium closed attribute); false on the M4 free baseline
    createdAt: z.string(),
    updatedAt: z.string(),
  })
  .strict();
export type StylePresetView = z.infer<typeof stylePresetSchema>;

export const stylePresetsResponseSchema = z.array(stylePresetSchema);
export type StylePresetsResponse = z.infer<typeof stylePresetsResponseSchema>;
