import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import type { PublicProfile, FriendProfile } from '@ingame/shared';
import prefsReducer from './store/prefsSlice';

// P9 — the friend/other-user Profile route (app/user/[id].tsx). Lives under src/ (NOT app/) so expo-
// router never treats it as a route (the P12/P13 lesson). Drives the shape matrix (friend/full · limited
// · 404 unavailable · loaderror) + the relationship-chip states + the report/block entry, on the REAL
// screen with the queries + router mocked.

let mockUser: { data?: unknown; isLoading: boolean; isError: boolean; error?: unknown; refetch: () => void } = {
  data: undefined,
  isLoading: true,
  isError: false,
  refetch: jest.fn(),
};
const mockPush = jest.fn();
const mockBack = jest.fn();
const mockFriendReq = jest.fn(() => ({ unwrap: () => Promise.resolve({ ok: true }) }));

jest.mock('./store/friendApi', () => ({
  useGetUserQuery: () => mockUser,
  useCreateFriendRequestMutation: () => [mockFriendReq, { isLoading: false }],
  isFriendProfile: (p: { friendsCount?: number }) => 'friendsCount' in p,
}));
jest.mock('./store/achievementsApi', () => ({ useGetUserAchievementsQuery: () => ({ data: { summary: { earned: 0 }, earned: [] } }) }));
jest.mock('./store/reportApi', () => ({ useSubmitReportMutation: () => [jest.fn(), { isLoading: false }] }));
jest.mock('./store/communityApi', () => ({ useBlockUserMutation: () => [jest.fn(), { isLoading: false }] }));
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush, back: mockBack, replace: jest.fn(), navigate: jest.fn() }),
  useLocalSearchParams: () => ({ id: 'friend-1111-1111-1111-111111111111' }),
}));

import UserProfile from '../app/user/[id]';

const FRIEND: FriendProfile = {
  id: 'friend-1111-1111-1111-111111111111',
  username: 'riko',
  avatarUrl: null,
  memberSince: '2025-01-01T00:00:00Z',
  mutualFriendsCount: 3,
  relationship: 'friend',
  staff: true,
  bio: 'Survival-horror cartographer.',
  privacy: 'friends',
  favouriteGenreIds: [],
  gamertags: [],
  friendsCount: 14,
  top10: [], // P8: absorbs the concurrent P5 server-track FriendProfile.top10 addition (keeps typecheck green)
};

const LIMITED: PublicProfile = {
  id: 'friend-1111-1111-1111-111111111111',
  username: 'vanta',
  avatarUrl: null,
  memberSince: '2024-01-01T00:00:00Z',
  mutualFriendsCount: 2,
  relationship: 'none',
};

function wrap(ui: React.ReactElement) {
  const store = configureStore({ reducer: { prefs: prefsReducer } });
  return <Provider store={store}>{ui}</Provider>;
}
function set(over: Partial<typeof mockUser>) {
  mockUser = { data: undefined, isLoading: false, isError: false, refetch: jest.fn(), ...over };
}

describe('P9 friend-profile route — the shape matrix', () => {
  beforeEach(() => {
    mockPush.mockReset();
    mockBack.mockReset();
    mockFriendReq.mockClear();
  });

  it('loading → the skeleton frame', () => {
    set({ isLoading: true });
    render(wrap(<UserProfile />));
    expect(screen.getAllByLabelText('Loading').length).toBeGreaterThan(0);
  });

  it('friend/full → identity, FRIEND tag, the counts, VIEW COLLECTION + COMPARE doors', () => {
    set({ data: FRIEND });
    render(wrap(<UserProfile />));
    expect(screen.getByText('riko')).toBeTruthy();
    expect(screen.getByText('FRIEND')).toBeTruthy(); // relationship chip
    expect(screen.getByText('STAFF')).toBeTruthy(); // generic staff badge (PROF-09)
    expect(screen.getByText('14 FRIENDS · 3 MUTUAL')).toBeTruthy();
    expect(screen.getByText('VIEW COLLECTION')).toBeTruthy();
    expect(screen.getByText('COMPARE HOURS')).toBeTruthy();
  });

  it('friend VIEW COLLECTION → the friend collection route', () => {
    set({ data: FRIEND });
    render(wrap(<UserProfile />));
    fireEvent.press(screen.getByText('VIEW COLLECTION'));
    expect(mockPush).toHaveBeenCalledWith('/user/friend-1111-1111-1111-111111111111/collection');
  });

  it('friend COMPARE → the compare route', () => {
    set({ data: FRIEND });
    render(wrap(<UserProfile />));
    fireEvent.press(screen.getByText('COMPARE HOURS'));
    expect(mockPush).toHaveBeenCalledWith('/compare/friend-1111-1111-1111-111111111111');
  });

  it('limited (non-friend) → FRIENDS ONLY lock-well + ADD FRIEND; no doors', () => {
    set({ data: LIMITED });
    render(wrap(<UserProfile />));
    expect(screen.getByText('FRIENDS ONLY')).toBeTruthy();
    expect(screen.getByText('ADD FRIEND')).toBeTruthy(); // relationship=none
    expect(screen.getByText('2 MUTUAL')).toBeTruthy();
    expect(screen.queryByText('VIEW COLLECTION')).toBeNull();
    expect(screen.queryByText('COMPARE HOURS')).toBeNull();
  });

  it('the ⋯ overflow (report/block entry) is present on the profile', () => {
    set({ data: FRIEND });
    render(wrap(<UserProfile />));
    expect(screen.getByLabelText('Profile options')).toBeTruthy();
  });

  it('404 → the terminal Unavailable (MOD-09, no retry)', () => {
    set({ isError: true, error: { status: 404 } });
    render(wrap(<UserProfile />));
    expect(screen.getByText("This profile can't be shown right now.")).toBeTruthy();
    expect(screen.queryByText('RETRY')).toBeNull();
  });

  it('a network error → the retryable LoadError', () => {
    set({ isError: true, error: { status: 'FETCH_ERROR' } });
    render(wrap(<UserProfile />));
    expect(screen.getByText('RETRY')).toBeTruthy();
  });
});
