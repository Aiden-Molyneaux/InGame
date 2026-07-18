import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import prefsReducer from './store/prefsSlice';

// P10 — the Profile three doors (decision 0050): the Top-3 set-pieces read from me.top10 (not the
// hours-derived placeholder); a Top-3 tap opens the Collection TOP view FOCUSED on that game; VIEW TOP 10
// opens the TOP view. Route test under src/ (never app/).

const CARD = { imageUrl: null, thumbUrl: null };
const TOP = (rank: number) => ({ rank, gameId: `g${rank}`, title: `Top ${rank}`, card: CARD });

let mockMe: { data?: unknown; isLoading: boolean; isError: boolean; refetch: () => void } = {
  data: undefined,
  isLoading: false,
  isError: false,
  refetch: jest.fn(),
};
const mockPush = jest.fn();

jest.mock('./store/api', () => ({
  useGetMeQuery: () => mockMe,
  useGetDeviceQuery: () => ({ data: undefined }),
  useGetWalletQuery: () => ({ data: { balance: 0 } }),
}));
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush, replace: jest.fn(), navigate: jest.fn() }),
}));
jest.mock('./store/achievementsApi', () => ({ useGetMyAchievementsQuery: () => ({ data: undefined }) }));
jest.mock('./store', () => ({ logoutTeardown: jest.fn() }));
jest.mock('./components/EntryCard', () => ({
  EntryCard: ({ title }: { title: string }) => {
    const { Text } = require('react-native');
    return <Text>{`CARD:${title}`}</Text>;
  },
}));
jest.mock('./components/MiniDevice', () => ({
  MiniDevice: () => {
    const { View } = require('react-native');
    return <View />;
  },
}));

import Profile from '../app/(tabs)/profile';

const ME = (top10: unknown[]) => ({
  id: 'me-0000-0000-0000-000000000000',
  username: 'demo',
  avatarUrl: null,
  bio: '',
  memberSince: '2025-01-01T00:00:00.000Z',
  privacy: 'friends',
  role: 'user',
  adminTier: null,
  usernamePending: false,
  emailVerified: true,
  favouriteGameId: null,
  favouriteGenreIds: [],
  gamertags: [],
  usernameNextChangeAt: null,
  stats: { games: 17, hours: 300, completionPct: 40, cardsDesigned: 0, adoptionsReceived: 0, friends: 3 },
  favouriteGame: null,
  nowPlaying: null,
  top10,
});

function renderProfile() {
  const store = configureStore({ reducer: { prefs: prefsReducer } });
  return render(
    <Provider store={store}>
      <Profile />
    </Provider>,
  );
}

beforeEach(() => {
  mockPush.mockClear();
});

describe('PROF-05 / COL-13: Profile Top-3 doors', () => {
  it('renders the Top-3 set-pieces from me.top10', () => {
    mockMe = { data: ME([TOP(1), TOP(2), TOP(3), TOP(4)]), isLoading: false, isError: false, refetch: jest.fn() };
    renderProfile();
    expect(screen.getByText('CARD:Top 1')).toBeTruthy();
    expect(screen.getByText('CARD:Top 2')).toBeTruthy();
    expect(screen.getByText('CARD:Top 3')).toBeTruthy();
    // only the top 3 ranks are teased (not rank 4)
    expect(screen.queryByText('CARD:Top 4')).toBeNull();
  });

  it('a Top-3 card tap opens the Collection TOP view FOCUSED on that game', () => {
    mockMe = { data: ME([TOP(1), TOP(2), TOP(3)]), isLoading: false, isError: false, refetch: jest.fn() };
    renderProfile();
    fireEvent.press(screen.getByLabelText('Open Top 2 in your Top 10'));
    expect(mockPush).toHaveBeenCalledWith({ pathname: '/(tabs)/collection', params: { focus: 'g2' } });
  });

  it('VIEW TOP 10 opens the Collection TOP view', () => {
    mockMe = { data: ME([TOP(1)]), isLoading: false, isError: false, refetch: jest.fn() };
    renderProfile();
    fireEvent.press(screen.getByText(/VIEW TOP 10/i));
    expect(mockPush).toHaveBeenCalledWith('/(tabs)/collection');
  });

  it('empty top10 shows the 3 ghost seats + the board hint, not a hours-derived fallback', () => {
    mockMe = { data: ME([]), isLoading: false, isError: false, refetch: jest.fn() };
    renderProfile();
    // walk2 A6 — the board's always-3-seat frame: three dashed ghost seats + the hint (profile-states :797)
    expect(screen.getByLabelText('Seat 1 empty — rank your top 10')).toBeTruthy();
    expect(screen.getByLabelText('Seat 3 empty — rank your top 10')).toBeTruthy();
    expect(screen.getByText(/Rank your Top 10 — the best 3 show here/i)).toBeTruthy();
  });

  it('walk2 A6: a 2-item Top-3 packs LEFT (flex-start), seat 3 a ghost — never edge-spread', () => {
    mockMe = { data: ME([TOP(1), TOP(2)]), isLoading: false, isError: false, refetch: jest.fn() };
    renderProfile();
    // seat 3 renders as the ghost (the always-3 frame), so nothing spreads to the far edge
    expect(screen.getByLabelText('Seat 3 empty — rank your top 10')).toBeTruthy();
    // the container packs left: flex-start, not the space-between that spread 2 seats to the edges.
    // Walk up from a seat to the first row container that declares justifyContent (the top3 View —
    // Pressable interposes host views, so .parent alone isn't it).
    type Node = { parent: Node | null; props?: { style?: unknown } };
    let p = (screen.getByLabelText('Open Top 1 in your Top 10') as unknown as Node).parent;
    let flat: Record<string, unknown> = {};
    while (p) {
      flat = Object.assign({}, ...[p.props?.style ?? {}].flat(Infinity).filter(Boolean));
      if (flat.flexDirection === 'row' && flat.justifyContent !== undefined) break;
      p = p.parent;
    }
    expect(flat.justifyContent).toBe('flex-start');
    expect(flat.flexDirection).toBe('row');
  });
});
