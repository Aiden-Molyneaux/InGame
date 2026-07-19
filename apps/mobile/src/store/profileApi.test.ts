import { configureStore } from '@reduxjs/toolkit';

// round-5 N-A2 made the favourite-genres toggle (and every PATCH /me field-commit) OPTIMISTIC; round-6
// (murr-HIGH) hardened it to be race-safe. Asserted here against a REAL store (api reducer + middleware,
// mocked fetch):
//   1. the getMe cache reflects the change SYNCHRONOUSLY — before the PATCH resolves (instant chip flip
//      + the next tap reads the updated array, killing the rapid-tap last-write-wins race),
//   2. the instant flip does NOT wait on a GET /me — the server reconcile is deferred until AFTER the
//      mutation settles, so the heavy GET /me stays off the interaction path, and
//   3. that post-settle reconcile is a SINGLE background GET /me that repairs any out-of-order resolve
//      or overlap-undo transient back to server truth (there is NO response-snapshot upsert to clobber
//      the cache with an earlier PATCH's stale view).
// The PATCH's fetch is held on a deferred so the "optimistic, pre-resolution" assertion is unambiguous;
// the GET /me mock returns a MUTABLE `serverMe` so the post-settle reconcile can be pointed at server
// truth and asserted.

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
  avatarConfig: null,
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
  let serverMe: typeof ME_BASE; // current server truth — GET /me reads this, so a reconcile is checkable

  beforeEach(() => {
    serverMe = { ...ME_BASE };
    patchDeferred = makeDeferred();
    fetchMock = jest.fn(async (input: RequestInfo | URL) => {
      const { url, method } = reqMeta(input);
      if (url.includes('/me') && method === 'PATCH') return patchDeferred.promise; // held open
      return make200(serverMe); // GET /me — current server truth (mutable, so the reconcile is testable)
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

  it('flips the getMe cache before the PATCH resolves, then reconciles with ONE background GET /me', async () => {
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
    // …and the instant flip did NOT wait on a GET /me — the reconcile is deferred to post-settle
    expect(getMeFetchCount()).toBe(1);

    // the server applies the PATCH; now let it answer
    serverMe = { ...ME_BASE, favouriteGenreIds: [GENRE_A, GENRE_B] };
    patchDeferred.resolve(make200(serverMe));
    await patchPromise;
    await flush();
    await flush();
    await flush();

    // the mutation settled → EXACTLY ONE background GET /me reconciled the cache to server truth
    expect(genresInCache(store)).toEqual([GENRE_A, GENRE_B]);
    expect(getMeFetchCount()).toBe(2);
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
    // reads [GENRE_A] not [] → GENRE_B stacks on top (NOT [GENRE_B] alone): the rapid-tap
    // last-write-wins revert is gone because the second tap computes off the optimistic array
    expect(genresInCache(store)).toEqual([GENRE_A, GENRE_B]);

    // both PATCHes answer IN ORDER; the server holds both and the post-settle reconcile confirms it
    serverMe = { ...ME_BASE, favouriteGenreIds: [GENRE_A, GENRE_B] };
    firstDeferred.resolve(make200({ ...ME_BASE, favouriteGenreIds: [GENRE_A] }));
    secondDeferred.resolve(make200({ ...ME_BASE, favouriteGenreIds: [GENRE_A, GENRE_B] }));
    await Promise.all([p1, p2]);
    await flush();
    await flush();
    await flush();
    expect(genresInCache(store)).toEqual([GENRE_A, GENRE_B]);
  });

  it('OUT-OF-ORDER resolve: the later PATCH resolving first does NOT let the earlier stale snapshot clobber the cache', async () => {
    await store.dispatch(api.endpoints.getMe.initiate());
    expect(genresInCache(store)).toEqual([]);

    // PATCH_1: set [GENRE_A] — held
    const d1 = patchDeferred;
    const p1 = store.dispatch(
      profileApi.endpoints.patchMe.initiate({ favouriteGenreIds: [GENRE_A] }),
    );
    await flush();
    expect(genresInCache(store)).toEqual([GENRE_A]);

    // PATCH_2: the user's LATER, winning selection [GENRE_A, GENRE_B] — held
    patchDeferred = makeDeferred();
    const d2 = patchDeferred;
    const p2 = store.dispatch(
      profileApi.endpoints.patchMe.initiate({ favouriteGenreIds: [GENRE_A, GENRE_B] }),
    );
    await flush();
    expect(genresInCache(store)).toEqual([GENRE_A, GENRE_B]);

    // server truth is the later selection…
    serverMe = { ...ME_BASE, favouriteGenreIds: [GENRE_A, GENRE_B] };
    // …now resolve OUT OF ORDER — PATCH_2 first, then PATCH_1 with its STALE [GENRE_A] snapshot. The old
    // code did upsertQueryData(PATCH_1's response) here → the cache silently reverted to [GENRE_A],
    // durably dropping the user's GENRE_B. The fix drops that upsert, so the stale snapshot can't land;
    // the post-settle reconcile pins server truth.
    d2.resolve(make200({ ...ME_BASE, favouriteGenreIds: [GENRE_A, GENRE_B] }));
    await flush();
    d1.resolve(make200({ ...ME_BASE, favouriteGenreIds: [GENRE_A] }));
    await Promise.all([p1, p2]);
    await flush();
    await flush();
    await flush();

    expect(genresInCache(store)).toEqual([GENRE_A, GENRE_B]); // the later selection SURVIVES
  });

  it('ERROR + OVERLAP: an earlier PATCH rejecting does NOT wipe a later overlapping toggle — the reconcile repairs it', async () => {
    await store.dispatch(api.endpoints.getMe.initiate());
    expect(genresInCache(store)).toEqual([]);

    // PATCH_1: optimistic [GENRE_A] — held, will REJECT
    const d1 = patchDeferred;
    const p1 = store.dispatch(
      profileApi.endpoints.patchMe.initiate({ favouriteGenreIds: [GENRE_A] }),
    );
    await flush();
    expect(genresInCache(store)).toEqual([GENRE_A]);

    // PATCH_2 (overlapping): optimistic [GENRE_A, GENRE_B] — held, will SUCCEED
    patchDeferred = makeDeferred();
    const d2 = patchDeferred;
    const p2 = store.dispatch(
      profileApi.endpoints.patchMe.initiate({ favouriteGenreIds: [GENRE_A, GENRE_B] }),
    );
    await flush();
    expect(genresInCache(store)).toEqual([GENRE_A, GENRE_B]);

    // the server accepted PATCH_2 (both genres); PATCH_1 fails
    serverMe = { ...ME_BASE, favouriteGenreIds: [GENRE_A, GENRE_B] };

    // Settle the SUCCESS first, then the FAILURE last — this is what makes the HIGH-2 wipe durable:
    // PATCH_1's blind undo reverts favouriteGenreIds to its pre-P1 value ([]), which ALSO drops
    // GENRE_B (the later, still-valid toggle). It is the LAST optimistic write, so with no reconcile
    // the cache stays wiped at []. The post-settle reconcile is what repairs it back to server truth.
    d2.resolve(make200({ ...ME_BASE, favouriteGenreIds: [GENRE_A, GENRE_B] }));
    await flush();
    d1.reject(new Error('validation rejected'));
    await Promise.all([p1, p2]);
    await flush();
    await flush();
    await flush();

    // GENRE_B SURVIVES — reconciled to server truth, NOT wiped to [] by P1's over-reverting undo
    expect(genresInCache(store)).toEqual([GENRE_A, GENRE_B]);
  });
});
