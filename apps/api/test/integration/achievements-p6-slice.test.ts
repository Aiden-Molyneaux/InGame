import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import { randomUUID } from 'node:crypto';
import { and, eq } from 'drizzle-orm';
import { PostgreSqlContainer, type StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import type { Express } from 'express';
import { COMPOSITION_SCHEMA_VERSION } from '@ingame/shared';

// M6 P6 — the achievements engine (ACH-01/02/03/04/09) + the 0077 starter seed. The §5 invariant list
// IS this failing-test list (test-first): unlock on threshold-cross · replay → no second unlock · F36
// parallel cross → one unlock/one reward · reward tx atomicity (poison → nothing persists) ·
// farm-resistance (distinct counting) · NO unlock at seed time (+ count-from-genesis) · secret masking
// on every read (F06 masked key-set) · the three /achievements reads · friend showcase earned-only +
// non-friend honest count + blocked unavailable + SYS-07 (authz:get_user_achievements) · dual_actor
// credits the recommender · received_count credits the designer (ECON-05 milestone half) · entity-target
// fires only on the target · achievement.unlocked feeds the P4 feed (+ OQ-148 secret masking).
// Tags: ACH-01, ACH-02, ACH-03, ACH-04, ACH-09, ECON-05, SOC-06, SOC-09, MOD-09, F06, F36, SYS-07, OQ-148.

let container: StartedPostgreSqlContainer;
let app: Express;

function authed(token: string) {
  return { Authorization: `Bearer ${token}` };
}
/** P4 (perf-round2) — post-commit hooks are DETACHED from the mutation response now, so a mutating
 *  helper flushes them before returning: assertions on hook EFFECTS (unlock rows, achievement.unlocked
 *  outbox rows, feed items) stay deterministic without sleeps. The dedicated P4 tests below are the
 *  only place that mutates WITHOUT flushing (they prove the detachment itself). */
async function flushPostCommit() {
  const { waitForPostCommitHooks } = await import('../../src/events/post-commit');
  await waitForPostCommitHooks();
}
async function seedUser(over: Record<string, unknown> = {}) {
  const { getDb } = await import('../../src/db/client');
  const { users } = await import('../../src/db/schema');
  const { signAccessToken } = await import('../../src/auth/tokens');
  const id = randomUUID();
  const username = `user_${id.slice(0, 8)}`;
  await getDb().insert(users).values({ id, username, email: `${username}@example.com`, bio: 'bio', ...over });
  return { id, username, token: await signAccessToken(id) };
}
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
  await flushPostCommit();
  return res.body.id as string;
}
function comp(seed: number) {
  const elements: Array<Record<string, unknown>> = [];
  for (let i = 0; i < 3; i++) {
    elements.push({ type: 'rect', x: 0.5, y: 0.1 + (i + seed * 0.01) * 0.07, w: 0.4, h: 0.05, fill: '#e8c14a' });
  }
  return { schemaVersion: COMPOSITION_SCHEMA_VERSION, base: { gradient: ['#241a4d', '#0e0b1e'] }, elements };
}
/** Publish a fresh FREE card (no premium components → adopts free). Returns the cardId. */
async function publishCard(token: string, gameId: string, seed: number): Promise<string> {
  const draft = await request(app).post('/api/cards').set(authed(token)).send({ gameId, composition: comp(seed) });
  if (draft.status !== 201) throw new Error(`draft failed: ${draft.status} ${JSON.stringify(draft.body)}`);
  const cardId = draft.body.id as string;
  const pub = await request(app).post(`/api/cards/${cardId}/publish`).set(authed(token));
  if (pub.status !== 200) throw new Error(`publish failed: ${pub.status} ${JSON.stringify(pub.body)}`);
  await flushPostCommit();
  return cardId;
}
async function addGame(token: string, gameId: string): Promise<string> {
  const res = await request(app).post('/api/me/collection').set(authed(token)).send({ gameId });
  if (res.status !== 201 && res.status !== 200) throw new Error(`addGame failed: ${res.status} ${JSON.stringify(res.body)}`);
  await flushPostCommit();
  return res.body.entryId as string;
}
async function setStatus(token: string, entryId: string, status: string) {
  const res = await request(app).patch(`/api/me/collection/${entryId}`).set(authed(token)).send({ status });
  if (res.status !== 200) throw new Error(`setStatus failed: ${res.status} ${JSON.stringify(res.body)}`);
  await flushPostCommit();
}
async function adopt(token: string, cardId: string) {
  const res = await request(app).post(`/api/cards/${cardId}/adopt`).set(authed(token));
  if (res.status !== 200) throw new Error(`adopt failed: ${res.status} ${JSON.stringify(res.body)}`);
  await flushPostCommit();
  return res.body;
}
// B1 NEAT FREAK is triggered by `list.reranked` (the Top-10 ARRANGE re-rank) — the W-C9 re-point from
// the unreachable `collection.reordered` (the manual-collection arrange UI is M7-deferred). These drive
// the real client-reachable gesture: place games in the Top-10, then re-rank it.
async function addToTop10(token: string, gameId: string) {
  const res = await request(app).post('/api/me/lists/top10/items').set(authed(token)).send({ gameId });
  if (res.status !== 200 && res.status !== 201) {
    throw new Error(`addToTop10 failed: ${res.status} ${JSON.stringify(res.body)}`);
  }
  return res;
}
const rerankTop10 = (token: string, orderedGameIds: string[]) =>
  request(app).patch('/api/me/lists/top10').set(authed(token)).send({ orderedGameIds });
/** Unlock B1 NEAT FREAK for `token`'s user via its LIVE trigger — 10 Top-10 re-ranks (`list.reranked`).
 *  Seeds 2 collection games, places them in the Top-10, then alternates the full permutation 10 times. */
async function unlockNeatFreak(token: string) {
  const g1 = await seedGame(token, `NF1_${randomUUID().slice(0, 6)}`);
  const g2 = await seedGame(token, `NF2_${randomUUID().slice(0, 6)}`);
  await addGame(token, g1);
  await addGame(token, g2);
  await addToTop10(token, g1);
  await addToTop10(token, g2);
  for (let i = 0; i < 10; i++) {
    const r = await rerankTop10(token, i % 2 === 0 ? [g2, g1] : [g1, g2]);
    if (r.status !== 200) throw new Error(`rerankTop10 failed: ${r.status} ${JSON.stringify(r.body)}`);
  }
  await flushPostCommit();
}
const meAch = (token: string) => request(app).get('/api/me/achievements').set(authed(token));
const defs = (token: string) => request(app).get('/api/achievements').set(authed(token));
const userAch = (token: string, id: string) => request(app).get(`/api/users/${id}/achievements`).set(authed(token));
const ledger = (token: string) => request(app).get('/api/me/wallet/ledger').set(authed(token));

async function seedReal(b7Target?: string) {
  const { seedAchievementDefinitions } = await import('../../src/config/achievements');
  return seedAchievementDefinitions(b7Target);
}
async function upsertDef(def: {
  key: string;
  name: string;
  description?: string;
  criterion: Record<string, unknown>;
  tier: string;
  kind: string;
  reward: Record<string, unknown>;
  active?: boolean;
}) {
  const { upsertDefinition } = await import('../../src/repositories/achievement-repo');
  await upsertDefinition({ description: 'fixture', ...def });
}
async function unlockRowCount(userId: string, key: string): Promise<number> {
  const { getDb } = await import('../../src/db/client');
  const { userAchievements, achievementDefinitions } = await import('../../src/db/schema');
  const rows = await getDb()
    .select({ id: userAchievements.id })
    .from(userAchievements)
    .innerJoin(achievementDefinitions, eq(achievementDefinitions.id, userAchievements.achievementId))
    .where(and(eq(userAchievements.userId, userId), eq(achievementDefinitions.key, key)));
  return rows.length;
}
async function defId(key: string): Promise<string> {
  const { getDb } = await import('../../src/db/client');
  const { achievementDefinitions } = await import('../../src/db/schema');
  const rows = await getDb().select({ id: achievementDefinitions.id }).from(achievementDefinitions).where(eq(achievementDefinitions.key, key));
  return rows[0]!.id;
}
async function pendingRequestId(fromId: string, toId: string): Promise<string> {
  const { getDb } = await import('../../src/db/client');
  const { friendRequests } = await import('../../src/db/schema');
  const rows = await getDb()
    .select({ id: friendRequests.id })
    .from(friendRequests)
    .where(and(eq(friendRequests.fromUserId, fromId), eq(friendRequests.toUserId, toId)));
  return rows[0]!.id;
}
/** Ledger entries that are a milestone reward for a SPECIFIC achievement key (robust to other unlocks). */
async function milestoneEntriesFor(token: string, key: string) {
  const id = await defId(key);
  const led = await ledger(token);
  return (led.body.items as Array<{ type: string; refType: string | null; refId: string | null; delta: number }>).filter(
    (e) => e.type === 'milestone' && e.refType === 'achievement' && e.refId === id,
  );
}
/** Insert a raw domain_events row DIRECTLY (the dropped-evaluation simulation: the outbox row committed
 *  but the at-most-once post-commit pass never ran — e.g. an API restart mid-round). */
async function insertEvent(
  actorId: string,
  eventType: string,
  payload: Record<string, unknown>,
  occurredAt = new Date(),
  entityId = randomUUID(),
) {
  const { getDb } = await import('../../src/db/client');
  const { domainEvents } = await import('../../src/db/schema');
  await getDb().insert(domainEvents).values({ eventType, eventVersion: 1, occurredAt, actorId, entityType: 'x', entityId, payload });
}
/** The user's achievement.unlocked event rows for a given def key (proves the reconcile EMITS). */
async function unlockedEventCount(actorId: string, key: string): Promise<number> {
  const { getDb } = await import('../../src/db/client');
  const { domainEvents } = await import('../../src/db/schema');
  const id = await defId(key);
  const rows = await getDb()
    .select({ id: domainEvents.id })
    .from(domainEvents)
    .where(and(eq(domainEvents.actorId, actorId), eq(domainEvents.eventType, 'achievement.unlocked'), eq(domainEvents.entityId, id)));
  return rows.length;
}

beforeAll(async () => {
  container = await new PostgreSqlContainer('postgres:16-alpine').start();
  process.env.DATABASE_URL = container.getConnectionUri();
  process.env.DISPOSABLE_DB = '1';
  process.env.JWT_SIGNING_SECRET = 'test-signing-secret-at-least-16-chars-long';
  const { runMigrations } = await import('../../src/db/migrate');
  await runMigrations();
  const { createApp } = await import('../../src/app');
  app = createApp(); // wires the ACH post-commit engine
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

const MASKED_KEYS = ['id', 'kind', 'locked', 'tier'].sort();

// ── ACH-02 — unlock on threshold-cross + idempotent replay ────────────────────────────────────────────
describe('ACH-02: unlock fires on threshold-cross', () => {
  it('A1 FIRST PRINT unlocks on the first publish → earned + the milestone PX lands', async () => {
    await seedReal();
    const a = await seedUser();
    const game = await seedGame(a.token, 'Pub RPG'); // NB: this unlocks A9 CONTRIBUTOR (game_created ≥1)

    // Before the publish, A1 is NOT earned (it needs a publish).
    const before = await meAch(a.token);
    expect(before.body.earned.map((e: { key: string }) => e.key)).not.toContain('a1_first_print');

    await publishCard(a.token, game, 1);

    const after = await meAch(a.token);
    const earnedKeys = after.body.earned.map((e: { key: string }) => e.key);
    expect(earnedKeys).toContain('a1_first_print');
    const a1 = after.body.earned.find((e: { key: string }) => e.key === 'a1_first_print');
    expect(a1.unlockedAt).toBeTruthy();
    // ECON-04 — reward = badge + PX via the `milestone` ledger reason (refType 'achievement', refId = def).
    const a1px = await milestoneEntriesFor(a.token, 'a1_first_print');
    expect(a1px).toHaveLength(1);
    expect(a1px[0]!.delta).toBe(2);
  });

  it('replaying the SAME event does not unlock a second time (idempotent — the unique index backstop)', async () => {
    await seedReal();
    const a = await seedUser();
    const game = await seedGame(a.token, 'Replay RPG');
    const cardId = await publishCard(a.token, game, 1);
    expect(await unlockRowCount(a.id, 'a1_first_print')).toBe(1);

    // Replay the exact card.published event through the engine directly.
    const { evaluateEmittedEvents } = await import('../../src/achievements/engine');
    await evaluateEmittedEvents([
      { eventType: 'card.published', actorId: a.id, entityId: cardId, payload: { gameId: game }, occurredAt: new Date() },
    ]);
    expect(await unlockRowCount(a.id, 'a1_first_print')).toBe(1); // still ONE row
    // And still exactly ONE a1 milestone PX row (no double-pay).
    expect(await milestoneEntriesFor(a.token, 'a1_first_print')).toHaveLength(1);
  });
});

// ── F36 — concurrency: parallel threshold-cross → one unlock, one reward ──────────────────────────────
describe('F36: parallel threshold-crossing → exactly one unlock + one reward', () => {
  it('two parallel evaluations of the same crossing event → one row, one PX grant', async () => {
    const a = await seedUser();
    const game = await seedGame(a.token, 'Race RPG');
    // Publish BEFORE seeding the def, so the request-time engine sees no def (count=1, not yet unlocked).
    const cardId = await publishCard(a.token, game, 1);
    await upsertDef({
      key: 'fx_race',
      name: 'Race',
      criterion: { kind: 'event_count', events: ['card.published'], threshold: 1, unit: 'cards' },
      tier: 'standard',
      kind: 'milestone',
      reward: { badge: true, pixels: 3 },
    });
    const { evaluateEmittedEvents } = await import('../../src/achievements/engine');
    const evt = { eventType: 'card.published' as const, actorId: a.id, entityId: cardId, payload: { gameId: game }, occurredAt: new Date() };
    await Promise.all([evaluateEmittedEvents([evt]), evaluateEmittedEvents([evt]), evaluateEmittedEvents([evt])]);

    expect(await unlockRowCount(a.id, 'fx_race')).toBe(1);
    const milestones = await milestoneEntriesFor(a.token, 'fx_race');
    expect(milestones).toHaveLength(1);
    expect(milestones[0]!.delta).toBe(3);
  });
});

// ── ACH-04 — reward transaction atomicity (all-or-nothing) ────────────────────────────────────────────
describe('ACH-04: reward tx is atomic (poison the grant → no badge, no PX)', () => {
  it('a def whose PX reward is invalid rolls the WHOLE unlock back — no user_achievements row, no ledger row', async () => {
    const a = await seedUser();
    const game = await seedGame(a.token, 'Poison RPG');
    await upsertDef({
      key: 'fx_poison',
      name: 'Poison',
      criterion: { kind: 'event_count', events: ['card.published'], threshold: 1, unit: 'cards' },
      tier: 'standard',
      kind: 'milestone',
      reward: { badge: true, pixels: 2.5 }, // non-integer → credit() throws → the unlock tx rolls back
    });
    await publishCard(a.token, game, 1); // publish succeeds; the unlock+reward tx fails atomically

    expect(await unlockRowCount(a.id, 'fx_poison')).toBe(0); // no badge
    const led = await ledger(a.token);
    const milestones = led.body.items.filter((e: { type: string }) => e.type === 'milestone');
    expect(milestones).toHaveLength(0); // no PX
    const me = await meAch(a.token);
    expect(me.body.earned.map((e: { key: string }) => e.key)).not.toContain('fx_poison');
  });
});

// ── ACH-02 — farm resistance (distinct counting) ──────────────────────────────────────────────────────
describe('ACH-02: repeatable actions cannot re-trigger (distinct counting)', () => {
  it('A12-style distinct-entity counting: re-marking the same entry beaten does not inflate the count', async () => {
    await upsertDef({
      key: 'fx_beaten',
      name: 'Beaten',
      criterion: { kind: 'event_count_distinct', events: ['collection.entry_updated'], distinctBy: 'entity', threshold: 2, unit: 'games', where: { payloadEquals: { status: 'beaten' } } },
      tier: 'standard',
      kind: 'milestone',
      reward: { badge: true },
    });
    const a = await seedUser();
    const g1 = await seedGame(a.token, 'Beat One');
    const g2 = await seedGame(a.token, 'Beat Two');
    const e1 = await addGame(a.token, g1);
    const e2 = await addGame(a.token, g2);

    await setStatus(a.token, e1, 'beaten'); // distinct beaten entries = 1
    await setStatus(a.token, e1, 'playing');
    await setStatus(a.token, e1, 'beaten'); // still distinct = 1 (same entry) → NOT unlocked
    expect(await unlockRowCount(a.id, 'fx_beaten')).toBe(0);

    await setStatus(a.token, e2, 'beaten'); // distinct = 2 → unlock
    expect(await unlockRowCount(a.id, 'fx_beaten')).toBe(1);
  });
});

// ── ACH-08 — NO unlock at seed/deploy time + count-from-genesis healed at the READ (decision 0078) ────
describe('ACH-08: seeds never unlock; pre-genesis satisfied counters unlock at the FIRST READ', () => {
  it('history that predates the seed does NOT auto-grant at seed time; the first /me/achievements read reconciles it', async () => {
    const { resetRateLimitStore } = await import('../../src/http/rateLimit');
    const a = await seedUser();
    const game = await seedGame(a.token, 'Genesis RPG');
    // 5 publishes BEFORE any definitions exist → the engine finds no defs, grants nothing. (The publish
    // bucket is 3/10min — reset it between publishes so this test can cross A2's threshold of 5.)
    for (let i = 0; i < 5; i++) {
      resetRateLimitStore();
      await publishCard(a.token, game, i + 1);
    }

    // Seeding definitions emits NO events and runs NO reconcile → nothing unlocks AT the seed/deploy
    // (asserted at the DB — a read would now reconcile, which is exactly the 0078 point).
    await seedReal();
    expect(await unlockRowCount(a.id, 'a1_first_print')).toBe(0);
    expect(await unlockRowCount(a.id, 'a2_press_operator')).toBe(0);

    // The FIRST READ heals the satisfied counters (OQ-151 reversed — the "3/1 reads as bricked" class):
    // A1 (≥1) and A2 (≥5) unlock via reconcile-on-read, full reward path, no new live event needed.
    const first = await meAch(a.token);
    const earned = first.body.earned.map((e: { key: string }) => e.key);
    expect(earned).toContain('a1_first_print');
    expect(earned).toContain('a2_press_operator');
    // A satisfied counter never lingers in inProgress after the read.
    expect(first.body.inProgress.map((p: { key: string }) => p.key)).not.toContain('a2_press_operator');
    // And the rewards landed (the normal atomic path — one PX row each).
    expect(await milestoneEntriesFor(a.token, 'a1_first_print')).toHaveLength(1);
    expect(await milestoneEntriesFor(a.token, 'a2_press_operator')).toHaveLength(1);
  });
});

// ── ACH-03/09 — secret masking on every read ──────────────────────────────────────────────────────────
describe('ACH-03: secret masking on GET /achievements + reveal on unlock', () => {
  it('an unearned secret is masked to the ??? slot (F06 exact key-set); a milestone is full', async () => {
    await seedReal();
    const a = await seedUser();
    const res = await defs(a.token);
    expect(res.status).toBe(200);
    const list = res.body.achievements as Array<Record<string, unknown>>;

    const b1 = list.find((d) => d.id && d.locked); // any masked secret
    expect(b1).toBeTruthy();
    expect(Object.keys(b1!).sort()).toEqual(MASKED_KEYS);
    expect(b1!.kind).toBe('secret');
    expect(b1!.tier).toBe('secret');
    // NO milestone def is ever masked (they carry name/criterion/reward).
    const a1 = list.find((d) => d.key === 'a1_first_print') as Record<string, unknown> | undefined;
    expect(a1).toBeTruthy();
    expect(a1!.name).toBe('First Print');
    expect(a1!.criterion).toBeTruthy();
  });

  it('once the caller unlocks a secret, GET /achievements reveals it (their own only)', async () => {
    await seedReal();
    const a = await seedUser();
    // B1 NEAT FREAK — re-rank the Top-10 ten times (`list.reranked`, the W-C9 client-reachable signal).
    // Seed 2 collection games, place them in the Top-10, then alternate the order 10x.
    const g1 = await seedGame(a.token, 'R1');
    const g2 = await seedGame(a.token, 'R2');
    await addGame(a.token, g1);
    await addGame(a.token, g2);
    await addToTop10(a.token, g1);
    await addToTop10(a.token, g2);
    for (let i = 0; i < 10; i++) {
      const r = await rerankTop10(a.token, i % 2 === 0 ? [g2, g1] : [g1, g2]);
      expect(r.status).toBe(200);
    }
    await flushPostCommit(); // the B1 unlock rides the detached hook (P4)
    const res = await defs(a.token);
    const b1 = (res.body.achievements as Array<Record<string, unknown>>).find((d) => d.key === 'b1_neat_freak');
    expect(b1).toBeTruthy(); // now REVEALED (unlocked), no longer masked
    expect(b1!.name).toBe('Neat Freak');
    const me = await meAch(a.token);
    expect(me.body.secrets.found.map((s: { key: string }) => s.key)).toContain('b1_neat_freak');
    expect(me.body.summary.secretsFound).toBeGreaterThanOrEqual(1);
  });
});

// ── ECON-05 / ACH-04 — received_count credits the DESIGNER; A7 credits the adopter ────────────────────
describe('ECON-05: adoption milestones credit the designer (the milestone half lands)', () => {
  it('B adopts A\'s card → A13 (designer, prestige, +5 PX) for A AND A7 (adopter) for B', async () => {
    await seedReal();
    const a = await seedUser();
    const b = await seedUser();
    const game = await seedGame(a.token, 'Adopt RPG');
    const cardId = await publishCard(a.token, game, 1);
    await adopt(b.token, cardId);

    // Designer A earns A13 FIRST ADOPTION (prestige) — ECON-05's milestone half.
    const aMe = await meAch(a.token);
    const a13 = aMe.body.earned.find((e: { key: string; tier: string }) => e.key === 'a13_first_adoption');
    expect(a13).toBeTruthy();
    expect(a13.tier).toBe('prestige');
    const a13px = await milestoneEntriesFor(a.token, 'a13_first_adoption');
    expect(a13px).toHaveLength(1);
    expect(a13px[0]!.delta).toBe(5); // +5 PX milestone reward

    // Adopter B earns A7 GOOD TASTE (the actor-credited side of the SAME card.adopted event).
    const bMe = await meAch(b.token);
    expect(bMe.body.earned.map((e: { key: string }) => e.key)).toContain('a7_good_taste');
  });
});

// ── participant_count — both parties of friend.added ──────────────────────────────────────────────────
describe('ACH-02: participant_count credits BOTH friends', () => {
  it('accepting a request unlocks A5 PLAYER TWO for BOTH the requester and the accepter', async () => {
    await seedReal();
    const a = await seedUser();
    const b = await seedUser();
    const reqRes = await request(app).post('/api/friends/requests').set(authed(a.token)).send({ toUserId: b.id });
    expect(reqRes.status).toBe(201);
    const requestId = await pendingRequestId(a.id, b.id);
    const accept = await request(app).post(`/api/friends/requests/${requestId}/accept`).set(authed(b.token));
    expect(accept.status).toBe(200);

    expect((await meAch(a.token)).body.earned.map((e: { key: string }) => e.key)).toContain('a5_player_two');
    expect((await meAch(b.token)).body.earned.map((e: { key: string }) => e.key)).toContain('a5_player_two');
  });
});

// ── ACH-07 — entity-target fires ONLY on the target ───────────────────────────────────────────────────
describe('ACH-07: entity-target egg fires only for the configured game', () => {
  it('B7 STRAWBERRY HUNTER unlocks on the target game and NOT on another', async () => {
    const a = await seedUser();
    const target = await seedGame(a.token, 'The Target');
    const other = await seedGame(a.token, 'Not It');
    await seedReal(target); // B7 configured + ACTIVE with the target

    await addGame(a.token, other); // wrong game → no B7
    expect(await unlockRowCount(a.id, 'b7_strawberry_hunter')).toBe(0);
    await addGame(a.token, target); // the target → B7
    expect(await unlockRowCount(a.id, 'b7_strawberry_hunter')).toBe(1);
  });

  it('B7 seeded WITHOUT a target is inactive (absent from GET /achievements, never fires)', async () => {
    const a = await seedUser();
    await seedReal(); // no target → B7 inactive
    const list = (await defs(a.token)).body.achievements as Array<Record<string, unknown>>;
    // Every secret is masked, so we cannot see keys; assert via the engine: adding any game never unlocks b7.
    const g = await seedGame(a.token, 'Whatever');
    await addGame(a.token, g);
    expect(await unlockRowCount(a.id, 'b7_strawberry_hunter')).toBe(0);
    // Active secrets total excludes the inactive B7 (only 5 active secrets are seeded).
    const me = await meAch(a.token);
    expect(me.body.summary.secretsTotal).toBe(5);
    void list;
  });
});

// ── dual_actor — B8 credits the recommender ───────────────────────────────────────────────────────────
describe('ACH-02: dual_actor (B8 THE REGIFTER) credits the recommender', () => {
  it('A recommends a game to B; B adds it → B8 unlocks for the RECOMMENDER (A), not the adder', async () => {
    await seedReal();
    const a = await seedUser();
    const b = await seedUser();
    await befriend(a.id, b.id);
    const game = await seedGame(a.token, 'Regift RPG');
    const rec = await request(app).post('/api/recommendations').set(authed(a.token)).send({ toUserId: b.id, gameId: game });
    expect(rec.status).toBe(201);

    await addGame(b.token, game); // B adds the recommended game

    expect(await unlockRowCount(a.id, 'b8_the_regifter')).toBe(1); // recommender A credited
    expect(await unlockRowCount(b.id, 'b8_the_regifter')).toBe(0); // the adder is NOT credited
  });
});

// ── GET /users/:id/achievements — showcase gating (SOC-09 / MOD-09 / SYS-07) ─────────────────────────
describe('ACH-05 / SOC-09: the friend showcase read', () => {
  it('a FRIEND sees the earned-only showcase (F06 shape); a non-friend gets the honest count only', async () => {
    await seedReal();
    const owner = await seedUser();
    const friend = await seedUser();
    const stranger = await seedUser();
    await befriend(owner.id, friend.id);
    const game = await seedGame(owner.token, 'Showcase RPG');
    await publishCard(owner.token, game, 1); // owner earns A1

    const friendView = await userAch(friend.token, owner.id);
    expect(friendView.status).toBe(200);
    expect(friendView.body.summary.earned).toBeGreaterThanOrEqual(1);
    expect(Array.isArray(friendView.body.earned)).toBe(true);
    expect(Object.keys(friendView.body.earned[0]).sort()).toEqual(['id', 'key', 'name', 'tier', 'unlockedAt'].sort());
    expect('inProgress' in friendView.body).toBe(false); // earned-only — no in-progress leak
    expect('locked' in friendView.body).toBe(false);

    const strangerView = await userAch(stranger.token, owner.id);
    expect(strangerView.status).toBe(200);
    expect(strangerView.body.locked).toBe(true);
    expect(strangerView.body.summary.earned).toBeGreaterThanOrEqual(1); // honest headline count
    expect('earned' in strangerView.body && Array.isArray(strangerView.body.earned)).toBe(false);
  });

  // OQ-148 WIDENING (W-C3, decision 0078) — the owner ruled the feed's secret-mask must ALSO apply to a
  // friend's showcase: "you should not be able to figure out secret achievements by looking at friends'
  // pages." An earned SECRET is MASKED to the sealed slot (counts, never named); standard/prestige named.
  it('a friend sees an unlocked SECRET MASKED — no name/criterion leak; standard named; count still includes it (OQ-148)', async () => {
    await seedReal();
    const owner = await seedUser();
    const friend = await seedUser();
    await befriend(owner.id, friend.id);
    // owner earns a STANDARD milestone (A1 FIRST PRINT, named) AND a SECRET (B1 NEAT FREAK, masked).
    const game = await seedGame(owner.token, 'Showcase Std');
    await publishCard(owner.token, game, 1); // A1 (standard)
    await unlockNeatFreak(owner.token); // B1 (secret)

    const friendView = await userAch(friend.token, owner.id);
    expect(friendView.status).toBe(200);

    // the STANDARD milestone renders NAMED (the sealed masking touches secrets only).
    const named = friendView.body.earned.find((e: { key?: string }) => e.key === 'a1_first_print');
    expect(named).toBeTruthy();
    expect(named.name).toBe('First Print');
    expect(named.tier).toBe('standard');

    // the SECRET renders MASKED — the sealed key-set, no name/key/criterion (the P6 no-leak pattern).
    const masked = friendView.body.earned.find((e: { locked?: boolean }) => e.locked === true);
    expect(masked).toBeTruthy();
    expect(Object.keys(masked).sort()).toEqual(['id', 'kind', 'locked', 'tier', 'unlockedAt'].sort());
    expect(masked.kind).toBe('secret');
    expect(masked.tier).toBe('secret');
    expect(masked.unlockedAt).toBeTruthy();

    // the egg's name/key NEVER leak on the wire — you cannot discover the secret from a friend's page.
    expect(JSON.stringify(friendView.body)).not.toContain('Neat Freak');
    expect(JSON.stringify(friendView.body)).not.toContain('b1_neat_freak');
    // the masked secret STILL counts toward summary.earned (it IS earned) — summary === all earned rows.
    const maskedCount = friendView.body.earned.filter((e: { locked?: boolean }) => e.locked === true).length;
    expect(maskedCount).toBeGreaterThanOrEqual(1);
    expect(friendView.body.summary.earned).toBe(friendView.body.earned.length);
    // still earned-only — no in-progress, no locked-secret existence count.
    expect('secrets' in friendView.body).toBe(false);
    expect(JSON.stringify(friendView.body)).not.toContain('lockedCount');
  });

  it('authz:get_user_achievements — a BLOCKED actorB gets the generic 404 (indistinguishable, MOD-09)', async () => {
    await seedReal();
    const owner = await seedUser();
    const actorB = await seedUser();
    // owner blocks actorB → the read collapses to the generic unavailable 404 (SOC-09 both directions).
    const block = await request(app).post('/api/me/blocks').set(authed(owner.token)).send({ userId: actorB.id });
    expect([200, 201]).toContain(block.status);
    const res = await userAch(actorB.token, owner.id);
    expect(res.status).toBe(404);
    // Unauthenticated actorB → 401 (SYS-07).
    const unauth = await request(app).get(`/api/users/${owner.id}/achievements`);
    expect(unauth.status).toBe(401);
  });
});

// ── SOC-06 / OQ-148 — achievement.unlocked feeds the P4 feed, secret label masked ─────────────────────
describe('SOC-06 / OQ-148: unlocks render in the friend feed; secret labels masked', () => {
  it('a standard unlock is NAMED in a friend\'s feed; a secret unlock is MASKED', async () => {
    await seedReal();
    const owner = await seedUser();
    const friend = await seedUser();
    await befriend(owner.id, friend.id);

    // Standard: publish → A1 unlock (named "First Print").
    const game = await seedGame(owner.token, 'Feed RPG');
    await publishCard(owner.token, game, 1);
    // Secret: 10 Top-10 re-ranks → B1 unlock (masked; the W-C9 `list.reranked` trigger).
    await unlockNeatFreak(owner.token);

    const feed = await request(app).get('/api/me/feed').set(authed(friend.token));
    expect(feed.status).toBe(200);
    const achItems = feed.body.items.filter((i: { type: string }) => i.type === 'unlocked_achievement');
    const labels = achItems.flatMap((i: { objects: Array<{ label?: string }> }) => i.objects.map((o) => o.label));
    expect(labels).toContain('First Print'); // standard → named
    expect(labels).toContain('a secret achievement'); // secret → masked (OQ-148)
    expect(labels).not.toContain('Neat Freak'); // the egg name never leaks in the feed
  });
});

// ── Decision 0078 — reconcile-on-read (OQ-151 REVERSED at the owner walk) ─────────────────────────────
describe('ACH-02 / decision 0078: reconcile-on-read heals dropped evaluations', () => {
  it('a dropped evaluation (events committed, evaluator never ran) unlocks at the next read — full reward path + the unlocked event', async () => {
    await seedReal();
    const a = await seedUser();
    // Simulate the owner's live incident: 10 list.reranked outbox rows exist (each committed), but the
    // post-commit pass was dropped every time (API restarts) → B1 NEAT FREAK never fired.
    for (let i = 0; i < 10; i++) await insertEvent(a.id, 'list.reranked', { count: 2 });
    expect(await unlockRowCount(a.id, 'b1_neat_freak')).toBe(0);

    const res = await meAch(a.token);
    expect(res.status).toBe(200);
    // The read healed it: unlocked + PX row + the achievement.unlocked event all landed (one atomic tx).
    expect(await unlockRowCount(a.id, 'b1_neat_freak')).toBe(1);
    expect(res.body.secrets.found.map((s: { key: string }) => s.key)).toContain('b1_neat_freak');
    expect(await milestoneEntriesFor(a.token, 'b1_neat_freak')).toHaveLength(1);
    expect(await unlockedEventCount(a.id, 'b1_neat_freak')).toBe(1); // rule-05 — the reconcile EMITS
  });

  it('an UNSATISFIED counter is untouched by the read (no unlock, no reward, still in progress)', async () => {
    await seedReal();
    const a = await seedUser();
    for (let i = 0; i < 4; i++) await insertEvent(a.id, 'list.reranked', { count: 2 }); // 4 < 10
    const res = await meAch(a.token);
    expect(res.status).toBe(200);
    expect(await unlockRowCount(a.id, 'b1_neat_freak')).toBe(0);
    expect(await milestoneEntriesFor(a.token, 'b1_neat_freak')).toHaveLength(0);
  });

  it('a MATCH-kind egg is NOT reconciled at read (live-event-only — the moment-in-time boundary)', async () => {
    await seedReal();
    const a = await seedUser();
    // A daily claim AT 03:30 UTC sits in history (B6 NIGHT SHIFT would have matched live) — but the
    // evaluation was dropped. A read must NOT retro-fire a moment-in-time egg (decision 0078 boundary).
    await insertEvent(a.id, 'wallet.daily_claimed', { amount: 1 }, new Date(Date.UTC(2026, 6, 16, 3, 30, 0)));
    const res = await meAch(a.token);
    expect(res.status).toBe(200);
    expect(await unlockRowCount(a.id, 'b6_night_shift')).toBe(0);
    expect(res.body.summary.secretsFound).toBe(0);
  });

  it('F36: two PARALLEL reads on a satisfied counter → exactly ONE unlock + ONE reward', async () => {
    await seedReal();
    const a = await seedUser();
    for (let i = 0; i < 10; i++) await insertEvent(a.id, 'list.reranked', { count: 2 });

    const [r1, r2] = await Promise.all([meAch(a.token), meAch(a.token)]);
    expect(r1.status).toBe(200);
    expect(r2.status).toBe(200);
    expect(await unlockRowCount(a.id, 'b1_neat_freak')).toBe(1); // the unique index decides the race
    expect(await milestoneEntriesFor(a.token, 'b1_neat_freak')).toHaveLength(1); // ONE reward
    expect(await unlockedEventCount(a.id, 'b1_neat_freak')).toBe(1); // ONE emission
  });

  it('re-reading is idempotent — a healed unlock never re-grants', async () => {
    await seedReal();
    const a = await seedUser();
    for (let i = 0; i < 10; i++) await insertEvent(a.id, 'list.reranked', { count: 2 });
    await meAch(a.token); // heals
    await meAch(a.token); // re-read
    await meAch(a.token); // and again
    expect(await unlockRowCount(a.id, 'b1_neat_freak')).toBe(1);
    expect(await milestoneEntriesFor(a.token, 'b1_neat_freak')).toHaveLength(1);
    expect(await unlockedEventCount(a.id, 'b1_neat_freak')).toBe(1);
  });
});

// ── P4 (perf-round2 S3) — the achievements pass is OFF the mutation path ──────────────────────────────
// These are the only tests that mutate WITHOUT the flush helper: they pin the detachment itself.
// A gated hook stands in for the engine so the ordering is observable; each test rewires the real
// engine in `finally`.
describe('P4: post-commit hooks run OFF the mutation request path (detached + flushable)', () => {
  /** The one raw mutation used here — seedGame WITHOUT its built-in flush. */
  async function rawCreateGame(token: string, name: string) {
    const { getDb } = await import('../../src/db/client');
    const { genres } = await import('../../src/db/schema');
    const g = await getDb().select().from(genres).limit(1);
    return request(app).post('/api/catalog/games').set(authed(token)).send({ name, genreIds: [g[0]!.id] });
  }

  it('the mutating response returns while the hook is still pending; waitForPostCommitHooks flushes it', async () => {
    const a = await seedUser();
    const { registerPostCommitHook, waitForPostCommitHooks } = await import('../../src/events/post-commit');
    let release!: () => void;
    const gate = new Promise<void>((r) => (release = r));
    let hookFinished = false;
    registerPostCommitHook(async () => {
      await gate;
      hookFinished = true;
    });
    try {
      // Under the OLD (awaited) seam this request would HANG on the gate and the test would time out —
      // the 201 landing while the hook is provably unfinished IS the detachment proof.
      const res = await rawCreateGame(a.token, `P4_${randomUUID().slice(0, 6)}`);
      expect(res.status).toBe(201);
      expect(hookFinished).toBe(false); // the response did NOT wait for the hook
      release();
      await waitForPostCommitHooks(); // the flush seam: deterministic settle, no sleeps
      expect(hookFinished).toBe(true);
    } finally {
      release(); // never leave a pending task gated (even on assertion failure)
      const { wireAchievementsEngine } = await import('../../src/achievements/engine');
      wireAchievementsEngine(); // restore the real evaluator
    }
  });

  it('a THROWING hook is swallowed-and-logged — the mutation stays committed, the flush still settles', async () => {
    const a = await seedUser();
    const { registerPostCommitHook, waitForPostCommitHooks } = await import('../../src/events/post-commit');
    let fired = false;
    registerPostCommitHook(async () => {
      fired = true;
      throw new Error('post-commit boom');
    });
    try {
      const name = `P4E_${randomUUID().slice(0, 6)}`;
      const res = await rawCreateGame(a.token, name);
      expect(res.status).toBe(201); // the committed mutation can never be failed by its hook
      await waitForPostCommitHooks(); // resolves despite the rejection (swallow-and-log preserved)
      expect(fired).toBe(true);
      // The mutation's own write survived the hook failure.
      const { getDb } = await import('../../src/db/client');
      const { games } = await import('../../src/db/schema');
      const rows = await getDb().select({ id: games.id }).from(games).where(eq(games.name, name));
      expect(rows).toHaveLength(1);
    } finally {
      const { wireAchievementsEngine } = await import('../../src/achievements/engine');
      wireAchievementsEngine();
    }
  });
});
