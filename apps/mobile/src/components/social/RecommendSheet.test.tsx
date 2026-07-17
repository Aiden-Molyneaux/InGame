import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import prefsReducer from '../../store/prefsSlice';

jest.mock('../../a11y/useReducedMotion', () => ({ useReducedMotion: () => true }));
jest.mock('../EntryCard', () => {
  const { Text } = require('react-native');
  return { EntryCard: ({ title }: { title: string }) => <Text>{`CARD:${title}`}</Text> };
});

const COLLECTION = {
  items: [
    { gameId: 'g-1', title: 'Hades', card: { id: 'default', imageUrl: null } },
    { gameId: 'g-2', title: 'Celeste', card: { id: 'default', imageUrl: null } },
  ],
};
jest.mock('../../store/api', () => ({
  useGetCollectionQuery: () => ({ data: COLLECTION, isLoading: false }),
}));

let mockUnwrap: () => Promise<unknown> = () => Promise.resolve({ ok: true });
const mockCreate = jest.fn(() => ({ unwrap: mockUnwrap }));
jest.mock('../../store/recommendationApi', () => ({
  useCreateRecommendationMutation: () => [mockCreate, { isLoading: false }],
}));

import { RecommendSheet } from './RecommendSheet';

const store = configureStore({ reducer: { prefs: prefsReducer } });
const wrap = (ui: React.ReactElement) => <Provider store={store}>{ui}</Provider>;

function renderSheet(over: Partial<React.ComponentProps<typeof RecommendSheet>> = {}) {
  const cb = { onClose: jest.fn(), onSent: jest.fn(), onError: jest.fn(), ...over };
  render(wrap(<RecommendSheet visible toUserId="u-1" toUsername="riko" {...cb} />));
  return cb;
}

describe('RecommendSheet — SOC-05 minimal compose (OQ-075)', () => {
  beforeEach(() => {
    mockCreate.mockClear();
    mockUnwrap = () => Promise.resolve({ ok: true });
  });

  it('SEND is dormant until a game is picked (validation)', () => {
    renderSheet();
    fireEvent.press(screen.getByText('SEND RECOMMENDATION'));
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it('pick a game + send → POST /recommendations with { toUserId, gameId }', async () => {
    const onSent = jest.fn();
    renderSheet({ onSent });
    fireEvent.press(screen.getByLabelText('Hades'));
    fireEvent.press(screen.getByText('SEND RECOMMENDATION'));
    await waitFor(() => expect(mockCreate).toHaveBeenCalledWith({ toUserId: 'u-1', gameId: 'g-1', note: undefined }));
    await waitFor(() => expect(onSent).toHaveBeenCalledWith('riko'));
  });

  it('409 NOT_FRIENDS → the error is surfaced', async () => {
    mockUnwrap = () => Promise.reject({ data: { error: { code: 'NOT_FRIENDS' } } });
    const onError = jest.fn();
    renderSheet({ onError });
    fireEvent.press(screen.getByLabelText('Celeste'));
    fireEvent.press(screen.getByText('SEND RECOMMENDATION'));
    await waitFor(() => expect(onError).toHaveBeenCalledWith('You can only recommend to friends.'));
  });
});
