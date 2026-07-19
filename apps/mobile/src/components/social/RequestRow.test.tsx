import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import type { FriendRequestItem } from '@ingame/shared';
import prefsReducer from '../../store/prefsSlice';
import { RequestRow } from './RequestRow';

const store = configureStore({ reducer: { prefs: prefsReducer } });
const wrap = (ui: React.ReactElement) => <Provider store={store}>{ui}</Provider>;

const ITEM: FriendRequestItem = {
  requestId: 'req-1',
  person: { userId: 'u-1', username: 'nova', avatarUrl: null, avatarConfig: null, relationship: 'incoming' },
  createdAt: '2026-07-15T12:00:00Z',
};

describe('RequestRow — SOC-08 request lifecycle actions', () => {
  it('incoming → ACCEPT / DECLINE fire with the item (requestId + userId)', () => {
    const onAccept = jest.fn();
    const onDecline = jest.fn();
    render(wrap(<RequestRow item={ITEM} kind="incoming" onAccept={onAccept} onDecline={onDecline} onProfile={jest.fn()} />));
    fireEvent.press(screen.getByLabelText('Accept nova'));
    expect(onAccept).toHaveBeenCalledWith(ITEM);
    fireEvent.press(screen.getByLabelText('Decline nova'));
    expect(onDecline).toHaveBeenCalledWith(ITEM);
  });

  it('outgoing → CANCEL fires with the item', () => {
    const onCancel = jest.fn();
    render(wrap(<RequestRow item={ITEM} kind="outgoing" onCancel={onCancel} onProfile={jest.fn()} />));
    fireEvent.press(screen.getByLabelText('Cancel request to nova'));
    expect(onCancel).toHaveBeenCalledWith(ITEM);
  });

  it('avatar tap → onProfile(userId)', () => {
    const onProfile = jest.fn();
    render(wrap(<RequestRow item={ITEM} kind="incoming" onProfile={onProfile} />));
    fireEvent.press(screen.getByLabelText('nova profile'));
    expect(onProfile).toHaveBeenCalledWith('u-1');
  });
});
