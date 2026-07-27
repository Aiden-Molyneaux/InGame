import React from 'react';
import { render as rtlRender, screen, fireEvent } from '@testing-library/react-native';
import { ActivityIndicator, StyleSheet } from 'react-native';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import prefsReducer from './store/prefsSlice';

// Owner walk (m6) Fix 1 — while typing in the Add-Game search, the results-status area swaps between a
// loading spinner and the NO MATCHES panel. Those two states differed in height, so each keystroke
// shoved the create hook below up and down. The fix reserves the space: the NO MATCHES panel is the
// height ANCHOR (always laid out), and the spinner rides an ABSOLUTE overlay over it.
//
// WALK-4 P2 extends this file with the CREATE-side rulings:
//   • P2-d — the create affordance's PROMINENCE follows the results: 0 matches → the gold stepped key
//     and NO "NONE OF THESE?" lead (there are no "these"); with matches → a de-emphasized TertiaryLink
//     under the lead. Mid-fetch shares the no-matches posture, so the keystroke swap still can't reflow.
//   • P2-b — the CREATE form's Name is LOCKED (read-only, prefilled from the query); tapping it routes
//     BACK to search with the query preserved.
//   • P2-c — genres no longer gate Create.

const ITEM = (id: string, name: string) => ({
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
});

let mockSearchState: { isFetching: boolean; data: { items: unknown[] } | undefined } = {
  isFetching: false,
  data: undefined,
};
const mockCreate = jest.fn(() => ({ unwrap: () => Promise.resolve({ id: 'new-1' }) }));

jest.mock('./store/api', () => ({
  useGetGenresQuery: () => ({ data: { items: [{ id: 'g-rpg', name: 'RPG' }] } }),
  useGetPopularQuery: () => ({ data: { items: [] } }),
  useGetWalletQuery: () => ({ data: { balance: 0 } }),
  useLazySearchCatalogQuery: () => [jest.fn(), mockSearchState],
  useCreateGameMutation: () => [mockCreate, { isLoading: false }],
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
jest.mock('./store/hooks', () => ({ useAppSelector: () => 'tok', useAppDispatch: () => jest.fn() }));
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), back: jest.fn(), replace: jest.fn(), dismissTo: jest.fn() }),
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

/** Type a query into the docked search field (the only way to leave the pre-query rails). */
function typeQuery(q = 'Zelda') {
  fireEvent.changeText(screen.getByPlaceholderText('Search the catalog'), q);
}

beforeEach(() => {
  mockSearchState = { isFetching: false, data: undefined };
  mockCreate.mockClear();
});

// The surrounding-flow shape: the NO MATCHES anchor + the create affordance must occupy the layout in
// BOTH states (the anchor is what reserves the space). `includeHiddenElements` counts the anchor even
// while it's held a11y-hidden during a fetch — because it is still LAID OUT (opacity 0), which is the
// whole point: the box stays, so the create hook below never moves. Only the spinner overlay — out of
// flow, absolute — differs between the two states.
function statusShape() {
  return {
    anchor: screen.queryAllByText('NO MATCHES', { includeHiddenElements: true }).length,
    lead: screen.queryAllByText('NONE OF THESE?', { includeHiddenElements: true }).length,
    create: screen.queryAllByText(/^CREATE “/, { includeHiddenElements: true }).length,
  };
}

describe('Owner walk (m6) Fix 1: the search fetch↔no-matches swap reserves space (no layout jar)', () => {
  it('the NO MATCHES anchor + create affordance are structurally identical whether fetching or settled-empty', () => {
    // settled empty — not fetching, no results → NO MATCHES visible, no spinner
    mockSearchState = { isFetching: false, data: undefined };
    const settled = renderAddGame();
    typeQuery();
    const settledShape = statusShape();
    expect(settled.UNSAFE_queryAllByType(ActivityIndicator)).toHaveLength(0);
    // settled: the anchor is genuinely VISIBLE (not a11y-hidden)
    expect(screen.queryByText('NO MATCHES')).toBeTruthy();
    settled.unmount();

    // fetching — the spinner overlays the SAME anchor
    mockSearchState = { isFetching: true, data: undefined };
    const fetching = renderAddGame();
    typeQuery();
    const fetchingShape = statusShape();
    expect(fetching.UNSAFE_queryAllByType(ActivityIndicator).length).toBeGreaterThanOrEqual(1);
    // fetching: the anchor is still LAID OUT (reserves the space) but held a11y-hidden — the spinner is
    // the state the user reads, while the box beneath it stays put.
    expect(screen.queryByText('NO MATCHES')).toBeNull(); // hidden from a11y…
    expect(screen.queryByText('NO MATCHES', { includeHiddenElements: true })).toBeTruthy(); // …but present

    // the surrounding flow is byte-identical — the anchor + the create affordance occupy the layout in
    // BOTH states, so the spinner↔no-matches swap adds/removes NO in-flow node (it cannot shove the
    // hook). P2-d keys the prominence off the SAME predicate, so the lead is absent in both too.
    expect(fetchingShape).toEqual(settledShape);
    expect(settledShape.anchor).toBe(1);
    expect(settledShape.create).toBe(1);
    expect(settledShape.lead).toBe(0);
  });

  it('the spinner rides an ABSOLUTE overlay (out of flow) — the mechanism that kills the jar', () => {
    mockSearchState = { isFetching: true, data: undefined };
    const { UNSAFE_getByType } = renderAddGame();
    typeQuery();
    // the spinner's wrapping View is absolutely positioned, so it adds no height to the status slot.
    const overlay = UNSAFE_getByType(ActivityIndicator).parent;
    const style = StyleSheet.flatten(overlay?.props.style);
    expect(style?.position).toBe('absolute');
  });
});

describe('walk-4 P2-d: the create affordance earns its prominence from the results', () => {
  it('0 MATCHES → the GOLD stepped create key, and the "NONE OF THESE?" lead is dropped', () => {
    mockSearchState = { isFetching: false, data: { items: [] } };
    renderAddGame();
    typeQuery('Zelda');

    expect(screen.getByText('NO MATCHES')).toBeTruthy();
    expect(screen.queryByText('NONE OF THESE?')).toBeNull(); // there are no "these"
    // the gold ScreenButton — role BUTTON, bare label (no link chevron)
    expect(screen.getByText('CREATE “ZELDA”')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'CREATE “ZELDA”' })).toBeTruthy();
    expect(screen.queryByRole('link', { name: /CREATE/ })).toBeNull();
  });

  it('WITH MATCHES → the lead returns and create de-emphasizes to a TertiaryLink under it', () => {
    mockSearchState = { isFetching: false, data: { items: [ITEM('g1', 'Zelda: Echoes')] } };
    renderAddGame();
    typeQuery('Zelda');

    expect(screen.getByText('1 MATCH')).toBeTruthy();
    expect(screen.getByText('NONE OF THESE?')).toBeTruthy();
    // the quiet TertiaryLink (role LINK, the "› " view-more grammar) — no gold button any more
    expect(screen.getByRole('link', { name: 'CREATE “ZELDA” ›' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: /^CREATE “/ })).toBeNull();
    // the NO-MATCHES panel is gone entirely in this state (the fan owns the slot)
    expect(screen.queryByText('NO MATCHES', { includeHiddenElements: true })).toBeNull();
  });

  it('either affordance opens the CREATE form', () => {
    mockSearchState = { isFetching: false, data: { items: [ITEM('g1', 'Zelda: Echoes')] } };
    renderAddGame();
    typeQuery('Zelda');
    fireEvent.press(screen.getByRole('link', { name: 'CREATE “ZELDA” ›' }));
    expect(screen.getByText('CREATE A CATALOG ENTRY')).toBeTruthy();
  });
});

describe('walk-4 P2-b/P2-c: the CREATE form — locked name, optional genres', () => {
  function openCreate(q = 'Chained Echoes') {
    mockSearchState = { isFetching: false, data: { items: [] } };
    renderAddGame();
    typeQuery(q);
    fireEvent.press(screen.getByText(`CREATE “${q.toUpperCase()}”`));
  }

  it('P2-b: the Name is READ-ONLY, prefilled from the searched query (no editable input for it)', () => {
    openCreate();
    // the value renders, and it is a BUTTON — not a text input the user can retype
    expect(screen.getByText('Chained Echoes')).toBeTruthy();
    expect(screen.getByLabelText('Name: Chained Echoes. Change it in search.')).toBeTruthy();
    // the other CAT-02 fields are still real inputs (only the name is locked)
    expect(screen.getByLabelText('Studio')).toBeTruthy();
    expect(screen.queryByLabelText('Name')).toBeNull();
  });

  it('P2-b: tapping the locked Name routes BACK to search with the query preserved', () => {
    openCreate();
    fireEvent.press(screen.getByLabelText('Name: Chained Echoes. Change it in search.'));
    // back on the search view…
    expect(screen.queryByText('CREATE A CATALOG ENTRY')).toBeNull();
    // …with the query intact (the docked field still holds it, and the create hook still names it)
    expect(screen.getByPlaceholderText('Search the catalog').props.value).toBe('Chained Echoes');
    expect(screen.getByText('CREATE “CHAINED ECHOES”')).toBeTruthy();
  });

  it('P2-c: Create + add is ENABLED with no genre picked, and posts an empty genreIds', () => {
    openCreate();
    expect(screen.getByText('GENRE(S) — OPTIONAL')).toBeTruthy();
    fireEvent.press(screen.getByText('CREATE + ADD'));
    expect(mockCreate).toHaveBeenCalledWith({ name: 'Chained Echoes', genreIds: [] });
  });
});
