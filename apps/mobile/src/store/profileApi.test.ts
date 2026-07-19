import { configureStore } from '@reduxjs/toolkit';

// round-5 N-A2 — the favourite-genres toggle (and every PATCH /me field-commit) is OPTIMISTIC. Two
// things must hold, and both are asserted here against a REAL store (api reducer + middleware, mocked
// fetch):
//   1. the getMe cache reflects the change SYNCHRONOUSLY — before the PATCH resolves (instant chip flip
//      + the next tap reads the updated array, killing the rapid-tap last-write-wins race), and
//   2. patchMe does NOT force a GET /me refetch (the `Me` invalidation was dropped) — the PATCH's own
//      returned self-view seeds the cache instead, so the heavy GET /me is off the interaction path.
// The PATCH's fetch is held on a deferred so the "optimistic, pre-resolution" assertion is unambiguous.

jest.mock('./index', () => ({ logoutTeardown: jest.fn(async () => {}) }));
jest.mock('expo-router', () => ({
  router: { replace: jest.fn(), navigate: jest.fn(), push: jest.fn(), back: jest.fn() },
}));

import authReducer, { setTokens } from './authSlice';
import prefsReducer from './prefsSlice';
import { api } from './api';
import { profileApi } from './profileApi';

const UUID_SELF = '11111111-1111-4111-8111-111111111111';
const GENRE_A = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const GENRE_B = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';

// a full, valid SelfProfile (selfProfileSchema.parse must pass — it runs at both the getMe and patchMe seams)
const ME_BASE = {
  id: UUID_SELF,
  username: 'demo',
  avatarUrl: null,
  bio: '',
  memberSince: '2026-01-01T00:00:00.000Z',
  privacy: 'friends',
  role: 'user',
  adminTier: null,
  usernamePending: false,
  emailVerified: true,
  favouriteGameId: null,
  favouriteGenreIds: [] as string[],
  gamertags: [],
  usernameNextChangeAt: null,
  stats: { games: 0, hours: 0, completionPct: 0, cardsDesigned: 0, adoptionsReceived: 0, friends: 0 },
  favouriteGame: null,
  nowPlaying: null,
  top10: [],
};

function make200(body: unknown) {
  const text = JSON.stringify(body);
  return {
    status: 200,
    ok: true,
    headers: { get: (k: string) => (k.toLowerCase() === 'content-type' ? 'application/json' : null) },
    text: async () => text,
    json: async () => JSON.parse(text),
    clone() {
      return make200(body);
    },
  };
}

function makeStore() {
  const store = configureStore({
    reducer: { auth: authReducer, prefs: prefsReducer, [api.reducerPath]: api.reducer },
    middleware: (getDefault) => getDefault().concat(api.middleware),
    // Disable configureStore's default autoBatchEnhancer: its `raf`-mode flush (RN mocks rAF as
    // setTimeout(0)) can land AFTER jest tears the env down here — this suite holds the PATCH fetch
    // open on a deferred, so the batched notification is scheduled right at test-end — and firing
    // post-teardown trips RN's `performance.now` guard (harmless noise that still fails the run).
    enhancers: (getDefaultEnhancers) => getDefaultEnhancers({ autoBatch: false }),
  });
  store.dispatch(setTokens({ accessToken: 'tok', refreshToken: 'ref' }));
  return store;
}

function makeDeferred<T>() {
  let resolve!: (v: T) => void;
  let reject!: (e: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

const flush = () => new Promise((r) => setTimeout(r, 0));

function reqMeta(input: RequestInfo | URL): { url: string; method: string } {
  const url = typeof input === 'string' ? input : (input as Request).url;
  const method = typeof input === 'string' ? 'GET' : ((input as Request).method ?? 'GET');
  return { url, method: method.toUpperCase() };
}

describe('profileApi.patchMe — optimistic favourite-genres toggle (round-5 N-A2)', () => {
  const realFetch = global.fetch;
  let fetchMock: jest.Mock;
  let patchDeferred: ReturnType<typeof makeDeferred<ReturnType<typeof make200>>>;
  let store: ReturnType<typeof makeStore>;

  beforeEach(() => {
    patchDeferred = makeDeferred();
    fetchMock = jest.fn(async (input: RequestInfo | URL) => {
      const { url, method } = reqMeta(input);
      if (url.includes('/me') && method === 'PATCH') return patchDeferred.promise; // held open
      return make200(ME_BASE); // GET /me
    });
    global.fetch = fetchMock as unknown as typeof fetch;
    store = makeStore();
  });
  afterEach(async () => {
    store.dispatch(api.util.resetApiState()); // drop cache entries + their subscriptions between tests
    await flush();
    global.fetch = realFetch;
  });

  const getMeFetchCount = () =>
    fetchMock.mock.calls.filter(([input]) => {
      const { url, method } = reqMeta(input);
      return url.includes('/me') && method === 'GET';
    }).length;

  const genresInCache = (store: ReturnType<typeof makeStore>): string[] | undefined =>
    api.endpoints.getMe.select()(store.getState() as never).data?.favouriteGenreIds;

  it('patches the getMe cache before the PATCH resolves, and forces NO GET /me refetch', async () => {
    // the profile screen's standing getMe subscription
    await store.dispatch(api.endpoints.getMe.initiate());
    expect(getMeFetchCount()).toBe(1);
    expect(genresInCache(store)).toEqual([]);

    // tap two genre chips on — the PATCH fetch is HELD (unresolved) so this proves optimism
    const patchPromise = store.dispatch(
      profileApi.endpoints.patchMe.initiate({ favouriteGenreIds: [GENRE_A, GENRE_B] }),
    );
    await flush();

    // OPTIMISTIC — the cache already shows the new genres though the request has NOT resolved…
    expect(genresInCache(store)).toEqual([GENRE_A, GENRE_B]);
    // …and no GET /me was fired by the mutation (no `Me` invalidation)
    expect(getMeFetchCount()).toBe(1);

    // now let the server answer with the authoritative self-view
    patchDeferred.resolve(make200({ ...ME_BASE, favouriteGenreIds: [GENRE_A, GENRE_B] }));
    await patchPromise;
    await flush();
    await flush();

    // upsert-from-response kept the cache correct, and STILL no forced GET /me refetch
    expect(genresInCache(store)).toEqual([GENRE_A, GENRE_B]);
    expect(getMeFetchCount()).toBe(1);
  });

  it('a second rapid toggle reads the OPTIMISTICALLY-updated array (no last-write-wins revert)', async () => {
    await store.dispatch(api.endpoints.getMe.initiate());
    expect(genresInCache(store)).toEqual([]);

    // tap 1: add GENRE_A (computed off the cache) — held open
    const firstDeferred = patchDeferred;
    const p1 = store.dispatch(
      profileApi.endpoints.patchMe.initiate({ favouriteGenreIds: [...(genresInCache(store) ?? []), GENRE_A] }),
    );
    await flush();
    expect(genresInCache(store)).toEqual([GENRE_A]); // optimistic — the next tap can see it

    // tap 2 (before tap 1 resolves): add GENRE_B, computed off the NOW-updated cache → both survive
    patchDeferred = makeDeferred();
    const secondDeferred = patchDeferred;
    const p2 = store.dispatch(
      profileApi.endpoints.patchMe.initiate({ favouriteGenreIds: [...(genresInCache(store) ?? []), GENRE_B] }),
    );
    await flush();
    expect(genresInCache(store)).toEqual([GENRE_A, GENRE_B]); // NOT [GENRE_B] — the race is dead

    // both PATCHes answer; the last-write self-view carries both
    firstDeferred.resolve(make200({ ...ME_BASE, favouriteGenreIds: [GENRE_A] }));
    secondDeferred.resolve(make200({ ...ME_BASE, favouriteGenreIds: [GENRE_A, GENRE_B] }));
    await Promise.all([p1, p2]);
    await flush();
    await flush();
    expect(genresInCache(store)).toEqual([GENRE_A, GENRE_B]);
  });
});
