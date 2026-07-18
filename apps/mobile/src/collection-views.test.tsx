import React from 'react';
import { render as rtlRender, screen, fireEvent } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import prefsReducer, { setCollectionView, type CollectionView } from './store/prefsSlice';

// walk2 B6/B7 (⚖ owner rulings 2026-07-17, 0078) — the Collection view rows:
//   B6: now-playing chrome renders in the HERO ONLY — the pinned entry rides list/grid/shelf as a
//       plain row (the board's row ▶ NOW tags at collection-states :571/:681/:766 are superseded).
//   B7: shelf rows carry the List view's chevron — the quick-entry affordance into the Game page.

const CARD = { imageUrl: null, thumbUrl: null };
const CI = (n: number, nowPlaying = false) => ({
  entryId: `e${n}`,
  gameId: `g${n}`,
  title: `Game ${n}`,
  developer: 'Studio',
  publisher: 'Pub',
  releaseYear: 2014,
  genres: [],
  hours: 100 + n,
  status: 'playing',
  ownedSince: '2020-01-01',
  addedAt: '2020-01-01T00:00:00.000Z',
  nowPlaying,
  card: CARD,
});
const mockItems = [CI(1, true), CI(2), CI(3)];

jest.mock('./store/api', () => ({
  useGetCollectionQuery: () => ({
    data: { items: mockItems, collectionTotal: mockItems.length },
    isLoading: false,
    isError: false,
    refetch: jest.fn(),
  }),
  useUpdateEntryMutation: () => [jest.fn(), { isLoading: false }],
  useGetWalletQuery: () => ({ data: { balance: 0 } }),
}));
jest.mock('./store/listsApi', () => ({
  TOP10_LIST_ID: 'top10',
  useGetListsQuery: () => ({ data: [{ id: 'top10', kind: 'top10', items: [] }], isLoading: false }),
  useAddListItemMutation: () => [jest.fn(), { isLoading: false }],
  useRemoveListItemMutation: () => [jest.fn(), {}],
  useRerankListMutation: () => [jest.fn(), {}],
}));
const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush, back: jest.fn(), replace: jest.fn(), navigate: jest.fn() }),
  useLocalSearchParams: () => ({}),
  useFocusEffect: () => {},
}));
// FlipCard renders REAL (its own suite proves it jest-safe) so the B6 shelf assertion pins the actual
// fix: the real FlipCard no longer passes nowPlaying into the row card. EntryCard is the probe.
jest.mock('./components/EntryCard', () => ({
  EntryCard: ({ title, nowPlaying }: { title: string; nowPlaying?: boolean }) => {
    const { Text } = require('react-native');
    return <Text>{nowPlaying ? `CARD-NOW:${title}` : `CARD:${title}`}</Text>;
  },
}));
jest.mock('./components/commerce', () => ({ CurrencyCounter: () => null }));

import Collection from '../app/(tabs)/collection';

function renderView(view: CollectionView) {
  const store = configureStore({ reducer: { prefs: prefsReducer } });
  store.dispatch(setCollectionView(view));
  return rtlRender(
    <Provider store={store}>
      <Collection />
    </Provider>,
  );
}

beforeEach(() => mockPush.mockClear());

describe('COL-07 walk2-B6: now-playing chrome is HERO-ONLY', () => {
  it('list view — the hero carries the pin; rows have NO ▶ NOW inline tag', () => {
    renderView('list');
    expect(screen.getByText('NOW PLAYING')).toBeTruthy(); // the hero eyebrow — THE pin surface
    expect(screen.queryByText('▶ NOW')).toBeNull(); // no row inline tag (board :681 superseded)
    expect(screen.queryAllByText(/^CARD-NOW:/)).toHaveLength(0); // no card anywhere wears the on-card tag
  });

  it('shelf view — the pinned row renders as a plain card (no now-playing chrome outside the hero)', () => {
    renderView('shelf');
    // the hero eyebrow is the pin; NO card (hero's or the REAL FlipCard rows') wears the on-card
    // ▶ NOW tag — the row card for the pinned entry is plain, and the entry STAYS in the view.
    expect(screen.getByText('NOW PLAYING')).toBeTruthy();
    expect(screen.queryAllByText(/^CARD-NOW:/)).toHaveLength(0);
    expect(screen.getAllByText('CARD:Game 1').length).toBeGreaterThanOrEqual(1);
  });
});

describe('COL-07 walk2-B7: shelf rows carry the List-view chevron', () => {
  it('every shelf row has a › chevron that opens the Game page', () => {
    renderView('shelf');
    const chevrons = screen.getAllByText('›');
    expect(chevrons).toHaveLength(mockItems.length);
    fireEvent.press(chevrons[1]!); // row 2 → Game 2
    expect(mockPush).toHaveBeenCalledWith('/game/g2');
  });
});
