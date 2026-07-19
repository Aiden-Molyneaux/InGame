import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import { randomUUID } from 'node:crypto';
import { and, eq } from 'drizzle-orm';
import { PostgreSqlContainer, type StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import type { Express } from 'express';

// M6 §1 friend-fabric spike — the friend-read guard threaded end-to-end (decision 0076 §0.1/§0.7).
// request → accept → friend/full shape (under the SYS-01-FRIEND-READ friendScoped predicate) → a third
// user gets LIMITED (exact allowlist, no leak) → block SEVERS the friendship + collapses both directions
// to the ONE generic "unavailable" (blocked ≡ suspended ≡ deleted byte-identical). Standing authz tokens
// covered (actor-B → 4xx): authz:friend_request_create · authz:friend_request_accept.
// Tags: SOC-01, SOC-08, SOC-09, MOD-09, SYS-07.

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
async function seedGamertag(userId: string, platform: string, handle: string) {
  const { getDb } = await import('../../src/db/client');
  const { gamertags } = await import('../../src/db/schema');
  await getDb().insert(gamertags).values({ userId, platform, handle });
}
async function seedSuspension(subjectId: string) {
  const { getDb } = await import('../../src/db/client');
  const { userSuspensions } = await import('../../src/db/schema');
  await getDb().insert(userSuspensions).values({ subjectId, reason: 'abuse' });
}
/** Read back the live pending request id (the spike has no GET /me/friends/requests yet — P1). */
async function pendingRequestId(fromUserId: string, toUserId: string): Promise<string> {
  const { getDb } = await import('../../src/db/client');
  const { friendRequests } = await import('../../src/db/schema');
  const rows = await getDb()
    .select()
    .from(friendRequests)
    .where(and(eq(friendRequests.fromUserId, fromUserId), eq(friendRequests.toUserId, toUserId)));
  return rows[0]!.id;
}
async function friendshipCount(a: string, b: string): Promise<number> {
  const { getDb } = await import('../../src/db/client');
  const { friendships } = await import('../../src/db/schema');
  const rows = await getDb().select().from(friendships);
  return rows.filter(
    (r) =>
      (r.requesterId === a && r.addresseeId === b) || (r.requesterId === b && r.addresseeId === a),
  ).length;
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

// avatarConfig is public cosmetic data (rides beside avatarUrl on the limited shape — W-4 Monogram Forge).
const LIMITED_KEYS = ['id', 'username', 'avatarUrl', 'avatarConfig', 'memberSince', 'mutualFriendsCount', 'relationship'];

describe('SOC-08: friend-request lifecycle threads end-to-end (request → accept → friend shape)', () => {
  it('A requests B, B accepts → an accepted friendship exists and GET /users/:B returns A the FRIEND shape', async () => {
    const a = await seedUser();
    const b = await seedUser();
    await seedGamertag(b.id, 'pc', 'BHandle');

    // 1) A opens a request to B (201).
    const reqRes = await request(app)
      .post('/api/friends/requests')
      .set(authed(a.token))
      .send({ toUserId: b.id });
    expect(reqRes.status).toBe(201);

    // A now sees B as 'outgoing'; B sees A as 'incoming' — pending state lives in friend_requests.
    const aSeesB = await request(app).get(`/api/users/${b.id}`).set(authed(a.token));
    expect(aSeesB.body.relationship).toBe('outgoing');
    expect(Object.keys(aSeesB.body).sort()).toEqual([...LIMITED_KEYS].sort()); // still LIMITED while pending

    // 2) B accepts the request.
    const reqId = await pendingRequestId(a.id, b.id);
    const acceptRes = await request(app)
      .post(`/api/friends/requests/${reqId}/accept`)
      .set(authed(b.token));
    expect(acceptRes.status).toBe(200);

    // 3) An accepted friendship row now binds the pair, and A gets B's FRIEND/FULL shape.
    expect(await friendshipCount(a.id, b.id)).toBe(1);
    const friendView = await request(app).get(`/api/users/${b.id}`).set(authed(a.token));
    expect(friendView.status).toBe(200);
    expect(friendView.body.relationship).toBe('friend');
    expect(friendView.body.bio).toBe('my bio');
    expect(friendView.body.gamertags).toHaveLength(1);
    expect(friendView.body.friendsCount).toBe(1);
    expect('email' in friendView.body).toBe(false); // allowlisted — no secret leak
  });

  it('refuses SELF_TARGET (409), REQUEST_PENDING (409 on a second open request), ALREADY_FRIENDS (409 after accept)', async () => {
    const a = await seedUser();
    const b = await seedUser();

    const self = await request(app)
      .post('/api/friends/requests')
      .set(authed(a.token))
      .send({ toUserId: a.id });
    expect(self.status).toBe(409);
    expect(self.body.error.code).toBe('SELF_TARGET');

    await request(app).post('/api/friends/requests').set(authed(a.token)).send({ toUserId: b.id });
    const dup = await request(app)
      .post('/api/friends/requests')
      .set(authed(a.token))
      .send({ toUserId: b.id });
    expect(dup.status).toBe(409);
    expect(dup.body.error.code).toBe('REQUEST_PENDING');

    const reqId = await pendingRequestId(a.id, b.id);
    await request(app).post(`/api/friends/requests/${reqId}/accept`).set(authed(b.token));
    const again = await request(app)
      .post('/api/friends/requests')
      .set(authed(a.token))
      .send({ toUserId: b.id });
    expect(again.status).toBe(409);
    expect(again.body.error.code).toBe('ALREADY_FRIENDS');
  });
});

describe('SYS-07: friend-request mutating endpoints are authz-guarded (actor-B → 4xx)', () => {
  it('authz:friend_request_create — an unauthenticated actorB POST /friends/requests → 401', async () => {
    const b = await seedUser();
    const res = await request(app).post('/api/friends/requests').send({ toUserId: b.id });
    expect(res.status).toBe(401);
  });

  it('authz:friend_request_accept — actorB (NOT the addressee) cannot accept A→B request → 404 (collapse)', async () => {
    const a = await seedUser();
    const b = await seedUser();
    const actorB = await seedUser(); // a third party
    await request(app).post('/api/friends/requests').set(authed(a.token)).send({ toUserId: b.id });
    const reqId = await pendingRequestId(a.id, b.id);

    // The third party cannot accept a request addressed to B — scoped to the addressee (SYS-07).
    const stolen = await request(app)
      .post(`/api/friends/requests/${reqId}/accept`)
      .set(authed(actorB.token));
    expect(stolen.status).toBe(404);
    // Unauthenticated accept is refused too.
    const anon = await request(app).post(`/api/friends/requests/${reqId}/accept`);
    expect(anon.status).toBe(401);
    // No friendship formed by the failed attempts.
    expect(await friendshipCount(a.id, b.id)).toBe(0);
  });
});

describe('G-D · SYS-01-FRIEND-READ: the friendScoped predicate gates the full shape (strip → RED)', () => {
  it('a PENDING requester (not yet accepted) gets the LIMITED shape ONLY — the friend read needs an ACCEPTED bond', async () => {
    const a = await seedUser();
    const b = await seedUser();
    await seedGamertag(b.id, 'pc', 'Secret');
    await request(app).post('/api/friends/requests').set(authed(a.token)).send({ toUserId: b.id });

    // Pending ≠ friend: friendScopedProfile finds no ACCEPTED friendship, so A gets B's LIMITED shape.
    // (If the friendScoped predicate were STRIPPED, A would leak B's full shape here → this goes RED.)
    const res = await request(app).get(`/api/users/${b.id}`).set(authed(a.token));
    expect(res.status).toBe(200);
    expect(Object.keys(res.body).sort()).toEqual([...LIMITED_KEYS].sort());
    expect('bio' in res.body).toBe(false);
    expect('gamertags' in res.body).toBe(false);
    expect('friendsCount' in res.body).toBe(false);
  });
});

describe('SOC-09 / MOD-09: block SEVERS the friendship + collapses both directions to ONE "unavailable"', () => {
  it('blocking a FRIEND drops the accepted bond and both directions of GET /users/:id → 404', async () => {
    const a = await seedUser();
    const b = await seedUser();
    await request(app).post('/api/friends/requests').set(authed(a.token)).send({ toUserId: b.id });
    const reqId = await pendingRequestId(a.id, b.id);
    await request(app).post(`/api/friends/requests/${reqId}/accept`).set(authed(b.token));
    expect(await friendshipCount(a.id, b.id)).toBe(1); // friends

    // A blocks B → the accepted friendship is SEVERED.
    const block = await request(app).post('/api/me/blocks').set(authed(a.token)).send({ userId: b.id });
    expect(block.status).toBe(200);
    expect(await friendshipCount(a.id, b.id)).toBe(0); // severed

    // Both directions now collapse to the generic NotFound (never reveals the block).
    expect((await request(app).get(`/api/users/${b.id}`).set(authed(a.token))).status).toBe(404);
    expect((await request(app).get(`/api/users/${a.id}`).set(authed(b.token))).status).toBe(404);
  });

  it('MOD-09 byte-identical collapse: blocked ≡ suspended ≡ deleted ≡ unknown → the SAME 404 body', async () => {
    const viewer = await seedUser();
    const blocker = await seedUser();
    await request(app).post('/api/me/blocks').set(authed(blocker.token)).send({ userId: viewer.id });
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
      expect(r.body).toEqual(responses[0]!.body); // indistinguishable — no state disclosure
    }
  });
});
