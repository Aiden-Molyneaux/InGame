import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import { randomUUID } from 'node:crypto';
import { and, eq } from 'drizzle-orm';
import { PostgreSqlContainer, type StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import type { Express } from 'express';

// M6 P3 — find + invite (decision 0076 §0.6/§0.7; SOC-07 fuzzy amendment = C1 owner walk). Covers GET
// /users/search (SOC-07 FUZZY prefix+substring + relationship matrix incl. cooldown + mutual-block
// invisibility), POST /me/invites (SOC-10 mint · TTL ·
// cap-5 create-new-invalidates-oldest · invites:create bucket) and GET /invites/:token (the AUTH-LOOKUP
// bearer read class — INVITE_INVALID/EXPIRED · byte-identical non-disclosure · multi-redeem) + the full
// mint→resolve→request→accept→friends thread + the F36 races. Standing authz tokens covered here
// (actor-B → 4xx): authz:user_search · authz:invite_create · authz:invite_resolve.
// Tags: SOC-07, SOC-08, SOC-09, SOC-10, AUTH-LOOKUP, AUTH-11, MOD-09, SYS-05, SYS-07, F06, F36.

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
async function makeFriends(a: { id: string; token: string }, b: { id: string; token: string }) {
  await request(app).post('/api/friends/requests').set(authed(a.token)).send({ toUserId: b.id });
  const reqId = await pendingRequestId(a.id, b.id);
  await request(app).post(`/api/friends/requests/${reqId}/accept`).set(authed(b.token));
}
async function block(blocker: { token: string }, target: { id: string }) {
  await request(app).post('/api/me/blocks').set(authed(blocker.token)).send({ userId: target.id });
}
/** Mint an invite as `owner`, returning the plaintext token + expiresAt from the response. */
async function mint(owner: { token: string }): Promise<{ token: string; url: string; expiresAt: string }> {
  const res = await request(app).post('/api/me/invites').set(authed(owner.token));
  expect(res.status).toBe(201);
  return res.body;
}
async function activeInviteCount(userId: string): Promise<number> {
  const { getDb } = await import('../../src/db/client');
  const { inviteTokens } = await import('../../src/db/schema');
  const rows = await getDb().select().from(inviteTokens).where(eq(inviteTokens.userId, userId));
  const now = Date.now();
  return rows.filter((r) => !r.revokedAt && r.expiresAt.getTime() > now).length;
}

beforeAll(async () => {
  container = await new PostgreSqlContainer('postgres:16-alpine').start();
  process.env.DATABASE_URL = container.getConnectionUri();
  process.env.DISPOSABLE_DB = '1';
  process.env.JWT_SIGNING_SECRET = 'test-signing-secret-at-least-16-chars-long';
  process.env.INVITE_LINK_BASE = 'https://ingame.test/i';
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
  const { resetRequestCooldownForTest, resetInviteConfigForTest } = await import('../../src/config/social');
  resetRateLimitStore();
  clearRuleOverrides();
  resetRequestCooldownForTest();
  resetInviteConfigForTest();
});

// ── SOC-07 GET /users/search — FUZZY people finder + relationship matrix ────────────────────────────────
describe('SOC-07: GET /users/search — fuzzy people search', () => {
  it('F06: an exact username match returns ONE PersonRow with the exact public key-set', async () => {
    const me = await seedUser();
    const target = await seedUser();
    const res = await request(app)
      .get(`/api/users/search?username=${target.username}`)
      .set(authed(me.token));
    expect(res.status).toBe(200);
    expect(res.body.results).toHaveLength(1);
    // F06 — the PersonRow public allowlist EXACTLY (no bio/email/privacy/hours strays). avatarConfig is
    // public cosmetic data (rides beside avatarUrl — W-4 Monogram Forge), so the forged monogram renders.
    expect(Object.keys(res.body.results[0]).sort()).toEqual(
      ['avatarConfig', 'avatarUrl', 'relationship', 'userId', 'username'].sort(),
    );
    expect(res.body.results[0]).toMatchObject({
      userId: target.id,
      username: target.username,
      relationship: 'none',
    });
  });

  it('SOC-07 C1: FUZZY — prefix, interior-substring, and case-insensitive all hit; a true non-match is empty', async () => {
    const me = await seedUser();
    const target = await seedUser({ username: 'KyraInGame' });
    // a genuinely non-matching handle → empty (no oracle).
    const miss = await request(app).get('/api/users/search?username=nobody_here').set(authed(me.token));
    expect(miss.status).toBe(200);
    expect(miss.body.results).toEqual([]);
    // PREFIX: "Kyra" → "KyraInGame" (the owner-walk headline case).
    const prefix = await request(app).get('/api/users/search?username=Kyra').set(authed(me.token));
    expect(prefix.body.results).toHaveLength(1);
    expect(prefix.body.results[0].userId).toBe(target.id);
    // INTERIOR SUBSTRING: "raInG" → "KyraInGame".
    const substr = await request(app).get('/api/users/search?username=raInG').set(authed(me.token));
    expect(substr.body.results.map((r: { userId: string }) => r.userId)).toContain(target.id);
    // CASE-INSENSITIVE: an all-caps query still hits.
    const ci = await request(app).get('/api/users/search?username=KYRAINGAME').set(authed(me.token));
    expect(ci.body.results).toHaveLength(1);
    expect(ci.body.results[0].userId).toBe(target.id);
  });

  it('SOC-07 C1: prefix matches rank ABOVE interior-substring matches', async () => {
    const me = await seedUser();
    const prefixHit = await seedUser({ username: 'Kyra_Prime' }); // "kyra" is a prefix → normalized "kyra_prime"
    // "kyra" is interior; normalized "aakyraaa" sorts ALPHABETICALLY BEFORE the prefix hit, so a passing
    // test proves the prefix-first reorder (alphabetical order alone would place the interior match first).
    const interiorHit = await seedUser({ username: 'aaKyraaa' });
    const res = await request(app).get('/api/users/search?username=Kyra').set(authed(me.token));
    const ids = res.body.results.map((r: { userId: string }) => r.userId);
    expect(ids).toContain(prefixHit.id);
    expect(ids).toContain(interiorHit.id);
    // the prefix match sorts before the interior-substring match.
    expect(ids.indexOf(prefixHit.id)).toBeLessThan(ids.indexOf(interiorHit.id));
  });

  it('SOC-07: SELF is excluded from search results (no `self` relationship value)', async () => {
    const me = await seedUser();
    const res = await request(app).get(`/api/users/search?username=${me.username}`).set(authed(me.token));
    expect(res.status).toBe(200);
    expect(res.body.results).toEqual([]);
  });

  it('SOC-07/SOC-08: the relationship matrix — outgoing · incoming · friend · cooldown', async () => {
    const me = await seedUser();
    const out = await seedUser();
    const inc = await seedUser();
    const fr = await seedUser();
    const cool = await seedUser();

    // outgoing: me → out
    await request(app).post('/api/friends/requests').set(authed(me.token)).send({ toUserId: out.id });
    // incoming: inc → me
    await request(app).post('/api/friends/requests').set(authed(inc.token)).send({ toUserId: me.id });
    // friend
    await makeFriends(me, fr);
    // cooldown: me → cool, cool DECLINES → me is inside the 7-day re-request cooldown
    await request(app).post('/api/friends/requests').set(authed(me.token)).send({ toUserId: cool.id });
    const declineId = await pendingRequestId(me.id, cool.id);
    await request(app).post(`/api/friends/requests/${declineId}/decline`).set(authed(cool.token));

    const rel = async (u: { username: string }) =>
      (await request(app).get(`/api/users/search?username=${u.username}`).set(authed(me.token))).body
        .results[0];

    expect(await rel(out)).toMatchObject({ relationship: 'outgoing' });
    expect(await rel(inc)).toMatchObject({ relationship: 'incoming' });
    expect(await rel(fr)).toMatchObject({ relationship: 'friend' });
    const coolRow = await rel(cool);
    expect(coolRow.relationship).toBe('cooldown');
    expect(typeof coolRow.cooldownUntil).toBe('string');
    expect(new Date(coolRow.cooldownUntil).getTime()).toBeGreaterThan(Date.now());
  });

  it('SOC-09: a blocked user is INVISIBLE in search — both directions', async () => {
    const me = await seedUser();
    const other = await seedUser();
    // I block them → invisible to me.
    await block(me, other);
    const iSearch = await request(app)
      .get(`/api/users/search?username=${other.username}`)
      .set(authed(me.token));
    expect(iSearch.body.results).toEqual([]);
    // They search ME → also invisible (the block severs BOTH directions).
    const theySearch = await request(app)
      .get(`/api/users/search?username=${me.username}`)
      .set(authed(other.token));
    expect(theySearch.body.results).toEqual([]);
  });

  it('SOC-07: a suspended user is invisible (MOD-09)', async () => {
    const me = await seedUser();
    const target = await seedUser();
    const { getDb } = await import('../../src/db/client');
    const { userSuspensions } = await import('../../src/db/schema');
    await getDb().insert(userSuspensions).values({ subjectId: target.id, reason: 'tos' });
    const res = await request(app).get(`/api/users/search?username=${target.username}`).set(authed(me.token));
    expect(res.body.results).toEqual([]);
  });

  it('SYS-07: search requires auth — actor-b (no session) → 401', async () => {
    const target = await seedUser();
    const actorB = await request(app).get(`/api/users/search?username=${target.username}`); // no bearer
    expect(actorB.status).toBe(401);
  });

  it('SYS-05: users:search over-limit → 429', async () => {
    const me = await seedUser();
    const target = await seedUser();
    const { overrideRuleForTest } = await import('../../src/config/rate-limits');
    overrideRuleForTest('users:search', { limit: 1, windowMs: 60_000 });
    const ok = await request(app).get(`/api/users/search?username=${target.username}`).set(authed(me.token));
    expect(ok.status).toBe(200);
    const limited = await request(app).get(`/api/users/search?username=${target.username}`).set(authed(me.token));
    expect(limited.status).toBe(429);
  });
});

// ── SOC-10 POST /me/invites — mint · TTL · cap-5 rotation ──────────────────────────────────────────────
describe('SOC-10: POST /me/invites — mint an invite token', () => {
  it('mints { token, url, expiresAt } with the TTL ~7 days out and the configured link base', async () => {
    const me = await seedUser();
    const res = await request(app).post('/api/me/invites').set(authed(me.token));
    expect(res.status).toBe(201);
    expect(res.body.token).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(res.body.url).toBe(`https://ingame.test/i/${res.body.token}`);
    const ttlDays = (new Date(res.body.expiresAt).getTime() - Date.now()) / (24 * 60 * 60 * 1000);
    expect(ttlDays).toBeGreaterThan(6.9);
    expect(ttlDays).toBeLessThan(7.1);
    expect(await activeInviteCount(me.id)).toBe(1);
    // the plaintext token is NEVER stored — only its hash.
    const { getDb } = await import('../../src/db/client');
    const { inviteTokens } = await import('../../src/db/schema');
    const rows = await getDb().select().from(inviteTokens).where(eq(inviteTokens.userId, me.id));
    expect(rows[0]!.tokenHash).not.toBe(res.body.token);
    expect((rows as unknown[]).some((r) => JSON.stringify(r).includes(res.body.token))).toBe(false);
    // emits invite.created carrying the invite id ONLY (never the token/hash).
    const { domainEvents } = await import('../../src/db/schema');
    const evs = await getDb().select().from(domainEvents).where(eq(domainEvents.eventType, 'invite.created'));
    expect(evs).toHaveLength(1);
    expect(JSON.stringify(evs[0]!.payload)).not.toContain(res.body.token);
  });

  it('SOC-10: cap — a 4th mint at cap-3 revokes the OLDEST (create-new-invalidates-oldest)', async () => {
    const me = await seedUser();
    const { setInviteMaxActiveForTest } = await import('../../src/config/social');
    setInviteMaxActiveForTest(3);
    const t1 = await mint(me);
    await new Promise((r) => setTimeout(r, 5)); // distinct createdAt ordering
    await mint(me);
    await new Promise((r) => setTimeout(r, 5));
    await mint(me);
    expect(await activeInviteCount(me.id)).toBe(3);
    await new Promise((r) => setTimeout(r, 5));
    await mint(me); // the 4th → the oldest (t1) is revoked
    expect(await activeInviteCount(me.id)).toBe(3);
    // the oldest token now resolves as INVALID (revoked ≡ unknown).
    const dead = await request(app).get(`/api/invites/${t1.token}`);
    expect(dead.status).toBe(409);
    expect(dead.body.error.code).toBe('INVITE_INVALID');
  });

  it('SYS-07: mint requires auth — actor-b (no session) → 401', async () => {
    const actorB = await request(app).post('/api/me/invites'); // no bearer
    expect(actorB.status).toBe(401);
  });

  it('SYS-05: invites:create over-limit → 429', async () => {
    const me = await seedUser();
    const { overrideRuleForTest } = await import('../../src/config/rate-limits');
    overrideRuleForTest('invites:create', { limit: 1, windowMs: 24 * 60 * 60_000 });
    const ok = await request(app).post('/api/me/invites').set(authed(me.token));
    expect(ok.status).toBe(201);
    const limited = await request(app).post('/api/me/invites').set(authed(me.token));
    expect(limited.status).toBe(429);
  });
});

// ── SOC-10 GET /invites/:token — the AUTH-LOOKUP resolve ───────────────────────────────────────────────
describe('SOC-10 / AUTH-LOOKUP: GET /invites/:token — resolve', () => {
  it('resolves a valid token unauthenticated → sender summary + relationship none + prefilled request', async () => {
    const sender = await seedUser();
    const { token } = await mint(sender);
    const res = await request(app).get(`/api/invites/${token}`); // NO auth — a fresh install
    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      token,
      sender: { userId: sender.id, username: sender.username, avatarUrl: null, avatarConfig: null },
      relationship: 'none',
      prefilledRequest: { toUserId: sender.id },
    });
  });

  // PROF-08 (W-4 Monogram Forge) — avatarConfig rides beside avatarUrl on the resolved sender summary
  // even for an UNAUTHENTICATED resolve (a stranger opening the link): it's a public-safe cosmetic, no
  // gate needed. Walk-4 takeover review found this shape had never picked it up.
  it('PROF-08: a sender with a forged avatarConfig carries it on the resolve, even unauthenticated', async () => {
    const cfg = { bg: '#2a1f4d', ink: '#e8c14a', glyph: 'HM', frame: 'ring' as const };
    const sender = await seedUser({ avatarConfig: cfg });
    const { token } = await mint(sender);
    const res = await request(app).get(`/api/invites/${token}`);
    expect(res.status).toBe(200);
    expect(res.body.sender.avatarConfig).toEqual(cfg);
  });

  it('an AUTHENTICATED already-friend resolve carries relationship friend (not a duplicate ADD)', async () => {
    const sender = await seedUser();
    const viewer = await seedUser();
    await makeFriends(sender, viewer);
    const { token } = await mint(sender);
    const res = await request(app).get(`/api/invites/${token}`).set(authed(viewer.token));
    expect(res.status).toBe(200);
    expect(res.body.relationship).toBe('friend');
  });

  it('AUTH-LOOKUP forge: a well-formed but never-minted token → 409 INVITE_INVALID', async () => {
    const { generateOpaqueToken } = await import('../../src/auth/tokens');
    const forged = generateOpaqueToken(32).token; // valid shape, wrong random → no stored hash
    const res = await request(app).get(`/api/invites/${forged}`);
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('INVITE_INVALID');
  });

  it('a MALFORMED token (bad charset/length) collapses to INVITE_INVALID — never a 422', async () => {
    const bad = await request(app).get('/api/invites/short%20bad');
    expect(bad.status).toBe(409);
    expect(bad.body.error.code).toBe('INVITE_INVALID');
  });

  it('INVITE_EXPIRED: a token past its TTL resolves EXPIRED (distinguishable — no forgery risk)', async () => {
    const sender = await seedUser();
    const { token } = await mint(sender);
    const { getDb } = await import('../../src/db/client');
    const { inviteTokens } = await import('../../src/db/schema');
    await getDb()
      .update(inviteTokens)
      .set({ expiresAt: new Date(Date.now() - 60_000) })
      .where(eq(inviteTokens.userId, sender.id));
    const res = await request(app).get(`/api/invites/${token}`);
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('INVITE_EXPIRED');
  });

  it('MOD-09: revoked ≡ unknown — the two 409 bodies are BYTE-IDENTICAL (no oracle)', async () => {
    const sender = await seedUser();
    const { setInviteMaxActiveForTest } = await import('../../src/config/social');
    setInviteMaxActiveForTest(1);
    const t1 = await mint(sender);
    await new Promise((r) => setTimeout(r, 5));
    await mint(sender); // revokes t1
    const revoked = await request(app).get(`/api/invites/${t1.token}`);
    const { generateOpaqueToken } = await import('../../src/auth/tokens');
    const unknown = await request(app).get(`/api/invites/${generateOpaqueToken(32).token}`);
    expect(revoked.status).toBe(409);
    expect(unknown.status).toBe(409);
    expect(revoked.body).toEqual(unknown.body); // byte-identical
    expect(revoked.body.error.code).toBe('INVITE_INVALID');
  });

  it('SOC-09/MOD-09: a blocked-either-direction resolve ≡ INVITE_INVALID — BYTE-IDENTICAL (block never revealed)', async () => {
    const sender = await seedUser();
    const viewer = await seedUser();
    const { token } = await mint(sender);
    // sender blocks the viewer → the viewer's authed resolve must collapse (never reveal the block).
    await block(sender, viewer);
    const blocked = await request(app).get(`/api/invites/${token}`).set(authed(viewer.token));
    const { generateOpaqueToken } = await import('../../src/auth/tokens');
    const unknown = await request(app).get(`/api/invites/${generateOpaqueToken(32).token}`).set(authed(viewer.token));
    expect(blocked.status).toBe(409);
    expect(blocked.body).toEqual(unknown.body); // byte-identical — no block oracle
    expect(blocked.body.error.code).toBe('INVITE_INVALID');
    // the SAME token still resolves fine for an UNRELATED viewer (the block is per-viewer, not the token).
    const other = await seedUser();
    const ok = await request(app).get(`/api/invites/${token}`).set(authed(other.token));
    expect(ok.status).toBe(200);
  });

  it('SYS-07 authz:invite_resolve — a forged token as actor-b → 4xx (409)', async () => {
    // The resolve is bearer-scoped; the actor-B guard is a wrong credential (forged token), not a session.
    const { generateOpaqueToken } = await import('../../src/auth/tokens');
    const actorB = await request(app).get(`/api/invites/${generateOpaqueToken(32).token}`);
    expect(actorB.status).toBe(409);
    expect(actorB.body.error.code).toBe('INVITE_INVALID');
  });

  it('SYS-05: invites:resolve over-limit → 429', async () => {
    const sender = await seedUser();
    const { token } = await mint(sender);
    const { overrideRuleForTest } = await import('../../src/config/rate-limits');
    overrideRuleForTest('invites:resolve', { limit: 1, windowMs: 60_000 });
    const ok = await request(app).get(`/api/invites/${token}`);
    expect(ok.status).toBe(200);
    const limited = await request(app).get(`/api/invites/${token}`);
    expect(limited.status).toBe(429);
  });
});

// ── F36 races + the full redemption thread ────────────────────────────────────────────────────────────
describe('F36: invite races + the redemption thread', () => {
  it('multi-redeem: the SAME token resolved N ways in PARALLEL stays valid (a READ — never consumed)', async () => {
    const sender = await seedUser();
    const { token } = await mint(sender);
    const results = await Promise.all(
      Array.from({ length: 8 }, () => request(app).get(`/api/invites/${token}`)),
    );
    for (const r of results) {
      expect(r.status).toBe(200);
      expect(r.body.prefilledRequest.toUserId).toBe(sender.id);
    }
    // still resolvable AND still active afterwards — no consumption.
    const again = await request(app).get(`/api/invites/${token}`);
    expect(again.status).toBe(200);
    expect(await activeInviteCount(sender.id)).toBe(1);
  });

  it('cap under PARALLEL creates never exceeds the cap (the advisory-lock guard)', async () => {
    const me = await seedUser();
    const { setInviteMaxActiveForTest } = await import('../../src/config/social');
    const { overrideRuleForTest } = await import('../../src/config/rate-limits');
    setInviteMaxActiveForTest(5);
    overrideRuleForTest('invites:create', { limit: 100, windowMs: 60_000 }); // isolate the cap, not the bucket
    const created = await Promise.all(
      Array.from({ length: 12 }, () => request(app).post('/api/me/invites').set(authed(me.token))),
    );
    for (const r of created) expect(r.status).toBe(201);
    expect(await activeInviteCount(me.id)).toBe(5); // ≤5 held despite 12 parallel mints
  });

  it('the full thread: mint → resolve (fresh principal) → request → accept → friends', async () => {
    const sender = await seedUser();
    const newcomer = await seedUser(); // a fresh principal who received the link
    const { token } = await mint(sender);

    // resolve as the fresh principal → the one-tap prefilled ADD target is the sender.
    const resolved = await request(app).get(`/api/invites/${token}`).set(authed(newcomer.token));
    expect(resolved.status).toBe(200);
    expect(resolved.body.relationship).toBe('none');
    const toUserId = resolved.body.prefilledRequest.toUserId;
    expect(toUserId).toBe(sender.id);

    // redemption is the NORMAL friend-request write (P1's rules apply).
    const reqRes = await request(app).post('/api/friends/requests').set(authed(newcomer.token)).send({ toUserId });
    expect(reqRes.status).toBe(201);
    const reqId = await pendingRequestId(newcomer.id, sender.id);
    const acc = await request(app).post(`/api/friends/requests/${reqId}/accept`).set(authed(sender.token));
    expect(acc.status).toBe(200);

    // now friends — and a re-resolve of the SAME token reflects the friendship (not a duplicate ADD).
    const friends = await request(app).get('/api/me/friends').set(authed(sender.token));
    expect(friends.body.friends.map((f: { userId: string }) => f.userId)).toContain(newcomer.id);
    const reResolve = await request(app).get(`/api/invites/${token}`).set(authed(newcomer.token));
    expect(reResolve.body.relationship).toBe('friend');
  });
});
