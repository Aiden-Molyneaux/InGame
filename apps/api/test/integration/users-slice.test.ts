import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import { randomUUID } from 'node:crypto';
import { PostgreSqlContainer, type StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import type { Express } from 'express';

// GET /users/:id — the FIRST target-id cross-principal route (G-D / gate-3). This is the REAL
// cross-user 4xx + privacy-SHAPE authz test SYS-07 was PROVISIONAL for until M2 (0052 §4). It asserts
// the SHAPE returned to actor-B (not just a 4xx), and that blocked / suspended / deleted / unknown all
// collapse to the SAME generic NotFound (non-disclosure). Tags: PROF-03/05, SOC-09, MOD-09, AUTH-07, SYS-07.

let container: StartedPostgreSqlContainer;
let app: Express;

async function seedUser(over: Record<string, unknown> = {}) {
  const { getDb } = await import('../../src/db/client');
  const { users } = await import('../../src/db/schema');
  const { signAccessToken } = await import('../../src/auth/tokens');
  const id = randomUUID();
  const username = `user_${id.slice(0, 8)}`;
  await getDb()
    .insert(users)
    .values({ id, username, email: `${username}@example.com`, bio: 'my bio', ...over });
  return { id, username, token: await signAccessToken(id) };
}
async function seedFriendship(requesterId: string, addresseeId: string, status: string) {
  const { getDb } = await import('../../src/db/client');
  const { friendships } = await import('../../src/db/schema');
  await getDb().insert(friendships).values({ requesterId, addresseeId, status });
}
async function seedBlock(blockerId: string, blockedId: string) {
  const { getDb } = await import('../../src/db/client');
  const { userBlocks } = await import('../../src/db/schema');
  await getDb().insert(userBlocks).values({ blockerId, blockedId });
}
async function seedSuspension(subjectId: string) {
  const { getDb } = await import('../../src/db/client');
  const { userSuspensions } = await import('../../src/db/schema');
  await getDb().insert(userSuspensions).values({ subjectId, reason: 'abuse' });
}
async function seedGamertag(userId: string, platform: string, handle: string) {
  const { getDb } = await import('../../src/db/client');
  const { gamertags } = await import('../../src/db/schema');
  await getDb().insert(gamertags).values({ userId, platform, handle });
}
function authed(token: string) {
  return { Authorization: `Bearer ${token}` };
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
});

const LIMITED_KEYS = ['id', 'username', 'avatarUrl', 'memberSince', 'mutualFriendsCount', 'relationship'];

describe('G-D · SYS-07: GET /users/:id privacy SHAPE (asserts the shape for actor-B)', () => {
  it('authz:get_user — a NON-FRIEND (actorB) sees the LIMITED shape only (no bio/gamertags/friendsCount leak)', async () => {
    const actorA = await seedUser();
    await seedGamertag(actorA.id, 'pc', 'ASecret');
    const actorB = await seedUser();

    const res = await request(app).get(`/api/users/${actorA.id}`).set(authed(actorB.token));
    expect(res.status).toBe(200);
    expect(Object.keys(res.body).sort()).toEqual([...LIMITED_KEYS].sort());
    expect(res.body.relationship).toBe('none');
    // The privacy predicate holds: a non-friend gets NONE of the friend-only fields.
    expect('bio' in res.body).toBe(false);
    expect('gamertags' in res.body).toBe(false);
    expect('friendsCount' in res.body).toBe(false);
    expect('privacy' in res.body).toBe(false);
    expect('email' in res.body).toBe(false);
  });

  it('a FRIEND (actorB) sees the FULL shape (bio + gamertags + friendsCount + relationship=friend)', async () => {
    const actorA = await seedUser();
    await seedGamertag(actorA.id, 'pc', 'AHandle');
    const actorB = await seedUser();
    await seedFriendship(actorA.id, actorB.id, 'accepted');

    const res = await request(app).get(`/api/users/${actorA.id}`).set(authed(actorB.token));
    expect(res.status).toBe(200);
    expect(res.body.relationship).toBe('friend');
    expect(res.body.bio).toBe('my bio');
    expect(res.body.gamertags).toHaveLength(1);
    expect(res.body.gamertags[0].handle).toBe('AHandle');
    expect(res.body.friendsCount).toBe(1);
    expect('email' in res.body).toBe(false); // still allowlisted — no secret leak
  });

  it('reflects the relationship direction (outgoing / incoming) for a pending request', async () => {
    const actorA = await seedUser();
    const actorB = await seedUser();
    await seedFriendship(actorA.id, actorB.id, 'pending'); // A requested B

    const bViewsA = await request(app).get(`/api/users/${actorA.id}`).set(authed(actorB.token));
    expect(bViewsA.body.relationship).toBe('incoming'); // from B's side, A's request is incoming
    const aViewsB = await request(app).get(`/api/users/${actorB.id}`).set(authed(actorA.token));
    expect(aViewsB.body.relationship).toBe('outgoing');
  });
});

describe('G-D · non-disclosure collapse: blocked / suspended / deleted / unknown → ONE generic NotFound', () => {
  it('a BLOCK in either direction → 404 (never reveals the block, nor who set it)', async () => {
    const actorA = await seedUser();
    const actorB = await seedUser();
    await seedBlock(actorA.id, actorB.id); // A blocks B

    // B cannot see A, and A cannot see B — indistinguishable from not-found.
    expect((await request(app).get(`/api/users/${actorA.id}`).set(authed(actorB.token))).status).toBe(404);
    expect((await request(app).get(`/api/users/${actorB.id}`).set(authed(actorA.token))).status).toBe(404);
  });

  it('blocked / suspended / deleted / unknown ALL return the byte-for-byte SAME 404 body', async () => {
    const viewer = await seedUser();
    const blocker = await seedUser();
    await seedBlock(blocker.id, viewer.id); // blocker blocks the viewer
    const suspended = await seedUser();
    await seedSuspension(suspended.id);
    const deleted = await seedUser({ deletedAt: new Date() });
    const unknownId = randomUUID();

    const responses = await Promise.all([
      request(app).get(`/api/users/${blocker.id}`).set(authed(viewer.token)),
      request(app).get(`/api/users/${suspended.id}`).set(authed(viewer.token)),
      request(app).get(`/api/users/${deleted.id}`).set(authed(viewer.token)),
      request(app).get(`/api/users/${unknownId}`).set(authed(viewer.token)),
    ]);
    for (const r of responses) {
      expect(r.status).toBe(404);
      expect(r.body).toEqual(responses[0]!.body); // all four are indistinguishable
    }
  });

  it('a malformed (non-uuid) id → the same 404 (never a 500)', async () => {
    const viewer = await seedUser();
    const res = await request(app).get('/api/users/not-a-uuid').set(authed(viewer.token));
    expect(res.status).toBe(404);
  });

  it('an unauthenticated read is refused 401', async () => {
    const actorA = await seedUser();
    const res = await request(app).get(`/api/users/${actorA.id}`);
    expect(res.status).toBe(401);
  });
});
