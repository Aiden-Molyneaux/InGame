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
    // CARD-24a copy-on-write origin (decision 0067): set on a draft COPY of a committed card; null
    // otherwise. A crash-recovered copy knows its origin — resuming then KEEPing merges it home.
    derivedFromCardId: z.string().uuid().nullable(),
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

// ── M5 P3 — the CROSS-USER PUBLIC card shapes (gallery · trending · adopt; decision 0072/0073) ─────
// These are the OQ-122 public views: flattened image urls + attribution, NEVER `composition` (the
// private layers stay in the owner shape; viewers get the flattened image — CARD-15 / 0066 §2).

/**
 * One community-gallery card (GET /games/:gameId/cards). `priceForYou` = the caller's PERSONALIZED
 * adoption price (decision 0072) = the summed PX of the card's premium components the caller does NOT
 * already own — 0 for a free card or one the caller fully owns. `isPremium` is the card's own flag.
 */
export const galleryCardSchema = z
  .object({
    id: z.string().uuid(),
    name: z.string(),
    imageUrl: z.string().nullable(),
    thumbUrl: z.string().nullable(),
    isPremium: z.boolean(),
    adoptionCount: z.number().int().nonnegative(),
    priceForYou: z.number().int().nonnegative(), // personalized missing-components sum (0072)
    designer: z.object({ userId: z.string().uuid(), username: z.string() }).strict(),
  })
  .strict();
export type GalleryCardView = z.infer<typeof galleryCardSchema>;

/** GET /games/:gameId/cards — the community gallery (published only; personalized prices). */
export const gameGalleryResponseSchema = z.object({ items: z.array(galleryCardSchema) }).strict();
export type GameGalleryResponse = z.infer<typeof gameGalleryResponseSchema>;

/**
 * POST /cards/:id/adopt (decision 0072) — one atomic acquire of the card's premium components the
 * caller doesn't own + the free design grant. `granted` is one row per component actually charged
 * (already-owned/free → []); `totalPaid` == `card_adoptions.currency_paid`; `balance` is the post-
 * adopt wallet balance (the STARTING_GRANT effective value when the free path never materializes it).
 */
export const adoptResponseSchema = z
  .object({
    granted: z.array(
      z.object({ cosmeticId: z.string(), paid: z.number().int().nonnegative() }).strict(),
    ),
    totalPaid: z.number().int().nonnegative(),
    balance: z.number().int(),
  })
  .strict();
export type AdoptResponse = z.infer<typeof adoptResponseSchema>;

/**
 * GET /discover/trending-cards (DISC-04 / OQ-055) — featured community cards ranked by adoption.
 * NON-COMMERCE: counts, never prices (no `priceForYou`). Block-filtered per the caller (SOC-09).
 */
export const trendingCardSchema = z
  .object({
    rank: z.number().int().positive(),
    card: z
      .object({
        id: z.string().uuid(),
        name: z.string(),
        imageUrl: z.string().nullable(),
        thumbUrl: z.string().nullable(),
        isPremium: z.boolean(),
      })
      .strict(),
    game: z.object({ id: z.string().uuid(), title: z.string() }).strict(),
    designer: z.object({ userId: z.string().uuid(), username: z.string() }).strict(),
    adoptionCount: z.number().int().nonnegative(),
  })
  .strict();
export type TrendingCardView = z.infer<typeof trendingCardSchema>;

export const trendingCardsResponseSchema = z.object({ items: z.array(trendingCardSchema) }).strict();
export type TrendingCardsResponse = z.infer<typeof trendingCardsResponseSchema>;
