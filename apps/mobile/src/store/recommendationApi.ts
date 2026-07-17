import type {
  CreateRecommendationRequest,
  OkResponse,
  RecommendationsResponse,
} from '@ingame/shared';
import { recommendationsResponseSchema } from '@ingame/shared';
import { api } from './api';

// recommendationApi (SOC-05) — P8's recommend-compose write PLUS P10's Discover FROM-FRIENDS inbox.
//
// P8: POST /recommendations { toUserId, gameId, note? } lands the game in the recipient's recommendations
// feed (NOT auto-queued — they add it from Discover, P10). Friend-only: a non-friend target → 409
// NOT_FRIENDS; self → SELF_TARGET; the block collapse + unknown-game refusals live server-side. The note is
// SYS-02-bounded (≤500) + UNSCREENED at M6 (MOD-07 → M7, accepted for the trusted beta).
//
// P10: GET /me/recommendations (the caller's OWN inbox — the FROM-FRIENDS section) + DELETE dismiss. These
// ARE the caller's principal (self-scoped read), so they carry the `Recommendations` tag; accepting a rec
// into the queue (queueApi, source:'friend_rec') invalidates it too so a consumed rec clears.
const recommendationApi = api
  .enhanceEndpoints({ addTagTypes: ['Recommendations'] })
  .injectEndpoints({
    endpoints: (build) => ({
      createRecommendation: build.mutation<OkResponse, CreateRecommendationRequest>({
        query: (body) => ({ url: '/recommendations', method: 'POST', body }),
      }),

      // GET /me/recommendations — the FROM-FRIENDS inbox (SOC-05): who recommended what, with the note.
      // Block-filtered + AUTH-07-safe server-side (a deleted recommender degrades, never leaks). Parsed at the seam.
      getRecommendations: build.query<RecommendationsResponse, void>({
        query: () => '/me/recommendations',
        transformResponse: (raw): RecommendationsResponse => recommendationsResponseSchema.parse(raw),
        providesTags: ['Recommendations'],
      }),

      // DELETE /me/recommendations/:recId — dismiss a rec (it leaves the inbox). Accepting-to-queue is the
      // queueApi path (source:'friend_rec', fromRecId); this is the explicit "not for me" dismiss.
      dismissRecommendation: build.mutation<OkResponse, string>({
        query: (recId) => ({ url: `/me/recommendations/${recId}`, method: 'DELETE' }),
        invalidatesTags: ['Recommendations'],
      }),
    }),
  });

export const {
  useCreateRecommendationMutation,
  useGetRecommendationsQuery,
  useDismissRecommendationMutation,
} = recommendationApi;
export { recommendationApi };
