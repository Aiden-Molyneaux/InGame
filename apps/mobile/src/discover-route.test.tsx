import React from 'react';
import { render as rtlRender, screen, fireEvent, waitFor } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import prefsReducer from './store/prefsSlice';

// P10 — the Discover screen (app/(tabs)/discover). UP NEXT room (queue + owned/WISHLIST tags + rec accept
// threading + dismiss + LIST_FULL) ↔ DISCOVER room (trending rail + UPCOMING EXPECTED-empty). Route test
// under src/. All api slices mocked (no store fetch); useTheme still needs a redux Provider.

const CARD = { imageUrl: null, thumbUrl: null };
const RCARD = { id: 'c1', imageUrl: null, thumbUrl: null, isCustom: false };

let mockQueue: { data?: unknown; isLoading: boolean } = { data: { items: [] }, isLoading: false };
let mockCollection: { data?: unknown } = { data: { items: [] } };
let mockRecs: { data?: unknown } = { data: { recommendations: [] } };
let mockTrending: { data?: unknown } = { data: { items: [] } };
const mockAdd = jest.fn(() => ({ unwrap: () => Promise.resolve({}) }));
const mockReorder = jest.fn(() => ({ unwrap: () => Promise.resolve({}) }));
const mockDelete = jest.fn(() => ({ unwrap: () => Promise.resolve({}) }));
const mockDismiss = jest.fn(() => ({ unwrap: () => Promise.resolve({}) }));
const mockSetNP = jest.fn(() => ({ unwrap: () => Promise.resolve({}) }));
const mockUpdate = jest.fn(() => ({ unwrap: () => Promise.resolve({}) }));
const mockPush = jest.fn();

jest.mock('./store/queueApi', () => ({
  useGetQueueQuery: () => mockQueue,
  useAddQueueItemMutation: () => [mockAdd, { isLoading: false }],
  useReorderQueueMutation: () => [mockReorder, {}],
  useDeleteQueueItemMutation: () => [mockDelete, {}],
}));
jest.mock('./store/recommendationApi', () => ({
  useGetRecommendationsQuery: () => mockRecs,
  useDismissRecommendationMutation: () => [mockDismiss, {}],
}));
jest.mock('./store/communityApi', () => ({ useGetTrendingCardsQuery: () => mockTrending }));
jest.mock('./store/api', () => ({
  useGetCollectionQuery: () => mockCollection,
  useUpdateEntryMutation: () => [mockUpdate, { isLoading: false }],
  useSetNowPlayingMutation: () => [mockSetNP, {}],
}));
jest.mock('expo-router', () => ({ useRouter: () => ({ push: mockPush, navigate: jest.fn(), back: jest.fn() }) }));
jest.mock('./components/EntryCard', () => ({
  EntryCard: ({ title }: { title: string }) => {
    const { Text } = require('react-native');
    return <Text>{`CARD:${title}`}</Text>;
  },
}));
jest.mock('./components/game/FlatCardImage', () => ({
  FlatCardImage: ({ title }: { title: string }) => {
    const { Text } = require('react-native');
    return <Text>{`FLAT:${title}`}</Text>;
  },
}));

import Discover from '../app/(tabs)/discover';

const render = () => {
  const store = configureStore({ reducer: { prefs: prefsReducer } });
  return rtlRender(
    <Provider store={store}>
      <Discover />
    </Provider>,
  );
};

const QITEM = (over: Record<string, unknown>) => ({
  itemId: over.itemId,
  gameId: over.gameId ?? 'g1',
  title: over.title ?? 'Hades',
  card: CARD,
  owned: over.owned ?? true,
  source: over.source ?? 'collection',
  ...over,
});

const NP = {
  entryId: 'np1', gameId: 'gnp', title: 'Elden Ring', developer: 'From', publisher: null, releaseYear: 2022,
  genres: [], hours: 210, status: 'playing', ownedSince: null, addedAt: '2022-01-01T00:00:00.000Z',
  nowPlaying: true, card: CARD,
};

const REC = {
  recId: 'r1', game: { id: 'grec', title: 'Outer Wilds', card: RCARD }, fromUser: { userId: 'u2', username: 'sol' },
  note: 'play it blind', createdAt: '2026-01-01T00:00:00.000Z',
};

const TREND = {
  rank: 1, card: { id: 'tc1', name: 'Erdtree', imageUrl: null, thumbUrl: null, isPremium: true },
  game: { id: 'gt1', title: 'Elden Ring' }, designer: { userId: 'u3', username: 'nova' }, adoptionCount: 1200,
};

beforeEach(() => {
  mockAdd.mockClear();
  mockAdd.mockImplementation(() => ({ unwrap: () => Promise.resolve({}) }));
  mockDismiss.mockClear();
  mockPush.mockClear();
  mockQueue = { data: { items: [] }, isLoading: false };
  mockCollection = { data: { items: [] } };
  mockRecs = { data: { recommendations: [] } };
  mockTrending = { data: { items: [] } };
});

describe('WTP-01/02: UP NEXT room', () => {
  it('renders the now-playing pin + queue rows with owned/WISHLIST tags', () => {
    mockCollection = { data: { items: [NP] } };
    mockQueue = {
      data: {
        items: [
          QITEM({ itemId: 'q1', gameId: 'g1', title: 'Hades', owned: true, source: 'collection' }),
          QITEM({ itemId: 'q2', gameId: 'g2', title: 'Celeste', owned: false, source: 'friend_rec', recommendedBy: { userId: 'u9', username: 'kai' }, note: 'so good' }),
        ],
      },
      isLoading: false,
    };
    render();
    expect(screen.getByText('▶ NOW PLAYING')).toBeTruthy();
    expect(screen.getByText('CARD:Elden Ring')).toBeTruthy();
    expect(screen.getByText('IN COLLECTION')).toBeTruthy();
    expect(screen.getByText('★ WISHLIST')).toBeTruthy();
    expect(screen.getByText(/REC'D BY @kai/)).toBeTruthy();
  });

  it('empty queue shows the inviting first-run state', () => {
    render();
    expect(screen.getByText("QUEUE'S EMPTY")).toBeTruthy();
  });
});

describe('SOC-05: FROM FRIENDS recs', () => {
  it('accepting a rec threads source=friend_rec + fromRecId into the queue', async () => {
    mockRecs = { data: { recommendations: [REC] } };
    render();
    fireEvent.press(screen.getByText('+ QUEUE'));
    await waitFor(() =>
      expect(mockAdd).toHaveBeenCalledWith({ gameId: 'grec', source: 'friend_rec', fromRecId: 'r1' }),
    );
  });

  it('dismissing a rec calls DELETE /me/recommendations/:recId', () => {
    mockRecs = { data: { recommendations: [REC] } };
    render();
    fireEvent.press(screen.getByLabelText('Dismiss Outer Wilds'));
    expect(mockDismiss).toHaveBeenCalledWith('r1');
  });

  it('a LIST_FULL refusal surfaces the cap-50 state', async () => {
    mockRecs = { data: { recommendations: [REC] } };
    mockAdd.mockImplementation(() => ({ unwrap: () => Promise.reject({ data: { error: { code: 'LIST_FULL' } } }) }));
    render();
    fireEvent.press(screen.getByText('+ QUEUE'));
    expect(await screen.findByText(/queue is full/i)).toBeTruthy();
  });
});

// walk-8/10 structural helpers — flatten a rendered subtree's text leaves in order; walk ancestors for
// a ScrollView (composite 'ScrollView' or host 'RCTScrollView'), the walk-1 no-renest pattern.
type TestNode = { parent: TestNode | null; type: unknown; children?: unknown[] };
function flattenText(node: unknown, out: string[] = []): string[] {
  if (typeof node === 'string') out.push(node);
  else if (node && typeof node === 'object') {
    for (const child of ((node as { children?: unknown[] }).children ?? [])) flattenText(child, out);
  }
  return out;
}
function hasScrollViewAncestor(node: TestNode): boolean {
  let p: TestNode | null = node.parent;
  while (p) {
    const ty = p.type as { displayName?: string; name?: string } | string;
    const name = typeof ty === 'string' ? ty : (ty?.displayName ?? ty?.name ?? '');
    if (/ScrollView/.test(String(name))) return true;
    p = p.parent;
  }
  return false;
}

describe('WTP-01 walk-7..10: UP NEXT refinements', () => {
  const QUEUED = {
    data: { items: [QITEM({ itemId: 'q1', gameId: 'g1', title: 'Hades', owned: true, source: 'collection' })] },
    isLoading: false,
  };

  it('walk-7: the DRAG TO REORDER hint renders ONLY in reorder mode', () => {
    mockQueue = QUEUED;
    render();
    // read mode — bare count, no hint
    expect(screen.queryByText(/DRAG TO REORDER/)).toBeNull();
    fireEvent.press(screen.getByText('REORDER'));
    // reorder mode — the hint appears on the section title
    expect(screen.getByText(/QUEUE · 1 — DRAG TO REORDER/)).toBeTruthy();
    fireEvent.press(screen.getByText('DONE'));
    expect(screen.queryByText(/DRAG TO REORDER/)).toBeNull();
  });

  it("walk-8: the ⋯ overflow sits to the RIGHT of the IN COLLECTION indicator", () => {
    mockQueue = QUEUED;
    const tree = render();
    const texts = flattenText(tree.toJSON());
    const tagIdx = texts.indexOf('IN COLLECTION');
    const ovfIdx = texts.indexOf('⋯');
    expect(tagIdx).toBeGreaterThanOrEqual(0);
    expect(ovfIdx).toBeGreaterThanOrEqual(0);
    expect(tagIdx).toBeLessThan(ovfIdx); // indicator first, ⋯ at the row's right edge
  });

  it('walk-10: the ⋯ opens the Game-Options-drawer grammar (ScreenButton rows, screen-root sheet)', async () => {
    mockQueue = QUEUED;
    render();
    fireEvent.press(screen.getByLabelText('Hades options'));
    // real ScreenButton rows (the game-page grammar: /secondary action + /destructive removal)
    expect(screen.getByText('PIN AS NOW PLAYING')).toBeTruthy();
    expect(screen.getByText('REMOVE FROM QUEUE')).toBeTruthy();
    // the sheet mounts OUTSIDE the screen scroll (walk-1 no-renest): its title node (above the sheet's
    // own internal body-scroll) has no ScrollView ancestor — while the in-scroll queue-row title does.
    const titles = screen.getAllByText('HADES');
    expect(titles.some((n) => !hasScrollViewAncestor(n as unknown as TestNode))).toBe(true);
    expect(titles.some((n) => hasScrollViewAncestor(n as unknown as TestNode))).toBe(true);
    // the actions wire through: REMOVE calls the queue delete (await the async close — no act() bleed)
    fireEvent.press(screen.getByText('REMOVE FROM QUEUE'));
    await waitFor(() => expect(mockDelete).toHaveBeenCalledWith('q1'));
    await waitFor(() => expect(screen.queryByText('REMOVE FROM QUEUE')).toBeNull()); // the sheet closed
  });
});

describe('DISC-04: DISCOVER room', () => {
  it('toggling to DISCOVER shows the trending rail + the UPCOMING EXPECTED-empty (no notify toggle)', () => {
    mockTrending = { data: { items: [TREND] } };
    render();
    fireEvent.press(screen.getByText('DISCOVER'));
    // trending renders (non-commerce clout count, no price)
    expect(screen.getByText('▲ 1.2K')).toBeTruthy();
    expect(screen.getByText('FLAT:Erdtree')).toBeTruthy();
    // upcoming is honest EXPECTED-empty (endpoint 404), never faked
    expect(screen.getByText(/check back soon/i)).toBeTruthy();
  });
});
