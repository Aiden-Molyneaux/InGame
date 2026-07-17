import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import { randomUUID } from 'node:crypto';
import { PostgreSqlContainer, type StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import type { Express } from 'express';
import { DEVICE_LOOKS_MAX } from '../../src/services/device-service';

// DEV-01..05 — the M4 §3.5 Device editor at the HTTP boundary (decision 0030; supertest + REAL
// Postgres). device_configs + device_looks are USER-OWNED: every write is a G-D re-fire target — the
// standing actor-B 4xx tests (SYS-01/07), the GET-returns-defaults-without-creating-a-row rule
// (DEV-03), the ARCH-3 partial-upsert pipeline, the DEV-03 zone/bounds triple (server layer), and the
// DEV-05 saved-looks cap (LOOK_CAP_REACHED). Tags: DEV-01/02/03/04/05, SYS-01/02/04/07.

let container: StartedPostgreSqlContainer;
let app: Express;

const PW = 'Sup3rSecret!';
let counter = 0;

function authed(token: string) {
  return { Authorization: `Bearer ${token}` };
}

async function registerUser() {
  counter += 1;
  const email = `dev${counter}_${randomUUID().slice(0, 6)}@example.com`;
  const username = `devuser${counter}${randomUUID().slice(0, 4)}`;
  const res = await request(app)
    .post('/api/auth/register')
    .send({ email, username, password: PW, acceptedTerms: true });
  if (res.status !== 201) throw new Error(`registerUser failed: ${res.status}`);
  return { id: res.body.user.id as string, username, token: res.body.accessToken as string };
}

function sticker(over: Record<string, unknown> = {}) {
  return {
    id: randomUUID(),
    assetId: 'rocket',
    zone: 'forehead',
    x: 0.5,
    y: 0.5,
    scale: 1,
    rotation: 0,
    ...over,
  };
}

function composition(stickers: Array<Record<string, unknown>> = []) {
  return { version: 1, stickers };
}

async function patchDevice(token: string, body: Record<string, unknown>) {
  return request(app).patch('/api/me/device').set(authed(token)).send(body);
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
  const { clearRuleOverrides } = await import('../../src/config/rate-limits');
  clearRuleOverrides();
});

describe('SYS-07: actor-B 4xx on every device/look mutation (SYS-01 — no existence oracle)', () => {
  it('authz:device_update — an unauthenticated actor → 401; a smuggled userId → 422 (SYS-01)', async () => {
    const a = await registerUser();
    const anon = await request(app).patch('/api/me/device').send({ activeShellId: 'grape' });
    expect(anon.status).toBe(401);
    const smuggled = await patchDevice(a.token, { activeShellId: 'grape', userId: randomUUID() });
    expect(smuggled.status).toBe(422); // .strict() refuses the smuggled owner key
  });

  it('authz:device_look_create — an unauthenticated actor → 401; a smuggled facet → 422 (SYS-01)', async () => {
    await registerUser();
    const anon = await request(app).post('/api/me/device/looks').send({});
    expect(anon.status).toBe(401);
    const a = await registerUser();
    const smuggled = await request(app)
      .post('/api/me/device/looks')
      .set(authed(a.token))
      .send({ activeShellId: 'grape' }); // SAVE CURRENT snapshots server-side — the body is closed
    expect(smuggled.status).toBe(422);
  });

  it('authz:device_look_delete — actor-B DELETing actor-A’s look → 404, the look survives', async () => {
    const a = await registerUser();
    const b = await registerUser();
    const created = await request(app).post('/api/me/device/looks').set(authed(a.token)).send({});
    expect(created.status).toBe(201);
    const stolen = await request(app)
      .delete(`/api/me/device/looks/${created.body.id}`)
      .set(authed(b.token));
    expect(stolen.status).toBe(404); // actor-B → the same 404 as an unknown id
    const mine = await request(app).get('/api/me/device/looks').set(authed(a.token));
    expect(mine.body).toHaveLength(1); // A's look is untouched
  });
});

describe('DEV-03: GET /me/device returns the free defaults WITHOUT creating a row', () => {
  it('a fresh user reads teal · midnight · empty and no device_configs row is written', async () => {
    const a = await registerUser();
    const res = await request(app).get('/api/me/device').set(authed(a.token));
    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      activeShellId: 'teal',
      screenThemeId: 'midnight',
      stickerComposition: { version: 1, stickers: [] },
    });

    // Prove the read did not persist a row (the DEV-03 default-render rule, not a lazy create).
    const { getDb } = await import('../../src/db/client');
    const { deviceConfigs } = await import('../../src/db/schema');
    const { eq, count } = await import('drizzle-orm');
    const rows = await getDb()
      .select({ n: count() })
      .from(deviceConfigs)
      .where(eq(deviceConfigs.userId, a.id));
    expect(Number(rows[0]!.n)).toBe(0);

    const looks = await request(app).get('/api/me/device/looks').set(authed(a.token));
    expect(looks.body).toEqual([]);
  });
});

describe('ARCH 3: PATCH /me/device — the one write pipeline (partial upsert)', () => {
  it('partial patches merge: shell-only, then theme-only, then stickers — unnamed facets ride along', async () => {
    const a = await registerUser();

    const shell = await patchDevice(a.token, { activeShellId: 'grape' });
    expect(shell.status).toBe(200);
    expect(shell.body).toEqual({
      activeShellId: 'grape',
      screenThemeId: 'midnight', // default preserved
      stickerComposition: { version: 1, stickers: [] },
    });

    const theme = await patchDevice(a.token, { screenThemeId: 'deep-sea' });
    expect(theme.status).toBe(200);
    expect(theme.body.activeShellId).toBe('grape'); // the prior shell rides along (upsert, not replace)
    expect(theme.body.screenThemeId).toBe('deep-sea');

    const s = sticker({ zone: 'chin', x: 0.5, y: 0.5 });
    const stickers = await patchDevice(a.token, { stickerComposition: composition([s]) });
    expect(stickers.status).toBe(200);
    expect(stickers.body.stickerComposition.stickers).toHaveLength(1);

    // GET reflects the fully-merged live device.
    const got = await request(app).get('/api/me/device').set(authed(a.token));
    expect(got.body.activeShellId).toBe('grape');
    expect(got.body.screenThemeId).toBe('deep-sea');
    expect(got.body.stickerComposition.stickers[0].assetId).toBe('rocket');
  });

  it('an empty PATCH body → 422 (no silent no-op mutation, rule-5)', async () => {
    const a = await registerUser();
    const empty = await patchDevice(a.token, {});
    expect(empty.status).toBe(422);
  });
});

describe('DEV-03: the server zone/bounds triple (layer 3) — 422 on every out-of-shape write', () => {
  it('field-range refusals: scale beyond the clamp, rotation out of range (schema boundary)', async () => {
    const a = await registerUser();
    const badScale = await patchDevice(a.token, {
      stickerComposition: composition([sticker({ scale: 2.1 })]),
    });
    expect(badScale.status).toBe(422);
    const badRot = await patchDevice(a.token, {
      stickerComposition: composition([sticker({ rotation: 200 })]),
    });
    expect(badRot.status).toBe(422);
  });

  it('count caps: > 6 in one zone and > 12 total are both refused (schema boundary)', async () => {
    const a = await registerUser();
    const sevenForehead = Array.from({ length: 7 }, () => sticker({ zone: 'forehead' }));
    const perZone = await patchDevice(a.token, { stickerComposition: composition(sevenForehead) });
    expect(perZone.status).toBe(422);

    const thirteen = [
      ...Array.from({ length: 6 }, () => sticker({ zone: 'forehead' })),
      ...Array.from({ length: 7 }, () => sticker({ zone: 'chin' })),
    ];
    const total = await patchDevice(a.token, { stickerComposition: composition(thirteen) });
    expect(total.status).toBe(422);
  });

  it('rotated-bounds refusals: an out-of-zone x and a scaled+rotated overflow → 422 with a per-sticker path', async () => {
    const a = await registerUser();
    // In-range x (≤1) but the decal half-extent pushes its AABB past the zone edge.
    const outOfZone = await patchDevice(a.token, {
      stickerComposition: composition([sticker({ x: 0.99 })]),
    });
    expect(outOfZone.status).toBe(422);
    expect(outOfZone.body.error.details[0].path).toBe('stickerComposition.stickers[0]');

    // A full-scale decal rotated 45° cannot fit vertically anywhere (0.36·√2 > 0.5).
    const rotatedOverflow = await patchDevice(a.token, {
      stickerComposition: composition([sticker({ scale: 2, rotation: 45 })]),
    });
    expect(rotatedOverflow.status).toBe(422);

    // A well-placed sticker is accepted (the fit test is not over-eager).
    const ok = await patchDevice(a.token, {
      stickerComposition: composition([sticker({ zone: 'forehead', x: 0.5, y: 0.5, scale: 1 })]),
    });
    expect(ok.status).toBe(200);
  });
});

describe('DEV-05: saved looks — SAVE CURRENT, list, delete, and the cap', () => {
  it('SAVE CURRENT snapshots the live combo; GET lists newest-first; delete works + is idempotent-safe', async () => {
    const a = await registerUser();
    await patchDevice(a.token, { activeShellId: 'carbon', screenThemeId: 'berry' });

    const saved = await request(app).post('/api/me/device/looks').set(authed(a.token)).send({});
    expect(saved.status).toBe(201);
    expect(saved.body.activeShellId).toBe('carbon'); // snapshotted from the live config
    expect(saved.body.screenThemeId).toBe('berry');
    expect(saved.body.id).toBeDefined();

    const list = await request(app).get('/api/me/device/looks').set(authed(a.token));
    expect(list.body).toHaveLength(1);
    expect(list.body[0].id).toBe(saved.body.id);

    const del = await request(app)
      .delete(`/api/me/device/looks/${saved.body.id}`)
      .set(authed(a.token));
    expect(del.status).toBe(200);
    expect(del.body.ok).toBe(true);
    // A second delete of the now-gone look → 404 (idempotent-safe, no crash / no oracle).
    const again = await request(app)
      .delete(`/api/me/device/looks/${saved.body.id}`)
      .set(authed(a.token));
    expect(again.status).toBe(404);
  });

  it('SAVE CURRENT on a fresh user snapshots the DEFAULTS (no live row required)', async () => {
    const a = await registerUser();
    const saved = await request(app).post('/api/me/device/looks').set(authed(a.token)).send({});
    expect(saved.status).toBe(201);
    expect(saved.body.activeShellId).toBe('teal');
    expect(saved.body.screenThemeId).toBe('midnight');
    expect(saved.body.stickerComposition).toEqual({ version: 1, stickers: [] });
  });

  it(`the cap: look #${DEVICE_LOOKS_MAX + 1} → 409 LOOK_CAP_REACHED (the 409 PRESET_LIMIT sibling)`, async () => {
    const a = await registerUser();
    for (let i = 0; i < DEVICE_LOOKS_MAX; i++) {
      const res = await request(app).post('/api/me/device/looks').set(authed(a.token)).send({});
      expect(res.status).toBe(201);
    }
    const over = await request(app).post('/api/me/device/looks').set(authed(a.token)).send({});
    expect(over.status).toBe(409);
    expect(over.body.error.code).toBe('LOOK_CAP_REACHED');
  });

  it('an unknown lookId (well-formed uuid) → 404 (no existence oracle)', async () => {
    const a = await registerUser();
    const res = await request(app)
      .delete(`/api/me/device/looks/${randomUUID()}`)
      .set(authed(a.token));
    expect(res.status).toBe(404);
  });
});
