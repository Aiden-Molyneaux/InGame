import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import type { CompareResponse } from '@ingame/shared';
import prefsReducer from './store/prefsSlice';

// P9 — the Compare route (app/compare/[friendId].tsx). Under src/ (NOT app/) so expo-router ignores it.
// Drives the SOC-03 postures: has-overlap · no-shared-games · hours-hidden omission · NOT_FRIENDS · 404.

let mockCompare: { data?: CompareResponse; isLoading: boolean; isError: boolean; error?: unknown; refetch: () => void } = {
  data: undefined,
  isLoading: true,
  isError: false,
  refetch: jest.fn(),
};
const mockPush = jest.fn();
const mockBack = jest.fn();

jest.mock('./store/compareApi', () => ({ useGetCompareQuery: () => mockCompare }));
jest.mock('./store/api', () => ({ useGetMeQuery: () => ({ data: { username: 'maverick', avatarUrl: null } }) }));
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush, back: mockBack, replace: jest.fn(), navigate: jest.fn() }),
  useLocalSearchParams: () => ({ friendId: 'friend-1111-1111-1111-111111111111' }),
}));
// Stub EntryCard — skip the skia render; this suite tests the compare state logic.
jest.mock('./components/EntryCard', () => ({
  EntryCard: ({ title }: { title: string }) => {
    const { Text } = require('react-native');
    return <Text>{`CARD:${title}`}</Text>;
  },
}));

import Compare from '../app/compare/[friendId]';

const FRIEND = { userId: 'friend-1111-1111-1111-111111111111', username: 'riko', avatarUrl: null, avatarConfig: null };
const CARD = { id: 'c1', imageUrl: null, thumbUrl: null, isCustom: false, isPremium: false };

const FULL: CompareResponse = {
  friend: FRIEND,
  totals: { yourHours: 1240, theirHours: 1180, yourGames: 48, theirGames: 41, leader: 'you' },
  games: [
    { gameId: 'g1', title: 'Destiny 2', yourCard: CARD, theirCard: CARD, yourHours: 210, theirHours: 184, leader: 'you' },
  ],
  leaderboard: [
    { rank: 1, user: { userId: 'me', username: 'maverick', avatarUrl: null, avatarConfig: null }, hours: 1240, games: 48, isMe: true },
    { rank: 2, user: FRIEND, hours: 1180, games: 41, isMe: false },
  ],
};

const NO_OVERLAP: CompareResponse = {
  friend: { ...FRIEND, username: 'sable' },
  totals: { yourHours: 1240, theirHours: 410, yourGames: 48, theirGames: 19, leader: 'you' },
  games: [],
  leaderboard: FULL.leaderboard,
};

// Hours hidden (PROF-03): theirHours + leader + leaderboard omitted; games still carried but the matchups
// render as a lock-well (board P5).
const HOURS_HIDDEN: CompareResponse = {
  friend: { ...FRIEND, username: 'vanta' },
  totals: { yourHours: 1240, yourGames: 48, theirGames: 52 },
  games: [{ gameId: 'g1', title: 'Destiny 2', yourCard: CARD, theirCard: CARD, yourHours: 210, leader: 'tie' }],
};

function wrap(ui: React.ReactElement) {
  const store = configureStore({ reducer: { prefs: prefsReducer } });
  return <Provider store={store}>{ui}</Provider>;
}
function set(over: Partial<typeof mockCompare>) {
  mockCompare = { data: undefined, isLoading: false, isError: false, refetch: jest.fn(), ...over };
}

describe('P9 Compare route — the SOC-03 postures', () => {
  beforeEach(() => {
    mockPush.mockReset();
    mockBack.mockReset();
  });

  it('P1 has-overlap → the face-off verdict + the matchups (two people only)', () => {
    set({ data: FULL });
    render(wrap(<Compare />));
    expect(screen.getByText('YOU LEAD · +60 HRS')).toBeTruthy(); // 1240 vs 1180
    expect(screen.getByText('THE MATCHUPS · 1 SHARED')).toBeTruthy();
    // the FaceOff still names your side of the duel
    expect(screen.getAllByText('YOU').length).toBeGreaterThanOrEqual(1);
  });

  // walk-5 owner CR — "The Rankings" ranks you against ALL friends, so it left this screen for the
  // FRIENDS tab (door-row → /friends-rankings). Compare keeps the two-person comparison ONLY: the
  // payload still carries `leaderboard`, and this screen must not draw it.
  it('the whole-circle RANKINGS is GONE from compare, even when the payload carries a leaderboard', () => {
    set({ data: FULL });
    render(wrap(<Compare />));
    expect(screen.queryByText('THE RANKINGS')).toBeNull();
    expect(screen.queryByText('@riko')).toBeNull(); // the leaderboard's row identity, not rendered here
  });

  it('a card tap → their card opens the game page in FRIEND posture (?via), yours the OWN game page', () => {
    set({ data: FULL });
    render(wrap(<Compare />));
    // W-D1 — the friend-entry route retired; their card opens /game/[id]?via=<friend> (FRIEND posture).
    fireEvent.press(screen.getByLabelText('Open Destiny 2 — their card'));
    expect(mockPush).toHaveBeenCalledWith('/game/g1?via=friend-1111-1111-1111-111111111111');
    fireEvent.press(screen.getByLabelText('Open Destiny 2 — your card'));
    expect(mockPush).toHaveBeenCalledWith('/game/g1');
  });

  it('P2 no-shared-games → the totals still settle + the browse doorway', () => {
    set({ data: NO_OVERLAP });
    render(wrap(<Compare />));
    expect(screen.getByText('No shared games')).toBeTruthy();
    expect(screen.getByText("BROWSE SABLE'S COLLECTION")).toBeTruthy(); // ScreenButton uppercases
    // the face-off still rendered above
    expect(screen.getByText('YOU LEAD · +830 HRS')).toBeTruthy();
  });

  it('P5 hours-hidden → HOURS PRIVATE verdict + the matchups lock-well + no rankings', () => {
    set({ data: HOURS_HIDDEN });
    render(wrap(<Compare />));
    expect(screen.getByText('HOURS PRIVATE')).toBeTruthy();
    expect(screen.getByText('VANTA KEEPS HOURS PRIVATE')).toBeTruthy();
  });

  it('409 NOT_FRIENDS → the calm friends-only state (distinct from the 404)', () => {
    set({ isError: true, error: { status: 409, data: { error: { code: 'NOT_FRIENDS' } } } });
    render(wrap(<Compare />));
    expect(screen.getByText('FRIENDS ONLY')).toBeTruthy();
    expect(screen.queryByText('RETRY')).toBeNull();
  });

  it('404 → the terminal Unavailable (MOD-09)', () => {
    set({ isError: true, error: { status: 404 } });
    render(wrap(<Compare />));
    expect(screen.getByText("This comparison isn't available.")).toBeTruthy();
  });

  it('a network error → the retryable LoadError', () => {
    set({ isError: true, error: { status: 'FETCH_ERROR' } });
    render(wrap(<Compare />));
    expect(screen.getByText('RETRY')).toBeTruthy();
  });
});
