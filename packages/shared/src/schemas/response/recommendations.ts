import { z } from 'zod';

// RESPONSE/VIEW schemas for the SOC-05 recommendation inbox (GET /me/recommendations — the Discover
// FROM-FRIENDS section; api-contract line 160). Owned by the F06 privacy serializer. Every item is a
// PUBLIC-shape summary: the recommender's public identity (id/username), the recommended game's title +
// a representative FLATTENED card thumb (CARD-07/18 — always resolves, never composition), the note, and
// createdAt. A recommendation blocked-either-direction with the recommender is excluded (SOC-09).

/**
 * The FLATTENED representative card for a recommended game (CARD-07/18 — always resolves). It is the
 * game's most-recent PUBLISHED card thumb (a public artifact, never the private composition — OQ-122), or
 * the DEFAULT face (`id: 'default'`, null urls) when the game has no published cards yet. Peek-only.
 */
export const recommendationCardSchema = z
  .object({
    id: z.string(), // a card_design uuid, or the literal 'default'
    // Plain strings, NOT .url() — the server emits RELATIVE /media/… paths (local-disk storage; R2/CDN
    // may absolutize later). Matches the codebase-standard card typing (galleryCardSchema et al.); the
    // .url() outliers were the C1 seam-parse bug class (would break RecRows the moment a rec carries a thumb).
    imageUrl: z.string().nullable(),
    thumbUrl: z.string().nullable(),
    isCustom: z.boolean(),
  })
  .strict();
export type RecommendationCard = z.infer<typeof recommendationCardSchema>;

/**
 * GET /me/recommendations item (SOC-05): the recipient's inbox row — who recommended what, with the note.
 * `note` is null when the recommender sent none; it is UNSCREENED at M6 (MOD-07 → M7). `game.card` is the
 * flattened representative peek. NO sender-private fields cross (public identity only).
 */
export const recommendationItemSchema = z
  .object({
    recId: z.string().uuid(),
    game: z
      .object({
        id: z.string().uuid(),
        title: z.string(),
        card: recommendationCardSchema,
      })
      .strict(),
    fromUser: z
      .object({
        userId: z.string().uuid(),
        username: z.string(),
      })
      .strict(),
    note: z.string().nullable(),
    createdAt: z.string(), // ISO-8601 UTC
  })
  .strict();
export type RecommendationItem = z.infer<typeof recommendationItemSchema>;

export const recommendationsResponseSchema = z
  .object({
    recommendations: z.array(recommendationItemSchema),
  })
  .strict();
export type RecommendationsResponse = z.infer<typeof recommendationsResponseSchema>;
