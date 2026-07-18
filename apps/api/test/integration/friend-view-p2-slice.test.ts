import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import { randomUUID } from 'node:crypto';
import { COMPOSITION_SCHEMA_VERSION } from '@ingame/shared';
import { PostgreSqlContainer, type StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import type { Express } from 'express';

// M6 P2 — the friend-view read fabric (decision 0076 §0.1/§0.2). Covers: the OQ-146 equipped-label
// denormalization served on the gallery + friend collection; GET /users/:id/collection (COL-10/11 friend
// subset — F06 no owner-only leak); GET /me/compare/:friendId (SOC-03 face-off + NOT_FRIENDS + block
// collapse); friendsWhoOwn (CAT-09c); the contributions VIEW-ALL cursors + bio/game-thumb gaps; the
// SOC-09 mutual-invisibility sweep. Standing authz tokens covered here (actor-B → 4xx):
// authz:get_user_collection · authz:get_compare · authz:get_contributions_cards · authz:get_contributions_games.
// Tags: SOC-02, SOC-03, SOC-09, SOC-11, COL-10, COL-11, CAT-09, CARD-22, PROF-03, F06, MOD-09, SYS-07.

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
  await getDb().insert(users).values({ id, username, email: `${username}@example.com`, bio: 'my bio', ...over });
  return { id, username, token: await signAccessToken(id) };
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
async function makeFriends(a: { id: string; token: string }, b: { id: string; token: string }) {
  await request(app).post('/api/friends/requests').set(authed(a.token)).send({ toUserId: b.id });
  const { getDb } = await import('../../src/db/client');
  const { friendRequests } = await import('../../src/db/schema');
  const { and, eq } = await import('drizzle-orm');
  const rows = await getDb()
    .select()
    .from(friendRequests)
    .where(and(eq(friendRequests.fromUserId, a.id), eq(friendRequests.toUserId, b.id), eq(friendRequests.status, 'pending')));
  await request(app).post(`/api/friends/requests/${rows[0]!.id}/accept`).set(authed(b.token));
}
async function seedGame(token: string, name: string): Promise<{ id: string }> {
  const { getDb } = await import('../../src/db/client');
  const { genres } = await import('../../src/db/schema');
  const g = await getDb().select().from(genres).limit(1);
  const res = await request(app)
    .post('/api/catalog/games')
    .set(authed(token))
    .send({ name, genreIds: [g[0]!.id] });
  if (res.status !== 201) throw new Error(`seedGame failed: ${res.status} ${JSON.stringify(res.body)}`);
  return { id: res.body.id };
}
async function addToCollection(token: string, gameId: string, hours = 0): Promise<string> {
  const add = await request(app).post('/api/me/collection').set(authed(token)).send({ gameId });
  const entryId = add.body.entryId as string;
  if (hours > 0) await request(app).patch(`/api/me/collection/${entryId}`).set(authed(token)).send({ hours });
  return entryId;
}
// A full-closed-attribute ALL-FREE composition (publishable — 3 elements clears CARD-19; no premium refs
// so CARD-13 reconcile passes) whose equipped labels are known: base GRADIENT · frame LIME · effect
// SOFT GLOW · finish MATTE · nameplate SLAB · font CHAKRA.
function closedComp(seed: number) {
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
const EXPECTED_EQUIPPED = { base: 'GRADIENT', frame: 'LIME', effect: 'SOFT GLOW', finish: 'MATTE', nameplate: 'SLAB', font: 'CHAKRA' };

/** Publish a fresh card for `gameId` by `token`; returns the card id. */
async function publishCard(token: string, gameId: string, seed: number): Promise<string> {
  const draft = await request(app).post('/api/cards').set(authed(token)).send({ gameId, composition: closedComp(seed) });
  const cardId = draft.body.id as string;
  const pub = await request(app).post(`/api/cards/${cardId}/publish`).set(authed(token));
  if (pub.status !== 200) throw new Error(`publish failed: ${pub.status} ${JSON.stringify(pub.body)}`);
  return cardId;
}
async function equip(token: string, entryId: string, cardId: string) {
  const res = await request(app).patch(`/api/me/collection/${entryId}`).set(authed(token)).send({ activeCardDesignId: cardId });
  if (res.status !== 200) throw new Error(`equip failed: ${res.status} ${JSON.stringify(res.body)}`);
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

const FRIEND_ITEM_KEYS = ['entryId', 'gameId', 'title', 'developer', 'publisher', 'releaseYear', 'genres', 'hours', 'status', 'ownedSince', 'nowPlaying', 'card'].sort();

describe('CARD-22 · OQ-146: the equipped-label denormalization is served cross-user (gallery)', () => {
  it('a published card carries its equipped readout on GET /games/:gameId/cards (never composition)', async () => {
    const designer = await seedUser();
    const game = await seedGame(designer.token, 'Equipped RPG');
    await publishCard(designer.token, game.id, 1);

    const viewer = await seedUser();
    const res = await request(app).get(`/api/games/${game.id}/cards`).set(authed(viewer.token));
    expect(res.status).toBe(200);
    expect(res.body.items).toHaveLength(1);
    expect(res.body.items[0].equipped).toEqual(EXPECTED_EQUIPPED);
    expect('composition' in res.body.items[0]).toBe(false); // OQ-122 — never the layers
  });
});

describe('COL-10/11 · F06: GET /users/:id/collection — the friend subset (no owner-only leak)', () => {
  it('a FRIEND sees the shelf subset + the equipped CARD-22 readout; owner-only fields are ABSENT', async () => {
    const owner = await seedUser();
    const friend = await seedUser();
    await makeFriends(owner, friend);
    const game = await seedGame(owner.token, 'Friend Collection RPG');
    const entryId = await addToCollection(owner.token, game.id, 12);
    // Owner sets private fields + equips a published card.
    await request(app).patch(`/api/me/collection/${entryId}`).set(authed(owner.token)).send({ notes: 'SECRET', rating: 5, percentComplete: 80 });
    const cardId = await publishCard(owner.token, game.id, 2);
    await equip(owner.token, entryId, cardId);

    const res = await request(app).get(`/api/users/${owner.id}/collection`).set(authed(friend.token));
    expect(res.status).toBe(200);
    expect(res.body.items).toHaveLength(1);
    const item = res.body.items[0];
    expect(Object.keys(item).sort()).toEqual(FRIEND_ITEM_KEYS);
    // F06 — the owner-only fields NEVER serialize (COL-04/05, the M2 privacy-leak class).
    for (const leak of ['notes', 'rating', 'percentComplete', 'addedAt', 'platforms']) {
      expect(leak in item).toBe(false);
    }
    expect(item.hours).toBe(12);
    expect(item.card.equipped).toEqual(EXPECTED_EQUIPPED);
    expect('composition' in item.card).toBe(false);
    expect(item.card.designer).toMatchObject({ userId: owner.id });
  });

  it('authz:get_user_collection — a NON-friend (actorB) gets the generic 404 (collection is friend-only, MOD-09)', async () => {
    const owner = await seedUser();
    const game = await seedGame(owner.token, 'Private Shelf');
    await addToCollection(owner.token, game.id, 5);
    const actorB = await seedUser();
    const res = await request(app).get(`/api/users/${owner.id}/collection`).set(authed(actorB.token));
    expect(res.status).toBe(404);
  });

  it('SOC-09: a BLOCK (either direction) collapses the friend collection to 404, indistinguishable from suspended', async () => {
    const owner = await seedUser();
    const friend = await seedUser();
    await makeFriends(owner, friend);
    const game = await seedGame(owner.token, 'Blocked Shelf');
    await addToCollection(owner.token, game.id, 5);
    // Block severs the friendship → 404.
    await seedBlock(friend.id, owner.id);
    const blocked = await request(app).get(`/api/users/${owner.id}/collection`).set(authed(friend.token));
    expect(blocked.status).toBe(404);
    // A suspended friend also 404s — byte-identical collapse.
    const owner2 = await seedUser();
    const friend2 = await seedUser();
    await makeFriends(owner2, friend2);
    await seedSuspension(owner2.id);
    const suspended = await request(app).get(`/api/users/${owner2.id}/collection`).set(authed(friend2.token));
    expect(suspended.status).toBe(404);
    expect(suspended.body).toEqual(blocked.body);
  });
});

describe('PROF-05 · F06 (C4): the friend/full /users/:id carries stats + device + nowPlaying; the limited shape does NOT', () => {
  it('a FRIEND sees the six-pack stats, the THEIR-DEVICE payload, and the nowPlaying pin (flattened card)', async () => {
    const target = await seedUser();
    const friend = await seedUser();
    await makeFriends(target, friend);
    const game = await seedGame(target.token, 'C4 Pinned Game');
    const entryId = await addToCollection(target.token, game.id, 25);
    const cardId = await publishCard(target.token, game.id, 7);
    await equip(target.token, entryId, cardId);
    await request(app).put('/api/me/now-playing').set(authed(target.token)).send({ gameId: game.id });
    await request(app).patch('/api/me/device').set(authed(target.token)).send({ screenThemeId: 'paper' });

    // The friend ADOPTS the target's card — proves adoptionsReceived is REAL (un-zeroed, C4 follow-up).
    const adopt = await request(app).post(`/api/cards/${cardId}/adopt`).set(authed(friend.token));
    expect(adopt.status).toBe(200);

    const res = await request(app).get(`/api/users/${target.id}`).set(authed(friend.token));
    expect(res.status).toBe(200);
    // stats — the PROF-04 six-pack computed against the TARGET (the same statsOf the self shape runs);
    // adoptionsReceived carries the REAL CARD-05 clout (the stale M5 honest-zero retired).
    expect(res.body.stats).toMatchObject({ games: 1, hours: 25, friends: 1, cardsDesigned: 1, adoptionsReceived: 1 });
    // Parity by construction — the target's OWN /me stats show the same real count.
    const self = await request(app).get('/api/me').set(authed(target.token));
    expect(self.body.stats.adoptionsReceived).toBe(1);
    // F-16/0055 — the friend shape does NOT expose the target's privacy value (ruled drop, landed C4).
    expect('privacy' in res.body).toBe(false);
    // device — DEV-02/04 (decision 0012): the wire name is `shellId`.
    expect(res.body.device).toMatchObject({ shellId: 'teal', screenThemeId: 'paper' });
    expect(res.body.device.stickerComposition).toMatchObject({ version: 1 });
    // nowPlaying — WTP-03: the pin expanded with their hours + the FLATTENED card (never composition).
    expect(res.body.nowPlaying).toMatchObject({ gameId: game.id, title: 'C4 Pinned Game', hours: 25 });
    expect(res.body.nowPlaying.card.equipped).toEqual(EXPECTED_EQUIPPED);
    expect('composition' in res.body.nowPlaying.card).toBe(false);
  });

  it('F06 — the LIMITED (non-friend) shape stays EXACTLY without the C4 trio', async () => {
    const target = await seedUser();
    const stranger = await seedUser();
    const res = await request(app).get(`/api/users/${target.id}`).set(authed(stranger.token));
    expect(res.status).toBe(200);
    expect(Object.keys(res.body).sort()).toEqual(
      ['id', 'username', 'avatarUrl', 'memberSince', 'mutualFriendsCount', 'relationship'].sort(),
    );
    for (const leak of ['stats', 'device', 'nowPlaying', 'top10', 'bio']) {
      expect(leak in res.body).toBe(false);
    }
  });

  it('a friend with NO device row and NO pin gets the free-default device + nowPlaying null', async () => {
    const target = await seedUser();
    const friend = await seedUser();
    await makeFriends(target, friend);
    const res = await request(app).get(`/api/users/${target.id}`).set(authed(friend.token));
    expect(res.body.device).toMatchObject({ shellId: 'teal', screenThemeId: 'midnight' });
    expect(res.body.nowPlaying).toBeNull();
    expect(res.body.stats).toMatchObject({ games: 0, hours: 0, friends: 1 });
  });
});

describe('SOC-03 · F06: GET /me/compare/:friendId — the face-off', () => {
  it('two friends compare — totals face-off, shared-set matchup, leaderboard with isMe', async () => {
    const me = await seedUser();
    const rival = await seedUser();
    await makeFriends(me, rival);
    const shared = await seedGame(me.token, 'Shared Game');
    const mineOnly = await seedGame(me.token, 'My Solo Game');
    await addToCollection(me.token, shared.id, 10);
    await addToCollection(me.token, mineOnly.id, 5);
    await addToCollection(rival.token, shared.id, 30);

    const res = await request(app).get(`/api/me/compare/${rival.id}`).set(authed(me.token));
    expect(res.status).toBe(200);
    expect(res.body.friend).toMatchObject({ userId: rival.id, username: rival.username });
    expect(res.body.totals).toMatchObject({ yourHours: 15, theirHours: 30, yourGames: 2, theirGames: 1, leader: 'them' });
    expect(res.body.games).toHaveLength(1); // only the shared game
    expect(res.body.games[0]).toMatchObject({ gameId: shared.id, yourHours: 10, theirHours: 30, leader: 'them' });
    expect(res.body.games[0].yourCard.id).toBeDefined();
    expect('composition' in res.body.games[0].theirCard).toBe(false);
    // The leaderboard ranks the friend cohort + me (isMe), by hours desc.
    const board = res.body.leaderboard;
    expect(board).toHaveLength(2);
    expect(board[0]).toMatchObject({ rank: 1, hours: 30, isMe: false });
    expect(board[1]).toMatchObject({ rank: 2, hours: 15, isMe: true });
  });

  it('authz:get_compare — a KNOWN non-friend (actorB) → 409 NOT_FRIENDS (comparing is friend-only, SOC-03)', async () => {
    const me = await seedUser();
    const stranger = await seedUser();
    const res = await request(app).get(`/api/me/compare/${stranger.id}`).set(authed(me.token));
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('NOT_FRIENDS');
  });

  it('SOC-09: a BLOCK collapses compare to the generic 404 (never NOT_FRIENDS — no presence oracle)', async () => {
    const me = await seedUser();
    const other = await seedUser();
    await makeFriends(me, other);
    await seedBlock(other.id, me.id); // other blocks me → the friendship severs
    const res = await request(app).get(`/api/me/compare/${other.id}`).set(authed(me.token));
    expect(res.status).toBe(404); // NOT 409 — the block must not distinguish from unavailable
  });
});

describe('CAT-09c: GET /catalog/games/:id/friends-who-own — the named list', () => {
  it('lists the actor’s friends who own the game (+ hours); a non-friend owner is NOT named', async () => {
    const me = await seedUser();
    const friend = await seedUser();
    const stranger = await seedUser();
    await makeFriends(me, friend);
    const game = await seedGame(me.token, 'Owned Game');
    await addToCollection(friend.token, game.id, 20);
    await addToCollection(stranger.token, game.id, 99); // a non-friend owner — must NOT appear

    const res = await request(app).get(`/api/catalog/games/${game.id}/friends-who-own`).set(authed(me.token));
    expect(res.status).toBe(200);
    expect(res.body.friendsWhoOwn).toHaveLength(1);
    expect(res.body.friendsWhoOwn[0]).toMatchObject({ userId: friend.id, username: friend.username, hours: 20 });
    expect(res.body.count).toBe(1);
  });

  it('SOC-09: a blocked (ex-)friend who owns the game is absent (the block severs the friendship)', async () => {
    const me = await seedUser();
    const friend = await seedUser();
    await makeFriends(me, friend);
    const game = await seedGame(me.token, 'Blocked Owner Game');
    await addToCollection(friend.token, game.id, 20);
    await seedBlock(me.id, friend.id);
    const res = await request(app).get(`/api/catalog/games/${game.id}/friends-who-own`).set(authed(me.token));
    expect(res.body.friendsWhoOwn).toHaveLength(0);
    expect(res.body.count).toBe(0);
  });
});

describe('CAT-07: contributions VIEW-ALL cursors + bio/game-thumb gaps', () => {
  it('a FRIEND reads the VIEW-ALL cards + games lists; the game rows carry a card thumb', async () => {
    const contributor = await seedUser();
    const friend = await seedUser();
    await makeFriends(contributor, friend);
    const game = await seedGame(contributor.token, 'Contributed Game');
    await publishCard(contributor.token, game.id, 3);

    const cards = await request(app).get(`/api/users/${contributor.id}/contributions/cards`).set(authed(friend.token));
    expect(cards.status).toBe(200);
    expect(cards.body.items.length).toBeGreaterThanOrEqual(1);
    expect(cards.body.nextCursor).toBeNull();

    const games = await request(app).get(`/api/users/${contributor.id}/contributions/games`).set(authed(friend.token));
    expect(games.status).toBe(200);
    expect(games.body.items[0]).toMatchObject({ gameId: game.id });
    expect(games.body.items[0].card).toBeDefined(); // the parvati game-thumb gap
  });

  it('CAT-10 (walk2 N1/N1b): REACHED is the DISTINCT-OTHERS count across the contributor’s games (not the per-game sum; excludes self)', async () => {
    const contributor = await seedUser();
    // Deliberately DISSIMILAR titles — near-identical ones trip the CAT-03 dedup warn (409).
    const g1 = await seedGame(contributor.token, 'Morrowind Chronicles');
    const g2 = await seedGame(contributor.token, 'Celeste Summit Dash');
    // Three users each own BOTH games — a naive per-game SUM would count them 6×; the dedup → 3.
    for (let i = 0; i < 3; i++) {
      const u = await seedUser();
      await addToCollection(u.token, g1.id);
      await addToCollection(u.token, g2.id);
    }
    // A user owning NEITHER of the contributor's games does not count (owns an unrelated game only).
    const outsider = await seedUser();
    const unrelated = await seedGame(outsider.token, 'Unrelated Reach Game');
    await addToCollection(outsider.token, unrelated.id);

    const asSelf = await request(app).get(`/api/users/${contributor.id}/contributions`).set(authed(contributor.token));
    expect(asSelf.status).toBe(200);
    expect(asSelf.body.stats.totalReached).toBe(3); // DEDUPED — not 6

    // CAT-10 (owner ruling N1b): REACHED = distinct OTHERS — the contributor owning their OWN game does
    // NOT count. Adding g1 to the contributor's own collection leaves REACHED unchanged at 3.
    await addToCollection(contributor.token, g1.id);
    const after = await request(app).get(`/api/users/${contributor.id}/contributions`).set(authed(contributor.token));
    expect(after.body.stats.totalReached).toBe(3);
  });

  it('the base contributions carries bio on the FRIEND shape but NOT the non-friend/limited shape', async () => {
    const contributor = await seedUser({ bio: 'I make cards' });
    const friend = await seedUser();
    const stranger = await seedUser();
    await makeFriends(contributor, friend);

    const asFriend = await request(app).get(`/api/users/${contributor.id}/contributions`).set(authed(friend.token));
    expect(asFriend.body.user.bio).toBe('I make cards');
    const asStranger = await request(app).get(`/api/users/${contributor.id}/contributions`).set(authed(stranger.token));
    expect('bio' in asStranger.body.user).toBe(false); // F06 — bio is friend-only
  });

  it('authz:get_contributions_cards / authz:get_contributions_games — a non-friend actorB → 403; a blocked actorB → 404', async () => {
    const contributor = await seedUser();
    const actorB = await seedUser();
    // Non-friend → 403 (the VIEW-ALL detail is friend-only, PROF-03).
    expect((await request(app).get(`/api/users/${contributor.id}/contributions/cards`).set(authed(actorB.token))).status).toBe(403);
    expect((await request(app).get(`/api/users/${contributor.id}/contributions/games`).set(authed(actorB.token))).status).toBe(403);
    // Blocked → the generic 404 collapse (MOD-09 — never distinguishes from unavailable).
    await seedBlock(contributor.id, actorB.id);
    expect((await request(app).get(`/api/users/${contributor.id}/contributions/cards`).set(authed(actorB.token))).status).toBe(404);
    expect((await request(app).get(`/api/users/${contributor.id}/contributions/games`).set(authed(actorB.token))).status).toBe(404);
  });
});

describe('WTP-03 · PROF-01 · F-19 (walk-fix): the /me pin expansions carry the M5 flattened card fields', () => {
  it('a pinned ADOPTED equipped card arrives with imageUrl (flattened-only — no foreign composition)', async () => {
    const designer = await seedUser();
    const me = await seedUser();
    const game = await seedGame(designer.token, 'Adopted Pin RPG');
    const cardId = await publishCard(designer.token, game.id, 21);
    const entryId = await addToCollection(me.token, game.id, 9);
    const adopt = await request(app).post(`/api/cards/${cardId}/adopt`).set(authed(me.token));
    expect(adopt.status).toBe(200);
    await equip(me.token, entryId, cardId);
    // Pin the game BOTH ways — nowPlaying and favouriteGame ride the same expansion (parity).
    await request(app).put('/api/me/now-playing').set(authed(me.token)).send({ gameId: game.id });
    await request(app).patch('/api/me').set(authed(me.token)).send({ favouriteGameId: game.id });

    const res = await request(app).get('/api/me').set(authed(me.token));
    expect(res.status).toBe(200);
    for (const pin of [res.body.nowPlaying, res.body.favouriteGame]) {
      expect(pin).toMatchObject({ gameId: game.id, hours: 9 });
      // The M5 flattened image rides the pin (the owner-walk bug: this was the default stub).
      expect(pin.card.id).toBe(cardId);
      expect(typeof pin.card.imageUrl).toBe('string');
      expect(pin.card.isCustom).toBe(true);
      // A FOREIGN (adopted) design never leaks its composition (OQ-122).
      expect('composition' in pin.card).toBe(false);
    }
  });

  it('a pinned OWN private card arrives with composition (+ null imageUrl — the owner renders live)', async () => {
    const me = await seedUser();
    const game = await seedGame(me.token, 'Private Pin RPG');
    const entryId = await addToCollection(me.token, game.id, 3);
    // Draft → save-private (no flatten until publish → imageUrl stays null; composition rides, owner-only).
    const draft = await request(app).post('/api/cards').set(authed(me.token)).send({ gameId: game.id, composition: closedComp(22) });
    const saved = await request(app).post(`/api/cards/${draft.body.id}/save-private`).set(authed(me.token));
    expect(saved.status).toBe(200);
    await equip(me.token, entryId, draft.body.id);
    await request(app).put('/api/me/now-playing').set(authed(me.token)).send({ gameId: game.id });

    const res = await request(app).get('/api/me').set(authed(me.token));
    expect(res.body.nowPlaying.card.id).toBe(draft.body.id);
    expect(res.body.nowPlaying.card.composition).toBeDefined(); // own design — renders live
    expect(res.body.nowPlaying.card.imageUrl).toBeNull(); // private — no flatten yet
  });
});

describe('decision 0047 (walk): published thumbs are PLATELESS; the regeneration backfill is idempotent', () => {
  it('a fresh publish stores a plateless thumb; regeneratePlatelessThumbs rewrites a stale plated one', async () => {
    const { getStorage } = await import('../../src/storage');
    const { flattenThumb, flattenComposition, RENDER_SIZES } = await import('../../src/render/flatten');
    const { regeneratePlatelessThumbs } = await import('../../src/db/regenerate-thumbs');

    const designer = await seedUser();
    const game = await seedGame(designer.token, 'Plateless Thumb RPG');
    const cardId = await publishCard(designer.token, game.id, 31);
    const storage = getStorage();
    const thumbKey = `cards/${cardId}/thumb.png`;

    // The render is deterministic — the idempotency the backfill's re-run safety stands on.
    const comp = closedComp(31) as unknown as Record<string, unknown>;
    const plateless = await flattenThumb(comp);
    expect((await flattenThumb(comp)).equals(plateless)).toBe(true);

    // The fresh publish already stored the PLATELESS thumb (the fixed flatten path). The full render
    // differs from it in MORE than size — a plated 288px render of the same composition also differs
    // (the plate bakes visible bytes), proven via the pre-fix-style plated thumb below.
    const stored = await storage.get(thumbKey);
    expect(stored).not.toBeNull();
    expect(stored!.equals(plateless)).toBe(true);

    // Simulate a PRE-FIX (stale) thumb at the key: any different bytes prove the backfill overwrites.
    // (The PLATE-presence half is proven structurally in render/thumb-plate.test.ts — here the concern
    // is the regeneration mechanics: rewrite-in-place at the same key, idempotent.)
    const { full: staleBytes } = await flattenComposition(comp);
    expect(RENDER_SIZES.full.w).toBeGreaterThan(RENDER_SIZES.thumb.w); // sanity — stale bytes differ
    await storage.put(thumbKey, staleBytes, 'image/png');
    expect((await storage.get(thumbKey))!.equals(plateless)).toBe(false); // now stale

    // The pre-regeneration wire URL (unbusted — the pre-fix client cache key).
    const viewer = await seedUser();
    const before = await request(app).get(`/api/games/${game.id}/cards`).set(authed(viewer.token));
    const urlBefore = before.body.items[0].thumbUrl as string;
    expect(urlBefore.includes('?')).toBe(false);

    // The backfill re-renders ONLY the thumb at the SAME key → plateless again — and CACHE-BUSTS the
    // stored thumb_url (?v=2): RN's Image cache is URL-keyed, so the content change must ride a new URL.
    const first = await regeneratePlatelessThumbs();
    expect(first.regenerated).toBeGreaterThanOrEqual(1);
    expect(first.failed).toBe(0);
    expect((await storage.get(thumbKey))!.equals(plateless)).toBe(true);

    // The regenerated thumb URL on the WIRE differs from the pre-fix one (the cache-bust assertion).
    const after = await request(app).get(`/api/games/${game.id}/cards`).set(authed(viewer.token));
    const urlAfter = after.body.items[0].thumbUrl as string;
    expect(urlAfter).toBe(`${urlBefore}?v=2`);
    expect(urlAfter).not.toBe(urlBefore);

    // The media route serves WITH the query param present (express.static is path-keyed — ?v=2 is free).
    const media = await request(app).get(urlAfter);
    expect(media.status).toBe(200);
    expect(media.headers['content-type']).toContain('image/png');
    expect(Buffer.from(media.body).equals(plateless)).toBe(true);

    // Idempotent — a second run rewrites identical bytes AND never double-appends the buster.
    const second = await regeneratePlatelessThumbs();
    expect(second.scanned).toBe(first.scanned);
    expect(second.failed).toBe(0);
    expect((await storage.get(thumbKey))!.equals(plateless)).toBe(true);
    const again = await request(app).get(`/api/games/${game.id}/cards`).set(authed(viewer.token));
    expect(again.body.items[0].thumbUrl).toBe(urlAfter); // still exactly one ?v=2
  });
});

describe('CARD-22 · OQ-146: the backfill snapshots labels for pre-M6 published cards (idempotent)', () => {
  it('backfillEquippedLabels populates empty labels from the composition, then no-ops on a re-run', async () => {
    const { getDb } = await import('../../src/db/client');
    const { cardDesigns } = await import('../../src/db/schema');
    const { eq } = await import('drizzle-orm');
    const { compositionHash } = await import('@ingame/shared');
    const { backfillEquippedLabels } = await import('../../src/db/backfill-equipped-labels');

    const designer = await seedUser();
    const game = await seedGame(designer.token, 'Backfill RPG');
    const comp = closedComp(9);
    // Simulate a PRE-M6 published card: labels default to {} (the column landed empty).
    const [row] = await getDb()
      .insert(cardDesigns)
      .values({
        ownerId: designer.id,
        gameId: game.id,
        name: 'Legacy',
        status: 'published',
        composition: comp as Record<string, unknown>,
        compositionHash: compositionHash(comp as never),
      })
      .returning();

    const first = await backfillEquippedLabels();
    expect(first.updated).toBeGreaterThanOrEqual(1);
    const [after] = await getDb().select().from(cardDesigns).where(eq(cardDesigns.id, row!.id));
    expect(after!.equippedLabels).toEqual(EXPECTED_EQUIPPED);

    // Idempotent — a second run changes nothing.
    const second = await backfillEquippedLabels();
    expect(second.updated).toBe(0);
  });
});
