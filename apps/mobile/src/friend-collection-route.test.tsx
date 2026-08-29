import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import type { FriendCollectionResponse } from '@ingame/shared';
import prefsReducer from './store/prefsSlice';

// P9 — the friend Collection route (app/user/[id]/collection.tsx). Under src/ (NOT app/). Asserts the
// read-only posture (COL-10/11): the browse tools are present, but NO write affordances (Add / Arrange /
// per-entry edit); an entry tap opens the SOC-11 detail.

let mockProfile: { data?: unknown } = { data: { username: 'riko', friendsCount: 14 } };
let mockCol: { data?: FriendCollectionResponse; isLoading: boolean; isError: boolean; error?: unknown; refetch: () => void } = {
  data: undefined,
  isLoading: true,
  isError: false,
  refetch: jest.fn(),
};
const mockPush = jest.fn();
const mockBack = jest.fn();

jest.mock('./store/friendApi', () => ({
  useGetUserQuery: () => mockProfile,
  useGetUserCollectionQuery: () => mockCol,
  isFriendProfile: (p: { friendsCount?: number }) => 'friendsCount' in p,
}));
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush, back: mockBack, replace: jest.fn(), navigate: jest.fn() }),
  useLocalSearchParams: () => ({ id: 'friend-1111-1111-1111-111111111111' }),
}));
jest.mock('./components/EntryCard', () => ({
  EntryCard: ({ title }: { title: string }) => {
    const { Text } = require('react-native');
    return <Text>{`CARD:${title}`}</Text>;
  },
}));

import FriendCollection from '../app/user/[id]/collection';

const CARD = { id: 'c1', imageUrl: null, thumbUrl: null, isCustom: false, isPremium: false };
const ITEM = (n: number, over: Partial<Record<string, unknown>> = {}) => ({
  entryId: `e${n}`,
  gameId: `g${n}`,
  title: `Game ${n}`,
  developer: 'Studio',
  publisher: 'Pub',
  releaseYear: 2014,
  genres: [{ id: 'gn1', name: 'Action', slug: 'action' }],
  hours: 100 + n,
  status: 'playing',
  ownedSince: '2020-01-01',
  nowPlaying: n === 1,
  card: CARD,
  ...over,
});

const FULL = {
  items: [ITEM(1), ITEM(2, { nowPlaying: false, status: 'beaten' })],
  nextCursor: null,
  total: 2,
  collectionTotal: 2,
} as unknown as FriendCollectionResponse;

function wrap(ui: React.ReactElement) {
  const store = configureStore({ reducer: { prefs: prefsReducer } });
  return <Provider store={store}>{ui}</Provider>;
}
function set(over: Partial<typeof mockCol>) {
  mockCol = { data: undefined, isLoading: false, isError: false, refetch: jest.fn(), ...over };
}

describe('P9 friend-collection route — read-only (COL-10/11)', () => {
  beforeEach(() => {
    mockPush.mockReset();
    mockBack.mockReset();
    mockProfile = { data: { username: 'riko', friendsCount: 14 } };
  });

  it('populated → the self-labelled header + the now-playing hero', () => {
    set({ data: FULL });
    render(wrap(<FriendCollection />));
    expect(screen.getByText('COLLECTION — RIKO')).toBeTruthy();
    expect(screen.getByText("RIKO'S NOW PLAYING")).toBeTruthy();
  });

  it('NO write affordances (Add / Arrange / per-entry edit) — owner-only', () => {
    set({ data: FULL });
    render(wrap(<FriendCollection />));
    expect(screen.queryByText('ARRANGE')).toBeNull();
    expect(screen.queryByText(/ADD GAME/i)).toBeNull();
    expect(screen.queryByLabelText(/^Arrange/)).toBeNull();
  });

  // walk-5 CR — filter/search PARITY with the owner Collection: the same four icon-only ToolButton
  // keycaps in the same bottom-docked bar, the trailing key being COMPARE where the owner's gold ADD
  // sits (a friend's shelf is read-only).
  it('the read-only browse tools are the owner tools-bar set (search · sort · filter · view · compare)', () => {
    set({ data: FULL });
    render(wrap(<FriendCollection />));
    expect(screen.getByTestId('friend-collection-tools-bar')).toBeTruthy();
    for (const key of ['Search', 'Sort', 'Filter', 'View']) {
      expect(screen.getByLabelText(key)).toBeTruthy();
    }
    expect(screen.getByText('COMPARE')).toBeTruthy();
    expect(screen.queryByText('ADD')).toBeNull(); // the owner's gold ADD never appears here (F-02)
  });

  it('the Search keycap MORPHS the bar into the docked SearchField + ⊗ clear (the owner beat)', () => {
    set({ data: FULL });
    render(wrap(<FriendCollection />));
    fireEvent.press(screen.getByLabelText('Search'));
    expect(screen.getByTestId('friend-collection-search-bar')).toBeTruthy();
    expect(screen.getByLabelText('Title · developer · publisher')).toBeTruthy();
    expect(screen.getByLabelText('Clear search')).toBeTruthy();
    expect(screen.queryByTestId('friend-collection-tools-bar')).toBeNull(); // the bar MORPHED, not stacked
  });

  it('search matches the owner haystack (title · developer · publisher), not title alone', () => {
    set({ data: { ...FULL, items: [ITEM(1), ITEM(2, { nowPlaying: false, developer: 'Hollow Works' })] } as unknown as FriendCollectionResponse });
    render(wrap(<FriendCollection />));
    fireEvent.press(screen.getByLabelText('Search'));
    fireEvent.changeText(screen.getByLabelText('Title · developer · publisher'), 'hollow works');
    expect(screen.getByText('RESULTS — TITLE · DEVELOPER · PUBLISHER')).toBeTruthy();
    expect(screen.getByText('GAME 2')).toBeTruthy();
    expect(screen.queryByText('GAME 1')).toBeNull();
  });

  it('a query matching nothing lands on the owner NO MATCHES beat with a Clear', () => {
    set({ data: FULL });
    render(wrap(<FriendCollection />));
    fireEvent.press(screen.getByLabelText('Search'));
    fireEvent.changeText(screen.getByLabelText('Title · developer · publisher'), 'zzzz');
    expect(screen.getByText('NO MATCHES')).toBeTruthy();
    fireEvent.press(screen.getByText('CLEAR ›')); // TertiaryLink's default trailing-chevron grammar
    // cleared → the shelf is back, and the now-playing hero un-yields (so GAME 1 appears twice)
    expect(screen.getAllByText('GAME 1').length).toBeGreaterThanOrEqual(1);
    expect(screen.queryByText('NO MATCHES')).toBeNull();
  });

  it('an entry tap → the adaptive Game page in FRIEND posture (?via — the SOC-11 content)', () => {
    set({ data: FULL });
    render(wrap(<FriendCollection />));
    // Game 1 is both the now-playing hero and a shelf row (same label, same route) — press the first.
    // W-D1 — the friend-entry route retired; the row opens /game/[id]?via=<friend> (FRIEND posture).
    fireEvent.press(screen.getAllByLabelText('Open Game 1')[0]);
    expect(mockPush).toHaveBeenCalledWith('/game/g1?via=friend-1111-1111-1111-111111111111');
  });

  it('the friend TOP view is LIVE (P10 · COL-13) — read-only curated Top-10, no ARRANGE', () => {
    // the friend's inline top10 rides the friend/full profile read (P5 live).
    mockProfile = { data: { username: 'riko', friendsCount: 14, top10: [{ rank: 1, gameId: 'g1', title: 'Game 1', card: { imageUrl: null } }] } };
    set({ data: FULL });
    render(wrap(<FriendCollection />));
    // cycle the view keycap shelf → grid → list → top (the owner ToolButton grammar — the keycap wears
    // the current mode's glyph, its accessibility name is just "View")
    const viewChip = () => screen.getByLabelText('View');
    fireEvent.press(viewChip());
    fireEvent.press(viewChip());
    fireEvent.press(viewChip());
    expect(screen.getByText(/READ-ONLY · RIKO'S CURATED TOP 10/i)).toBeTruthy();
    // the stale EXPECTED placeholder is gone; no ARRANGE affordance on a friend's TOP
    expect(screen.queryByText(/Top 10 arrives with the profile read/)).toBeNull();
    expect(screen.queryByLabelText('Add to Top 10')).toBeNull();
  });

  it('404 → the terminal Unavailable', () => {
    set({ isError: true, error: { status: 404 } });
    render(wrap(<FriendCollection />));
    expect(screen.getByText("This collection isn't available.")).toBeTruthy();
  });
});
