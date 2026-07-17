import type { BlocksListResponse, OkResponse } from '@ingame/shared';
import { blocksListResponseSchema } from '@ingame/shared';
import { api } from './api';

// P12 Settings endpoints (SOC-09 · api-contract §Social). INJECTED into the base `api` slice from its
// own file (the communityApi/contributorApi precedent) — api.ts is off-limits this packet. `enhanceEndpoints`
// adds the `Blocks` tag the base slice doesn't declare; `injectEndpoints` merges into the same reducer.
//
// The BLOCKED-users page (0076 §0.10 — the MOD-09 lone-exception affordance): list your OWN blocks and
// unblock. Both are LIVE since M5 F-2 / P1 (POST/DELETE /me/blocks built; api-contract 0.62). Block
// (POST) is NOT re-declared here — it already lives as `useBlockUserMutation` in communityApi.ts; a second
// injectEndpoints entry on the same route would collide (RTK dedup). The ReportSheet's block-alongside and
// the game-page designer-block both reuse that mutation.
const settingsApi = api.enhanceEndpoints({ addTagTypes: ['Blocks', 'TrendingCards'] }).injectEndpoints({
  endpoints: (build) => ({
    // GET /me/blocks — the actor's own blocked list (id/username/avatarUrl/blockedAt). MOD-09's lone
    // exception: the one place a blocked relationship IS disclosed, to the blocker themselves. Parsed at
    // the seam. `refetchOnMountOrArgChange` is set at the call-site so a block done in a report/profile
    // context (which invalidates CommunityCards, not Blocks) is reflected when the page opens.
    getBlocks: build.query<BlocksListResponse, void>({
      query: () => '/me/blocks',
      providesTags: ['Blocks'],
      transformResponse: (raw): BlocksListResponse => blocksListResponseSchema.parse(raw),
    }),
    // DELETE /me/blocks/:userId — unblock (SOC-09, the MOD-09 terminal's lone exception). Refreshes the
    // blocked list AND the community/trending views (the unblocked designer's cards re-surface).
    unblockUser: build.mutation<OkResponse, string>({
      query: (userId) => ({ url: `/me/blocks/${userId}`, method: 'DELETE' }),
      invalidatesTags: ['Blocks', 'CommunityCards', 'TrendingCards'],
    }),
  }),
});

export const { useGetBlocksQuery, useUnblockUserMutation } = settingsApi;

export { settingsApi };
