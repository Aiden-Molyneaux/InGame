import React from 'react';
import { render as rtlRender, screen, fireEvent } from '@testing-library/react-native';
import { ActivityIndicator, StyleSheet } from 'react-native';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import prefsReducer from './store/prefsSlice';

// Owner walk (m6) Fix 1 — while typing in the Add-Game search, the results-status area swaps between a
// loading spinner and the NO MATCHES panel. Those two states differed in height, so each keystroke
// shoved the "NONE OF THESE? / Create" hook up and down. The fix reserves the space: the NO MATCHES
// panel is the height ANCHOR (always laid out), and the spinner rides an ABSOLUTE overlay over it. These
// tests pin that the spinner-state and the no-matches-state produce identical surrounding structure.

let mockSearchState: { isFetching: boolean; data: { items: unknown[] } | undefined } = {
  isFetching: false,
  data: undefined,
};

jest.mock('./store/api', () => ({
  useGetGenresQuery: () => ({ data: { items: [] } }),
  useGetPopularQuery: () => ({ data: { items: [] } }),
  useGetWalletQuery: () => ({ data: { balance: 0 } }),
  useLazySearchCatalogQuery: () => [jest.fn(), mockSearchState],
  useCreateGameMutation: () => [jest.fn(), { isLoading: false }],
  useAddToCollectionMutation: () => [
    jest.fn(() => ({ unwrap: () => Promise.resolve({}) })),
    { isLoading: false },
  ],
  useUpdateEntryMutation: () => [jest.fn(), { isLoading: false }],
}));
jest.mock('./store/catalogRailsApi', () => ({
  useGetNewReleasesQuery: () => ({ data: { items: [] } }),
  useGetFriendsActiveQuery: () => ({ data: { items: [] } }),
}));
jest.mock('./store/communityApi', () => ({
  useGetGameGalleryQuery: () => ({ data: { items: [] }, isLoading: false, isError: false }),
  useAdoptCardMutation: () => [
    jest.fn(() => ({ unwrap: () => Promise.resolve({}) })),
    { isLoading: false },
  ],
}));
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), back: jest.fn(), replace: jest.fn() }),
}));

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
  mockSearchState = { isFetching: false, data: undefined };
});

// The surrounding-flow shape: the NO MATCHES anchor + the create hook must occupy the layout in BOTH
// states (the anchor is what reserves the space). `includeHiddenElements` counts the anchor even while
// it's held a11y-hidden during a fetch — because it is still LAID OUT (opacity 0), which is the whole
// point: the box stays, so the create hook below never moves. Only the spinner overlay — out of flow,
// absolute — differs between the two states.
function statusShape() {
  return {
    anchor: screen.queryAllByText('NO MATCHES', { includeHiddenElements: true }).length,
    createHook: screen.queryAllByText('NONE OF THESE?', { includeHiddenElements: true }).length,
  };
}

describe('Owner walk (m6) Fix 1: the search fetch↔no-matches swap reserves space (no layout jar)', () => {
  it('the NO MATCHES anchor + create hook are structurally identical whether fetching or settled-empty', () => {
    // settled empty — not fetching, no results → NO MATCHES visible, no spinner
    mockSearchState = { isFetching: false, data: undefined };
    const settled = renderAddGame();
    fireEvent.changeText(screen.getByPlaceholderText('Search the catalog'), 'Zelda');
    const settledShape = statusShape();
    expect(settled.UNSAFE_queryAllByType(ActivityIndicator)).toHaveLength(0);
    // settled: the anchor is genuinely VISIBLE (not a11y-hidden)
    expect(screen.queryByText('NO MATCHES')).toBeTruthy();
    settled.unmount();

    // fetching — the spinner overlays the SAME anchor
    mockSearchState = { isFetching: true, data: undefined };
    const fetching = renderAddGame();
    fireEvent.changeText(screen.getByPlaceholderText('Search the catalog'), 'Zelda');
    const fetchingShape = statusShape();
    expect(fetching.UNSAFE_queryAllByType(ActivityIndicator).length).toBeGreaterThanOrEqual(1);
    // fetching: the anchor is still LAID OUT (reserves the space) but held a11y-hidden — the spinner is
    // the state the user reads, while the box beneath it stays put.
    expect(screen.queryByText('NO MATCHES')).toBeNull(); // hidden from a11y…
    expect(screen.queryByText('NO MATCHES', { includeHiddenElements: true })).toBeTruthy(); // …but present

    // the surrounding flow is byte-identical — the anchor + the create hook occupy the layout in BOTH
    // states, so the spinner↔no-matches swap adds/removes NO in-flow node (it cannot shove the hook).
    expect(fetchingShape).toEqual(settledShape);
    expect(settledShape.anchor).toBe(1);
    expect(settledShape.createHook).toBe(1);
  });

  it('the spinner rides an ABSOLUTE overlay (out of flow) — the mechanism that kills the jar', () => {
    mockSearchState = { isFetching: true, data: undefined };
    const { UNSAFE_getByType } = renderAddGame();
    fireEvent.changeText(screen.getByPlaceholderText('Search the catalog'), 'Zelda');
    // the spinner's wrapping View is absolutely positioned, so it adds no height to the status slot.
    const overlay = UNSAFE_getByType(ActivityIndicator).parent;
    const style = StyleSheet.flatten(overlay?.props.style);
    expect(style?.position).toBe('absolute');
  });
});
