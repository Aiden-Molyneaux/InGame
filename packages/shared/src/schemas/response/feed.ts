import { z } from 'zod';

// RESPONSE/VIEW schema for the SOC-06 aggregated friend-activity feed (GET /me/feed; api-contract line
// 161, OQ-071). Computed at request time from the ACH-08 `domain_events` outbox over the actor's ACCEPTED
// friends (the SYS-01-FRIEND-READ class). DELIBERATELY LOW-NOISE: events are AGGREGATED BY actor+type
// within a fixed time window (an import burst collapses to ONE item with a high `aggregateCount`), and
// trivia (stat-only entry edits) is EXCLUDED server-side. Every field is a PUBLIC summary (PROF-03): the
// friend's public identity, the game title, a flattened card peek, an achievement label — never hours,
// notes, ratings, or any owner-private field (the allowlist is the shape itself).
//
// SEAM (contract drift, flagged — not this packet's to resolve): the api-contract draws `actor.avatarRef`
// and `feedItemId`; every BUILT serializer emits `avatarUrl`, so this carries `avatarUrl` to match the
// live wire the client already consumes (the same divergence P1/P2 flagged for the social read shapes).

export const FEED_ITEM_TYPES = [
  'added_games', // collection.entry_added — aggregated (import-flood-suppressed)
  'beat_game', // collection.entry_updated where status flipped to 'beaten'
  'completed_game', // collection.entry_updated where status flipped to 'completed'
  'published_card', // card.published
  'unlocked_achievement', // achievement.unlocked (emitted by P6 — the feed renders it the day P6 lands)
] as const;
export const feedItemTypeSchema = z.enum(FEED_ITEM_TYPES);
export type FeedItemType = z.infer<typeof feedItemTypeSchema>;

/**
 * One object peeked in a feed item (≤3 sample per item). The present fields depend on the item `type`:
 * game types carry `gameId`/`title` (+ optional flattened `card`); `published_card` carries the card +
 * its game; `unlocked_achievement` carries `achievementId` (+ optional `label`). All optional — the
 * shape is a thin cross-type peek, never a full object.
 */
export const feedObjectSchema = z
  .object({
    gameId: z.string().uuid().optional(),
    title: z.string().optional(),
    card: z
      .object({
        id: z.string(),
        imageUrl: z.string().url().nullable(),
        thumbUrl: z.string().url().nullable(),
      })
      .strict()
      .optional(),
    achievementId: z.string().optional(),
    label: z.string().optional(),
  })
  .strict();
export type FeedObject = z.infer<typeof feedObjectSchema>;

/**
 * A SOC-06 feed item — one aggregated (actor, type, window) row. `feedItemId` is a STABLE synthetic id
 * (`type:actorId:windowStartMs`) so a re-fetch is deterministic (and the keyset cursor is stable).
 * `aggregateCount` is the number of underlying events (100 for a 100-game import burst); `objects` is a
 * ≤3 flattened peek. `occurredAt` is the window's most-recent event time (drives display + ordering);
 * `windowStart`/`windowEnd` bound the fixed aggregation bucket.
 */
export const feedItemSchema = z
  .object({
    feedItemId: z.string(),
    actor: z
      .object({
        userId: z.string().uuid(),
        username: z.string(),
        avatarUrl: z.string().url().nullable(),
      })
      .strict(),
    type: feedItemTypeSchema,
    aggregateCount: z.number().int().nonnegative(),
    objects: z.array(feedObjectSchema),
    occurredAt: z.string(), // ISO-8601 UTC — the window's latest event
    windowStart: z.string(), // ISO-8601 UTC — the fixed bucket start
    windowEnd: z.string(), // ISO-8601 UTC — bucket start + FEED_WINDOW_MS
  })
  .strict();
export type FeedItem = z.infer<typeof feedItemSchema>;

/** GET /me/feed → the aggregated, cursor-paginated activity feed. `nextCursor` is an opaque keyset token. */
export const feedResponseSchema = z
  .object({
    items: z.array(feedItemSchema),
    nextCursor: z.string().nullable(),
  })
  .strict();
export type FeedResponse = z.infer<typeof feedResponseSchema>;
