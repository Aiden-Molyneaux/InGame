import { appendUnique } from './useContributorPaging';

// W-1 — the CAT-07 VIEW-ALL page-fold discipline (the feed mergeFeedPages precedent, generalized): a
// fold DEDUPES by a stable key, so a cursor-overlap between pages can never double-render a row (the
// React duplicate-key class). The hook's reset-on-page1 + cursor state is exercised by the route test.

type Row = { id: string; label: string };
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
