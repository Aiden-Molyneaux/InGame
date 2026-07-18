import React from 'react';
import { render as rtlRender, screen } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import prefsReducer from './store/prefsSlice';

// P10 — the CAT-12 FRIENDS-ARE-PLAYING rail on Add Game. The `/catalog/friends-active` endpoint is NOT
// live (404), so the rail renders an honest EXPECTED-empty with the cite, NEVER faked (0076 §0.8).

jest.mock('./store/api', () => ({
  useGetGenresQuery: () => ({ data: { items: [] } }),
  useGetPopularQuery: () => ({ data: { items: [] } }),
  useLazySearchCatalogQuery: () => [jest.fn(), { isFetching: false, data: undefined }],
  useCreateGameMutation: () => [jest.fn(), { isLoading: false }],
  useAddToCollectionMutation: () => [jest.fn(), { isLoading: false }],
  useUpdateEntryMutation: () => [jest.fn(), { isLoading: false }],
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

describe('CAT-12: FRIENDS-ARE-PLAYING rail (Add Game)', () => {
  it('renders the rail EXPECTED-empty with the cite (endpoint 404 — never faked)', () => {
    renderAddGame();
    expect(screen.getByText('FRIENDS ARE PLAYING')).toBeTruthy();
    expect(screen.getByText(/friends-active catalog feed lands/i)).toBeTruthy();
  });
});

describe('CAT-02 walk2-B8: the create-this-game prompt is GOLD + pixel-stepped (F-02)', () => {
  it('a query with no match renders the create prompt as ScreenButton/add (the gold stepped grammar)', () => {
    const { UNSAFE_getAllByType } = renderAddGame();
    const { fireEvent } = require('@testing-library/react-native');
    fireEvent.changeText(screen.getByPlaceholderText('Search the catalog'), 'Elden');
    // the be-first hook (CAT-02) — a GOLD stepped button, not the quiet tertiary it replaced
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
