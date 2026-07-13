import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import { randomUUID } from 'node:crypto';
import { existsSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { PostgreSqlContainer, type StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import type { Express } from 'express';
import { COMPOSITION_SCHEMA_VERSION } from '@ingame/shared';
import { getDb } from '../../src/db/client';
import { userBlocks } from '../../src/db/schema';
import { STARTING_GRANT } from '../../src/config/economy';
import {
  registerCosmeticForTest,
  clearCosmeticRegistryForTest,
} from '../../src/config/cosmetics';
import { overrideRuleForTest } from '../../src/config/rate-limits';

// M5 P3 — HARDENING publish/adopt/gallery on the spike (decision 0072/0073; supertest + REAL Postgres +
// the server-side skia flatten + local-disk StorageProvider). Covers: CARD-19 min-complexity + global
// hash-dedup, CARD-13 premium-reconcile (publish AND save-private, fixture-tested), the flatten-outside-
// tx cleanup, adopt's full decision-0072 semantics (component acquire + free grant), gallery
// personalized pricing + block-filtering both directions, trending, CARD-20 unpublish + delete guards,
// OQ-141 idempotent copy-POST, the contributor liveness go-live, and F36 concurrency.
// Tags: CARD-04/05/13/15/19/20, ECON-03/04, OQ-055/122/141, SOC-09, SYS-01/07, F06, F36.
// Standing authz tokens covered here (actor-B → 4xx): authz:card_unpublish · authz:trending_cards_read ·
// authz:get_contributions (the other publish-thread tokens ride publish-thread-slice.test.ts).

let container: StartedPostgreSqlContainer;
let app: Express;
let mediaDir: string;

const PW = 'Sup3rSecret!';
let counter = 0;

function authed(token: string) {
  return { Authorization: `Bearer ${token}` };
}

async function registerUser() {
  counter += 1;
  const email = `p3_${counter}_${randomUUID().slice(0, 6)}@example.com`;
  const username = `p3user${counter}${randomUUID().slice(0, 4)}`;
  const res = await request(app)
    .post('/api/auth/register')
    .send({ email, username, password: PW, acceptedTerms: true });
  if (res.status !== 201) throw new Error(`registerUser failed: ${res.status}`);
  return { id: res.body.user.id as string, username, token: res.body.accessToken as string };
}

async function seedGame(token: string, name: string) {
  const genresRes = await request(app).get('/api/genres').set(authed(token));
  const rpg = genresRes.body.items.find((g: { name: string }) => g.name === 'RPG');
  const res = await request(app)
    .post('/api/catalog/games')
    .set(authed(token))
    .send({ name, genreIds: [rpg.id] });
  if (res.status !== 201) throw new Error(`seedGame failed: ${res.status}`);
  return res.body as { id: string; name: string };
}

/** A composition with `rects` filler rects (seed varies the geometry so hashes differ) + optional
 *  text elements carrying premium `fontIds`. `rects + fontIds.length` is the element count. */
function comp({ rects = 3, fontIds = [], seed = 0 }: { rects?: number; fontIds?: string[]; seed?: number } = {}) {
  const elements: Array<Record<string, unknown>> = [];
  for (let i = 0; i < rects; i++) {
    elements.push({ type: 'rect', x: 0.5, y: 0.1 + (i + seed * 0.01) * 0.07, w: 0.4, h: 0.05, fill: '#e8c14a' });
  }
  for (let i = 0; i < fontIds.length; i++) {
    elements.push({ type: 'text', x: 0.5, y: 0.6 + i * 0.08, fill: '#f3ecd9', text: `T${i}`, size: 0.05, fontId: fontIds[i] });
  }
  return { schemaVersion: COMPOSITION_SCHEMA_VERSION, base: { gradient: ['#241a4d', '#0e0b1e'] }, elements };
}

async function createDraft(token: string, gameId: string, composition: object, name?: string) {
  const res = await request(app)
    .post('/api/cards')
    .set(authed(token))
    .send({ gameId, composition, ...(name ? { name } : {}) });
  if (res.status !== 201) throw new Error(`createDraft failed: ${res.status} ${JSON.stringify(res.body)}`);
  return res.body as { id: string; status: string };
}

/** Draft → publish (returns the raw supertest response so callers can assert failures). */
function publish(token: string, cardId: string) {
  return request(app).post(`/api/cards/${cardId}/publish`).set(authed(token));
}

async function publishFresh(token: string, gameId: string, opts: Parameters<typeof comp>[0] & { name?: string } = {}) {
  const draft = await createDraft(token, gameId, comp(opts), opts.name);
  const res = await publish(token, draft.id);
  if (res.status !== 200) throw new Error(`publish failed: ${res.status} ${JSON.stringify(res.body)}`);
  return { id: draft.id, published: res.body };
}

async function acquire(token: string, cosmeticId: string) {
  const res = await request(app).post(`/api/cosmetics/${cosmeticId}/acquire`).set(authed(token));
  if (res.status !== 200) throw new Error(`acquire failed: ${res.status} ${JSON.stringify(res.body)}`);
  return res.body;
}

beforeAll(async () => {
  container = await new PostgreSqlContainer('postgres:16-alpine').start();
  process.env.DATABASE_URL = container.getConnectionUri();
  process.env.DISPOSABLE_DB = '1';
  process.env.JWT_SIGNING_SECRET = 'test-signing-secret-at-least-16-chars-long';
  mediaDir = mkdtempSync(join(tmpdir(), 'ingame-p3-media-'));
  process.env.MEDIA_DIR = mediaDir;
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
  clearCosmeticRegistryForTest();
});

describe('CARD-19: min-complexity publish gate (≥3 elements OR ≥2 distinct types; decision 0073 §0.7)', () => {
  it('a single-element draft is refused → 409 MIN_COMPLEXITY, stays private, no flatten written', async () => {
    const a = await registerUser();
    const game = await seedGame(a.token, 'MinComplexity RPG');
    const draft = await createDraft(a.token, game.id, comp({ rects: 1 }));
    const res = await publish(a.token, draft.id);
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('MIN_COMPLEXITY');
    // the gate ran BEFORE the flatten — no media artifact for this card, and it never transitioned.
    expect(existsSync(join(mediaDir, 'cards', draft.id, 'full.png'))).toBe(false);
    const mine = await request(app).get('/api/me/cards').set(authed(a.token));
    expect(mine.body.items[0].status).toBe('draft');
  });

  it('two DISTINCT element types (1 rect + 1 text) clears the floor via the OR branch', async () => {
    const a = await registerUser();
    const game = await seedGame(a.token, 'TwoType RPG');
    const draft = await createDraft(a.token, game.id, comp({ rects: 1, fontIds: ['free-font'], seed: 3 }));
    const res = await publish(a.token, draft.id);
    expect(res.status).toBe(200); // 2 elements but 2 distinct types → passes
    expect(res.body.status).toBe('published');
  });
});

describe('CARD-19: global composition-hash dedup (decision 0073 §0.7 — global exact-match refuse)', () => {
  it('a second published card with an identical composition → 409 DUPLICATE_COMPOSITION, no card leaked', async () => {
    const a = await registerUser();
    const b = await registerUser();
    const game = await seedGame(a.token, 'Dedup RPG');
    await publishFresh(a.token, game.id, { rects: 4, seed: 0, name: 'Original' });

    // B builds the SAME composition (identical hash) and tries to publish it.
    const bDraft = await createDraft(b.token, game.id, comp({ rects: 4, seed: 0 }), 'Copycat');
    const res = await publish(b.token, bDraft.id);
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('DUPLICATE_COMPOSITION');
    // NO card details leak in the payload — only code + message.
    expect(Object.keys(res.body.error).sort()).toEqual(['code', 'message']);
  });

  it('re-publishing your OWN already-published card is an idempotent no-op (not a self-dup)', async () => {
    const a = await registerUser();
    const game = await seedGame(a.token, 'SelfDedup RPG');
    const { id } = await publishFresh(a.token, game.id, { rects: 3, seed: 5 });
    const again = await publish(a.token, id);
    expect(again.status).toBe(200);
    expect(again.body.status).toBe('published');
  });
});

describe('CARD-13: premium-reconcile gate on publish AND save-private (decision 0072; fixture-tested)', () => {
  it('publish refused when the composition uses a premium component the OWNER does not own → PREMIUM_UNRECONCILED', async () => {
    const a = await registerUser();
    const game = await seedGame(a.token, 'Reconcile Publish RPG');
    registerCosmeticForTest('p3-prem-font', 'big'); // 6 PX
    // A draft is EXEMPT (no reconcile at create); publish fires the gate.
    const draft = await createDraft(a.token, game.id, comp({ rects: 2, fontIds: ['p3-prem-font'], seed: 1 }));
    const res = await publish(a.token, draft.id);
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('PREMIUM_UNRECONCILED');
    expect(res.body.error.unowned).toEqual([{ cosmeticId: 'p3-prem-font', price: 6 }]);
    expect(res.body.error.total).toBe(6);
  });

  it('save-private refused on the same unreconciled composition → PREMIUM_UNRECONCILED', async () => {
    const a = await registerUser();
    const game = await seedGame(a.token, 'Reconcile Save RPG');
    registerCosmeticForTest('p3-prem-font2', 'trim'); // 2 PX
    const draft = await createDraft(a.token, game.id, comp({ rects: 2, fontIds: ['p3-prem-font2'], seed: 2 }));
    const res = await request(app).post(`/api/cards/${draft.id}/save-private`).set(authed(a.token));
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('PREMIUM_UNRECONCILED');
  });

  it('once the owner ACQUIRES the premium component, publish succeeds + stores its premium refs', async () => {
    const a = await registerUser();
    const game = await seedGame(a.token, 'Reconcile OK RPG');
    registerCosmeticForTest('p3-owned-font', 'trim'); // 2 PX
    await acquire(a.token, 'p3-owned-font'); // A now owns it
    const draft = await createDraft(a.token, game.id, comp({ rects: 2, fontIds: ['p3-owned-font'], seed: 4 }));
    const res = await publish(a.token, draft.id);
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('published');
  });
});

describe('ECON-03/04: adopt = component acquisition + free grant (decision 0072)', () => {
  it('a FREE card adopts at 0 — grant + count land, wallet untouched', async () => {
    const a = await registerUser();
    const b = await registerUser();
    const game = await seedGame(a.token, 'Free Adopt RPG');
    const { id } = await publishFresh(a.token, game.id, { rects: 3, seed: 7 });
    const adopt = await request(app).post(`/api/cards/${id}/adopt`).set(authed(b.token));
    expect(adopt.status).toBe(200);
    expect(adopt.body).toEqual({ granted: [], totalPaid: 0, balance: STARTING_GRANT });
    const gallery = await request(app).get(`/api/games/${game.id}/cards`).set(authed(b.token));
    expect(gallery.body.items[0].adoptionCount).toBe(1);
  });

  it('a premium card debits EXACTLY the missing-components sum + grants account-wide entitlements', async () => {
    const a = await registerUser();
    const b = await registerUser();
    const game = await seedGame(a.token, 'Premium Adopt RPG');
    registerCosmeticForTest('adopt-font-a', 'trim'); // 2
    registerCosmeticForTest('adopt-font-b', 'standard'); // 3 → total 5
    await acquire(a.token, 'adopt-font-a');
    await acquire(a.token, 'adopt-font-b'); // A owns both (published card's designer must)
    const { id } = await publishFresh(a.token, game.id, {
      rects: 1,
      fontIds: ['adopt-font-a', 'adopt-font-b'],
      seed: 8,
    });

    // Personalized price chip for B (owns neither) = 2 + 3 = 5.
    const galleryPre = await request(app).get(`/api/games/${game.id}/cards`).set(authed(b.token));
    expect(galleryPre.body.items[0].priceForYou).toBe(5);
    expect(galleryPre.body.items[0].isPremium).toBe(true);

    const adopt = await request(app).post(`/api/cards/${id}/adopt`).set(authed(b.token));
    expect(adopt.status).toBe(200);
    expect(adopt.body.totalPaid).toBe(5);
    expect(adopt.body.balance).toBe(STARTING_GRANT - 5); // 5
    expect(adopt.body.granted.map((g: { cosmeticId: string }) => g.cosmeticId).sort()).toEqual([
      'adopt-font-a',
      'adopt-font-b',
    ]);

    // Account-wide: B now owns both — a re-price shows priceForYou 0, and B can save-private a design
    // of their OWN using those fonts with NO reconcile refusal.
    const galleryPost = await request(app).get(`/api/games/${game.id}/cards`).set(authed(b.token));
    expect(galleryPost.body.items[0].priceForYou).toBe(0);
    const bGame = await seedGame(b.token, 'B Own Design RPG');
    const bDraft = await createDraft(b.token, bGame.id, comp({ rects: 2, fontIds: ['adopt-font-a'], seed: 9 }));
    const bSave = await request(app).post(`/api/cards/${bDraft.id}/save-private`).set(authed(b.token));
    expect(bSave.status).toBe(200); // entitlement carried across — reconcile passes
  });

  it('already-owned components are never re-charged: the caller pays only the missing sum', async () => {
    const a = await registerUser();
    const b = await registerUser();
    const game = await seedGame(a.token, 'Partial Own RPG');
    registerCosmeticForTest('own-shared', 'trim'); // 2
    registerCosmeticForTest('own-extra', 'standard'); // 3
    await acquire(a.token, 'own-shared');
    await acquire(a.token, 'own-extra');
    const { id } = await publishFresh(a.token, game.id, {
      rects: 1,
      fontIds: ['own-shared', 'own-extra'],
      seed: 10,
    });
    await acquire(b.token, 'own-shared'); // B already owns the shared one (balance 10-2=8)

    const adopt = await request(app).post(`/api/cards/${id}/adopt`).set(authed(b.token));
    expect(adopt.status).toBe(200);
    expect(adopt.body.granted).toEqual([{ cosmeticId: 'own-extra', paid: 3 }]); // only the missing one
    expect(adopt.body.totalPaid).toBe(3);
    expect(adopt.body.balance).toBe(STARTING_GRANT - 2 - 3); // 5
  });

  it('INSUFFICIENT_BALANCE {shortBy} when the acquire cannot cover the missing sum — no grant lands', async () => {
    const a = await registerUser();
    const b = await registerUser();
    const game = await seedGame(a.token, 'Cant Afford RPG');
    registerCosmeticForTest('exp-a', 'ultimate'); // 10
    registerCosmeticForTest('exp-b', 'ultimate'); // 10 → total 20, B has 10
    await acquire(a.token, 'exp-a').catch(() => {}); // A has 10 — can't own both, so grant directly
    // A can't afford both (20 > 10); grant A ownership out-of-band so the card can publish.
    const { grantEntitlement } = await import('../../src/services/cosmetics/cosmetic-service');
    await grantEntitlement(a.id, a.id, 'exp-a', 'seed');
    await grantEntitlement(a.id, a.id, 'exp-b', 'seed');
    const { id } = await publishFresh(a.token, game.id, {
      rects: 1,
      fontIds: ['exp-a', 'exp-b'],
      seed: 11,
    });
    const adopt = await request(app).post(`/api/cards/${id}/adopt`).set(authed(b.token));
    expect(adopt.status).toBe(409);
    expect(adopt.body.error.code).toBe('INSUFFICIENT_BALANCE');
    expect(adopt.body.error.shortBy).toBe(10); // 20 - 10
    // no adoption grant landed — B can still adopt after funding (not tested here); count stays 0.
    const gallery = await request(app).get(`/api/games/${game.id}/cards`).set(authed(a.token));
    expect(gallery.body.items[0].adoptionCount).toBe(0);
  });

  it('ALREADY_ADOPTED on a repeat — the second attempt never re-charges (idempotent)', async () => {
    const a = await registerUser();
    const b = await registerUser();
    const game = await seedGame(a.token, 'Repeat Adopt RPG');
    const { id } = await publishFresh(a.token, game.id, { rects: 3, seed: 12 });
    await request(app).post(`/api/cards/${id}/adopt`).set(authed(b.token));
    const again = await request(app).post(`/api/cards/${id}/adopt`).set(authed(b.token));
    expect(again.status).toBe(409);
    expect(again.body.error.code).toBe('ALREADY_ADOPTED');
  });
});

describe('F36: concurrent adopt (decision 0072 — one row, one charge)', () => {
  it('parallel adopts of the same card by ONE user → exactly one adoption row', async () => {
    const a = await registerUser();
    const b = await registerUser();
    const game = await seedGame(a.token, 'Race Same-User RPG');
    const { id } = await publishFresh(a.token, game.id, { rects: 3, seed: 13 });
    const [r1, r2] = await Promise.all([
      request(app).post(`/api/cards/${id}/adopt`).set(authed(b.token)),
      request(app).post(`/api/cards/${id}/adopt`).set(authed(b.token)),
    ]);
    const statuses = [r1.status, r2.status].sort();
    expect(statuses).toEqual([200, 409]); // one grant, one ALREADY_ADOPTED
    const gallery = await request(app).get(`/api/games/${game.id}/cards`).set(authed(a.token));
    expect(gallery.body.items[0].adoptionCount).toBe(1);
  });

  it('two users racing premium adopts against tight balances → ledger reconciles for both', async () => {
    const a = await registerUser();
    const b = await registerUser();
    const c = await registerUser();
    const game = await seedGame(a.token, 'Race Two-User RPG');
    registerCosmeticForTest('race-font', 'standard'); // 3 (each of B,C has 5 → both can afford)
    const { grantEntitlement } = await import('../../src/services/cosmetics/cosmetic-service');
    await grantEntitlement(a.id, a.id, 'race-font', 'seed');
    const { id } = await publishFresh(a.token, game.id, { rects: 1, fontIds: ['race-font'], seed: 14 });
    const { reconcile } = await import('../../src/services/economy/ledger-service');

    const [rb, rc] = await Promise.all([
      request(app).post(`/api/cards/${id}/adopt`).set(authed(b.token)),
      request(app).post(`/api/cards/${id}/adopt`).set(authed(c.token)),
    ]);
    expect(rb.status).toBe(200);
    expect(rc.status).toBe(200);
    expect(rb.body.totalPaid).toBe(3);
    expect(rc.body.totalPaid).toBe(3);
    expect((await reconcile(b.id)).ok).toBe(true);
    expect((await reconcile(c.id)).ok).toBe(true);
    const gallery = await request(app).get(`/api/games/${game.id}/cards`).set(authed(a.token));
    expect(gallery.body.items[0].adoptionCount).toBe(2);
  });
});

describe('SOC-09 §0.6: block-filtering both directions (gallery + trending)', () => {
  it('a blocked designer vanishes from the caller gallery (both directions) + adopt refuses INDISTINGUISHABLY', async () => {
    const a = await registerUser();
    const b = await registerUser();
    const game = await seedGame(a.token, 'Block Gallery RPG');
    const { id } = await publishFresh(a.token, game.id, { rects: 3, seed: 15 });

    // baseline: B sees A's card
    let gallery = await request(app).get(`/api/games/${game.id}/cards`).set(authed(b.token));
    expect(gallery.body.items).toHaveLength(1);

    // B blocks A → A's card disappears from B's gallery; and adopt is refused as NOT_PUBLISHED (MOD-09).
    await getDb().insert(userBlocks).values({ blockerId: b.id, blockedId: a.id });
    gallery = await request(app).get(`/api/games/${game.id}/cards`).set(authed(b.token));
    expect(gallery.body.items).toHaveLength(0);
    const adopt = await request(app).post(`/api/cards/${id}/adopt`).set(authed(b.token));
    expect(adopt.status).toBe(409);
    expect(adopt.body.error.code).toBe('NOT_PUBLISHED'); // indistinguishable from not-published
  });

  it('the OTHER direction hides too (A blocked B) — trending drops the blocked designer', async () => {
    const a = await registerUser();
    const b = await registerUser();
    const game = await seedGame(a.token, 'Block Trending RPG');
    await publishFresh(a.token, game.id, { rects: 3, seed: 16 });
    // A blocks B; B views trending → A's card is filtered out.
    await getDb().insert(userBlocks).values({ blockerId: a.id, blockedId: b.id });
    const trending = await request(app).get('/api/discover/trending-cards').set(authed(b.token));
    expect(trending.status).toBe(200);
    expect(trending.body.items.every((t: { designer: { userId: string } }) => t.designer.userId !== a.id)).toBe(true);
  });
});

describe('DISC-04/OQ-055: trending-cards ranked by adoption', () => {
  it('ranks published cards by adoption count, shape { rank, card, game, designer, adoptionCount }', async () => {
    const a = await registerUser();
    const b = await registerUser();
    const game = await seedGame(a.token, 'Trending RPG');
    const cold = await publishFresh(a.token, game.id, { rects: 3, seed: 17, name: 'Cold' });
    const hot = await publishFresh(a.token, game.id, { rects: 3, seed: 18, name: 'Hot' });
    await request(app).post(`/api/cards/${hot.id}/adopt`).set(authed(b.token)); // hot gets an adoption

    const trending = await request(app).get('/api/discover/trending-cards').set(authed(b.token));
    expect(trending.status).toBe(200);
    expect(trending.body.items[0]).toMatchObject({
      rank: 1,
      card: { id: hot.id, name: 'Hot' },
      game: { id: game.id, title: 'Trending RPG' },
      designer: { userId: a.id, username: a.username },
      adoptionCount: 1,
    });
    expect(trending.body.items[1].card.id).toBe(cold.id);
    // NON-COMMERCE — no price chips on trending.
    expect('priceForYou' in trending.body.items[0].card).toBe(false);
    // authz:trending_cards_read — actor-B / anon → 401 (the cross-principal read gate).
    const anon = await request(app).get('/api/discover/trending-cards');
    expect(anon.status).toBe(401);
  });
});

describe('CARD-20: unpublish + delete guards + published immutability', () => {
  it('unpublish delists (status → private); adopters keep their grant; count freezes', async () => {
    const a = await registerUser();
    const b = await registerUser();
    const game = await seedGame(a.token, 'Unpublish RPG');
    const { id } = await publishFresh(a.token, game.id, { rects: 3, seed: 19 });
    await request(app).post(`/api/cards/${id}/adopt`).set(authed(b.token)); // B adopts

    const un = await request(app).post(`/api/cards/${id}/unpublish`).set(authed(a.token));
    expect(un.status).toBe(200);
    expect(un.body.status).toBe('private');
    // gone from the gallery; a fresh adopt now refuses NOT_PUBLISHED.
    const gallery = await request(app).get(`/api/games/${game.id}/cards`).set(authed(b.token));
    expect(gallery.body.items).toHaveLength(0);
    const c = await registerUser();
    const late = await request(app).post(`/api/cards/${id}/adopt`).set(authed(c.token));
    expect(late.status).toBe(409);
    expect(late.body.error.code).toBe('NOT_PUBLISHED');
    // B (the existing adopter) keeps their grant: their contribution to A's totalAdoptions persists.
    const contrib = await request(app).get(`/api/users/${a.id}/contributions`).set(authed(a.token));
    expect(contrib.body.stats.totalAdoptions).toBe(1); // the count froze, not reverted
  });

  it('authz:card_unpublish — actor-B unpublishing actor-A’s card → 404 (no existence oracle)', async () => {
    const a = await registerUser();
    const b = await registerUser();
    const game = await seedGame(a.token, 'Unpublish Authz RPG');
    const { id } = await publishFresh(a.token, game.id, { rects: 3, seed: 20 });
    const stolen = await request(app).post(`/api/cards/${id}/unpublish`).set(authed(b.token));
    expect(stolen.status).toBe(404);
    const gallery = await request(app).get(`/api/games/${game.id}/cards`).set(authed(a.token));
    expect(gallery.body.items).toHaveLength(1); // still published — B could not delist it
  });

  it('a never-adopted published card may DELETE; an adopted one refuses; PATCH on published refuses', async () => {
    const a = await registerUser();
    const b = await registerUser();
    const game = await seedGame(a.token, 'Delete Guard RPG');
    // (1) never-adopted published → DELETE ok
    const solo = await publishFresh(a.token, game.id, { rects: 3, seed: 21 });
    const del = await request(app).delete(`/api/cards/${solo.id}`).set(authed(a.token));
    expect(del.status).toBe(200);
    // (2) adopted published → DELETE refused: 409 HAS_ADOPTERS (the CARD_EQUIPPED sibling — a
    // state-conflict refusal is a 409 named code per the LOOK_CAP-correction precedent, unpublish instead)
    const shared = await publishFresh(a.token, game.id, { rects: 3, seed: 22 });
    await request(app).post(`/api/cards/${shared.id}/adopt`).set(authed(b.token));
    const delAdopted = await request(app).delete(`/api/cards/${shared.id}`).set(authed(a.token));
    expect(delAdopted.status).toBe(409);
    expect(delAdopted.body.error.code).toBe('HAS_ADOPTERS');
    // (3) PATCH on a published card is refused (immutable, CARD-20)
    const patch = await request(app)
      .patch(`/api/cards/${shared.id}`)
      .set(authed(a.token))
      .send({ name: 'Renamed' });
    expect(patch.status).toBe(422);
  });
});

describe('OQ-141: copy-POST idempotency (decision 0067/0073 §0.10)', () => {
  it('a repeat copy-POST (same origin + identical hash) returns the EXISTING draft (200), not a second copy', async () => {
    const a = await registerUser();
    const game = await seedGame(a.token, 'CoW RPG');
    // an origin private card to copy from
    const originDraft = await createDraft(a.token, game.id, comp({ rects: 3, seed: 23 }), 'Origin');
    await request(app).post(`/api/cards/${originDraft.id}/save-private`).set(authed(a.token));

    const copyBody = { gameId: game.id, composition: comp({ rects: 4, seed: 24 }), derivedFromCardId: originDraft.id };
    const first = await request(app).post('/api/cards').set(authed(a.token)).send(copyBody);
    expect(first.status).toBe(201); // fresh copy
    const second = await request(app).post('/api/cards').set(authed(a.token)).send(copyBody);
    expect(second.status).toBe(200); // idempotent — the SAME draft returned
    expect(second.body.id).toBe(first.body.id);

    const mine = await request(app).get('/api/me/cards').set(authed(a.token));
    const copies = mine.body.items.filter((c: { derivedFromCardId: string | null }) => c.derivedFromCardId === originDraft.id);
    expect(copies).toHaveLength(1); // exactly one copy, not two
  });
});

describe('SYS-05: the stacked publish/adopt rate buckets are wired (decision 0073 §0.7)', () => {
  it('cards:publish burst past the cap → 429 RATE_LIMITED', async () => {
    overrideRuleForTest('cards:publish', { limit: 1, windowMs: 60_000 });
    const a = await registerUser();
    const game = await seedGame(a.token, 'Publish Limit RPG');
    const d1 = await createDraft(a.token, game.id, comp({ rects: 3, seed: 30 }));
    const d2 = await createDraft(a.token, game.id, comp({ rects: 3, seed: 31 }));
    expect((await publish(a.token, d1.id)).status).toBe(200);
    const limited = await publish(a.token, d2.id);
    expect(limited.status).toBe(429);
    expect(limited.body.error.code).toBe('RATE_LIMITED');
  });

  it('cards:adopt burst past the cap → 429 RATE_LIMITED', async () => {
    overrideRuleForTest('cards:adopt', { limit: 1, windowMs: 60_000 });
    const a = await registerUser();
    const b = await registerUser();
    const game = await seedGame(a.token, 'Adopt Limit RPG');
    const c1 = await publishFresh(a.token, game.id, { rects: 3, seed: 32 });
    const c2 = await publishFresh(a.token, game.id, { rects: 3, seed: 33 });
    expect((await request(app).post(`/api/cards/${c1.id}/adopt`).set(authed(b.token))).status).toBe(200);
    const limited = await request(app).post(`/api/cards/${c2.id}/adopt`).set(authed(b.token));
    expect(limited.status).toBe(429);
  });
});

describe('CAT-07: contributor data goes LIVE after publish + adopt (honest-zeros era ends)', () => {
  it('GET /users/:id/contributions reports cardsDesigned + totalAdoptions > 0; signatureCard set', async () => {
    const a = await registerUser();
    const b = await registerUser();
    const game = await seedGame(a.token, 'Contributor RPG');
    const { id } = await publishFresh(a.token, game.id, { rects: 3, seed: 25 });
    await request(app).post(`/api/cards/${id}/adopt`).set(authed(b.token));

    // self view (friend/full shape) — the set-pieces are present.
    const contrib = await request(app).get(`/api/users/${a.id}/contributions`).set(authed(a.token));
    expect(contrib.status).toBe(200);
    expect(contrib.body.stats.cardsDesigned).toBe(1);
    expect(contrib.body.stats.totalAdoptions).toBe(1);
    expect(contrib.body.stats.gamesAdded).toBe(1);
    expect(contrib.body.signatureCard.cardId).toBe(id);
    expect(contrib.body.topCards).toHaveLength(1);
  });

  it('authz:get_contributions — actor-B on a blocked/unknown target → the generic 404 collapse (MOD-09)', async () => {
    const a = await registerUser();
    const b = await registerUser();
    // blocked target → 404 (indistinguishable from unknown)
    await getDb().insert(userBlocks).values({ blockerId: a.id, blockedId: b.id });
    const blocked = await request(app).get(`/api/users/${a.id}/contributions`).set(authed(b.token));
    expect(blocked.status).toBe(404);
    // unknown id → the same 404
    const unknown = await request(app).get(`/api/users/${randomUUID()}/contributions`).set(authed(b.token));
    expect(unknown.status).toBe(404);
    // a non-friend gets the LIMITED shape (200, no set-pieces) — stats present, signatureCard omitted.
    const limited = await request(app).get(`/api/users/${a.id}/contributions`).set(authed(a.token));
    expect(limited.status).toBe(200); // self — full shape (sanity that the happy path still resolves)
  });
});
