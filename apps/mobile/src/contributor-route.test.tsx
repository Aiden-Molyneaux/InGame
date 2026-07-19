import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import type { ContributionsResponse } from '@ingame/shared';
import prefsReducer from './store/prefsSlice';

// P13 — the contributor-profile route (app/contributor/[id].tsx). Lives under src/ (NOT app/) so
// expo-router never treats it as a route (a test file under app/ breaks the router bundle — the
// device-route.test.tsx precedent). Drives the state matrix (P1/P2/P2b/P3b/P4 + VIEW ALL + 404) on the
// REAL screen with the data query + `/me` + the router mocked. The lifecycle KIT states are already
// tested by the kit — this asserts the screen ROUTES into the right one, not the kit internals.

let mockContrib: {
  data?: ContributionsResponse;
  isLoading: boolean;
  isError: boolean;
  error?: unknown;
  refetch: () => void;
} = { data: undefined, isLoading: true, isError: false, refetch: jest.fn() };

let mockMeId = 'me-0000-0000-0000-000000000000';
let mockParamId = 'other-1111-1111-1111-111111111111';
const mockPush = jest.fn();
const mockBack = jest.fn();

jest.mock('./store/contributorApi', () => ({ useGetContributionsQuery: () => mockContrib }));
jest.mock('./store/api', () => ({ useGetMeQuery: () => ({ data: { id: mockMeId } }) }));
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush, back: mockBack, replace: jest.fn(), navigate: jest.fn() }),
  useLocalSearchParams: () => ({ id: mockParamId }),
}));
// Stub EntryCard — skip the CardFace/skia render; this suite tests the screen's state logic, not the
// card face (EntryCard has its own test).
jest.mock('./components/EntryCard', () => ({
  EntryCard: ({ title }: { title: string }) => {
    const { Text } = require('react-native');
    return <Text>{`CARD:${title}`}</Text>;
  },
}));

import ContributorProfile from '../app/contributor/[id]';

const OTHER = 'other-1111-1111-1111-111111111111';
const CARD = (n: number) => ({
  cardId: `card-${n}`,
  gameId: `game-${n}`,
  gameTitle: `Game ${n}`,
  adoptionCount: 100 + n,
  card: { id: `card-${n}`, name: `Card ${n}`, imageUrl: `/m/${n}.png`, thumbUrl: null, isPremium: false },
});

const FULL: ContributionsResponse = {
  user: { id: OTHER, username: 'riko', avatarUrl: null, memberSince: '2025-01-01T00:00:00Z' },
  stats: { gamesAdded: 7, cardsDesigned: 7, totalAdoptions: 586, totalReached: 3200 },
  standing: null,
  signatureCard: CARD(1),
  topCards: [CARD(1), CARD(2), CARD(3)],
  topGames: [
    { gameId: 'g1', title: 'Hollow Knight', collectionsCount: 1240 },
    { gameId: 'g2', title: 'Hades', collectionsCount: 980 },
  ],
};

const EMPTY: ContributionsResponse = {
  user: { id: OTHER, username: 'vesper', avatarUrl: null, memberSince: '2025-01-01T00:00:00Z' },
  stats: { gamesAdded: 0, cardsDesigned: 0, totalAdoptions: 0, totalReached: 0 },
  standing: null,
  signatureCard: null,
  topCards: [],
  topGames: [],
};

const PARTIAL: ContributionsResponse = {
  user: { id: OTHER, username: 'nova', avatarUrl: null, memberSince: '2025-01-01T00:00:00Z' },
  stats: { gamesAdded: 3, cardsDesigned: 0, totalAdoptions: 0, totalReached: 540 },
  standing: null,
  signatureCard: null,
  topCards: [],
  topGames: [{ gameId: 'g1', title: 'Hollow Knight', collectionsCount: 280 }],
};

// Non-friend/limited — the set-piece lists OMITTED (undefined) is the discriminator (PROF-03).
const LIMITED: ContributionsResponse = {
  user: { id: OTHER, username: 'vanta', avatarUrl: null, memberSince: '2023-01-01T00:00:00Z' },
  stats: { gamesAdded: 8, cardsDesigned: 4, totalAdoptions: 612, totalReached: 5140 },
  standing: null,
};

function wrap(ui: React.ReactElement) {
  const store = configureStore({ reducer: { prefs: prefsReducer } });
  return <Provider store={store}>{ui}</Provider>;
}

function set(over: Partial<typeof mockContrib>, opts?: { paramId?: string; meId?: string }) {
  mockContrib = { data: undefined, isLoading: false, isError: false, refetch: jest.fn(), ...over };
  if (opts?.paramId) mockParamId = opts.paramId;
  if (opts?.meId) mockMeId = opts.meId;
}

describe('P13 contributor-profile route — the state matrix', () => {
  beforeEach(() => {
    mockPush.mockReset();
    mockBack.mockReset();
    mockParamId = OTHER;
    mockMeId = 'me-0000-0000-0000-000000000000';
  });

  it('L1 — loading renders the skeleton frame', () => {
    set({ isLoading: true });
    render(wrap(<ContributorProfile />));
    expect(screen.getAllByLabelText('Loading').length).toBeGreaterThan(0);
    expect(screen.getByText('CONTRIBUTIONS')).toBeTruthy();
  });

  it('P1/P3 — a populated (friend) view: stats, signature hero, cards + games sections', () => {
    set({ data: FULL });
    render(wrap(<ContributorProfile />));
    expect(screen.getByText('MOST ADOPTED')).toBeTruthy();
    expect(screen.getByText('586')).toBeTruthy(); // totalAdoptions
    expect(screen.getByText('3,200')).toBeTruthy(); // totalReached, localized
    expect(screen.getByText('CARDS DESIGNED')).toBeTruthy();
    expect(screen.getByText('GAMES ADDED')).toBeTruthy();
    expect(screen.getByText('HOLLOW KNIGHT')).toBeTruthy();
    // friend view = no self create-hooks
    expect(screen.queryByText('DESIGN A CARD')).toBeNull();
  });

  it('P2 — self · empty: the gold ADD-A-GAME / DESIGN-A-CARD cold-start hook', () => {
    set({ data: EMPTY }, { paramId: OTHER, meId: OTHER }); // isSelf
    render(wrap(<ContributorProfile />));
    expect(screen.getByText('NOTHING HERE YET')).toBeTruthy();
    expect(screen.getByText('ADD A GAME')).toBeTruthy();
    expect(screen.getByText('DESIGN A CARD')).toBeTruthy();
  });

  it('P2b — self · partial (games, no cards): the gold DESIGN-A-CARD section nudge + games rows', () => {
    set({ data: PARTIAL }, { paramId: OTHER, meId: OTHER }); // isSelf
    render(wrap(<ContributorProfile />));
    expect(screen.getByText('NO CARDS YET')).toBeTruthy();
    expect(screen.getByText('DESIGN A CARD')).toBeTruthy(); // the SectionEmpty gold door
    expect(screen.getByText('HOLLOW KNIGHT')).toBeTruthy(); // games populated
  });

  it('P3b — friend · empty: a quiet message, NO create hooks', () => {
    set({ data: EMPTY }); // not self (paramId OTHER, meId me)
    render(wrap(<ContributorProfile />));
    expect(screen.getByText('NOTHING HERE YET')).toBeTruthy();
    expect(screen.queryByText('ADD A GAME')).toBeNull();
    expect(screen.queryByText('DESIGN A CARD')).toBeNull();
  });

  it('P4 — privacy-limited: stats persist, the detail locks behind ADD FRIEND', () => {
    set({ data: LIMITED });
    render(wrap(<ContributorProfile />));
    expect(screen.getByText('FRIENDS-ONLY DETAIL')).toBeTruthy();
    expect(screen.getByText('ADD FRIEND')).toBeTruthy();
    expect(screen.getByText('612')).toBeTruthy(); // stats still shown
    // no set-piece sections leak
    expect(screen.queryByText('CARDS DESIGNED')).toBeNull();
    expect(screen.queryByText('SIGNATURE CARD')).toBeNull();
  });

  it('MOD-09 — a 404 collapses to the terminal Unavailable (no retry)', () => {
    set({ isError: true, error: { status: 404 } });
    render(wrap(<ContributorProfile />));
    expect(screen.getByText("This contributor isn't available.")).toBeTruthy();
    expect(screen.queryByText('RETRY')).toBeNull();
  });

  it('L2 — a network error renders the retryable LoadError', () => {
    set({ isError: true, error: { status: 'FETCH_ERROR' } });
    render(wrap(<ContributorProfile />));
    expect(screen.getByText('RETRY')).toBeTruthy();
  });

  it('VIEW ALL — the CARDS DESIGNED / GAMES ADDED view-all pushes the dedicated full-list routes (W-1)', () => {
    set({ data: FULL });
    render(wrap(<ContributorProfile />));
    // two VIEW ALL links (cards + games) — they now navigate to the dedicated cursor-paginated routes.
    const viewAll = screen.getAllByText('VIEW ALL ›');
    fireEvent.press(viewAll[0]); // CARDS DESIGNED
    expect(mockPush).toHaveBeenCalledWith(`/contributor/${OTHER}/cards`);
    fireEvent.press(viewAll[1]); // GAMES ADDED
    expect(mockPush).toHaveBeenCalledWith(`/contributor/${OTHER}/games`);
  });

  it('the drawn-not-built "arrives soon" tail note is gone (VIEW ALL is a real paginated route now)', () => {
    set({ data: FULL });
    render(wrap(<ContributorProfile />));
    expect(screen.queryByText(/arrives soon/i)).toBeNull();
  });

  it('a card tap routes to the Game page (CARD-23 NAVIGATE)', () => {
    set({ data: FULL });
    render(wrap(<ContributorProfile />));
    fireEvent.press(screen.getByLabelText(/View Game 2 card/i));
    expect(mockPush).toHaveBeenCalledWith('/game/game-2');
  });
});
