import type {
  CatalogListResponse,
  GameDetail,
  GameEditableField,
  GameEditResponse,
  GameEditValue,
} from '@ingame/shared';
import { catalogListResponseSchema, gameDetailSchema, gameEditResponseSchema } from '@ingame/shared';
import { api } from './api';

// walk2 N2b — the Add-Game pre-query rail trio (CAT-11 NEW RELEASES + CAT-12 FRIENDS ARE PLAYING). Both
// were 404 when the surface first shipped; the Wave-C server slice built them. INJECTED into the base
// `api` slice from its own file (the friendApi/queueApi/listsApi precedent) — api.ts is off-limits.
// Both return the SAME shape as `/catalog/popular` (CatalogListResponse — `{ items: CatalogItem[] }`),
// so they render through the identical rail grammar; parsed at the seam (F31).
//
// Cache-tagged `Catalog` (the base slice's tag) so an add — which moves collectionsCount / friendsHave /
// inCollection — re-reads them exactly as it re-reads popular. friends-active is ranked server-side by
// friendsHaveCount (CAT-12); new-releases by recency (CAT-11).
const catalogRailsApi = api.injectEndpoints({
  endpoints: (build) => ({
    // GET /catalog/new-releases (CAT-11) — recent catalog additions, the NEW RELEASES rail.
    getNewReleases: build.query<CatalogListResponse, void>({
      query: () => '/catalog/new-releases',
      transformResponse: (raw): CatalogListResponse => catalogListResponseSchema.parse(raw),
      providesTags: ['Catalog'],
    }),

    // GET /catalog/friends-active (CAT-12) — games the caller's friends are playing, ranked by
    // friendsHaveCount. Empty for a caller with no friends-active games (the quiet rail-empty state,
    // NOT a placeholder).
    getFriendsActive: build.query<CatalogListResponse, void>({
      query: () => '/catalog/friends-active',
      transformResponse: (raw): CatalogListResponse => catalogListResponseSchema.parse(raw),
      providesTags: ['Catalog'],
    }),

    // GET /catalog/games/:id (CAT-05/09/09c, M6 W-C5 / W-D1 GAP-1) — the game-detail AGGREGATE: canonical
    // facts (id/name/studio/publisher/releaseDate · genres) + CAT-05 contributor + CAT-09
    // collectionsCount/friendsHaveCount + the own-it `inCollection` flag + the CAT-09c named `friendsWhoOwn`
    // list. The shared ABOUT-tab source across ALL Game-page postures (OWN/FRIEND/CATALOG) + the CATALOG
    // PLAY-block facts. The community card GALLERY is NOT here (its own route, GET /games/:id/cards). Server
    // is LIVE (W-C5, 50fd467); this closes the CLIENT half. Parsed at the seam (F31). Provides `Catalog` so
    // an add/remove — which flips `inCollection` + moves the CAT-09 counts — re-reads it, exactly as it
    // re-reads popular/search.
    getGameDetail: build.query<GameDetail, string>({
      query: (gameId) => `/catalog/games/${gameId}`,
      transformResponse: (raw): GameDetail => gameDetailSchema.parse(raw),
      providesTags: ['Catalog'],
    }),

    // POST /catalog/games/:id/edits (CAT-13/14, M6 W-6) — ONE wiki-live field edit ({ field, newValue };
    // the request IS the `game_edits` history row). The 201 carries { edit, game } — the APPLIED
    // GameDetail — so the gameDetail cache reconciles IN ONE ROUND-TRIP (upsert below, NO tag
    // invalidation / refetch — the E2 packet's explicit grammar). Refusals (`screened` · `no_change` ·
    // `unknown_genre` · 429 · ACCOUNT_TOO_NEW) surface on the owning field row in AboutTab.
    submitGameEdit: build.mutation<
      GameEditResponse,
      { gameId: string; field: GameEditableField; newValue: GameEditValue }
    >({
      query: ({ gameId, field, newValue }) => ({
        url: `/catalog/games/${gameId}/edits`,
        method: 'POST',
        body: { field, newValue },
      }),
      transformResponse: (raw): GameEditResponse => gameEditResponseSchema.parse(raw),
      async onQueryStarted({ gameId }, { dispatch, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled;
          dispatch(catalogRailsApi.util.updateQueryData('getGameDetail', gameId, () => data.game));
        } catch {
          // the mutation hook surfaces the error to the owning row — nothing to reconcile
        }
      },
    }),
  }),
});

export const {
  useGetNewReleasesQuery,
  useGetFriendsActiveQuery,
  useGetGameDetailQuery,
  useSubmitGameEditMutation,
} = catalogRailsApi;
export { catalogRailsApi };
