import { z } from 'zod';
import { boundedText } from '../sanitize';
import { collectionStatusSchema } from '../common';
import { isoDateSchema } from './catalog';

// REQUEST/INPUT schemas for the collection (rule-3 fidelity to api-contract 0.48). USER-OWNED
// writes: the actor is the authenticated principal ONLY — `.strict()` refuses any smuggled id.

/** COL-03 hours sanity-cap (decision 0043) — server-bounded ≤99,999 (SYS-04-tunable). */
export const HOURS_MAX = 99_999;
export const NOTES_MAX = 500;
export const REORDER_MAX = 500; // input-bound hygiene for the id array (rule 3)

/** POST /me/collection body: { gameId } (COL-01). */
export const addCollectionEntryRequestSchema = z
  .object({
    gameId: z.string().uuid(),
  })
  .strict();

export type AddCollectionEntryRequest = z.infer<typeof addCollectionEntryRequestSchema>;
export const ADD_COLLECTION_ENTRY_FIELDS = Object.keys(
  addCollectionEntryRequestSchema.shape,
) as Array<keyof AddCollectionEntryRequest>;

/**
 * PATCH /me/collection/:entryId body (COL-02..05, api-contract 0.48 — the M3 field set; the
 * `platformIds`/`activeCardDesignId` halves ride M4 with their substrates, decision 0058).
 */
export const updateCollectionEntryRequestSchema = z
  .object({
    status: collectionStatusSchema.optional(),
    hours: z.number().int().min(0).max(HOURS_MAX).optional(),
    percentComplete: z.number().int().min(0).max(100).nullable().optional(),
    ownedSince: isoDateSchema.optional(),
    rating: z.number().int().min(1).max(5).nullable().optional(),
    notes: boundedText(NOTES_MAX).nullable().optional(),
    // COL-06 equip (LIVE api 0.53 / decision 0066 §5): the caller's OWN design, for THIS game,
    // status ∈ private|published (drafts are not equippable); null re-equips the CARD-18 default.
    // `platformIds` (COL-04) stays 0058-deferred with the platforms table.
    activeCardDesignId: z.string().uuid().nullable().optional(),
  })
  .strict();

export type UpdateCollectionEntryRequest = z.infer<typeof updateCollectionEntryRequestSchema>;
export const UPDATE_COLLECTION_ENTRY_FIELDS = Object.keys(
  updateCollectionEntryRequestSchema.shape,
) as Array<keyof UpdateCollectionEntryRequest>;

/** PATCH /me/collection/reorder body: { orderedEntryIds } — a FULL permutation (COL-07/OQ-031). */
export const reorderCollectionRequestSchema = z
  .object({
    orderedEntryIds: z.array(z.string().uuid()).min(1).max(REORDER_MAX),
  })
  .strict();

export type ReorderCollectionRequest = z.infer<typeof reorderCollectionRequestSchema>;
export const REORDER_COLLECTION_FIELDS = Object.keys(
  reorderCollectionRequestSchema.shape,
) as Array<keyof ReorderCollectionRequest>;

/** PUT /me/now-playing body: { gameId | null } — set/clear the single pin (WTP-03). */
export const nowPlayingRequestSchema = z
  .object({
    gameId: z.string().uuid().nullable(),
  })
  .strict();

export type NowPlayingRequest = z.infer<typeof nowPlayingRequestSchema>;
export const NOW_PLAYING_FIELDS = Object.keys(nowPlayingRequestSchema.shape) as Array<
  keyof NowPlayingRequest
>;
