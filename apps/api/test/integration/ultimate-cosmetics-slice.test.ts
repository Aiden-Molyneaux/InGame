import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { randomUUID } from 'node:crypto';
import { readFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { PostgreSqlContainer, type StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import type { Express } from 'express';
import { COMPOSITION_SCHEMA_VERSION, cosmeticListItemSchema } from '@ingame/shared';
import { overrideRuleForTest } from '../../src/config/rate-limits';

// M6 W-5 — the Ultimate colour-customizable cosmetics SERVER slice (COSM-05 · decision 0080 ·
// api-contract 0.77). Proves: the three 0080-minted 10-PX SKUs surface through GET /cosmetics (+ the
// GET /store serializer stays schema-consistent); acquire charges the ECON-01 ultimate band (10 PX,
// idempotent, INSUFFICIENT_BALANCE {shortBy} vs 10); the adopt-sheet `components` rows carry `tier`;
// adopt-reconcile prices an unowned ultimate component at its full 10 PX with NO pricing-code change
// (0080 ruling 4 — it is just a catalog entry in the missing-sum); the CARD-22 equipped readout labels
// the ultimate SKU colour-independently; and the CARD-15 flatten colour-force backstop renders a
// recoloured NON-flagged premium frame byte-identical to its registry colour (while free recolours
// honestly differ). Tags: COSM-05, ECON-01, ECON-03, ECON-04, CARD-15, CARD-22, COSM-03, SYS-01.

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
  const email = `w5_${counter}_${randomUUID().slice(0, 6)}@example.com`;
  const username = `w5user${counter}${randomUUID().slice(0, 4)}`;
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

/** 3 filler rects (clears the CARD-19 min-complexity floor); geometry varies by seed so hashes differ. */
function baseElements(seed = 0): Array<Record<string, unknown>> {
  const elements: Array<Record<string, unknown>> = [];
  for (let i = 0; i < 3; i++) {
    elements.push({ type: 'rect', x: 0.5, y: 0.1 + (i + seed * 0.01) * 0.07, w: 0.4, h: 0.05, fill: '#e8c14a' });
  }
  return elements;
}

function comp(extra: Record<string, unknown>, seed = 0) {
  return {
    schemaVersion: COMPOSITION_SCHEMA_VERSION,
    base: { gradient: ['#241a4d', '#0e0b1e'] },
    elements: baseElements(seed),
    ...extra,
  };
}

async function publishCard(token: string, gameId: string, composition: object) {
  const draft = await request(app).post('/api/cards').set(authed(token)).send({ gameId, composition });
  if (draft.status !== 201) throw new Error(`draft failed: ${draft.status} ${JSON.stringify(draft.body)}`);
  const pub = await request(app).post(`/api/cards/${draft.body.id}/publish`).set(authed(token));
  if (pub.status !== 200) throw new Error(`publish failed: ${pub.status} ${JSON.stringify(pub.body)}`);
  return { id: draft.body.id as string, view: pub.body };
}

async function acquire(token: string, cosmeticId: string, expectStatus = 200) {
  const res = await request(app).post(`/api/cosmetics/${cosmeticId}/acquire`).set(authed(token));
  expect(res.status, JSON.stringify(res.body)).toBe(expectStatus);
  return res;
}

beforeAll(async () => {
  container = await new PostgreSqlContainer('postgres:16-alpine').start();
  process.env.DATABASE_URL = container.getConnectionUri();
  process.env.DISPOSABLE_DB = '1';
  process.env.JWT_SIGNING_SECRET = 'test-signing-secret-at-least-16-chars-long';
  mediaDir = mkdtempSync(join(tmpdir(), 'ingame-w5-media-'));
  process.env.MEDIA_DIR = mediaDir;
  const { runMigrations } = await import('../../src/db/migrate');
  await runMigrations();
  const { createApp } = await import('../../src/app');
  app = createApp();
  // This slice publishes several cards from one designer and registers ~10 actors — lift the
  // CARD-19 publish buckets + the register bucket out of the way (rate limits are not under test).
  overrideRuleForTest('cards:publish', { limit: 1000, windowMs: 60_000 });
  overrideRuleForTest('cards:publish:daily', { limit: 1000, windowMs: 86_400_000 });
  overrideRuleForTest('auth:register', { limit: 1000, windowMs: 60_000 });
}, 120_000);

afterAll(async () => {
  const { closeDb } = await import('../../src/db/client');
  await closeDb();
  if (container) await container.stop();
});

describe('COSM-05: GET /cosmetics carries the three ultimate SKUs with colorCustomizable', () => {
  it('each SKU reads tier ultimate · price 10 · colorCustomizable true; base designs untouched; rows schema-valid', async () => {
    const user = await registerUser();
    const res = await request(app).get('/api/cosmetics').set(authed(user.token));
    expect(res.status).toBe(200);
    const byId = new Map<string, Record<string, unknown>>(
      res.body.items.map((i: { id: string; type: string }) => [`${i.type}:${i.id}`, i]),
    );
    for (const [type, id, name] of [
      ['frame', 'marquee-ultimate', 'MARQUEE ULTIMATE'],
      ['nameplate', 'brass-ultimate', 'BRASS ULTIMATE'],
      ['font', 'pacifico-ultimate', 'SCRIPT ULTIMATE'],
    ] as const) {
      const item = byId.get(`${type}:${id}`);
      expect(item, id).toBeTruthy();
      expect(item).toMatchObject({ id, type, name, tier: 'ultimate', price: 10, owned: false, colorCustomizable: true });
    }
    // 0080 ruling 2 — the base designs KEEP their tiers/prices and carry NO flag.
    expect(byId.get('frame:marquee')).toMatchObject({ tier: 'showpiece', price: 8 });
    expect(byId.get('frame:marquee')).not.toHaveProperty('colorCustomizable');
    expect(byId.get('nameplate:brass')).toMatchObject({ tier: 'standard', price: 3 });
    expect(byId.get('font:pacifico')).toMatchObject({ tier: 'standard', price: 3 });
    // a free item carries no flag and stays owned:true
    expect(byId.get('nameplate:slab')).toMatchObject({ owned: true });
    expect(byId.get('nameplate:slab')).not.toHaveProperty('colorCustomizable');
    // every row satisfies the shared cosmeticListItem contract (colorCustomizable admitted as `true` only)
    for (const item of res.body.items) expect(() => cosmeticListItemSchema.parse(item)).not.toThrow();
  });

  it('GET /store premiumCosmetics stays on the SAME cosmeticListItem shape (no ultimate in the featured seed at beta)', async () => {
    const user = await registerUser();
    const res = await request(app).get('/api/store').set(authed(user.token));
    expect(res.status).toBe(200);
    expect(res.body.premiumCosmetics.length).toBeGreaterThan(0);
    for (const item of res.body.premiumCosmetics) {
      expect(() => cosmeticListItemSchema.parse(item)).not.toThrow();
      // the featured seed is untouched by W-5 — the flag rides /store the day an ultimate SKU is featured
      expect(item).not.toHaveProperty('colorCustomizable');
    }
    const marquee = res.body.premiumCosmetics.find((i: { id: string }) => i.id === 'marquee');
    expect(marquee).toMatchObject({ tier: 'showpiece', price: 8 });
  });
});

describe('ECON-01/COSM-03: acquiring an ultimate SKU charges the 10-PX ultimate band', () => {
  it('charges 10 from the 10-PX starting grant; re-acquire is an idempotent no-op; entitlement listed', async () => {
    const user = await registerUser();
    const first = await acquire(user.token, 'brass-ultimate');
    expect(first.body).toMatchObject({ cosmeticId: 'brass-ultimate', paid: 10, balance: 0 });
    const again = await acquire(user.token, 'brass-ultimate');
    expect(again.body).toMatchObject({ cosmeticId: 'brass-ultimate', paid: 0, balance: 0 });
    const ent = await request(app).get('/api/me/entitlements').set(authed(user.token));
    expect(ent.body.items.map((e: { cosmeticId: string }) => e.cosmeticId)).toContain('brass-ultimate');
  });

  it('refuses with INSUFFICIENT_BALANCE {shortBy} against the full 10', async () => {
    const user = await registerUser();
    await acquire(user.token, 'bitter'); // 3 PX → balance 7
    const res = await acquire(user.token, 'marquee-ultimate', 409);
    expect(res.body.error.code).toBe('INSUFFICIENT_BALANCE');
    expect(res.body.error.shortBy).toBe(3); // 10 − 7
  });
});

describe('ECON-03/04 + CARD-22: the publish→gallery→adopt thread for an ultimate component', () => {
  it('components rows carry tier; adopt-reconcile prices the unowned ultimate at its full 10 PX (no pricing-code change)', async () => {
    const designer = await registerUser();
    const game = await seedGame(designer.token, `W5 Ultimate Quest ${counter}-${randomUUID().slice(0, 4)}`);
    await acquire(designer.token, 'brass-ultimate'); // 10 → 0
    const { id: cardId } = await publishCard(
      designer.token,
      game.id,
      comp({
        nameplate: {
          shape: 'brass',
          cosmeticId: 'brass-ultimate',
          fontId: 'clean-sans',
          title: 'X',
          plate: '#8a2be2', // the chosen custom hue — colour freedom is the point
          ink: '#f3ecd9',
          size: 0.05,
        },
      }),
    );

    const adopter = await registerUser();
    const gallery = await request(app).get(`/api/games/${game.id}/cards`).set(authed(adopter.token));
    expect(gallery.status).toBe(200);
    const card = gallery.body.items.find((i: { id: string }) => i.id === cardId);
    expect(card).toBeTruthy();
    // the personalized price chip = the missing-components sum = the full ultimate 10
    expect(card.priceForYou).toBe(10);
    // the adopt-sheet component row — now with `tier` (the ULTIMATE chip source, api-contract 0.77)
    expect(card.components).toEqual([
      { cosmeticId: 'brass-ultimate', name: 'BRASS ULTIMATE', type: 'nameplate', tier: 'ultimate', price: 10, owned: false },
    ]);
    // CARD-22 — the equipped readout labels the ultimate SKU colour-independently (explicit cosmeticId)
    expect(card.equipped.nameplate).toBe('BRASS ULTIMATE');

    // adopt = atomic component acquire (10) + the free design grant (ECON-03/04 verbatim)
    const adopt = await request(app).post(`/api/cards/${cardId}/adopt`).set(authed(adopter.token));
    expect(adopt.status, JSON.stringify(adopt.body)).toBe(200);
    expect(adopt.body).toMatchObject({ totalPaid: 10, balance: 0 });
    expect(adopt.body.granted).toEqual([{ cosmeticId: 'brass-ultimate', paid: 10 }]);
    const ent = await request(app).get('/api/me/entitlements').set(authed(adopter.token));
    expect(ent.body.items.map((e: { cosmeticId: string }) => e.cosmeticId)).toContain('brass-ultimate');

    // post-adopt: the grant includes colour freedom because the entitlement IS the design — the
    // gallery re-read shows owned:true + a 0 price (ownership's reward, ECON-03)
    const again = await request(app).get(`/api/games/${game.id}/cards`).set(authed(adopter.token));
    const cardAgain = again.body.items.find((i: { id: string }) => i.id === cardId);
    expect(cardAgain.priceForYou).toBe(0);
    expect(cardAgain.components[0]).toMatchObject({ owned: true, tier: 'ultimate' });
    expect(cardAgain.adopted).toBe(true);
  });

  it('a standard premium component row carries its tier too (the additive field is universal)', async () => {
    const designer = await registerUser();
    const game = await seedGame(designer.token, `W5 Standard Tier ${counter}-${randomUUID().slice(0, 4)}`);
    await acquire(designer.token, 'bitter'); // 3 PX font
    const { id: cardId } = await publishCard(
      designer.token,
      game.id,
      comp({ elements: [...baseElements(), { type: 'text', x: 0.5, y: 0.6, fill: '#f3ecd9', text: 'T', size: 0.05, fontId: 'bitter' }] }),
    );
    const viewer = await registerUser();
    const gallery = await request(app).get(`/api/games/${game.id}/cards`).set(authed(viewer.token));
    const card = gallery.body.items.find((i: { id: string }) => i.id === cardId);
    expect(card.components).toEqual([
      { cosmeticId: 'bitter', name: 'SLAB', type: 'font', tier: 'standard', price: 3, owned: false },
    ]);
  });

  it('adopt refuses INSUFFICIENT_BALANCE {shortBy} against the ultimate missing-sum', async () => {
    const designer = await registerUser();
    const game = await seedGame(designer.token, `W5 Short Adopt ${counter}-${randomUUID().slice(0, 4)}`);
    await acquire(designer.token, 'brass-ultimate');
    const { id: cardId } = await publishCard(
      designer.token,
      game.id,
      comp({
        nameplate: { shape: 'brass', cosmeticId: 'brass-ultimate', fontId: 'clean-sans', title: 'X', plate: '#12e0a8', ink: '#fff', size: 0.05 },
      }),
    );
    const adopter = await registerUser();
    await acquire(adopter.token, 'bitter'); // 10 → 7
    const res = await request(app).post(`/api/cards/${cardId}/adopt`).set(authed(adopter.token));
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('INSUFFICIENT_BALANCE');
    expect(res.body.error.shortBy).toBe(3);
  });
});

describe('CARD-15/COSM-05: the flatten colour-force backstop (server-authoritative render)', () => {
  it('a recoloured NON-flagged premium frame flattens byte-identical to its registry colour; a free recolour honestly differs', async () => {
    const designer = await registerUser();
    const game = await seedGame(designer.token, `W5 Backstop ${counter}-${randomUUID().slice(0, 4)}`);
    await acquire(designer.token, 'marquee'); // 8 PX — the non-flagged premium frame

    // A: marquee at its registry gold · B: the SAME card recoloured red (only frame.color differs —
    // distinct hashes, so CARD-19 dedup admits both). The backstop must force B back to gold at
    // flatten, so the stored full renders are BYTE-IDENTICAL.
    const a = await publishCard(designer.token, game.id, comp({ frame: { kind: 'marquee', color: '#e8c14a', width: 0.04 } }));
    const b = await publishCard(designer.token, game.id, comp({ frame: { kind: 'marquee', color: '#ff0000', width: 0.04 } }));
    const pngA = readFileSync(join(mediaDir, 'cards', a.id, 'full.png'));
    const pngB = readFileSync(join(mediaDir, 'cards', b.id, 'full.png'));
    expect(pngA.equals(pngB)).toBe(true);

    // Control — a FREE frame recolour is untouched by the backstop (free kinds tolerate any colour),
    // so the bytes differ: the byte-compare above is a real discriminator, not a vacuous pass.
    const c = await publishCard(designer.token, game.id, comp({ frame: { kind: 'thin-line', color: '#c9c5e6', width: 0.045 } }, 1));
    const d = await publishCard(designer.token, game.id, comp({ frame: { kind: 'thin-line', color: '#00ff00', width: 0.045 } }, 1));
    const pngC = readFileSync(join(mediaDir, 'cards', c.id, 'full.png'));
    const pngD = readFileSync(join(mediaDir, 'cards', d.id, 'full.png'));
    expect(pngC.equals(pngD)).toBe(false);
  });
});
