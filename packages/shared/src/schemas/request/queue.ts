import { z } from 'zod';

// REQUEST/INPUT schemas for the WTP-01/02 "Up Next" queue (api-contract §What to Play, lines 170-174).
// USER-OWNED writes: the actor is the authenticated principal ONLY — `.strict()` refuses any smuggled
// id. `gameId`/`fromRecId` are legitimately body-supplied (they are not the actor).

/** WTP-02 — the queue-add origin. `friend_rec` threads `recommendedBy`/`note` onto the item via
 *  `fromRecId` (the /me/recommendations row it came from); `collection`/`discovery` are self-adds. */
export const QUEUE_SOURCES = ['collection', 'discovery', 'friend_rec'] as const;
export const queueSourceSchema = z.enum(QUEUE_SOURCES);
export type QueueSource = z.infer<typeof queueSourceSchema>;

export const QUEUE_REORDER_MAX = 200; // input-bound hygiene for the id array (rule 3; the cap-50 list is well under this)

/**
 * POST /me/queue body: { gameId, source, fromRecId? } (WTP-01/02). `fromRecId` is REQUIRED when
 * `source = 'friend_rec'` (and ONLY then) — the contract's own wording ("a friend rec uses friend_rec +
 * the fromRecId"); the service additionally verifies the rec belongs to the actor as recipient and
 * matches `gameId` (SYS-01 — a foreign/mismatched fromRecId is a 422, not a silent ignore).
 */
export const addQueueItemRequestSchema = z
  .object({
    gameId: z.string().uuid(),
    source: queueSourceSchema,
    fromRecId: z.string().uuid().optional(),
  })
  .strict()
  .refine((v) => (v.source === 'friend_rec' ? v.fromRecId !== undefined : v.fromRecId === undefined), {
    message: 'fromRecId is required for (and only for) source="friend_rec".',
    path: ['fromRecId'],
  });

export type AddQueueItemRequest = z.infer<typeof addQueueItemRequestSchema>;

/** PATCH /me/queue/reorder body: { orderedItemIds } — a FULL permutation (WTP-01, mirrors COL-07). */
export const reorderQueueRequestSchema = z
  .object({
    orderedItemIds: z.array(z.string().uuid()).min(1).max(QUEUE_REORDER_MAX),
  })
  .strict();

export type ReorderQueueRequest = z.infer<typeof reorderQueueRequestSchema>;
