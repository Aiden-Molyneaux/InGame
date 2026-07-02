import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import { randomUUID } from 'node:crypto';
import {
  PostgreSqlContainer,
  type StartedPostgreSqlContainer,
} from '@testcontainers/postgresql';
import type { Express } from 'express';

// F29 golden-path slice — the living, CI-run worked exemplar (PATCH /me bio). This is the integration
// HEART (testing-strategy §2): supertest + Express + a REAL Postgres (Testcontainers) + Drizzle
// migrations. If Docker is unavailable the container start throws and the suite FAILS — a mocked repo
// cannot fake green (decision 0051/F36). The standing SYS-07 test (authz:patch_me) hits the route as
// actor-B and asserts 4xx. Tags: SYS-01, SYS-02, SYS-07, PROF-01.

let container: StartedPostgreSqlContainer;
let app: Express;

interface SeededUser {
  id: string;
  username: string;
  bio: string;
  /** A real access-token JWT for this user (M2 auth; the principal verifies it). */
  token: string;
}

async function seedUser(bio = ''): Promise<SeededUser> {
  const { getDb } = await import('../../src/db/client');
  const { users } = await import('../../src/db/schema');
  const { signAccessToken } = await import('../../src/auth/tokens');
  const id = randomUUID();
  const username = `user_${id.slice(0, 8)}`;
  await getDb()
    .insert(users)
    .values({ id, username, email: `${username}@example.com`, bio });
  const token = await signAccessToken(id);
  return { id, username, bio, token };
}

function authed(token: string) {
  return { Authorization: `Bearer ${token}` };
}

beforeAll(async () => {
  container = await new PostgreSqlContainer('postgres:16-alpine').start();
  // Point the API at the throwaway container + mark it disposable (F03 sentinel) BEFORE the first query.
  process.env.DATABASE_URL = container.getConnectionUri();
  process.env.DISPOSABLE_DB = '1';
  process.env.JWT_SIGNING_SECRET = 'test-signing-secret-at-least-16-chars-long'; // M2 auth

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
  await resetDb(); // truncates between tests (guarded by F03 — DISPOSABLE_DB=1)
});

describe('F36: the integration net runs against a REAL Postgres (not a mock)', () => {
  it('started a real PG container (fails on zero containers)', async () => {
    expect(container.getMappedPort(5432)).toBeGreaterThan(0);
    const { getPool } = await import('../../src/db/client');
    const result = await getPool().query('SELECT 1 AS one');
    expect(result.rows[0].one).toBe(1);
  });
});

describe('PROF-01/SYS-01/SYS-02: PATCH /me bio — the F29 golden path', () => {
  it('updates the actor’s own bio and reflects it on GET /me', async () => {
    const actor = await seedUser('old bio');

    const patch = await request(app)
      .patch('/api/me')
      .set(authed(actor.token))
      .send({ bio: '  new shiny bio  ' });
    expect(patch.status).toBe(200);
    expect(patch.body.bio).toBe('new shiny bio'); // trimmed (SYS-02)
    expect(patch.body.id).toBe(actor.id);

    const me = await request(app).get('/api/me').set(authed(actor.token));
    expect(me.status).toBe(200);
    expect(me.body.bio).toBe('new shiny bio');
    // F06 self-shape allowlist — no email leak.
    expect('email' in me.body).toBe(false);
  });

  it('emits exactly one profile.updated outbox row INSIDE the mutation tx (ACH-08/F01)', async () => {
    const actor = await seedUser();
    await request(app).patch('/api/me').set(authed(actor.token)).send({ bio: 'hi' }).expect(200);

    const { getDb } = await import('../../src/db/client');
    const { domainEvents } = await import('../../src/db/schema');
    const rows = await getDb().select().from(domainEvents);
    expect(rows).toHaveLength(1);
    expect(rows[0]?.eventType).toBe('profile.updated');
    expect(rows[0]?.actorId).toBe(actor.id);
  });

  it('rejects an over-long bio with VALIDATION_ERROR 422 (not 400)', async () => {
    const actor = await seedUser();
    const res = await request(app)
      .patch('/api/me')
      .set(authed(actor.token))
      .send({ bio: 'x'.repeat(141) });
    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });
});

describe('SYS-07 authz:patch_me — actor-B cannot modify actor-A’s bio (asserts 4xx)', () => {
  it('an unauthenticated PATCH is refused 401 AUTH_FAILED', async () => {
    const res = await request(app).patch('/api/me').send({ bio: 'nope' });
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('AUTH_FAILED');
  });

  it('actorB acting on their own /me never touches actorA’s row (SYS-01 ownership scope)', async () => {
    const actorA = await seedUser('A original');
    const actorB = await seedUser('B original');

    await request(app)
      .patch('/api/me')
      .set(authed(actorB.token))
      .send({ bio: 'B was here' })
      .expect(200);

    // actorA is byte-for-byte unchanged — the scoped UPDATE bound to actorB only.
    const aSelf = await request(app).get('/api/me').set(authed(actorA.token));
    expect(aSelf.body.bio).toBe('A original');
  });

  it('actorB injecting actorA’s id in the body is refused 4xx (SYS-01: the body never carries an actor id)', async () => {
    const actorA = await seedUser('A original');
    const actorB = await seedUser('B original');

    const attack = await request(app)
      .patch('/api/me')
      .set(authed(actorB.token))
      .send({ id: actorA.id, bio: 'hacked by actorB' });

    // .strict() rejects the injected id → 4xx (422). The cross-user write is structurally impossible.
    expect(attack.status).toBeGreaterThanOrEqual(400);
    expect(attack.status).toBeLessThan(500);

    const aSelf = await request(app).get('/api/me').set(authed(actorA.token));
    expect(aSelf.body.bio).toBe('A original');
  });
});

describe('F36: authz holds under concurrency (the economy/authz race-test pattern)', () => {
  it('N concurrent cross-user spoofs from actorB are ALL refused 4xx; actorA is untouched', async () => {
    const actorA = await seedUser('A original');
    const actorB = await seedUser('B original');
    const N = 8;

    const results = await Promise.all(
      Array.from({ length: N }, (_, i) =>
        request(app)
          .patch('/api/me')
          .set(authed(actorB.token))
          .send({ id: actorA.id, bio: `attack ${i}` }),
      ),
    );

    // all-but-none win: every spoof is a 4xx (the SYS-01 guard does not crack under parallelism).
    expect(results.every((r) => r.status >= 400 && r.status < 500)).toBe(true);

    const aSelf = await request(app).get('/api/me').set(authed(actorA.token));
    expect(aSelf.body.bio).toBe('A original');
  });

  it('N concurrent self-writes each emit exactly one outbox row (emit-in-tx is atomic per mutation)', async () => {
    const actor = await seedUser();
    const N = 8;
    await Promise.all(
      Array.from({ length: N }, (_, i) =>
        request(app).patch('/api/me').set(authed(actor.token)).send({ bio: `v${i}` }).expect(200),
      ),
    );

    const { getDb } = await import('../../src/db/client');
    const { domainEvents } = await import('../../src/db/schema');
    const rows = await getDb().select().from(domainEvents);
    expect(rows).toHaveLength(N);
  });
});

// ── M2 profile widening: PATCH /me full body + PROF-06 cooldown + AUTH-09 completion ──────────────
describe('PROF-01/03/06 · AUTH-09: PATCH /me widened body', () => {
  async function seedFull(over: Record<string, unknown> = {}) {
    const { getDb } = await import('../../src/db/client');
    const { users } = await import('../../src/db/schema');
    const { signAccessToken } = await import('../../src/auth/tokens');
    const id = randomUUID();
    const username = `user_${id.slice(0, 8)}`;
    await getDb()
      .insert(users)
      .values({ id, username, email: `${username}@example.com`, ...over });
    return { id, username, token: await signAccessToken(id) };
  }

  it('updates username + privacy + favourites in one call, emitting one profile.updated', async () => {
    const actor = await seedFull();
    const gameId = randomUUID();
    const genreId = randomUUID();
    const res = await request(app)
      .patch('/api/me')
      .set(authed(actor.token))
      .send({ username: 'newhandle', privacy: 'public', favouriteGameId: gameId, favouriteGenreIds: [genreId] });
    expect(res.status).toBe(200);
    expect(res.body.username).toBe('newhandle');
    expect(res.body.privacy).toBe('public');
    expect(res.body.favouriteGameId).toBe(gameId);
    expect(res.body.favouriteGenreIds).toEqual([genreId]);

    const { getDb } = await import('../../src/db/client');
    const { domainEvents } = await import('../../src/db/schema');
    const rows = await getDb().select().from(domainEvents);
    expect(rows).toHaveLength(1);
    expect(rows[0]?.eventType).toBe('profile.updated');
  });

  it('AUTH-09: a usernamePending user completing their username clears the pending flag', async () => {
    const actor = await seedFull({ usernamePending: true });
    const res = await request(app)
      .patch('/api/me')
      .set(authed(actor.token))
      .send({ username: 'chosenname' });
    expect(res.status).toBe(200);
    expect(res.body.username).toBe('chosenname');
    expect(res.body.usernamePending).toBe(false);
  });

  it('PROF-06: a second username change within the cooldown is refused 422 (username_cooldown)', async () => {
    const actor = await seedFull();
    await request(app).patch('/api/me').set(authed(actor.token)).send({ username: 'firstname' }).expect(200);
    const second = await request(app)
      .patch('/api/me')
      .set(authed(actor.token))
      .send({ username: 'secondname' });
    expect(second.status).toBe(422);
    expect(second.body.error.reason).toBe('username_cooldown');
    // usernameNextChangeAt is now surfaced on GET /me (the cooldown microcopy).
    const me = await request(app).get('/api/me').set(authed(actor.token));
    expect(me.body.usernameNextChangeAt).toBeTruthy();
  });

  it('MOD-07: a reserved username is refused 422 (username_screened)', async () => {
    const actor = await seedFull();
    const res = await request(app).patch('/api/me').set(authed(actor.token)).send({ username: 'admin' });
    expect(res.status).toBe(422);
    expect(res.body.error.reason).toBe('username_screened');
  });
});

// ── PROF-02 gamertag CRUD + the SYS-07 cross-user authz tests ─────────────────────────────────────
describe('PROF-02 · SYS-07: gamertag CRUD', () => {
  it('creates, lists, updates, and deletes the caller’s own gamertags', async () => {
    const actor = await seedUser();
    const created = await request(app)
      .post('/api/me/gamertags')
      .set(authed(actor.token))
      .send({ platform: 'pc', handle: 'Curator#1234' });
    expect(created.status).toBe(201);
    const id = created.body.id;

    const list = await request(app).get('/api/me/gamertags').set(authed(actor.token));
    expect(list.body.items).toHaveLength(1);
    expect(list.body.items[0].platform).toBe('pc');

    const patched = await request(app)
      .patch(`/api/me/gamertags/${id}`)
      .set(authed(actor.token))
      .send({ handle: 'NewHandle' });
    expect(patched.body.handle).toBe('NewHandle');

    await request(app).delete(`/api/me/gamertags/${id}`).set(authed(actor.token)).expect(200);
    const after = await request(app).get('/api/me/gamertags').set(authed(actor.token));
    expect(after.body.items).toHaveLength(0);
  });

  it('rejects a second handle for the same platform → 422', async () => {
    const actor = await seedUser();
    await request(app).post('/api/me/gamertags').set(authed(actor.token)).send({ platform: 'xbox', handle: 'A' }).expect(201);
    const dup = await request(app).post('/api/me/gamertags').set(authed(actor.token)).send({ platform: 'xbox', handle: 'B' });
    expect(dup.status).toBe(422);
  });

  it('authz:create_gamertag — an unauthenticated create is refused 401 (actorB)', async () => {
    const res = await request(app).post('/api/me/gamertags').send({ platform: 'pc', handle: 'x' });
    expect(res.status).toBe(401);
  });

  it('authz:update_gamertag — actorB cannot modify actorA’s gamertag by id → 404 (SYS-01 scope)', async () => {
    const actorA = await seedUser();
    const actorB = await seedUser();
    const made = await request(app)
      .post('/api/me/gamertags')
      .set(authed(actorA.token))
      .send({ platform: 'pc', handle: 'AOnly' });
    const attack = await request(app)
      .patch(`/api/me/gamertags/${made.body.id}`)
      .set(authed(actorB.token))
      .send({ handle: 'hijacked' });
    expect(attack.status).toBe(404); // scoped repo returns null → NotFound (never reveals it exists)
  });

  it('authz:delete_gamertag — actorB cannot delete actorA’s gamertag → 404 (SYS-01 scope)', async () => {
    const actorA = await seedUser();
    const actorB = await seedUser();
    const made = await request(app)
      .post('/api/me/gamertags')
      .set(authed(actorA.token))
      .send({ platform: 'nintendo', handle: 'AOnly' });
    const attack = await request(app).delete(`/api/me/gamertags/${made.body.id}`).set(authed(actorB.token));
    expect(attack.status).toBe(404);
    // actorA's gamertag is untouched.
    const still = await request(app).get('/api/me/gamertags').set(authed(actorA.token));
    expect(still.body.items).toHaveLength(1);
  });
});

// ── PROF-08 avatar draft/publish shape-stubs ──────────────────────────────────────────────────────
describe('PROF-08 · SYS-07: avatar draft/publish (shape-stubs)', () => {
  it('accepts a draft + a publish (emitting the seam events)', async () => {
    const actor = await seedUser();
    await request(app)
      .post('/api/me/avatar/draft')
      .set(authed(actor.token))
      .send({ composition: { v: 1 } })
      .expect(200);
    await request(app)
      .post('/api/me/avatar/publish')
      .set(authed(actor.token))
      .send({ composition: { v: 1 } })
      .expect(200);

    const { getDb } = await import('../../src/db/client');
    const { domainEvents } = await import('../../src/db/schema');
    const rows = await getDb().select().from(domainEvents);
    const types = rows.map((r) => r.eventType);
    expect(types).toContain('avatar.draft_saved');
    expect(types).toContain('avatar.published');
  });

  it('authz:avatar_draft — an unauthenticated draft is refused 401 (actorB)', async () => {
    const res = await request(app).post('/api/me/avatar/draft').send({ composition: {} });
    expect(res.status).toBe(401);
  });

  it('authz:avatar_publish — an unauthenticated publish is refused 401 (actorB)', async () => {
    const res = await request(app).post('/api/me/avatar/publish').send({ composition: {} });
    expect(res.status).toBe(401);
  });
});
