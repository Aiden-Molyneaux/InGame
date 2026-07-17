import { z } from 'zod';
import { collectionCardSchema } from './collection';
import { listKindSchema } from '../request/lists';

// RESPONSE/VIEW schemas for the SOC-04 Top-10 lists (GET /me/lists — api-contract line 158). SELF-
// scoped (never cross-principal — the friend-visible top10 rides the /me + /users/:id inline instead,
// response/profile.ts's `selfTopTenEntrySchema`/`friendTopTenEntrySchema`), so `card` may carry
// `composition` for an equipped custom design like `/me/collection` (CARD-15 owner-only rendering).

/** One Top-10 member (SOC-04/COL-13). NO `title` on this shape (unlike the `/me`/`/users/:id` inline
 *  top10) — the Collection TOP view already has the game title in context; api-contract line 158. */
export const listItemViewSchema = z
  .object({
    gameId: z.string().uuid(),
    rank: z.number().int().min(1).max(10),
    card: collectionCardSchema,
  })
  .strict();
export type ListItemView = z.infer<typeof listItemViewSchema>;

/** GET /me/lists → one list (v2: always `kind: 'top10'`, general lists parked §10). The wire `id` is
 *  the STABLE KIND STRING (`'top10'`) — see list-service's design note (no create-a-list endpoint
 *  exists in the contract, so the client must be able to address "my top10 list" before any row does). */
export const listViewSchema = z
  .object({
    id: z.string(),
    kind: listKindSchema,
    items: z.array(listItemViewSchema),
  })
  .strict();
export type ListView = z.infer<typeof listViewSchema>;

export const listsResponseSchema = z.array(listViewSchema);
export type ListsResponse = z.infer<typeof listsResponseSchema>;
