import type {
  ListsResponse,
  ListItemView,
  AddListItemRequest,
  RerankListRequest,
  OkResponse,
} from '@ingame/shared';
import { listsResponseSchema, listItemViewSchema } from '@ingame/shared';
import { api } from './api';

// P10 — the SOC-04 / COL-13 Top-10 list (api-contract §Lists). The wire `id` is the STABLE KIND STRING
// `'top10'` (list-service design note — no create-a-list endpoint; the client addresses "my top10" by kind).
// INJECTED into the base `api` slice from its own file; the concurrent server track owns api.ts. Zod at
// every seam. SELF-scoped (the friend-visible top10 rides the /users/:id inline, friendApi) — `card` may
// carry composition for an equipped custom design (CARD-15 owner render).
//
// NOTE: `GET /me/lists` items carry gameId·rank·card but NO `title` (by schema design — the TOP view has the
// title in context from the collection). `TopCurated` joins titles/hours from the collection cache (A2).
export const TOP10_LIST_ID = 'top10';

const listsApi = api
  .enhanceEndpoints({ addTagTypes: ['Lists'] })
  .injectEndpoints({
    endpoints: (build) => ({
      // GET /me/lists — v2 returns exactly one list (kind:'top10'). Parsed at the seam.
      getLists: build.query<ListsResponse, void>({
        query: () => '/me/lists',
        transformResponse: (raw): ListsResponse => listsResponseSchema.parse(raw),
        providesTags: ['Lists'],
      }),

      // POST /me/lists/top10/items — seat a game (SOC-04/COL-13). Refused past cap-10 with 409 LIST_FULL,
      // and 422 not_in_collection for a game the caller doesn't own (unreachable via the CardPicker — it
      // sources the caller's collection, A3 — but handled defensively). Returns the seated ListItemView.
      addListItem: build.mutation<ListItemView, { listId?: string; gameId: string }>({
        query: ({ listId = TOP10_LIST_ID, gameId }) => ({
          url: `/me/lists/${listId}/items`,
          method: 'POST',
          body: { gameId } satisfies AddListItemRequest,
        }),
        transformResponse: (raw): ListItemView => listItemViewSchema.parse(raw),
        // the profile inline top10 re-reads too (Me carries the /me top10).
        invalidatesTags: ['Lists', 'Me'],
      }),

      // DELETE /me/lists/top10/items/:gameId — unseat a game.
      removeListItem: build.mutation<OkResponse, { listId?: string; gameId: string }>({
        query: ({ listId = TOP10_LIST_ID, gameId }) => ({
          url: `/me/lists/${listId}/items/${gameId}`,
          method: 'DELETE',
        }),
        invalidatesTags: ['Lists', 'Me'],
      }),

      // PATCH /me/lists/top10 — the drag re-rank, a FULL permutation of orderedGameIds (COL-07/13). Commits
      // once on DONE, then re-reads.
      rerankList: build.mutation<OkResponse, { listId?: string } & RerankListRequest>({
        query: ({ listId = TOP10_LIST_ID, orderedGameIds }) => ({
          url: `/me/lists/${listId}`,
          method: 'PATCH',
          body: { orderedGameIds } satisfies RerankListRequest,
        }),
        invalidatesTags: ['Lists', 'Me'],
      }),
    }),
  });

export const {
  useGetListsQuery,
  useAddListItemMutation,
  useRemoveListItemMutation,
  useRerankListMutation,
} = listsApi;

export { listsApi };
