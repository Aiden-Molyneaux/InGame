import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import { randomUUID } from 'node:crypto';
import { existsSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { PostgreSqlContainer, type StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import type { Express } from 'express';
import { COMPOSITION_SCHEMA_VERSION } from '@ingame/shared';

// M5 §1 — the PUBLISH-THREAD SPIKE at the HTTP boundary (decision 0073 §1; supertest + REAL Postgres +
// the real server-side skia flatten + the local-disk StorageProvider). Proves the whole thread
// end-to-end cross-user: A publishes (flatten → store → status=published + urls) → the stored PNGs are
// served over /media → B reads the OQ-122 gallery (published only, NEVER composition) → B adopts free
// (grant + count) → repeat-adopt is refused (ALREADY_ADOPTED) → A's drafts never leak into the gallery.
// Also the standing SYS-07 actor-B 4xx guards on the three new routes.
// Tags: CARD-04/15/20, ECON-03, OQ-122, SYS-01/02/07, F06.

let container: StartedPostgreSqlContainer;
let app: Express;
let mediaDir: string;

const PW = 'Sup3rSecret!';
let counter = 0;

function authed(token: string) {
  return { Authorization: `Bearer ${token}` };
}

async function registerUser() {
  counter += 1;
  const email = `pub${counter}_${randomUUID().slice(0, 6)}@example.com`;
  const username = `pubuser${counter}${randomUUID().slice(0, 4)}`;
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

function composition(elements = 3) {
  return {
    schemaVersion: COMPOSITION_SCHEMA_VERSION,
    base: { gradient: ['#241a4d', '#0e0b1e'] },
    elements: Array.from({ length: elements }, (_, i) => ({
      type: 'rect',
      x: 0.5,
      y: 0.1 + i * 0.08,
      w: 0.4,
      h: 0.05,
      fill: '#e8c14a',
    })),
    frame: { color: '#e8c14a', width: 0.012 },
  };
}

/** A → a committed PRIVATE card ready to publish. */
async function makePrivateCard(token: string, gameId: string, name?: string) {
  const created = await request(app)
    .post('/api/cards')
    .set(authed(token))
    .send({ gameId, composition: composition(), ...(name ? { name } : {}) });
  if (created.status !== 201) throw new Error(`createDraft failed: ${created.status}`);
  const saved = await request(app)
    .post(`/api/cards/${created.body.id}/save-private`)
    .set(authed(token));
  if (saved.status !== 200) throw new Error(`savePrivate failed: ${saved.status}`);
  return created.body as { id: string; name: string };
}

beforeAll(async () => {
  container = await new PostgreSqlContainer('postgres:16-alpine').start();
  process.env.DATABASE_URL = container.getConnectionUri();
  process.env.DISPOSABLE_DB = '1';
  process.env.JWT_SIGNING_SECRET = 'test-signing-secret-at-least-16-chars-long';
  // Isolate the flattened-render media root to a throwaway temp dir (the static mount + the storage
  // singleton both read MEDIA_DIR, so they agree). Set BEFORE createApp / the first getStorage().
  mediaDir = mkdtempSync(join(tmpdir(), 'ingame-media-'));
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
  const { clearRuleOverrides } = await import('../../src/config/rate-limits');
  clearRuleOverrides();
});

describe('CARD-15/CARD-04 spike: publish→gallery→adopt (the full thread, cross-user)', () => {
  it('threads end-to-end: A publishes → /media serves the flatten → B reads the gallery → B adopts free → repeat 409', async () => {
    const a = await registerUser();
    const b = await registerUser();
    const game = await seedGame(a.token, 'Publish Thread RPG');
    const card = await makePrivateCard(a.token, game.id, 'Aurora');

    // ── 1. A publishes: flatten → store → status=published + imageUrl/thumbUrl set ──────────────────
    const published = await request(app)
      .post(`/api/cards/${card.id}/publish`)
      .set(authed(a.token));
    expect(published.status).toBe(200);
    expect(published.body.status).toBe('published');
    expect(published.body.imageUrl).toMatch(/^\/media\/cards\/.+\/full\.png$/);
    expect(published.body.thumbUrl).toMatch(/^\/media\/cards\/.+\/thumb\.png$/);

    // the flattened PNGs exist on disk AND are served (unauthenticated) over /media ───────────────────
    expect(existsSync(join(mediaDir, 'cards', card.id, 'full.png'))).toBe(true);
    expect(existsSync(join(mediaDir, 'cards', card.id, 'thumb.png'))).toBe(true);
    const servedFull = await request(app).get(published.body.imageUrl);
    expect(servedFull.status).toBe(200);
    expect(servedFull.headers['content-type']).toContain('image/png');
    expect(servedFull.body.length).toBeGreaterThan(100); // real PNG bytes, not an empty file
    const servedThumb = await request(app).get(published.body.thumbUrl);
    expect(servedThumb.status).toBe(200);

    // ── 2. B (a DIFFERENT user) reads the gallery: published card visible, NO composition on the wire ─
    const gallery = await request(app).get(`/api/games/${game.id}/cards`).set(authed(b.token));
    expect(gallery.status).toBe(200);
    expect(gallery.body.items).toHaveLength(1);
    const galleryCard = gallery.body.items[0];
    expect(galleryCard.id).toBe(card.id);
    expect(galleryCard.name).toBe('Aurora');
    expect(galleryCard.imageUrl).toBe(published.body.imageUrl);
    expect(galleryCard.designer).toEqual({ userId: a.id, username: a.username });
    expect(galleryCard.adoptionCount).toBe(0);
    // the OQ-122 guard: the private layers NEVER cross the wire (flattened images only).
    expect('composition' in galleryCard).toBe(false);
    expect(JSON.stringify(gallery.body)).not.toContain('"composition"');

    // ── 3. B adopts free → grant + count=1 ──────────────────────────────────────────────────────────
    const adopt = await request(app).post(`/api/cards/${card.id}/adopt`).set(authed(b.token));
    expect(adopt.status).toBe(200);
    expect(adopt.body.adopted).toBe(true);
    expect(adopt.body.card.adoptionCount).toBe(1);

    const afterAdopt = await request(app).get(`/api/games/${game.id}/cards`).set(authed(b.token));
    expect(afterAdopt.body.items[0].adoptionCount).toBe(1); // the derived public count moved

    // ── 4. B repeat-adopt → 409 ALREADY_ADOPTED (idempotent; still exactly one grant) ───────────────
    const again = await request(app).post(`/api/cards/${card.id}/adopt`).set(authed(b.token));
    expect(again.status).toBe(409);
    expect(again.body.error.code).toBe('ALREADY_ADOPTED');
    const stillOne = await request(app).get(`/api/games/${game.id}/cards`).set(authed(b.token));
    expect(stillOne.body.items[0].adoptionCount).toBe(1);
  });

  it("A's OWN drafts + private cards never appear in the gallery — published only (OQ-122)", async () => {
    const a = await registerUser();
    const b = await registerUser();
    const game = await seedGame(a.token, 'Draft Leak RPG');

    // a bare draft (never saved) + a private (saved, not published) + one published
    await request(app)
      .post('/api/cards')
      .set(authed(a.token))
      .send({ gameId: game.id, composition: composition(), name: 'Bare Draft' });
    await makePrivateCard(a.token, game.id, 'Private Only');
    const toPublish = await makePrivateCard(a.token, game.id, 'The Published One');
    await request(app).post(`/api/cards/${toPublish.id}/publish`).set(authed(a.token));

    const gallery = await request(app).get(`/api/games/${game.id}/cards`).set(authed(b.token));
    expect(gallery.status).toBe(200);
    expect(gallery.body.items).toHaveLength(1);
    expect(gallery.body.items[0].name).toBe('The Published One');
  });

  it('NOT_PUBLISHED: adopting a private (unpublished) card → 409, no grant lands', async () => {
    const a = await registerUser();
    const b = await registerUser();
    const game = await seedGame(a.token, 'Not Published RPG');
    const priv = await makePrivateCard(a.token, game.id, 'Still Private');

    const adopt = await request(app).post(`/api/cards/${priv.id}/adopt`).set(authed(b.token));
    expect(adopt.status).toBe(409);
    expect(adopt.body.error.code).toBe('NOT_PUBLISHED');
  });
});

describe('SYS-07: actor-B 4xx on the new publish-thread routes (SYS-01 — no existence oracle)', () => {
  it('authz:card_publish — actor-B publishing actor-A’s card → 404; A’s card stays private', async () => {
    const a = await registerUser();
    const b = await registerUser();
    const game = await seedGame(a.token, 'Publish Authz RPG');
    const card = await makePrivateCard(a.token, game.id);

    const stolen = await request(app).post(`/api/cards/${card.id}/publish`).set(authed(b.token));
    expect(stolen.status).toBe(404); // actor-B gets the same nothing an unknown id gets

    const mine = await request(app).get('/api/me/cards').set(authed(a.token));
    expect(mine.body.items[0].status).toBe('private'); // A's card did not transition
  });

  it('authz:card_adopt — an unauthenticated adopt → 401 (resolvePrincipal gate)', async () => {
    const a = await registerUser();
    const game = await seedGame(a.token, 'Adopt Authz RPG');
    const card = await makePrivateCard(a.token, game.id);
    await request(app).post(`/api/cards/${card.id}/publish`).set(authed(a.token));

    const anon = await request(app).post(`/api/cards/${card.id}/adopt`); // no bearer → actor-B is nobody
    expect(anon.status).toBe(401);
  });

  it('authz:game_gallery_read — an unauthenticated gallery read → 401 (F06 cross-principal read is gated)', async () => {
    const a = await registerUser();
    const game = await seedGame(a.token, 'Gallery Authz RPG');
    const anon = await request(app).get(`/api/games/${game.id}/cards`); // actor-B with no principal
    expect(anon.status).toBe(401);
  });
});
