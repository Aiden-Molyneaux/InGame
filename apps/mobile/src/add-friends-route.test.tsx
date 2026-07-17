import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import prefsReducer from './store/prefsSlice';

// P8 walk-1 (owner ruling) — the Add Friends hub carries ONE invite entry (link + QR both live on the
// one invite page), not two buttons to the same destination.

const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush, back: jest.fn(), replace: jest.fn(), navigate: jest.fn() }),
}));
jest.mock('./a11y/useReducedMotion', () => ({ useReducedMotion: () => true }));
jest.mock('./store/friendApi', () => ({
  useLazySearchUsersQuery: () => [jest.fn(), { data: undefined, isFetching: false }],
  useGetFriendRequestsQuery: () => ({ data: { incoming: [], outgoing: [] } }),
  useAcceptFriendRequestMutation: () => [jest.fn(), { isLoading: false }],
  useDeclineFriendRequestMutation: () => [jest.fn(), { isLoading: false }],
}));

import AddFriends from '../app/add-friends';

const store = configureStore({ reducer: { prefs: prefsReducer } });
const wrap = (ui: React.ReactElement) => <Provider store={store}>{ui}</Provider>;

describe('Add Friends hub — walk-1: one invite entry', () => {
  beforeEach(() => mockPush.mockClear());

  it('renders exactly ONE invite entry (no separate QR button) and it routes to the invite page', () => {
    render(wrap(<AddFriends />));
    const invite = screen.getByText('INVITE A FRIEND');
    expect(invite).toBeTruthy();
    expect(screen.queryByText('INVITE LINK')).toBeNull();
    expect(screen.queryByText('QR CODE')).toBeNull();
    fireEvent.press(invite);
    expect(mockPush).toHaveBeenCalledWith('/invite-friends');
  });
});
