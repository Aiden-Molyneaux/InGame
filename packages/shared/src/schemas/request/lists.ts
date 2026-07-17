import { z } from 'zod';

// REQUEST/INPUT schemas for the SOC-04 Top-10 lists (api-contract §Lists, line 158). USER-OWNED
// writes: the actor is the authenticated principal ONLY — `.strict()` refuses any smuggled id.
// v2 has exactly ONE list kind (`top10`); general lists are parked (§10).

export const LIST_KINDS = ['top10'] as const;
export const listKindSchema = z.enum(LIST_KINDS);
export type ListKind = z.infer<typeof listKindSchema>;

/** POST /me/lists/:id/items body: { gameId } — add a member (SOC-04; rejects LIST_FULL past 10). */
export const addListItemRequestSchema = z
  .object({
    gameId: z.string().uuid(),
  })
  .strict();

export type AddListItemRequest = z.infer<typeof addListItemRequestSchema>;

export const TOP_TEN_MAX = 10;

/** PATCH /me/lists/:id body: { orderedGameIds } — the Top-10 re-rank, a FULL permutation (COL-07/13). */
export const rerankListRequestSchema = z
  .object({
    orderedGameIds: z.array(z.string().uuid()).min(1).max(TOP_TEN_MAX),
  })
  .strict();

export type RerankListRequest = z.infer<typeof rerankListRequestSchema>;
