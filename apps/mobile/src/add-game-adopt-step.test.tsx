import React from 'react';
import { render as rtlRender, screen, fireEvent } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import prefsReducer from './store/prefsSlice';

// W-D Wave D (OQ-136 / W-C10), reshaped at the m6 owner walk — the post-add flow:
//   • the search/rail INSPECT chevron routes to /game/[id] (the adaptive Game page; CATALOG when unowned)
//   • REORDER: add → stats + the COL-02 STATUS BEAT first → NEXT → the card FORK (was card-step-first)
//   • the FORK: "adopt a card — or design your own" — a TOP-6 strip (sort=top&limit=6) + the doors:
//     adopt-from-strip (AdoptCardSheet — adopt GRANTS the design, entry-independent; it does not equip
//     the new entry) · SEE ALL {N} › (the paged full list) ·
//     DESIGN YOUR OWN › (the Styler) · keep-the-default (tertiary → ends the flow)
//   • an EMPTY/errored gallery no longer auto-advances silently: the fork renders minus the strip
//     (DESIGN YOUR OWN + keep-default stand)

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

let mockGallery: {
  data?: { items: unknown[]; total?: number; nextCursor?: string | null };
  isLoading: boolean;
  isError: boolean;
} = {
  data: { items: [] },
  isLoading: false,
  isError: false,
};
const mockAdd = jest.fn(() => ({ unwrap: () => Promise.resolve(ADDED) }));
const mockAdopt = jest.fn(() => ({ unwrap: () => Promise.resolve({ granted: [], totalPaid: 0, balance: 500 }) }));
const mockPush = jest.fn();
const mockBack = jest.fn();

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
  useRouter: () => ({ push: mockPush, back: mockBack, replace: jest.fn() }),
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
  mockBack.mockClear();
  mockGallery = { data: { items: [] }, isLoading: false, isError: false };
});

/** Add p1 from the POPULAR rail, then walk the (reordered) STATUS BEAT to reach the card fork. */
async function addAndReachFork() {
  fireEvent.press(screen.getAllByText('ADD TO COLLECTION')[0]!);
  expect(mockAdd).toHaveBeenCalledWith({ gameId: 'p1' });
  fireEvent.press(await screen.findByText('NEXT'));
  expect(await screen.findByText('ADOPT A CARD — OR DESIGN YOUR OWN')).toBeTruthy();
}

describe('W-D Q3: the Add-Game INSPECT chevron', () => {
  it('routes the focused search/rail card to the adaptive Game page /game/[id]', () => {
    renderAddGame();
    // the POPULAR rail's focused card (p1) carries the INSPECT affordance under its meta
    fireEvent.press(screen.getByLabelText('Inspect Elden Ring'));
    expect(mockPush).toHaveBeenCalledWith('/game/p1');
  });
});

describe('m6 reorder: add → stats → STATUS BEAT → the card fork', () => {
  it('the STATUS BEAT renders FIRST after the add; NEXT advances to the fork', async () => {
    mockGallery = { data: { items: [FREE_CARD], total: 1 }, isLoading: false, isError: false };
    renderAddGame();

    fireEvent.press(screen.getAllByText('ADD TO COLLECTION')[0]!);
    expect(mockAdd).toHaveBeenCalledWith({ gameId: 'p1' });

    // the status beat is the FIRST post-add screen now (the card step comes after)
    expect(await screen.findByText('SET A STATUS')).toBeTruthy();
    expect(screen.queryByText('ADOPT A CARD — OR DESIGN YOUR OWN')).toBeNull();

    fireEvent.press(screen.getByText('NEXT'));
    expect(await screen.findByText('ADOPT A CARD — OR DESIGN YOUR OWN')).toBeTruthy();
    expect(screen.queryByText('SET A STATUS')).toBeNull();
  });
});

describe('m6 card FORK: adopt-from-strip · SEE ALL · DESIGN YOUR OWN · keep-the-default', () => {
  it('renders the TOP strip + all the doors when the game has community cards', async () => {
    mockGallery = { data: { items: [FREE_CARD], total: 9 }, isLoading: false, isError: false };
    renderAddGame();
    await addAndReachFork();

    // the strip (the real CommunityGallery, total-count head) + the adoptable cell
    expect(screen.getByText('COMMUNITY CARDS — 9')).toBeTruthy();
    expect(screen.getByLabelText(/Neon Elden by nova/i)).toBeTruthy();
    // the doors: SEE ALL {N} › (total > strip) · DESIGN YOUR OWN › · keep-the-default tertiary
    expect(screen.getByText('SEE ALL 9 ›')).toBeTruthy();
    expect(screen.getByText('DESIGN YOUR OWN ›')).toBeTruthy();
    expect(screen.getByText('KEEP THE DEFAULT FOR NOW')).toBeTruthy();
  });

  it('SEE ALL routes to the adopt-capable full list; DESIGN YOUR OWN routes to the Styler', async () => {
    mockGallery = { data: { items: [FREE_CARD], total: 9 }, isLoading: false, isError: false };
    renderAddGame();
    await addAndReachFork();

    fireEvent.press(screen.getByText('SEE ALL 9 ›'));
    expect(mockPush).toHaveBeenCalledWith('/game/p1/cards?adopt=1');

    fireEvent.press(screen.getByText('DESIGN YOUR OWN ›'));
    expect(mockPush).toHaveBeenCalledWith('/styler/p1');
  });

  it('adopting from the strip sequences onto the new entry; the sheet Done ENDS the flow (back to Collection)', async () => {
    mockGallery = { data: { items: [FREE_CARD], total: 1 }, isLoading: false, isError: false };
    renderAddGame();
    await addAndReachFork();

    // open the card → the adopt sheet → adopt
    fireEvent.press(screen.getByLabelText(/Neon Elden by nova/i));
    fireEvent.press(await screen.findByLabelText('do-adopt'));

    // adopt targets the CARD only (`adoptCard(cardId)`) — adoption is entry-independent: it grants the
    // design to the adopter's library, it does not resolve or equip the just-created collection entry
    expect(mockAdopt).toHaveBeenCalledWith('c1');

    // the sheet's Done after a successful adopt ends the flow → router.back() to Collection
    fireEvent.press(await screen.findByLabelText('sheet-done'));
    expect(mockBack).toHaveBeenCalled();
  });

  it('keep-the-default ENDS the flow without adopting', async () => {
    mockGallery = { data: { items: [FREE_CARD], total: 1 }, isLoading: false, isError: false };
    renderAddGame();
    await addAndReachFork();

    fireEvent.press(screen.getByText('KEEP THE DEFAULT FOR NOW'));
    expect(mockBack).toHaveBeenCalled();
    expect(mockAdopt).not.toHaveBeenCalled();
  });

  it('an EMPTY community renders the fork minus the strip — NO silent auto-advance', async () => {
    mockGallery = { data: { items: [], total: 0 }, isLoading: false, isError: false };
    renderAddGame();
    await addAndReachFork();

    // the fork STAYS on screen (the old auto-advance is retired) with the two remaining doors
    expect(screen.getByText('DESIGN YOUR OWN ›')).toBeTruthy();
    expect(screen.getByText('KEEP THE DEFAULT FOR NOW')).toBeTruthy();
    // no strip, no SEE ALL (nothing to see)
    expect(screen.queryByText(/COMMUNITY CARDS/)).toBeNull();
    expect(screen.queryByText(/SEE ALL/)).toBeNull();
    expect(mockBack).not.toHaveBeenCalled();
  });

  it('an ERRORED gallery degrades exactly like empty (the doors never depend on the fetch)', async () => {
    mockGallery = { data: undefined, isLoading: false, isError: true };
    renderAddGame();
    await addAndReachFork();

    expect(screen.getByText('DESIGN YOUR OWN ›')).toBeTruthy();
    expect(screen.getByText('KEEP THE DEFAULT FOR NOW')).toBeTruthy();
    expect(screen.queryByText(/COMMUNITY CARDS/)).toBeNull();
  });
});
