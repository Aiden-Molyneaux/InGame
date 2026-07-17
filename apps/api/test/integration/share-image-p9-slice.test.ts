import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import { randomUUID } from 'node:crypto';
import { existsSync, statSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { PostgreSqlContainer, type StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import type { Express } from 'express';
import { COMPOSITION_SCHEMA_VERSION } from '@ingame/shared';

// M5 P9 — CARD-21 external share-image (decision 0073 §0.5 storage seam + the §1 render module).
// Covers WHO may share (owner/designer any status · an adopter · any authenticated user for a
// PUBLISHED card), the flatten-on-demand path for a never-published owner card, the storage cache
// (regenerate-when-absent + a genuine second-call hit), unpublish invalidation, and SYS-01/07 authz.
// Tags: CARD-21, SYS-01, SYS-07.
// Standing authz token covered here (actor-B / anon → 4xx): authz:card_share_image.

let container: StartedPostgreSqlContainer;
let app: Express;
let mediaDir: string;

const PW = 'Sup3rSecret!';
const PNG_MAGIC = '89504e470d0a1a0a';
let counter = 0;

function authed(token: string) {
  return { Authorization: `Bearer ${token}` };
}

async function registerUser() {
  counter += 1;
  const email = `p9_${counter}_${randomUUID().slice(0, 6)}@example.com`;
  const username = `p9user${counter}${randomUUID().slice(0, 4)}`;
  const res = await request(app)
    .post('/api/auth/register')
    .send({ email, username, password: PW, acceptedTerms: true });
  if (res.status !== 201) throw new Error(`registerUser failed: ${res.status}`);
  return { id: res.body.user.id as string, username, token: res.body.accessToken as string };
}

async function seedGame(token: string, name: string) {
  const genresRes = await request(app).get('/api/genres').set(authed(token));
  const rpg = genresRes.body.items.find((g: { name: string }) => g.name === 'RPG');
  const res = await request(app)
    .post('/api/catalog/games')
    .set(authed(token))
    .send({ name, genreIds: [rpg.id] });
  if (res.status !== 201) throw new Error(`seedGame failed: ${res.status}`);
  return res.body as { id: string; name: string };
}

function comp(seed = 0) {
  const elements: Array<Record<string, unknown>> = [];
  for (let i = 0; i < 3; i++) {
    elements.push({ type: 'rect', x: 0.5, y: 0.1 + (i + seed * 0.01) * 0.07, w: 0.4, h: 0.05, fill: '#e8c14a' });
  }
  return { schemaVersion: COMPOSITION_SCHEMA_VERSION, base: { gradient: ['#241a4d', '#0e0b1e'] }, elements };
}

async function createDraft(token: string, gameId: string, seed = 0) {
  const res = await request(app)
    .post('/api/cards')
    .set(authed(token))
    .send({ gameId, composition: comp(seed) });
  if (res.status !== 201) throw new Error(`createDraft failed: ${res.status} ${JSON.stringify(res.body)}`);
  return res.body as { id: string; status: string };
}

/** Draft → private (never published — the flatten-on-demand share path). */
async function createPrivateCard(token: string, gameId: string, seed = 0) {
  const draft = await createDraft(token, gameId, seed);
  const res = await request(app).post(`/api/cards/${draft.id}/save-private`).set(authed(token));
  if (res.status !== 200) throw new Error(`save-private failed: ${res.status} ${JSON.stringify(res.body)}`);
  return draft.id as string;
}

async function publishFresh(token: string, gameId: string, seed = 0) {
  const draft = await createDraft(token, gameId, seed);
  const res = await request(app).post(`/api/cards/${draft.id}/publish`).set(authed(token));
  if (res.status !== 200) throw new Error(`publish failed: ${res.status} ${JSON.stringify(res.body)}`);
  return draft.id as string;
}

function shareImage(token: string, cardId: string) {
  return request(app).get(`/api/cards/${cardId}/share-image`).set(authed(token));
}

function assertPng(res: request.Response) {
  expect(res.status).toBe(200);
  expect(res.headers['content-type']).toMatch(/image\/png/);
  const bytes: Buffer = Buffer.isBuffer(res.body) ? res.body : Buffer.from(res.body);
  expect(bytes.subarray(0, 8).toString('hex')).toBe(PNG_MAGIC);
}

beforeAll(async () => {
  container = await new PostgreSqlContainer('postgres:16-alpine').start();
  process.env.DATABASE_URL = container.getConnectionUri();
  process.env.DISPOSABLE_DB = '1';
  process.env.JWT_SIGNING_SECRET = 'test-signing-secret-at-least-16-chars-long';
  mediaDir = mkdtempSync(join(tmpdir(), 'ingame-p9-media-'));
  process.env.MEDIA_DIR = mediaDir;
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

describe('CARD-21: WHO may share', () => {
  it('the owner shares their OWN private (never-published) card — flattened on demand, no stored full.png needed', async () => {
    const a = await registerUser();
    const game = await seedGame(a.token, 'Share Owner RPG');
    const cardId = await createPrivateCard(a.token, game.id, 1);
    expect(existsSync(join(mediaDir, 'cards', cardId, 'full.png'))).toBe(false); // never published

    const res = await shareImage(a.token, cardId);
    assertPng(res);
    expect(existsSync(join(mediaDir, 'share', `${cardId}.png`))).toBe(true); // now cached
  });

  it('a non-owner CANNOT share another user’s private card — 404, indistinguishable from unknown (authz:card_share_image)', async () => {
    const a = await registerUser();
    const b = await registerUser();
    const game = await seedGame(a.token, 'Share Private Guard RPG');
    const cardId = await createPrivateCard(a.token, game.id, 2);

    const stolen = await shareImage(b.token, cardId); // actor-B
    expect(stolen.status).toBe(404);
    const unknown = await shareImage(b.token, randomUUID());
    expect(unknown.status).toBe(404); // same shape — no existence oracle
  });

  it('ANY authenticated user can share a PUBLISHED card (it is public by design)', async () => {
    const a = await registerUser();
    const b = await registerUser();
    const game = await seedGame(a.token, 'Share Published RPG');
    const cardId = await publishFresh(a.token, game.id, 3);
    expect(existsSync(join(mediaDir, 'cards', cardId, 'full.png'))).toBe(true); // publish flattened it

    const res = await shareImage(b.token, cardId);
    assertPng(res);
  });

  it('an adopter can share their adopted card even after the designer unpublishes it (MOD-08 pattern)', async () => {
    const a = await registerUser();
    const b = await registerUser();
    const c = await registerUser();
    const game = await seedGame(a.token, 'Share Adopter RPG');
    const cardId = await publishFresh(a.token, game.id, 4);
    const adopt = await request(app).post(`/api/cards/${cardId}/adopt`).set(authed(b.token));
    expect(adopt.status).toBe(200);

    await request(app).post(`/api/cards/${cardId}/unpublish`).set(authed(a.token));

    const adopterRes = await shareImage(b.token, cardId);
    assertPng(adopterRes); // B kept access via the grant
    const strangerRes = await shareImage(c.token, cardId);
    expect(strangerRes.status).toBe(404); // C never adopted and it's no longer published
  });

  it('SYS-07: an anonymous request is refused — 401', async () => {
    const anon = await request(app).get(`/api/cards/${randomUUID()}/share-image`);
    expect(anon.status).toBe(401);
  });
});

describe('CARD-21: storage cache (regenerate-when-absent, genuine hit on repeat)', () => {
  it('a second call is served from the cache — the file is not rewritten (mtime unchanged)', async () => {
    const a = await registerUser();
    const b = await registerUser();
    const game = await seedGame(a.token, 'Share Cache RPG');
    const cardId = await publishFresh(a.token, game.id, 5);

    const first = await shareImage(b.token, cardId);
    assertPng(first);
    const path = join(mediaDir, 'share', `${cardId}.png`);
    expect(existsSync(path)).toBe(true);
    const mtimeAfterFirst = statSync(path).mtimeMs;

    const second = await shareImage(b.token, cardId);
    assertPng(second);
    expect(statSync(path).mtimeMs).toBe(mtimeAfterFirst); // never rewritten — a genuine cache hit
    expect(Buffer.from(second.body).equals(Buffer.from(first.body))).toBe(true);
  });
});

describe('CARD-21: share images are route-only — never served by the unauthenticated /media mount (P9 review ruling)', () => {
  it('a PRIVATE card’s cached share image is unreachable at its would-be /media path (anon AND another user); the authz’d route still serves it', async () => {
    const a = await registerUser();
    const b = await registerUser();
    const game = await seedGame(a.token, 'Share Mount Private RPG');
    const cardId = await createPrivateCard(a.token, game.id, 8);

    const owned = await shareImage(a.token, cardId); // populate the cache via the owner
    assertPng(owned);
    expect(existsSync(join(mediaDir, 'share', `${cardId}.png`))).toBe(true); // cached on disk…

    const mediaPath = `/media/share/${cardId}.png`;
    const anon = await request(app).get(mediaPath); // …but the static mount does not serve it
    expect(anon.status).toBe(404);
    const otherUser = await request(app).get(mediaPath).set(authed(b.token));
    expect(otherUser.status).toBe(404); // an auth header changes nothing — the mount just isn't there

    assertPng(await shareImage(a.token, cardId)); // the owner's route access is unaffected
  });

  it('a PUBLISHED card’s share image is ALSO route-only (one rule for all cards); the public full.png stays statically served', async () => {
    const a = await registerUser();
    const b = await registerUser();
    const game = await seedGame(a.token, 'Share Mount Published RPG');
    const cardId = await publishFresh(a.token, game.id, 9);

    assertPng(await shareImage(b.token, cardId)); // any authenticated user, via the route
    expect(existsSync(join(mediaDir, 'share', `${cardId}.png`))).toBe(true);

    const mediaPath = `/media/share/${cardId}.png`;
    expect((await request(app).get(mediaPath)).status).toBe(404); // anon direct GET
    expect((await request(app).get(mediaPath).set(authed(b.token))).status).toBe(404); // authed direct GET

    // sanity: scoping the mount did NOT break the public-by-design artifacts (decision 0073 §0.5).
    const publicFull = await request(app).get(`/media/cards/${cardId}/full.png`);
    expect(publicFull.status).toBe(200);
  });
});

describe('CARD-21: unpublish invalidates the cached share image', () => {
  it('unpublishing a card best-effort deletes its cached share.png', async () => {
    const a = await registerUser();
    const b = await registerUser();
    const game = await seedGame(a.token, 'Share Invalidate RPG');
    const cardId = await publishFresh(a.token, game.id, 6);

    await shareImage(b.token, cardId); // populate the cache
    const path = join(mediaDir, 'share', `${cardId}.png`);
    expect(existsSync(path)).toBe(true);

    const un = await request(app).post(`/api/cards/${cardId}/unpublish`).set(authed(a.token));
    expect(un.status).toBe(200);
    expect(existsSync(path)).toBe(false); // invalidated

    // the owner can still reshare their own (now-private) card — it regenerates on demand.
    const reshared = await shareImage(a.token, cardId);
    assertPng(reshared);
  });

  it('deleting a never-adopted published card best-effort deletes its cached share.png', async () => {
    const a = await registerUser();
    const game = await seedGame(a.token, 'Share Delete RPG');
    const cardId = await publishFresh(a.token, game.id, 7);
    await shareImage(a.token, cardId);
    const path = join(mediaDir, 'share', `${cardId}.png`);
    expect(existsSync(path)).toBe(true);

    const del = await request(app).delete(`/api/cards/${cardId}`).set(authed(a.token));
    expect(del.status).toBe(200);
    expect(existsSync(path)).toBe(false);
  });
});
