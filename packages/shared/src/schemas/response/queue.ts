import { z } from 'zod';
import { collectionCardSchema } from './collection';
import { queueSourceSchema } from '../request/queue';

// RESPONSE/VIEW schemas for the WTP-01/02 "Up Next" queue (GET/POST /me/queue — api-contract line 170).
// GET /me/queue is SELF-scoped (never cross-principal) — `card` may safely carry `composition` for an
// equipped custom design, exactly like `/me/collection` (CARD-15 owner-only rendering; the queue reuses
// the SAME collection card-rider resolution, keyed by gameId instead of entryId).

/** WTP-02 — who recommended this queue item (present only when `source = 'friend_rec'`). `userId` is
 *  nullable: AUTH-07 — if the recommender's account is later deleted, the item degrades to the
 *  anonymized author shape rather than leaking their identity (the item itself stays in the queue). */
export const queueRecommendedBySchema = z
  .object({
    userId: z.string().uuid().nullable(),
    username: z.string(),
  })
  .strict();
export type QueueRecommendedBy = z.infer<typeof queueRecommendedBySchema>;

/** GET /me/queue item (WTP-01/02, OQ-054). `owned` drives the IN-COLLECTION vs WISHLIST tag; `card`
 *  always resolves (CARD-07/18 — the CARD-18 default stub for an unowned/unequipped game). */
export const queueItemSchema = z
  .object({
    itemId: z.string().uuid(),
    gameId: z.string().uuid(),
    title: z.string(),
    card: collectionCardSchema,
    owned: z.boolean(),
    source: queueSourceSchema,
    recommendedBy: queueRecommendedBySchema.optional(),
    note: z.string().nullable().optional(),
  })
  .strict();
export type QueueItem = z.infer<typeof queueItemSchema>;

export const queueResponseSchema = z
  .object({
    items: z.array(queueItemSchema),
  })
  .strict();
export type QueueResponse = z.infer<typeof queueResponseSchema>;
