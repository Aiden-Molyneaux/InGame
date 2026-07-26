import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import type { ResolveInviteResponse, Relationship } from '@ingame/shared';
import prefsReducer from './store/prefsSlice';

// P8 — the SOC-10 InviteLanding: relationship-aware one-tap ADD + the expired terminal.
let mockResolveState: { data?: ResolveInviteResponse; isLoading: boolean; isError: boolean; error?: unknown } = {
  isLoading: true,
  isError: false,
};
jest.mock('./store/inviteApi', () => ({ useResolveInviteQuery: () => mockResolveState }));

let mockUnwrap: () => Promise<unknown> = () => Promise.resolve({ ok: true });
const mockCreate = jest.fn(() => ({ unwrap: mockUnwrap }));
jest.mock('./store/friendApi', () => ({ useCreateFriendRequestMutation: () => [mockCreate, { isLoading: false }] }));

const mockPush = jest.fn();
const mockReplace = jest.fn();
const mockCanGoBack = jest.fn(() => false);
jest.mock('expo-router', () => ({
  useLocalSearchParams: () => ({ token: 'tok-123' }),
  useRouter: () => ({ push: mockPush, back: jest.fn(), replace: mockReplace, canGoBack: mockCanGoBack, navigate: jest.fn() }),
}));
jest.mock('./a11y/useReducedMotion', () => ({ useReducedMotion: () => true }));

import InviteLanding from '../app/invite/[token]';

const store = configureStore({ reducer: { prefs: prefsReducer } });
const wrap = (ui: React.ReactElement) => <Provider store={store}>{ui}</Provider>;

function resolved(relationship: Relationship, avatarConfig: ResolveInviteResponse['sender']['avatarConfig'] = null): ResolveInviteResponse {
  return {
    token: 'tok-123',
    sender: { userId: 'sender-1', username: 'hollowmatt', avatarUrl: null, avatarConfig },
    relationship,
    prefilledRequest: { toUserId: 'sender-1' },
  };
}

describe('InviteLanding — SOC-10 relationship-aware one-tap ADD', () => {
  beforeEach(() => {
    mockCreate.mockClear();
    mockPush.mockClear();
    mockUnwrap = () => Promise.resolve({ ok: true });
  });

  it('none → the prefilled ADD; pressing it fires the request with the sender id → REQUEST SENT', async () => {
    mockResolveState = { data: resolved('none'), isLoading: false, isError: false };
    render(wrap(<InviteLanding />));
    expect(screen.getByText('INVITED YOU TO CONNECT')).toBeTruthy();
    fireEvent.press(screen.getByText('ADD HOLLOWMATT'));
    await waitFor(() => expect(mockCreate).toHaveBeenCalledWith('sender-1'));
    await waitFor(() => expect(screen.getByText('REQUEST SENT')).toBeTruthy());
  });

  it('already friend → NO duplicate ADD, only VIEW THEIR PROFILE', () => {
    mockResolveState = { data: resolved('friend'), isLoading: false, isError: false };
    render(wrap(<InviteLanding />));
    expect(screen.getByText("YOU'RE ALREADY FRIENDS")).toBeTruthy();
    expect(screen.queryByText('ADD HOLLOWMATT')).toBeNull();
    expect(screen.getByText('VIEW THEIR PROFILE')).toBeTruthy();
  });

  it('outgoing → no ADD (request already sent copy)', () => {
    mockResolveState = { data: resolved('outgoing'), isLoading: false, isError: false };
    render(wrap(<InviteLanding />));
    expect(screen.getByText('REQUEST ALREADY SENT')).toBeTruthy();
    expect(screen.queryByText('ADD HOLLOWMATT')).toBeNull();
  });

  it('INVITE_EXPIRED / INVALID (409) → the expired terminal', () => {
    mockResolveState = { isLoading: false, isError: true, error: { status: 409 } };
    render(wrap(<InviteLanding />));
    expect(screen.getByText('LINK EXPIRED OR INVALID')).toBeTruthy();
  });

  // Walk-4 takeover review (the P1-c class, the invite-resolve site) — inviteSenderSchema never carried
  // avatarConfig, so the sender's forged monogram rendered as the plain default initials on this landing.
  // The configured Avatar carries the "<username> monogram" a11y label (the landed requests-banner
  // precedent); a null config keeps the default (unlabelled) box.
  it('a sender with a forged avatarConfig renders the monogram (not the default)', () => {
    mockResolveState = {
      data: resolved('none', { bg: '#2a1f4d', ink: '#e8c14a', glyph: 'HM', frame: 'ring' }),
      isLoading: false,
      isError: false,
    };
    render(wrap(<InviteLanding />));
    expect(screen.getByLabelText('hollowmatt monogram')).toBeTruthy();
  });

  it('a config-less sender keeps the default monogram', () => {
    mockResolveState = { data: resolved('none'), isLoading: false, isError: false };
    render(wrap(<InviteLanding />));
    expect(screen.queryByLabelText('hollowmatt monogram')).toBeNull();
  });
});
