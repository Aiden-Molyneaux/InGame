import { configureStore } from '@reduxjs/toolkit';

// walk2-N5 — the friend-graph coherence guarantee: the three social READS (GET /me/friends ·
// /me/friends/requests · /me/feed) share ONE `Social` invalidation family, so a friend mutation
// (here: accept) re-reads ALL THREE together — no more "the feed shows a friend the list doesn't".
// Drives a real store with a stubbed fetch (the reauth.test pattern): subscribe the three reads, count
// their fetches, dispatch accept, and assert every one re-fetched.

jest.mock('./index', () => ({ logoutTeardown: jest.fn(async () => {}) }));
jest.mock('expo-router', () => ({ router: { replace: jest.fn(), navigate: jest.fn(), push: jest.fn(), back: jest.fn() } }));

import authReducer, { setTokens } from './authSlice';
import prefsReducer from './prefsSlice';
import { api } from './api';
import { friendApi } from './friendApi'; // side-effect: injects the social read/write endpoints
import { feedApi } from './feedApi'; // side-effect: injects getFeed (Social-tagged)

// keep the injected slices referenced so the imports aren't tree-shaken
void friendApi;
void feedApi;

function bodyFor(url: string): unknown {
  if (url.includes('/me/friends/requests')) return { incoming: [], outgoing: [] };
  if (url.endsWith('/me/friends')) return { friends: [] };
  if (url.includes('/me/feed')) return { items: [], nextCursor: null };
  if (url.includes('/accept')) return { ok: true };
  return {};
}
function make200(url: string) {
  const body = JSON.stringify(bodyFor(url));
  return {
    status: 200,
    ok: true,
    headers: { get: (k: string) => (k.toLowerCase() === 'content-type' ? 'application/json' : null) },
    text: async () => body,
    json: async () => JSON.parse(body),
    clone() {
      return make200(url);
    },
  };
}

function makeStore() {
  return configureStore({
    reducer: { auth: authReducer, prefs: prefsReducer, [api.reducerPath]: api.reducer },
    middleware: (getDefault) => getDefault().concat(api.middleware),
  });
}

describe('social coherence — the shared `Social` tag (walk2-N5)', () => {
  const realFetch = global.fetch;
  let urls: string[];

  beforeEach(() => {
    urls = [];
    global.fetch = jest.fn(async (input: RequestInfo | URL) => {
      // RTK's fetchBaseQuery passes a Request object — read its `.url` (String(Request) is '[object Request]').
      const u = typeof input === 'string' ? input : ((input as Request).url ?? String(input));
      urls.push(u);
      return make200(u);
    }) as unknown as typeof fetch;
  });
  afterEach(() => {
    global.fetch = realFetch;
  });

  it('accept re-reads the friends list + requests inbox + feed together', async () => {
    const store = makeStore();
    store.dispatch(setTokens({ accessToken: 't', refreshToken: 'r' }));

    // Subscribe the three social reads (kept subscribed → invalidation triggers a refetch). The injected
    // endpoints are typed on the friendApi/feedApi handles (same underlying `api` instance/store).
    await Promise.all([
      store.dispatch(friendApi.endpoints.getFriends.initiate(undefined, { subscribe: true })),
      store.dispatch(friendApi.endpoints.getFriendRequests.initiate(undefined, { subscribe: true })),
      store.dispatch(feedApi.endpoints.getFeed.initiate(undefined, { subscribe: true })),
    ]);

    const seen = (frag: string) => urls.filter((u) => u.includes(frag)).length;
    expect(seen('/me/friends/requests')).toBe(1);
    expect(urls.filter((u) => u.endsWith('/me/friends')).length).toBe(1);
    expect(seen('/me/feed')).toBe(1);

    // A local friend mutation — accept — invalidates `Social`.
    await store.dispatch(
      friendApi.endpoints.acceptFriendRequest.initiate({
        requestId: '11111111-1111-1111-1111-111111111111',
        userId: '22222222-2222-2222-2222-222222222222',
      }),
    );
    await new Promise((r) => setTimeout(r, 50)); // let the invalidation-driven refetches run

    // Every social read re-fetched (the shared-tag coherence) — a SECOND GET for each.
    expect(seen('/me/friends/requests')).toBe(2);
    expect(urls.filter((u) => u.endsWith('/me/friends')).length).toBe(2);
    expect(seen('/me/feed')).toBe(2);
  });
});
