import { renderHook, act } from '@testing-library/react-native';
import { appendUnique, useContributorPaging } from './useContributorPaging';

// W-1 — the CAT-07 VIEW-ALL page-fold discipline (the feed mergeFeedPages precedent, generalized): a
// fold DEDUPES by a stable key, so a cursor-overlap between pages can never double-render a row (the
// React duplicate-key class). The hook's reset-on-page1 + cursor state is exercised by the route test.

type Row = { id: string; label: string };
type Page = { items: Row[]; nextCursor: string | null };
const row = (id: string): Row => ({ id, label: `row-${id}` });
const keyOf = (r: Row) => r.id;
const ids = (list: Row[]) => list.map((r) => r.id);

describe('appendUnique — the VIEW-ALL page-fold dedupe', () => {
  it('appends a fresh page in order', () => {
    const out = appendUnique([row('a'), row('b')], [row('c'), row('d')], keyOf);
    expect(ids(out)).toEqual(['a', 'b', 'c', 'd']);
  });

  it('dedupes an overlapping page by key (first occurrence wins)', () => {
    const out = appendUnique([row('a'), row('b')], [row('b'), row('c')], keyOf);
    expect(ids(out)).toEqual(['a', 'b', 'c']);
    expect(new Set(ids(out)).size).toBe(out.length);
  });

  it('never reorders what is already accumulated', () => {
    const out = appendUnique([row('a'), row('b')], [row('a'), row('e')], keyOf);
    expect(ids(out)).toEqual(['a', 'b', 'e']);
  });

  it('an empty page is a no-op', () => {
    const out = appendUnique([row('a')], [], keyOf);
    expect(ids(out)).toEqual(['a']);
  });
});

// MAJOR-2 — the sort-flip race (Murr): a loadMore fired against the OLD page1 must NOT land after a
// reset (a sort flip or an adopt-invalidation refetch) has re-seated the tail + cursor. The
// generation guard makes the hook DISCARD that stale in-flight resolution: no wrong-sort rows are
// appended, and the cursor keeps the reset value.
describe('useContributorPaging — generation guard on loadMore (sort-flip race)', () => {
  it('a stale loadMore resolving AFTER a reset appends nothing and leaves the reset cursor intact', async () => {
    // A controllable deferred for the STALE (old-sort) loadMore — it resolves only when we say so.
    let resolveStale!: (p: Page) => void;
    const stalePage = new Promise<Page>((res) => {
      resolveStale = res;
    });
    const fetchMore = jest.fn((cursor: string) => ({
      // the old-sort page stays in flight; any post-reset fetch resolves empty (we only assert the arg)
      unwrap: () => (cursor === 'top-c1' ? stalePage : Promise.resolve<Page>({ items: [], nextCursor: null })),
    }));

    const page1Top: Page = { items: [row('a1'), row('a2')], nextCursor: 'top-c1' };
    const { result, rerender } = renderHook(
      ({ p1 }: { p1: Page }) => useContributorPaging<Row>(p1, fetchMore, keyOf),
      { initialProps: { p1: page1Top } },
    );

    // dispatch a loadMore against the TOP sort — it stays in flight (stalePage unresolved)
    act(() => {
      void result.current.loadMore();
    });
    expect(fetchMore).toHaveBeenLastCalledWith('top-c1');

    // the sort FLIPS: a brand-new page1 identity resets the fold + re-seats the cursor to the new sort's
    const page1New: Page = { items: [row('b1'), row('b2')], nextCursor: 'new-c1' };
    rerender({ p1: page1New });
    expect(ids(result.current.items)).toEqual(['b1', 'b2']);

    // NOW the stale (top-sort) loadMore resolves with wrong-sort rows + a wrong-sort cursor
    await act(async () => {
      resolveStale({ items: [row('a3'), row('a4')], nextCursor: 'top-c2' });
      await stalePage;
    });

    // the stale resolution was DISCARDED: no top-sort rows leaked into the new-sort list…
    expect(ids(result.current.items)).toEqual(['b1', 'b2']);
    expect(result.current.moreError).toBe(false);

    // …and the cursor stayed the RESET value — the next loadMore pages from 'new-c1', never 'top-c2'
    await act(async () => {
      await result.current.loadMore();
    });
    expect(fetchMore).toHaveBeenLastCalledWith('new-c1');
  });
});
