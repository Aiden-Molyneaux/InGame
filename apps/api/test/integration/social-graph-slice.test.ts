import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import { randomUUID } from 'node:crypto';
import { and, eq } from 'drizzle-orm';
import { PostgreSqlContainer, type StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import type { Express } from 'express';

// M6 P1 — the full SOC-08 social-graph lifecycle on the §1 spike (decision 0076 §0.1/§0.7). Covers the
// decline/cancel/unfriend transitions + the list reads + the 7-day cooldown + mutual-pending auto-accept
// + the one-bond-per-pair invariant + the F36 concurrency guards (pending-pair + canonical-bond unique
// indexes) + the friends:request rate bucket + the friend.added dual-credit payload + the 0076 §0.12
// worn-premium-shell reset. Standing authz tokens covered here (actor-B → 4xx):
// authz:friend_request_decline · authz:friend_request_cancel · authz:unfriend.
// Tags: SOC-01, SOC-08, SOC-09, MOD-09, SYS-05, SYS-07, F36.

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
function authed(token: string) {
  return { Authorization: `Bearer ${token}` };
}
async function seedSuspension(subjectId: string) {
  const { getDb } = await import('../../src/db/client');
  const { userSuspensions } = await import('../../src/db/schema');
  await getDb().insert(userSuspensions).values({ subjectId, reason: 'abuse' });
}
async function pendingRequestId(fromUserId: string, toUserId: string): Promise<string> {
  const { getDb } = await import('../../src/db/client');
  const { friendRequests } = await import('../../src/db/schema');
  const rows = await getDb()
    .select()
    .from(friendRequests)
    .where(
      and(
        eq(friendRequests.fromUserId, fromUserId),
        eq(friendRequests.toUserId, toUserId),
        eq(friendRequests.status, 'pending'),
      ),
    );
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
async function pendingRowCount(a: string, b: string): Promise<number> {
  const { getDb } = await import('../../src/db/client');
  const { friendRequests } = await import('../../src/db/schema');
  const rows = await getDb().select().from(friendRequests);
  return rows.filter(
    (r) =>
      r.status === 'pending' &&
      ((r.fromUserId === a && r.toUserId === b) || (r.fromUserId === b && r.toUserId === a)),
  ).length;
}
async function reqStatuses(id: string): Promise<string[]> {
  const { getDb } = await import('../../src/db/client');
  const { friendRequests } = await import('../../src/db/schema');
  const rows = await getDb().select().from(friendRequests).where(eq(friendRequests.id, id));
  return rows.map((r) => r.status);
}
async function friendAddedEvents(): Promise<Array<Record<string, unknown>>> {
  const { getDb } = await import('../../src/db/client');
  const { domainEvents } = await import('../../src/db/schema');
  const rows = await getDb()
    .select()
    .from(domainEvents)
    .where(eq(domainEvents.eventType, 'friend.added'));
  return rows.map((r) => r.payload as Record<string, unknown>);
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
  const { clearRuleOverrides } = await import('../../src/config/rate-limits');
  const { resetRequestCooldownForTest } = await import('../../src/config/social');
  resetRateLimitStore();
  clearRuleOverrides();
  resetRequestCooldownForTest();
});

/** Drive A→B request then B accepts → an accepted friendship. Returns nothing (asserts caller-side). */
async function makeFriends(a: { id: string; token: string }, b: { id: string; token: string }) {
  await request(app).post('/api/friends/requests').set(authed(a.token)).send({ toUserId: b.id });
  const reqId = await pendingRequestId(a.id, b.id);
  await request(app).post(`/api/friends/requests/${reqId}/accept`).set(authed(b.token));
}

describe('SOC-08: the list reads (GET /me/friends · /me/friends/requests · /me/blocks)', () => {
  it('GET /me/friends returns the accepted roster as PersonSummary (relationship=friend)', async () => {
    const a = await seedUser();
    const b = await seedUser();
    await makeFriends(a, b);
    const res = await request(app).get('/api/me/friends').set(authed(a.token));
    expect(res.status).toBe(200);
    expect(res.body.friends).toHaveLength(1);
    expect(res.body.friends[0]).toMatchObject({ userId: b.id, username: b.username, relationship: 'friend' });
  });

  it('GET /me/friends/requests splits incoming vs outgoing pending', async () => {
    const me = await seedUser();
    const inbound = await seedUser();
    const outbound = await seedUser();
    // inbound → me (incoming for me); me → outbound (outgoing for me)
    await request(app).post('/api/friends/requests').set(authed(inbound.token)).send({ toUserId: me.id });
    await request(app).post('/api/friends/requests').set(authed(me.token)).send({ toUserId: outbound.id });

    const res = await request(app).get('/api/me/friends/requests').set(authed(me.token));
    expect(res.status).toBe(200);
    expect(res.body.incoming).toHaveLength(1);
    expect(res.body.incoming[0].person).toMatchObject({ userId: inbound.id, relationship: 'incoming' });
    expect(res.body.outgoing).toHaveLength(1);
    expect(res.body.outgoing[0].person).toMatchObject({ userId: outbound.id, relationship: 'outgoing' });
  });

  it('GET /me/blocks lists the actor’s blocked users with blockedAt (MOD-09 lone-exception affordance)', async () => {
    const me = await seedUser();
    const target = await seedUser();
    await request(app).post('/api/me/blocks').set(authed(me.token)).send({ userId: target.id });
    const res = await request(app).get('/api/me/blocks').set(authed(me.token));
    expect(res.status).toBe(200);
    expect(res.body.blocks).toHaveLength(1);
    expect(res.body.blocks[0]).toMatchObject({ userId: target.id, username: target.username });
    expect(typeof res.body.blocks[0].blockedAt).toBe('string');
    // The blocked user does NOT see the block (non-disclosure, other direction).
    const other = await request(app).get('/api/me/blocks').set(authed(target.token));
    expect(other.body.blocks).toHaveLength(0);
  });
});

describe('SOC-08: decline is silent + stamps the SYS-04 cooldown; re-request is cooldown-limited', () => {
  it('decline transitions the request to declined and returns 200 (silent)', async () => {
    const a = await seedUser();
    const b = await seedUser();
    await request(app).post('/api/friends/requests').set(authed(a.token)).send({ toUserId: b.id });
    const reqId = await pendingRequestId(a.id, b.id);
    const res = await request(app).post(`/api/friends/requests/${reqId}/decline`).set(authed(b.token));
    expect(res.status).toBe(200);
    expect(await reqStatuses(reqId)).toEqual(['declined']);
    expect(await friendshipCount(a.id, b.id)).toBe(0);
  });

  it('a re-request inside the cooldown window → 409 REQUEST_COOLDOWN carrying { cooldownUntil }', async () => {
    const { setRequestCooldownDaysForTest } = await import('../../src/config/social');
    setRequestCooldownDaysForTest(7);
    const a = await seedUser();
    const b = await seedUser();
    await request(app).post('/api/friends/requests').set(authed(a.token)).send({ toUserId: b.id });
    const reqId = await pendingRequestId(a.id, b.id);
    await request(app).post(`/api/friends/requests/${reqId}/decline`).set(authed(b.token));

    const retry = await request(app).post('/api/friends/requests').set(authed(a.token)).send({ toUserId: b.id });
    expect(retry.status).toBe(409);
    expect(retry.body.error.code).toBe('REQUEST_COOLDOWN');
    expect(typeof retry.body.error.cooldownUntil).toBe('string');
  });

  it('after the cooldown expires, a re-request is allowed again', async () => {
    const { setRequestCooldownDaysForTest } = await import('../../src/config/social');
    setRequestCooldownDaysForTest(-1); // decline stamps a PAST cooldown → already expired
    const a = await seedUser();
    const b = await seedUser();
    await request(app).post('/api/friends/requests').set(authed(a.token)).send({ toUserId: b.id });
    const reqId = await pendingRequestId(a.id, b.id);
    await request(app).post(`/api/friends/requests/${reqId}/decline`).set(authed(b.token));

    const retry = await request(app).post('/api/friends/requests').set(authed(a.token)).send({ toUserId: b.id });
    expect(retry.status).toBe(201);
    expect(await pendingRowCount(a.id, b.id)).toBe(1);
  });
});

describe('SOC-08: cancel (outgoing) + unfriend (silent)', () => {
  it('DELETE /friends/requests/:id cancels the actor’s OWN outgoing request; a non-owner cannot', async () => {
    const a = await seedUser();
    const b = await seedUser();
    await request(app).post('/api/friends/requests').set(authed(a.token)).send({ toUserId: b.id });
    const reqId = await pendingRequestId(a.id, b.id);

    // The addressee (B) is NOT the owner of the OUTGOING cancel → collapse to 404 (no cancel).
    const wrong = await request(app).delete(`/api/friends/requests/${reqId}`).set(authed(b.token));
    expect(wrong.status).toBe(404);
    expect(await reqStatuses(reqId)).toEqual(['pending']);

    // The requester cancels their own.
    const ok = await request(app).delete(`/api/friends/requests/${reqId}`).set(authed(a.token));
    expect(ok.status).toBe(200);
    expect(await reqStatuses(reqId)).toEqual(['cancelled']);
  });

  it('a cancel stamps the cooldown EXACTLY like decline (SOC-08 verbatim; OQ-147 owns the UX question) — re-request inside the window → 409 REQUEST_COOLDOWN', async () => {
    const { setRequestCooldownDaysForTest } = await import('../../src/config/social');
    setRequestCooldownDaysForTest(7);
    const a = await seedUser();
    const b = await seedUser();
    await request(app).post('/api/friends/requests').set(authed(a.token)).send({ toUserId: b.id });
    const reqId = await pendingRequestId(a.id, b.id);
    await request(app).delete(`/api/friends/requests/${reqId}`).set(authed(a.token));

    // Decline-parity: the cancelled row carries the same SYS-04 cooldown stamp a decline would.
    const retry = await request(app).post('/api/friends/requests').set(authed(a.token)).send({ toUserId: b.id });
    expect(retry.status).toBe(409);
    expect(retry.body.error.code).toBe('REQUEST_COOLDOWN');
    expect(typeof retry.body.error.cooldownUntil).toBe('string');

    // The cooldown is the CANCELLER's — the addressee is unaffected and may request the canceller freely.
    const other = await request(app).post('/api/friends/requests').set(authed(b.token)).send({ toUserId: a.id });
    expect(other.status).toBe(201);
  });

  it('DELETE /me/friends/:userId unfriends (hard-delete of the bond); a non-friend unfriend collapses to 404', async () => {
    const a = await seedUser();
    const b = await seedUser();
    await makeFriends(a, b);
    expect(await friendshipCount(a.id, b.id)).toBe(1);

    const res = await request(app).delete(`/api/me/friends/${b.id}`).set(authed(a.token));
    expect(res.status).toBe(200);
    expect(await friendshipCount(a.id, b.id)).toBe(0);

    // A second unfriend (no longer friends) collapses to 404 — not a presence oracle.
    const again = await request(app).delete(`/api/me/friends/${b.id}`).set(authed(a.token));
    expect(again.status).toBe(404);
  });
});

describe('SOC-01: mutual-pending auto-accept (both asked ⇒ both agreed; one friendship, no deadlock)', () => {
  it('A requests B while B→A is pending → the request auto-accepts instead of erroring', async () => {
    const a = await seedUser();
    const b = await seedUser();
    await request(app).post('/api/friends/requests').set(authed(b.token)).send({ toUserId: a.id }); // B→A pending
    const res = await request(app).post('/api/friends/requests').set(authed(a.token)).send({ toUserId: b.id }); // A→B
    expect(res.status).toBe(201);
    expect(await friendshipCount(a.id, b.id)).toBe(1);
    const view = await request(app).get(`/api/users/${b.id}`).set(authed(a.token));
    expect(view.body.relationship).toBe('friend');
  });
});

describe('SOC-01: friend.added carries BOTH party ids (dual-credit payload — decision 0076 §0.7)', () => {
  it('one accept emits one friend.added with { requesterId, addresseeId, requestId }', async () => {
    const a = await seedUser();
    const b = await seedUser();
    await request(app).post('/api/friends/requests').set(authed(a.token)).send({ toUserId: b.id });
    const reqId = await pendingRequestId(a.id, b.id);
    await request(app).post(`/api/friends/requests/${reqId}/accept`).set(authed(b.token));

    const events = await friendAddedEvents();
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({ requesterId: a.id, addresseeId: b.id, requestId: reqId });
  });
});

describe('F36: one-bond-per-pair + pending-pair concurrency guards', () => {
  it('(a) simultaneous mutual requests → exactly ONE friendship row', async () => {
    const a = await seedUser();
    const b = await seedUser();
    const [r1, r2] = await Promise.all([
      request(app).post('/api/friends/requests').set(authed(a.token)).send({ toUserId: b.id }),
      request(app).post('/api/friends/requests').set(authed(b.token)).send({ toUserId: a.id }),
    ]);
    expect([r1.status, r2.status].every((s) => s === 201)).toBe(true);
    expect(await friendshipCount(a.id, b.id)).toBe(1);
  });

  it('(b) concurrent accept + cancel of the same request → one terminal state, no orphan bond', async () => {
    const a = await seedUser();
    const b = await seedUser();
    await request(app).post('/api/friends/requests').set(authed(a.token)).send({ toUserId: b.id });
    const reqId = await pendingRequestId(a.id, b.id);
    // B accepts while A cancels — the atomic WHERE status='pending' lets exactly ONE win.
    await Promise.all([
      request(app).post(`/api/friends/requests/${reqId}/accept`).set(authed(b.token)),
      request(app).delete(`/api/friends/requests/${reqId}`).set(authed(a.token)),
    ]);
    const statuses = await reqStatuses(reqId);
    expect(statuses).toHaveLength(1);
    expect(['accepted', 'cancelled']).toContain(statuses[0]);
    // Terminal state and the bond must agree: accepted ⇒ exactly one bond; cancelled ⇒ zero.
    const bonds = await friendshipCount(a.id, b.id);
    expect(bonds).toBe(statuses[0] === 'accepted' ? 1 : 0);
  });

  it('(c) a double-POST of the same request creates only ONE pending row', async () => {
    const a = await seedUser();
    const b = await seedUser();
    const [r1, r2] = await Promise.all([
      request(app).post('/api/friends/requests').set(authed(a.token)).send({ toUserId: b.id }),
      request(app).post('/api/friends/requests').set(authed(a.token)).send({ toUserId: b.id }),
    ]);
    const codes = [r1.status, r2.status].sort();
    expect(codes).toEqual([201, 409]); // one opens, one refused REQUEST_PENDING
    expect(await pendingRowCount(a.id, b.id)).toBe(1);
  });

  it('(d) concurrent accept + block → the block invariant holds: NO bond survives behind the block (§4 audit HIGH)', async () => {
    // The audited race: the accept-tx's uncommitted bond was invisible to the block-tx's severance
    // delete under READ COMMITTED → an accepted friendship coexisted with the block. The canonical-pair
    // advisory lock serializes the two; whichever order they land, the terminal state is identical:
    // the block exists and ZERO bonds survive. Three rounds for interleaving confidence.
    for (let round = 0; round < 3; round++) {
      const a = await seedUser();
      const b = await seedUser();
      await request(app).post('/api/friends/requests').set(authed(a.token)).send({ toUserId: b.id });
      const reqId = await pendingRequestId(a.id, b.id);
      await Promise.all([
        request(app).post(`/api/friends/requests/${reqId}/accept`).set(authed(b.token)),
        request(app).post('/api/me/blocks').set(authed(a.token)).send({ userId: b.id }),
      ]);
      // The invariant: the block landed AND no live friendship hides behind it.
      const blocks = await request(app).get('/api/me/blocks').set(authed(a.token));
      expect(blocks.body.blocks.map((x: { userId: string }) => x.userId)).toContain(b.id);
      expect(await friendshipCount(a.id, b.id)).toBe(0);
      // Neither party sees the other any more — the friendScoped surfaces are clean both directions.
      expect((await request(app).get(`/api/users/${b.id}`).set(authed(a.token))).status).toBe(404);
      expect((await request(app).get(`/api/users/${a.id}`).set(authed(b.token))).status).toBe(404);
      const roster = await request(app).get('/api/me/friends').set(authed(b.token));
      expect(roster.body.friends).toHaveLength(0);
    }
  });

  it('the canonical one-bond index rejects a reverse-direction duplicate accepted bond', async () => {
    const { getDb } = await import('../../src/db/client');
    const { friendships } = await import('../../src/db/schema');
    const a = await seedUser();
    const b = await seedUser();
    await getDb().insert(friendships).values({ requesterId: a.id, addresseeId: b.id, status: 'accepted' });
    // A reverse-direction accepted bond for the same pair must be rejected (unique_violation).
    await expect(
      getDb().insert(friendships).values({ requesterId: b.id, addresseeId: a.id, status: 'accepted' }),
    ).rejects.toThrow();
    expect(await friendshipCount(a.id, b.id)).toBe(1);
  });
});

describe('MOD-09: social writes are not a suspension/deletion oracle (§4 audit MED/LOW — the collapse)', () => {
  it('POST /friends/requests to a suspended / deleted / unknown target → byte-identical 404s', async () => {
    const actor = await seedUser();
    const suspended = await seedUser();
    await seedSuspension(suspended.id);
    const deleted = await seedUser({ deletedAt: new Date() });
    const unknownId = randomUUID();

    const responses = await Promise.all(
      [suspended.id, deleted.id, unknownId].map((id) =>
        request(app).post('/api/friends/requests').set(authed(actor.token)).send({ toUserId: id }),
      ),
    );
    for (const r of responses) {
      expect(r.status).toBe(404);
      expect(r.body).toEqual(responses[0]!.body); // indistinguishable — no state disclosure
    }
    // No dangling pending row landed against a tombstone.
    expect(await pendingRowCount(actor.id, suspended.id)).toBe(0);
    expect(await pendingRowCount(actor.id, deleted.id)).toBe(0);
  });

  it('POST /me/blocks against a suspended / deleted / unknown target → byte-identical 404s (parity)', async () => {
    const actor = await seedUser();
    const suspended = await seedUser();
    await seedSuspension(suspended.id);
    const deleted = await seedUser({ deletedAt: new Date() });
    const unknownId = randomUUID();

    const responses = await Promise.all(
      [suspended.id, deleted.id, unknownId].map((id) =>
        request(app).post('/api/me/blocks').set(authed(actor.token)).send({ userId: id }),
      ),
    );
    for (const r of responses) {
      expect(r.status).toBe(404);
      expect(r.body).toEqual(responses[0]!.body);
    }
    const blocks = await request(app).get('/api/me/blocks').set(authed(actor.token));
    expect(blocks.body.blocks).toHaveLength(0); // nothing landed
  });
});

describe('SYS-05: the friends:request rate bucket refuses a burst (10/hr seed, tunable)', () => {
  it('over-limit POST /friends/requests → 429 RATE_LIMITED', async () => {
    const { overrideRuleForTest } = await import('../../src/config/rate-limits');
    overrideRuleForTest('friends:request', { limit: 2, windowMs: 60_000 });
    const a = await seedUser();
    const targets = [await seedUser(), await seedUser(), await seedUser()];
    const results = [];
    for (const t of targets) {
      results.push(
        (await request(app).post('/api/friends/requests').set(authed(a.token)).send({ toUserId: t.id })).status,
      );
    }
    expect(results.filter((s) => s === 429).length).toBeGreaterThanOrEqual(1);
  });
});

describe('SYS-07: the new mutating endpoints are authz-guarded (actor-B → 4xx)', () => {
  it('authz:friend_request_decline — an unauthenticated actor-B POST /decline → 401', async () => {
    const a = await seedUser();
    const b = await seedUser();
    await request(app).post('/api/friends/requests').set(authed(a.token)).send({ toUserId: b.id });
    const reqId = await pendingRequestId(a.id, b.id);
    const res = await request(app).post(`/api/friends/requests/${reqId}/decline`);
    expect(res.status).toBe(401);
  });

  it('authz:friend_request_cancel — a non-owner actor-B DELETE /friends/requests/:id → 404 (collapse)', async () => {
    const a = await seedUser();
    const b = await seedUser();
    const actorB = await seedUser();
    await request(app).post('/api/friends/requests').set(authed(a.token)).send({ toUserId: b.id });
    const reqId = await pendingRequestId(a.id, b.id);
    // A third party cannot cancel A's outgoing request (scoped to fromUserId=actor) → collapse 404.
    const res = await request(app).delete(`/api/friends/requests/${reqId}`).set(authed(actorB.token));
    expect(res.status).toBe(404);
    const anon = await request(app).delete(`/api/friends/requests/${reqId}`);
    expect(anon.status).toBe(401);
    expect(await reqStatuses(reqId)).toEqual(['pending']); // untouched by the failed attempts
  });

  it('authz:unfriend — an unauthenticated actor-B DELETE /me/friends/:id → 401', async () => {
    const b = await seedUser();
    const res = await request(app).delete(`/api/me/friends/${b.id}`);
    expect(res.status).toBe(401);
  });
});

describe('decision 0076 §0.12: the worn-premium-shell data reset', () => {
  it('resets an UN-ENTITLED worn premium shell/theme to the free default; an ENTITLED one survives', async () => {
    const { getDb } = await import('../../src/db/client');
    const { deviceConfigs, userEntitlements } = await import('../../src/db/schema');
    const { resetWornUnentitledPremium } = await import('../../src/db/worn-premium-reset');

    const unentitled = await seedUser();
    const entitled = await seedUser();
    const free = await seedUser();
    // Un-entitled: wears premium carbon shell + berry theme with NO entitlement → both reset.
    await getDb().insert(deviceConfigs).values({ userId: unentitled.id, activeShellId: 'carbon', screenThemeId: 'berry' });
    // Entitled: wears premium sunset shell WITH a matching entitlement → survives.
    await getDb().insert(deviceConfigs).values({ userId: entitled.id, activeShellId: 'sunset', screenThemeId: 'midnight' });
    await getDb().insert(userEntitlements).values({ userId: entitled.id, cosmeticId: 'sunset', source: 'purchase' });
    // Free: already free → untouched (idempotent).
    await getDb().insert(deviceConfigs).values({ userId: free.id, activeShellId: 'teal', screenThemeId: 'paper' });

    const result = await resetWornUnentitledPremium(getDb());
    expect(result.shellsReset).toBe(1);
    expect(result.themesReset).toBe(1);

    const rows = await getDb().select().from(deviceConfigs);
    const byUser = Object.fromEntries(rows.map((r) => [r.userId, r]));
    expect(byUser[unentitled.id]).toMatchObject({ activeShellId: 'teal', screenThemeId: 'midnight' });
    expect(byUser[entitled.id]).toMatchObject({ activeShellId: 'sunset', screenThemeId: 'midnight' });
    expect(byUser[free.id]).toMatchObject({ activeShellId: 'teal', screenThemeId: 'paper' });

    // Idempotent: a second run changes nothing.
    const second = await resetWornUnentitledPremium(getDb());
    expect(second.shellsReset).toBe(0);
    expect(second.themesReset).toBe(0);
  });
});
