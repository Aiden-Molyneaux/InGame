import type { FeedResponse } from '@ingame/shared';
import { feedResponseSchema } from '@ingame/shared';
import { api } from './api';

// feedApi (P8 · SOC-06) — the aggregated friend-activity feed. GET /me/feed is cursor-paginated: the
// arg is the opaque `nextCursor` (undefined = the first page). Each cursor is its OWN cache entry; the
// Friends tab accumulates pages in component state via the lazy hook (the wallet-ledger precedent — a
// component-side accumulate is simpler + correct vs an RTK `merge`, which mis-refetches a middle page
// on invalidation). INJECTED into the base slice from its own file (api.ts stays the server track's);
// parsed at the seam (the executable contract). No tag — the feed is a read-through stream, not
// mutation-invalidated by this surface (a friend.added elsewhere just shows on the next fetch).
const feedApi = api.injectEndpoints({
  endpoints: (build) => ({
    getFeed: build.query<FeedResponse, string | undefined>({
      query: (cursor) => (cursor ? `/me/feed?cursor=${encodeURIComponent(cursor)}` : '/me/feed'),
      transformResponse: (raw): FeedResponse => feedResponseSchema.parse(raw),
    }),
  }),
});

export const { useGetFeedQuery, useLazyGetFeedQuery } = feedApi;
export { feedApi };
