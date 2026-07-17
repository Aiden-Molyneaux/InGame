import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import { randomUUID } from 'node:crypto';
import { and, eq } from 'drizzle-orm';
import { PostgreSqlContainer, type StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import type { Express } from 'express';
import { COMPOSITION_SCHEMA_VERSION } from '@ingame/shared';

// M6 P4 — recommendations (SOC-05) + the aggregated activity feed (SOC-06) over the ACH-08 domain-event
// spine. Rec lifecycle (send → inbox → dismiss → re-send) · NOT_FRIENDS/SELF_TARGET/blocked refusals ·
// note-length 422 · bucket 429 · feed aggregation windows · import-flood suppression · trivia exclusion ·
// beat/completed derivation · achievement-unlock fixture · block bidirectional absence · F06 exact
// key-sets · cursor stability · SYS-07 on the mutating endpoints. The feed source read rides the
// SYS-01-FRIEND-READ class (feed-repo). Standing authz tokens (actor-B → 4xx): authz:recommendation_create
// · authz:recommendation_dismiss.
// Tags: SOC-05, SOC-06, SOC-09, MOD-09, OQ-071, F06, F36, SYS-05, SYS-07.

let container: StartedPostgreSqlContainer;
let app: Express;

function authed(token: string) {
  return { Authorization: `Bearer ${token}` };
}
async function seedUser(over: Record<string, unknown> = {}) {
  const { getDb } = await import('../../src/db/client');
  const { users } = await import('../../src/db/schema');
  const { signAccessToken } = await import('../../src/auth/tokens');
  const id = randomUUID();
  const username = `user_${id.slice(0, 8)}`;
  await getDb()
    .insert(users)
    .values({ id, username, email: `${username}@example.com`, bio: 'bio', ...over });
  return { id, username, token: await signAccessToken(id) };
}
/** A direct accepted friendship (faster than the request flow; the lifecycle is P1's suite). */
async function befriend(aId: string, bId: string) {
  const { getDb } = await import('../../src/db/client');
  const { friendships } = await import('../../src/db/schema');
  await getDb().insert(friendships).values({ requesterId: aId, addresseeId: bId, status: 'accepted' });
}
async function seedGame(token: string, name: string): Promise<string> {
  const { getDb } = await import('../../src/db/client');
  const { genres } = await import('../../src/db/schema');
  const g = await getDb().select().from(genres).limit(1);
  const res = await request(app).post('/api/catalog/games').set(authed(token)).send({ name, genreIds: [g[0]!.id] });
  if (res.status !== 201) throw new Error(`seedGame failed: ${res.status} ${JSON.stringify(res.body)}`);
  return res.body.id as string;
}
async function insertEvent(
  actorId: string,
  eventType: string,
  payload: Record<string, unknown>,
  occurredAt: Date,
  entityId = randomUUID(),
) {
  const { getDb } = await import('../../src/db/client');
  const { domainEvents } = await import('../../src/db/schema');
  await getDb().insert(domainEvents).values({
    eventType,
    eventVersion: 1,
    occurredAt,
    actorId,
    entityType: 'x',
    entityId,
    payload,
  });
}
async function eventsFor(actorId: string, eventType: string) {
  const { getDb } = await import('../../src/db/client');
  const { domainEvents } = await import('../../src/db/schema');
  return getDb()
    .select()
    .from(domainEvents)
    .where(and(eq(domainEvents.actorId, actorId), eq(domainEvents.eventType, eventType)));
}
function comp(seed: number) {
  return {
    schemaVersion: COMPOSITION_SCHEMA_VERSION,
    base: { gradient: ['#241a4d', '#0e0b1e'] },
    elements: [
      { type: 'rect', x: 0.5, y: 0.2 + seed * 0.01, w: 0.4, h: 0.05, fill: '#e8c14a' },
      { type: 'rect', x: 0.5, y: 0.4 + seed * 0.01, w: 0.4, h: 0.05, fill: '#7ad0e8' },
      { type: 'rect', x: 0.5, y: 0.6 + seed * 0.01, w: 0.4, h: 0.05, fill: '#a8c980' },
    ],
    frame: { kind: 'thin-line', color: '#a9e34b', width: 0.04 },
    effect: { kind: 'soft-glow', intensity: 0.5 },
    finish: { kind: 'matte' },
    nameplate: { shape: 'slab', fontId: 'clean-sans', title: 'X', plate: '#141026', ink: '#f3ecd9', size: 0.05 },
  };
}
async function publishCard(token: string, gameId: string, seed: number): Promise<string> {
  const draft = await request(app).post('/api/cards').set(authed(token)).send({ gameId, composition: comp(seed) });
  const cardId = draft.body.id as string;
  const pub = await request(app).post(`/api/cards/${cardId}/publish`).set(authed(token));
  if (pub.status !== 200) throw new Error(`publish failed: ${pub.status} ${JSON.stringify(pub.body)}`);
  return cardId;
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
});
afterEach(async () => {
  const { resetFeedWindowForTest } = await import('../../src/config/social');
  const { clearRuleOverrides } = await import('../../src/config/rate-limits');
  resetFeedWindowForTest();
  clearRuleOverrides();
});

const REC_ITEM_KEYS = ['recId', 'game', 'fromUser', 'note', 'createdAt'].sort();
const FEED_ITEM_KEYS = ['feedItemId', 'actor', 'type', 'aggregateCount', 'objects', 'occurredAt', 'windowStart', 'windowEnd'].sort();

// ── SOC-05 recommendation lifecycle + refusals ────────────────────────────────────────────────────────
describe('SOC-05: recommendation lifecycle (send → inbox → dismiss → re-send)', () => {
  it('a friend recommends a game → it lands in the recipient inbox (F06 exact keys) → dismiss → re-send allowed', async () => {
    const a = await seedUser();
    const b = await seedUser();
    await befriend(a.id, b.id);
    const game = await seedGame(a.token, 'Rec RPG');

    const send = await request(app)
      .post('/api/recommendations')
      .set(authed(a.token))
      .send({ toUserId: b.id, gameId: game, note: 'you must play this' });
    expect(send.status).toBe(201);

    const inbox = await request(app).get('/api/me/recommendations').set(authed(b.token));
    expect(inbox.status).toBe(200);
    expect(inbox.body.recommendations).toHaveLength(1);
    const item = inbox.body.recommendations[0];
    expect(Object.keys(item).sort()).toEqual(REC_ITEM_KEYS);
    expect(item.game.id).toBe(game);
    expect(item.game.title).toBe('Rec RPG');
    expect(Object.keys(item.game).sort()).toEqual(['card', 'id', 'title']);
    expect(item.fromUser).toEqual({ userId: a.id, username: a.username });
    expect(item.note).toBe('you must play this');

    // Dismiss → inbox empties (soft).
    const dismiss = await request(app).delete(`/api/me/recommendations/${item.recId}`).set(authed(b.token));
    expect(dismiss.status).toBe(200);
    const afterDismiss = await request(app).get('/api/me/recommendations').set(authed(b.token));
    expect(afterDismiss.body.recommendations).toHaveLength(1 - 1);

    // Re-send the SAME game after dismiss → allowed (a fresh live row; P4 design #1).
    const resend = await request(app).post('/api/recommendations').set(authed(a.token)).send({ toUserId: b.id, gameId: game });
    expect(resend.status).toBe(201);
    const afterResend = await request(app).get('/api/me/recommendations').set(authed(b.token));
    expect(afterResend.body.recommendations).toHaveLength(1);
    expect(afterResend.body.recommendations[0].note).toBeNull();
  });

  it('a duplicate LIVE recommendation is an idempotent no-op (no stacking)', async () => {
    const a = await seedUser();
    const b = await seedUser();
    await befriend(a.id, b.id);
    const game = await seedGame(a.token, 'Dup RPG');
    await request(app).post('/api/recommendations').set(authed(a.token)).send({ toUserId: b.id, gameId: game });
    await request(app).post('/api/recommendations').set(authed(a.token)).send({ toUserId: b.id, gameId: game });
    const inbox = await request(app).get('/api/me/recommendations').set(authed(b.token));
    expect(inbox.body.recommendations).toHaveLength(1);
    // Exactly ONE recommendation.sent event (the second POST no-ops without re-emitting).
    expect(await eventsFor(a.id, 'recommendation.sent')).toHaveLength(1);
  });
});

describe('SOC-05/SOC-09/MOD-09: recommendation refusals', () => {
  it('recommending to a NON-friend (visible) → 409 NOT_FRIENDS', async () => {
    const a = await seedUser();
    const c = await seedUser();
    const game = await seedGame(a.token, 'Stranger RPG');
    const res = await request(app).post('/api/recommendations').set(authed(a.token)).send({ toUserId: c.id, gameId: game });
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('NOT_FRIENDS');
  });

  it('recommending to YOURSELF → 409 SELF_TARGET', async () => {
    const a = await seedUser();
    const game = await seedGame(a.token, 'Self RPG');
    const res = await request(app).post('/api/recommendations').set(authed(a.token)).send({ toUserId: a.id, gameId: game });
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('SELF_TARGET');
  });

  it('recommending to a BLOCKED user (either direction) → generic 404 (MOD-09 collapse, NOT NOT_FRIENDS)', async () => {
    const a = await seedUser();
    const b = await seedUser();
    await befriend(a.id, b.id);
    const game = await seedGame(a.token, 'Blocked RPG');
    await request(app).post('/api/me/blocks').set(authed(a.token)).send({ userId: b.id }); // A blocks B (severs friendship)

    const aToB = await request(app).post('/api/recommendations').set(authed(a.token)).send({ toUserId: b.id, gameId: game });
    expect(aToB.status).toBe(404);
    expect(aToB.body.error.code).toBe('NOT_FOUND'); // never NOT_FRIENDS — no oracle
    // The OTHER direction (B → A) is equally collapsed.
    const bToA = await request(app).post('/api/recommendations').set(authed(b.token)).send({ toUserId: a.id, gameId: game });
    expect(bToA.status).toBe(404);
    expect(bToA.body.error.code).toBe('NOT_FOUND');
  });

  it('an unknown game → 422; a note over the length cap → 422', async () => {
    const a = await seedUser();
    const b = await seedUser();
    await befriend(a.id, b.id);
    const game = await seedGame(a.token, 'Len RPG');

    const unknownGame = await request(app).post('/api/recommendations').set(authed(a.token)).send({ toUserId: b.id, gameId: randomUUID() });
    expect(unknownGame.status).toBe(422);

    const longNote = 'x'.repeat(501);
    const overLen = await request(app).post('/api/recommendations').set(authed(a.token)).send({ toUserId: b.id, gameId: game, note: longNote });
    expect(overLen.status).toBe(422);
  });

  it('SYS-05: recommendations:create over-limit → 429', async () => {
    const a = await seedUser();
    const b = await seedUser();
    const c = await seedUser();
    await befriend(a.id, b.id);
    await befriend(a.id, c.id);
    const game = await seedGame(a.token, 'Bucket RPG');
    const { overrideRuleForTest } = await import('../../src/config/rate-limits');
    overrideRuleForTest('recommendations:create', { limit: 1, windowMs: 24 * 60 * 60_000 });
    const first = await request(app).post('/api/recommendations').set(authed(a.token)).send({ toUserId: b.id, gameId: game });
    expect(first.status).toBe(201);
    const limited = await request(app).post('/api/recommendations').set(authed(a.token)).send({ toUserId: c.id, gameId: game });
    expect(limited.status).toBe(429);
  });

  it('SOC-09: the rec inbox EXCLUDES a blocked sender (a historical rec persists but is filtered)', async () => {
    const a = await seedUser();
    const b = await seedUser();
    await befriend(a.id, b.id);
    const game = await seedGame(a.token, 'History RPG');
    await request(app).post('/api/recommendations').set(authed(a.token)).send({ toUserId: b.id, gameId: game });
    // Now A blocks B — the friendship severs, the rec row persists, but B's inbox filters the sender A.
    await request(app).post('/api/me/blocks').set(authed(a.token)).send({ userId: b.id });
    const inbox = await request(app).get('/api/me/recommendations').set(authed(b.token));
    expect(inbox.body.recommendations).toHaveLength(0);
  });
});

// ── SOC-06 aggregated feed ──────────────────────────────────────────────────────────────────────────
describe('SOC-06 / OQ-071: the aggregated activity feed', () => {
  it('F06: a feed item carries EXACTLY the enumerated key-set', async () => {
    const v = await seedUser();
    const f = await seedUser();
    await befriend(v.id, f.id);
    const game = await seedGame(v.token, 'Feed RPG');
    await insertEvent(f.id, 'collection.entry_added', { gameId: game }, new Date());
    const feed = await request(app).get('/api/me/feed').set(authed(v.token));
    expect(feed.status).toBe(200);
    expect(feed.body.items).toHaveLength(1);
    expect(Object.keys(feed.body.items[0]).sort()).toEqual(FEED_ITEM_KEYS);
    expect(Object.keys(feed.body.items[0].actor).sort()).toEqual(['avatarUrl', 'userId', 'username']);
  });

  it('import-flood suppression: 100 entry_added in one window → ONE item, aggregateCount 100, ≤3 peeks', async () => {
    const v = await seedUser();
    const f = await seedUser();
    await befriend(v.id, f.id);
    const now = new Date();
    const distinctNames = ['Marathon Zero', 'Destiny Prime', 'Elden Vale', 'Hades Reborn', 'Stardew Shores'];
    const games: string[] = [];
    for (const name of distinctNames) games.push(await seedGame(v.token, name));
    for (let i = 0; i < 100; i++) {
      await insertEvent(f.id, 'collection.entry_added', { gameId: games[i % games.length] }, now);
    }
    const feed = await request(app).get('/api/me/feed').set(authed(v.token));
    expect(feed.body.items).toHaveLength(1);
    expect(feed.body.items[0].type).toBe('added_games');
    expect(feed.body.items[0].aggregateCount).toBe(100);
    expect(feed.body.items[0].objects.length).toBeLessThanOrEqual(3);
    expect(feed.body.items[0].objects[0].title).toBeDefined();
  });

  it('trivia exclusion: an entry_updated with only stat fields (no status flip) NEVER feeds', async () => {
    const v = await seedUser();
    const f = await seedUser();
    await befriend(v.id, f.id);
    const game = await seedGame(v.token, 'Trivia RPG');
    // A stat-only edit — the widened payload carries NO `status` (hours changed only).
    await insertEvent(f.id, 'collection.entry_updated', { fields: ['hours'], gameId: game }, new Date());
    const feed = await request(app).get('/api/me/feed').set(authed(v.token));
    expect(feed.body.items).toHaveLength(0);
  });

  it('aggregation: two actors × two types → 4 items; same actor+type same window → 1', async () => {
    const v = await seedUser();
    const f1 = await seedUser();
    const f2 = await seedUser();
    await befriend(v.id, f1.id);
    await befriend(v.id, f2.id);
    const game = await seedGame(v.token, 'Agg RPG');
    const { setFeedWindowMsForTest } = await import('../../src/config/social');
    setFeedWindowMsForTest(1000); // 1s windows for tight control
    const t = new Date(2_000_000_000_000); // fixed instant, single 1s bucket
    // f1: two added (same actor+type+window → collapses to 1) + one beat.
    await insertEvent(f1.id, 'collection.entry_added', { gameId: game }, t);
    await insertEvent(f1.id, 'collection.entry_added', { gameId: game }, new Date(t.getTime() + 100));
    await insertEvent(f1.id, 'collection.entry_updated', { fields: ['status'], gameId: game, status: 'beaten' }, t);
    // f2: one added + one completed.
    await insertEvent(f2.id, 'collection.entry_added', { gameId: game }, t);
    await insertEvent(f2.id, 'collection.entry_updated', { fields: ['status'], gameId: game, status: 'completed' }, t);

    const feed = await request(app).get('/api/me/feed').set(authed(v.token));
    // f1 added(1, count 2) · f1 beat_game(1) · f2 added(1) · f2 completed_game(1) = 4 items.
    expect(feed.body.items).toHaveLength(4);
    const f1Added = feed.body.items.find((i: { actor: { userId: string }; type: string }) => i.actor.userId === f1.id && i.type === 'added_games');
    expect(f1Added.aggregateCount).toBe(2);
    expect(feed.body.items.some((i: { type: string }) => i.type === 'beat_game')).toBe(true);
    expect(feed.body.items.some((i: { type: string }) => i.type === 'completed_game')).toBe(true);
  });

  it('beat/completed derivation off REAL collection status flips (the widened entry_updated payload)', async () => {
    const v = await seedUser();
    const f = await seedUser();
    await befriend(v.id, f.id);
    const game = await seedGame(f.token, 'Real RPG');
    const add = await request(app).post('/api/me/collection').set(authed(f.token)).send({ gameId: game });
    const entryId = add.body.entryId as string;
    await request(app).patch(`/api/me/collection/${entryId}`).set(authed(f.token)).send({ status: 'beaten' });
    const feedBeat = await request(app).get('/api/me/feed').set(authed(v.token));
    expect(feedBeat.body.items.some((i: { type: string }) => i.type === 'beat_game')).toBe(true);

    await request(app).patch(`/api/me/collection/${entryId}`).set(authed(f.token)).send({ status: 'completed' });
    const feedDone = await request(app).get('/api/me/feed').set(authed(v.token));
    expect(feedDone.body.items.some((i: { type: string }) => i.type === 'completed_game')).toBe(true);
  });

  it('published_card items resolve the flattened card peek (never composition)', async () => {
    const v = await seedUser();
    const f = await seedUser();
    await befriend(v.id, f.id);
    const game = await seedGame(f.token, 'Publish RPG');
    await publishCard(f.token, game, 3);
    const feed = await request(app).get('/api/me/feed').set(authed(v.token));
    const pub = feed.body.items.find((i: { type: string }) => i.type === 'published_card');
    expect(pub).toBeDefined();
    expect(pub.objects[0].card).toBeDefined();
    expect(pub.objects[0].gameId).toBe(game);
    expect('composition' in pub.objects[0].card).toBe(false);
  });

  it('achievement.unlocked renders (the mapping is ready before P6 emits — a fixture proves it)', async () => {
    const v = await seedUser();
    const f = await seedUser();
    await befriend(v.id, f.id);
    const achId = randomUUID();
    await insertEvent(f.id, 'achievement.unlocked', { label: 'First Blood' }, new Date(), achId);
    const feed = await request(app).get('/api/me/feed').set(authed(v.token));
    const ach = feed.body.items.find((i: { type: string }) => i.type === 'unlocked_achievement');
    expect(ach).toBeDefined();
    expect(ach.objects[0].achievementId).toBe(achId);
    expect(ach.objects[0].label).toBe('First Blood');
  });

  it('SOC-09: a blocked actor’s events are ABSENT in BOTH directions', async () => {
    const v = await seedUser();
    const f = await seedUser();
    await befriend(v.id, f.id);
    const game = await seedGame(v.token, 'Block Feed RPG');
    await insertEvent(f.id, 'collection.entry_added', { gameId: game }, new Date());
    // Sanity: the event is visible before the block.
    const before = await request(app).get('/api/me/feed').set(authed(v.token));
    expect(before.body.items).toHaveLength(1);
    // V blocks F → the friendship severs → the event drops from V's feed AND F's feed of V.
    await request(app).post('/api/me/blocks').set(authed(v.token)).send({ userId: f.id });
    const vFeed = await request(app).get('/api/me/feed').set(authed(v.token));
    expect(vFeed.body.items).toHaveLength(0);
    await insertEvent(v.id, 'collection.entry_added', { gameId: game }, new Date());
    const fFeed = await request(app).get('/api/me/feed').set(authed(f.token));
    expect(fFeed.body.items).toHaveLength(0);
  });

  it('cursor pagination is stable under a concurrent insert (no dupes, no skips)', async () => {
    const v = await seedUser();
    const f = await seedUser();
    await befriend(v.id, f.id);
    const game = await seedGame(v.token, 'Cursor RPG');
    const { setFeedWindowMsForTest } = await import('../../src/config/social');
    setFeedWindowMsForTest(1000); // 1s windows → each event its own bucket → many distinct items
    // 25 added_games items in DISTINCT windows (one per 1s bucket) — > one page (20).
    const base = 1_000_000_000_000;
    for (let i = 0; i < 25; i++) {
      await insertEvent(f.id, 'collection.entry_added', { gameId: game }, new Date(base + i * 1000));
    }
    const page1 = await request(app).get('/api/me/feed').set(authed(v.token));
    expect(page1.body.items).toHaveLength(20);
    expect(page1.body.nextCursor).not.toBeNull();
    const page1Ids = new Set(page1.body.items.map((i: { feedItemId: string }) => i.feedItemId));

    // Concurrent insert mid-pagination: a NEW event in an OLD window (already-seen) — must not dupe.
    await insertEvent(f.id, 'collection.entry_added', { gameId: game }, new Date(base + 24 * 1000));
    // And a brand-new NEWER window (would sort onto page 1) — must not appear on page 2 (no skip of tail).
    await insertEvent(f.id, 'collection.entry_added', { gameId: game }, new Date(base + 100 * 1000));

    const page2 = await request(app).get('/api/me/feed').set(authed(v.token)).query({ cursor: page1.body.nextCursor });
    for (const item of page2.body.items) {
      expect(page1Ids.has(item.feedItemId)).toBe(false); // no dupes
    }
    // The original 25 windows minus the 20 on page 1 = 5 remaining on page 2.
    expect(page2.body.items).toHaveLength(5);
  });
});

// ── the F-19 walk fix: game-type peeks carry the actor's DISPLAYED card ──────────────────────────────
describe('SOC-06 (F-19 walk fix): feed game peeks resolve the actor’s DISPLAYED card (own OR adopted)', () => {
  it('an ADOPTED-equipped entry → the added_games peek carries the adopted card’s imageUrl (the bug path)', async () => {
    const v = await seedUser();
    const f = await seedUser();
    const designer = await seedUser();
    await befriend(v.id, f.id);
    const game = await seedGame(designer.token, 'Adopted Peek RPG');
    const cardId = await publishCard(designer.token, game, 5);
    // F adds the game (the REAL entry_added event), adopts the designer's card, equips it.
    const add = await request(app).post('/api/me/collection').set(authed(f.token)).send({ gameId: game });
    const entryId = add.body.entryId as string;
    const adopt = await request(app).post(`/api/cards/${cardId}/adopt`).set(authed(f.token));
    expect(adopt.status).toBe(200);
    const equip = await request(app).patch(`/api/me/collection/${entryId}`).set(authed(f.token)).send({ activeCardDesignId: cardId });
    expect(equip.status).toBe(200);

    const feed = await request(app).get('/api/me/feed').set(authed(v.token));
    const added = feed.body.items.find((i: { type: string }) => i.type === 'added_games');
    expect(added).toBeDefined();
    expect(added.objects[0].card).toBeDefined();
    expect(added.objects[0].card.id).toBe(cardId);
    expect(added.objects[0].card.imageUrl).toBeTruthy(); // the F-19 bug path: was undefined → client default
    expect('composition' in added.objects[0].card).toBe(false); // OQ-122 — flattened only
  });

  it('an OWN-equipped published card → the peek carries its flattened imageUrl (never composition)', async () => {
    const v = await seedUser();
    const f = await seedUser();
    await befriend(v.id, f.id);
    const game = await seedGame(f.token, 'Own Peek RPG');
    const cardId = await publishCard(f.token, game, 6);
    const add = await request(app).post('/api/me/collection').set(authed(f.token)).send({ gameId: game });
    const equip = await request(app).patch(`/api/me/collection/${add.body.entryId}`).set(authed(f.token)).send({ activeCardDesignId: cardId });
    expect(equip.status).toBe(200);

    const feed = await request(app).get('/api/me/feed').set(authed(v.token));
    const added = feed.body.items.find((i: { type: string }) => i.type === 'added_games');
    expect(added.objects[0].card).toBeDefined();
    expect(added.objects[0].card.id).toBe(cardId);
    expect(added.objects[0].card.imageUrl).toBeTruthy();
    expect('composition' in added.objects[0].card).toBe(false);
  });

  it('no equipped card + no published cards for the game → the peek carries NO card (client default stub)', async () => {
    const v = await seedUser();
    const f = await seedUser();
    await befriend(v.id, f.id);
    const game = await seedGame(f.token, 'Bare Peek RPG');
    await request(app).post('/api/me/collection').set(authed(f.token)).send({ gameId: game });

    const feed = await request(app).get('/api/me/feed').set(authed(v.token));
    const added = feed.body.items.find((i: { type: string }) => i.type === 'added_games');
    expect(added).toBeDefined();
    expect(added.objects[0].card).toBeUndefined(); // truly nothing → default only then
    expect(added.objects[0].title).toBe('Bare Peek RPG');
  });
});

// ── the widened collection.entry_updated payload (P4 design #4) ───────────────────────────────────────
describe('SOC-06 (P4 design #4): collection.entry_updated carries {status} ONLY on a status flip', () => {
  it('a status change emits status + gameId; a stat-only change emits neither', async () => {
    const u = await seedUser();
    const game = await seedGame(u.token, 'Payload RPG');
    const add = await request(app).post('/api/me/collection').set(authed(u.token)).send({ gameId: game });
    const entryId = add.body.entryId as string;

    // Status flip → payload carries the NEW status value + gameId (F18-compatible; non-sensitive).
    await request(app).patch(`/api/me/collection/${entryId}`).set(authed(u.token)).send({ status: 'beaten' });
    // Hours-only edit → payload carries gameId but NO status (the trivia-exclusion signal).
    await request(app).patch(`/api/me/collection/${entryId}`).set(authed(u.token)).send({ hours: 5 });

    const updates = await eventsFor(u.id, 'collection.entry_updated');
    expect(updates).toHaveLength(2);
    const statusEvt = updates.find((e) => (e.payload as { fields: string[] }).fields.includes('status'))!;
    const hoursEvt = updates.find((e) => (e.payload as { fields: string[] }).fields.includes('hours'))!;
    expect((statusEvt.payload as Record<string, unknown>).status).toBe('beaten');
    expect((statusEvt.payload as Record<string, unknown>).gameId).toBe(game);
    expect('status' in (hoursEvt.payload as Record<string, unknown>)).toBe(false);
    expect((hoursEvt.payload as Record<string, unknown>).gameId).toBe(game);
  });
});

// ── SYS-07 standing authz (actor-B → 4xx) ─────────────────────────────────────────────────────────────
describe('SYS-07: the mutating recommendation endpoints reject an unauthenticated actor-B', () => {
  it('authz:recommendation_create — an unauthenticated actor-B POST /recommendations → 401', async () => {
    const res = await request(app).post('/api/recommendations').send({ toUserId: randomUUID(), gameId: randomUUID() });
    expect(res.status).toBe(401);
  });
  it('authz:recommendation_dismiss — an unauthenticated actor-B DELETE /me/recommendations/:id → 401', async () => {
    const res = await request(app).delete(`/api/me/recommendations/${randomUUID()}`);
    expect(res.status).toBe(401);
  });
});
