import type { FeedItem } from '@ingame/shared';
import { mergeFeedPages } from './feedApi';

// P8 walk-3 regression — the feed page-fold discipline: a page-1 (re)fetch RESETS the merged list and
// every fold dedupes by feedItemId, so a focus-refetch of page 1 or a cursor-overlap between pages can
// never double-render an item (the React duplicate-key class seen on Friends focus).

function item(id: string): FeedItem {
  return {
    feedItemId: id,
    actor: { userId: '11111111-1111-1111-1111-111111111111', username: 'riko', avatarUrl: null },
    type: 'beat_game',
    aggregateCount: 1,
    objects: [{ gameId: '22222222-2222-2222-2222-222222222222', title: 'Hades' }],
    occurredAt: '2026-07-16T10:00:00Z',
    windowStart: '2026-07-16T00:00:00Z',
    windowEnd: '2026-07-16T12:00:00Z',
  };
}
const ids = (list: FeedItem[]) => list.map((i) => i.feedItemId);

describe('mergeFeedPages — walk-3 dedupe/reset discipline', () => {
  const page1 = [item('a'), item('b')];
  const page2 = [item('c'), item('d')];

  it('page1 → page2 → page1 REFETCH (reset): unique ids, length stable at page1', () => {
    let list = mergeFeedPages([], page1, true);
    list = mergeFeedPages(list, page2, false);
    expect(ids(list)).toEqual(['a', 'b', 'c', 'd']);
    // the focus-refetch of page 1 resets — NOT appends (the duplication mechanism)
    list = mergeFeedPages(list, page1, true);
    expect(ids(list)).toEqual(['a', 'b']);
    expect(new Set(ids(list)).size).toBe(list.length);
  });

  it('an overlapping page append dedupes by feedItemId (first occurrence wins)', () => {
    let list = mergeFeedPages([], page1, true);
    // the server page overlaps: 'b' rides again at the head of page 2
    list = mergeFeedPages(list, [item('b'), item('c')], false);
    expect(ids(list)).toEqual(['a', 'b', 'c']);
    expect(new Set(ids(list)).size).toBe(list.length);
  });

  it('an appended page never reorders what is already on screen', () => {
    let list = mergeFeedPages([], page1, true);
    list = mergeFeedPages(list, [item('a'), item('e')], false);
    expect(ids(list)).toEqual(['a', 'b', 'e']);
  });
});
