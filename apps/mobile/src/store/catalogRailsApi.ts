import type { CatalogListResponse } from '@ingame/shared';
import { catalogListResponseSchema } from '@ingame/shared';
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
  }),
});

export const { useGetNewReleasesQuery, useGetFriendsActiveQuery } = catalogRailsApi;
export { catalogRailsApi };
