import { useCallback, useMemo, useState } from 'react';

// The CAT-07 VIEW-ALL cursor accumulation (W-1) — RTK-free on purpose (the two dedicated routes own the
// RTK hooks; this owns only the page-fold + cursor state), so it unit-tests without pulling the store.
// Modelled on the feed's mergeFeedPages walk-3 discipline.

type Page<T> = { items: T[]; nextCursor: string | null };

/**
 * appendUnique — fold a fetched page into an accumulated list, DEDUPING by a stable key (first
 * occurrence wins — the row already on screen). Pure, so jest drives it directly. Guards the React
 * duplicate-key class if a cursor page ever overlaps or a page-1 refetch re-seeds the head.
 */
export function appendUnique<T>(prev: T[], page: T[], keyOf: (item: T) => string): T[] {
  const seen = new Set(prev.map(keyOf));
  const out = [...prev];
  for (const item of page) {
    const k = keyOf(item);
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(item);
  }
  return out;
}

/**
 * useContributorPaging — accumulate cursor pages over a page-1 subscription (the feedApi precedent). A
 * fresh `page1` (initial load / a Contributions invalidation) RESETS the accumulated tail + re-seats the
 * cursor; `loadMore` folds the next page in (deduped). `fetchMore(cursor)` is the route's lazy trigger,
 * already bound to the userId. The rendered list = page-1 head + the deduped tail.
 */
export function useContributorPaging<T>(
  page1: Page<T> | undefined,
  fetchMore: (cursor: string) => { unwrap: () => Promise<Page<T>> },
  keyOf: (item: T) => string,
): { items: T[]; hasMore: boolean; moreError: boolean; loadMore: () => Promise<void> } {
  const [tail, setTail] = useState<T[]>([]);
  const [moreError, setMoreError] = useState(false);
  // w1 — seat the cursor SYNCHRONOUSLY from page1, not in a post-paint effect, so the first non-skeleton
  // render already knows `hasMore`. A post-paint useEffect left `cursor` null for one frame, so the
  // terminal "That's everything." flashed before the effect re-seated it on lists that HAVE more pages.
  // This is the render-phase reconciliation pattern (the documented "adjusting state when a prop changes"):
  // a fresh page1 (initial load / a Contributions invalidation) RESETS the tail + re-seats the cursor
  // BEFORE paint — same reset the effect did, minus the flash.
  const [cursor, setCursor] = useState<string | null>(page1?.nextCursor ?? null);
  const [seededPage, setSeededPage] = useState(page1);
  if (page1 !== seededPage) {
    setSeededPage(page1);
    setTail([]);
    setMoreError(false);
    setCursor(page1?.nextCursor ?? null);
  }

  const items = useMemo(() => appendUnique(page1?.items ?? [], tail, keyOf), [page1, tail, keyOf]);

  const loadMore = useCallback(async () => {
    if (!cursor) return;
    try {
      const page = await fetchMore(cursor).unwrap();
      setTail((prev) => appendUnique(prev, page.items, keyOf));
      setCursor(page.nextCursor);
    } catch {
      setMoreError(true);
    }
  }, [cursor, fetchMore, keyOf]);

  return { items, hasMore: cursor != null, moreError, loadMore };
}
