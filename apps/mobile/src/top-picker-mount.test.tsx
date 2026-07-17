import React from 'react';
import { render as rtlRender, screen, fireEvent } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import prefsReducer, { setCollectionView } from './store/prefsSlice';

// P10 walk-1 — the STRUCTURAL no-renest guard (the P13-F3 style; the F-15 in-scroll-overlay class).
// PulledSheet is an absolute-fill IN-SCREEN overlay whose contract is "mount at the SCREEN ROOT, a
// sibling of the scroll, never inside one" — nested in a ScrollView it anchors to the scroll CONTENT
// (top-pinned, wrong size, clipped/invisible results — the owner-walk bug). This renders the REAL
// Collection route with REAL PulledSheet, opens the TOP CardPicker, and asserts the sheet is NOT a
// descendant of any ScrollView — so this class cannot re-nest. (The probe is the sheet's TITLE node,
// which sits ABOVE the sheet's own internal body-ScrollView, so the walk is clean by construction.)

const CARD = { imageUrl: null, thumbUrl: null };
const CI = (n: number) => ({
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
  nowPlaying: false,
  card: CARD,
});
const mockItems = [CI(1), CI(2), CI(3)];

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
  useAddListItemMutation: () => [jest.fn(() => ({ unwrap: () => Promise.resolve({}) })), { isLoading: false }],
  useRemoveListItemMutation: () => [jest.fn(() => ({ unwrap: () => Promise.resolve({}) })), {}],
  useRerankListMutation: () => [jest.fn(() => ({ unwrap: () => Promise.resolve({}) })), {}],
}));
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), back: jest.fn(), replace: jest.fn(), navigate: jest.fn() }),
  useLocalSearchParams: () => ({}),
  useFocusEffect: () => {},
}));
jest.mock('./components/collection/FlipCard', () => ({
  FlipCard: () => null, // skia/reanimated card — not under test (TOP view never renders it anyway)
}));
jest.mock('./components/EntryCard', () => ({
  EntryCard: ({ title }: { title: string }) => {
    const { Text } = require('react-native');
    return <Text>{`CARD:${title}`}</Text>;
  },
}));
jest.mock('./components/commerce', () => ({
  CurrencyCounter: () => null,
}));

import Collection from '../app/(tabs)/collection';

// Walk the ancestor chain; true if ANY ancestor is a ScrollView (composite 'ScrollView' or host
// 'RCTScrollView' — both match). Minimal structural type — react-test-renderer ships no d.ts here.
type TestNode = { parent: TestNode | null; type: unknown };
function hasScrollViewAncestor(node: TestNode): boolean {
  let p: TestNode | null = node.parent;
  while (p) {
    const ty = p.type as unknown;
    const name =
      typeof ty === 'string'
        ? ty
        : ((ty as { displayName?: string; name?: string })?.displayName ??
          (ty as { name?: string })?.name ??
          '');
    if (/ScrollView/.test(String(name))) return true;
    p = p.parent;
  }
  return false;
}

function renderTop() {
  const store = configureStore({ reducer: { prefs: prefsReducer } });
  store.dispatch(setCollectionView('top'));
  return rtlRender(
    <Provider store={store}>
      <Collection />
    </Provider>,
  );
}

function openPicker() {
  fireEvent.press(screen.getByText('ARRANGE')); // enter ARRANGE (the tools-bar keycap in TOP)
  fireEvent.press(screen.getByText('+ ADD FROM COLLECTION · SEAT 1')); // the add-seat (walk-5b ScreenButton) raises the picker
}

describe('COL-13 walk-1: the CardPicker sheet mounts at the SCREEN ROOT (F-15 no-renest guard)', () => {
  it('the picker sheet is NOT a descendant of any ScrollView (the PulledSheet contract)', () => {
    renderTop();
    openPicker();
    // the probe: the sheet's title node (rendered ABOVE the sheet's own internal body-scroll).
    const sheetTitle = screen.getByText('ADD TO TOP · SEAT 1');
    expect(hasScrollViewAncestor(sheetTitle)).toBe(false);
  });

  it("positive control: the arrange DONE bar IS inside the screen's ScrollView (proves the walker bites)", () => {
    renderTop();
    fireEvent.press(screen.getByText('ARRANGE'));
    const inScroll = screen.getByText('0 / 10 SEATED');
    expect(hasScrollViewAncestor(inScroll)).toBe(true);
  });

  it('every collection item renders as a picker cell (the "empty drawer" regression)', () => {
    renderTop();
    openPicker();
    const cells = screen.getAllByLabelText(/^(Add|Remove) Game \d$/);
    expect(cells).toHaveLength(mockItems.length);
  });

  it('walk-5c: ARRANGE shows exactly ONE Done, ON THE TOOLS BAR (owner placement ruling); tv-bar = status only', () => {
    renderTop();
    fireEvent.press(screen.getByText('ARRANGE'));
    // exactly one DONE on screen — the tools-bar keycap (ARRANGE ↔ DONE toggle)…
    const dones = screen.getAllByText('DONE');
    expect(dones).toHaveLength(1);
    // …and it lives on the TOOLS BAR (outside the scroll), not in the in-scroll tv-bar: the tools row
    // is a ScrollView SIBLING, so the one DONE must have NO ScrollView ancestor.
    expect(hasScrollViewAncestor(dones[0] as unknown as TestNode)).toBe(false);
    // the tv-bar keeps the pure status readout (in-scroll), with no button beside it.
    expect(hasScrollViewAncestor(screen.getByText('0 / 10 SEATED') as unknown as TestNode)).toBe(true);
    expect(screen.queryByText('ARRANGE')).toBeNull(); // the keycap now READS DONE (one control, toggled)
  });
});
