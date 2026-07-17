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

describe('CAT-12: FRIENDS-ARE-PLAYING rail (Add Game)', () => {
  it('renders the rail EXPECTED-empty with the cite (endpoint 404 — never faked)', () => {
    const store = configureStore({ reducer: { prefs: prefsReducer } });
    rtlRender(
      <Provider store={store}>
        <AddGame />
      </Provider>,
    );
    expect(screen.getByText('FRIENDS ARE PLAYING')).toBeTruthy();
    expect(screen.getByText(/friends-active catalog feed lands/i)).toBeTruthy();
  });
});
