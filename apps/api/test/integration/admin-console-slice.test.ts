import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import { randomUUID } from 'node:crypto';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { and, eq } from 'drizzle-orm';
import { PostgreSqlContainer, type StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import type { Express } from 'express';
import { COMPOSITION_SCHEMA_VERSION } from '@ingame/shared';

// M6 P7 — the ADMIN CONSOLE v1 server half (decision 0081; the walk-4 settlement ruling) at the HTTP
// boundary (supertest + REAL Postgres).
//
// The file leads with the STANDING ADMIN-CLASS AUTHZ SWEEP, because that gate is the whole security
// story of this surface: these endpoints read across users (aggregates over everyone, other people's
// reports) and one of them writes to a card its caller does not own. There is no row predicate doing
// that work — `requireAdminTier(n)` is the only wall — so every route is probed as a plain user AND
// unauthenticated, and a new route that skips this sweep should fail review.
//
// Then: the Spotlight round-trip (PUT → GET → GET /store reflects it → the MOD-10 audit row), the
// empty-PUT tolerance (the newest-N fallback stands — the server permits, the console warns), the
// stats shape + seeded-count spot-checks + the THROTTLED last-seen stamp, MOD-08 takedown semantics
// (public + adopter surfaces hide, adopters fall back per CARD-18, restore brings it back), and the
// reports viewer's newest-first paging.
//
// Tags: SYS-01, SYS-04, SYS-07, SYS-08, MOD-01, MOD-03, MOD-04, MOD-08, MOD-10, CARD-15, CARD-18,
// CARD-20, ECON-01, COSM-01, PROF-09.
// Standing authz tokens covered here (probed as actor-B → 4xx): authz:admin_spotlight_read ·
// authz:admin_spotlight_update · authz:admin_cosmetic_catalog · authz:admin_stats ·
// authz:admin_reports · authz:admin_card_takedown · authz:admin_card_restore.

let container: StartedPostgreSqlContainer;
let app: Express;
let mediaDir: string;

const PW = 'Sup3rSecret!';
let counter = 0;

function authed(token: string) {
  return { Authorization: `Bearer ${token}` };
}

interface TestUser {
  id: string;
  username: string;
  token: string;
}

async function registerUser(): Promise<TestUser> {
  counter += 1;
  const email = `adm${counter}_${randomUUID().slice(0, 6)}@example.com`;
  const username = `admuser${counter}${randomUUID().slice(0, 4)}`;
  const res = await request(app)
    .post('/api/auth/register')
    .send({ email, username, password: PW, acceptedTerms: true });
  if (res.status !== 201) throw new Error(`registerUser failed: ${res.status} ${JSON.stringify(res.body)}`);
  return { id: res.body.user.id as string, username, token: res.body.accessToken as string };
}

/**
 * THE SELF-GRANT, out-of-band (decision 0033 — there is no grant endpoint and never will be). In
 * production this is the runbook SQL line; here it is the same UPDATE through the test's own db handle.
 */
async function grantAdmin(userId: string, tier: number): Promise<void> {
  const { getDb } = await import('../../src/db/client');
  const { users } = await import('../../src/db/schema');
  await getDb().update(users).set({ role: 'admin', adminTier: tier }).where(eq(users.id, userId));
}

async function registerAdmin(tier = 4): Promise<TestUser> {
  const user = await registerUser();
  await grantAdmin(user.id, tier);
  return user;
}

async function seedGame(token: string, name: string) {
  const genresRes = await request(app).get('/api/genres').set(authed(token));
  const rpg = genresRes.body.items.find((g: { name: string }) => g.name === 'RPG');
  const res = await request(app)
    .post('/api/catalog/games')
    .set(authed(token))
    .send({ name, genreIds: [rpg.id] });
  if (res.status !== 201) throw new Error(`seedGame failed: ${res.status} ${JSON.stringify(res.body)}`);
  return res.body as { id: string; name: string };
}

function comp(seed = 0) {
  const elements = [0, 1, 2].map((i) => ({
    type: 'rect',
    x: 0.5,
    y: 0.1 + (i + seed * 0.011) * 0.07,
    w: 0.4,
    h: 0.05,
    fill: '#e8c14a',
  }));
  return { schemaVersion: COMPOSITION_SCHEMA_VERSION, base: { gradient: ['#241a4d', '#0e0b1e'] }, elements };
}

async function publishFresh(token: string, gameId: string, seed = 0): Promise<string> {
  const draft = await request(app)
    .post('/api/cards')
    .set(authed(token))
    .send({ gameId, composition: comp(seed) });
  if (draft.status !== 201) throw new Error(`createDraft failed: ${draft.status} ${JSON.stringify(draft.body)}`);
  const res = await request(app).post(`/api/cards/${draft.body.id}/publish`).set(authed(token));
  if (res.status !== 200) throw new Error(`publish failed: ${res.status} ${JSON.stringify(res.body)}`);
  return draft.body.id as string;
}

async function addToCollection(token: string, gameId: string): Promise<string> {
  const res = await request(app).post('/api/me/collection').set(authed(token)).send({ gameId });
  if (res.status !== 201) throw new Error(`addToCollection failed: ${res.status} ${JSON.stringify(res.body)}`);
  return res.body.entryId as string;
}

async function fileReport(token: string, targetType: string, targetId: string, reason: string) {
  const res = await request(app)
    .post('/api/reports')
    .set(authed(token))
    .send({ targetType, targetId, reason });
  if (res.status !== 201) throw new Error(`fileReport failed: ${res.status} ${JSON.stringify(res.body)}`);
  return res.body.reportId as string;
}

/** Every `/admin/*` route, as (method, path, body) — the sweep's inventory. Keep in step with admin-routes.ts. */
const ADMIN_ROUTES: Array<{ token: string; method: 'get' | 'put' | 'post'; path: string; body?: object }> = [
  { token: 'authz:admin_spotlight_read', method: 'get', path: '/api/admin/spotlight' },
  { token: 'authz:admin_spotlight_update', method: 'put', path: '/api/admin/spotlight', body: { ids: [] } },
  { token: 'authz:admin_cosmetic_catalog', method: 'get', path: '/api/admin/cosmetics/catalog' },
  { token: 'authz:admin_stats', method: 'get', path: '/api/admin/stats' },
  { token: 'authz:admin_reports', method: 'get', path: '/api/admin/reports' },
  {
    token: 'authz:admin_card_takedown',
    method: 'post',
    path: `/api/admin/cards/${randomUUID()}/takedown`,
    body: { reason: 'probe' },
  },
  {
    token: 'authz:admin_card_restore',
    method: 'post',
    path: `/api/admin/cards/${randomUUID()}/restore`,
    body: { reason: 'probe' },
  },
];

function hit(route: (typeof ADMIN_ROUTES)[number], token?: string) {
  const req = request(app)[route.method](route.path);
  if (token) req.set(authed(token));
  return route.body ? req.send(route.body) : req.send();
}

beforeAll(async () => {
  container = await new PostgreSqlContainer('postgres:16-alpine').start();
  process.env.DATABASE_URL = container.getConnectionUri();
  process.env.DISPOSABLE_DB = '1';
  process.env.JWT_SIGNING_SECRET = 'test-signing-secret-at-least-16-chars-long';
  mediaDir = mkdtempSync(join(tmpdir(), 'ingame-admin-media-'));
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
  const { resetLastSeenThrottle } = await import('../../src/auth/last-seen');
  resetLastSeenThrottle();
});

// ── The standing admin-class authz sweep (SYS-07/SYS-08 — the G-D pattern, re-fired for admins) ───────

describe('SYS-07/SYS-08: the standing ADMIN-CLASS authz sweep — the tier gate is the only wall', () => {
  for (const route of ADMIN_ROUTES) {
    it(`${route.token}: a PLAIN USER (actor-B, no role) hitting ${route.method.toUpperCase()} ${route.path} → 403`, async () => {
      const actorB = await registerUser(); // an ordinary account — never granted a role
      const res = await hit(route, actorB.token);
      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it(`${route.token}: UNAUTHENTICATED ${route.method.toUpperCase()} ${route.path} → 401`, async () => {
      const res = await hit(route);
      expect(res.status).toBe(401);
    });
  }

  it('a role=user row carrying a stray adminTier is STILL refused (role is the primary gate)', async () => {
    const actorB = await registerUser();
    const { getDb } = await import('../../src/db/client');
    const { users } = await import('../../src/db/schema');
    await getDb().update(users).set({ adminTier: 4 }).where(eq(users.id, actorB.id)); // role stays 'user'
    const res = await request(app).get('/api/admin/stats').set(authed(actorB.token));
    expect(res.status).toBe(403);
  });

  it('SYS-08 tiers are NESTED and enforced per route: a tier-I admin reads reports but not stats/spotlight', async () => {
    const tier1 = await registerAdmin(1);
    expect((await request(app).get('/api/admin/reports').set(authed(tier1.token))).status).toBe(200);
    expect((await request(app).get('/api/admin/stats').set(authed(tier1.token))).status).toBe(403);
    expect((await request(app).get('/api/admin/spotlight').set(authed(tier1.token))).status).toBe(403);

    const tier3 = await registerAdmin(3);
    expect((await request(app).get('/api/admin/stats').set(authed(tier3.token))).status).toBe(200);
    expect((await request(app).get('/api/admin/reports').set(authed(tier3.token))).status).toBe(200); // nesting
    expect((await request(app).get('/api/admin/spotlight').set(authed(tier3.token))).status).toBe(403); // IV only
  });

  it('PROF-09: the tier a self-grant sets is visible on /me — the console reads its own standing there', async () => {
    const admin = await registerAdmin(4);
    const me = await request(app).get('/api/me').set(authed(admin.token));
    expect(me.status).toBe(200);
    expect(me.body.role).toBe('admin');
    expect(me.body.adminTier).toBe(4);
  });
});

// ── SYS-04: Spotlight curation ────────────────────────────────────────────────────────────────────────

describe('SYS-04/ECON-01: Spotlight curation — the DB layer wins, the config seed is the fallback', () => {
  it('before any write, GET /admin/spotlight reports the CONFIG SEED (nothing changed by moving to the DB)', async () => {
    const admin = await registerAdmin(4);
    const { SPOTLIGHT_IDS } = await import('../../src/config/cosmetics');
    const res = await request(app).get('/api/admin/spotlight').set(authed(admin.token));
    expect(res.status).toBe(200);
    expect(res.body.source).toBe('seed');
    expect(res.body.ids).toEqual([...SPOTLIGHT_IDS]);
  });

  it('the ROUND-TRIP: PUT → GET reads it back → GET /store renders it → a MOD-10 audit row exists', async () => {
    const admin = await registerAdmin(4);
    const curated = ['brass', 'frost'];

    const put = await request(app)
      .put('/api/admin/spotlight')
      .set(authed(admin.token))
      .send({ ids: curated });
    expect(put.status).toBe(200);
    expect(put.body.source).toBe('curated');
    expect(put.body.resolvedIds).toEqual(curated);

    // (1) the console read reflects it
    const get = await request(app).get('/api/admin/spotlight').set(authed(admin.token));
    expect(get.body.ids).toEqual(curated);
    expect(get.body.source).toBe('curated');

    // (2) the USER-FACING store read reflects it — the whole point of the lever
    const shopper = await registerUser();
    const store = await request(app).get('/api/store').set(authed(shopper.token));
    expect(store.status).toBe(200);
    expect(store.body.premiumCosmetics.map((c: { id: string }) => c.id)).toEqual(curated);

    // (3) MOD-10 — the privileged write left an audit row, actor-stamped, in the same transaction
    const { getDb } = await import('../../src/db/client');
    const { adminAuditLog } = await import('../../src/db/schema');
    const rows = await getDb()
      .select()
      .from(adminAuditLog)
      .where(eq(adminAuditLog.action, 'spotlight.update'));
    expect(rows).toHaveLength(1);
    expect(rows[0]!.actorId).toBe(admin.id);
    expect(rows[0]!.targetType).toBe('server_setting');

    // (4) the event spine saw it too (rule-5), carrying the COUNT only — never the curated ids
    const { domainEvents } = await import('../../src/db/schema');
    const evs = await getDb()
      .select()
      .from(domainEvents)
      .where(eq(domainEvents.eventType, 'admin.spotlight_updated'));
    expect(evs).toHaveLength(1);
    expect(evs[0]!.payload).toEqual({ count: 2 });
  });

  it('an EMPTY curation is ACCEPTED and the newest-N fallback keeps the shelf full (server permits, UI warns)', async () => {
    const admin = await registerAdmin(4);
    const put = await request(app).put('/api/admin/spotlight').set(authed(admin.token)).send({ ids: [] });
    expect(put.status).toBe(200);
    expect(put.body.ids).toEqual([]);
    expect(put.body.source).toBe('fallback');
    expect(put.body.resolvedIds.length).toBe(put.body.fallbackCount);

    const shopper = await registerUser();
    const store = await request(app).get('/api/store').set(authed(shopper.token));
    expect(store.body.premiumCosmetics.length).toBe(put.body.fallbackCount); // never a blank shelf
  });

  it('an UNKNOWN or FREE cosmetic id is refused → 422, and nothing is written', async () => {
    const admin = await registerAdmin(4);
    const bad = await request(app)
      .put('/api/admin/spotlight')
      .set(authed(admin.token))
      .send({ ids: ['brass', 'no-such-sku'] });
    expect(bad.status).toBe(422);

    const dup = await request(app)
      .put('/api/admin/spotlight')
      .set(authed(admin.token))
      .send({ ids: ['brass', 'brass'] });
    expect(dup.status).toBe(422);

    // the refusals left the seed posture untouched (the tx rolled back / never ran)
    const get = await request(app).get('/api/admin/spotlight').set(authed(admin.token));
    expect(get.body.source).toBe('seed');
  });

  it('COSM-01: the picker lists the PREMIUM catalog and flags what is currently spotlighted', async () => {
    const admin = await registerAdmin(4);
    await request(app).put('/api/admin/spotlight').set(authed(admin.token)).send({ ids: ['brass'] });
    const res = await request(app).get('/api/admin/cosmetics/catalog').set(authed(admin.token));
    expect(res.status).toBe(200);
    expect(res.body.items.length).toBeGreaterThan(0);
    expect(res.body.items.every((i: { tier: string | null }) => i.tier !== null)).toBe(true); // premium only
    const brass = res.body.items.find((i: { id: string }) => i.id === 'brass');
    expect(brass.spotlighted).toBe(true);
    expect(res.body.items.filter((i: { spotlighted: boolean }) => i.spotlighted)).toHaveLength(1);
  });
});

// ── The ops dashboard ─────────────────────────────────────────────────────────────────────────────────

describe('MOD-04: GET /admin/stats — the free aggregates + the crude DAU', () => {
  it('returns the full shape, and the seeded counts are the real ones', async () => {
    const admin = await registerAdmin(4);
    const designer = await registerUser();
    const game = await seedGame(designer.token, 'Stats Quest');
    await publishFresh(designer.token, game.id, 1);
    await addToCollection(designer.token, game.id);
    await fileReport(designer.token, 'card', randomUUID(), 'spam');

    const res = await request(app).get('/api/admin/stats').set(authed(admin.token));
    expect(res.status).toBe(200);

    const { adminStatsResponseSchema } = await import('@ingame/shared');
    expect(adminStatsResponseSchema.safeParse(res.body).success).toBe(true);

    expect(res.body.users.total).toBe(2); // the admin + the designer
    expect(res.body.users.newLast24h).toBe(2);
    expect(res.body.cards.published).toBe(1);
    expect(res.body.cards.moderationHidden).toBe(0);
    expect(res.body.catalog.games).toBe(1);
    expect(res.body.collection.entries).toBe(1);
    expect(res.body.reports.total).toBe(1);
    expect(res.body.reports.open).toBe(1);
    // ECON-07: the by-reason rollup is present (it is honestly EMPTY here — the wallet is
    // never-materialize until a real economy action, so a fresh account writes no ledger row).
    expect(typeof res.body.economy.ledgerRowsByReason).toBe('object');
    expect(res.body.economy.walletBalanceTotal).toBe(0);
  });

  it('dau24h counts accounts SEEN in the window — the stamp lands, and it is THROTTLED to one write', async () => {
    const admin = await registerAdmin(4);
    const seen = await registerUser();
    const { flushLastSeenWrites } = await import('../../src/auth/last-seen');

    // Two quick authenticated requests from the same account.
    await request(app).get('/api/me').set(authed(seen.token));
    await request(app).get('/api/me').set(authed(seen.token));
    await flushLastSeenWrites();

    const { getDb } = await import('../../src/db/client');
    const { users } = await import('../../src/db/schema');
    const [row] = await getDb()
      .select({ lastSeenAt: users.lastSeenAt })
      .from(users)
      .where(eq(users.id, seen.id));
    expect(row!.lastSeenAt).not.toBeNull();
    const firstStamp = row!.lastSeenAt!.getTime();

    // A third request inside the throttle window must NOT rewrite the stamp.
    await request(app).get('/api/me').set(authed(seen.token));
    await flushLastSeenWrites();
    const [again] = await getDb()
      .select({ lastSeenAt: users.lastSeenAt })
      .from(users)
      .where(eq(users.id, seen.id));
    expect(again!.lastSeenAt!.getTime()).toBe(firstStamp);

    const stats = await request(app).get('/api/admin/stats').set(authed(admin.token));
    expect(stats.body.users.dau24h).toBeGreaterThanOrEqual(1);
  });

  it('an UNAUTHENTICATED request is not presence — no stamp is written', async () => {
    const nobody = await registerUser();
    const { flushLastSeenWrites, resetLastSeenThrottle } = await import('../../src/auth/last-seen');
    resetLastSeenThrottle();
    await request(app).get('/api/me'); // no bearer → 401
    await flushLastSeenWrites();
    const { getDb } = await import('../../src/db/client');
    const { users } = await import('../../src/db/schema');
    const [row] = await getDb()
      .select({ lastSeenAt: users.lastSeenAt })
      .from(users)
      .where(eq(users.id, nobody.id));
    expect(row!.lastSeenAt).toBeNull();
  });
});

// ── MOD-01/03/04: the read-only reports viewer ────────────────────────────────────────────────────────

describe('MOD-03/MOD-04: GET /admin/reports — the READ-ONLY queue, newest-first', () => {
  it('lists the seeded reports newest-first with the reporter named, and filters by target type', async () => {
    const admin = await registerAdmin(1);
    const reporter = await registerUser();
    const firstId = await fileReport(reporter.token, 'card', randomUUID(), 'offensive');
    const secondId = await fileReport(reporter.token, 'user', randomUUID(), 'abusive_profile');

    const res = await request(app).get('/api/admin/reports').set(authed(admin.token));
    expect(res.status).toBe(200);
    expect(res.body.total).toBe(2);
    expect(res.body.items.map((i: { id: string }) => i.id)).toEqual([secondId, firstId]); // newest first
    expect(res.body.items[0].reporter.username).toBe(reporter.username);
    expect(res.body.items[0].status).toBe('open');

    const cards = await request(app).get('/api/admin/reports?targetType=card').set(authed(admin.token));
    expect(cards.body.total).toBe(1);
    expect(cards.body.items[0].id).toBe(firstId);
  });

  it('pages through an opaque cursor and stops with a null nextCursor', async () => {
    const admin = await registerAdmin(1);
    const reporter = await registerUser();
    await fileReport(reporter.token, 'card', randomUUID(), 'spam');
    await fileReport(reporter.token, 'card', randomUUID(), 'spam');
    await fileReport(reporter.token, 'card', randomUUID(), 'spam');

    const page1 = await request(app).get('/api/admin/reports?limit=2').set(authed(admin.token));
    expect(page1.body.items).toHaveLength(2);
    expect(page1.body.nextCursor).toBe('2');
    const page2 = await request(app)
      .get(`/api/admin/reports?limit=2&cursor=${page1.body.nextCursor}`)
      .set(authed(admin.token));
    expect(page2.body.items).toHaveLength(1);
    expect(page2.body.nextCursor).toBeNull();
  });
});

// ── MOD-08: card takedown / restore ───────────────────────────────────────────────────────────────────

describe('MOD-08: card takedown — hidden everywhere public, adopters fall back per CARD-18', () => {
  it('takedown hides the card from the gallery, adopt and share; the adopter falls back to the default face', async () => {
    const admin = await registerAdmin(2);
    const designer = await registerUser();
    const adopter = await registerUser();
    const game = await seedGame(designer.token, 'Takedown Tales');
    const cardId = await publishFresh(designer.token, game.id, 2);

    // The adopter adopts + equips it, so the fallback is observable on their own shelf.
    const entryId = await addToCollection(adopter.token, game.id);
    expect((await request(app).post(`/api/cards/${cardId}/adopt`).set(authed(adopter.token))).status).toBe(200);
    const equip = await request(app)
      .patch(`/api/me/collection/${entryId}`)
      .set(authed(adopter.token))
      .send({ activeCardDesignId: cardId });
    expect(equip.status).toBe(200);

    // Pre-takedown: visible in the gallery and rendering on the adopter's shelf.
    const galleryBefore = await request(app)
      .get(`/api/games/${game.id}/cards`)
      .set(authed(adopter.token));
    expect(galleryBefore.body.items.map((c: { id: string }) => c.id)).toContain(cardId);
    const shelfBefore = await request(app).get('/api/me/collection').set(authed(adopter.token));
    expect(shelfBefore.body.items[0].card.id).toBe(cardId);

    // THE PULL.
    const pull = await request(app)
      .post(`/api/admin/cards/${cardId}/takedown`)
      .set(authed(admin.token))
      .send({ reason: 'legal takedown request' });
    expect(pull.status).toBe(200);
    expect(pull.body.hidden).toBe(true);
    expect(pull.body.hiddenAt).toBeTruthy();

    // (1) gone from the public gallery…
    const galleryAfter = await request(app)
      .get(`/api/games/${game.id}/cards`)
      .set(authed(adopter.token));
    expect(galleryAfter.body.items.map((c: { id: string }) => c.id)).not.toContain(cardId);

    // (2) …not adoptable by anyone new (the same refusal an unpublished card gets — no oracle)…
    const latecomer = await registerUser();
    const adoptAfter = await request(app).post(`/api/cards/${cardId}/adopt`).set(authed(latecomer.token));
    expect(adoptAfter.status).toBe(409);

    // (3) …not shareable, not even by its own designer (CARD-21 gate)…
    const share = await request(app).get(`/api/cards/${cardId}/share-image`).set(authed(designer.token));
    expect(share.status).toBe(404);

    // (4) …and the ADOPTER's equipped card falls back to the CARD-18 default face — the MOD-08 exception.
    const shelfAfter = await request(app).get('/api/me/collection').set(authed(adopter.token));
    expect(shelfAfter.body.items[0].card.id).toBe('default');

    // (5) the grant itself was NOT revoked — nothing was clawed back.
    const { getDb } = await import('../../src/db/client');
    const { cardAdoptions } = await import('../../src/db/schema');
    const grants = await getDb()
      .select()
      .from(cardAdoptions)
      .where(and(eq(cardAdoptions.cardDesignId, cardId), eq(cardAdoptions.adopterId, adopter.id)));
    expect(grants).toHaveLength(1);
    expect(grants[0]!.revokedAt).toBeNull();

    // (6) MOD-10 — the takedown is audited with its actor + reason.
    const { adminAuditLog } = await import('../../src/db/schema');
    const audit = await getDb()
      .select()
      .from(adminAuditLog)
      .where(eq(adminAuditLog.action, 'card.takedown'));
    expect(audit).toHaveLength(1);
    expect(audit[0]!.actorId).toBe(admin.id);
    expect(audit[0]!.targetId).toBe(cardId);
    expect(audit[0]!.reason).toBe('legal takedown request');
  });

  it('RESTORE lifts the pull: the card returns to the gallery and to the adopter, status untouched', async () => {
    const admin = await registerAdmin(2);
    const designer = await registerUser();
    const adopter = await registerUser();
    const game = await seedGame(designer.token, 'Restore Realm');
    const cardId = await publishFresh(designer.token, game.id, 3);
    const entryId = await addToCollection(adopter.token, game.id);
    await request(app).post(`/api/cards/${cardId}/adopt`).set(authed(adopter.token));
    await request(app)
      .patch(`/api/me/collection/${entryId}`)
      .set(authed(adopter.token))
      .send({ activeCardDesignId: cardId });

    await request(app)
      .post(`/api/admin/cards/${cardId}/takedown`)
      .set(authed(admin.token))
      .send({ reason: 'mistaken pull' });
    const restore = await request(app)
      .post(`/api/admin/cards/${cardId}/restore`)
      .set(authed(admin.token))
      .send({ reason: 'appeal upheld' });
    expect(restore.status).toBe(200);
    expect(restore.body.hidden).toBe(false);
    expect(restore.body.hiddenAt).toBeNull();

    const gallery = await request(app).get(`/api/games/${game.id}/cards`).set(authed(adopter.token));
    expect(gallery.body.items.map((c: { id: string }) => c.id)).toContain(cardId);
    const shelf = await request(app).get('/api/me/collection').set(authed(adopter.token));
    expect(shelf.body.items[0].card.id).toBe(cardId); // the adopter's equip came straight back

    // The designer's own lifecycle state was never rewritten by the moderation round-trip.
    const mine = await request(app).get('/api/me/cards').set(authed(designer.token));
    expect(mine.body.items.find((c: { id: string }) => c.id === cardId).status).toBe('published');
  });

  it('a pulled card ALSO leaves trending, the contributor surfaces, and a FRIEND’s view of the adopter’s shelf (P7 Murr majors)', async () => {
    const admin = await registerAdmin(2);
    const designer = await registerUser();
    const adopter = await registerUser();
    const viewer = await registerUser();
    const game = await seedGame(designer.token, 'Coverage Cove');
    const cardId = await publishFresh(designer.token, game.id, 6);

    // Adopt + equip — ranks the card on trending and seats it on the adopter's shelf.
    const entryId = await addToCollection(adopter.token, game.id);
    expect((await request(app).post(`/api/cards/${cardId}/adopt`).set(authed(adopter.token))).status).toBe(200);
    expect(
      (await request(app).patch(`/api/me/collection/${entryId}`).set(authed(adopter.token)).send({ activeCardDesignId: cardId })).status,
    ).toBe(200);

    // viewer ↔ adopter (the cross-user shelf read is friend-gated) AND viewer ↔ designer (the
    // contributions DETAIL — signature/top cards — is friends-only; the stats block alone is public).
    const { getDb } = await import('../../src/db/client');
    const { friendRequests } = await import('../../src/db/schema');
    for (const target of [adopter, designer]) {
      const mint = await request(app).post('/api/friends/requests').set(authed(viewer.token)).send({ toUserId: target.id });
      expect([200, 201]).toContain(mint.status);
      const [fr] = await getDb()
        .select()
        .from(friendRequests)
        .where(and(eq(friendRequests.fromUserId, viewer.id), eq(friendRequests.toUserId, target.id)));
      expect((await request(app).post(`/api/friends/requests/${fr!.id}/accept`).set(authed(target.token))).status).toBe(200);
    }

    // Pre-pull: all three surfaces serve it (the sanity half — the hide asserts below mean something).
    const trendingBefore = await request(app).get('/api/discover/trending-cards').set(authed(viewer.token));
    expect(JSON.stringify(trendingBefore.body)).toContain(cardId);
    const contribBefore = await request(app).get(`/api/users/${designer.id}/contributions`).set(authed(viewer.token));
    expect(JSON.stringify(contribBefore.body)).toContain(cardId);
    const shelfBefore = await request(app).get(`/api/users/${adopter.id}/collection`).set(authed(viewer.token));
    expect(shelfBefore.body.items[0].card.id).toBe(cardId);

    // THE PULL.
    expect(
      (await request(app).post(`/api/admin/cards/${cardId}/takedown`).set(authed(admin.token)).send({ reason: 'coverage sweep' })).status,
    ).toBe(200);

    // (1) trending no longer ranks it — the forgotten listPublishedForTrending seam.
    const trendingAfter = await request(app).get('/api/discover/trending-cards').set(authed(viewer.token));
    expect(JSON.stringify(trendingAfter.body)).not.toContain(cardId);
    // (2) the contributor surfaces drop it — the forgotten listPublishedByOwner seam.
    const contribAfter = await request(app).get(`/api/users/${designer.id}/contributions`).set(authed(viewer.token));
    expect(JSON.stringify(contribAfter.body)).not.toContain(cardId);
    // (3) a FRIEND's view of the adopter's shelf falls back exactly like the adopter's own — the
    // forgotten listFriendCollection join (a legal pull can't be visible to one and not the other).
    const shelfAfter = await request(app).get(`/api/users/${adopter.id}/collection`).set(authed(viewer.token));
    expect(shelfAfter.body.items[0].card.id).toBe('default');
  });

  it('a takedown is idempotent (a double-submit is a no-op success, not a second audit row)', async () => {
    const admin = await registerAdmin(2);
    const designer = await registerUser();
    const game = await seedGame(designer.token, 'Idempotent Isle');
    const cardId = await publishFresh(designer.token, game.id, 4);

    const first = await request(app)
      .post(`/api/admin/cards/${cardId}/takedown`)
      .set(authed(admin.token))
      .send({ reason: 'spam art' });
    const second = await request(app)
      .post(`/api/admin/cards/${cardId}/takedown`)
      .set(authed(admin.token))
      .send({ reason: 'spam art (again)' });
    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
    expect(second.body.hidden).toBe(true);
    expect(second.body.hiddenAt).toBe(first.body.hiddenAt); // the original stamp stands

    // The title's second half, actually asserted (P7 Murr — this was claimed but never queried):
    // exactly ONE card.takedown audit row exists across both submits.
    const { getDb } = await import('../../src/db/client');
    const { adminAuditLog } = await import('../../src/db/schema');
    const audit = await getDb()
      .select()
      .from(adminAuditLog)
      .where(and(eq(adminAuditLog.action, 'card.takedown'), eq(adminAuditLog.targetId, cardId)));
    expect(audit).toHaveLength(1);
  });

  it('an unknown card id → 404, and a blank reason → 422', async () => {
    const admin = await registerAdmin(2);
    const missing = await request(app)
      .post(`/api/admin/cards/${randomUUID()}/takedown`)
      .set(authed(admin.token))
      .send({ reason: 'nothing there' });
    expect(missing.status).toBe(404);

    const designer = await registerUser();
    const game = await seedGame(designer.token, 'Blank Reason Bay');
    const cardId = await publishFresh(designer.token, game.id, 5);
    const blank = await request(app)
      .post(`/api/admin/cards/${cardId}/takedown`)
      .set(authed(admin.token))
      .send({ reason: '   ' });
    expect(blank.status).toBe(422);
  });

  it('the hidden card is counted on the dashboard (the ops surface can see its own moderation state)', async () => {
    const admin = await registerAdmin(4);
    const designer = await registerUser();
    const game = await seedGame(designer.token, 'Counted Cove');
    const cardId = await publishFresh(designer.token, game.id, 6);
    await request(app)
      .post(`/api/admin/cards/${cardId}/takedown`)
      .set(authed(admin.token))
      .send({ reason: 'counted' });
    const stats = await request(app).get('/api/admin/stats').set(authed(admin.token));
    expect(stats.body.cards.moderationHidden).toBe(1);
    expect(stats.body.cards.published).toBe(1); // takedown never rewrites `status`
  });
});
