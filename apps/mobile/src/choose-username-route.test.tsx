import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import authReducer, { setSession } from './store/authSlice';
import prefsReducer from './store/prefsSlice';
import { api } from './store/api';
import './store/profileApi'; // side-effect: injects patchMe into the base `api` slice
import type { SelfProfile } from '@ingame/shared';

// AUTH-09 (auth-epic P-E) — CHOOSE YOUR HANDLE, the SIWA completion screen. Fetch-layer mock against a
// REAL store (the forgot-password harness idiom) so the "gate clears" assertion reads the actual auth
// slice. Covers: the debounced ADVISORY availability beat (AUTH-11), taken/screened inline states, the
// authoritative PATCH /me claim, and the concurrent-claim race (the DB unique violation the advisory
// check missed → the server's username_taken VALIDATION_ERROR) surfaced inline.

const mockRouter = { push: jest.fn(), replace: jest.fn(), back: jest.fn(), navigate: jest.fn() };
jest.mock('expo-router', () => ({ useRouter: () => mockRouter, router: mockRouter }));

import ChooseUsername from '../app/choose-username';

// A strict-schema-valid self-shape (selfProfileSchema — profileApi PARSES the PATCH /me response).
const SELF = (over: Record<string, unknown> = {}) =>
  ({
    id: '00000000-0000-4000-8000-000000000001',
    username: 'apple_1a2b3c',
    avatarUrl: null,
    avatarConfig: null,
    bio: '',
    memberSince: '2026-01-01T00:00:00.000Z',
    privacy: 'friends',
    role: 'user',
    adminTier: null,
    usernamePending: true,
    emailVerified: true,
    favouriteGameId: null,
    favouriteGenreIds: [],
    gamertags: [],
    usernameNextChangeAt: null,
    stats: { games: 0, hours: 0, completionPct: 0, cardsDesigned: 0, adoptionsReceived: 0, friends: 0 },
    cardsPublished: 0,
    favouriteGame: null,
    nowPlaying: null,
    top10: [],
    ...over,
  }) as unknown as SelfProfile;

type RouteKey = 'availability' | 'patchMe' | 'other';
type ResponseSpec = { status: number; body: unknown };
interface RecordedCall {
  key: RouteKey;
  url: string;
  method: string;
  body: Record<string, unknown> | undefined;
}

let routes: Partial<Record<RouteKey, ResponseSpec>>;
let calls: RecordedCall[];

function fetchResponse(spec: ResponseSpec) {
  const text = JSON.stringify(spec.body);
  return {
    status: spec.status,
    ok: spec.status >= 200 && spec.status < 300,
    headers: {
      get: (k: string) => (k.toLowerCase() === 'content-type' ? 'application/json' : null),
    },
    text: async () => text,
    json: async () => JSON.parse(text),
    clone() {
      return fetchResponse(spec);
    },
  };
}

function keyOf(url: string, method: string): RouteKey {
  if (url.includes('/auth/username-available')) return 'availability';
  if (/\/me$/.test(url) && method.toUpperCase() === 'PATCH') return 'patchMe';
  return 'other';
}

const realFetch = global.fetch;

beforeEach(() => {
  routes = {};
  calls = [];
  mockRouter.push.mockClear();
  mockRouter.replace.mockClear();
  const fetchMock = jest.fn(async (req: Request) => {
    const method = req.method ?? 'GET';
    let body: Record<string, unknown> | undefined;
    try {
      body = await req.clone().json();
    } catch {
      body = undefined;
    }
    const key = keyOf(req.url, method);
    calls.push({ key, url: req.url, method, body });
    return fetchResponse(routes[key] ?? { status: 200, body: { ok: true } });
  });
  global.fetch = fetchMock as unknown as typeof fetch;
});
afterEach(() => {
  global.fetch = realFetch;
});

function renderScreen() {
  const store = configureStore({
    reducer: { auth: authReducer, prefs: prefsReducer, [api.reducerPath]: api.reducer },
    middleware: (getDefault) => getDefault().concat(api.middleware),
  });
  // the arriving state: a live SIWA session whose self-shape is still pending (the index gate sent us here)
  store.dispatch(setSession({ accessToken: 'acc', refreshToken: 'ref', user: SELF() }));
  const utils = render(
    <Provider store={store}>
      <ChooseUsername />
    </Provider>,
  );
  return { store, ...utils };
}

const availabilityCalls = () => calls.filter((c) => c.key === 'availability');
const patchCalls = () => calls.filter((c) => c.key === 'patchMe');

// walk-4 P5-j — several cases here chain a debounce + a couple of `waitFor`s; past the 5s default
// under a loaded parallel run (the same known flake class styler-ultimate-colors.test.tsx hit).
// Generous, not masking.
jest.setTimeout(20000);

describe('choose-username — the AUTH-09 completion screen (P-E)', () => {
  it('AUTH-11 — the availability check is DEBOUNCED: rapid typing yields one call, for the final candidate', async () => {
    routes.availability = { status: 200, body: { available: true } };
    renderScreen();

    const field = screen.getByLabelText('Username');
    fireEvent.changeText(field, 'pla');
    fireEvent.changeText(field, 'play');
    fireEvent.changeText(field, 'player_one');

    await waitFor(() => expect(screen.getByText('USERNAME AVAILABLE')).toBeTruthy(), {
      timeout: 2000,
    });
    expect(availabilityCalls()).toHaveLength(1);
    expect(availabilityCalls()[0].url).toContain('u=player_one');
  });

  it('AUTH-11 — a taken name reads NOT AVAILABLE; a screened name reads NOT ALLOWED (sign-in grammar)', async () => {
    routes.availability = { status: 200, body: { available: false, reason: 'taken' } };
    const first = renderScreen();
    fireEvent.changeText(screen.getByLabelText('Username'), 'taken_name');
    await waitFor(() => expect(screen.getByText('USERNAME NOT AVAILABLE')).toBeTruthy(), {
      timeout: 2000,
    });
    first.unmount();

    calls = [];
    routes.availability = { status: 200, body: { available: false, reason: 'screened' } };
    renderScreen();
    fireEvent.changeText(screen.getByLabelText('Username'), 'screened_name');
    await waitFor(() => expect(screen.getByText('USERNAME NOT ALLOWED')).toBeTruthy(), {
      timeout: 2000,
    });
  });

  it('AUTH-09 — a successful claim PATCHes /me, clears the gate in the auth slice, and enters the tabs', async () => {
    routes.availability = { status: 200, body: { available: true } };
    routes.patchMe = {
      status: 200,
      body: SELF({ username: 'player_one', usernamePending: false }),
    };
    const { store } = renderScreen();

    fireEvent.changeText(screen.getByLabelText('Username'), 'player_one');
    fireEvent.press(screen.getByText('CLAIM HANDLE'));

    await waitFor(() => expect(mockRouter.replace).toHaveBeenCalledWith('/(tabs)/collection'));
    expect(patchCalls()[0].body).toEqual({ username: 'player_one' });
    // the gate is CLEARED in live state — index.tsx reads this exact field
    expect(store.getState().auth.user?.usernamePending).toBe(false);
    expect(store.getState().auth.user?.username).toBe('player_one');
  });

  it('AUTH-09 — the taken-RACE (advisory said free, the authoritative PATCH lost the unique-violation race) surfaces inline', async () => {
    routes.availability = { status: 200, body: { available: true } };
    routes.patchMe = {
      status: 422,
      body: {
        error: {
          code: 'VALIDATION_ERROR',
          reason: 'username_taken',
          message: 'That username is taken.',
          details: [{ path: 'username', message: 'That username is taken.' }],
        },
      },
    };
    const { store } = renderScreen();

    fireEvent.changeText(screen.getByLabelText('Username'), 'sniped_name');
    await waitFor(() => expect(screen.getByText('USERNAME AVAILABLE')).toBeTruthy(), {
      timeout: 2000,
    });
    fireEvent.press(screen.getByText('CLAIM HANDLE'));

    await waitFor(() => expect(screen.getByText('That username is taken.')).toBeTruthy());
    // still gated: no navigation, the slice still reads pending
    expect(mockRouter.replace).not.toHaveBeenCalled();
    expect(store.getState().auth.user?.usernamePending).toBe(true);
  });

  it('MOD-07 — a screened name rejected by the authoritative PATCH surfaces its field error inline', async () => {
    routes.patchMe = {
      status: 422,
      body: {
        error: {
          code: 'VALIDATION_ERROR',
          reason: 'username_screened',
          message: 'That username isn’t allowed.',
          details: [{ path: 'username', message: 'That username isn’t allowed.' }],
        },
      },
    };
    renderScreen();
    fireEvent.changeText(screen.getByLabelText('Username'), 'bad_word');
    fireEvent.press(screen.getByText('CLAIM HANDLE'));

    await waitFor(() => expect(screen.getByText('That username isn’t allowed.')).toBeTruthy());
    expect(mockRouter.replace).not.toHaveBeenCalled();
  });

  it('AUTH-09 — a reason-less VALIDATION_ERROR (no reason, no details) on claim renders as the FIELD error, not the strip', async () => {
    routes.availability = { status: 200, body: { available: true } };
    routes.patchMe = {
      status: 422,
      body: { error: { code: 'VALIDATION_ERROR', message: 'Invalid username.' } },
    };
    renderScreen();

    fireEvent.changeText(screen.getByLabelText('Username'), 'player_one');
    await waitFor(() => expect(screen.getByText('USERNAME AVAILABLE')).toBeTruthy(), {
      timeout: 2000,
    });

    const claim = screen.getByRole('button', { name: 'CLAIM HANDLE' });
    fireEvent.press(claim);

    await waitFor(() => expect(screen.getByText('Invalid username.')).toBeTruthy());
    // FIELD placement, not the strip: showAvailability and canClaim both gate on `!fieldError`, so a
    // TOP-LINE `error` (pre-fix: the reason-less/detail-less VALIDATION_ERROR fell through to the
    // generic `else` branch) would leave the advisory line showing and the button still enabled.
    expect(screen.queryByText('USERNAME AVAILABLE')).toBeNull();
    expect(claim.props.accessibilityState.disabled).toBe(true);
    expect(mockRouter.replace).not.toHaveBeenCalled();
  });

  it('a 429 on the claim shows the calm rate-limit strip, not a field error', async () => {
    routes.patchMe = { status: 429, body: { error: { code: 'RATE_LIMITED', message: 'Too many requests.' } } };
    renderScreen();
    fireEvent.changeText(screen.getByLabelText('Username'), 'player_one');
    fireEvent.press(screen.getByText('CLAIM HANDLE'));

    await waitFor(() => expect(screen.getByText(/Too many attempts/)).toBeTruthy());
  });

  it('the CLAIM key gates on the transcribed username rules (3–20, [A-Za-z0-9_]) — and there is NO skip affordance', () => {
    renderScreen();
    const claim = screen.getByRole('button', { name: 'CLAIM HANDLE' });

    expect(claim.props.accessibilityState.disabled).toBe(true); // empty
    fireEvent.changeText(screen.getByLabelText('Username'), 'ab');
    expect(claim.props.accessibilityState.disabled).toBe(true); // below min 3
    fireEvent.changeText(screen.getByLabelText('Username'), 'has space');
    expect(claim.props.accessibilityState.disabled).toBe(true); // charset violation
    fireEvent.changeText(screen.getByLabelText('Username'), 'a'.repeat(21));
    expect(claim.props.accessibilityState.disabled).toBe(true); // above max 20
    fireEvent.changeText(screen.getByLabelText('Username'), 'player_one');
    expect(claim.props.accessibilityState.disabled).toBe(false);

    // AUTH-09: the username is chosen BEFORE entry — no skip/back affordance exists on this screen
    expect(screen.queryByText(/SKIP/i)).toBeNull();
    expect(screen.queryByText(/LATER/i)).toBeNull();
  });

  it('a11y: the screen exposes a labelled input and a button role', () => {
    renderScreen();
    expect(screen.getByLabelText('Username')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'CLAIM HANDLE' })).toBeTruthy();
  });
});
