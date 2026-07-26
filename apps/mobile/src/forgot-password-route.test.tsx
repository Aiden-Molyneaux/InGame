import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import authReducer from './store/authSlice';
import prefsReducer from './store/prefsSlice';
import { api } from './store/api';
import './store/authApi'; // side-effect: injects the reset endpoints into the base `api` slice

// AUTH-04 (auth-epic P-C) — the FORGOT-PASSWORD 3-step state machine. Mocked at the FETCH layer (the
// reauth.test.ts harness idiom) against a REAL store so the "reset proof never lands in redux" snapshot
// is meaningful — not a hook mock that would hide it. Every server error mode is a tagged risk-domain
// beat (AUTH-04/AUTH-11): enumeration-neutral advance, invalid_code, invalid_token bounce, RATE_LIMITED.

const mockRouter = { push: jest.fn(), replace: jest.fn(), back: jest.fn(), navigate: jest.fn() };
// api.ts imports the bare `router` (its reauth teardown); the screen uses `useRouter()`. Provide both.
jest.mock('expo-router', () => ({ useRouter: () => mockRouter, router: mockRouter }));

import ForgotPassword from '../app/forgot-password';

type RouteKey = 'request' | 'verify' | 'confirm' | 'other';
type ResponseSpec = { status: number; body: unknown };
interface RecordedCall {
  key: RouteKey;
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

function keyOf(url: string): RouteKey {
  if (url.includes('/auth/password-reset/request')) return 'request';
  if (url.includes('/auth/password-reset/verify')) return 'verify';
  if (url.includes('/auth/password-reset/confirm')) return 'confirm';
  return 'other';
}

const realFetch = global.fetch;

beforeEach(() => {
  routes = {};
  calls = [];
  mockRouter.push.mockClear();
  mockRouter.replace.mockClear();
  mockRouter.back.mockClear();
  const fetchMock = jest.fn(async (req: Request) => {
    const url = req.url;
    const method = req.method ?? 'POST';
    let body: Record<string, unknown> | undefined;
    try {
      body = await req.clone().json();
    } catch {
      body = undefined;
    }
    const key = keyOf(url);
    calls.push({ key, method, body });
    return fetchResponse(routes[key] ?? { status: 200, body: { ok: true } });
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

function renderScreen() {
  const store = makeStore();
  const utils = render(
    <Provider store={store}>
      <ForgotPassword />
    </Provider>,
  );
  return { store, ...utils };
}

// Drive S1 → the code step (the common preamble). Leaves the screen on S2.
async function advanceToCode(email = 'player@example.com') {
  fireEvent.changeText(screen.getByLabelText('Email'), email);
  fireEvent.press(screen.getByText('SEND CODE'));
  await waitFor(() => expect(screen.getByText(/a 6-digit code is on its way/)).toBeTruthy());
}

// Drive S2 → the password step, with verify returning `proof`.
async function advanceToPassword(proof = 'PROOF-TOKEN-XYZ') {
  routes.verify = { status: 200, body: { resetToken: proof } };
  fireEvent.changeText(screen.getByLabelText('6-digit code'), '123456');
  fireEvent.press(screen.getByText('VERIFY CODE'));
  await waitFor(() => expect(screen.getByText(/Almost done/)).toBeTruthy());
}

// walk-4 P5-j — the 3-step machine chains several `waitFor`s per test (and one runs 30 fake-timer
// ticks); past the 5s default under a loaded parallel run (the same known flake class
// styler-ultimate-colors.test.tsx hit). Generous, not masking.
jest.setTimeout(20000);

describe('forgot-password — the 3-step reset machine (AUTH-04)', () => {
  it('AUTH-04 — happy path: email → code → password → success → sign-in', async () => {
    routes.request = { status: 200, body: { ok: true } };
    routes.confirm = { status: 200, body: { ok: true } };
    renderScreen();

    await advanceToCode();
    await advanceToPassword();

    fireEvent.changeText(screen.getByLabelText('New password'), 'brandnew123');
    fireEvent.press(screen.getByText('SET PASSWORD'));
    await waitFor(() => expect(screen.getByText('PASSWORD UPDATED')).toBeTruthy());

    fireEvent.press(screen.getByText('RETURN TO SIGN IN'));
    expect(mockRouter.replace).toHaveBeenCalledWith('/sign-in');
  });

  it('AUTH-11 — S1 is enumeration-neutral: a known and an unknown email both advance with identical copy', async () => {
    // The server returns the byte-identical neutral 200 for both, so the client has ONE path; assert it
    // advances with the neutral copy and never echoes the address (no existence disclosure).
    routes.request = { status: 200, body: { ok: true } };
    const { unmount } = renderScreen();
    await advanceToCode('known@example.com');
    const neutral = screen.getByText(/If that address has an account/).props.children;
    expect(screen.queryByText(/known@example.com/)).toBeNull();
    unmount();

    renderScreen();
    await advanceToCode('nobody@nowhere.test');
    expect(screen.getByText(/If that address has an account/).props.children).toEqual(neutral);
    expect(screen.queryByText(/nobody@nowhere.test/)).toBeNull();
  });

  it('AUTH-11 — a wrong code surfaces the neutral invalid_code inline error and stays on S2', async () => {
    routes.request = { status: 200, body: { ok: true } };
    routes.verify = {
      status: 422,
      body: { error: { code: 'VALIDATION_ERROR', reason: 'invalid_code', message: 'That code is invalid or has expired.' } },
    };
    renderScreen();
    await advanceToCode();

    fireEvent.changeText(screen.getByLabelText('6-digit code'), '000000');
    fireEvent.press(screen.getByText('VERIFY CODE'));

    await waitFor(() => expect(screen.getByText('That code is invalid or has expired.')).toBeTruthy());
    // still on S2 — the code intro is present, no password field
    expect(screen.getByText(/a 6-digit code is on its way/)).toBeTruthy();
    expect(screen.queryByLabelText('New password')).toBeNull();
  });

  it('AUTH-11 — a 429 on verify surfaces the calm RATE_LIMITED strip, not a field error', async () => {
    routes.request = { status: 200, body: { ok: true } };
    routes.verify = { status: 429, body: { error: { code: 'RATE_LIMITED', message: 'Too many requests.' } } };
    renderScreen();
    await advanceToCode();

    fireEvent.changeText(screen.getByLabelText('6-digit code'), '123456');
    fireEvent.press(screen.getByText('VERIFY CODE'));

    await waitFor(() => expect(screen.getByText(/Too many attempts/)).toBeTruthy());
    expect(screen.queryByLabelText('New password')).toBeNull();
  });

  it('AUTH-04 — S3 confirms with the PROOF held from S2 (not the code), carrying the new password', async () => {
    routes.request = { status: 200, body: { ok: true } };
    routes.confirm = { status: 200, body: { ok: true } };
    renderScreen();

    await advanceToCode();
    await advanceToPassword('THE-REAL-PROOF-9f9f');

    fireEvent.changeText(screen.getByLabelText('New password'), 'brandnew123');
    fireEvent.press(screen.getByText('SET PASSWORD'));
    await waitFor(() => expect(screen.getByText('PASSWORD UPDATED')).toBeTruthy());

    const confirmCall = calls.find((c) => c.key === 'confirm');
    expect(confirmCall?.body).toEqual({ token: 'THE-REAL-PROOF-9f9f', password: 'brandnew123' });
  });

  it('AUTH-04 — an expired proof (invalid_token) on confirm bounces back to S2 with a resend nudge', async () => {
    routes.request = { status: 200, body: { ok: true } };
    routes.confirm = {
      status: 422,
      body: { error: { code: 'VALIDATION_ERROR', reason: 'invalid_token', message: 'That reset link is invalid or has expired.' } },
    };
    renderScreen();

    await advanceToCode();
    await advanceToPassword();

    fireEvent.changeText(screen.getByLabelText('New password'), 'brandnew123');
    fireEvent.press(screen.getByText('SET PASSWORD'));

    await waitFor(() => expect(screen.getByText('That code expired — request a new one.')).toBeTruthy());
    // bounced to S2: the code field is back, the password field is gone
    expect(screen.getByLabelText('6-digit code')).toBeTruthy();
    expect(screen.queryByLabelText('New password')).toBeNull();
  });

  it('S3 — a too-short-password rejection is prefixed to name the field (walk-4 P5-h, finding #26)', async () => {
    routes.request = { status: 200, body: { ok: true } };
    routes.confirm = {
      status: 422,
      body: {
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Must be at least 8 characters.',
          details: [{ path: 'password', message: 'Must be at least 8 characters.' }],
        },
      },
    };
    renderScreen();
    await advanceToCode();
    await advanceToPassword();

    // long enough to pass the CLIENT gate (canSet) so the press actually reaches the server mock —
    // the scenario under test is the server rejecting it anyway (the client mapping, not reachability).
    fireEvent.changeText(screen.getByLabelText('New password'), 'password1');
    fireEvent.press(screen.getByText('SET PASSWORD'));
    // the server's generic zod copy ("Must be at least 8 characters.") never says WHICH field — the
    // client fronts it with "Password" so the inline error reads standalone.
    await waitFor(() => expect(screen.getByText('Password must be at least 8 characters.')).toBeTruthy());
  });

  it('S3 — a breached password surfaces breach-specific copy, distinct from the length message (walk-4 P5-h)', async () => {
    routes.request = { status: 200, body: { ok: true } };
    routes.confirm = {
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
    renderScreen();
    await advanceToCode();
    await advanceToPassword();

    fireEvent.changeText(screen.getByLabelText('New password'), 'password1');
    fireEvent.press(screen.getByText('SET PASSWORD'));
    await waitFor(() =>
      expect(screen.getByText('That password has appeared in a known data breach.')).toBeTruthy(),
    );
    // never collapses to the generic length copy
    expect(screen.queryByText('Password must be at least 8 characters.')).toBeNull();
  });

  it('AUTH-04 — the reset PROOF never lands in the redux store (component-state only)', async () => {
    routes.request = { status: 200, body: { ok: true } };
    const { store } = renderScreen();

    await advanceToCode();
    await advanceToPassword('SECRET-PROOF-DO-NOT-PERSIST');

    // The verify mutation is reset the instant the proof is captured, so no api.mutations entry retains
    // it, and the auth slice never sees it. A full serialized snapshot must not contain the token.
    const snapshot = JSON.stringify(store.getState());
    expect(snapshot).not.toContain('SECRET-PROOF-DO-NOT-PERSIST');
    expect(store.getState().auth.accessToken).toBeNull();
  });

  it('S2 — the resend row aligns "Didn\'t get it?" and the resend control on a shared text baseline (walk-4 P5-g, finding #25)', async () => {
    const { StyleSheet } = require('react-native');
    routes.request = { status: 200, body: { ok: true } };
    renderScreen();
    await advanceToCode();
    // the row wraps BOTH the body-size label and the smaller Resend link/countdown; `baseline` (not
    // `center`) is what keeps a mixed-size text row from drifting off its shared baseline.
    const flat = StyleSheet.flatten(screen.getByTestId('resend-row').props.style);
    expect(flat.alignItems).toBe('baseline');
  });

  it('S2 — RESEND is cooldown-gated after a send, then re-fires the request once the cooldown elapses', async () => {
    jest.useFakeTimers();
    try {
      routes.request = { status: 200, body: { ok: true } };
      renderScreen();

      fireEvent.changeText(screen.getByLabelText('Email'), 'player@example.com');
      await act(async () => {
        fireEvent.press(screen.getByText('SEND CODE'));
      });
      // cooldown engaged — the link is replaced by a countdown, so it can't be re-fired immediately
      expect(screen.getByText(/RESEND IN \d+S/)).toBeTruthy();
      expect(screen.queryByText('RESEND CODE')).toBeNull();
      expect(calls.filter((c) => c.key === 'request')).toHaveLength(1);

      // run the 30 one-second ticks to zero (each tick reschedules the next via the effect)
      for (let i = 0; i < RESEND_TICKS; i++) {
        await act(async () => {
          jest.advanceTimersByTime(1000);
        });
      }
      const resend = screen.getByText('RESEND CODE');
      await act(async () => {
        fireEvent.press(resend);
      });
      expect(calls.filter((c) => c.key === 'request')).toHaveLength(2);
    } finally {
      jest.useRealTimers();
    }
  });

  it('back-nav: S3 back clears the CONSUMED code, lifts the cooldown, and warns before returning to S2', async () => {
    routes.request = { status: 200, body: { ok: true } };
    renderScreen();

    await advanceToCode();
    await advanceToPassword();

    // the S2 code field is still holding the just-verified (now single-use-spent) code
    fireEvent.press(screen.getByText('‹ CODE'));

    await waitFor(() =>
      expect(
        screen.getByText('That code was already used — resend a fresh one to continue.'),
      ).toBeTruthy(),
    );
    // back on S2, but the consumed code is cleared, not left sitting in the field
    expect(screen.getByLabelText('6-digit code').props.value).toBe('');
    // the cooldown was lifted — RESEND is immediately tappable, not the "RESEND IN …S" wait copy
    expect(screen.getByText('RESEND CODE')).toBeTruthy();
    expect(screen.queryByText(/RESEND IN \d+S/)).toBeNull();
  });

  it('back-nav: S1 back returns to sign-in; S2 back returns to S1', async () => {
    routes.request = { status: 200, body: { ok: true } };
    renderScreen();

    // S1 back → pops the route (to sign-in)
    fireEvent.press(screen.getByText('‹ SIGN IN'));
    expect(mockRouter.back).toHaveBeenCalledTimes(1);

    await advanceToCode();
    // S2 back → S1 (in-flow), the route is NOT popped again
    fireEvent.press(screen.getByText('‹ EMAIL'));
    await waitFor(() => expect(screen.getByText(/Enter the email on your account/)).toBeTruthy());
    expect(mockRouter.back).toHaveBeenCalledTimes(1);
  });

  it('a11y: each step exposes a labelled input and a button role', async () => {
    routes.request = { status: 200, body: { ok: true } };
    renderScreen();
    expect(screen.getByLabelText('Email')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'SEND CODE' })).toBeTruthy();

    await advanceToCode();
    expect(screen.getByLabelText('6-digit code')).toBeTruthy();

    await advanceToPassword();
    expect(screen.getByLabelText('New password')).toBeTruthy();
  });
});

// The client RESEND cooldown (mirrors RESEND_COOLDOWN_S in the screen).
const RESEND_TICKS = 30;
