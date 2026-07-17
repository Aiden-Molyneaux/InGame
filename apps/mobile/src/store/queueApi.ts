import type {
  QueueResponse,
  QueueItem,
  AddQueueItemRequest,
  ReorderQueueRequest,
  OkResponse,
} from '@ingame/shared';
import { queueResponseSchema, queueItemSchema } from '@ingame/shared';
import { api } from './api';

// P10 — the WTP-01/02 "Up Next" queue (api-contract §What to Play). INJECTED into the base `api` slice
// from its own file (the friendApi/communityApi precedent) — the concurrent server track owns api.ts, so
// this packet touches it zero times. `enhanceEndpoints` adds the `Queue` tag the base slice doesn't
// declare; `injectEndpoints` merges into the same reducer/middleware. Zod at every seam (F31).
//
// SELF-scoped: GET /me/queue may carry `composition` on an equipped custom design (like /me/collection —
// CARD-15 owner-only rendering), so EntryCard renders these faces live where owned.
const queueApi = api
  .enhanceEndpoints({ addTagTypes: ['Queue', 'Recommendations'] })
  .injectEndpoints({
    endpoints: (build) => ({
      // GET /me/queue (WTP-01/02) — the ranked queue; `owned` drives IN-COLLECTION vs ★ WISHLIST, and a
      // friend_rec row carries recommendedBy + note. Parsed at the seam.
      getQueue: build.query<QueueResponse, void>({
        query: () => '/me/queue',
        transformResponse: (raw): QueueResponse => queueResponseSchema.parse(raw),
        providesTags: ['Queue'],
      }),

      // POST /me/queue — add a game. `source:'collection'|'discovery'` are self-adds; `source:'friend_rec'`
      // threads `fromRecId` (the rec being accepted) so recommendedBy/note ride onto the item. cap-50 past
      // which the server refuses with 409 LIST_FULL (surfaced as the RTK error). A friend_rec add invalidates
      // Recommendations too — the server may drop the consumed rec (A5).
      addQueueItem: build.mutation<QueueItem, AddQueueItemRequest>({
        query: (body) => ({ url: '/me/queue', method: 'POST', body }),
        transformResponse: (raw): QueueItem => queueItemSchema.parse(raw),
        invalidatesTags: (_res, _err, arg) =>
          arg.source === 'friend_rec' ? ['Queue', 'Recommendations'] : ['Queue'],
      }),

      // PATCH /me/queue/reorder — the full-permutation re-rank (mirrors collection/reorder). The optimistic
      // path isn't needed (the drag holds local order until DONE, then commits + re-reads).
      reorderQueue: build.mutation<OkResponse, ReorderQueueRequest>({
        query: (body) => ({ url: '/me/queue/reorder', method: 'PATCH', body }),
        invalidatesTags: ['Queue'],
      }),

      // DELETE /me/queue/:itemId — drop a queued game.
      deleteQueueItem: build.mutation<OkResponse, string>({
        query: (itemId) => ({ url: `/me/queue/${itemId}`, method: 'DELETE' }),
        invalidatesTags: ['Queue'],
      }),
    }),
  });

export const {
  useGetQueueQuery,
  useAddQueueItemMutation,
  useReorderQueueMutation,
  useDeleteQueueItemMutation,
} = queueApi;

export { queueApi };
