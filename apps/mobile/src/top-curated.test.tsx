import React from 'react';
import { render as rtlRender, screen, fireEvent } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import type { CollectionItem, FriendTopTenEntry } from '@ingame/shared';
import prefsReducer from './store/prefsSlice';

// useTheme reads redux (prefs.themeId/shellId) — every render needs a Provider.
const render = (ui: React.ReactElement) => {
  const store = configureStore({ reducer: { prefs: prefsReducer } });
  return rtlRender(<Provider store={store}>{ui}</Provider>);
};

// P10 — the COL-13 curated Top-10 view-mode (components/collection/TopCurated). SELF read + ARRANGE +
// CardPicker (cap-10 LIST_FULL); FRIEND read-only. listsApi hooks are mocked (no store needed).

const CARD = { imageUrl: null, thumbUrl: null };
let mockLists: { data?: unknown; isLoading: boolean } = { data: undefined, isLoading: false };
const mockAdd = jest.fn(() => ({ unwrap: () => Promise.resolve({}) }));
const mockRemove = jest.fn(() => ({ unwrap: () => Promise.resolve({}) }));
const mockRerank = jest.fn(() => ({ unwrap: () => Promise.resolve({}) }));

jest.mock('./store/listsApi', () => ({
  TOP10_LIST_ID: 'top10',
  useGetListsQuery: () => mockLists,
  useAddListItemMutation: () => [mockAdd, { isLoading: false }],
  useRemoveListItemMutation: () => [mockRemove, { isLoading: false }],
  useRerankListMutation: () => [mockRerank, { isLoading: false }],
}));
jest.mock('./components/EntryCard', () => ({
  EntryCard: ({ title }: { title: string }) => {
    const { Text } = require('react-native');
    return <Text>{`CARD:${title}`}</Text>;
  },
}));

import { SelfTopView, FriendTopView, TopTenCardPicker, rankAccentFor } from './components/collection/TopCurated';

const CI = (n: number): CollectionItem =>
  ({
    entryId: `e${n}`,
    gameId: `g${n}`,
    title: `Game ${n}`,
    developer: 'Studio',
    publisher: 'Pub',
    releaseYear: 2014,
    genres: [],
    hours: 100 + n,
    status: 'playing',
    ownedSince: '2020-01-01',
    addedAt: '2020-01-01T00:00:00.000Z',
    nowPlaying: false,
    card: CARD,
  }) as unknown as CollectionItem;

const listWith = (gameIds: string[]) => ({
  data: [{ id: 'top10', kind: 'top10', items: gameIds.map((g, i) => ({ gameId: g, rank: i + 1, card: CARD })) }],
  isLoading: false,
});

const COLLECTION = [CI(1), CI(2), CI(3), CI(4), CI(5)];

beforeEach(() => {
  mockAdd.mockClear();
  mockAdd.mockImplementation(() => ({ unwrap: () => Promise.resolve({}) }));
  mockRemove.mockClear();
  mockRerank.mockClear();
});

describe('COL-13: SelfTopView (read)', () => {
  it('renders the curated rank rows, titles joined from the collection cache', () => {
    mockLists = listWith(['g1', 'g2', 'g3']);
    render(<SelfTopView collectionItems={COLLECTION} arranging={false} onOpenPicker={() => {}} onOpenGame={() => {}} />);
    expect(screen.getByText('YOUR #1')).toBeTruthy();
    expect(screen.getByText('CARD:Game 1')).toBeTruthy();
    expect(screen.getByText('CARD:Game 3')).toBeTruthy();
  });

  it('empty top10 shows the ghost + "rank your favourites" nudge (not a hours fallback)', () => {
    mockLists = listWith([]);
    render(<SelfTopView collectionItems={COLLECTION} arranging={false} onOpenPicker={() => {}} onOpenGame={() => {}} />);
    expect(screen.getByText('RANK YOUR FAVOURITES')).toBeTruthy();
  });
});

describe('COL-13: SelfTopView (ARRANGE)', () => {
  it('the + seat RAISES the screen-mounted picker (walk-1 — the sheet never renders in here)', () => {
    mockLists = listWith(['g1', 'g2']);
    const onOpenPicker = jest.fn();
    render(<SelfTopView collectionItems={COLLECTION} arranging onOpenPicker={onOpenPicker} onOpenGame={() => {}} />);
    // the DONE bar + seat count
    expect(screen.getByText('2 / 10 SEATED')).toBeTruthy();
    // walk-5b — the add-seat is a STANDARD ScreenButton (orange /primary), not the one-off affordance
    fireEvent.press(screen.getByText('+ ADD FROM COLLECTION · SEAT 3'));
    expect(onOpenPicker).toHaveBeenCalled();
    // the sheet itself is NOT rendered by SelfTopView (it mounts at the screen root — F-15)
    expect(screen.queryByText(/SEARCH YOUR COLLECTION|Add to Top · Seat/i)).toBeNull();
  });

  it('removing a seated card calls DELETE …/items/:gameId', () => {
    mockLists = listWith(['g1', 'g2']);
    render(<SelfTopView collectionItems={COLLECTION} arranging onOpenPicker={() => {}} onOpenGame={() => {}} />);
    fireEvent.press(screen.getByLabelText('Remove Game 1'));
    expect(mockRemove).toHaveBeenCalledWith({ gameId: 'g1' });
  });

  it('at cap-10 the add-seat is replaced by the LIST_FULL state', () => {
    mockLists = listWith(['g1', 'g2', 'g3', 'g4', 'g5', 'g6', 'g7', 'g8', 'g9', 'g10']);
    render(<SelfTopView collectionItems={COLLECTION} arranging onOpenPicker={() => {}} onOpenGame={() => {}} />);
    expect(screen.queryByText(/ADD FROM COLLECTION · SEAT/)).toBeNull();
    expect(screen.getByText(/Top 10 is full/i)).toBeTruthy();
  });
});

describe('COL-13 walk-6: rank accents (owner ruling 2026-07-17 — catalog RankChip/first restored)', () => {
  it('maps 1→gold · 2/3→silver · 4+→orange accent', () => {
    expect(rankAccentFor(1)).toBe('gold');
    expect(rankAccentFor(2)).toBe('silver');
    expect(rankAccentFor(3)).toBe('silver');
    expect(rankAccentFor(4)).toBe('accent');
    expect(rankAccentFor(10)).toBe('accent');
  });
});

describe('COL-13: TopTenCardPicker (the screen-root sheet)', () => {
  it('renders EVERY collection item as a pickable cell (the walk-1 "empty drawer" regression)', () => {
    mockLists = listWith(['g1']);
    render(<TopTenCardPicker visible onClose={() => {}} collectionItems={COLLECTION} />);
    // N collection items → N picker cells (seated ones toggle to Remove)
    const cells = screen.getAllByLabelText(/^(Add|Remove) Game \d$/);
    expect(cells).toHaveLength(COLLECTION.length);
  });

  it('adds an unseated collection game', () => {
    mockLists = listWith(['g1', 'g2']);
    render(<TopTenCardPicker visible onClose={() => {}} collectionItems={COLLECTION} />);
    fireEvent.press(screen.getByLabelText('Add Game 3'));
    expect(mockAdd).toHaveBeenCalledWith({ gameId: 'g3' });
  });

  it('a seated game toggles to remove (✓)', () => {
    mockLists = listWith(['g1', 'g2']);
    render(<TopTenCardPicker visible onClose={() => {}} collectionItems={COLLECTION} />);
    fireEvent.press(screen.getByLabelText('Remove Game 1'));
    expect(mockRemove).toHaveBeenCalledWith({ gameId: 'g1' });
  });

  it('a LIST_FULL refusal surfaces the cap-10 state', async () => {
    mockLists = listWith(['g1']);
    mockAdd.mockImplementation(() => ({ unwrap: () => Promise.reject({ data: { error: { code: 'LIST_FULL' } } }) }) as never);
    render(<TopTenCardPicker visible onClose={() => {}} collectionItems={COLLECTION} />);
    fireEvent.press(screen.getByLabelText('Add Game 3'));
    expect(await screen.findByText(/Top 10 is full — remove one first/i)).toBeTruthy();
  });
});

describe('COL-13: FriendTopView (read-only)', () => {
  const ENTRIES: FriendTopTenEntry[] = [
    { rank: 1, gameId: 'g1', title: 'Resident Evil', card: { imageUrl: null } as never },
    { rank: 2, gameId: 'g2', title: 'Hades', card: { imageUrl: null } as never },
  ];
  it('renders the friend ranked Top-10 + the read-only bar (no ARRANGE)', () => {
    render(<FriendTopView entries={ENTRIES} username="riko" onOpenGame={() => {}} />);
    expect(screen.getByText('CARD:Resident Evil')).toBeTruthy();
    expect(screen.getByText(/READ-ONLY · RIKO'S CURATED TOP 10/i)).toBeTruthy();
    expect(screen.queryByText(/ADD FROM COLLECTION/)).toBeNull();
  });

  it('empty friend top10 shows the quiet note', () => {
    render(<FriendTopView entries={[]} username="riko" onOpenGame={() => {}} />);
    expect(screen.getByText(/hasn't curated a Top 10 yet/i)).toBeTruthy();
  });
});
