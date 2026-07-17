import type { FeedItem, FeedResponse } from '@ingame/shared';
import { feedResponseSchema } from '@ingame/shared';
import { api } from './api';

/**
 * mergeFeedPages (walk-3 belt-and-braces) — the ONE way the Friends screen folds a fetched feed page
 * into its accumulated list. `reset` (a page-1/no-cursor fetch) REPLACES the list; an append DEDUPES by
 * `feedItemId` (first occurrence wins — the earlier page's row is already on screen), so neither a
 * focus-refetch of page 1 nor a cursor-overlap between pages can ever double-render an item (the React
 * duplicate-key class). Pure — jest drives it directly.
 */
export function mergeFeedPages(prev: FeedItem[], page: FeedItem[], reset: boolean): FeedItem[] {
  const base = reset ? [] : prev;
  const seen = new Set(base.map((i) => i.feedItemId));
  const merged = [...base];
  for (const item of page) {
    if (seen.has(item.feedItemId)) continue;
    seen.add(item.feedItemId);
    merged.push(item);
  }
  return merged;
}

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
