import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import type { Relationship } from '@ingame/shared';
import prefsReducer from '../../store/prefsSlice';

// P9 — the relationship-chip matrix (all 4 states) + the ADD FRIEND live write + the 409 family. The
// mutation is mocked so this drives the chip logic without a store round-trip.

let mockUnwrap: () => Promise<unknown> = () => Promise.resolve({ ok: true });
const mockTrigger = jest.fn(() => ({ unwrap: mockUnwrap }));
let mockState = { isLoading: false };

jest.mock('../../store/friendApi', () => ({
  useCreateFriendRequestMutation: () => [mockTrigger, mockState],
}));

import { RelationshipAction } from './RelationshipAction';

function wrap(ui: React.ReactElement) {
  const store = configureStore({ reducer: { prefs: prefsReducer } });
  return <Provider store={store}>{ui}</Provider>;
}

const USER = 'friend-1111-1111-1111-111111111111';

function renderAction(relationship: Relationship) {
  return render(wrap(<RelationshipAction userId={USER} relationship={relationship} />));
}

describe('P9 RelationshipAction — the chip matrix + 409 family', () => {
  beforeEach(() => {
    mockTrigger.mockClear();
    mockUnwrap = () => Promise.resolve({ ok: true });
    mockState = { isLoading: false };
  });

  it('friend → the FRIEND tag (static, no button)', () => {
    renderAction('friend');
    expect(screen.getByText('FRIEND')).toBeTruthy();
    expect(screen.queryByText('ADD FRIEND')).toBeNull();
  });

  it('outgoing → REQUESTED (the sent state)', () => {
    renderAction('outgoing');
    expect(screen.getByText('REQUESTED')).toBeTruthy();
  });

  it('incoming → the respond-in-Friends hint (accept rides P8, not here)', () => {
    renderAction('incoming');
    expect(screen.getByText(/WANTS TO BE FRIENDS/)).toBeTruthy();
  });

  it('none → ADD FRIEND fires the live write with the target id', async () => {
    renderAction('none');
    fireEvent.press(screen.getByLabelText('Add friend'));
    await waitFor(() => expect(mockTrigger).toHaveBeenCalledWith(USER));
  });

  it('409 REQUEST_COOLDOWN → the disabled cooldown microcopy (no crash)', async () => {
    mockUnwrap = () =>
      Promise.reject({ status: 409, data: { error: { code: 'REQUEST_COOLDOWN', cooldownUntil: '2026-08-01T00:00:00Z' } } });
    renderAction('none');
    fireEvent.press(screen.getByLabelText('Add friend'));
    await waitFor(() => expect(screen.getByText('REQUEST ON COOLDOWN')).toBeTruthy());
    expect(screen.getByText(/You can send another request after/)).toBeTruthy();
  });

  it('409 ALREADY_FRIENDS → no error shown (the invalidation refetch settles the chip)', async () => {
    mockUnwrap = () => Promise.reject({ status: 409, data: { error: { code: 'ALREADY_FRIENDS' } } });
    renderAction('none');
    fireEvent.press(screen.getByLabelText('Add friend'));
    // give the rejection a tick to resolve, then assert no error / cooldown surfaced
    await waitFor(() => expect(mockTrigger).toHaveBeenCalled());
    expect(screen.queryByText('REQUEST ON COOLDOWN')).toBeNull();
    expect(screen.queryByText(/Couldn't send/)).toBeNull();
  });

  it('a generic failure → the retry microcopy', async () => {
    mockUnwrap = () => Promise.reject({ status: 500, data: { error: { code: 'SERVER_ERROR' } } });
    renderAction('none');
    fireEvent.press(screen.getByLabelText('Add friend'));
    await waitFor(() => expect(screen.getByText(/Couldn't send the request/)).toBeTruthy());
  });
});
