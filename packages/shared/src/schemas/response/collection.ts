import { z } from 'zod';
import { collectionStatusSchema } from '../common';
import { genreViewSchema } from './catalog';

// RESPONSE/VIEW schemas for the collection (api-contract 0.17/0.48) — the F06 serializer side of
// the split. The client's shelf/LIST/TOP + profile stats bind to these via z.infer (F31).

/**
 * The `card` rider — resolves per CARD-18: the equipped design → else the default-face STUB
 * (`id: 'default'`, null urls). **M4 (api 0.53 / decision 0066 §2):** an equipped CUSTOM design adds
 * its `name` + `composition` — OWNER-ONLY (the owner renders live; a cross-user serializer must NEVER
 * emit `composition` — CARD-15: viewers get flattened images, not layers). Urls stay null until the
 * M5 flatten-to-storage.
 */
export const collectionCardSchema = z
  .object({
    id: z.string(),
    imageUrl: z.string().nullable(),
    thumbUrl: z.string().nullable(),
    isCustom: z.boolean(),
    isPremium: z.boolean(),
    name: z.string().optional(), // custom designs only (0.53)
    composition: z.unknown().optional(), // custom designs only — OWNER-ONLY (0066 §2)
  })
  .strict();

export type CollectionCard = z.infer<typeof collectionCardSchema>;

/** The one pre-M4 stub value `card` resolves to everywhere (api-contract 0.48). */
export const DEFAULT_CARD_STUB: CollectionCard = {
  id: 'default',
  imageUrl: null,
  thumbUrl: null,
  isCustom: false,
  isPremium: false,
};

/** The 0.17 collection item enumeration (GET /me/collection · the POST /me/collection response). */
export const collectionItemSchema = z
  .object({
    entryId: z.string().uuid(),
    gameId: z.string().uuid(),
    title: z.string(),
    developer: z.string().nullable(),
    publisher: z.string().nullable(),
    releaseYear: z.number().int().nullable(),
    genres: z.array(genreViewSchema),
    hours: z.number().int().nonnegative(),
    percentComplete: z.number().int().nullable(),
    status: collectionStatusSchema,
    ownedSince: z.string().nullable(), // YYYY-MM-DD (user-editable date acquired, COL-03)
    addedAt: z.string(), // ISO-8601 — the IMMUTABLE shelf-add timestamp (entry.createdAt); the RECENT
    // sort keys on this, distinct from the editable ownedSince (OQ-128 resolved, 2026-07-04)
    nowPlaying: z.boolean(), // the ▶ NOW tag (WTP-03)
    card: collectionCardSchema,
    // OQ-134 (api 0.53) — OWNER-ONLY personal fields; the friend-view subset excludes them by contract.
    rating: z.number().int().min(1).max(5).nullable(), // COL-03 private ⭐
    notes: z.string().nullable(), // COL-05
  })
  .strict();

export type CollectionItem = z.infer<typeof collectionItemSchema>;

/**
 * GET /me/collection — `total` counts the current query, `collectionTotal` the whole shelf (the
 * CountTag's "2 OF 48" — honest, the C4 class). M3 posture (D4/decision 0058): unpaginated,
 * `nextCursor` always null.
 */
export const collectionResponseSchema = z
  .object({
    items: z.array(collectionItemSchema),
    nextCursor: z.string().nullable(),
    total: z.number().int().nonnegative(),
    collectionTotal: z.number().int().nonnegative(),
  })
  .strict();

export type CollectionResponse = z.infer<typeof collectionResponseSchema>;

export const okResponseSchema = z.object({ ok: z.literal(true) }).strict();
export type OkResponse = z.infer<typeof okResponseSchema>;
