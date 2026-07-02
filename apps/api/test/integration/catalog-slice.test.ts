import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import { randomUUID } from 'node:crypto';
import { PostgreSqlContainer, type StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import type { Express } from 'express';

// CAT-01..05/09 — the community catalog at the HTTP boundary (supertest + a REAL Postgres).
// CAT-03 dedup is THE M3 named risk domain (testing-strategy §3) — this file is its TEST-FIRST
// boundary half (the matcher's unit half lives in packages/shared/src/catalog/dedup.test.ts):
// the 409 DUPLICATE_SUSPECTED + suggestions refusal shape, the dedupOverride pass-through, the
// exact-match hard stop, and the F36 concurrent same-title race (the partial unique index decides).
// Tags: CAT-01/02/03/04/05/09, MOD-07, SYS-01/02/05, SYS-07.

let container: StartedPostgreSqlContainer;
let app: Express;

const PW = 'Sup3rSecret!';
let counter = 0;

function authed(token: string) {
  return { Authorization: `Bearer ${token}` };
}

async function registerUser() {
  counter += 1;
  const email = `cat${counter}_${randomUUID().slice(0, 6)}@example.com`;
  const username = `catuser${counter}${randomUUID().slice(0, 4)}`;
  const res = await request(app)
    .post('/api/auth/register')
    .send({ email, username, password: PW, acceptedTerms: true });
  if (res.status !== 201) throw new Error(`registerUser failed: ${res.status}`);
  return { id: res.body.user.id as string, username, token: res.body.accessToken as string };
}

async function genreIdByName(token: string, name: string): Promise<string> {
  const res = await request(app).get('/api/genres').set(authed(token));
  const hit = (res.body.items ?? []).find((g: { name: string }) => g.name === name);
  if (!hit) throw new Error(`genre ${name} not found`);
  return hit.id;
}

async function createGame(
  token: string,
  body: Record<string, unknown>,
): Promise<request.Response> {
  return request(app).post('/api/catalog/games').set(authed(token)).send(body);
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

describe('SYS-05 (OQ-094): catalog-create DAILY cap (catalog:create:daily)', () => {
  it('bursting past the daily cap → 429, independent of the per-minute burst', async () => {
    const a = await registerUser();
    const { overrideRuleForTest } = await import('../../src/config/rate-limits');
    // Keep the per-minute bucket generous so ONLY the daily bucket can trip in this test.
    overrideRuleForTest('catalog:create', { limit: 100, windowMs: 60_000 });
    overrideRuleForTest('catalog:create:daily', { limit: 2, windowMs: 86_400_000 });
    const results: request.Response[] = [];
    for (let i = 0; i < 4; i++) {
      results.push(await createGame(a.token, { name: `Daily ${i} ${randomUUID().slice(0, 4)}`, genreIds: [] }));
    }
    const limited = results.filter((r) => r.status === 429);
    expect(limited.length).toBeGreaterThan(0);
    expect(limited[0]?.body.error.code).toBe('RATE_LIMITED');
  });
});

describe('CAT-04: GET /genres — the controlled list', () => {
  it('returns the seeded controlled genres (migration 0003 reference data)', async () => {
    const a = await registerUser();
    const res = await request(app).get('/api/genres').set(authed(a.token));
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.items)).toBe(true);
    const names = res.body.items.map((g: { name: string }) => g.name);
    expect(names).toContain('RPG');
    expect(names).toContain('Soulslike');
    for (const g of res.body.items) {
      expect(typeof g.id).toBe('string');
      expect(typeof g.name).toBe('string');
    }
  });

  it('requires auth → 401', async () => {
    const res = await request(app).get('/api/genres');
    expect(res.status).toBe(401);
  });
});

describe('CAT-02/05: POST /catalog/games — create a canonical entry', () => {
  it('creates with the minimal body → 201 in the search-result item shape, contributor = caller', async () => {
    const a = await registerUser();
    const rpg = await genreIdByName(a.token, 'RPG');
    const res = await createGame(a.token, { name: 'Elden Ring', genreIds: [rpg] });
    expect(res.status).toBe(201);
    expect(res.body.name).toBe('Elden Ring');
    expect(typeof res.body.id).toBe('string');
    expect(res.body.genres).toEqual([{ id: rpg, name: 'RPG' }]);
    expect(res.body.contributor).toEqual({ userId: a.id, username: a.username });
    expect(res.body.collectionsCount).toBe(0);
    expect(res.body.friendsHaveCount).toBe(0);
    expect(res.body.inCollection).toBe(false);
    expect(res.body.studio).toBeNull();
    expect(res.body.publisher).toBeNull();
    expect(res.body.releaseDate).toBeNull();
  });

  it('echoes the optional CAT-02 fields (studio / publisher / releaseDate)', async () => {
    const a = await registerUser();
    const rpg = await genreIdByName(a.token, 'RPG');
    const res = await createGame(a.token, {
      name: 'Hades',
      genreIds: [rpg],
      studio: 'Supergiant Games',
      publisher: 'Supergiant Games',
      releaseDate: '2020-09-17',
    });
    expect(res.status).toBe(201);
    expect(res.body.studio).toBe('Supergiant Games');
    expect(res.body.publisher).toBe('Supergiant Games');
    expect(res.body.releaseDate).toBe('2020-09-17');
  });

  it('rejects a missing name / empty genreIds → 422 with field details (SYS-02/B1)', async () => {
    const a = await registerUser();
    const rpg = await genreIdByName(a.token, 'RPG');
    const noName = await createGame(a.token, { genreIds: [rpg] });
    expect(noName.status).toBe(422);
    expect(noName.body.error.code).toBe('VALIDATION_ERROR');
    const noGenres = await createGame(a.token, { name: 'Celeste', genreIds: [] });
    expect(noGenres.status).toBe(422);
  });

  it('rejects an UNKNOWN genreId → 422 (CAT-04 controlled list is authoritative)', async () => {
    const a = await registerUser();
    const res = await createGame(a.token, { name: 'Celeste', genreIds: [randomUUID()] });
    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('screens the name through MOD-07 → 422', async () => {
    const a = await registerUser();
    const rpg = await genreIdByName(a.token, 'RPG');
    const res = await createGame(a.token, { name: 'admin', genreIds: [rpg] });
    expect(res.status).toBe(422);
  });

  it('authz:catalog_create — an unauthenticated actorB gets 401; a smuggled contributor id is rejected 422 (SYS-01: the actor is NEVER read from the body)', async () => {
    const a = await registerUser();
    const rpg = await genreIdByName(a.token, 'RPG');
    const anon = await request(app)
      .post('/api/catalog/games')
      .send({ name: 'Spoofed', genreIds: [rpg] });
    expect(anon.status).toBe(401);

    const smuggled = await createGame(a.token, {
      name: 'Spoofed Two',
      genreIds: [rpg],
      createdBy: randomUUID(), // actorB-style spoof — .strict() refuses unknown keys
    });
    expect(smuggled.status).toBe(422);
  });
});

describe('CAT-03: the dedup refusal/warn shape (M3 risk domain — test-first)', () => {
  it('a NEAR-duplicate title → 409 DUPLICATE_SUSPECTED + best-first suggestions', async () => {
    const a = await registerUser();
    const rpg = await genreIdByName(a.token, 'RPG');
    const original = await createGame(a.token, { name: 'Elden Ring', genreIds: [rpg] });
    expect(original.status).toBe(201);

    const dup = await createGame(a.token, { name: 'Eldin Ring', genreIds: [rpg] });
    expect(dup.status).toBe(409);
    expect(dup.body.error.code).toBe('DUPLICATE_SUSPECTED');
    const s = dup.body.error.suggestions;
    expect(Array.isArray(s)).toBe(true);
    expect(s[0].id).toBe(original.body.id);
    expect(s[0].name).toBe('Elden Ring');
    expect(s[0].similarity).toBeGreaterThanOrEqual(0.5);
    expect(s[0].exact).toBe(false);
  });

  it('dedupOverride: true creates anyway on a NEAR-duplicate (a warn, not a block)', async () => {
    const a = await registerUser();
    const rpg = await genreIdByName(a.token, 'RPG');
    await createGame(a.token, { name: 'Elden Ring', genreIds: [rpg] });
    const forced = await createGame(a.token, {
      name: 'Eldin Ring',
      genreIds: [rpg],
      dedupOverride: true,
    });
    expect(forced.status).toBe(201);
    expect(forced.body.name).toBe('Eldin Ring');
  });

  it('an EXACT-normalized match is NEVER overridable ("ELDEN RING!" IS "Elden Ring")', async () => {
    const a = await registerUser();
    const rpg = await genreIdByName(a.token, 'RPG');
    await createGame(a.token, { name: 'Elden Ring', genreIds: [rpg] });
    const exact = await createGame(a.token, {
      name: 'ELDEN RING!',
      genreIds: [rpg],
      dedupOverride: true,
    });
    expect(exact.status).toBe(409);
    expect(exact.body.error.code).toBe('DUPLICATE_SUSPECTED');
    expect(exact.body.error.suggestions[0].exact).toBe(true);
  });

  it('F36: N concurrent same-title creates (override on) → EXACTLY ONE 201, the rest 409 (the partial unique index decides)', async () => {
    const a = await registerUser();
    const rpg = await genreIdByName(a.token, 'RPG');
    const N = 6;
    const results = await Promise.all(
      Array.from({ length: N }, () =>
        createGame(a.token, {
          name: 'Race Condition Chronicles',
          genreIds: [rpg],
          dedupOverride: true,
        }),
      ),
    );
    const created = results.filter((r) => r.status === 201);
    const refused = results.filter((r) => r.status === 409);
    expect(created).toHaveLength(1);
    expect(refused).toHaveLength(N - 1);
    for (const r of refused) expect(r.body.error.code).toBe('DUPLICATE_SUSPECTED');
  });
});

describe('CAT-01: GET /catalog/search — title search + dedup candidates', () => {
  it('substring match returns the search-result item shape', async () => {
    const a = await registerUser();
    const rpg = await genreIdByName(a.token, 'RPG');
    await createGame(a.token, { name: 'Elden Ring', genreIds: [rpg], studio: 'FromSoftware' });
    await createGame(a.token, { name: 'Hades', genreIds: [rpg] });

    const res = await request(app).get('/api/catalog/search?q=elden').set(authed(a.token));
    expect(res.status).toBe(200);
    expect(res.body.items).toHaveLength(1);
    const item = res.body.items[0];
    expect(item.name).toBe('Elden Ring');
    expect(item.studio).toBe('FromSoftware');
    expect(item.genres).toEqual([{ id: rpg, name: 'RPG' }]);
    expect(item.inCollection).toBe(false);
    expect(item.collectionsCount).toBe(0);
    expect(item.contributor.username).toBe(a.username);
  });

  it('a TYPO query still surfaces the near title (CAT-03 candidates ride search)', async () => {
    const a = await registerUser();
    const rpg = await genreIdByName(a.token, 'RPG');
    await createGame(a.token, { name: 'Elden Ring', genreIds: [rpg] });
    const res = await request(app).get('/api/catalog/search?q=eldn%20rig').set(authed(a.token));
    expect(res.status).toBe(200);
    expect(res.body.items.map((i: { name: string }) => i.name)).toContain('Elden Ring');
  });

  it('missing q → 422; unauthenticated → 401', async () => {
    const a = await registerUser();
    expect((await request(app).get('/api/catalog/search').set(authed(a.token))).status).toBe(422);
    expect((await request(app).get('/api/catalog/search?q=x')).status).toBe(401);
  });
});

describe('CAT-09: GET /catalog/popular — the suggestion rail', () => {
  it('returns { items } in the search-result shape (ranking asserted with collection writes)', async () => {
    const a = await registerUser();
    const rpg = await genreIdByName(a.token, 'RPG');
    await createGame(a.token, { name: 'Hollow Knight', genreIds: [rpg] });
    const res = await request(app).get('/api/catalog/popular').set(authed(a.token));
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.items)).toBe(true);
    expect(res.body.items.length).toBeGreaterThan(0);
    expect(res.body.items[0].name).toBe('Hollow Knight');
  });
});

describe('G-K / SYS-05: the catalog-create limiter (create-entry is abuse-prone)', () => {
  it('a create burst past the limit → 429 RATE_LIMITED', async () => {
    const a = await registerUser();
    const rpg = await genreIdByName(a.token, 'RPG');
    const { overrideRuleForTest } = await import('../../src/config/rate-limits');
    overrideRuleForTest('catalog:create', { limit: 2, windowMs: 60_000 });
    const results = [];
    for (let i = 0; i < 3; i++) {
      results.push(await createGame(a.token, { name: `Burst Game ${i}`, genreIds: [rpg] }));
    }
    const limited = results.filter((r) => r.status === 429);
    expect(limited.length).toBeGreaterThan(0);
    expect(limited[0]?.body.error.code).toBe('RATE_LIMITED');
  });
});
