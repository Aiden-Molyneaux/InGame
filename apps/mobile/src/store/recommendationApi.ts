import type { CreateRecommendationRequest, OkResponse } from '@ingame/shared';
import { api } from './api';

// recommendationApi (P8 · SOC-05) — the minimal recommend-compose write (OQ-075). POST /recommendations
// { toUserId, gameId, note? } lands the game in the recipient's recommendations feed (NOT auto-queued —
// they add it from Discover, P10). Friend-only: a non-friend target → 409 NOT_FRIENDS; self → SELF_TARGET;
// the block collapse + unknown-game refusals live server-side and surface as the RTK error. The note is
// SYS-02-bounded (≤500) + UNSCREENED at M6 (MOD-07 → M7, accepted for the trusted beta). No tag: the
// recipient's inbox (GET /me/recommendations) is a different principal's read (P10 Discover), not ours.
const recommendationApi = api.injectEndpoints({
  endpoints: (build) => ({
    createRecommendation: build.mutation<OkResponse, CreateRecommendationRequest>({
      query: (body) => ({ url: '/recommendations', method: 'POST', body }),
    }),
  }),
});

export const { useCreateRecommendationMutation } = recommendationApi;
export { recommendationApi };
