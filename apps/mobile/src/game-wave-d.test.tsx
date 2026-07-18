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
//   D-4 — ADD TO COLLECTION carries the pixel-stepped silhouette, orange /primary (0069, not gold).

const mockAdd = jest.fn(() => ({ unwrap: () => Promise.resolve({}) }));
const mockQueue = jest.fn(() => ({ unwrap: () => Promise.resolve({}) }));

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), back: jest.fn(), navigate: jest.fn() }),
}));
jest.mock('./store/api', () => ({ useAddToCollectionMutation: () => [mockAdd, { isLoading: false }] }));
jest.mock('./store/queueApi', () => ({ useAddQueueItemMutation: () => [mockQueue, { isLoading: false }] }));
// AboutTab is REAL (D-3 order) — mock ONLY its data hooks.
jest.mock('./store/catalogRailsApi', () => ({
  useGetGameDetailQuery: () => ({
    data: {
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
    },
    isLoading: false,
    isError: false,
    refetch: jest.fn(),
  }),
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

describe('W-D1 D-4 — the CATALOG ADD TO COLLECTION button is orange /primary + STEPPED', () => {
  it('carries the stepped silhouette, kept /primary (0069, not gold)', () => {
    const { UNSAFE_getAllByType } = renderCatalog();
    const add = UNSAFE_getAllByType(ScreenButton).find((b) =>
      String(b.props.label).toLowerCase().includes('add to collection'),
    );
    expect(add).toBeTruthy();
    expect(add!.props.variant).toBe('primary'); // orange, non-acquisitive (NOT gold/add)
    expect(add!.props.stepped).toBe(true); // the pixel-stepped corners
    expect(screen.getByText('NOT IN YOUR COLLECTION')).toBeTruthy();
  });
});
