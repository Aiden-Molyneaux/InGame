import React from 'react';
import { render as rtlRender, screen, fireEvent } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import prefsReducer from './store/prefsSlice';

// walk2 N2b — the Add-Game pre-query rail TRIO (POPULAR / NEW RELEASES CAT-11 / FRIENDS ARE PLAYING
// CAT-12), live off the now-built endpoints (the "lands soon" placeholder retired). Each is a capped
// CardFan with its own focus + ADD; FRIENDS shows the quiet rail-empty (not a placeholder) when none.

const ITEM = (id: string, name: string, over: Record<string, unknown> = {}) => ({
  id,
  name,
  studio: 'Studio',
  publisher: null,
  releaseDate: '2024-01-01',
  genres: [],
  collectionsCount: 1,
  friendsHaveCount: 0,
  inCollection: false,
  contributor: { userId: 'u1', username: 'curator' },
  ...over,
});

let mockPopular: { data?: { items: unknown[] } } = { data: { items: [ITEM('p1', 'Elden Ring')] } };
let mockNewReleases: { data?: { items: unknown[] } } = { data: { items: [ITEM('n1', 'Nightreign')] } };
let mockFriendsActive: { data?: { items: unknown[] } } = { data: { items: [] } };
const mockAdd = jest.fn(() => ({ unwrap: () => Promise.resolve({}) }));

jest.mock('./store/api', () => ({
  useGetGenresQuery: () => ({ data: { items: [] } }),
  useGetPopularQuery: () => mockPopular,
  useLazySearchCatalogQuery: () => [jest.fn(), { isFetching: false, data: undefined }],
  useCreateGameMutation: () => [jest.fn(), { isLoading: false }],
  useAddToCollectionMutation: () => [mockAdd, { isLoading: false }],
  useUpdateEntryMutation: () => [jest.fn(), { isLoading: false }],
}));
jest.mock('./store/catalogRailsApi', () => ({
  useGetNewReleasesQuery: () => mockNewReleases,
  useGetFriendsActiveQuery: () => mockFriendsActive,
}));
jest.mock('expo-router', () => ({ useRouter: () => ({ push: jest.fn(), back: jest.fn(), replace: jest.fn() }) }));

import AddGame from '../app/add-game';
import { ScreenButton } from './components/ScreenButton';

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
  mockPopular = { data: { items: [ITEM('p1', 'Elden Ring')] } };
  mockNewReleases = { data: { items: [ITEM('n1', 'Nightreign')] } };
  mockFriendsActive = { data: { items: [] } };
});

describe('walk2 N2b: the Add-Game rail trio (POPULAR · NEW RELEASES · FRIENDS ARE PLAYING)', () => {
  it('NEW RELEASES (CAT-11) renders live off its query', () => {
    renderAddGame();
    expect(screen.getByText('NEW RELEASES')).toBeTruthy();
    // the focused card's meta names the game (CAT-11 rail is live, not a placeholder)
    expect(screen.getByText(/NIGHTREIGN/)).toBeTruthy();
  });

  it('FRIENDS ARE PLAYING (CAT-12) renders its rows when the caller has friends-active games', () => {
    mockFriendsActive = { data: { items: [ITEM('f1', 'Ratchet', { friendsHaveCount: 2 })] } };
    renderAddGame();
    expect(screen.getByText('FRIENDS ARE PLAYING')).toBeTruthy();
    expect(screen.getByText(/RATCHET/)).toBeTruthy();
    // NOT the retired "soon" placeholder
    expect(screen.queryByText(/friends-active catalog feed lands|lands soon|arrives here soon/i)).toBeNull();
  });

  it('FRIENDS ARE PLAYING shows the quiet rail-EMPTY (not a placeholder) when the caller has none', () => {
    mockFriendsActive = { data: { items: [] } };
    renderAddGame();
    expect(screen.getByText('FRIENDS ARE PLAYING')).toBeTruthy();
    expect(screen.getByText(/add a friend to see their games/i)).toBeTruthy();
  });

  it('the rails are HIDDEN while querying (search overwrites them)', () => {
    renderAddGame();
    fireEvent.changeText(screen.getByPlaceholderText('Search the catalog'), 'Zelda');
    expect(screen.queryByText('NEW RELEASES')).toBeNull();
    expect(screen.queryByText('FRIENDS ARE PLAYING')).toBeNull();
    expect(screen.queryByText('POPULAR FIRST ADDS')).toBeNull();
  });

  it('a rail ADD routes through the collection mutation (tap-to-add)', () => {
    renderAddGame();
    // the POPULAR rail's ADD (its focused card = Elden Ring, p1)
    const adds = screen.getAllByText('ADD TO COLLECTION');
    expect(adds.length).toBeGreaterThanOrEqual(2); // one per non-empty rail
    fireEvent.press(adds[0]!);
    expect(mockAdd).toHaveBeenCalledWith({ gameId: 'p1' });
  });
});

describe('CAT-02 walk2-B8: the create-this-game prompt is GOLD + pixel-stepped (F-02)', () => {
  it('a query with no match renders the create prompt as ScreenButton/add (the gold stepped grammar)', () => {
    const { UNSAFE_getAllByType } = renderAddGame();
    fireEvent.changeText(screen.getByPlaceholderText('Search the catalog'), 'Elden');
    expect(screen.getByText('NONE OF THESE?')).toBeTruthy();
    const create = UNSAFE_getAllByType(ScreenButton).find((b) =>
      String(b.props.label).startsWith('Create'),
    );
    expect(create).toBeTruthy();
    // variant 'add' IS the F-02 acquisitive grammar by construction: brand-gold fill + the
    // steppedRectPath pixel-stepped silhouette (consumed, never hand-drawn).
    expect(create!.props.variant).toBe('add');
  });
});
