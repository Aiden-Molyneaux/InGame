import React from 'react';
import { render as rtlRender, screen, fireEvent } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import prefsReducer, { setCollectionView, setCol12CoachmarkSeen, type CollectionView } from './store/prefsSlice';

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

function renderView(view: CollectionView, coachmarkSeen = false) {
  const store = configureStore({ reducer: { prefs: prefsReducer } });
  store.dispatch(setCollectionView(view));
  store.dispatch(setCol12CoachmarkSeen(coachmarkSeen));
  return rtlRender(
    <Provider store={store}>
      <Collection />
    </Provider>,
  );
}

// A stable snapshot of the shelf's structural nodes — the hero eyebrow + every card label + every
// row chevron + every title. If the peek-flip hint participated in the shelf's flow, toggling it
// would add/remove a node here; an absolute overlay leaves it byte-identical.
const HINT = 'Tap a card to flip it for your stats.';
function shelfShape() {
  return {
    hero: screen.queryAllByText('NOW PLAYING').length,
    cards: screen.queryAllByText(/^CARD:/).map((n) => n.props.children).sort(),
    chevrons: screen.queryAllByText('›').length,
  };
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

describe('COL-12/CARD-16: the peek-flip hint is layout-neutral (owner walk — the relog jar)', () => {
  it('the surrounding shelf is structurally identical whether the hint shows or not', () => {
    // hint SHOWN (first-run: col12CoachmarkSeen=false, flippable shelf, non-empty, no query)
    const shown = renderView('shelf', false);
    expect(screen.getByText(HINT)).toBeTruthy();
    const withHint = shelfShape();
    shown.unmount();

    // hint HIDDEN (seen=true — the post-dismiss / post-first-flip state)
    renderView('shelf', true);
    expect(screen.queryByText(HINT)).toBeNull();
    const withoutHint = shelfShape();

    // the hint added/removed NOTHING from the shelf's flow — appearing or dismissing it (and the
    // relog that re-arms it) cannot shift the list, because the hint lives in an absolute overlay.
    expect(withoutHint).toEqual(withHint);
    // sanity: a genuinely populated shelf underlay the comparison (one chevron per row)
    expect(withHint.chevrons).toBe(mockItems.length);
  });

  it('the hint is NOT a descendant of the shelf ScrollView (the assertion that fails on the pre-fix inline layout)', () => {
    // Murr walk-wave debt: shelfShape() ignores the hint node, so the structural test above ALSO passes
    // against the old in-flow layout. THIS is the discriminator — the user/[id] ReportSheet pattern:
    // the hint renders, but never inside the scroll (an in-flow regression puts it back in the scroll).
    const { within } = require('@testing-library/react-native');
    renderView('shelf', false);
    expect(screen.getByText(HINT)).toBeTruthy();
    const scroll = screen.getByTestId('collection-scroll');
    expect(within(scroll).queryByText(HINT)).toBeNull();
  });

  it('renders the hint in an absolute overlay (out of flow) — the mechanism that kills the jar', () => {
    const { StyleSheet } = require('react-native');
    renderView('shelf', false);
    // the strip is present (helpful — kept) but its container is taken OUT of the shelf's layout flow,
    // so it can never reflow the list. If a refactor drops it back inline, this pins the regression.
    expect(screen.getByText(HINT)).toBeTruthy();
    const overlay = StyleSheet.flatten(screen.getByTestId('coachmark-overlay').props.style);
    expect(overlay.position).toBe('absolute');
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
