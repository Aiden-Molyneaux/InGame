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

async function addToCollection(token: string, gameId: string, hours = 0) {
  const res = await request(app).post('/api/me/collection').set(authed(token)).send({ gameId });
  if (res.status !== 201) throw new Error(`addToCollection failed: ${res.status}`);
  const entryId = res.body.entryId as string;
  if (hours > 0) await request(app).patch(`/api/me/collection/${entryId}`).set(authed(token)).send({ hours });
  return { entryId };
}

/** A direct accepted friendship (faster than the request flow; the lifecycle is P1's suite). */
async function befriend(aId: string, bId: string) {
  const { getDb } = await import('../../src/db/client');
  const { friendships } = await import('../../src/db/schema');
  await getDb().insert(friendships).values({ requesterId: aId, addresseeId: bId, status: 'accepted' });
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

describe('CAT-08 (M6 P7): GET /catalog/upcoming — future-releaseDate entries', () => {
  it('returns only FUTURE-dated entries, ordered releaseDate ASC (soonest first)', async () => {
    const a = await registerUser();
    const rpg = await genreIdByName(a.token, 'RPG');
    // dedupOverride: true — these fixture names are deliberately near-duplicate-shaped (CAT-03 would
    // otherwise 409-warn on the shared "… Future Game"/"… Game" wording); unrelated to this test.
    await createGame(a.token, { name: 'Far Future Game', genreIds: [rpg], releaseDate: '2099-12-31', dedupOverride: true });
    await createGame(a.token, { name: 'Near Future Game', genreIds: [rpg], releaseDate: '2099-01-01', dedupOverride: true });
    await createGame(a.token, { name: 'Already Released Game', genreIds: [rpg], releaseDate: '2020-01-01', dedupOverride: true });

    const res = await request(app).get('/api/catalog/upcoming').set(authed(a.token));
    expect(res.status).toBe(200);
    const names = res.body.items.map((i: { name: string }) => i.name);
    expect(names).toEqual(['Near Future Game', 'Far Future Game']); // ASC by releaseDate
    expect(names).not.toContain('Already Released Game');
  });

  it("the BOUNDARY — a game releasing TODAY is NOT upcoming (it has already released)", async () => {
    const a = await registerUser();
    const rpg = await genreIdByName(a.token, 'RPG');
    const today = new Date().toISOString().slice(0, 10);
    await createGame(a.token, { name: 'Releases Today', genreIds: [rpg], releaseDate: today, dedupOverride: true });
    await createGame(a.token, { name: 'Releases Tomorrow', genreIds: [rpg], releaseDate: '2099-06-15', dedupOverride: true });

    const res = await request(app).get('/api/catalog/upcoming').set(authed(a.token));
    expect(res.status).toBe(200);
    const names = res.body.items.map((i: { name: string }) => i.name);
    expect(names).not.toContain('Releases Today');
    expect(names).toContain('Releases Tomorrow');
  });

  it('a game with no releaseDate at all is never "upcoming"', async () => {
    const a = await registerUser();
    const rpg = await genreIdByName(a.token, 'RPG');
    await createGame(a.token, { name: 'No Date Game', genreIds: [rpg] });
    const res = await request(app).get('/api/catalog/upcoming').set(authed(a.token));
    expect(res.status).toBe(200);
    expect(res.body.items.map((i: { name: string }) => i.name)).not.toContain('No Date Game');
  });
});

describe('CAT-12 (M6 P7): GET /catalog/friends-active — the FRIENDS ARE PLAYING rail', () => {
  it("returns games the caller's FRIEND owns that the caller does NOT — ranked by friendsHaveCount desc", async () => {
    const a = await registerUser();
    const b = await registerUser();
    await befriend(a.id, b.id);
    const rpg = await genreIdByName(a.token, 'RPG');
    const sharedByOne = (await createGame(b.token, { name: 'Friend Only Game', genreIds: [rpg] })).body;
    await addToCollection(b.token, sharedByOne.id);

    const res = await request(app).get('/api/catalog/friends-active').set(authed(a.token));
    expect(res.status).toBe(200);
    const names = res.body.items.map((i: { name: string }) => i.name);
    expect(names).toContain('Friend Only Game');
    const item = res.body.items.find((i: { name: string }) => i.name === 'Friend Only Game');
    expect(item.friendsHaveCount).toBe(1);
  });

  it("EXCLUDES a game the caller already owns (the caller-lacks filter)", async () => {
    const a = await registerUser();
    const b = await registerUser();
    await befriend(a.id, b.id);
    const rpg = await genreIdByName(a.token, 'RPG');
    const sharedGame = (await createGame(b.token, { name: 'Already Mine Game', genreIds: [rpg] })).body;
    await addToCollection(b.token, sharedGame.id);
    await addToCollection(a.token, sharedGame.id); // the CALLER already owns it too

    const res = await request(app).get('/api/catalog/friends-active').set(authed(a.token));
    expect(res.status).toBe(200);
    expect(res.body.items.map((i: { name: string }) => i.name)).not.toContain('Already Mine Game');
  });

  it('ranks by friendsHaveCount DESC — a game two friends own outranks one only one owns', async () => {
    const a = await registerUser();
    const b = await registerUser();
    const c = await registerUser();
    await befriend(a.id, b.id);
    await befriend(a.id, c.id);
    const rpg = await genreIdByName(a.token, 'RPG');
    const popularAmongFriends = (await createGame(b.token, { name: 'Two Friends Game', genreIds: [rpg] })).body;
    const lessPopular = (await createGame(b.token, { name: 'One Friend Game', genreIds: [rpg] })).body;
    await addToCollection(b.token, popularAmongFriends.id);
    await addToCollection(c.token, popularAmongFriends.id);
    await addToCollection(b.token, lessPopular.id);

    const res = await request(app).get('/api/catalog/friends-active').set(authed(a.token));
    const names = res.body.items.map((i: { name: string }) => i.name);
    const twoIdx = names.indexOf('Two Friends Game');
    const oneIdx = names.indexOf('One Friend Game');
    expect(twoIdx).toBeGreaterThanOrEqual(0);
    expect(oneIdx).toBeGreaterThan(twoIdx); // the 2-friend game ranks ABOVE the 1-friend game
  });

  it('SOC-09: a BLOCKED former friend’s owned games are severed by construction (friendScoped excludes them)', async () => {
    const a = await registerUser();
    const b = await registerUser();
    await befriend(a.id, b.id);
    const rpg = await genreIdByName(a.token, 'RPG');
    const blockedGame = (await createGame(b.token, { name: 'Blocked Friend Game', genreIds: [rpg] })).body;
    await addToCollection(b.token, blockedGame.id);

    // Confirm it's visible BEFORE the block, then block severs the friendship (SOC-09).
    const before = await request(app).get('/api/catalog/friends-active').set(authed(a.token));
    expect(before.body.items.map((i: { name: string }) => i.name)).toContain('Blocked Friend Game');

    await request(app).post('/api/me/blocks').set(authed(a.token)).send({ userId: b.id });

    const after = await request(app).get('/api/catalog/friends-active').set(authed(a.token));
    expect(after.body.items.map((i: { name: string }) => i.name)).not.toContain('Blocked Friend Game');
  });

  it('a caller with no friends → { items: [] }', async () => {
    const a = await registerUser();
    const res = await request(app).get('/api/catalog/friends-active').set(authed(a.token));
    expect(res.status).toBe(200);
    expect(res.body.items).toEqual([]);
  });
});

describe('CAT-11 (M6 W-C7): GET /catalog/new-releases — recently-released entries', () => {
  it('returns only PAST-dated entries, ordered releaseDate DESC (most-recently-released first)', async () => {
    const a = await registerUser();
    const rpg = await genreIdByName(a.token, 'RPG');
    // Near-duplicate-shaped fixture names → dedupOverride:true (CAT-03 would otherwise 409-warn); unrelated.
    await createGame(a.token, { name: 'Old Release Game', genreIds: [rpg], releaseDate: '2019-05-01', dedupOverride: true });
    await createGame(a.token, { name: 'Recent Release Game', genreIds: [rpg], releaseDate: '2024-11-20', dedupOverride: true });
    await createGame(a.token, { name: 'Future Unreleased Game', genreIds: [rpg], releaseDate: '2099-01-01', dedupOverride: true });

    const res = await request(app).get('/api/catalog/new-releases').set(authed(a.token));
    expect(res.status).toBe(200);
    const names = res.body.items.map((i: { name: string }) => i.name);
    expect(names).toEqual(['Recent Release Game', 'Old Release Game']); // DESC by releaseDate
    expect(names).not.toContain('Future Unreleased Game'); // distinct from /catalog/upcoming
  });

  it('the BOUNDARY — a game releasing TODAY IS a new-release (it has already released)', async () => {
    const a = await registerUser();
    const rpg = await genreIdByName(a.token, 'RPG');
    const today = new Date().toISOString().slice(0, 10);
    await createGame(a.token, { name: 'Released Today Game', genreIds: [rpg], releaseDate: today, dedupOverride: true });
    await createGame(a.token, { name: 'Releases Tomorrow Game', genreIds: [rpg], releaseDate: '2099-06-15', dedupOverride: true });

    const res = await request(app).get('/api/catalog/new-releases').set(authed(a.token));
    expect(res.status).toBe(200);
    const names = res.body.items.map((i: { name: string }) => i.name);
    expect(names).toContain('Released Today Game'); // today has released → included (upcoming's complement)
    expect(names).not.toContain('Releases Tomorrow Game');
  });

  it('a game with no releaseDate at all is never a "new release"; the item carries the CAT-09 shape', async () => {
    const a = await registerUser();
    const rpg = await genreIdByName(a.token, 'RPG');
    await createGame(a.token, { name: 'No Date Release Game', genreIds: [rpg] });
    const dated = (await createGame(a.token, { name: 'Dated Release Game', genreIds: [rpg], releaseDate: '2021-03-03', dedupOverride: true })).body;
    await addToCollection(a.token, dated.id);

    const res = await request(app).get('/api/catalog/new-releases').set(authed(a.token));
    expect(res.status).toBe(200);
    const names = res.body.items.map((i: { name: string }) => i.name);
    expect(names).not.toContain('No Date Release Game');
    const item = res.body.items.find((i: { name: string }) => i.name === 'Dated Release Game');
    expect(item).toMatchObject({ collectionsCount: 1, friendsHaveCount: 0, inCollection: true });
    expect(item.contributor.username).toBe(a.username);
  });

  it('unauthenticated → 401', async () => {
    expect((await request(app).get('/api/catalog/new-releases')).status).toBe(401);
  });
});

describe('CAT-05/09/09c (M6 W-C5): GET /catalog/games/:id — the game-detail aggregate', () => {
  it('returns canonical facts + genres + contributor + CAT-09 counts + friendsWhoOwn + inCollection', async () => {
    const a = await registerUser();
    const friend = await registerUser();
    await befriend(a.id, friend.id);
    const rpg = await genreIdByName(a.token, 'RPG');
    const game = (await createGame(a.token, {
      name: 'Aggregate Game', genreIds: [rpg], studio: 'FromSoftware', publisher: 'Bandai Namco', releaseDate: '2022-02-25',
    })).body;
    await addToCollection(friend.token, game.id, 42); // a friend owns it (42 hrs)

    const res = await request(app).get(`/api/catalog/games/${game.id}`).set(authed(a.token));
    expect(res.status).toBe(200);
    expect(res.body.id).toBe(game.id);
    expect(res.body.name).toBe('Aggregate Game');
    expect(res.body.studio).toBe('FromSoftware');
    expect(res.body.publisher).toBe('Bandai Namco');
    expect(res.body.releaseDate).toBe('2022-02-25');
    expect(res.body.genres).toEqual([{ id: rpg, name: 'RPG' }]);
    expect(res.body.contributor).toEqual({ userId: a.id, username: a.username }); // CAT-05 credit
    expect(res.body.collectionsCount).toBe(1); // the friend owns it (anonymous aggregate)
    expect(res.body.friendsHaveCount).toBe(1); // the friend is a's accepted friend
    expect(res.body.inCollection).toBe(false); // a does NOT own it
    expect(res.body.friendsWhoOwn).toHaveLength(1); // CAT-09c named list
    expect(res.body.friendsWhoOwn[0]).toMatchObject({ userId: friend.id, username: friend.username, hours: 42 });
    expect(res.body.friendsWhoOwn[0].avatarConfig).toBeNull(); // PROF-08 — rides the aggregate too (same helper as the focused route)
  });

  it('inCollection reflects whether the CALLER owns it (flips true once added)', async () => {
    const a = await registerUser();
    const rpg = await genreIdByName(a.token, 'RPG');
    const game = (await createGame(a.token, { name: 'Own It Detail Game', genreIds: [rpg] })).body;
    const before = await request(app).get(`/api/catalog/games/${game.id}`).set(authed(a.token));
    expect(before.body.inCollection).toBe(false);
    await addToCollection(a.token, game.id);
    const after = await request(app).get(`/api/catalog/games/${game.id}`).set(authed(a.token));
    expect(after.body.inCollection).toBe(true);
    expect(after.body.collectionsCount).toBe(1);
  });

  it('friendsWhoOwn: a NON-friend owner is not named, and the PROF-03 hours ride the named friend only', async () => {
    const a = await registerUser();
    const friend = await registerUser();
    const stranger = await registerUser();
    await befriend(a.id, friend.id);
    const rpg = await genreIdByName(a.token, 'RPG');
    const game = (await createGame(a.token, { name: 'Named List Detail Game', genreIds: [rpg] })).body;
    await addToCollection(friend.token, game.id, 12);
    await addToCollection(stranger.token, game.id, 99); // a non-friend owner — must NOT be named

    const res = await request(app).get(`/api/catalog/games/${game.id}`).set(authed(a.token));
    expect(res.status).toBe(200);
    expect(res.body.friendsWhoOwn).toHaveLength(1);
    expect(res.body.friendsWhoOwn[0]).toMatchObject({ userId: friend.id, hours: 12 });
    expect(res.body.friendsHaveCount).toBe(1); // only the friend counts
    expect(res.body.collectionsCount).toBe(2); // both own it (the anonymous aggregate)
  });

  it('SOC-09: a BLOCKED ex-friend owner is severed from friendsWhoOwn', async () => {
    const a = await registerUser();
    const b = await registerUser();
    await befriend(a.id, b.id);
    const rpg = await genreIdByName(a.token, 'RPG');
    const game = (await createGame(a.token, { name: 'Blocked Owner Detail Game', genreIds: [rpg] })).body;
    await addToCollection(b.token, game.id, 20);

    const before = await request(app).get(`/api/catalog/games/${game.id}`).set(authed(a.token));
    expect(before.body.friendsWhoOwn).toHaveLength(1);

    await request(app).post('/api/me/blocks').set(authed(a.token)).send({ userId: b.id });

    const after = await request(app).get(`/api/catalog/games/${game.id}`).set(authed(a.token));
    expect(after.body.friendsWhoOwn).toHaveLength(0);
  });

  it('CAT-09 (owner walk m6): reports the community AVG rating + AVG hours over all owners', async () => {
    const a = await registerUser();
    const u1 = await registerUser();
    const u2 = await registerUser();
    const u3 = await registerUser();
    const rpg = await genreIdByName(a.token, 'RPG');
    const game = (await createGame(a.token, { name: 'Community Averages Game', genreIds: [rpg] })).body;
    // three owners — hours 10 / 20 / 90 (mean 40); ratings 5 / 4 / UNRATED → mean 4.5 over the 2 raters
    const e1 = (await addToCollection(u1.token, game.id, 10)).entryId;
    const e2 = (await addToCollection(u2.token, game.id, 20)).entryId;
    await addToCollection(u3.token, game.id, 90);
    await request(app).patch(`/api/me/collection/${e1}`).set(authed(u1.token)).send({ rating: 5 });
    await request(app).patch(`/api/me/collection/${e2}`).set(authed(u2.token)).send({ rating: 4 });

    const res = await request(app).get(`/api/catalog/games/${game.id}`).set(authed(a.token));
    expect(res.status).toBe(200);
    expect(res.body.collectionsCount).toBe(3);
    expect(res.body.avgHours).toBe(40); // (10 + 20 + 90) / 3, rounded to a whole hour
    expect(res.body.avgRating).toBe(4.5); // (5 + 4) / 2 — the UNRATED owner never drags the mean (1 dp)
  });

  it('CAT-09 (owner walk m6): a game with NO owners reports null averages (the n=0 case)', async () => {
    const a = await registerUser();
    const rpg = await genreIdByName(a.token, 'RPG');
    const game = (await createGame(a.token, { name: 'Empty Averages Game', genreIds: [rpg] })).body;
    const res = await request(app).get(`/api/catalog/games/${game.id}`).set(authed(a.token));
    expect(res.status).toBe(200);
    expect(res.body.collectionsCount).toBe(0);
    expect(res.body.avgRating).toBeNull(); // nobody has rated → null (the client omits the row)
    expect(res.body.avgHours).toBeNull(); // no owners → null
  });

  it('CAT-09 (Murr walk-wave MAJOR): WISHLIST entries are NOT owners — they never drag AVG HOURS', async () => {
    const a = await registerUser();
    const player = await registerUser();
    const w1 = await registerUser();
    const w2 = await registerUser();
    const rpg = await genreIdByName(a.token, 'RPG');
    const game = (await createGame(a.token, { name: 'Wishlist Drag Game', genreIds: [rpg] })).body;
    // one real player at 60h + two 0-hour wishlisters — the mean must be 60, never (60+0+0)/3 = 20
    await addToCollection(player.token, game.id, 60);
    const we1 = (await addToCollection(w1.token, game.id, 0)).entryId;
    const we2 = (await addToCollection(w2.token, game.id, 0)).entryId;
    await request(app).patch(`/api/me/collection/${we1}`).set(authed(w1.token)).send({ status: 'wishlist' });
    await request(app).patch(`/api/me/collection/${we2}`).set(authed(w2.token)).send({ status: 'wishlist' });

    const res = await request(app).get(`/api/catalog/games/${game.id}`).set(authed(a.token));
    expect(res.status).toBe(200);
    expect(res.body.avgHours).toBe(60); // the statsOf/0058 convention: a wishlister is not an owner
  });

  it('CAT-09 (Murr walk-wave MAJOR): a WISHLIST-ONLY game reports null averages, never "AVG HOURS 0"', async () => {
    const a = await registerUser();
    const w = await registerUser();
    const rpg = await genreIdByName(a.token, 'RPG');
    const game = (await createGame(a.token, { name: 'Wishlist Only Game', genreIds: [rpg] })).body;
    const we = (await addToCollection(w.token, game.id, 0)).entryId;
    await request(app).patch(`/api/me/collection/${we}`).set(authed(w.token)).send({ status: 'wishlist' });

    const res = await request(app).get(`/api/catalog/games/${game.id}`).set(authed(a.token));
    expect(res.status).toBe(200);
    expect(res.body.avgHours).toBeNull(); // null → the client OMITS the row (the 0.80 display ruling)
    expect(res.body.avgRating).toBeNull();
  });

  it('CAT-09 (owner walk m6): owners but NO ratings → avgRating null, avgHours still reported', async () => {
    const a = await registerUser();
    const u1 = await registerUser();
    const rpg = await genreIdByName(a.token, 'RPG');
    const game = (await createGame(a.token, { name: 'Unrated Averages Game', genreIds: [rpg] })).body;
    await addToCollection(u1.token, game.id, 30);
    const res = await request(app).get(`/api/catalog/games/${game.id}`).set(authed(a.token));
    expect(res.status).toBe(200);
    expect(res.body.avgRating).toBeNull(); // an owner who hasn't rated is not a rater
    expect(res.body.avgHours).toBe(30);
  });

  it('an UNKNOWN game id → 404; a malformed id → 404; unauthenticated → 401', async () => {
    const a = await registerUser();
    expect((await request(app).get(`/api/catalog/games/${randomUUID()}`).set(authed(a.token))).status).toBe(404);
    expect((await request(app).get('/api/catalog/games/not-a-uuid').set(authed(a.token))).status).toBe(404);
    expect((await request(app).get(`/api/catalog/games/${randomUUID()}`)).status).toBe(401);
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
