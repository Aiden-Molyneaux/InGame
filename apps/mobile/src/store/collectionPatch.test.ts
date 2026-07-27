import { configureStore } from '@reduxjs/toolkit';
import type { CollectionItem, SelfProfile } from '@ingame/shared';

// P6/R2 (perf-investigation §R2 · fix-wave #3) — the shelf mutations PATCH the cached `/me/collection`
// instead of invalidating it. This suite is the regression net for that trade, and it pins THREE things
// per mutation:
//   1. the patch — the cache says what the server will say (optimistic where the user is watching),
//   2. the rollback — a failed request leaves the cache byte-identical to before it started,
//   3. the receipt — the full-shelf GET is GONE (one fetch per mutation, not two), while every
//      NON-'Collection' invalidation the mutation used to carry still fires (the coherence guarantee:
//      'Me' re-reads for the profile stats + the WTP-03 pin).
// Drives a REAL store (api reducer + middleware, stubbed fetch) — the socialCoherence.test pattern.

jest.mock('./index', () => ({ logoutTeardown: jest.fn(async () => {}) }));
jest.mock('expo-router', () => ({
  router: { replace: jest.fn(), navigate: jest.fn(), push: jest.fn(), back: jest.fn() },
}));

import authReducer, { setTokens } from './authSlice';
import prefsReducer from './prefsSlice';
import { api } from './api';

const ENTRY_A = '11111111-1111-4111-8111-111111111111';
const ENTRY_B = '11111111-1111-4111-8111-222222222222';
const GAME_A = '22222222-2222-4222-8222-111111111111';
const GAME_B = '22222222-2222-4222-8222-222222222222';
const CARD_A = '33333333-3333-4333-8333-111111111111';
const CARD_NEW = '33333333-3333-4333-8333-999999999999';
const USER = '44444444-4444-4444-8444-444444444444';

function item(entryId: string, gameId: string, over: Partial<CollectionItem> = {}): CollectionItem {
  return {
    entryId,
    gameId,
    title: 'Elden Ring',
    developer: 'FromSoftware',
    publisher: null,
    releaseYear: 2022,
    genres: [],
    hours: 12,
    percentComplete: 40,
    status: 'playing',
    ownedSince: '2022-02-25',
    addedAt: '2022-02-25T00:00:00.000Z',
    nowPlaying: false,
    card: { id: 'default', imageUrl: null, thumbUrl: null, isCustom: false, isPremium: false },
    rating: null,
    notes: null,
    ...over,
  };
}

function collection(): { items: CollectionItem[]; nextCursor: null; total: number; collectionTotal: number } {
  return {
    items: [item(ENTRY_A, GAME_A, { card: { id: CARD_A, imageUrl: null, thumbUrl: null, isCustom: true, isPremium: false, name: 'Old name' } }), item(ENTRY_B, GAME_B, { nowPlaying: true })],
    nextCursor: null,
    total: 2,
    collectionTotal: 2,
  };
}

const ME: SelfProfile = {
  id: USER,
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
  favouriteGenreIds: [],
  gamertags: [],
  usernameNextChangeAt: null,
  stats: { games: 2, hours: 12, completionPct: 40, cardsDesigned: 1, adoptionsReceived: 0, friends: 0 },
  cardsPublished: 0,
  favouriteGame: null,
  nowPlaying: null,
  top10: [],
};

// ── the fetch stub: per-URL bodies, a queue of scripted responses for the mutation under test ────────
type Scripted = { status: number; body: unknown };
let urls: string[];
let scripted: Scripted[];
// SERVER TRUTH for GET /me/collection — mutable so tests that expect a deliberate refetch (the equip's
// anti-race invalidation · the error-heal) can model what the server would return post-mutation.
let serverCollection: ReturnType<typeof collection>;

function respond(status: number, body: unknown) {
  const text = JSON.stringify(body);
  return {
    status,
    ok: status >= 200 && status < 300,
    headers: { get: (k: string) => (k.toLowerCase() === 'content-type' ? 'application/json' : null) },
    text: async () => text,
    json: async () => JSON.parse(text),
    clone() {
      return respond(status, body);
    },
  };
}

function installFetch() {
  global.fetch = jest.fn(async (input: RequestInfo | URL) => {
    const req = input as Request;
    const url = typeof input === 'string' ? input : (req.url ?? String(input));
    const method = typeof input === 'string' ? 'GET' : (req.method ?? 'GET');
    urls.push(`${method} ${url}`);
    if (method === 'GET' && url.endsWith('/me/collection')) return respond(200, serverCollection);
    if (method === 'GET' && url.endsWith('/me')) return respond(200, ME);
    const next = scripted.shift();
    if (!next) throw new Error(`unscripted request: ${method} ${url}`);
    return respond(next.status, next.body);
  }) as unknown as typeof fetch;
}

function makeStore() {
  const store = configureStore({
    reducer: { auth: authReducer, prefs: prefsReducer, [api.reducerPath]: api.reducer },
    middleware: (getDefault) => getDefault().concat(api.middleware),
  });
  store.dispatch(setTokens({ accessToken: 't', refreshToken: 'r' }));
  return store;
}

type Store = ReturnType<typeof makeStore>;
const shelf = (store: Store) =>
  api.endpoints.getCollection.select()(store.getState() as never).data!;
const count = (fragment: string) => urls.filter((u) => u.includes(fragment)).length;
const collectionGets = () => urls.filter((u) => u === 'GET http://localhost:4000/api/me/collection').length;
const flush = () => new Promise((r) => setTimeout(r, 0));

/** Subscribe the shelf (and, where the coherence guarantee is under test, the profile read). */
async function seed(store: Store, alsoMe = false): Promise<void> {
  const subs = [store.dispatch(api.endpoints.getCollection.initiate(undefined, { subscribe: true }))];
  if (alsoMe) subs.push(store.dispatch(api.endpoints.getMe.initiate(undefined, { subscribe: true })) as never);
  await Promise.all(subs);
}

describe('P6/R2 — the shelf is PATCHED, not refetched', () => {
  const realFetch = global.fetch;
  beforeEach(() => {
    urls = [];
    scripted = [];
    serverCollection = collection();
    installFetch();
  });
  afterEach(() => {
    global.fetch = realFetch;
  });

  // ── updateEntry (COL-02/03/05 · Log Hours · the COL-06 equip) ──────────────────────────────────
  describe('updateEntry', () => {
    it('patches the row OPTIMISTICALLY, reconciles from the response, and never refetches the shelf', async () => {
      const store = makeStore();
      await seed(store);
      expect(collectionGets()).toBe(1);

      // hold the PATCH open so the OPTIMISTIC state is observable mid-flight
      let release!: () => void;
      const held = new Promise<void>((r) => (release = r));
      const server = item(ENTRY_A, GAME_A, { hours: 99, status: 'beaten', card: shelf(store).items[0]!.card });
      (global.fetch as jest.Mock).mockImplementationOnce(async () => {
        urls.push('PATCH /me/collection/:id');
        await held;
        return respond(200, server);
      });

      const pending = store.dispatch(
        api.endpoints.updateEntry.initiate({ entryId: ENTRY_A, hours: 99, status: 'beaten' }),
      );
      await flush();
      // 1) OPTIMISTIC — the shelf already reads the new values, with no response yet
      expect(shelf(store).items[0]!.hours).toBe(99);
      expect(shelf(store).items[0]!.status).toBe('beaten');
      expect(shelf(store).items[1]!.hours).toBe(12); // untouched row

      release();
      await pending;
      await flush();

      // 2) RECONCILED from the server's authoritative item
      expect(shelf(store).items[0]!.hours).toBe(99);
      // 3) RECEIPT — no second GET /me/collection (before this fix the 'Collection' tag forced one)
      expect(collectionGets()).toBe(1);
    });

    it('ROLLS BACK the optimistic patch when the server refuses (422), then HEALS with one refetch', async () => {
      const store = makeStore();
      await seed(store);
      const before = shelf(store).items[0]!;
      scripted.push({ status: 422, body: { error: { code: 'validation_error', message: 'nope' } } });

      await store.dispatch(api.endpoints.updateEntry.initiate({ entryId: ENTRY_A, hours: 999999 }));
      await flush();
      await flush();

      expect(shelf(store).items[0]!.hours).toBe(12);
      expect(shelf(store).items[0]).toEqual(before); // structurally identical to the pre-mutation row
      // Walk-4 Murr — undo alone misbehaves under OVERLAPPING mutations (path-based inverse patches
      // clobber a survivor's state), so the error path heals with a refetch of server truth. Errors
      // are rare; the hot path (success) still never refetches.
      expect(collectionGets()).toBe(2);
    });

    it('the COL-06 EQUIP reconciles the rider AND deliberately refetches (the adopt-race healer)', async () => {
      const store = makeStore();
      await seed(store);
      const equipped = item(ENTRY_A, GAME_A, {
        card: { id: CARD_NEW, imageUrl: '/media/cards/x/full.png', thumbUrl: null, isCustom: true, isPremium: true, name: 'Equipped' },
      });
      // the server's post-PATCH truth — both the PATCH response and any later shelf read carry it
      serverCollection = { ...serverCollection, items: [equipped, serverCollection.items[1]!] };
      scripted.push({ status: 200, body: equipped });

      await store.dispatch(
        api.endpoints.updateEntry.initiate({ entryId: ENTRY_A, activeCardDesignId: CARD_NEW }),
      );
      await flush();
      await flush();

      expect(shelf(store).items[0]!.card.id).toBe(CARD_NEW);
      expect(shelf(store).items[0]!.card.isPremium).toBe(true);
      // Walk-4 Murr (batch-3 major) — an EQUIP keeps the full 'Collection' invalidation: the P2 add
      // flow chains it right behind an adopt/publish whose OWN invalidation dispatched a slow full-
      // shelf GET; without a post-equip refetch that pre-equip snapshot can land LAST and wholesale-
      // replace the reconciled cache. The refetch here is dispatched after the PATCH fulfils, which
      // serializes it. Equips are rare — plain field updates (above) still never refetch.
      expect(collectionGets()).toBe(2);
    });

    it("still invalidates 'Me' — the profile stats coherence the old shelf invalidation rode with", async () => {
      const store = makeStore();
      await seed(store, true);
      expect(count('GET http://localhost:4000/api/me')).toBe(2); // /me/collection + /me
      scripted.push({ status: 200, body: item(ENTRY_A, GAME_A, { status: 'beaten' }) });

      await store.dispatch(api.endpoints.updateEntry.initiate({ entryId: ENTRY_A, status: 'beaten' }));
      await flush();
      await flush();

      expect(urls.filter((u) => u === 'GET http://localhost:4000/api/me').length).toBe(2); // /me re-read
      expect(collectionGets()).toBe(1); // the shelf did not
    });
  });

  // ── setNowPlaying (WTP-03 — the single pin) ────────────────────────────────────────────────────
  describe('setNowPlaying', () => {
    it('moves the pin optimistically (exactly one ▶ NOW) with no shelf refetch', async () => {
      const store = makeStore();
      await seed(store);
      expect(shelf(store).items[1]!.nowPlaying).toBe(true);
      scripted.push({ status: 200, body: { ok: true } });

      const pending = store.dispatch(api.endpoints.setNowPlaying.initiate({ gameId: GAME_A }));
      await flush();
      expect(shelf(store).items[0]!.nowPlaying).toBe(true);
      expect(shelf(store).items[1]!.nowPlaying).toBe(false); // the old pin cleared — the single-pin rule

      await pending;
      await flush();
      expect(shelf(store).items.filter((i) => i.nowPlaying).length).toBe(1);
      expect(collectionGets()).toBe(1);
    });

    it('a null gameId clears the pin', async () => {
      const store = makeStore();
      await seed(store);
      scripted.push({ status: 200, body: { ok: true } });

      await store.dispatch(api.endpoints.setNowPlaying.initiate({ gameId: null }));
      await flush();

      expect(shelf(store).items.some((i) => i.nowPlaying)).toBe(false);
      expect(collectionGets()).toBe(1);
    });

    it('ROLLS BACK to the previous pin when the server refuses, then HEALS with one refetch', async () => {
      const store = makeStore();
      await seed(store);
      scripted.push({ status: 422, body: { error: { code: 'not_in_collection', message: 'no' } } });

      await store.dispatch(api.endpoints.setNowPlaying.initiate({ gameId: GAME_A }));
      await flush();
      await flush();

      expect(shelf(store).items[0]!.nowPlaying).toBe(false);
      expect(shelf(store).items[1]!.nowPlaying).toBe(true); // the original pin is back
      // Walk-4 Murr — the two-pins interleaving (A fails after B applied → undo(A) resurrects the old
      // pin beside B's) is healed by the error-path refetch; see updateEntry's rollback test.
      expect(collectionGets()).toBe(2);
    });
  });

  // ── removeEntry (COL-01) ───────────────────────────────────────────────────────────────────────
  describe('removeEntry', () => {
    it('drops the row + both totals on success, with no shelf refetch', async () => {
      const store = makeStore();
      await seed(store);
      scripted.push({ status: 200, body: { ok: true } });

      await store.dispatch(api.endpoints.removeEntry.initiate(ENTRY_A));
      await flush();

      expect(shelf(store).items.map((i) => i.entryId)).toEqual([ENTRY_B]);
      expect(shelf(store).total).toBe(1);
      expect(shelf(store).collectionTotal).toBe(1);
      expect(collectionGets()).toBe(1);
    });

    it('leaves the shelf untouched when the delete fails', async () => {
      const store = makeStore();
      await seed(store);
      scripted.push({ status: 404, body: { error: { code: 'not_found', message: 'gone' } } });

      await store.dispatch(api.endpoints.removeEntry.initiate(ENTRY_A));
      await flush();

      expect(shelf(store).items.map((i) => i.entryId)).toEqual([ENTRY_A, ENTRY_B]);
      expect(shelf(store).total).toBe(2);
      expect(collectionGets()).toBe(1);
    });
  });

  // ── updateCard (CARD-24a autosave — the ~1.2s-debounced PATCH) ─────────────────────────────────
  describe('updateCard', () => {
    it('refreshes the EQUIPPED rider from the response instead of refetching the shelf (murr F4)', async () => {
      const store = makeStore();
      await seed(store);
      scripted.push({
        status: 200,
        body: {
          id: CARD_A,
          gameId: GAME_A,
          name: 'New name',
          status: 'private',
          composition: { schemaVersion: 1, base: { fill: '#123456' }, elements: [] },
          compositionHash: 'h',
          imageUrl: '/media/cards/a/full.png',
          thumbUrl: '/media/cards/a/thumb.png',
          isPremium: true,
          derivedFromCardId: null,
          createdAt: '2026-07-01T00:00:00.000Z',
          updatedAt: '2026-07-02T00:00:00.000Z',
        },
      });

      await store.dispatch(api.endpoints.updateCard.initiate({ cardId: CARD_A, name: 'New name' }));
      await flush();

      const rider = shelf(store).items[0]!.card;
      expect(rider.name).toBe('New name');
      expect(rider.isPremium).toBe(true);
      expect(rider.thumbUrl).toBe('/media/cards/a/thumb.png');
      expect(rider.composition).toEqual({ schemaVersion: 1, base: { fill: '#123456' }, elements: [] });
      expect(collectionGets()).toBe(1);
    });

    it('an UNEQUIPPED design touches neither the shelf nor the network beyond its own PATCH', async () => {
      const store = makeStore();
      await seed(store);
      const before = shelf(store);
      scripted.push({
        status: 200,
        body: {
          id: CARD_NEW,
          gameId: GAME_A,
          name: 'Draft',
          status: 'draft',
          composition: { schemaVersion: 1, base: { fill: '#000000' }, elements: [] },
          compositionHash: 'h2',
          imageUrl: null,
          thumbUrl: null,
          isPremium: false,
          derivedFromCardId: null,
          createdAt: '2026-07-01T00:00:00.000Z',
          updatedAt: '2026-07-02T00:00:00.000Z',
        },
      });

      await store.dispatch(api.endpoints.updateCard.initiate({ cardId: CARD_NEW, name: 'Draft' }));
      await flush();

      expect(shelf(store)).toEqual(before); // no row carries this design
      expect(collectionGets()).toBe(1);
    });
  });
});
