import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react-native';
import { Platform } from 'react-native';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import authReducer from './store/authSlice';
import prefsReducer from './store/prefsSlice';
import { api } from './store/api';
import './store/authApi'; // side-effect: injects the appleSignIn endpoint into the base `api` slice

// AUTH-03/09 (auth-epic P-E) — the SIWA client flow, with expo-apple-authentication + expo-crypto
// MODULE-mocked (SIWA cannot run in Expo Go/jest — E2E rides the first EAS build, P16) and the server
// mocked at the FETCH layer (the forgot-password/reauth harness idiom) against a REAL store, so the
// session-establishment assertions (tokens + user landing in the auth slice) are meaningful.
//
// THE NONCE CONTRACT under test: the RAW nonce is POSTed to /auth/apple while its SHA-256 rides the
// native signInAsync request — asserted via the deterministic digest mock (`sha256(<input>)`), which
// makes the raw↔hashed relationship checkable without real crypto.

const mockRouter = { push: jest.fn(), replace: jest.fn(), back: jest.fn(), navigate: jest.fn() };
jest.mock('expo-router', () => ({ useRouter: () => mockRouter, router: mockRouter }));

jest.mock('expo-apple-authentication', () => ({
  isAvailableAsync: jest.fn(),
  signInAsync: jest.fn(),
  AppleAuthenticationScope: { FULL_NAME: 0, EMAIL: 1 },
}));
jest.mock('expo-crypto', () => ({
  randomUUID: jest.fn(),
  digestStringAsync: jest.fn(async (_alg: string, input: string) => `sha256(${input})`),
  CryptoDigestAlgorithm: { SHA256: 'SHA-256' },
}));
jest.mock('./auth/tokenStore', () => ({
  saveTokens: jest.fn(async () => undefined),
  loadTokens: jest.fn(async () => null),
  clearTokens: jest.fn(async () => undefined),
}));

import * as AppleAuthentication from 'expo-apple-authentication';
import * as Crypto from 'expo-crypto';
import { saveTokens } from './auth/tokenStore';
import SignIn from '../app/sign-in';

const isAvailableAsync = AppleAuthentication.isAvailableAsync as jest.Mock;
const signInAsync = AppleAuthentication.signInAsync as jest.Mock;
const randomUUID = Crypto.randomUUID as jest.Mock;

// A strict-schema-valid self-shape (selfProfileSchema) — the /auth/apple session user.
const SELF = (over: Record<string, unknown> = {}) => ({
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
});

type ResponseSpec = { status: number; body: unknown };
interface RecordedCall {
  url: string;
  method: string;
  body: Record<string, unknown> | undefined;
}

let appleRoute: ResponseSpec;
let loginRoute: ResponseSpec;
let registerRoute: ResponseSpec;
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

const realFetch = global.fetch;

beforeEach(() => {
  appleRoute = { status: 200, body: {} };
  loginRoute = { status: 200, body: {} };
  registerRoute = { status: 200, body: {} };
  calls = [];
  jest.clearAllMocks();
  isAvailableAsync.mockResolvedValue(true);
  randomUUID.mockReturnValue('raw-nonce-uuid-0001');
  const fetchMock = jest.fn(async (req: Request) => {
    let body: Record<string, unknown> | undefined;
    try {
      body = await req.clone().json();
    } catch {
      body = undefined;
    }
    calls.push({ url: req.url, method: req.method ?? 'POST', body });
    if (req.url.includes('/auth/apple')) return fetchResponse(appleRoute);
    // AUTH-09 email-fork coverage — /auth/login rides the same fetch mock so `submit()`'s
    // usernamePending routing can be exercised alongside the Apple flow in this same suite.
    if (req.url.includes('/auth/login')) return fetchResponse(loginRoute);
    if (req.url.includes('/auth/register')) return fetchResponse(registerRoute);
    return fetchResponse({ status: 200, body: { ok: true } });
  });
  global.fetch = fetchMock as unknown as typeof fetch;
});
afterEach(() => {
  global.fetch = realFetch;
});

function makeStore() {
  return configureStore({
    reducer: { auth: authReducer, prefs: prefsReducer, [api.reducerPath]: api.reducer },
    middleware: (getDefault) => getDefault().concat(api.middleware),
  });
}

function renderSignIn() {
  const store = makeStore();
  const utils = render(
    <Provider store={store}>
      <SignIn />
    </Provider>,
  );
  return { store, ...utils };
}

async function appleButton() {
  return await screen.findByLabelText('Sign in with Apple');
}

const appleCall = () => calls.find((c) => c.url.includes('/auth/apple'));

// Test 2 (Apple double-tap guard) — a controllable promise so the second press can be fired strictly
// BEFORE the native call settles, then the flow can be released on demand.
function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

describe('sign-in — Sign in with Apple (AUTH-03/09, P-E)', () => {
  it('AUTH-03 — the Apple control renders only when the native module reports availability', async () => {
    renderSignIn();
    expect(await appleButton()).toBeTruthy();
    expect(screen.getByText('OR CONTINUE WITH')).toBeTruthy();
  });

  it('AUTH-03 — unavailable (Android/web/Expo Go posture): the control never appears', async () => {
    isAvailableAsync.mockResolvedValue(false);
    renderSignIn();
    // let the availability probe settle, then assert absence
    await waitFor(() => expect(isAvailableAsync).toHaveBeenCalled());
    expect(screen.queryByLabelText('Sign in with Apple')).toBeNull();
    expect(screen.queryByText('OR CONTINUE WITH')).toBeNull();
  });

  it('AUTH-03 — nonce flow: signInAsync gets the SHA-256 of the RAW nonce the server is POSTed', async () => {
    signInAsync.mockResolvedValue({ identityToken: 'apple-identity-token' });
    appleRoute = {
      status: 200,
      body: { user: SELF({ usernamePending: false }), accessToken: 'acc-1', refreshToken: 'ref-1' },
    };
    renderSignIn();
    fireEvent.press(await appleButton());

    await waitFor(() => expect(appleCall()).toBeTruthy());
    const posted = appleCall()!.body as { identityToken: string; nonce: string };
    // the RAW nonce goes to OUR server…
    expect(posted).toEqual({ identityToken: 'apple-identity-token', nonce: 'raw-nonce-uuid-0001' });
    // …and its SHA-256 (via the deterministic digest mock) rode the NATIVE request — the relationship,
    // not just two constants: hash(sent-to-Apple) is derived from exactly the nonce sent to the server.
    const nativeArgs = signInAsync.mock.calls[0][0] as { nonce: string; requestedScopes: unknown[] };
    expect(nativeArgs.nonce).toBe(`sha256(${posted.nonce})`);
    expect(Crypto.digestStringAsync).toHaveBeenCalledWith('SHA-256', 'raw-nonce-uuid-0001');
    expect(nativeArgs.requestedScopes).toEqual([0, 1]); // FULL_NAME + EMAIL
  });

  it('AUTH-03 — user cancel (ERR_REQUEST_CANCELED) is a SILENT no-op: no POST, no error strip', async () => {
    signInAsync.mockRejectedValue(Object.assign(new Error('canceled'), { code: 'ERR_REQUEST_CANCELED' }));
    renderSignIn();
    fireEvent.press(await appleButton());

    await waitFor(() => expect(signInAsync).toHaveBeenCalled());
    expect(appleCall()).toBeUndefined();
    // no error copy of any kind surfaced
    expect(screen.queryByText(/verified|try again|wrong/i)).toBeNull();
  });

  it('AUTH-03 — a server 401 (neutral AUTH_FAILED) surfaces the DISTINCT verification message', async () => {
    signInAsync.mockResolvedValue({ identityToken: 'forged-token' });
    appleRoute = { status: 401, body: { error: { code: 'AUTH_FAILED', message: 'Authentication failed.' } } };
    const { store } = renderSignIn();
    fireEvent.press(await appleButton());

    await waitFor(() =>
      expect(screen.getByText('Apple sign-in couldn’t be verified. Please try again.')).toBeTruthy(),
    );
    expect(store.getState().auth.accessToken).toBeNull(); // no session established
    expect(mockRouter.replace).not.toHaveBeenCalled();
  });

  it('AUTH-03 — a network failure names the cause (not a generic strip)', async () => {
    signInAsync.mockResolvedValue({ identityToken: 'apple-identity-token' });
    global.fetch = jest.fn(async () => {
      throw new TypeError('Network request failed');
    }) as unknown as typeof fetch;
    renderSignIn();
    fireEvent.press(await appleButton());

    await waitFor(() =>
      expect(
        screen.getByText('Couldn’t reach the server — check your connection and try again.'),
      ).toBeTruthy(),
    );
  });

  it('AUTH-09 — success with usernamePending routes to /choose-username, establishing the session the email way', async () => {
    signInAsync.mockResolvedValue({ identityToken: 'apple-identity-token' });
    const user = SELF({ usernamePending: true });
    appleRoute = { status: 200, body: { user, accessToken: 'acc-9', refreshToken: 'ref-9' } };
    const { store } = renderSignIn();
    fireEvent.press(await appleButton());

    await waitFor(() => expect(mockRouter.replace).toHaveBeenCalledWith('/choose-username'));
    // the SAME session-establishment path email sign-in uses: secure-store first, then the slice
    expect(saveTokens).toHaveBeenCalledWith({ accessToken: 'acc-9', refreshToken: 'ref-9' });
    expect(store.getState().auth.accessToken).toBe('acc-9');
    expect(store.getState().auth.refreshToken).toBe('ref-9');
    expect(store.getState().auth.user).toEqual(user);
  });

  it('AUTH-09 — email submit() with usernamePending routes to /choose-username (the email fork)', async () => {
    // submit() (sign-in.tsx) shares the exact usernamePending fork with signInWithApple — this covers
    // it via the EMAIL path, since no other suite exercises login/submit().
    loginRoute = {
      status: 200,
      body: { user: SELF({ usernamePending: true }), accessToken: 'acc-e1', refreshToken: 'ref-e1' },
    };
    const { store } = renderSignIn();
    fireEvent.changeText(screen.getByLabelText('Email'), 'player@example.com');
    fireEvent.changeText(screen.getByLabelText('Password'), 'password123');
    fireEvent.press(screen.getByText('SIGN IN'));

    await waitFor(() => expect(mockRouter.replace).toHaveBeenCalledWith('/choose-username'));
    expect(saveTokens).toHaveBeenCalledWith({ accessToken: 'acc-e1', refreshToken: 'ref-e1' });
    expect(store.getState().auth.user?.usernamePending).toBe(true);
  });

  it('walk-4 P5-i (finding #27) — email login AUTH_FAILED shows humane, enumeration-neutral copy, not the raw server string', async () => {
    loginRoute = {
      status: 401,
      body: { error: { code: 'AUTH_FAILED', message: 'Authentication failed.' } },
    };
    const { store } = renderSignIn();
    fireEvent.changeText(screen.getByLabelText('Email'), 'player@example.com');
    fireEvent.changeText(screen.getByLabelText('Password'), 'wrongpassword');
    fireEvent.press(screen.getByText('SIGN IN'));

    await waitFor(() =>
      expect(
        screen.getByText('That email and password don’t match. Check both, or reset your password.'),
      ).toBeTruthy(),
    );
    // the raw server copy never reaches the screen — and AUTH-11 stays intact: this SAME copy shows
    // whether the password is wrong or the account doesn't exist (the server's one AUTH_FAILED covers
    // both), and it isn't attached to either field.
    expect(screen.queryByText('Authentication failed.')).toBeNull();
    expect(store.getState().auth.accessToken).toBeNull();
    expect(mockRouter.replace).not.toHaveBeenCalled();
  });

  it('AUTH-03 — a rapid double-tap on Apple bails synchronously via the in-flight guard, and re-arms after settling', async () => {
    const first = deferred<{ identityToken: string | null }>();
    signInAsync.mockReturnValueOnce(first.promise);
    renderSignIn();
    const btn = await appleButton();

    // Two presses back-to-back, BEFORE the first native call resolves.
    fireEvent.press(btn);
    fireEvent.press(btn);

    await waitFor(() => expect(signInAsync).toHaveBeenCalledTimes(1));
    expect(appleCall()).toBeUndefined(); // neither press has POSTed yet

    // Settle the first flow (a cancel — the documented silent no-op) and let the finally release the guard.
    await act(async () => {
      first.reject(Object.assign(new Error('canceled'), { code: 'ERR_REQUEST_CANCELED' }));
      // flush the microtask queue so the catch/finally in signInWithApple has actually run
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(appleCall()).toBeUndefined();

    // The guard released — a third press invokes the native call again.
    signInAsync.mockResolvedValueOnce({ identityToken: null });
    fireEvent.press(btn);
    await waitFor(() => expect(signInAsync).toHaveBeenCalledTimes(2));
  });

  it('AUTH-03 — on Android the Apple control never renders and the availability probe is never called', async () => {
    const restore = jest.replaceProperty(Platform, 'OS', 'android');
    try {
      renderSignIn();
      // give the availability effect a chance to run (it early-returns before calling isAvailableAsync)
      await act(async () => {
        await Promise.resolve();
      });
      expect(isAvailableAsync).not.toHaveBeenCalled();
      expect(screen.queryByLabelText('Sign in with Apple')).toBeNull();
      expect(screen.queryByText('OR CONTINUE WITH')).toBeNull();
    } finally {
      restore.restore();
    }
  });

  it('AUTH-09 — success with a completed username routes straight into the tabs', async () => {
    signInAsync.mockResolvedValue({ identityToken: 'apple-identity-token' });
    appleRoute = {
      status: 200,
      body: { user: SELF({ usernamePending: false }), accessToken: 'acc-2', refreshToken: 'ref-2' },
    };
    renderSignIn();
    fireEvent.press(await appleButton());

    await waitFor(() => expect(mockRouter.replace).toHaveBeenCalledWith('/(tabs)/collection'));
  });

  it('AUTH-03 — Apple resolving WITHOUT an identity token names that cause and never POSTs', async () => {
    signInAsync.mockResolvedValue({ identityToken: null });
    renderSignIn();
    fireEvent.press(await appleButton());

    await waitFor(() =>
      expect(screen.getByText('Apple didn’t return an identity token. Please try again.')).toBeTruthy(),
    );
    expect(appleCall()).toBeUndefined();
  });

  // walk-4 P5-h class (the sign-in CREATE-mode site) — registration shares the passwordSchema strength
  // floor with the password-reset confirm (auth-service.ts assertPasswordNotBreached / passwordSchema),
  // so the same generic zod too_small copy the forgot-password S3 step already maps ("Must be at least
  // 8 characters." → "Password must be at least 8 characters.") used to reach this screen raw. AUTH-11
  // stays intact — this is a shape-validation 422, never an account-existence signal.
  it('walk-4 P5-h — CREATE-mode: a too-short password reads "Password must be at least 8 characters." (mirrors forgot-password S3)', async () => {
    registerRoute = {
      status: 422,
      body: {
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Validation failed.',
          details: [{ path: 'password', message: 'Must be at least 8 characters.' }],
        },
      },
    };
    renderSignIn();
    fireEvent.press(screen.getByText('CREATE ACCOUNT')); // swap-footer toggle → create mode
    fireEvent.changeText(screen.getByLabelText('Email'), 'player@example.com');
    // a 2-char handle stays under USERNAME_CHECK_MIN (3) so the W3 advisory debounce never schedules —
    // sidesteps an unrelated post-teardown timer warning; the availability check isn't under test here.
    fireEvent.changeText(screen.getByLabelText('Username'), 'ab');
    fireEvent.changeText(screen.getByLabelText('Password'), 'short1');
    fireEvent.press(screen.getByRole('checkbox')); // AUTH-10 acceptance — un-gates submit
    fireEvent.press(screen.getByText('CREATE ACCOUNT')); // now the submit button

    await waitFor(() =>
      expect(screen.getByText('Password must be at least 8 characters.')).toBeTruthy(),
    );
    // the raw, field-less server copy never reaches the screen unprefixed
    expect(screen.queryByText('Must be at least 8 characters.')).toBeNull();
  });

  it('walk-4 P5-h — CREATE-mode: the breach-specific copy is left verbatim (never re-prefixed with "Password")', async () => {
    registerRoute = {
      status: 422,
      body: {
        error: {
          code: 'VALIDATION_ERROR',
          reason: 'password_breached',
          message: 'That password has appeared in a known data breach — please choose a different one.',
          details: [{ path: 'password', message: 'That password has appeared in a known data breach.' }],
        },
      },
    };
    renderSignIn();
    fireEvent.press(screen.getByText('CREATE ACCOUNT'));
    fireEvent.changeText(screen.getByLabelText('Email'), 'player@example.com');
    // a 2-char handle stays under USERNAME_CHECK_MIN (3) so the W3 advisory debounce never schedules —
    // sidesteps an unrelated post-teardown timer warning; the availability check isn't under test here.
    fireEvent.changeText(screen.getByLabelText('Username'), 'ab');
    fireEvent.changeText(screen.getByLabelText('Password'), 'password1');
    fireEvent.press(screen.getByRole('checkbox'));
    fireEvent.press(screen.getByText('CREATE ACCOUNT'));

    await waitFor(() =>
      expect(screen.getByText('That password has appeared in a known data breach.')).toBeTruthy(),
    );
    expect(
      screen.queryByText('Password that password has appeared in a known data breach.'),
    ).toBeNull();
  });
});
