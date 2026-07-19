import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import prefsReducer from './store/prefsSlice';

// W-D1 D-3 + D-4 — the CATALOG posture's ABOUT ORDER + the STEPPED ADD button, driven on the REAL
// CatalogGamePage with the REAL AboutTab (so the section sequence is observable) and the REAL
// ScreenButton (so the `stepped` prop is queryable via UNSAFE type-lookup).
//
//   D-3 — ABOUT order: canonical game INFO → the NOT-IN-YOUR-COLLECTION prompt (+ ADD CTA) → the
//         FRIENDS-WHO-OWN list. The band rides AboutTab's `beforeFriends` slot (was pinned above the tab).
//   D-4 — ADD TO COLLECTION wears the GOLD `add` grammar (intrinsically stepped), matching the
//         Add-Game rail (owner reversed the D-4 orange→gold 2026-07-19).

const mockAdd = jest.fn(() => ({ unwrap: () => Promise.resolve({}) }));
const mockQueue = jest.fn(() => ({ unwrap: () => Promise.resolve({}) }));

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), back: jest.fn(), navigate: jest.fn() }),
}));
// W-6 — AboutTab now also reads me (the A1 pre-gate) + genres (the chip editor); undefined keeps
// the EDIT key live and inert — this suite doesn't exercise the edit mode (AboutTab.edit.test.tsx does).
jest.mock('./store/api', () => ({
  useAddToCollectionMutation: () => [mockAdd, { isLoading: false }],
  useGetMeQuery: () => ({ data: undefined }),
  useGetGenresQuery: () => ({ data: undefined }),
}));
jest.mock('./store/queueApi', () => ({ useAddQueueItemMutation: () => [mockQueue, { isLoading: false }] }));
// AboutTab is REAL (D-3 order) — mock ONLY its data hooks. The game-detail result is SWITCHABLE so F1
// can drive the loading / error branches (the CATALOG band must survive a facts-fetch failure).
const GAME_DETAIL = {
  id: 'g1',
  name: 'Destiny',
  studio: 'Bungie',
  publisher: 'Bungie',
  releaseDate: '2014-09-09',
  genres: [{ id: 'gn', name: 'Shooter' }],
  collectionsCount: 214,
  friendsHaveCount: 2,
  inCollection: false,
  contributor: { userId: 'c1', username: 'maverick' },
  friendsWhoOwn: [],
};
let mockGameDetail: { data?: unknown; isLoading: boolean; isError: boolean; refetch: () => void } = {
  data: GAME_DETAIL,
  isLoading: false,
  isError: false,
  refetch: jest.fn(),
};
jest.mock('./store/catalogRailsApi', () => ({
  useGetGameDetailQuery: () => mockGameDetail,
  useSubmitGameEditMutation: () => [jest.fn(), { isLoading: false }], // W-6 — inert here
}));
jest.mock('./store/friendApi', () => ({
  useGetFriendsWhoOwnQuery: () => ({
    data: { friendsWhoOwn: [{ userId: 'f1', username: 'riko', avatarUrl: null, hours: 240 }], count: 1 },
    isLoading: false,
  }),
}));
jest.mock('./components/game/CommunityGallery', () => ({ CommunityGallery: () => null }));
jest.mock('./components/game/GameTabDock', () => ({ GameTabDock: () => null }));
jest.mock('./components/lifecycle/Toast', () => ({ Toast: () => null }));

import { CatalogGamePage } from './components/game/CatalogGamePage';
import { ScreenButton } from './components/ScreenButton';

function renderCatalog() {
  const store = configureStore({ reducer: { prefs: prefsReducer } });
  return render(
    <Provider store={store}>
      <CatalogGamePage gameId="g1" />
    </Provider>,
  );
}

beforeEach(() => {
  mockGameDetail = { data: GAME_DETAIL, isLoading: false, isError: false, refetch: jest.fn() };
});

describe('W-D1 D-3 — CATALOG ABOUT order: info → not-in-collection → friends-who-own', () => {
  it('the NOT-IN-COLLECTION prompt sits UNDER the game info and ABOVE the friends list', () => {
    const { toJSON } = renderCatalog();
    const tree = JSON.stringify(toJSON());
    const idxInfo = tree.indexOf('ADDED TO THE CATALOG BY'); // CAT-05 credit — canonical game info
    const idxBand = tree.indexOf('NOT IN YOUR COLLECTION'); // the prompt + ADD CTA
    const idxFriends = tree.indexOf('FRIENDS WHO OWN IT'); // the CAT-09c list
    expect(idxInfo).toBeGreaterThanOrEqual(0);
    expect(idxBand).toBeGreaterThanOrEqual(0);
    expect(idxFriends).toBeGreaterThanOrEqual(0);
    expect(idxInfo).toBeLessThan(idxBand); // info before the prompt
    expect(idxBand).toBeLessThan(idxFriends); // the prompt before friends-who-own
  });
});

describe('W-D1 D-4 — the CATALOG ADD TO COLLECTION button is GOLD (add), matching the rail (owner reversed orange→gold 2026-07-19)', () => {
  it('wears the gold `add` grammar (F-02 gold + intrinsic step)', () => {
    const { UNSAFE_getAllByType } = renderCatalog();
    const add = UNSAFE_getAllByType(ScreenButton).find((b) =>
      String(b.props.label).toLowerCase().includes('add to collection'),
    );
    expect(add).toBeTruthy();
    expect(add!.props.variant).toBe('add'); // gold, intrinsically stepped — matches the Add-Game rail
    expect(screen.getByText('NOT IN YOUR COLLECTION')).toBeTruthy();
  });
});

describe('W-D1 F1 — the CATALOG band survives a game-detail fetch that lags or fails', () => {
  it('game-detail LOADING → the NOT-IN-COLLECTION band + ADD CTA still render (above the skeleton)', () => {
    mockGameDetail = { data: undefined, isLoading: true, isError: false, refetch: jest.fn() };
    renderCatalog();
    expect(screen.getByText('NOT IN YOUR COLLECTION')).toBeTruthy();
    expect(screen.getByText('+ ADD TO COLLECTION')).toBeTruthy();
  });

  it('game-detail ERROR → the NOT-IN-COLLECTION band + ADD CTA still render (above the LoadError)', () => {
    mockGameDetail = { data: undefined, isLoading: false, isError: true, refetch: jest.fn() };
    renderCatalog();
    // the key action is reachable even though the facts failed (pre-D-3 the band was a sibling above)
    expect(screen.getByText('NOT IN YOUR COLLECTION')).toBeTruthy();
    expect(screen.getByText('+ ADD TO COLLECTION')).toBeTruthy();
    // we're genuinely in the ERROR branch (not success): the success-only game facts are absent
    expect(screen.queryByText('ADDED TO THE CATALOG BY')).toBeNull();
  });
});
