import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import type { FriendCollectionResponse, GameGalleryResponse } from '@ingame/shared';
import prefsReducer from './store/prefsSlice';

// P9 — the SOC-11 entry detail route (app/user/[id]/entry/[gameId].tsx). Under src/ (NOT app/). Asserts
// the friend dual-face fragment: their card + the gated stats readout (hours/status/since, notes/rating
// private) + the CARD-22 equipped readout + adopt/add + the single-game compare fragment.

let mockFriendCol: { data?: FriendCollectionResponse; isLoading: boolean; isError: boolean; error?: unknown; refetch: () => void } = {
  data: undefined,
  isLoading: true,
  isError: false,
  refetch: jest.fn(),
};
let mockMyCol: { data?: { items: unknown[] } } = { data: { items: [] } };
let mockGallery: { data?: GameGalleryResponse } = { data: { items: [] } };
const mockPush = jest.fn();

jest.mock('./store/friendApi', () => ({ useGetUserCollectionQuery: () => mockFriendCol }));
jest.mock('./store/api', () => ({
  useGetCollectionQuery: () => mockMyCol,
  useGetWalletQuery: () => ({ data: { balance: 500 } }),
  useAddToCollectionMutation: () => [jest.fn(() => ({ unwrap: () => Promise.resolve({}) })), { isLoading: false }],
}));
jest.mock('./store/communityApi', () => ({
  useGetGameGalleryQuery: () => mockGallery,
  useAdoptCardMutation: () => [jest.fn(() => ({ unwrap: () => Promise.resolve({}) })), { isLoading: false }],
}));
jest.mock('./components/game/AdoptCardSheet', () => ({ AdoptCardSheet: () => null }));
jest.mock('./components/EntryCard', () => ({
  EntryCard: ({ title }: { title: string }) => {
    const { Text } = require('react-native');
    return <Text>{`CARD:${title}`}</Text>;
  },
}));
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush, back: jest.fn(), replace: jest.fn(), navigate: jest.fn() }),
  useLocalSearchParams: () => ({ id: 'friend-1', gameId: 'g1' }),
}));

import FriendEntryDetail from '../app/user/[id]/entry/[gameId]';

const FRIEND_CARD = {
  id: 'card-9',
  imageUrl: null,
  thumbUrl: null,
  isCustom: true,
  isPremium: false,
  equipped: { base: 'GRADIENT', frame: 'ROSE FOIL', effect: 'EMBER' },
  designer: { userId: 'des-1', username: 'riko' },
};
const FRIEND_ITEM = {
  entryId: 'e1',
  gameId: 'g1',
  title: 'Destiny',
  developer: 'Bungie',
  publisher: 'Bungie',
  releaseYear: 2014,
  genres: [{ id: 'gn', name: 'Shooter', slug: 'shooter' }],
  hours: 240,
  status: 'playing',
  ownedSince: '2014-09-09',
  nowPlaying: true,
  card: FRIEND_CARD,
};
const FRIEND_COL = {
  items: [FRIEND_ITEM],
  nextCursor: null,
  total: 1,
  collectionTotal: 1,
} as unknown as FriendCollectionResponse;

function wrap(ui: React.ReactElement) {
  const store = configureStore({ reducer: { prefs: prefsReducer } });
  return <Provider store={store}>{ui}</Provider>;
}

describe('P9 SOC-11 entry detail route', () => {
  beforeEach(() => {
    mockPush.mockReset();
    mockFriendCol = { data: FRIEND_COL, isLoading: false, isError: false, refetch: jest.fn() };
    mockMyCol = { data: { items: [] } };
    mockGallery = { data: { items: [] } };
  });

  it('renders their card + the gated stats readout (hours/status/since, notes·rating private)', () => {
    render(wrap(<FriendEntryDetail />));
    expect(screen.getByText('Destiny')).toBeTruthy();
    expect(screen.getByText('THEIR FACE')).toBeTruthy();
    expect(screen.getByText('HOURS')).toBeTruthy();
    expect(screen.getByText('240')).toBeTruthy();
    expect(screen.getByText('NOTES · RATING')).toBeTruthy();
    expect(screen.getByText('🔒 PRIVATE')).toBeTruthy();
  });

  it('renders the CARD-22 equipped readout when present (pre-computed labels)', () => {
    render(wrap(<FriendEntryDetail />));
    expect(screen.getByText('ROSE FOIL')).toBeTruthy(); // frame label rendered verbatim
    expect(screen.getByText('GRADIENT')).toBeTruthy(); // base label
  });

  it('the card-artist credit routes to the contributor profile (app-wide designer-tap)', () => {
    render(wrap(<FriendEntryDetail />));
    expect(screen.getByText(/CARD ARTIST/)).toBeTruthy();
  });

  it('ADOPT is offered when the card is adopt-able (found in the game gallery)', () => {
    mockGallery = {
      data: {
        items: [
          {
            id: 'card-9',
            name: 'Rose',
            imageUrl: null,
            thumbUrl: null,
            isPremium: false,
            adoptionCount: 3,
            priceForYou: 0,
            components: [],
            designer: { userId: 'des-1', username: 'riko' },
            byViewer: false,
            adopted: false,
          },
        ],
      } as GameGalleryResponse,
    };
    render(wrap(<FriendEntryDetail />));
    expect(screen.getByText('ADOPT THEIR CARD')).toBeTruthy();
  });

  it('unowned → ADD TO COLLECTION; owned → the single-game compare fragment', () => {
    // unowned (my collection empty)
    render(wrap(<FriendEntryDetail />));
    expect(screen.getByText('ADD TO COLLECTION')).toBeTruthy();
    expect(screen.queryByText('⇄ COMPARE — YOU vs THEM')).toBeNull();
  });

  it('owned → the compare fragment renders (no ADD)', () => {
    mockMyCol = {
      data: {
        items: [
          {
            entryId: 'me1',
            gameId: 'g1',
            title: 'Destiny',
            developer: 'Bungie',
            publisher: 'Bungie',
            releaseYear: 2014,
            genres: [],
            hours: 210,
            percentComplete: 68,
            status: 'playing',
            ownedSince: null,
            addedAt: '2020-01-01T00:00:00Z',
            nowPlaying: false,
            card: { id: 'default', imageUrl: null, thumbUrl: null, isCustom: false, isPremium: false },
            rating: null,
            notes: null,
          },
        ],
      },
    };
    render(wrap(<FriendEntryDetail />));
    expect(screen.getByText('⇄ COMPARE — YOU vs THEM')).toBeTruthy();
    expect(screen.queryByText('ADD TO COLLECTION')).toBeNull();
  });

  it('the game not in their collection → a quiet message', () => {
    mockFriendCol = { data: { items: [], nextCursor: null, total: 0, collectionTotal: 0 }, isLoading: false, isError: false, refetch: jest.fn() };
    render(wrap(<FriendEntryDetail />));
    expect(screen.getByText('NOT IN THEIR COLLECTION')).toBeTruthy();
  });
});
