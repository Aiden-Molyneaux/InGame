import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import { randomUUID } from 'node:crypto';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { PostgreSqlContainer, type StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import type { Express } from 'express';
import { COMPOSITION_SCHEMA_VERSION } from '@ingame/shared';

// M5 F-2 — the COL-06 adopted-card thread (the parvati P7/P8 🚩): an adopted card must be VISIBLE to the
// adopter (switcher lists it, flattened-only) and EQUIPPABLE (renders on /me/collection), survive the
// designer unpublishing (CARD-20 adopters-keep), and never leak into the designer's own /me/cards shelf.
// Plus the SOC-09 §0.6 block endpoints (POST/DELETE /me/blocks) the P8 client already calls.
// Tags: COL-06, CARD-15/18/20, ECON-04, SOC-09, OQ-122, SYS-01/07.
// Standing authz tokens covered here (actor-B → 4xx): authz:block_create · authz:block_delete.

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
  const email = `col06_${counter}_${randomUUID().slice(0, 6)}@example.com`;
  const username = `col06user${counter}${randomUUID().slice(0, 4)}`;
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

async function publishFresh(token: string, gameId: string, seed: number, name: string) {
  const draft = await request(app).post('/api/cards').set(authed(token)).send({ gameId, composition: comp(seed), name });
  if (draft.status !== 201) throw new Error(`createDraft failed: ${draft.status} ${JSON.stringify(draft.body)}`);
  const res = await request(app).post(`/api/cards/${draft.body.id}/publish`).set(authed(token));
  if (res.status !== 200) throw new Error(`publish failed: ${res.status} ${JSON.stringify(res.body)}`);
  return { id: draft.body.id as string, published: res.body };
}

async function addEntry(token: string, gameId: string) {
  const res = await request(app).post('/api/me/collection').set(authed(token)).send({ gameId });
  if (res.status !== 201) throw new Error(`addEntry failed: ${res.status} ${JSON.stringify(res.body)}`);
  return res.body.entryId as string;
}

beforeAll(async () => {
  container = await new PostgreSqlContainer('postgres:16-alpine').start();
  process.env.DATABASE_URL = container.getConnectionUri();
  process.env.DISPOSABLE_DB = '1';
  process.env.JWT_SIGNING_SECRET = 'test-signing-secret-at-least-16-chars-long';
  mediaDir = mkdtempSync(join(tmpdir(), 'ingame-col06-media-'));
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

describe('COL-06/ECON-04: an adopted card is visible + equippable to the adopter', () => {
  it('adopt → the switcher lists it FLATTENED (no composition) → equip → it renders on /me/collection', async () => {
    const a = await registerUser();
    const b = await registerUser();
    const game = await seedGame(a.token, 'Adopt Switcher RPG');
    const { id: cardId } = await publishFresh(a.token, game.id, 1, 'A Public Card');
    const bEntry = await addEntry(b.token, game.id);

    // B adopts A's card.
    const adopt = await request(app).post(`/api/cards/${cardId}/adopt`).set(authed(b.token));
    expect(adopt.status).toBe(200);

    // (1) the switcher now lists the adopted card — flattened image + designer attribution, NO composition.
    const switcher = await request(app).get(`/api/me/collection/${bEntry}/cards`).set(authed(b.token));
    expect(switcher.status).toBe(200);
    const adopted = switcher.body.items.find((c: { id: string }) => c.id === cardId);
    expect(adopted).toBeDefined();
    expect(adopted.origin).toBe('adopted');
    expect(adopted.imageUrl).toBeTruthy(); // publish flattened it
    expect(adopted.designer.username).toBe(a.username);
    expect('composition' in adopted).toBe(false); // OQ-122 — the private layers never cross

    // (2) B equips the adopted card.
    const equip = await request(app)
      .patch(`/api/me/collection/${bEntry}`)
      .set(authed(b.token))
      .send({ activeCardDesignId: cardId });
    expect(equip.status).toBe(200);
    expect(equip.body.card.id).toBe(cardId);
    expect(equip.body.card.isCustom).toBe(true);
    expect(equip.body.card.imageUrl).toBeTruthy();
    expect('composition' in equip.body.card).toBe(false);

    // (3) it renders on the shelf — GET /me/collection resolves the equipped adopted rider (flattened).
    const shelf = await request(app).get('/api/me/collection').set(authed(b.token));
    const entryItem = shelf.body.items.find((i: { entryId: string }) => i.entryId === bEntry);
    expect(entryItem.card.id).toBe(cardId);
    expect(entryItem.card.imageUrl).toBeTruthy();
    expect('composition' in entryItem.card).toBe(false);
  });

  it('a non-adopted FOREIGN card can NOT be equipped → 422 unknown_design (SYS-07 — no existence oracle)', async () => {
    const a = await registerUser();
    const b = await registerUser();
    const game = await seedGame(a.token, 'No Adopt RPG');
    const { id: cardId } = await publishFresh(a.token, game.id, 2, 'Not Yours');
    const bEntry = await addEntry(b.token, game.id);

    // B never adopted it — equipping A's card is refused (a validation error, the card stays default).
    const equip = await request(app)
      .patch(`/api/me/collection/${bEntry}`)
      .set(authed(b.token))
      .send({ activeCardDesignId: cardId });
    expect(equip.status).toBe(422);
    expect(equip.body.error.reason ?? equip.body.error.code).toBe('unknown_design');
    // the entry stayed on the default face.
    const shelf = await request(app).get('/api/me/collection').set(authed(b.token));
    const entryItem = shelf.body.items.find((i: { entryId: string }) => i.entryId === bEntry);
    expect(entryItem.card.id).toBe('default');
  });

  it('CARD-20 adopters-keep: after the designer UNPUBLISHES, the adopter still lists + equips the card', async () => {
    const a = await registerUser();
    const b = await registerUser();
    const game = await seedGame(a.token, 'Unpublish Keep RPG');
    const { id: cardId } = await publishFresh(a.token, game.id, 3, 'Soon Delisted');
    const bEntry = await addEntry(b.token, game.id);
    await request(app).post(`/api/cards/${cardId}/adopt`).set(authed(b.token));

    // A delists it — gone from the gallery, but B's grant survives.
    const un = await request(app).post(`/api/cards/${cardId}/unpublish`).set(authed(a.token));
    expect(un.status).toBe(200);
    const gallery = await request(app).get(`/api/games/${game.id}/cards`).set(authed(b.token));
    expect(gallery.body.items).toHaveLength(0);

    // B's switcher STILL lists the adopted card (the grant, not the listing, is the key).
    const switcher = await request(app).get(`/api/me/collection/${bEntry}/cards`).set(authed(b.token));
    const adopted = switcher.body.items.find((c: { id: string }) => c.id === cardId);
    expect(adopted).toBeDefined();
    expect(adopted.origin).toBe('adopted');

    // and B can still equip it.
    const equip = await request(app)
      .patch(`/api/me/collection/${bEntry}`)
      .set(authed(b.token))
      .send({ activeCardDesignId: cardId });
    expect(equip.status).toBe(200);
    expect(equip.body.card.id).toBe(cardId);
  });

  it('GET /me/cards stays OWNED-only — an adopted card never appears on the designer-shelf', async () => {
    const a = await registerUser();
    const b = await registerUser();
    const game = await seedGame(a.token, 'Owned Shelf RPG');
    const { id: cardId } = await publishFresh(a.token, game.id, 4, 'A Card');
    await addEntry(b.token, game.id);
    await request(app).post(`/api/cards/${cardId}/adopt`).set(authed(b.token));

    const mine = await request(app).get('/api/me/cards').set(authed(b.token));
    expect(mine.status).toBe(200);
    expect(mine.body.items.some((c: { id: string }) => c.id === cardId)).toBe(false); // not my design
  });
});

describe('SOC-09 §0.6: POST/DELETE /me/blocks — block hides a designer end-to-end; idempotent; authz', () => {
  it('block via the endpoint hides the designer gallery; unblock restores it (idempotent both ways)', async () => {
    const a = await registerUser();
    const b = await registerUser();
    const game = await seedGame(a.token, 'Block Endpoint RPG');
    await publishFresh(a.token, game.id, 5, 'Blockable');

    // baseline: B sees A's card.
    let gallery = await request(app).get(`/api/games/${game.id}/cards`).set(authed(b.token));
    expect(gallery.body.items).toHaveLength(1);

    // B blocks A THROUGH THE ROUTE → A's card leaves B's gallery (0073 §0.6).
    const block = await request(app).post('/api/me/blocks').set(authed(b.token)).send({ userId: a.id });
    expect(block.status).toBe(200);
    expect(block.body).toEqual({ ok: true });
    gallery = await request(app).get(`/api/games/${game.id}/cards`).set(authed(b.token));
    expect(gallery.body.items).toHaveLength(0);

    // idempotent — a repeat block is a no-op 200.
    const again = await request(app).post('/api/me/blocks').set(authed(b.token)).send({ userId: a.id });
    expect(again.status).toBe(200);

    // unblock restores the gallery; a repeat unblock is also idempotent.
    const unblock = await request(app).delete(`/api/me/blocks/${a.id}`).set(authed(b.token));
    expect(unblock.status).toBe(200);
    gallery = await request(app).get(`/api/games/${game.id}/cards`).set(authed(b.token));
    expect(gallery.body.items).toHaveLength(1);
    const unblockAgain = await request(app).delete(`/api/me/blocks/${a.id}`).set(authed(b.token));
    expect(unblockAgain.status).toBe(200);
  });

  it('blocking yourself is refused (422); an unknown target → 404', async () => {
    const a = await registerUser();
    const self = await request(app).post('/api/me/blocks').set(authed(a.token)).send({ userId: a.id });
    expect(self.status).toBe(422);
    const unknown = await request(app).post('/api/me/blocks').set(authed(a.token)).send({ userId: randomUUID() });
    expect(unknown.status).toBe(404);
  });

  it('authz:block_create — an unauthenticated actor-B POST /me/blocks → 401', async () => {
    const a = await registerUser();
    const res = await request(app).post('/api/me/blocks').send({ userId: a.id }); // no token
    expect(res.status).toBe(401);
  });

  it('authz:block_delete — an unauthenticated actor-B DELETE /me/blocks/:id → 401', async () => {
    const a = await registerUser();
    const res = await request(app).delete(`/api/me/blocks/${a.id}`); // no token
    expect(res.status).toBe(401);
  });
});

describe('CARD-14/20 (F-2b): UN-ADOPT — DELETE /cards/:id on an adopted card removes only my copy', () => {
  it('un-adopt removes the card from MY switcher; the gallery entry + adoption count are UNTOUCHED', async () => {
    const a = await registerUser();
    const b = await registerUser();
    const game = await seedGame(a.token, 'Unadopt RPG');
    const { id: cardId } = await publishFresh(a.token, game.id, 30, 'Removable');
    const bEntry = await addEntry(b.token, game.id);
    await request(app).post(`/api/cards/${cardId}/adopt`).set(authed(b.token));

    // baseline: count 1, switcher lists it.
    let gallery = await request(app).get(`/api/games/${game.id}/cards`).set(authed(b.token));
    expect(gallery.body.items[0].adoptionCount).toBe(1);

    // B un-adopts via the SAME DELETE route.
    const del = await request(app).delete(`/api/cards/${cardId}`).set(authed(b.token));
    expect(del.status).toBe(200);
    expect(del.body).toEqual({ ok: true });

    // gone from B's switcher…
    const switcher = await request(app).get(`/api/me/collection/${bEntry}/cards`).set(authed(b.token));
    expect(switcher.body.items.some((c: { id: string }) => c.id === cardId)).toBe(false);
    // …but the design + gallery entry survive, and the ALL-TIME count is unchanged (CARD-14/20).
    gallery = await request(app).get(`/api/games/${game.id}/cards`).set(authed(b.token));
    expect(gallery.body.items).toHaveLength(1);
    expect(gallery.body.items[0].adoptionCount).toBe(1);
    // the designer's clout is also untouched.
    const contrib = await request(app).get(`/api/users/${a.id}/contributions`).set(authed(a.token));
    expect(contrib.body.stats.totalAdoptions).toBe(1);
    // and a revoked grant can no longer be equipped (422 — same as never-adopted).
    const equip = await request(app)
      .patch(`/api/me/collection/${bEntry}`)
      .set(authed(b.token))
      .send({ activeCardDesignId: cardId });
    expect(equip.status).toBe(422);
  });

  it('un-adopt is refused while the adopted card is EQUIPPED → 409 CARD_EQUIPPED (switch first)', async () => {
    const a = await registerUser();
    const b = await registerUser();
    const game = await seedGame(a.token, 'Equipped Unadopt RPG');
    const { id: cardId } = await publishFresh(a.token, game.id, 31, 'Worn');
    const bEntry = await addEntry(b.token, game.id);
    await request(app).post(`/api/cards/${cardId}/adopt`).set(authed(b.token));
    await request(app)
      .patch(`/api/me/collection/${bEntry}`)
      .set(authed(b.token))
      .send({ activeCardDesignId: cardId });

    const del = await request(app).delete(`/api/cards/${cardId}`).set(authed(b.token));
    expect(del.status).toBe(409);
    expect(del.body.error.code).toBe('CARD_EQUIPPED');
    // still adopted + still equipped — nothing was revoked.
    const switcher = await request(app).get(`/api/me/collection/${bEntry}/cards`).set(authed(b.token));
    expect(switcher.body.items.some((c: { id: string; origin: string }) => c.id === cardId && c.origin === 'adopted')).toBe(true);

    // unequip → un-adopt now succeeds.
    await request(app)
      .patch(`/api/me/collection/${bEntry}`)
      .set(authed(b.token))
      .send({ activeCardDesignId: null });
    const del2 = await request(app).delete(`/api/cards/${cardId}`).set(authed(b.token));
    expect(del2.status).toBe(200);
  });

  it('re-adopt after un-adopt REACTIVATES the grant free (entitlements persist — no re-charge, count still 1)', async () => {
    const a = await registerUser();
    const b = await registerUser();
    const game = await seedGame(a.token, 'Readopt RPG');
    const { id: cardId } = await publishFresh(a.token, game.id, 32, 'Boomerang');
    const bEntry = await addEntry(b.token, game.id);

    const first = await request(app).post(`/api/cards/${cardId}/adopt`).set(authed(b.token));
    expect(first.status).toBe(200);
    const balanceAfterFirst = first.body.balance;
    await request(app).delete(`/api/cards/${cardId}`).set(authed(b.token)); // un-adopt

    // re-adopt: succeeds (not ALREADY_ADOPTED), charges nothing, count stays 1 (the row reactivated).
    const again = await request(app).post(`/api/cards/${cardId}/adopt`).set(authed(b.token));
    expect(again.status).toBe(200);
    expect(again.body.totalPaid).toBe(0);
    expect(again.body.balance).toBe(balanceAfterFirst); // no re-charge
    const gallery = await request(app).get(`/api/games/${game.id}/cards`).set(authed(b.token));
    expect(gallery.body.items[0].adoptionCount).toBe(1); // reactivated, not duplicated
    // and it is back in the switcher + a repeat adopt now refuses ALREADY_ADOPTED again.
    const switcher = await request(app).get(`/api/me/collection/${bEntry}/cards`).set(authed(b.token));
    expect(switcher.body.items.some((c: { id: string; origin: string }) => c.id === cardId && c.origin === 'adopted')).toBe(true);
    const repeat = await request(app).post(`/api/cards/${cardId}/adopt`).set(authed(b.token));
    expect(repeat.status).toBe(409);
    expect(repeat.body.error.code).toBe('ALREADY_ADOPTED');
  });

  it('un-adopting a card I never adopted (or my OWN card path unchanged) → the standing behaviors hold', async () => {
    const a = await registerUser();
    const b = await registerUser();
    const game = await seedGame(a.token, 'Unadopt Authz RPG');
    const { id: cardId } = await publishFresh(a.token, game.id, 33, 'Untouched');
    // actor-B never adopted → DELETE is the same 404 an unknown id gets (no existence oracle).
    const stranger = await request(app).delete(`/api/cards/${cardId}`).set(authed(b.token));
    expect(stranger.status).toBe(404);
    // the owner's delete guard is UNCHANGED: adopted-published still refuses HAS_ADOPTERS even after
    // the adopter un-adopts (the count is ALL-TIME — re-adoption stays possible; unpublish instead).
    await request(app).post(`/api/cards/${cardId}/adopt`).set(authed(b.token));
    await request(app).delete(`/api/cards/${cardId}`).set(authed(b.token)); // b un-adopts
    const ownerDel = await request(app).delete(`/api/cards/${cardId}`).set(authed(a.token));
    expect(ownerDel.status).toBe(409);
    expect(ownerDel.body.error.code).toBe('HAS_ADOPTERS');
  });
});
