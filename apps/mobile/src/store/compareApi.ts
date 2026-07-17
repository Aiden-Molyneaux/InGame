import type { CompareResponse } from '@ingame/shared';
import { compareResponseSchema } from '@ingame/shared';
import { api } from './api';

// P9 compare endpoint (SOC-03 · api-contract §Social). INJECTED into the base `api` slice from its own
// file (the friendApi/communityApi precedent) — api.ts is off-limits this packet.
//
// NON-COMMERCE (ARCH A1): comparing creates no card and spends no PX — the shape carries hours + games
// counts only (completion % out), no prices. PRIVACY-GATED (PROF-03): a hidden axis is OMITTED, never
// faked — the client renders the omission branches (see compare-manifest ARCH A2). FRIEND-ONLY: a
// non-friend/self is refused 409 NOT_FRIENDS; a blocked/suspended/deleted/unknown target collapses to
// the generic 404 (MOD-09) — both surface as the RTK error, mapped by the screen.
const compareApi = api.enhanceEndpoints({ addTagTypes: ['Compare'] }).injectEndpoints({
  endpoints: (build) => ({
    getCompare: build.query<CompareResponse, string>({
      query: (friendId) => `/me/compare/${friendId}`,
      transformResponse: (raw): CompareResponse => compareResponseSchema.parse(raw),
      providesTags: (_res, _err, friendId) => [{ type: 'Compare', id: friendId }],
    }),
  }),
});

export const { useGetCompareQuery } = compareApi;

export { compareApi };
