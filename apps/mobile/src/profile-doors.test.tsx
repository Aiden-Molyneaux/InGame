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

// walk2 B14 — the favourite hero enriches from the collection cache; controllable per-test.
let mockCollection: { data?: { items: unknown[] } } = { data: { items: [] } };

jest.mock('./store/api', () => ({
  useGetMeQuery: () => mockMe,
  useGetCollectionQuery: () => mockCollection,
  useGetDeviceQuery: () => ({ data: undefined }),
  useGetWalletQuery: () => ({ data: { balance: 0 } }),
  useGetGenresQuery: () => ({ data: { items: [] } }),
}));
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush, replace: jest.fn(), navigate: jest.fn() }),
}));
jest.mock('./store/achievementsApi', () => ({ useGetMyAchievementsQuery: () => ({ data: undefined }) }));
jest.mock('./store/profileApi', () => ({
  usePatchMeMutation: () => [jest.fn(() => ({ unwrap: () => Promise.resolve({}) })), {}],
  useAddGamertagMutation: () => [jest.fn(() => ({ unwrap: () => Promise.resolve({}) })), {}],
  useRemoveGamertagMutation: () => [jest.fn(() => ({ unwrap: () => Promise.resolve({}) })), {}],
}));
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

const ME = (top10: unknown[], over: Record<string, unknown> = {}) => ({
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
  cardsPublished: 0,
  ...over,
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
  mockCollection = { data: { items: [] } };
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

describe('walk2 B11/B14: Settings gear keycap + the favourite hero', () => {
  const FAV = { gameId: 'g-fav', title: 'Elden Ring', hours: 120, card: CARD };
  const FAV_ENTRY = {
    entryId: 'e-fav',
    gameId: 'g-fav',
    title: 'Elden Ring',
    hours: 134,
    status: 'playing',
    developer: 'FromSoftware',
    releaseYear: 2022,
    genres: [{ id: 'rpg', name: 'RPG' }],
    card: CARD,
  };

  it('B11 — the Settings gear rides the cream ToolButton keycap (0069 secondary voice)', () => {
    mockMe = { data: ME([]), isLoading: false, isError: false, refetch: jest.fn() };
    renderProfile();
    const gear = screen.getByLabelText('Settings');
    const flat: Record<string, unknown> = Object.assign(
      {},
      ...[gear.props.style ?? {}].flat(Infinity).filter(Boolean),
    );
    expect(flat.backgroundColor).toBe('#f5f1e4'); // brand.cream — the keycap face, not a bare glyph
    fireEvent.press(gear);
    expect(mockPush).toHaveBeenCalledWith('/settings');
  });

  it('B14 — the favourite hero renders the 0061 stat-line + catalog line from the collection entry', () => {
    mockMe = { data: ME([], { favouriteGame: FAV }), isLoading: false, isError: false, refetch: jest.fn() };
    mockCollection = { data: { items: [FAV_ENTRY] } };
    renderProfile();
    expect(screen.getByText('134 HRS · PLAYING')).toBeTruthy(); // stat-line (entry hours + status)
    expect(screen.getByText('ELDEN RING')).toBeTruthy(); // display-size hero title
    expect(screen.getByText('FROMSOFTWARE · 2022 · RPG')).toBeTruthy(); // catalog line
  });

  it('B14 — an off-shelf pin degrades to the hours line alone (no catalog line)', () => {
    mockMe = { data: ME([], { favouriteGame: FAV }), isLoading: false, isError: false, refetch: jest.fn() };
    mockCollection = { data: { items: [] } };
    renderProfile();
    expect(screen.getByText('120 HRS')).toBeTruthy(); // the /me hours, no status to speak
    expect(screen.queryByText(/FROMSOFTWARE/)).toBeNull();
  });
});

describe('walk2 C4/C6: Profile EDIT mode + MY CONTRIBUTIONS door', () => {
  it('C6 — MY CONTRIBUTIONS routes to the caller\'s own contributor screen', () => {
    mockMe = { data: ME([]), isLoading: false, isError: false, refetch: jest.fn() };
    renderProfile();
    fireEvent.press(screen.getByLabelText('View your contributions'));
    expect(mockPush).toHaveBeenCalledWith('/contributor/me-0000-0000-0000-000000000000');
  });

  it('C6 — the teaser shows the PUBLISHED count, NOT stats.cardsDesigned (owner ruling 2026-07-19)', () => {
    // finished designs (stats.cardsDesigned) = 18; published contributions = 5 — the teaser shows 5, so
    // tapping it lands on the SAME number the contributor screen counts.
    mockMe = {
      data: ME([], {
        cardsPublished: 5,
        stats: { games: 17, hours: 300, completionPct: 40, cardsDesigned: 18, adoptionsReceived: 0, friends: 3 },
      }),
      isLoading: false,
      isError: false,
      refetch: jest.fn(),
    };
    renderProfile();
    expect(screen.getByText('5 CARDS DESIGNED')).toBeTruthy(); // the published count
    expect(screen.queryByText('18 CARDS DESIGNED')).toBeNull(); // NOT the finished-designs stat
  });

  it('C4 — the EDIT keycap toggles the in-place identity editor (OQ-034)', () => {
    mockMe = { data: ME([]), isLoading: false, isError: false, refetch: jest.fn() };
    renderProfile();
    // not editing → the read-only identity (no username field)
    expect(screen.queryByLabelText('Username')).toBeNull();
    fireEvent.press(screen.getByLabelText('Edit profile'));
    // editing → the EditableIdentity (username/bio fields present)
    expect(screen.getByLabelText('Username')).toBeTruthy();
    expect(screen.getByLabelText('Bio')).toBeTruthy();
    // tap again to exit (the OQ-034 toggle)
    fireEvent.press(screen.getByLabelText('Done editing'));
    expect(screen.queryByLabelText('Username')).toBeNull();
  });
});

describe('N-A5 — Achievements/Contributions teaser labels sit on the F-06 scale', () => {
  const F06 = [21, 15, 11, 9]; // F-06 law — the ONLY legal on-screen sizes
  it('the EARNED + CARDS DESIGNED labels are 11 (stepped down one rung from 15)', () => {
    mockMe = { data: ME([]), isLoading: false, isError: false, refetch: jest.fn() };
    renderProfile();
    for (const label of ['0 EARNED', '0 CARDS DESIGNED']) {
      const node = screen.getByText(label);
      const flat: Record<string, unknown> = Object.assign(
        {},
        ...[node.props.style ?? {}].flat(Infinity).filter(Boolean),
      );
      expect(flat.fontSize).toBe(11); // title (15) → body (11)
      expect(F06).toContain(flat.fontSize as number);
    }
  });
});
