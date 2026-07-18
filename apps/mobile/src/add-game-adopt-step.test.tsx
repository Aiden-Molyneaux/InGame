import React from 'react';
import { render as rtlRender, screen, fireEvent } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import prefsReducer from './store/prefsSlice';

// W-D Wave D (OQ-136 / W-C10) — the Add-Game INSPECT chevron + the community-cards ADOPT step.
//   • the search/rail INSPECT chevron routes to /game/[id] (the adaptive Game page; CATALOG when unowned)
//   • after the add creates the entry, the ADOPT step surfaces the game's community gallery (adopt + skip)
//   • adopt-after-add sequences onto the NEW entry: add(gameId) → gallery(gameId) → adoptCard(cardId)
//     (the server resolves the just-created entry from the card's game — no entryId plumbing)
//   • a game with NO community cards auto-advances the step (the implicit blank default)

const CATALOG_ITEM = (id: string, name: string, over: Record<string, unknown> = {}) => ({
  id,
  name,
  studio: 'FromSoftware',
  publisher: null,
  releaseDate: '2022-02-25',
  genres: [],
  collectionsCount: 4,
  friendsHaveCount: 1,
  inCollection: false,
  contributor: { userId: 'u1', username: 'curator' },
  ...over,
});

// the CollectionItem the add resolves to (only gameId/title/status are read downstream)
const ADDED = { entryId: 'e1', gameId: 'p1', title: 'Elden Ring', status: 'backlog' };

// one FREE community card for game p1 (GalleryCardView — the fields the gallery cell + sheet read)
const FREE_CARD = {
  id: 'c1',
  name: 'Neon Elden',
  imageUrl: null,
  thumbUrl: null,
  isPremium: false,
  adoptionCount: 3,
  priceForYou: 0,
  components: [],
  designer: { userId: 'd1', username: 'nova' },
  byViewer: false,
  adopted: false,
};

let mockGallery: { data?: { items: unknown[] }; isLoading: boolean; isError: boolean } = {
  data: { items: [] },
  isLoading: false,
  isError: false,
};
const mockAdd = jest.fn(() => ({ unwrap: () => Promise.resolve(ADDED) }));
const mockAdopt = jest.fn(() => ({ unwrap: () => Promise.resolve({ granted: [], totalPaid: 0, balance: 500 }) }));
const mockPush = jest.fn();

jest.mock('./store/api', () => ({
  useGetGenresQuery: () => ({ data: { items: [] } }),
  useGetPopularQuery: () => ({ data: { items: [CATALOG_ITEM('p1', 'Elden Ring')] } }),
  useGetWalletQuery: () => ({ data: { balance: 500 } }),
  useLazySearchCatalogQuery: () => [jest.fn(), { isFetching: false, data: undefined }],
  useCreateGameMutation: () => [jest.fn(), { isLoading: false }],
  useAddToCollectionMutation: () => [mockAdd, { isLoading: false }],
  useUpdateEntryMutation: () => [jest.fn(() => ({ unwrap: () => Promise.resolve({}) })), { isLoading: false }],
}));
jest.mock('./store/catalogRailsApi', () => ({
  useGetNewReleasesQuery: () => ({ data: { items: [] } }),
  useGetFriendsActiveQuery: () => ({ data: { items: [] } }),
}));
jest.mock('./store/communityApi', () => ({
  useGetGameGalleryQuery: () => mockGallery,
  useAdoptCardMutation: () => [mockAdopt, { isLoading: false }],
}));
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush, back: jest.fn(), replace: jest.fn() }),
}));

// Stub the AdoptCardSheet so the adopt/close wiring is drivable without its hold-to-adopt gesture. The
// REAL CommunityGallery still renders (so "the step renders the gallery" is genuine); this shim only
// stands in for the sheet's confirm UX and calls back through the container's onAdopt/onAdopted/onClose.
jest.mock('./components/game/AdoptCardSheet', () => {
  const React2 = require('react');
  const { View, Text, Pressable } = require('react-native');
  return {
    AdoptCardSheet: ({ card, visible, onAdopt, onAdopted, onClose }: any) =>
      visible && card
        ? React2.createElement(
            View,
            null,
            React2.createElement(Text, null, `ADOPT SHEET — ${card.name}`),
            React2.createElement(
              Pressable,
              {
                accessibilityLabel: 'do-adopt',
                onPress: async () => {
                  const r = await onAdopt();
                  if (r?.ok) onAdopted(r.result, card);
                },
              },
              React2.createElement(Text, null, 'DO ADOPT'),
            ),
            React2.createElement(
              Pressable,
              { accessibilityLabel: 'sheet-done', onPress: onClose },
              React2.createElement(Text, null, 'SHEET DONE'),
            ),
          )
        : null,
  };
});

import AddGame from '../app/add-game';

function renderAddGame() {
  const store = configureStore({ reducer: { prefs: prefsReducer } });
  return rtlRender(
    <Provider store={store}>
      <AddGame />
    </Provider>,
  );
}

beforeEach(() => {
  mockAdd.mockClear();
  mockAdopt.mockClear();
  mockPush.mockClear();
  mockGallery = { data: { items: [] }, isLoading: false, isError: false };
});

describe('W-D Q3: the Add-Game INSPECT chevron', () => {
  it('routes the focused search/rail card to the adaptive Game page /game/[id]', () => {
    renderAddGame();
    // the POPULAR rail's focused card (p1) carries the INSPECT affordance under its meta
    fireEvent.press(screen.getByLabelText('Inspect Elden Ring'));
    expect(mockPush).toHaveBeenCalledWith('/game/p1');
  });
});

describe('W-D OQ-136: the community-cards ADOPT step (add-then-adopt onto the new entry)', () => {
  it('renders the gallery + adopt + skip once a game with community cards is added', async () => {
    mockGallery = { data: { items: [FREE_CARD] }, isLoading: false, isError: false };
    renderAddGame();

    // add creates the entry first
    fireEvent.press(screen.getAllByText('ADD TO COLLECTION')[0]!);
    expect(mockAdd).toHaveBeenCalledWith({ gameId: 'p1' });

    // the ADOPT step then surfaces the community gallery + a skip door
    expect(await screen.findByText('ADOPT A CARD FOR IT?')).toBeTruthy();
    expect(screen.getByText(/COMMUNITY CARDS/)).toBeTruthy();
    expect(screen.getByText('SKIP — KEEP THE DEFAULT CARD')).toBeTruthy();
    // the card cell is present + adoptable (an inspect press target)
    expect(screen.getByLabelText(/Neon Elden by nova/i)).toBeTruthy();
  });

  it('adopting a card sequences onto the new entry, then advances to SET A STATUS', async () => {
    mockGallery = { data: { items: [FREE_CARD] }, isLoading: false, isError: false };
    renderAddGame();

    fireEvent.press(screen.getAllByText('ADD TO COLLECTION')[0]!);
    await screen.findByText('ADOPT A CARD FOR IT?');

    // open the card → the adopt sheet → adopt
    fireEvent.press(screen.getByLabelText(/Neon Elden by nova/i));
    fireEvent.press(await screen.findByLabelText('do-adopt'));

    // adopt targets the card; the server resolves the just-created entry from the card's game
    expect(mockAdopt).toHaveBeenCalledWith('c1');

    // let the adopt settle (the adopted flag commits), then the sheet's Done advances to the status beat
    fireEvent.press(await screen.findByLabelText('sheet-done'));
    expect(await screen.findByText('SET A STATUS')).toBeTruthy();
  });

  it('SKIP takes the blank default and advances to SET A STATUS', async () => {
    mockGallery = { data: { items: [FREE_CARD] }, isLoading: false, isError: false };
    renderAddGame();

    fireEvent.press(screen.getAllByText('ADD TO COLLECTION')[0]!);
    fireEvent.press(await screen.findByText('SKIP — KEEP THE DEFAULT CARD'));

    expect(await screen.findByText('SET A STATUS')).toBeTruthy();
    expect(mockAdopt).not.toHaveBeenCalled();
  });

  it('a game with NO community cards auto-skips the step straight to SET A STATUS', async () => {
    mockGallery = { data: { items: [] }, isLoading: false, isError: false };
    renderAddGame();

    fireEvent.press(screen.getAllByText('ADD TO COLLECTION')[0]!);

    // no adopt step is shown — it advances to the status beat
    expect(await screen.findByText('SET A STATUS')).toBeTruthy();
    expect(screen.queryByText('ADOPT A CARD FOR IT?')).toBeNull();
  });
});
