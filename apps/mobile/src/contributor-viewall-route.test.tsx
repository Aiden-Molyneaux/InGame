import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import type { ContributionsCardsPage, ContributionsGamesPage } from '@ingame/shared';
import prefsReducer from './store/prefsSlice';

// W-1 — the CAT-07 VIEW ALL dedicated full-list routes (app/contributor/[id]/cards.tsx · games.tsx).
// Lives under src/ (NOT app/) so expo-router never treats it as a route (the contributor-route.test
// precedent). Drives the real routes with the RTK page-1 query + the lazy "load more" trigger mocked:
// asserts rows render, Load-more APPENDS the next page, the terminal read, and the 403 friends-only lock.

const OTHER = 'other-1111-1111-1111-111111111111';

let mockCardsFirst: {
  data?: ContributionsCardsPage;
  isLoading: boolean;
  isError: boolean;
  error?: unknown;
  refetch: () => void;
} = { data: undefined, isLoading: true, isError: false, refetch: jest.fn() };
const mockCardsTrigger = jest.fn();
let mockCardsMoreState = { isFetching: false };

let mockGamesFirst: {
  data?: ContributionsGamesPage;
  isLoading: boolean;
  isError: boolean;
  error?: unknown;
  refetch: () => void;
} = { data: undefined, isLoading: true, isError: false, refetch: jest.fn() };
const mockGamesTrigger = jest.fn();
let mockGamesMoreState = { isFetching: false };

const mockPush = jest.fn();
const mockBack = jest.fn();

jest.mock('./store/contributorApi', () => ({
  useGetContributionsCardsQuery: () => mockCardsFirst,
  useLazyGetContributionsCardsQuery: () => [mockCardsTrigger, mockCardsMoreState],
  useGetContributionsGamesQuery: () => mockGamesFirst,
  useLazyGetContributionsGamesQuery: () => [mockGamesTrigger, mockGamesMoreState],
}));
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush, back: mockBack, replace: jest.fn(), navigate: jest.fn() }),
  useLocalSearchParams: () => ({ id: OTHER }),
}));
// Stub EntryCard — skip the CardFace/skia render; this suite tests the list logic, not the card face.
jest.mock('./components/EntryCard', () => ({
  EntryCard: ({ title }: { title: string }) => {
    const { Text } = require('react-native');
    return <Text>{`CARD:${title}`}</Text>;
  },
}));

import CardsList from '../app/contributor/[id]/cards';
import GamesList from '../app/contributor/[id]/games';

const CARD = (n: number) => ({
  cardId: `card-${n}`,
  gameId: `game-${n}`,
  gameTitle: `Game ${n}`,
  adoptionCount: 100 + n,
  card: { id: `card-${n}`, name: `Card ${n}`, imageUrl: `/m/${n}.png`, thumbUrl: null, isPremium: false },
});
const GAME = (n: number) => ({ gameId: `g${n}`, title: `Game ${n}`, collectionsCount: 100 + n });

function wrap(ui: React.ReactElement) {
  const store = configureStore({ reducer: { prefs: prefsReducer } });
  return <Provider store={store}>{ui}</Provider>;
}

beforeEach(() => {
  mockPush.mockReset();
  mockBack.mockReset();
  mockCardsTrigger.mockReset();
  mockGamesTrigger.mockReset();
  mockCardsMoreState = { isFetching: false };
  mockGamesMoreState = { isFetching: false };
  mockCardsFirst = { data: undefined, isLoading: true, isError: false, refetch: jest.fn() };
  mockGamesFirst = { data: undefined, isLoading: true, isError: false, refetch: jest.fn() };
});

describe('W-1 · CARDS DESIGNED VIEW ALL route', () => {
  it('renders the first page of card rows (the adoption grammar)', () => {
    mockCardsFirst = {
      data: { items: [CARD(1), CARD(2)], nextCursor: null },
      isLoading: false,
      isError: false,
      refetch: jest.fn(),
    };
    render(wrap(<CardsList />));
    expect(screen.getByText('CARDS DESIGNED')).toBeTruthy();
    expect(screen.getByText('CARD:Game 1')).toBeTruthy();
    expect(screen.getByText('CARD:Game 2')).toBeTruthy();
    // no cursor → the terminal read, NOT a drawn-not-built "arrives soon" note.
    expect(screen.queryByText(/arrives soon/i)).toBeNull();
    expect(screen.getByText(/everything/i)).toBeTruthy();
  });

  it('Load more APPENDS the next cursor page', async () => {
    mockCardsFirst = {
      data: { items: [CARD(1), CARD(2)], nextCursor: '2' },
      isLoading: false,
      isError: false,
      refetch: jest.fn(),
    };
    mockCardsTrigger.mockReturnValue({
      unwrap: () => Promise.resolve({ items: [CARD(3)], nextCursor: null }),
    });
    render(wrap(<CardsList />));
    // page 2 not yet on screen; the Load-more seam is present
    expect(screen.queryByText('CARD:Game 3')).toBeNull();
    fireEvent.press(screen.getByText('LOAD MORE'));
    // the trigger fired with the cursor, and the appended row renders
    expect(mockCardsTrigger).toHaveBeenCalledWith({ userId: OTHER, cursor: '2' });
    expect(await screen.findByText('CARD:Game 3')).toBeTruthy();
    // head rows survive the append (no reset)
    expect(screen.getByText('CARD:Game 1')).toBeTruthy();
  });

  it('a card tap routes to the Game page (CARD-23 NAVIGATE)', () => {
    mockCardsFirst = {
      data: { items: [CARD(1)], nextCursor: null },
      isLoading: false,
      isError: false,
      refetch: jest.fn(),
    };
    render(wrap(<CardsList />));
    fireEvent.press(screen.getByLabelText(/View Game 1 card/i));
    expect(mockPush).toHaveBeenCalledWith('/game/game-1');
  });

  it('PROF-03 — a 403 renders the friends-only lock, not a retry', () => {
    mockCardsFirst = {
      data: undefined,
      isLoading: false,
      isError: true,
      error: { status: 403 },
      refetch: jest.fn(),
    };
    render(wrap(<CardsList />));
    expect(screen.getByText('This list is only visible to friends.')).toBeTruthy();
    expect(screen.queryByText('RETRY')).toBeNull();
  });

  it('L1 — loading renders the skeleton frame', () => {
    mockCardsFirst = { data: undefined, isLoading: true, isError: false, refetch: jest.fn() };
    render(wrap(<CardsList />));
    expect(screen.getAllByLabelText('Loading').length).toBeGreaterThan(0);
  });
});

describe('W-1 · GAMES ADDED VIEW ALL route', () => {
  it('renders game rows and Load more appends the next page', async () => {
    mockGamesFirst = {
      data: { items: [GAME(1), GAME(2)], nextCursor: '2' },
      isLoading: false,
      isError: false,
      refetch: jest.fn(),
    };
    mockGamesTrigger.mockReturnValue({
      unwrap: () => Promise.resolve({ items: [GAME(3)], nextCursor: null }),
    });
    render(wrap(<GamesList />));
    expect(screen.getByText('GAMES ADDED')).toBeTruthy();
    expect(screen.getByText('GAME 1')).toBeTruthy();
    expect(screen.getByText('IN 101 COLLECTIONS')).toBeTruthy();
    fireEvent.press(screen.getByText('LOAD MORE'));
    expect(mockGamesTrigger).toHaveBeenCalledWith({ userId: OTHER, cursor: '2' });
    expect(await screen.findByText('GAME 3')).toBeTruthy();
  });
});
