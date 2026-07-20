import React from 'react';
import { render, screen, waitFor } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import authReducer, { setSession, setTokens } from './store/authSlice';
import prefsReducer from './store/prefsSlice';
import { api } from './store/api';
import type { SelfProfile } from '@ingame/shared';

// AUTH-09 (auth-epic P-E) — the entry gate in app/index.tsx: any authed session whose self-shape still
// reads `usernamePending: true` routes to /choose-username INSTEAD of the tabs (the catch-all wall — a
// half-completed SIWA account can never wander the app), including the COLD-START path where the slice
// holds tokens only and the gate resolves the self-shape via GET /me.

const mockRouter = { push: jest.fn(), replace: jest.fn(), back: jest.fn(), navigate: jest.fn() };
jest.mock('expo-router', () => {
  const { Text: RNText } = jest.requireActual('react-native');
  return {
    useRouter: () => mockRouter,
    router: mockRouter,
    // Redirect renders its target as inspectable text — the gate's decision IS the href.
    Redirect: ({ href }: { href: string }) => <RNText>{`REDIRECT:${href}`}</RNText>,
  };
});

import Index from '../app/index';

// A strict-schema-valid self-shape (selfProfileSchema — getMe PARSES the response on the cold-start path).
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
    usernamePending: false,
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

type ResponseSpec = { status: number; body: unknown };
let meRoute: ResponseSpec;
let meCalls: number;

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
  meRoute = { status: 200, body: SELF() };
  meCalls = 0;
  mockRouter.replace.mockClear();
  global.fetch = jest.fn(async (req: Request) => {
    if (/\/me$/.test(req.url)) {
      meCalls += 1;
      return fetchResponse(meRoute);
    }
    return fetchResponse({ status: 404, body: {} });
  }) as unknown as typeof fetch;
});
afterEach(() => {
  global.fetch = realFetch;
});

function renderIndex(prime?: (store: ReturnType<typeof makeStore>) => void) {
  const store = makeStore();
  prime?.(store);
  const utils = render(
    <Provider store={store}>
      <Index />
    </Provider>,
  );
  return { store, ...utils };
}

function makeStore() {
  return configureStore({
    reducer: { auth: authReducer, prefs: prefsReducer, [api.reducerPath]: api.reducer },
    middleware: (getDefault) => getDefault().concat(api.middleware),
  });
}

describe('index — the AUTH-09 usernamePending entry gate (P-E)', () => {
  it('no session → /sign-in (unchanged pre-P-E behavior)', () => {
    renderIndex();
    expect(screen.getByText('REDIRECT:/sign-in')).toBeTruthy();
    expect(meCalls).toBe(0); // the /me probe is skipped signed-out
  });

  it('AUTH-09 — a session with usernamePending:true is WALLED from the tabs → /choose-username', () => {
    renderIndex((store) =>
      store.dispatch(
        setSession({ accessToken: 'acc', refreshToken: 'ref', user: SELF({ usernamePending: true }) }),
      ),
    );
    expect(screen.getByText('REDIRECT:/choose-username')).toBeTruthy();
    expect(meCalls).toBe(0); // the slice already holds the self-shape — no refetch
  });

  it('a completed session → the tabs', () => {
    renderIndex((store) =>
      store.dispatch(
        setSession({ accessToken: 'acc', refreshToken: 'ref', user: SELF({ usernamePending: false }) }),
      ),
    );
    expect(screen.getByText('REDIRECT:/(tabs)/collection')).toBeTruthy();
  });

  it('COLD START (tokens only, no user in the slice) — the gate resolves /me and still walls a pending account', async () => {
    meRoute = { status: 200, body: SELF({ usernamePending: true }) };
    renderIndex((store) => store.dispatch(setTokens({ accessToken: 'acc', refreshToken: 'ref' })));

    await waitFor(() => expect(screen.getByText('REDIRECT:/choose-username')).toBeTruthy());
    expect(meCalls).toBe(1);
  });

  it('COLD START with a completed account → the tabs', async () => {
    meRoute = { status: 200, body: SELF({ usernamePending: false }) };
    renderIndex((store) => store.dispatch(setTokens({ accessToken: 'acc', refreshToken: 'ref' })));

    await waitFor(() => expect(screen.getByText('REDIRECT:/(tabs)/collection')).toBeTruthy());
  });

  it('DEFENSIVE — a /me failure (undefined user, non-401) falls back to the tabs rather than blanking', async () => {
    meRoute = { status: 500, body: { error: { code: 'SERVER_ERROR', message: 'boom' } } };
    renderIndex((store) => store.dispatch(setTokens({ accessToken: 'acc', refreshToken: 'ref' })));

    await waitFor(() => expect(screen.getByText('REDIRECT:/(tabs)/collection')).toBeTruthy());
  });
});
