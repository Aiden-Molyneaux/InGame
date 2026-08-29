import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import type { CompareLeaderboardRow, PersonSummary } from '@ingame/shared';
import prefsReducer from './store/prefsSlice';

// walk-5 owner CR — "The Rankings" RELOCATION. The whole-circle ladder ranks the owner against ALL
// friends, so it left the two-person Compare screen for the FRIENDS surface. Two candidate forms are
// built for the owner to pick on device; this suite pins the wired-in DEFAULT (the door-row) and the
// dedicated page it opens. (The compare screen's side of the move is pinned in compare-route.test.tsx.)
// Route tests live under src/ (never app/) so expo-router doesn't try to route them.

const ROWS: CompareLeaderboardRow[] = [
  { rank: 1, user: { userId: 'u-riko', username: 'riko', avatarUrl: null, avatarConfig: null }, hours: 1800, games: 52, isMe: false },
  { rank: 2, user: { userId: 'u-me', username: 'maverick', avatarUrl: null, avatarConfig: null }, hours: 1240, games: 48, isMe: true },
  { rank: 3, user: { userId: 'u-zoe', username: 'zoe', avatarUrl: null, avatarConfig: null }, hours: 410, games: 19, isMe: false },
];

const friend = (userId: string, username: string): PersonSummary => ({
  userId,
  username,
  avatarUrl: null,
  avatarConfig: null,
  relationship: 'friend',
});

let mockFriends: { data?: { friends: PersonSummary[] }; isLoading: boolean; isError: boolean; refetch: () => void } = {
  data: { friends: [friend('u-riko', 'riko'), friend('u-zoe', 'zoe')] },
  isLoading: false,
  isError: false,
  refetch: jest.fn(),
};
let mockCompare: { data?: { leaderboard?: CompareLeaderboardRow[] }; isFetching: boolean; isError: boolean; refetch: () => void } = {
  data: { leaderboard: ROWS },
  isFetching: false,
  isError: false,
  refetch: jest.fn(),
};
const mockPush = jest.fn();

jest.mock('./store/friendApi', () => ({
  useGetFriendsQuery: () => mockFriends,
  useGetFriendRequestsQuery: () => ({ data: undefined }),
}));
jest.mock('./store/compareApi', () => ({ useGetCompareQuery: () => mockCompare }));
jest.mock('./store/feedApi', () => ({
  useGetFeedQuery: () => ({ data: undefined, isFetching: false, isError: false, refetch: jest.fn() }),
  useLazyGetFeedQuery: () => [jest.fn(), { isFetching: false, isError: false }],
  mergeFeedPages: () => [],
}));
jest.mock('./store/achievementsApi', () => ({ useGetAchievementDefsQuery: () => ({ data: undefined }) }));
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush, back: jest.fn(), replace: jest.fn(), navigate: jest.fn() }),
  useLocalSearchParams: () => ({}),
}));

import Friends from '../app/(tabs)/friends';
import FriendsRankings from '../app/friends-rankings';

const wrap = (ui: React.ReactElement) => (
  <Provider store={configureStore({ reducer: { prefs: prefsReducer } })}>{ui}</Provider>
);

describe('walk-5 — The Rankings lands on the FRIENDS tab', () => {
  beforeEach(() => {
    mockPush.mockReset();
    mockFriends = { data: { friends: [friend('u-riko', 'riko'), friend('u-zoe', 'zoe')] }, isLoading: false, isError: false, refetch: jest.fn() };
    mockCompare = { data: { leaderboard: ROWS }, isFetching: false, isError: false, refetch: jest.fn() };
  });

  it('the DOOR-ROW is the wired-in default (RANKINGS_INLINE=false) — no inline ladder on the tab', () => {
    render(wrap(<Friends />));
    expect(screen.getByTestId('rankings-door-row')).toBeTruthy();
    expect(screen.queryByTestId('rankings-board')).toBeNull();
  });

  it('the door-row states YOUR standing and opens the dedicated rankings page', () => {
    render(wrap(<Friends />));
    expect(screen.getByText("YOU'RE #2 OF 3 · 1,240 HRS")).toBeTruthy();
    fireEvent.press(screen.getByTestId('rankings-door-row'));
    expect(mockPush).toHaveBeenCalledWith('/friends-rankings');
  });

  it('no ladder rows → no rankings affordance at all (a 1-person circle ranks nothing)', () => {
    mockCompare = { data: { leaderboard: [] }, isFetching: false, isError: false, refetch: jest.fn() };
    render(wrap(<Friends />));
    expect(screen.queryByTestId('rankings-door-row')).toBeNull();
    expect(screen.queryByTestId('rankings-board')).toBeNull();
  });
});

describe('walk-5 — the rankings page (the door-row destination)', () => {
  beforeEach(() => {
    mockPush.mockReset();
    mockFriends = { data: { friends: [friend('u-riko', 'riko'), friend('u-zoe', 'zoe')] }, isLoading: false, isError: false, refetch: jest.fn() };
    mockCompare = { data: { leaderboard: ROWS }, isFetching: false, isError: false, refetch: jest.fn() };
  });

  it('renders the ladder with your row lit', () => {
    render(wrap(<FriendsRankings />));
    expect(screen.getByTestId('rankings-board')).toBeTruthy();
    expect(screen.getByText('@riko')).toBeTruthy();
    expect(screen.getByText(' YOU')).toBeTruthy();
  });

  // walk-5 CR 2 — the GAMES/HOURS control must AFFORD itself. It is the catalog `SectionSwitch`
  // (accessibilityRole="tab", accent border + StateMark), not the old tappable caption.
  it('the metric control is a SectionSwitch and flips the value axis', () => {
    render(wrap(<FriendsRankings />));
    const tabs = screen.getAllByRole('tab');
    expect(tabs).toHaveLength(2); // GAMES · HOURS
    expect(screen.getAllByText('HRS')).toHaveLength(ROWS.length); // opens on HOURS
    fireEvent.press(tabs[0]!); // GAMES
    expect(screen.queryAllByText('HRS')).toHaveLength(0);
  });

  it('an empty circle → the invite-forward empty state, not a blank ladder', () => {
    mockFriends = { data: { friends: [] }, isLoading: false, isError: false, refetch: jest.fn() };
    mockCompare = { data: undefined, isFetching: false, isError: false, refetch: jest.fn() };
    render(wrap(<FriendsRankings />));
    expect(screen.getByText('NO RANKINGS YET')).toBeTruthy(); // EmptyState uppercases its title
    expect(screen.queryByTestId('rankings-board')).toBeNull();
  });
});
