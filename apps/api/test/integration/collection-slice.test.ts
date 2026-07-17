import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import { randomUUID } from 'node:crypto';
import { PostgreSqlContainer, type StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import type { Express } from 'express';

// COL-01..07/09 + WTP-03 — the personal collection at the HTTP boundary (supertest + REAL Postgres).
// collection_entries is USER-OWNED: every write here is a G-D re-fire target — the standing actor-B
// 4xx tests (SYS-01/07) plus the F36 concurrent double-add race. M3 posture (decision 0058): the
// list is UNPAGINATED with honest totals (D4) and takes no server query params (D2 — the drawer
// executes client-side); `card` resolves to the CARD-18 default-face stub until M4.
// Tags: COL-01/02/03/07, WTP-03, CAT-09, SYS-01/02/07.

let container: StartedPostgreSqlContainer;
let app: Express;

const PW = 'Sup3rSecret!';
let counter = 0;

function authed(token: string) {
  return { Authorization: `Bearer ${token}` };
}

async function registerUser() {
  counter += 1;
  const email = `col${counter}_${randomUUID().slice(0, 6)}@example.com`;
  const username = `coluser${counter}${randomUUID().slice(0, 4)}`;
  const res = await request(app)
    .post('/api/auth/register')
    .send({ email, username, password: PW, acceptedTerms: true });
  if (res.status !== 201) throw new Error(`registerUser failed: ${res.status}`);
  return { id: res.body.user.id as string, username, token: res.body.accessToken as string };
}

async function seedGame(token: string, name: string, over: Record<string, unknown> = {}) {
  const genresRes = await request(app).get('/api/genres').set(authed(token));
  const rpg = genresRes.body.items.find((g: { name: string }) => g.name === 'RPG');
  const res = await request(app)
    .post('/api/catalog/games')
    .set(authed(token))
    .send({ name, genreIds: [rpg.id], ...over });
  if (res.status !== 201) throw new Error(`seedGame failed: ${res.status}`);
  return res.body as { id: string; name: string };
}

async function addEntry(token: string, gameId: string) {
  return request(app).post('/api/me/collection').set(authed(token)).send({ gameId });
}

async function getCollection(token: string) {
  return request(app).get('/api/me/collection').set(authed(token));
}

beforeAll(async () => {
  container = await new PostgreSqlContainer('postgres:16-alpine').start();
  process.env.DATABASE_URL = container.getConnectionUri();
  process.env.DISPOSABLE_DB = '1';
  process.env.JWT_SIGNING_SECRET = 'test-signing-secret-at-least-16-chars-long';

  const { runMigrations } = await import('../../src/db/migrate');
  await runMigrations();
  const { createApp } = await import('../../src/app');
  app = createApp();
}, 120_000);

afterAll(async () => {
  const { closeDb } = await import('../../src/db/client');
  await closeDb();
  if (container) await container.stop();
});

beforeEach(async () => {
  const { resetDb } = await import('../../src/db/reset');
  await resetDb();
  const { resetRateLimitStore } = await import('../../src/http/rateLimit');
  resetRateLimitStore();
  const { clearRuleOverrides } = await import('../../src/config/rate-limits');
  clearRuleOverrides();
});

describe('SYS-05 (OQ-094): collection writes are rate-limited (collection:write)', () => {
  it('bursting collection writes past the limit → 429 RATE_LIMITED', async () => {
    const a = await registerUser();
    const { overrideRuleForTest } = await import('../../src/config/rate-limits');
    overrideRuleForTest('collection:write', { limit: 2, windowMs: 60_000 });
    const results: request.Response[] = [];
    for (let i = 0; i < 4; i++) {
      results.push(await request(app).put('/api/me/now-playing').set(authed(a.token)).send({ gameId: null }));
    }
    const limited = results.filter((r) => r.status === 429);
    expect(limited.length).toBeGreaterThan(0);
    expect(limited[0]?.body.error.code).toBe('RATE_LIMITED');
  });
});

describe('code-review hardening (M3 closeout)', () => {
  it('WTP-03: now-playing a game NOT in your collection → 422 not_in_collection', async () => {
    const a = await registerUser();
    const game = await seedGame(a.token, 'Unowned Game'); // in the catalog, NOT on the shelf
    const res = await request(app)
      .put('/api/me/now-playing')
      .set(authed(a.token))
      .send({ gameId: game.id });
    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('PATCH with an empty body → 422 (no silent no-op mutation)', async () => {
    const a = await registerUser();
    const game = await seedGame(a.token, 'Empty Body Game');
    const added = await addEntry(a.token, game.id);
    const res = await request(app)
      .patch(`/api/me/collection/${added.body.entryId}`)
      .set(authed(a.token))
      .send({});
    expect(res.status).toBe(422);
  });

  it('a malformed :entryId → 404, not a 500 (uuid guard)', async () => {
    const a = await registerUser();
    const patch = await request(app)
      .patch('/api/me/collection/not-a-uuid')
      .set(authed(a.token))
      .send({ status: 'beaten' });
    expect(patch.status).toBe(404);
    const del = await request(app).delete('/api/me/collection/not-a-uuid').set(authed(a.token));
    expect(del.status).toBe(404);
  });
});

describe('COL-01: GET /me/collection — the real shelf (D4 unpaginated, honest totals)', () => {
  it('an empty shelf → { items: [], nextCursor: null, total: 0, collectionTotal: 0 }', async () => {
    const a = await registerUser();
    const res = await getCollection(a.token);
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ items: [], nextCursor: null, total: 0, collectionTotal: 0 });
  });

  it('returns the 0.17 item enumeration with the CARD-18 default-face stub (pre-M4)', async () => {
    const a = await registerUser();
    const game = await seedGame(a.token, 'Elden Ring', {
      studio: 'FromSoftware',
      publisher: 'Bandai Namco',
      releaseDate: '2022-02-25',
    });
    const added = await addEntry(a.token, game.id);
    expect(added.status).toBe(201);

    const res = await getCollection(a.token);
    expect(res.status).toBe(200);
    expect(res.body.total).toBe(1);
    expect(res.body.collectionTotal).toBe(1); // the C4 class — never a phantom total
    expect(res.body.nextCursor).toBeNull();
    const item = res.body.items[0];
    expect(item.entryId).toBe(added.body.entryId);
    expect(item.gameId).toBe(game.id);
    expect(item.title).toBe('Elden Ring');
    expect(item.developer).toBe('FromSoftware');
    expect(item.publisher).toBe('Bandai Namco');
    expect(item.releaseYear).toBe(2022);
    expect(item.genres).toEqual([expect.objectContaining({ name: 'RPG' })]);
    expect(item.hours).toBe(0);
    expect(item.percentComplete).toBeNull();
    expect(item.status).toBe('backlog');
    expect(typeof item.ownedSince).toBe('string'); // defaults to the add date (COL-03)
    expect(item.nowPlaying).toBe(false);
    expect(item.card).toEqual({
      id: 'default',
      imageUrl: null,
      thumbUrl: null,
      isCustom: false,
      isPremium: false,
    });
  });
});

describe('COL-01: POST /me/collection — add a catalog game to YOUR shelf', () => {
  it('adds → 201 the collection item; the CAT-09 count + own-it flag flip', async () => {
    const a = await registerUser();
    const game = await seedGame(a.token, 'Hades');
    const res = await addEntry(a.token, game.id);
    expect(res.status).toBe(201);
    expect(res.body.gameId).toBe(game.id);
    expect(res.body.status).toBe('backlog');

    const search = await request(app).get('/api/catalog/search?q=hades').set(authed(a.token));
    expect(search.body.items[0].inCollection).toBe(true);
    expect(search.body.items[0].collectionsCount).toBe(1);
  });

  it('an unknown gameId → 422', async () => {
    const a = await registerUser();
    const res = await addEntry(a.token, randomUUID());
    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('a duplicate add → 422 already_in_collection', async () => {
    const a = await registerUser();
    const game = await seedGame(a.token, 'Celeste');
    expect((await addEntry(a.token, game.id)).status).toBe(201);
    const dup = await addEntry(a.token, game.id);
    expect(dup.status).toBe(422);
    expect(dup.body.error.reason).toBe('already_in_collection');
  });

  it('F36: N concurrent adds of the SAME game → exactly one 201, the rest 4xx (unique pair index)', async () => {
    const a = await registerUser();
    const game = await seedGame(a.token, 'Hollow Knight');
    const results = await Promise.all(Array.from({ length: 6 }, () => addEntry(a.token, game.id)));
    expect(results.filter((r) => r.status === 201)).toHaveLength(1);
    expect(results.filter((r) => r.status >= 400 && r.status < 500)).toHaveLength(5);
    const shelf = await getCollection(a.token);
    expect(shelf.body.collectionTotal).toBe(1);
  });

  it('authz:collection_add — an unauthenticated actorB → 401; a smuggled userId → 422 (SYS-01)', async () => {
    const a = await registerUser();
    const game = await seedGame(a.token, 'Stardew Valley');
    expect((await request(app).post('/api/me/collection').send({ gameId: game.id })).status).toBe(401);
    const smuggled = await request(app)
      .post('/api/me/collection')
      .set(authed(a.token))
      .send({ gameId: game.id, userId: randomUUID() });
    expect(smuggled.status).toBe(422);
  });
});

describe('COL-02/03: PATCH /me/collection/:entryId — status · hours · the personal fields', () => {
  async function seededEntry() {
    const a = await registerUser();
    const game = await seedGame(a.token, `Game ${counter}_${randomUUID().slice(0, 4)}`);
    const added = await addEntry(a.token, game.id);
    return { a, game, entryId: added.body.entryId as string };
  }

  it('updates status + hours + percentComplete + ownedSince + rating → the updated item', async () => {
    const { a, entryId } = await seededEntry();
    const res = await request(app)
      .patch(`/api/me/collection/${entryId}`)
      .set(authed(a.token))
      .send({ status: 'playing', hours: 42, percentComplete: 55, ownedSince: '2025-12-25', rating: 5 });
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('playing');
    expect(res.body.hours).toBe(42);
    expect(res.body.percentComplete).toBe(55);
    expect(res.body.ownedSince).toBe('2025-12-25');
  });

  it('enforces the COL-02 six-status enum and the COL-03 bounds (hours ≤99,999 · % 0–100 · ⭐ 1–5)', async () => {
    const { a, entryId } = await seededEntry();
    const patch = (body: Record<string, unknown>) =>
      request(app).patch(`/api/me/collection/${entryId}`).set(authed(a.token)).send(body);
    expect((await patch({ status: 'obsessed' })).status).toBe(422);
    expect((await patch({ hours: 100_000 })).status).toBe(422);
    expect((await patch({ hours: 99_999 })).status).toBe(200);
    expect((await patch({ percentComplete: 101 })).status).toBe(422);
    expect((await patch({ rating: 6 })).status).toBe(422);
  });

  it('authz:collection_update — actor-B PATCHing actor-A’s entry → 404, A’s row untouched (SYS-01/07)', async () => {
    const { a, entryId } = await seededEntry();
    const actorB = await registerUser();
    const attack = await request(app)
      .patch(`/api/me/collection/${entryId}`)
      .set(authed(actorB.token))
      .send({ hours: 9999 });
    expect(attack.status).toBe(404); // the same shape an unknown id returns — no existence oracle
    const shelf = await getCollection(a.token);
    expect(shelf.body.items[0].hours).toBe(0);
  });
});

describe('COL-01: DELETE /me/collection/:entryId — remove from YOUR shelf', () => {
  it('removes own → { ok: true } and the shelf shrinks', async () => {
    const a = await registerUser();
    const game = await seedGame(a.token, 'Undertale');
    const added = await addEntry(a.token, game.id);
    const res = await request(app)
      .delete(`/api/me/collection/${added.body.entryId}`)
      .set(authed(a.token));
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true });
    expect((await getCollection(a.token)).body.collectionTotal).toBe(0);
  });

  it('authz:collection_remove — actor-B DELETing actor-A’s entry → 404, the entry survives', async () => {
    const a = await registerUser();
    const game = await seedGame(a.token, 'Journey');
    const added = await addEntry(a.token, game.id);
    const actorB = await registerUser();
    const attack = await request(app)
      .delete(`/api/me/collection/${added.body.entryId}`)
      .set(authed(actorB.token));
    expect(attack.status).toBe(404);
    expect((await getCollection(a.token)).body.collectionTotal).toBe(1);
  });
});

describe('COL-07: PATCH /me/collection/reorder — the manual order', () => {
  it('saves a full permutation; GET returns the new order', async () => {
    const a = await registerUser();
    const g1 = await seedGame(a.token, 'First Game');
    const g2 = await seedGame(a.token, 'Second Game');
    const g3 = await seedGame(a.token, 'Third Game');
    const e1 = (await addEntry(a.token, g1.id)).body.entryId;
    const e2 = (await addEntry(a.token, g2.id)).body.entryId;
    const e3 = (await addEntry(a.token, g3.id)).body.entryId;

    const res = await request(app)
      .patch('/api/me/collection/reorder')
      .set(authed(a.token))
      .send({ orderedEntryIds: [e3, e1, e2] });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true });

    const shelf = await getCollection(a.token);
    expect(shelf.body.items.map((i: { entryId: string }) => i.entryId)).toEqual([e3, e1, e2]);
  });

  it('rejects a non-permutation (missing / unknown ids) → 422', async () => {
    const a = await registerUser();
    const g1 = await seedGame(a.token, 'Alpha Game');
    const g2 = await seedGame(a.token, 'Beta Game');
    const e1 = (await addEntry(a.token, g1.id)).body.entryId;
    await addEntry(a.token, g2.id);
    const missing = await request(app)
      .patch('/api/me/collection/reorder')
      .set(authed(a.token))
      .send({ orderedEntryIds: [e1] });
    expect(missing.status).toBe(422);
  });

  it('authz:collection_reorder — actor-B replaying actor-A’s entry ids → 4xx, A’s order untouched', async () => {
    const a = await registerUser();
    const g1 = await seedGame(a.token, 'Gamma Game');
    const g2 = await seedGame(a.token, 'Delta Game');
    const e1 = (await addEntry(a.token, g1.id)).body.entryId;
    const e2 = (await addEntry(a.token, g2.id)).body.entryId;

    const actorB = await registerUser();
    const attack = await request(app)
      .patch('/api/me/collection/reorder')
      .set(authed(actorB.token))
      .send({ orderedEntryIds: [e2, e1] });
    expect(attack.status).toBeGreaterThanOrEqual(400);
    expect(attack.status).toBeLessThan(500);
    const shelf = await getCollection(a.token);
    expect(shelf.body.items.map((i: { entryId: string }) => i.entryId)).toEqual([e1, e2]);
  });

  it('F36 (M6 P7): concurrent full-permutation reorders → both succeed serially, one consistent final order, no deadlock', async () => {
    // The queue-service.reorder precedent (WTP-01, decision 0076): `setPositions` issues N sequential
    // row UPDATEs in the caller-chosen order, so two concurrent reorders with DIFFERENT target
    // orderings can lock the same rows in opposite sequences — a Postgres deadlock (uncaught
    // `deadlock_detected`, a raw 500) absent a per-actor advisory lock serializing the critical
    // section. This proves the collection-service.reorder fix (acquireActorLock('collection:reorder')).
    const a = await registerUser();
    // dedupOverride: true — these fixture names are deliberately near-duplicate-shaped (shared
    // "Reorder Race …" wording would otherwise 409 on CAT-03's near-dup guard); unrelated to this test.
    const g1 = await seedGame(a.token, 'Reorder Race First', { dedupOverride: true });
    const g2 = await seedGame(a.token, 'Reorder Race Second', { dedupOverride: true });
    const g3 = await seedGame(a.token, 'Reorder Race Third', { dedupOverride: true });
    const e1 = (await addEntry(a.token, g1.id)).body.entryId;
    const e2 = (await addEntry(a.token, g2.id)).body.entryId;
    const e3 = (await addEntry(a.token, g3.id)).body.entryId;

    const orderA = [e1, e2, e3];
    const orderB = [e3, e2, e1];
    const [rA, rB] = await Promise.all([
      request(app).patch('/api/me/collection/reorder').set(authed(a.token)).send({ orderedEntryIds: orderA }),
      request(app).patch('/api/me/collection/reorder').set(authed(a.token)).send({ orderedEntryIds: orderB }),
    ]);
    // Neither call may fail with a raw 500 (the deadlock signature) — both resolve (one may in
    // principle lose a benign race to the other's exact final state, but never crash uncaught).
    expect(rA.status).toBe(200);
    expect(rB.status).toBe(200);

    const shelf = await getCollection(a.token);
    const finalOrder = shelf.body.items.map((i: { entryId: string }) => i.entryId);
    // The final order is ONE of the two whole orderings that was submitted — never an interleave —
    // and it's still exactly the actor's 3 entries (no duplicate/missing rows).
    expect([orderA, orderB]).toContainEqual(finalOrder);
  });
});

describe('WTP-03: PUT /me/now-playing — the single pin', () => {
  it('sets the pin → the collection item flags nowPlaying; null clears it', async () => {
    const a = await registerUser();
    const game = await seedGame(a.token, 'Persona 5');
    await addEntry(a.token, game.id);

    const set = await request(app)
      .put('/api/me/now-playing')
      .set(authed(a.token))
      .send({ gameId: game.id });
    expect(set.status).toBe(200);
    expect(set.body).toEqual({ ok: true });
    expect((await getCollection(a.token)).body.items[0].nowPlaying).toBe(true);

    const clear = await request(app)
      .put('/api/me/now-playing')
      .set(authed(a.token))
      .send({ gameId: null });
    expect(clear.status).toBe(200);
    expect((await getCollection(a.token)).body.items[0].nowPlaying).toBe(false);
  });

  it('an unknown gameId → 422; authz:now_playing — an unauthenticated actorB → 401', async () => {
    const a = await registerUser();
    expect(
      (
        await request(app)
          .put('/api/me/now-playing')
          .set(authed(a.token))
          .send({ gameId: randomUUID() })
      ).status,
    ).toBe(422);
    expect((await request(app).put('/api/me/now-playing').send({ gameId: null })).status).toBe(401);
  });
});

describe('PROF-04 + WTP-03: /me real stats + the favouriteGame/nowPlaying expansions (M3)', () => {
  async function getMe(token: string) {
    return request(app).get('/api/me').set(authed(token));
  }

  it('a fresh account → zeroed stats + null expansions (honest, not phantom)', async () => {
    const a = await registerUser();
    const me = await getMe(a.token);
    expect(me.status).toBe(200);
    expect(me.body.stats).toEqual({
      games: 0,
      hours: 0,
      completionPct: 0,
      cardsDesigned: 0,
      adoptionsReceived: 0,
      friends: 0,
    });
    expect(me.body.favouriteGame).toBeNull();
    expect(me.body.nowPlaying).toBeNull();
  });

  it('derives stats from the real shelf (games · hours · the completion rate)', async () => {
    const a = await registerUser();
    // Deliberately DISSIMILAR titles — near-identical ones would (correctly) trip the CAT-03 warn.
    const g1 = await seedGame(a.token, 'Morrowind');
    const g2 = await seedGame(a.token, 'Celeste Peak');
    const g3 = await seedGame(a.token, 'Racing Rush');
    const e1 = (await addEntry(a.token, g1.id)).body.entryId;
    const e2 = (await addEntry(a.token, g2.id)).body.entryId;
    const e3 = (await addEntry(a.token, g3.id)).body.entryId;
    const patch = (id: string, body: Record<string, unknown>) =>
      request(app).patch(`/api/me/collection/${id}`).set(authed(a.token)).send(body);
    await patch(e1, { status: 'playing', hours: 10 });
    await patch(e2, { status: 'beaten', hours: 5 });
    await patch(e3, { status: 'wishlist' });

    const me = await getMe(a.token);
    // completion rate (PROF-04, decision 0058): beaten|completed over the NON-wishlist entries.
    expect(me.body.stats).toEqual({
      games: 3,
      hours: 15,
      completionPct: 50,
      cardsDesigned: 0,
      adoptionsReceived: 0,
      friends: 0,
    });
  });

  it('expands favouriteGame + nowPlaying (entry hours + the CARD-18 stub) — the P2 unblock', async () => {
    const a = await registerUser();
    const game = await seedGame(a.token, 'Favourite Game');
    const added = await addEntry(a.token, game.id);
    await request(app)
      .patch(`/api/me/collection/${added.body.entryId}`)
      .set(authed(a.token))
      .send({ hours: 77 });
    await request(app)
      .patch('/api/me')
      .set(authed(a.token))
      .send({ favouriteGameId: game.id });
    await request(app).put('/api/me/now-playing').set(authed(a.token)).send({ gameId: game.id });

    const me = await getMe(a.token);
    const expected = {
      gameId: game.id,
      entryId: added.body.entryId,
      title: 'Favourite Game',
      hours: 77,
      card: { id: 'default', imageUrl: null, thumbUrl: null, isCustom: false, isPremium: false },
    };
    expect(me.body.favouriteGame).toEqual(expected);
    expect(me.body.nowPlaying).toEqual(expected);
  });

  it('the ISSUANCE user carries the same widened shape (decision 0056 — one serializer)', async () => {
    counter += 1;
    const email = `wide${counter}_${randomUUID().slice(0, 6)}@example.com`;
    const reg = await request(app).post('/api/auth/register').send({
      email,
      username: `wideuser${counter}`,
      password: PW,
      acceptedTerms: true,
    });
    expect(reg.status).toBe(201);
    const game = await seedGame(reg.body.accessToken, 'Issuance Game');
    await addEntry(reg.body.accessToken, game.id);

    const login = await request(app).post('/api/auth/login').send({ email, password: PW });
    expect(login.status).toBe(200);
    const me = await getMe(login.body.accessToken);
    expect(login.body.user).toEqual(me.body);
    expect(login.body.user.stats.games).toBe(1);
  });
});

describe('CAT-09: the popular rail ranks by collections-count once real adds exist', () => {
  it('most-collected first', async () => {
    const a = await registerUser();
    const b = await registerUser();
    const popular = await seedGame(a.token, 'Popular Game');
    const niche = await seedGame(a.token, 'Niche Game');
    await addEntry(a.token, popular.id);
    await addEntry(b.token, popular.id);
    await addEntry(b.token, niche.id);

    const res = await request(app).get('/api/catalog/popular').set(authed(a.token));
    const names = res.body.items.map((i: { name: string }) => i.name);
    expect(names.indexOf('Popular Game')).toBeLessThan(names.indexOf('Niche Game'));
    const top = res.body.items[0];
    expect(top.collectionsCount).toBe(2);
  });
});
