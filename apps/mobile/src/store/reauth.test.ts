import { configureStore } from '@reduxjs/toolkit';

// F-17 regression — the post-logout sign-in FLICKER (a self-perpetuating renderer storm). See
// `baseQueryWithReauth` in ./api. `logoutTeardown()` (an explicit sign-out, OR the 401 teardown
// itself) dispatches `api.util.resetApiState()`, which makes every still-mounted query REFETCH — now
// tokenless, so each 401s straight back into the reauth handler. The bug: each such 401 re-ran the
// FULL teardown (resetApiState AGAIN + router.replace('/sign-in')), which reset the cache again → a
// fresh refetch wave → more 401s … an unbounded loop that re-navigated to /sign-in hundreds of times
// a second (proven on web 2026-07-16: ~1200 fetches + ~400 router.replace in ~4s until the main
// thread starved; on device it reads as the sign-in screen flickering, barely targetable, cleared
// only by an app restart). The fix: a 401 on a request that carried NO live session is EXPECTED
// post-logout — there is nothing left to tear down, so just surface it (no resetApiState, no navigate).
//
// This drives a tokenless GET /me against a 401 server and asserts the reauth handler does NOT tear
// down or navigate — RED before the fix (router.replace + logoutTeardown fire on the tokenless 401),
// GREEN after (the guard short-circuits). `./index` is mocked so the test never touches persist /
// secure-store: it isolates the reauth decision, which is the whole regression.

jest.mock('./index', () => ({
  logoutTeardown: jest.fn(async () => {}),
}));

jest.mock('expo-router', () => ({
  router: { replace: jest.fn(), navigate: jest.fn(), push: jest.fn(), back: jest.fn() },
}));

import { router } from 'expo-router';
import authReducer from './authSlice';
import prefsReducer from './prefsSlice';
import { api } from './api';
import { logoutTeardown } from './index';

function make401() {
  const body = JSON.stringify({ error: { message: 'unauthorized' } });
  return {
    status: 401,
    ok: false,
    headers: { get: (k: string) => (k.toLowerCase() === 'content-type' ? 'application/json' : null) },
    text: async () => body,
    json: async () => JSON.parse(body),
    clone() {
      return make401();
    },
  };
}

function makeStore() {
  return configureStore({
    reducer: { auth: authReducer, prefs: prefsReducer, [api.reducerPath]: api.reducer },
    middleware: (getDefault) => getDefault().concat(api.middleware),
  });
}

describe('baseQueryWithReauth — no teardown loop on a tokenless 401 (F-17 sign-in flicker)', () => {
  const realFetch = global.fetch;
  let fetchMock: jest.Mock;

  beforeEach(() => {
    (router.replace as jest.Mock).mockClear();
    (logoutTeardown as jest.Mock).mockClear();
    fetchMock = jest.fn(async () => make401());
    global.fetch = fetchMock as unknown as typeof fetch;
  });
  afterEach(() => {
    global.fetch = realFetch;
  });

  it('surfaces a tokenless 401 without diverting into teardown/navigation', async () => {
    const store = makeStore();
    // No session dispatched — accessToken is null (the signed-out / post-logout state). A refetch
    // provoked by resetApiState during logout arrives here in exactly this shape.
    await store.dispatch(api.endpoints.getMe.initiate(undefined, { subscribe: true }));
    // Give any (buggy) resetApiState → refetch → 401 → teardown cascade time to run.
    await new Promise((r) => setTimeout(r, 50));

    // The guard makes a tokenless 401 a no-op: the handler RETURNS the 401 (the query settles with a
    // clean {status:401}) instead of diverting into the refresh/teardown branch. Before the fix the
    // handler falls through to `logoutTeardown()` + `router.replace('/sign-in')` — the re-entrant path
    // whose `resetApiState()` re-provokes the whole refetch wave (the flicker loop).
    const q = Object.values((store.getState() as { api: { queries: Record<string, { error?: unknown }> } }).api.queries)[0];
    expect((q?.error as { status?: number } | undefined)?.status).toBe(401);
    expect(router.replace).not.toHaveBeenCalled();
    expect(logoutTeardown).not.toHaveBeenCalled();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
