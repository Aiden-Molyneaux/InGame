import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import type { PersonSearchResult, SearchRelationship } from '@ingame/shared';
import prefsReducer from '../../store/prefsSlice';

let mockUnwrap: () => Promise<unknown> = () => Promise.resolve({ ok: true });
const mockTrigger = jest.fn(() => ({ unwrap: mockUnwrap }));
jest.mock('../../store/friendApi', () => ({
  useCreateFriendRequestMutation: () => [mockTrigger, { isLoading: false }],
}));

import { PersonRow } from './PersonRow';

const store = configureStore({ reducer: { prefs: prefsReducer } });
const wrap = (ui: React.ReactElement) => <Provider store={store}>{ui}</Provider>;

function person(relationship: SearchRelationship, over: Partial<PersonSearchResult> = {}): PersonSearchResult {
  return { userId: 'u-1', username: 'riptide', avatarUrl: null, avatarConfig: null, relationship, ...over };
}
function renderRow(p: PersonSearchResult, cb: Partial<React.ComponentProps<typeof PersonRow>> = {}) {
  return render(
    wrap(
      <PersonRow
        person={p}
        onProfile={cb.onProfile ?? jest.fn()}
        onRespondRequests={cb.onRespondRequests ?? jest.fn()}
        onError={cb.onError ?? jest.fn()}
        onManageBlocks={cb.onManageBlocks ?? jest.fn()}
      />,
    ),
  );
}

describe('PersonRow — the SOC-07 relationship spine', () => {
  beforeEach(() => {
    mockTrigger.mockClear();
    mockUnwrap = () => Promise.resolve({ ok: true });
  });

  it('none → + ADD; outgoing → REQUESTED; friend → FRIENDS; cooldown → disabled + reason; blocked → dimmed manage', () => {
    renderRow(person('none'));
    expect(screen.getByLabelText('Add riptide')).toBeTruthy();

    renderRow(person('outgoing'));
    expect(screen.getByText('REQUESTED')).toBeTruthy();

    renderRow(person('friend'));
    expect(screen.getByText('FRIENDS')).toBeTruthy();

    renderRow(person('cooldown', { cooldownUntil: '2999-01-01T00:00:00Z' }));
    expect(screen.getByText(/TRY AGAIN/)).toBeTruthy();

    renderRow(person('blocked'));
    expect(screen.getByText('MANAGE IN SETTINGS')).toBeTruthy();
  });

  it('incoming → taps through to the requests inbox (accept needs the requestId — not on this shape)', () => {
    const onRespond = jest.fn();
    renderRow(person('incoming'), { onRespondRequests: onRespond });
    fireEvent.press(screen.getByLabelText('Respond to riptide'));
    expect(onRespond).toHaveBeenCalled();
  });

  it('none → ADD fires the live write; on success the REQUESTED state-flip is the SOLE signal (walk-2: no success toast)', async () => {
    renderRow(person('none'));
    fireEvent.press(screen.getByLabelText('Add riptide'));
    await waitFor(() => expect(mockTrigger).toHaveBeenCalledWith('u-1'));
    await waitFor(() => expect(screen.getByText('REQUESTED')).toBeTruthy());
  });

  it('409 REQUEST_COOLDOWN → flips to the disabled cooldown reason (no crash)', async () => {
    mockUnwrap = () => Promise.reject({ data: { error: { code: 'REQUEST_COOLDOWN', cooldownUntil: '2999-01-01T00:00:00Z' } } });
    renderRow(person('none'));
    fireEvent.press(screen.getByLabelText('Add riptide'));
    await waitFor(() => expect(screen.getByText(/TRY AGAIN/)).toBeTruthy());
  });

  it('friend row → tapping the row opens the profile', () => {
    const onProfile = jest.fn();
    renderRow(person('friend'), { onProfile });
    fireEvent.press(screen.getByLabelText('riptide profile'));
    expect(onProfile).toHaveBeenCalledWith('u-1');
  });

  it('walk2-N7 — a NON-FRIEND (none) row also opens the profile (the limited profile hosts ADD FRIEND)', () => {
    const onProfile = jest.fn();
    renderRow(person('none'), { onProfile });
    // the row (avatar+name) routes regardless of relationship; the ADD button stays separate
    fireEvent.press(screen.getByLabelText('riptide profile'));
    expect(onProfile).toHaveBeenCalledWith('u-1');
    expect(screen.getByLabelText('Add riptide')).toBeTruthy();
  });

  // W-4 (murr completion) — the row's avatarConfig reaches the shared <Avatar>, so a search/roster row
  // renders the person's FORGED monogram, not the default. Null ⇒ the byte-identical default.
  it('renders the row person’s forged monogram (config colour pair + glyph) when avatarConfig is set', () => {
    const { toJSON } = renderRow(
      person('friend', { avatarConfig: { bg: '#101018', ink: '#ffd23f', glyph: 'RT' } }),
    );
    const tree = JSON.stringify(toJSON());
    expect(tree).toContain('#101018'); // bg
    expect(tree).toContain('#ffd23f'); // ink
    expect(tree).toContain('RT'); // the glyph override, not the derived RI
  });

  it('falls back to the default monogram (derived initials, no config colours) when avatarConfig is null', () => {
    const { toJSON } = renderRow(person('friend', { avatarConfig: null }));
    const tree = JSON.stringify(toJSON());
    expect(tree).toContain('RI'); // derived from "riptide"
    expect(tree).not.toContain('#101018'); // no forged colour pair leaked in
  });
});
