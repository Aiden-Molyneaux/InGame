import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import { randomUUID } from 'node:crypto';
import { PostgreSqlContainer, type StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import type { Express } from 'express';
import { COMPOSITION_SCHEMA_VERSION, STYLE_PRESETS_MAX } from '@ingame/shared';

// CARD-14/15/24 + COL-06 — the M4 card substrate at the HTTP boundary (decision 0066; supertest +
// REAL Postgres). card_designs + style_presets are USER-OWNED: every write is a G-D re-fire target —
// the standing actor-B 4xx tests (SYS-01/07), the 0040 CARD_EQUIPPED guard, the cap-30 PRESET_LIMIT
// (+ the F36 concurrent-create race), draft-not-equippable, wrong-game equip, CARD-20 immutability,
// and the owner-only card rider (composition + notes/rating readback, api 0.53).
// Tags: CARD-04/14/15/20/24, COL-06, SYS-01/02/04/07.

let container: StartedPostgreSqlContainer;
let app: Express;

const PW = 'Sup3rSecret!';
let counter = 0;

function authed(token: string) {
  return { Authorization: `Bearer ${token}` };
}

async function registerUser() {
  counter += 1;
  const email = `card${counter}_${randomUUID().slice(0, 6)}@example.com`;
  const username = `carduser${counter}${randomUUID().slice(0, 4)}`;
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

async function addEntry(token: string, gameId: string) {
  const res = await request(app).post('/api/me/collection').set(authed(token)).send({ gameId });
  if (res.status !== 201) throw new Error(`addEntry failed: ${res.status}`);
  return res.body as { entryId: string };
}

function composition(elements = 2) {
  return {
    schemaVersion: COMPOSITION_SCHEMA_VERSION,
    base: { fill: '#241a4d' },
    elements: Array.from({ length: elements }, (_, i) => ({
      type: 'rect',
      x: 0.5,
      y: 0.1 + i * 0.02,
      w: 0.4,
      h: 0.02,
      fill: '#e8c14a',
    })),
  };
}

async function createDraft(token: string, gameId: string, name?: string) {
  const res = await request(app)
    .post('/api/cards')
    .set(authed(token))
    .send({ gameId, composition: composition(), ...(name ? { name } : {}) });
  if (res.status !== 201) throw new Error(`createDraft failed: ${res.status}`);
  return res.body as { id: string; status: string; name: string; compositionHash: string };
}

async function savePrivate(token: string, cardId: string) {
  return request(app).post(`/api/cards/${cardId}/save-private`).set(authed(token));
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

describe('SYS-07: actor-B 4xx on every card/preset mutation (SYS-01 — no existence oracle)', () => {
  it('authz:card_create — an unauthenticated actor → 401; a smuggled ownerId → 422 (SYS-01)', async () => {
    const a = await registerUser();
    const game = await seedGame(a.token, 'Authz Create Game');
    const anon = await request(app)
      .post('/api/cards')
      .send({ gameId: game.id, composition: composition() });
    expect(anon.status).toBe(401);
    const smuggled = await request(app)
      .post('/api/cards')
      .set(authed(a.token))
      .send({ gameId: game.id, composition: composition(), ownerId: randomUUID() });
    expect(smuggled.status).toBe(422); // .strict() refuses the smuggled owner key
  });

  it('authz:card_update — actor-B PATCHing actor-A’s design → 404, A’s row untouched (SYS-01/07)', async () => {
    const a = await registerUser();
    const b = await registerUser();
    const game = await seedGame(a.token, 'Authz Patch Game');
    const card = await createDraft(a.token, game.id);
    const patched = await request(app)
      .patch(`/api/cards/${card.id}`)
      .set(authed(b.token))
      .send({ name: 'stolen' });
    expect(patched.status).toBe(404);
    const mine = await request(app).get('/api/me/cards').set(authed(a.token));
    expect(mine.body.items[0].name).not.toBe('stolen');
  });

  it('authz:card_save_private — actor-B finalizing actor-A’s draft → 404 (same as unknown id)', async () => {
    const a = await registerUser();
    const b = await registerUser();
    const game = await seedGame(a.token, 'Authz Save Game');
    const card = await createDraft(a.token, game.id);
    const saved = await savePrivate(b.token, card.id);
    expect(saved.status).toBe(404);
    const mine = await request(app).get('/api/me/cards').set(authed(a.token));
    expect(mine.body.items[0].status).toBe('draft'); // A's draft did not transition
  });

  it('authz:card_delete — actor-B DELETing actor-A’s design → 404, the design survives', async () => {
    const a = await registerUser();
    const b = await registerUser();
    const game = await seedGame(a.token, 'Authz Delete Game');
    const card = await createDraft(a.token, game.id);
    const deleted = await request(app).delete(`/api/cards/${card.id}`).set(authed(b.token));
    expect(deleted.status).toBe(404);
    const mine = await request(app).get('/api/me/cards').set(authed(a.token));
    expect(mine.body.items).toHaveLength(1);
  });

  it('B cannot read A’s switcher feed → 404 on A’s entryId (COL-06); B cannot equip A’s design → 422', async () => {
    const a = await registerUser();
    const b = await registerUser();
    const game = await seedGame(a.token, 'Authz Feed Game');
    const entry = await addEntry(a.token, game.id);
    const res = await request(app)
      .get(`/api/me/collection/${entry.entryId}/cards`)
      .set(authed(b.token));
    expect(res.status).toBe(404);

    // Equip across principals: B owns the same GAME but not A's design → 422 unknown_design.
    const aCard = await createDraft(a.token, game.id);
    await savePrivate(a.token, aCard.id);
    const bEntry = await addEntry(b.token, game.id);
    const equip = await request(app)
      .patch(`/api/me/collection/${bEntry.entryId}`)
      .set(authed(b.token))
      .send({ activeCardDesignId: aCard.id });
    expect(equip.status).toBe(422);
  });

  it('authz:style_preset_create — an unauthenticated actor → 401; a smuggled ownerId → 422 (SYS-01)', async () => {
    const a = await registerUser();
    const anon = await request(app)
      .post('/api/me/style-presets')
      .send({ name: 'Anon', style: {} });
    expect(anon.status).toBe(401);
    const smuggled = await request(app)
      .post('/api/me/style-presets')
      .set(authed(a.token))
      .send({ name: 'Smuggled', style: {}, ownerId: randomUUID() });
    expect(smuggled.status).toBe(422);
  });

  it('authz:style_preset_update — actor-B PATCHing actor-A’s preset → 404, A’s row untouched', async () => {
    const a = await registerUser();
    const b = await registerUser();
    const created = await request(app)
      .post('/api/me/style-presets')
      .set(authed(a.token))
      .send({ name: 'Mine', style: { frameId: 'slate' } });
    expect(created.status).toBe(201);
    const patched = await request(app)
      .patch(`/api/me/style-presets/${created.body.id}`)
      .set(authed(b.token))
      .send({ name: 'stolen' });
    expect(patched.status).toBe(404);
    const list = await request(app).get('/api/me/style-presets').set(authed(a.token));
    expect(list.body[0].name).toBe('Mine');
  });

  it('authz:style_preset_delete — actor-B DELETing actor-A’s preset → 404, the preset survives', async () => {
    const a = await registerUser();
    const b = await registerUser();
    const created = await request(app)
      .post('/api/me/style-presets')
      .set(authed(a.token))
      .send({ name: 'Keep Me', style: {} });
    const deleted = await request(app)
      .delete(`/api/me/style-presets/${created.body.id}`)
      .set(authed(b.token));
    expect(deleted.status).toBe(404);
    const list = await request(app).get('/api/me/style-presets').set(authed(a.token));
    expect(list.body).toHaveLength(1);
  });
});

describe('CARD-14/24a: the draft document lifecycle', () => {
  it('POST /cards → 201 draft (name defaults to the game title; hash derived); autosave PATCH re-hashes', async () => {
    const a = await registerUser();
    const game = await seedGame(a.token, 'Draft Life Game');
    const card = await createDraft(a.token, game.id);
    expect(card.status).toBe('draft');
    expect(card.name).toBe('Draft Life Game');
    expect(card.compositionHash).toMatch(/^v1-/);

    const patched = await request(app)
      .patch(`/api/cards/${card.id}`)
      .set(authed(a.token))
      .send({ name: 'Aurora', composition: composition(3) });
    expect(patched.status).toBe(200);
    expect(patched.body.name).toBe('Aurora');
    expect(patched.body.compositionHash).not.toBe(card.compositionHash);

    const empty = await request(app).patch(`/api/cards/${card.id}`).set(authed(a.token)).send({});
    expect(empty.status).toBe(422); // no silent no-op mutation (rule-5)
  });

  it('CARD-04/15: save-private transitions draft→private, is idempotent, and generates NO image (0066 §1)', async () => {
    const a = await registerUser();
    const game = await seedGame(a.token, 'Save Private Game');
    const card = await createDraft(a.token, game.id);
    const first = await savePrivate(a.token, card.id);
    expect(first.status).toBe(200);
    expect(first.body.status).toBe('private');
    expect(first.body.imageUrl).toBeNull(); // flatten rides M5 publish
    const second = await savePrivate(a.token, card.id);
    expect(second.status).toBe(200);
    expect(second.body.status).toBe('private');
  });

  it('CARD-20: a published design is immutable (PATCH + save-private → 422)', async () => {
    const a = await registerUser();
    const game = await seedGame(a.token, 'Immutable Game');
    const card = await createDraft(a.token, game.id);
    // Simulate the M5 publish transition directly (no publish route exists yet — by design).
    const { getDb } = await import('../../src/db/client');
    const { cardDesigns } = await import('../../src/db/schema');
    const { eq } = await import('drizzle-orm');
    await getDb().update(cardDesigns).set({ status: 'published' }).where(eq(cardDesigns.id, card.id));

    const patched = await request(app)
      .patch(`/api/cards/${card.id}`)
      .set(authed(a.token))
      .send({ name: 'nope' });
    expect(patched.status).toBe(422);
    const saved = await savePrivate(a.token, card.id);
    expect(saved.status).toBe(422);
  });

  it('CARD-15: a composition over the cap-30 → 422 at the boundary', async () => {
    const a = await registerUser();
    const game = await seedGame(a.token, 'Cap Game');
    const res = await request(app)
      .post('/api/cards')
      .set(authed(a.token))
      .send({ gameId: game.id, composition: composition(31) });
    expect(res.status).toBe(422);
  });
});

describe('COL-06: equip semantics + the CARD-18 rider (api 0.53 / 0066 §5)', () => {
  it('equip a PRIVATE design → the /me/collection card rider carries it (composition, owner-only); null re-equips the default', async () => {
    const a = await registerUser();
    const game = await seedGame(a.token, 'Equip Game');
    const entry = await addEntry(a.token, game.id);
    const card = await createDraft(a.token, game.id);
    await savePrivate(a.token, card.id);

    const equip = await request(app)
      .patch(`/api/me/collection/${entry.entryId}`)
      .set(authed(a.token))
      .send({ activeCardDesignId: card.id });
    expect(equip.status).toBe(200);
    expect(equip.body.card.id).toBe(card.id);
    expect(equip.body.card.isCustom).toBe(true);
    expect(equip.body.card.composition).toBeDefined(); // the owner renders live (0066 §2)

    const shelf = await request(app).get('/api/me/collection').set(authed(a.token));
    const item = shelf.body.items.find((i: { entryId: string }) => i.entryId === entry.entryId);
    expect(item.card.id).toBe(card.id);
    expect(item.card.name).toBe('Equip Game');

    const clear = await request(app)
      .patch(`/api/me/collection/${entry.entryId}`)
      .set(authed(a.token))
      .send({ activeCardDesignId: null });
    expect(clear.status).toBe(200);
    expect(clear.body.card.id).toBe('default'); // CARD-18
  });

  it('a DRAFT is not equippable (422) and a wrong-game design is refused (422)', async () => {
    const a = await registerUser();
    const gameA = await seedGame(a.token, 'Right Game');
    const gameB = await seedGame(a.token, 'Wrong Game');
    const entryA = await addEntry(a.token, gameA.id);
    const draft = await createDraft(a.token, gameA.id);

    const draftEquip = await request(app)
      .patch(`/api/me/collection/${entryA.entryId}`)
      .set(authed(a.token))
      .send({ activeCardDesignId: draft.id });
    expect(draftEquip.status).toBe(422); // design_not_equippable

    const otherCard = await createDraft(a.token, gameB.id);
    await savePrivate(a.token, otherCard.id);
    const wrongGame = await request(app)
      .patch(`/api/me/collection/${entryA.entryId}`)
      .set(authed(a.token))
      .send({ activeCardDesignId: otherCard.id });
    expect(wrongGame.status).toBe(422); // design_wrong_game
  });

  it('decision 0040: DELETE the equipped design → 409 CARD_EQUIPPED; unequip → delete succeeds', async () => {
    const a = await registerUser();
    const game = await seedGame(a.token, 'Delete Guard Game');
    const entry = await addEntry(a.token, game.id);
    const card = await createDraft(a.token, game.id);
    await savePrivate(a.token, card.id);
    await request(app)
      .patch(`/api/me/collection/${entry.entryId}`)
      .set(authed(a.token))
      .send({ activeCardDesignId: card.id });

    const refused = await request(app).delete(`/api/cards/${card.id}`).set(authed(a.token));
    expect(refused.status).toBe(409);
    expect(refused.body.error.code).toBe('CARD_EQUIPPED');

    await request(app)
      .patch(`/api/me/collection/${entry.entryId}`)
      .set(authed(a.token))
      .send({ activeCardDesignId: null });
    const deleted = await request(app).delete(`/api/cards/${card.id}`).set(authed(a.token));
    expect(deleted.status).toBe(200);
    expect(deleted.body.ok).toBe(true);
  });

  it('OQ-134 (api 0.53): notes + rating round-trip on the owner item', async () => {
    const a = await registerUser();
    const game = await seedGame(a.token, 'Notes Game');
    const entry = await addEntry(a.token, game.id);
    const patched = await request(app)
      .patch(`/api/me/collection/${entry.entryId}`)
      .set(authed(a.token))
      .send({ notes: 'chasing the raid title', rating: 4 });
    expect(patched.status).toBe(200);
    expect(patched.body.notes).toBe('chasing the raid title');
    expect(patched.body.rating).toBe(4);

    const shelf = await request(app).get('/api/me/collection').set(authed(a.token));
    const item = shelf.body.items.find((i: { entryId: string }) => i.entryId === entry.entryId);
    expect(item.notes).toBe('chasing the raid title');
    expect(item.rating).toBe(4);
  });

  it('PROF-04 (0066): /me stats.cardsDesigned counts FINISHED designs, not drafts', async () => {
    const a = await registerUser();
    const game = await seedGame(a.token, 'Stats Game');
    const draft = await createDraft(a.token, game.id);
    let me = await request(app).get('/api/me').set(authed(a.token));
    expect(me.body.stats.cardsDesigned).toBe(0); // a draft is not a designed card
    await savePrivate(a.token, draft.id);
    me = await request(app).get('/api/me').set(authed(a.token));
    expect(me.body.stats.cardsDesigned).toBe(1);
  });
});

describe('CARD-24b: style presets — cap-30 + the F36 concurrent race (SYS-04)', () => {
  it(`the cap: preset #${STYLE_PRESETS_MAX + 1} → 409 PRESET_LIMIT`, async () => {
    const a = await registerUser();
    for (let i = 0; i < STYLE_PRESETS_MAX; i++) {
      const res = await request(app)
        .post('/api/me/style-presets')
        .set(authed(a.token))
        .send({ name: `Preset ${i}`, style: { frameId: 'slate' } });
      expect(res.status).toBe(201);
    }
    const over = await request(app)
      .post('/api/me/style-presets')
      .set(authed(a.token))
      .send({ name: 'One Too Many', style: { frameId: 'gilt' } });
    expect(over.status).toBe(409);
    expect(over.body.error.code).toBe('PRESET_LIMIT');
  });

  it('F36: two parallel creates at cap-1 → exactly one 201 (the advisory lock serializes)', async () => {
    const a = await registerUser();
    for (let i = 0; i < STYLE_PRESETS_MAX - 1; i++) {
      await request(app)
        .post('/api/me/style-presets')
        .set(authed(a.token))
        .send({ name: `P${i}`, style: {} });
    }
    const [r1, r2] = await Promise.all([
      request(app).post('/api/me/style-presets').set(authed(a.token)).send({ name: 'Race A', style: {} }),
      request(app).post('/api/me/style-presets').set(authed(a.token)).send({ name: 'Race B', style: {} }),
    ]);
    const created = [r1, r2].filter((r) => r.status === 201);
    const refused = [r1, r2].filter((r) => r.status === 409);
    expect(created).toHaveLength(1);
    expect(refused).toHaveLength(1);

    const list = await request(app).get('/api/me/style-presets').set(authed(a.token));
    expect(list.body).toHaveLength(STYLE_PRESETS_MAX); // the bare-array response (api 0.51)
  });

  it('CRUD round-trip: create → rename → re-snapshot → delete', async () => {
    const a = await registerUser();
    const created = await request(app)
      .post('/api/me/style-presets')
      .set(authed(a.token))
      .send({ name: 'Midnight Gilt', style: { frameId: 'gilt', effect: { id: 'scanline', intensity: 0.5 } } });
    expect(created.status).toBe(201);
    expect(created.body.isPremium).toBe(false); // the M4 free baseline

    const renamed = await request(app)
      .patch(`/api/me/style-presets/${created.body.id}`)
      .set(authed(a.token))
      .send({ name: 'Gilt II', style: { frameId: 'slate' } });
    expect(renamed.status).toBe(200);
    expect(renamed.body.name).toBe('Gilt II');
    expect(renamed.body.style.frameId).toBe('slate');

    const deleted = await request(app)
      .delete(`/api/me/style-presets/${created.body.id}`)
      .set(authed(a.token));
    expect(deleted.status).toBe(200);
    const list = await request(app).get('/api/me/style-presets').set(authed(a.token));
    expect(list.body).toHaveLength(0);
  });
});

describe('COL-06: the switcher feed + the My Designs shelf', () => {
  it('GET /me/collection/:entryId/cards lists MY designs for THAT game; /me/cards spans games', async () => {
    const a = await registerUser();
    // Two DISSIMILAR titles — near-twins would trip the CAT-03 dedup 409 (trigram warn ≥ 0.5).
    const g1 = await seedGame(a.token, 'Switcher Feed RPG');
    const g2 = await seedGame(a.token, 'Unrelated Kart Racer');
    const entry1 = await addEntry(a.token, g1.id);
    const c1 = await createDraft(a.token, g1.id, 'One A');
    await savePrivate(a.token, c1.id);
    await createDraft(a.token, g1.id, 'One B (draft)');
    await createDraft(a.token, g2.id, 'Two A');

    const feed = await request(app)
      .get(`/api/me/collection/${entry1.entryId}/cards`)
      .set(authed(a.token));
    expect(feed.status).toBe(200);
    expect(feed.body.items).toHaveLength(2); // drafts list as resume handles
    expect(feed.body.items.every((c: { gameId: string }) => c.gameId === g1.id)).toBe(true);

    const mine = await request(app).get('/api/me/cards').set(authed(a.token));
    expect(mine.body.items).toHaveLength(3);
  });
});
