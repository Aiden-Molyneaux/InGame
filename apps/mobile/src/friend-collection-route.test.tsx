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

  it('the read-only browse tools are present (sort · filter · view · compare)', () => {
    set({ data: FULL });
    render(wrap(<FriendCollection />));
    expect(screen.getByLabelText('Sort direction')).toBeTruthy();
    expect(screen.getByLabelText('Filter')).toBeTruthy();
    expect(screen.getByText('COMPARE')).toBeTruthy();
  });

  it('an entry tap → the SOC-11 entry detail', () => {
    set({ data: FULL });
    render(wrap(<FriendCollection />));
    // Game 1 is both the now-playing hero and a shelf row (same label, same route) — press the first.
    fireEvent.press(screen.getAllByLabelText('Open Game 1')[0]);
    expect(mockPush).toHaveBeenCalledWith('/user/friend-1111-1111-1111-111111111111/entry/g1');
  });

  it('the friend TOP view is LIVE (P10 · COL-13) — read-only curated Top-10, no ARRANGE', () => {
    // the friend's inline top10 rides the friend/full profile read (P5 live).
    mockProfile = { data: { username: 'riko', friendsCount: 14, top10: [{ rank: 1, gameId: 'g1', title: 'Game 1', card: { imageUrl: null } }] } };
    set({ data: FULL });
    render(wrap(<FriendCollection />));
    // cycle the view keycap shelf → grid → list → top
    const viewChip = () => screen.getByLabelText(/^View:/);
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
