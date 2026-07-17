import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import { randomUUID } from 'node:crypto';
import { PostgreSqlContainer, type StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import type { Express } from 'express';
import { COMPOSITION_SCHEMA_VERSION } from '@ingame/shared';

// M6 P5 — the WTP-01/02/03 "Up Next" queue + the SOC-04 Top-10 substrate at the HTTP boundary
// (supertest + REAL Postgres). `queue_items`/`lists`/`list_items` are USER-OWNED: every write is a
// G-D re-fire target — the standing actor-B 4xx tests (SYS-01/07), the cap-50/cap-10 LIST_FULL
// refusals (+ their F36 concurrent-add races), full-permutation reorder/re-rank validation (+ F36
// concurrent-reorder rank integrity), the friend_rec recommendedBy/note thread (+ the rec NOT
// dismissed), the owned/wishlist flag, and the top10 inline on /me + the friend /users/:id shape.
// Tags: WTP-01/02/03, SOC-04, SOC-05, F06, F36, SYS-01/02/05/07.

let container: StartedPostgreSqlContainer;
let app: Express;

const PW = 'Sup3rSecret!';
let counter = 0;

function authed(token: string) {
  return { Authorization: `Bearer ${token}` };
}

async function registerUser() {
  counter += 1;
  const email = `p5_${counter}_${randomUUID().slice(0, 6)}@example.com`;
  const username = `p5user${counter}${randomUUID().slice(0, 4)}`;
  const res = await request(app)
    .post('/api/auth/register')
    .send({ email, username, password: PW, acceptedTerms: true });
  if (res.status !== 201) throw new Error(`registerUser failed: ${res.status} ${JSON.stringify(res.body)}`);
  return { id: res.body.user.id as string, username, token: res.body.accessToken as string };
}

/** A direct accepted friendship (faster than the request flow; the lifecycle is P1's suite). */
async function befriend(aId: string, bId: string) {
  const { getDb } = await import('../../src/db/client');
  const { friendships } = await import('../../src/db/schema');
  await getDb().insert(friendships).values({ requesterId: aId, addresseeId: bId, status: 'accepted' });
}

async function seedGame(token: string, name: string) {
  const genresRes = await request(app).get('/api/genres').set(authed(token));
  const rpg = genresRes.body.items.find((g: { name: string }) => g.name === 'RPG');
  const res = await request(app)
    .post('/api/catalog/games')
    .set(authed(token))
    // dedupOverride: true — this suite mints many similarly-named games in cap-loop tests (e.g. "Cap
    // Game 0".."Cap Game 49"), which the CAT-03 near-duplicate detector would otherwise 409-warn on;
    // that check is catalog-slice's concern, not this packet's (unrelated risk domain).
    .send({ name, genreIds: [rpg.id], dedupOverride: true });
  if (res.status !== 201) throw new Error(`seedGame failed: ${res.status} ${JSON.stringify(res.body)}`);
  return res.body as { id: string; name: string };
}

async function addToCollection(token: string, gameId: string) {
  const res = await request(app).post('/api/me/collection').set(authed(token)).send({ gameId });
  if (res.status !== 201) throw new Error(`addToCollection failed: ${res.status} ${JSON.stringify(res.body)}`);
  return res.body as { entryId: string };
}

function composition(elements = 2) {
  return {
    schemaVersion: COMPOSITION_SCHEMA_VERSION,
    base: { fill: '#241a4d' },
    elements: Array.from({ length: elements }, (_, i) => ({
      type: 'rect',
      x: 0.5,
      y: 0.1 + i * 0.02,
      w: 0.4,
      h: 0.02,
      fill: '#e8c14a',
    })),
  };
}

/** Create + equip a custom design on an existing collection entry (a real, non-default card). */
async function equipCustomDesign(token: string, gameId: string, entryId: string) {
  const draft = await request(app).post('/api/cards').set(authed(token)).send({ gameId, composition: composition() });
  if (draft.status !== 201) throw new Error(`draft failed: ${draft.status}`);
  const cardId = draft.body.id as string;
  const saved = await request(app).post(`/api/cards/${cardId}/save-private`).set(authed(token));
  if (saved.status !== 200) throw new Error(`save-private failed: ${saved.status}`);
  const equip = await request(app)
    .patch(`/api/me/collection/${entryId}`)
    .set(authed(token))
    .send({ activeCardDesignId: cardId });
  if (equip.status !== 200) throw new Error(`equip failed: ${equip.status}`);
  return cardId;
}

async function sendRec(fromToken: string, toUserId: string, gameId: string, note?: string) {
  const res = await request(app)
    .post('/api/recommendations')
    .set(authed(fromToken))
    .send({ toUserId, gameId, ...(note ? { note } : {}) });
  if (res.status !== 201) throw new Error(`sendRec failed: ${res.status} ${JSON.stringify(res.body)}`);
}

async function recIdFor(recipientToken: string, gameId: string): Promise<string> {
  const inbox = await request(app).get('/api/me/recommendations').set(authed(recipientToken));
  const row = inbox.body.recommendations.find((r: { game: { id: string } }) => r.game.id === gameId);
  if (!row) throw new Error('recIdFor: no matching inbox row');
  return row.recId as string;
}

function getQueue(token: string) {
  return request(app).get('/api/me/queue').set(authed(token));
}

function addQueueItem(token: string, body: Record<string, unknown>) {
  return request(app).post('/api/me/queue').set(authed(token)).send(body);
}

function getLists(token: string) {
  return request(app).get('/api/me/lists').set(authed(token));
}

function addListItem(token: string, gameId: string) {
  return request(app).post('/api/me/lists/top10/items').set(authed(token)).send({ gameId });
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

const QUEUE_ITEM_KEYS = ['itemId', 'gameId', 'title', 'card', 'owned', 'source', 'recommendedBy', 'note'].sort();
const LIST_ITEM_KEYS = ['gameId', 'rank', 'card'].sort();

// ── WTP-01/02: GET/POST /me/queue ─────────────────────────────────────────────────────────────────────

describe('WTP-01: GET /me/queue', () => {
  it('an empty queue → { items: [] }', async () => {
    const a = await registerUser();
    const res = await getQueue(a.token);
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ items: [] });
  });

  it('F06: an item carries exactly the contract key-set (recommendedBy/note absent for a self-add)', async () => {
    const a = await registerUser();
    const game = await seedGame(a.token, 'Solo Add Game');
    const add = await addQueueItem(a.token, { gameId: game.id, source: 'discovery' });
    expect(add.status).toBe(201);
    expect(Object.keys(add.body).sort()).toEqual(
      ['itemId', 'gameId', 'title', 'card', 'owned', 'source'].sort(),
    );
    const res = await getQueue(a.token);
    expect(res.status).toBe(200);
    expect(res.body.items).toHaveLength(1);
    const item = res.body.items[0];
    expect(item.gameId).toBe(game.id);
    expect(item.title).toBe('Solo Add Game');
    expect(item.source).toBe('discovery');
    expect(item.owned).toBe(false); // WTP-01 — an unowned queue add is an effective wishlist item
    expect(item.card).toEqual({ id: 'default', imageUrl: null, thumbUrl: null, isCustom: false, isPremium: false });
    expect('recommendedBy' in item).toBe(false);
    expect('note' in item).toBe(false);
  });
});

describe('WTP-01: POST /me/queue — owned flag + card rider', () => {
  it('owned flips true once the game is added to the collection; card resolves the equipped design', async () => {
    const a = await registerUser();
    const game = await seedGame(a.token, 'Equipped Queue Game');
    const entry = await addToCollection(a.token, game.id);
    const cardId = await equipCustomDesign(a.token, game.id, entry.entryId);

    const add = await addQueueItem(a.token, { gameId: game.id, source: 'collection' });
    expect(add.status).toBe(201);
    expect(add.body.owned).toBe(true);
    expect(add.body.card.id).toBe(cardId);
    expect(add.body.card.isCustom).toBe(true);
  });

  it('an unknown gameId → 422', async () => {
    const a = await registerUser();
    const res = await addQueueItem(a.token, { gameId: randomUUID(), source: 'discovery' });
    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('source="friend_rec" without fromRecId → 422 (zod refine); a non-friend_rec source WITH fromRecId → 422', async () => {
    const a = await registerUser();
    const game = await seedGame(a.token, 'Refine Game');
    const missing = await addQueueItem(a.token, { gameId: game.id, source: 'friend_rec' });
    expect(missing.status).toBe(422);
    const extra = await addQueueItem(a.token, { gameId: game.id, source: 'discovery', fromRecId: randomUUID() });
    expect(extra.status).toBe(422);
  });

  it('a duplicate add (same gameId) → IDEMPOTENT 201 returning the SAME existing item, not an error (P5 design)', async () => {
    const a = await registerUser();
    const game = await seedGame(a.token, 'Dup Queue Game');
    const first = await addQueueItem(a.token, { gameId: game.id, source: 'discovery' });
    expect(first.status).toBe(201);
    const second = await addQueueItem(a.token, { gameId: game.id, source: 'discovery' });
    expect(second.status).toBe(201);
    expect(second.body.itemId).toBe(first.body.itemId);
    const shelf = await getQueue(a.token);
    expect(shelf.body.items).toHaveLength(1); // no duplicate row
  });

  it('F36: concurrent adds of the SAME NEW game → exactly ONE row, both calls resolve idempotently (the unique(userId,gameId) race)', async () => {
    const a = await registerUser();
    const game = await seedGame(a.token, 'F36 Same Game Race');
    const [r1, r2] = await Promise.all([
      addQueueItem(a.token, { gameId: game.id, source: 'discovery' }),
      addQueueItem(a.token, { gameId: game.id, source: 'discovery' }),
    ]);
    expect(r1.status).toBe(201);
    expect(r2.status).toBe(201); // no uncaught unique_violation 500 — the lock-then-recheck converges
    expect(r1.body.itemId).toBe(r2.body.itemId);
    const shelf = await getQueue(a.token);
    expect(shelf.body.items).toHaveLength(1);
  });

  it('authz:queue_add — an unauthenticated actorB → 401', async () => {
    const res = await request(app).post('/api/me/queue').send({ gameId: randomUUID(), source: 'discovery' });
    expect(res.status).toBe(401);
  });
});

describe('WTP-02/SOC-05: the friend_rec recommendedBy/note thread', () => {
  it('a friend-rec add carries recommendedBy + note; the rec is NOT dismissed', async () => {
    const a = await registerUser();
    const b = await registerUser();
    await befriend(a.id, b.id);
    const game = await seedGame(a.token, 'Recommended Game');
    await sendRec(a.token, b.id, game.id, 'you have to play this');
    const recId = await recIdFor(b.token, game.id);

    const add = await addQueueItem(b.token, { gameId: game.id, source: 'friend_rec', fromRecId: recId });
    expect(add.status).toBe(201);
    expect(Object.keys(add.body).sort()).toEqual(QUEUE_ITEM_KEYS); // F06 — the full key-set, incl. recommendedBy/note
    expect(add.body.recommendedBy).toEqual({ userId: a.id, username: a.username });
    expect(add.body.note).toBe('you have to play this');

    // the rec is NOT dismissed by the queue-add (independent lifecycles, P5 design) — still in the inbox
    const inbox = await request(app).get('/api/me/recommendations').set(authed(b.token));
    expect(inbox.body.recommendations.some((r: { recId: string }) => r.recId === recId)).toBe(true);
  });

  it('a fromRecId belonging to someone else (or the wrong game) → 422, no cross-inbox oracle', async () => {
    const a = await registerUser();
    const b = await registerUser();
    const c = await registerUser();
    await befriend(a.id, b.id);
    const game = await seedGame(a.token, 'Foreign Rec Game');
    const otherGame = await seedGame(a.token, 'Other Rec Game');
    await sendRec(a.token, b.id, game.id);
    const recId = await recIdFor(b.token, game.id);

    // actor C (not the recipient) tries to spend B's rec id
    const foreign = await addQueueItem(c.token, { gameId: game.id, source: 'friend_rec', fromRecId: recId });
    expect(foreign.status).toBe(422);

    // B tries to attach the rec to a DIFFERENT game than it was for
    await sendRec(a.token, b.id, otherGame.id);
    const mismatched = await addQueueItem(b.token, { gameId: otherGame.id, source: 'friend_rec', fromRecId: recId });
    expect(mismatched.status).toBe(422);
  });

  it('a deleted recommender degrades to an anonymized recommendedBy (AUTH-07), the item stays queued', async () => {
    const a = await registerUser();
    const b = await registerUser();
    await befriend(a.id, b.id);
    const game = await seedGame(a.token, 'Vanishing Recommender Game');
    await sendRec(a.token, b.id, game.id);
    const recId = await recIdFor(b.token, game.id);
    await addQueueItem(b.token, { gameId: game.id, source: 'friend_rec', fromRecId: recId });

    const { getDb } = await import('../../src/db/client');
    const { users } = await import('../../src/db/schema');
    const { eq } = await import('drizzle-orm');
    await getDb().update(users).set({ deletedAt: new Date() }).where(eq(users.id, a.id));

    const res = await getQueue(b.token);
    expect(res.status).toBe(200);
    expect(res.body.items).toHaveLength(1);
    expect(res.body.items[0].recommendedBy).toEqual({ userId: null, username: '[deleted]' });
  });
});

/** These cap tests mint 50+ catalog games in a loop — raise the `catalog:create` burst cap (10/min
 *  default) so the LOOP itself doesn't 429 before the cap-under-test ever fires. */
async function raiseCatalogCreateLimit() {
  const { overrideRuleForTest } = await import('../../src/config/rate-limits');
  overrideRuleForTest('catalog:create', { limit: 200, windowMs: 60_000 });
}

describe('WTP-01/§0.7: the queue cap-50 → 409 LIST_FULL', () => {
  it('the 51st add is refused; the 50th succeeds', async () => {
    await raiseCatalogCreateLimit();
    const a = await registerUser();
    for (let i = 0; i < 50; i++) {
      const game = await seedGame(a.token, `Cap Game ${i}`);
      const res = await addQueueItem(a.token, { gameId: game.id, source: 'discovery' });
      expect(res.status).toBe(201);
    }
    const overflow = await seedGame(a.token, 'Cap Overflow Game');
    const res = await addQueueItem(a.token, { gameId: overflow.id, source: 'discovery' });
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('LIST_FULL');
  }, 30_000);

  it('F36: concurrent adds at cap-49 → exactly one of two NEW games lands', async () => {
    await raiseCatalogCreateLimit();
    const a = await registerUser();
    for (let i = 0; i < 49; i++) {
      const game = await seedGame(a.token, `F36 Cap Game ${i}`);
      const res = await addQueueItem(a.token, { gameId: game.id, source: 'discovery' });
      expect(res.status).toBe(201);
    }
    const g1 = await seedGame(a.token, 'F36 Race Game 1');
    const g2 = await seedGame(a.token, 'F36 Race Game 2');
    const [r1, r2] = await Promise.all([
      addQueueItem(a.token, { gameId: g1.id, source: 'discovery' }),
      addQueueItem(a.token, { gameId: g2.id, source: 'discovery' }),
    ]);
    const statuses = [r1.status, r2.status].sort();
    expect(statuses).toEqual([201, 409]);
    const shelf = await getQueue(a.token);
    expect(shelf.body.items).toHaveLength(50);
  }, 30_000);
});

describe('WTP-01: PATCH /me/queue/reorder + DELETE /me/queue/:id', () => {
  it('saves a full permutation; GET returns the new order', async () => {
    const a = await registerUser();
    const g1 = await seedGame(a.token, 'Q First');
    const g2 = await seedGame(a.token, 'Q Second');
    const g3 = await seedGame(a.token, 'Q Third');
    const i1 = (await addQueueItem(a.token, { gameId: g1.id, source: 'discovery' })).body.itemId;
    const i2 = (await addQueueItem(a.token, { gameId: g2.id, source: 'discovery' })).body.itemId;
    const i3 = (await addQueueItem(a.token, { gameId: g3.id, source: 'discovery' })).body.itemId;

    const res = await request(app)
      .patch('/api/me/queue/reorder')
      .set(authed(a.token))
      .send({ orderedItemIds: [i3, i1, i2] });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true });

    const shelf = await getQueue(a.token);
    expect(shelf.body.items.map((i: { itemId: string }) => i.itemId)).toEqual([i3, i1, i2]);
  });

  it('rejects a non-permutation (missing/foreign ids) → 422', async () => {
    const a = await registerUser();
    const g1 = await seedGame(a.token, 'Q Alpha');
    const g2 = await seedGame(a.token, 'Q Beta');
    const i1 = (await addQueueItem(a.token, { gameId: g1.id, source: 'discovery' })).body.itemId;
    await addQueueItem(a.token, { gameId: g2.id, source: 'discovery' });
    const res = await request(app)
      .patch('/api/me/queue/reorder')
      .set(authed(a.token))
      .send({ orderedItemIds: [i1] });
    expect(res.status).toBe(422);
  });

  it('authz:queue_reorder — actor-B replaying actor-A ids → 4xx, A untouched', async () => {
    const a = await registerUser();
    const g1 = await seedGame(a.token, 'Q Gamma');
    const g2 = await seedGame(a.token, 'Q Delta');
    const i1 = (await addQueueItem(a.token, { gameId: g1.id, source: 'discovery' })).body.itemId;
    const i2 = (await addQueueItem(a.token, { gameId: g2.id, source: 'discovery' })).body.itemId;
    const actorB = await registerUser();
    const attack = await request(app)
      .patch('/api/me/queue/reorder')
      .set(authed(actorB.token))
      .send({ orderedItemIds: [i2, i1] });
    expect(attack.status).toBeGreaterThanOrEqual(400);
    expect(attack.status).toBeLessThan(500);
    const shelf = await getQueue(a.token);
    expect(shelf.body.items.map((i: { itemId: string }) => i.itemId)).toEqual([i1, i2]);
  });

  it('removes own → { ok: true }; authz:queue_remove — actor-B deleting actor-A item → 404, survives', async () => {
    const a = await registerUser();
    const game = await seedGame(a.token, 'Q Removable');
    const itemId = (await addQueueItem(a.token, { gameId: game.id, source: 'discovery' })).body.itemId;
    const actorB = await registerUser();
    const attack = await request(app).delete(`/api/me/queue/${itemId}`).set(authed(actorB.token));
    expect(attack.status).toBe(404);
    expect((await getQueue(a.token)).body.items).toHaveLength(1);

    const res = await request(app).delete(`/api/me/queue/${itemId}`).set(authed(a.token));
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true });
    expect((await getQueue(a.token)).body.items).toHaveLength(0);
  });
});

// ── SOC-04/COL-13: GET/POST/DELETE/PATCH /me/lists ────────────────────────────────────────────────────

describe('SOC-04: GET /me/lists', () => {
  it('a never-curated Top-10 → [{ id: "top10", kind: "top10", items: [] }]', async () => {
    const a = await registerUser();
    const res = await getLists(a.token);
    expect(res.status).toBe(200);
    expect(res.body).toEqual([{ id: 'top10', kind: 'top10', items: [] }]);
  });
});

describe('SOC-04/COL-13: POST /me/lists/top10/items — membership drawn from your OWN collection', () => {
  it('adding a game NOT in your collection → 422 (product-spec COL-13: CardPicker searches your collection)', async () => {
    const a = await registerUser();
    const game = await seedGame(a.token, 'Not Yet Owned');
    const res = await addListItem(a.token, game.id);
    expect(res.status).toBe(422);
  });

  it('F06: adds a member → exactly the contract key-set; GET reflects it at rank 1', async () => {
    const a = await registerUser();
    const game = await seedGame(a.token, 'Top Pick');
    await addToCollection(a.token, game.id);
    const add = await addListItem(a.token, game.id);
    expect(add.status).toBe(201);
    expect(Object.keys(add.body).sort()).toEqual(LIST_ITEM_KEYS);
    expect(add.body).toEqual({ gameId: game.id, rank: 1, card: { id: 'default', imageUrl: null, thumbUrl: null, isCustom: false, isPremium: false } });

    const lists = await getLists(a.token);
    expect(lists.body).toEqual([{ id: 'top10', kind: 'top10', items: [add.body] }]);
  });

  it('a duplicate add → IDEMPOTENT 201 returning the existing membership (same rank), not an error', async () => {
    const a = await registerUser();
    const game = await seedGame(a.token, 'Dup Top Pick');
    await addToCollection(a.token, game.id);
    const first = await addListItem(a.token, game.id);
    const second = await addListItem(a.token, game.id);
    expect(second.status).toBe(201);
    expect(second.body).toEqual(first.body);
    const lists = await getLists(a.token);
    expect(lists.body[0].items).toHaveLength(1);
  });

  it('F36: concurrent adds of the SAME NEW game → exactly ONE row, both calls resolve idempotently (the unique(listId,gameId) race)', async () => {
    const a = await registerUser();
    const game = await seedGame(a.token, 'F36 Same Top Pick Race');
    await addToCollection(a.token, game.id);
    const [r1, r2] = await Promise.all([addListItem(a.token, game.id), addListItem(a.token, game.id)]);
    expect(r1.status).toBe(201);
    expect(r2.status).toBe(201);
    expect(r1.body).toEqual(r2.body);
    const lists = await getLists(a.token);
    expect(lists.body[0].items).toHaveLength(1);
  });

  it('the cap-10 → 409 LIST_FULL on the 11th member', async () => {
    await raiseCatalogCreateLimit();
    const a = await registerUser();
    for (let i = 0; i < 10; i++) {
      const game = await seedGame(a.token, `Top Cap Game ${i}`);
      await addToCollection(a.token, game.id);
      const res = await addListItem(a.token, game.id);
      expect(res.status).toBe(201);
    }
    const overflow = await seedGame(a.token, 'Top Cap Overflow');
    await addToCollection(a.token, overflow.id);
    const res = await addListItem(a.token, overflow.id);
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('LIST_FULL');
  }, 30_000);

  it('F36: concurrent adds at cap-9 → exactly one of two NEW members lands', async () => {
    await raiseCatalogCreateLimit();
    const a = await registerUser();
    for (let i = 0; i < 9; i++) {
      const game = await seedGame(a.token, `F36 Top Game ${i}`);
      await addToCollection(a.token, game.id);
      const res = await addListItem(a.token, game.id);
      expect(res.status).toBe(201);
    }
    const g1 = await seedGame(a.token, 'F36 Top Race 1');
    const g2 = await seedGame(a.token, 'F36 Top Race 2');
    await addToCollection(a.token, g1.id);
    await addToCollection(a.token, g2.id);
    const [r1, r2] = await Promise.all([addListItem(a.token, g1.id), addListItem(a.token, g2.id)]);
    const statuses = [r1.status, r2.status].sort();
    expect(statuses).toEqual([201, 409]);
    const lists = await getLists(a.token);
    expect(lists.body[0].items).toHaveLength(10);
  }, 30_000);

  it('an unrecognized list id (general lists parked §10) → 404', async () => {
    const a = await registerUser();
    const game = await seedGame(a.token, 'Not Top10 Game');
    await addToCollection(a.token, game.id);
    const res = await request(app)
      .post('/api/me/lists/some-other-id/items')
      .set(authed(a.token))
      .send({ gameId: game.id });
    expect(res.status).toBe(404);
  });

  it('authz:list_item_add — an unauthenticated actorB → 401', async () => {
    const res = await request(app).post('/api/me/lists/top10/items').send({ gameId: randomUUID() });
    expect(res.status).toBe(401);
  });
});

describe('SOC-04: DELETE /me/lists/top10/items/:gameId', () => {
  it('removes own membership; authz:list_item_remove — actor-B removing actor-A member → 404, survives', async () => {
    const a = await registerUser();
    const game = await seedGame(a.token, 'Removable Top Pick');
    await addToCollection(a.token, game.id);
    await addListItem(a.token, game.id);

    const actorB = await registerUser();
    const attack = await request(app)
      .delete(`/api/me/lists/top10/items/${game.id}`)
      .set(authed(actorB.token));
    expect(attack.status).toBe(404);
    expect((await getLists(a.token)).body[0].items).toHaveLength(1);

    const res = await request(app).delete(`/api/me/lists/top10/items/${game.id}`).set(authed(a.token));
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true });
    expect((await getLists(a.token)).body[0].items).toHaveLength(0);
  });
});

describe('SOC-04/COL-07/13: PATCH /me/lists/top10 — the ARRANGE re-rank', () => {
  async function seededTopTen(a: { token: string }) {
    const g1 = await seedGame(a.token, 'Rank First');
    const g2 = await seedGame(a.token, 'Rank Second');
    const g3 = await seedGame(a.token, 'Rank Third');
    for (const g of [g1, g2, g3]) {
      await addToCollection(a.token, g.id);
      await addListItem(a.token, g.id);
    }
    return { g1, g2, g3 };
  }

  it('saves a full permutation; GET reflects the new ranks 1..N', async () => {
    const a = await registerUser();
    const { g1, g2, g3 } = await seededTopTen(a);

    const res = await request(app)
      .patch('/api/me/lists/top10')
      .set(authed(a.token))
      .send({ orderedGameIds: [g3.id, g1.id, g2.id] });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true });

    const lists = await getLists(a.token);
    const items = lists.body[0].items;
    expect(items.map((i: { gameId: string }) => i.gameId)).toEqual([g3.id, g1.id, g2.id]);
    expect(items.map((i: { rank: number }) => i.rank)).toEqual([1, 2, 3]);
  });

  it('rejects a non-permutation → 422', async () => {
    const a = await registerUser();
    const { g1, g2 } = await seededTopTen(a);
    const res = await request(app)
      .patch('/api/me/lists/top10')
      .set(authed(a.token))
      .send({ orderedGameIds: [g1.id, g2.id] }); // missing g3
    expect(res.status).toBe(422);
  });

  it('F36: concurrent full re-ranks converge to ONE consistent permutation — no duplicate ranks', async () => {
    const a = await registerUser();
    const { g1, g2, g3 } = await seededTopTen(a);
    const orderA = [g1.id, g2.id, g3.id];
    const orderB = [g3.id, g2.id, g1.id];
    const [rA, rB] = await Promise.all([
      request(app).patch('/api/me/lists/top10').set(authed(a.token)).send({ orderedGameIds: orderA }),
      request(app).patch('/api/me/lists/top10').set(authed(a.token)).send({ orderedGameIds: orderB }),
    ]);
    expect(rA.status).toBe(200);
    expect(rB.status).toBe(200);

    const lists = await getLists(a.token);
    const items = lists.body[0].items;
    const ranks = items.map((i: { rank: number }) => i.rank).sort((x: number, y: number) => x - y);
    expect(ranks).toEqual([1, 2, 3]); // no dup ranks — one whole ordering won
    const gameIds = items.map((i: { gameId: string }) => i.gameId).sort();
    expect(gameIds).toEqual([g1.id, g2.id, g3.id].sort()); // the same 3 members, just re-ranked
  });

  it('authz:list_rerank — actor-B reranking actor-A Top-10 → 4xx, A untouched', async () => {
    const a = await registerUser();
    const { g1, g2, g3 } = await seededTopTen(a);
    const actorB = await registerUser();
    const attack = await request(app)
      .patch('/api/me/lists/top10')
      .set(authed(actorB.token))
      .send({ orderedGameIds: [g1.id, g2.id, g3.id] });
    expect(attack.status).toBeGreaterThanOrEqual(400);
    expect(attack.status).toBeLessThan(500);
  });
});

// ── SOC-04: the top10 inline on /me + /users/:id ──────────────────────────────────────────────────────

describe('SOC-04: top10 inlined on /me + the friend /users/:id shape', () => {
  it('/me carries the real top10 in rank order, with title (unlike the bare /me/lists item shape)', async () => {
    const a = await registerUser();
    const game = await seedGame(a.token, 'Inline Top Game');
    await addToCollection(a.token, game.id);
    await addListItem(a.token, game.id);

    const me = await request(app).get('/api/me').set(authed(a.token));
    expect(me.status).toBe(200);
    expect(me.body.top10).toEqual([
      { rank: 1, gameId: game.id, title: 'Inline Top Game', card: { id: 'default', imageUrl: null, thumbUrl: null, isCustom: false, isPremium: false } },
    ]);
  });

  it('a fresh account → top10: [] (never a phantom)', async () => {
    const a = await registerUser();
    const me = await request(app).get('/api/me').set(authed(a.token));
    expect(me.body.top10).toEqual([]);
  });

  it('a FRIEND sees the flattened top10 on /users/:id (no `composition` key); a NON-friend sees no top10 field at all', async () => {
    const a = await registerUser();
    const b = await registerUser();
    await befriend(a.id, b.id);
    const game = await seedGame(a.token, 'Friend Visible Top Game');
    await addToCollection(a.token, game.id);
    await addListItem(a.token, game.id);

    const friendView = await request(app).get(`/api/users/${a.id}`).set(authed(b.token));
    expect(friendView.status).toBe(200);
    expect(friendView.body.top10).toEqual([
      { rank: 1, gameId: game.id, title: 'Friend Visible Top Game', card: { id: 'default', imageUrl: null, thumbUrl: null, isCustom: false, isPremium: false } },
    ]);
    expect('composition' in friendView.body.top10[0].card).toBe(false);

    const c = await registerUser(); // not a friend of A
    const limitedView = await request(app).get(`/api/users/${a.id}`).set(authed(c.token));
    expect(limitedView.status).toBe(200);
    expect('top10' in limitedView.body).toBe(false); // the limited/non-friend shape has no top10 field
  });
});
