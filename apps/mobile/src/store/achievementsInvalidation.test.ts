import { configureStore } from '@reduxjs/toolkit';

// W-A8 (walk2) — the unlock-triggering mutations invalidate the /me/achievements cache, so the ACH-06
// CelebrationHost's refetch-delta fires promptly ON the action (not on the next focus/app-restart —
// the owner completed SHELF STARTER and saw nothing until a restart). One REPRESENTATIVE mutation per
// touched slice file drives a REAL store (api reducer + middleware, mocked fetch): a subscribed
// getMyAchievements query must REFETCH after the mutation fulfils. Representatives:
//   api.ts          → claimDailyBonus       (a10 ladder_graduate / b6 night_shift)
//   communityApi.ts → adoptCard             (a7 good_taste / b4 patron — the adopter half)
//   friendApi.ts    → acceptFriendRequest   (a5 player_two / a6 full_lobby — the accepter half)
//   queueApi.ts     → addQueueItem friend_rec (the b8 recipient half)
// Other-actor unlocks (a13/a14/a15, b8's recommender credit) still ride focus/reconnect → M7 push.

jest.mock('./index', () => ({ logoutTeardown: jest.fn(async () => {}) }));
jest.mock('expo-router', () => ({
  router: { replace: jest.fn(), navigate: jest.fn(), push: jest.fn(), back: jest.fn() },
}));

import authReducer, { setTokens } from './authSlice';
import prefsReducer from './prefsSlice';
import { api } from './api';
import { achievementsApi } from './achievementsApi';
import { communityApi } from './communityApi';
import { friendApi } from './friendApi';
import { queueApi } from './queueApi';

const UUID_A = '11111111-1111-4111-8111-111111111111';
const UUID_B = '22222222-2222-4222-8222-222222222222';

// the minimal valid bodies each endpoint's zod seam accepts
const ME_ACH = {
  summary: { earned: 0, inProgress: 0, secretsFound: 0, secretsTotal: 6 },
  earned: [],
  inProgress: [],
  secrets: { found: [], lockedCount: 6 },
};
const ADOPT = { granted: [], totalPaid: 0, balance: 10 };
const QUEUE_ITEM = {
  itemId: UUID_A,
  gameId: UUID_B,
  title: 'Celeste',
  card: { id: 'c1', imageUrl: null, thumbUrl: null, isCustom: false, isPremium: false },
  owned: false,
  source: 'friend_rec',
  note: null,
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
  });
  store.dispatch(setTokens({ accessToken: 'tok', refreshToken: 'ref' }));
  return store;
}

const flush = () => new Promise((r) => setTimeout(r, 0));

describe('W-A8 — unlock-triggering mutations invalidate MeAchievements (on-action celebration)', () => {
  const realFetch = global.fetch;
  let fetchMock: jest.Mock;

  beforeEach(() => {
    fetchMock = jest.fn(async (input: RequestInfo | URL) => {
      const url = typeof input === 'string' ? input : (input as Request).url;
      if (url.includes('/me/achievements')) return make200(ME_ACH);
      if (url.includes('/adopt')) return make200(ADOPT);
      if (url.includes('/me/queue')) return make200(QUEUE_ITEM);
      return make200({ ok: true }); // daily-bonus · accept — no zod seam
    });
    global.fetch = fetchMock as unknown as typeof fetch;
  });
  afterEach(() => {
    global.fetch = realFetch;
  });

  const achFetchCount = () =>
    fetchMock.mock.calls.filter(([input]) => {
      const url = typeof input === 'string' ? input : (input as Request).url;
      return url.includes('/me/achievements');
    }).length;

  // subscribe the achievements read (the CelebrationHost's standing subscription), then run the
  // mutation and assert the read REFETCHED (the invalidation fired).
  async function expectRefetchAfter(run: (store: ReturnType<typeof makeStore>) => Promise<unknown>) {
    const store = makeStore();
    const sub = store.dispatch(achievementsApi.endpoints.getMyAchievements.initiate());
    await sub;
    expect(achFetchCount()).toBe(1);
    await run(store);
    await flush();
    await flush();
    expect(achFetchCount()).toBe(2); // the mutation invalidated MeAchievements → the read re-fired
  }

  it('api.ts — claimDailyBonus refetches the achievements read', async () => {
    await expectRefetchAfter(async (store) => {
      await store.dispatch(api.endpoints.claimDailyBonus.initiate()).unwrap();
    });
  });

  it('communityApi — adoptCard refetches the achievements read', async () => {
    await expectRefetchAfter(async (store) => {
      await store.dispatch(communityApi.endpoints.adoptCard.initiate(UUID_A)).unwrap();
    });
  });

  it('friendApi — acceptFriendRequest refetches the achievements read', async () => {
    await expectRefetchAfter(async (store) => {
      await store
        .dispatch(friendApi.endpoints.acceptFriendRequest.initiate({ requestId: UUID_A, userId: UUID_B }))
        .unwrap();
    });
  });

  it('queueApi — addQueueItem (friend_rec, the b8 recipient half) refetches the achievements read', async () => {
    await expectRefetchAfter(async (store) => {
      await store
        .dispatch(
          queueApi.endpoints.addQueueItem.initiate({ gameId: UUID_B, source: 'friend_rec', fromRecId: UUID_A }),
        )
        .unwrap();
    });
  });

  it('a NON-trigger mutation does NOT invalidate the achievements read (no blanket chatter)', async () => {
    const store = makeStore();
    const sub = store.dispatch(achievementsApi.endpoints.getMyAchievements.initiate());
    await sub;
    expect(achFetchCount()).toBe(1);
    // a plain self-add to the queue (source 'collection') is not an unlock trigger
    await store
      .dispatch(queueApi.endpoints.addQueueItem.initiate({ gameId: UUID_B, source: 'collection' }))
      .unwrap();
    await flush();
    await flush();
    expect(achFetchCount()).toBe(1); // untouched
  });
});
