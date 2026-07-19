import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import { randomUUID } from 'node:crypto';
import { PostgreSqlContainer, type StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import type { Express } from 'express';

// CAT-13/14 (M6 W-6) — wiki-live game editing at the HTTP boundary (supertest + a REAL Postgres):
// one immutable `game_edits` row per field-submit, applied live in-tx; revert replays oldValue,
// stamps the target row, and writes a reversal row. Covers the E1 test list (game-edit-wiki-draft
// §6): history round-trip · genres full-replace · clear-to-null · revert (+ of-reversal) · the A3
// revert-rights matrix (authz:catalog_edit_revert) · the A1 14-day age-gate + admin exemption
// (authz:catalog_edit) · MOD-07 screening · title-locked · no_change · already_reverted · 429 on
// both buckets · 404s — PLUS the A2 MOD-01 amendment (card `incorrect_info` reports, details
// required). Tags: CAT-13/14, CAT-04, MOD-01/07/10, SYS-01/02/05/07.

let container: StartedPostgreSqlContainer;
let app: Express;

const PW = 'Sup3rSecret!';
let counter = 0;

function authed(token: string) {
  return { Authorization: `Bearer ${token}` };
}

async function registerUser() {
  counter += 1;
  const email = `ge${counter}_${randomUUID().slice(0, 6)}@example.com`;
  const username = `geuser${counter}${randomUUID().slice(0, 4)}`;
  const res = await request(app)
    .post('/api/auth/register')
    .send({ email, username, password: PW, acceptedTerms: true });
  if (res.status !== 201) throw new Error(`registerUser failed: ${res.status}`);
  return { id: res.body.user.id as string, username, token: res.body.accessToken as string };
}

/** A1 — age an account past the 14-day gate (registered-now users are all "too new" by design). */
async function ageUser(userId: string, days = 20) {
  const { getDb } = await import('../../src/db/client');
  const { users } = await import('../../src/db/schema');
  const { eq } = await import('drizzle-orm');
  await getDb()
    .update(users)
    .set({ createdAt: new Date(Date.now() - days * 24 * 60 * 60_000) })
    .where(eq(users.id, userId));
}

async function makeAdmin(userId: string) {
  const { getDb } = await import('../../src/db/client');
  const { users } = await import('../../src/db/schema');
  const { eq } = await import('drizzle-orm');
  await getDb().update(users).set({ role: 'admin', adminTier: 4 }).where(eq(users.id, userId));
}

/** Retire a genre from the controlled list — simulates a genre removed BETWEEN an edit and its revert. */
async function deleteGenre(genreId: string) {
  const { getDb } = await import('../../src/db/client');
  const { genres } = await import('../../src/db/schema');
  const { eq } = await import('drizzle-orm');
  await getDb().delete(genres).where(eq(genres.id, genreId));
}

/** A registered + AGED user (the standing editor most tests need). */
async function agedUser() {
  const u = await registerUser();
  await ageUser(u.id);
  return u;
}

async function genreIdByName(token: string, name: string): Promise<string> {
  const res = await request(app).get('/api/genres').set(authed(token));
  const hit = (res.body.items ?? []).find((g: { name: string }) => g.name === name);
  if (!hit) throw new Error(`genre ${name} not found`);
  return hit.id;
}

async function createGame(token: string, body: Record<string, unknown>) {
  const res = await request(app).post('/api/catalog/games').set(authed(token)).send(body);
  if (res.status !== 201) throw new Error(`createGame failed: ${res.status}`);
  return res.body as { id: string };
}

function editGame(token: string, gameId: string, body: Record<string, unknown>) {
  return request(app).post(`/api/catalog/games/${gameId}/edits`).set(authed(token)).send(body);
}

function revertEdit(token: string, gameId: string, editId: string) {
  return request(app).post(`/api/catalog/games/${gameId}/edits/${editId}/revert`).set(authed(token));
}

async function editRowsFor(gameId: string) {
  const { getDb } = await import('../../src/db/client');
  const { gameEdits } = await import('../../src/db/schema');
  const { eq, asc } = await import('drizzle-orm');
  return getDb()
    .select()
    .from(gameEdits)
    .where(eq(gameEdits.gameId, gameId))
    .orderBy(asc(gameEdits.editedAt), asc(gameEdits.id));
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

describe('CAT-13: POST /catalog/games/:id/edits — the wiki-live history round-trip', () => {
  it('an edit applies to the game AND writes the history row; { edit, game } round-trips; the detail read reflects value + lastEdit', async () => {
    const a = await agedUser();
    const rpg = await genreIdByName(a.token, 'RPG');
    const game = await createGame(a.token, { name: 'Elden Ring', genreIds: [rpg], studio: 'FromSoft' });

    const res = await editGame(a.token, game.id, { field: 'studio', newValue: 'FromSoftware' });
    expect(res.status).toBe(201);
    expect(res.body.edit).toMatchObject({
      gameId: game.id,
      field: 'studio',
      oldValue: 'FromSoft',
      newValue: 'FromSoftware',
      status: 'live',
      editor: { userId: a.id, username: a.username },
    });
    expect(typeof res.body.edit.id).toBe('string');
    expect(typeof res.body.edit.editedAt).toBe('string');
    // the applied GameDetail rides the response — the one-round-trip client reconcile
    expect(res.body.game.studio).toBe('FromSoftware');
    expect(res.body.game.lastEdit).toMatchObject({ editor: { userId: a.id, username: a.username } });

    // and the standing detail read agrees (value + the CAT-14 attribution)
    const detail = await request(app).get(`/api/catalog/games/${game.id}`).set(authed(a.token));
    expect(detail.status).toBe(200);
    expect(detail.body.studio).toBe('FromSoftware');
    expect(detail.body.lastEdit.editor.userId).toBe(a.id);
  });

  it('a NEVER-edited game has NO lastEdit on the detail read (absent, not null)', async () => {
    const a = await agedUser();
    const rpg = await genreIdByName(a.token, 'RPG');
    const game = await createGame(a.token, { name: 'Untouched Game', genreIds: [rpg] });
    const detail = await request(app).get(`/api/catalog/games/${game.id}`).set(authed(a.token));
    expect(detail.status).toBe(200);
    expect('lastEdit' in detail.body).toBe(false);
  });

  it('genres FULL-REPLACE round-trips (game_genres swapped; sorted-array history values)', async () => {
    const a = await agedUser();
    const rpg = await genreIdByName(a.token, 'RPG');
    const soulslike = await genreIdByName(a.token, 'Soulslike');
    const game = await createGame(a.token, { name: 'Genre Swap Game', genreIds: [rpg] });

    const next = [soulslike, rpg].sort();
    const res = await editGame(a.token, game.id, { field: 'genres', newValue: [soulslike, rpg] });
    expect(res.status).toBe(201);
    expect(res.body.edit.oldValue).toEqual([rpg]); // the sorted old id array
    expect(res.body.edit.newValue).toEqual(next); // sorted at write — the canonical history form
    const names = res.body.game.genres.map((g: { name: string }) => g.name).sort();
    expect(names).toEqual(['RPG', 'Soulslike']);
  });

  it('CLEAR-to-null round-trips (studio → null)', async () => {
    const a = await agedUser();
    const rpg = await genreIdByName(a.token, 'RPG');
    const game = await createGame(a.token, { name: 'Clear Me Game', genreIds: [rpg], studio: 'Old Studio' });
    const res = await editGame(a.token, game.id, { field: 'studio', newValue: null });
    expect(res.status).toBe(201);
    expect(res.body.edit.oldValue).toBe('Old Studio');
    expect(res.body.edit.newValue).toBeNull();
    expect(res.body.game.studio).toBeNull();
  });

  it('releaseDate edits validate the calendar (a real date applies; an impossible one → 422)', async () => {
    const a = await agedUser();
    const rpg = await genreIdByName(a.token, 'RPG');
    const game = await createGame(a.token, { name: 'Dated Game', genreIds: [rpg] });
    const bad = await editGame(a.token, game.id, { field: 'releaseDate', newValue: '2026-02-30' });
    expect(bad.status).toBe(422);
    const ok = await editGame(a.token, game.id, { field: 'releaseDate', newValue: '2022-02-25' });
    expect(ok.status).toBe(201);
    expect(ok.body.game.releaseDate).toBe('2022-02-25');
  });
});

describe('CAT-13 refusals: title-locked · screening · genre rules · no_change', () => {
  it('the TITLE is LOCKED — field "name" (and any off-set field) → 422 uneditable_field', async () => {
    const a = await agedUser();
    const rpg = await genreIdByName(a.token, 'RPG');
    const game = await createGame(a.token, { name: 'Locked Title Game', genreIds: [rpg] });
    for (const field of ['name', 'normalizedName', 'createdBy']) {
      const res = await editGame(a.token, game.id, { field, newValue: 'Anything' });
      expect(res.status).toBe(422);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
      expect(res.body.error.reason).toBe('uneditable_field');
    }
  });

  it('MOD-07 screens studio/publisher edit text → 422 screened', async () => {
    const a = await agedUser();
    const rpg = await genreIdByName(a.token, 'RPG');
    const game = await createGame(a.token, { name: 'Screened Game', genreIds: [rpg] });
    for (const field of ['studio', 'publisher']) {
      const res = await editGame(a.token, game.id, { field, newValue: 'admin' });
      expect(res.status).toBe(422);
      expect(res.body.error.reason).toBe('screened');
    }
  });

  it('an UNKNOWN genre id → 422 unknown_genre; an EMPTY genres array → 422 (min 1)', async () => {
    const a = await agedUser();
    const rpg = await genreIdByName(a.token, 'RPG');
    const game = await createGame(a.token, { name: 'Genre Rules Game', genreIds: [rpg] });
    const unknown = await editGame(a.token, game.id, { field: 'genres', newValue: [randomUUID()] });
    expect(unknown.status).toBe(422);
    expect(unknown.body.error.reason).toBe('unknown_genre');
    const empty = await editGame(a.token, game.id, { field: 'genres', newValue: [] });
    expect(empty.status).toBe(422);
    expect(empty.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('a zero-diff submit → 422 no_change (the append-only history takes no no-op rows)', async () => {
    const a = await agedUser();
    const rpg = await genreIdByName(a.token, 'RPG');
    const game = await createGame(a.token, { name: 'No Change Game', genreIds: [rpg], studio: 'Same Studio' });
    const same = await editGame(a.token, game.id, { field: 'studio', newValue: 'Same Studio' });
    expect(same.status).toBe(422);
    expect(same.body.error.reason).toBe('no_change');
    // genres order must not defeat the guard (sorted canonical compare)
    const sameGenres = await editGame(a.token, game.id, { field: 'genres', newValue: [rpg] });
    expect(sameGenres.status).toBe(422);
    expect(sameGenres.body.error.reason).toBe('no_change');
    expect((await editRowsFor(game.id)).length).toBe(0); // nothing polluted the ledger
  });

  it('an UNKNOWN game → 404; unauthenticated → 401 (authz:catalog_edit)', async () => {
    const a = await agedUser();
    const unknown = await editGame(a.token, randomUUID(), { field: 'studio', newValue: 'X' });
    expect(unknown.status).toBe(404);
    const anon = await request(app)
      .post(`/api/catalog/games/${randomUUID()}/edits`)
      .send({ field: 'studio', newValue: 'X' });
    expect(anon.status).toBe(401);
  });
});

describe('A1: the 14-day editor age-gate (ACCOUNT_TOO_NEW; admins exempt)', () => {
  it('a fresh (<14d) account → 403 ACCOUNT_TOO_NEW; the SAME account aged past 14d edits fine', async () => {
    const contributor = await agedUser();
    const rpg = await genreIdByName(contributor.token, 'RPG');
    const game = await createGame(contributor.token, { name: 'Age Gate Game', genreIds: [rpg] });

    const young = await registerUser(); // created NOW — inside the gate
    const refused = await editGame(young.token, game.id, { field: 'studio', newValue: 'Too Soon Studio' });
    expect(refused.status).toBe(403);
    expect(refused.body.error.code).toBe('ACCOUNT_TOO_NEW');

    await ageUser(young.id, 15); // just past the gate
    const allowed = await editGame(young.token, game.id, { field: 'studio', newValue: 'Old Enough Studio' });
    expect(allowed.status).toBe(201);
  });

  it("a fresh ADMIN account is EXEMPT (role='admin' bypasses the gate)", async () => {
    const contributor = await agedUser();
    const rpg = await genreIdByName(contributor.token, 'RPG');
    const game = await createGame(contributor.token, { name: 'Admin Exempt Game', genreIds: [rpg] });

    const freshAdmin = await registerUser(); // created NOW
    await makeAdmin(freshAdmin.id);
    const res = await editGame(freshAdmin.token, game.id, { field: 'studio', newValue: 'Admin Studio' });
    expect(res.status).toBe(201);
  });
});

describe('CAT-14: revert — replay oldValue · stamp the row · write the reversal', () => {
  it('editor-self revert restores oldValue, stamps the target row, and writes a live reversal row (which is itself revertible)', async () => {
    const a = await agedUser();
    const rpg = await genreIdByName(a.token, 'RPG');
    const game = await createGame(a.token, { name: 'Revert Game', genreIds: [rpg], studio: 'Original Studio' });
    const edited = await editGame(a.token, game.id, { field: 'studio', newValue: 'Vandal Studio' });
    const editId = edited.body.edit.id as string;

    const res = await revertEdit(a.token, game.id, editId);
    expect(res.status).toBe(200);
    // the response edit is the REVERSAL row: old/new swapped, live, editor = the reverter
    expect(res.body.edit).toMatchObject({
      field: 'studio',
      oldValue: 'Vandal Studio',
      newValue: 'Original Studio',
      status: 'live',
      editor: { userId: a.id },
    });
    expect(res.body.game.studio).toBe('Original Studio');

    // the ledger: the target row is stamped reverted (revertedBy/At), the reversal row appended
    const rows = await editRowsFor(game.id);
    expect(rows).toHaveLength(2);
    const target = rows.find((r) => r.id === editId)!;
    expect(target.status).toBe('reverted');
    expect(target.revertedBy).toBe(a.id);
    expect(target.revertedAt).not.toBeNull();
    const reversal = rows.find((r) => r.id !== editId)!;
    expect(reversal.status).toBe('live');

    // revert-of-reversal — the reversal is an edit like any other
    const again = await revertEdit(a.token, game.id, reversal.id);
    expect(again.status).toBe(200);
    expect(again.body.game.studio).toBe('Vandal Studio');
    expect((await editRowsFor(game.id)).length).toBe(3);
  });

  it('a genres revert replays the old genre set', async () => {
    const a = await agedUser();
    const rpg = await genreIdByName(a.token, 'RPG');
    const soulslike = await genreIdByName(a.token, 'Soulslike');
    const game = await createGame(a.token, { name: 'Genre Revert Game', genreIds: [rpg] });
    const edited = await editGame(a.token, game.id, { field: 'genres', newValue: [soulslike] });
    expect(edited.status).toBe(201);
    const res = await revertEdit(a.token, game.id, edited.body.edit.id);
    expect(res.status).toBe(200);
    expect(res.body.game.genres).toEqual([{ id: rpg, name: 'RPG' }]);
  });

  it('a genres revert whose replayed set holds a SINCE-REMOVED genre → typed 422 unknown_genre (never a 500); nothing is stamped', async () => {
    // W-6 L1 — the revert REPLAYS a historical genre set; if the controlled list changed since, the
    // replay must re-run CAT-04 and refuse with the typed 422, not FK-violate into a 500.
    const a = await agedUser();
    const rpg = await genreIdByName(a.token, 'RPG');
    const soulslike = await genreIdByName(a.token, 'Soulslike');
    const game = await createGame(a.token, { name: 'Stale Genre Revert Game', genreIds: [rpg, soulslike] });

    // edit AWAY from soulslike (oldValue = the [rpg, soulslike] set) so game_genres no longer
    // references it and it can be retired from the controlled list…
    const edited = await editGame(a.token, game.id, { field: 'genres', newValue: [rpg] });
    expect(edited.status).toBe(201);
    const editId = edited.body.edit.id as string;
    await deleteGenre(soulslike);

    // …now the revert would replay [rpg, soulslike] — the removed id must refuse cleanly.
    const res = await revertEdit(a.token, game.id, editId);
    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(res.body.error.reason).toBe('unknown_genre');

    // the refusal is checked BEFORE the stamp — the target row is untouched (still live, revertible)
    const rows = await editRowsFor(game.id);
    expect(rows).toHaveLength(1);
    expect(rows[0]!.status).toBe('live');
  });

  it('A3 rights matrix: editor-self ✓ · game contributor ✓ · admin ✓ (MOD-10-logged) · stranger 403 (authz:catalog_edit_revert)', async () => {
    const contributor = await agedUser();
    const editor = await agedUser();
    const stranger = await agedUser();
    const admin = await agedUser();
    await makeAdmin(admin.id);
    const rpg = await genreIdByName(contributor.token, 'RPG');
    const game = await createGame(contributor.token, { name: 'Rights Matrix Game', genreIds: [rpg], studio: 'S0' });

    // three separate edits by `editor`, one per reverter to exercise
    const e1 = (await editGame(editor.token, game.id, { field: 'studio', newValue: 'S1' })).body.edit.id;
    const e2 = (await editGame(editor.token, game.id, { field: 'publisher', newValue: 'P1' })).body.edit.id;
    const e3 = (await editGame(editor.token, game.id, { field: 'releaseDate', newValue: '2020-01-01' })).body.edit.id;

    // the STRANGER (actor-B) — no standing, 403, nothing changes
    const refused = await revertEdit(stranger.token, game.id, e1);
    expect(refused.status).toBe(403);
    expect(refused.body.error.code).toBe('FORBIDDEN');

    expect((await revertEdit(editor.token, game.id, e1)).status).toBe(200); // editor-self
    expect((await revertEdit(contributor.token, game.id, e2)).status).toBe(200); // CAT-05 contributor
    expect((await revertEdit(admin.token, game.id, e3)).status).toBe(200); // admin

    // MOD-10 — the ADMIN-standing revert wrote the audit row (self/contributor reverts do not)
    const { getDb } = await import('../../src/db/client');
    const { adminAuditLog } = await import('../../src/db/schema');
    const { eq } = await import('drizzle-orm');
    const audits = await getDb()
      .select()
      .from(adminAuditLog)
      .where(eq(adminAuditLog.action, 'catalog.game_edit_reverted'));
    expect(audits).toHaveLength(1);
    expect(audits[0]!.actorId).toBe(admin.id);
    expect(audits[0]!.targetId).toBe(e3);
  });

  it('a second revert of the same row → 422 already_reverted', async () => {
    const a = await agedUser();
    const rpg = await genreIdByName(a.token, 'RPG');
    const game = await createGame(a.token, { name: 'Double Revert Game', genreIds: [rpg], studio: 'S0' });
    const editId = (await editGame(a.token, game.id, { field: 'studio', newValue: 'S1' })).body.edit.id;
    expect((await revertEdit(a.token, game.id, editId)).status).toBe(200);
    const again = await revertEdit(a.token, game.id, editId);
    expect(again.status).toBe(422);
    expect(again.body.error.code).toBe('VALIDATION_ERROR');
    expect(again.body.error.reason).toBe('already_reverted');
  });

  it('an unknown editId / a mismatched game → 404', async () => {
    const a = await agedUser();
    const rpg = await genreIdByName(a.token, 'RPG');
    const game = await createGame(a.token, { name: 'Missing Edit Game', genreIds: [rpg] });
    const other = await createGame(a.token, { name: 'Other Detail Game', genreIds: [rpg], studio: 'S' });
    expect((await revertEdit(a.token, game.id, randomUUID())).status).toBe(404);
    // an edit id that exists — but on ANOTHER game (path/row mismatch must 404, not act)
    const editId = (await editGame(a.token, other.id, { field: 'studio', newValue: 'S2' })).body.edit.id;
    expect((await revertEdit(a.token, game.id, editId)).status).toBe(404);
  });
});

describe('SYS-05: the catalog:edit stacked buckets (10/min + 50/day)', () => {
  it('a burst past the per-minute cap → 429 RATE_LIMITED', async () => {
    const a = await agedUser();
    const rpg = await genreIdByName(a.token, 'RPG');
    const game = await createGame(a.token, { name: 'Burst Edit Game', genreIds: [rpg] });
    const { overrideRuleForTest } = await import('../../src/config/rate-limits');
    overrideRuleForTest('catalog:edit', { limit: 2, windowMs: 60_000 });
    const results = [];
    for (let i = 0; i < 4; i++) {
      results.push(await editGame(a.token, game.id, { field: 'studio', newValue: `Studio ${i}` }));
    }
    const limited = results.filter((r) => r.status === 429);
    expect(limited.length).toBeGreaterThan(0);
    expect(limited[0]?.body.error.code).toBe('RATE_LIMITED');
  });

  it('the DAILY cap trips independently of the per-minute burst', async () => {
    const a = await agedUser();
    const rpg = await genreIdByName(a.token, 'RPG');
    const game = await createGame(a.token, { name: 'Daily Edit Game', genreIds: [rpg] });
    const { overrideRuleForTest } = await import('../../src/config/rate-limits');
    overrideRuleForTest('catalog:edit', { limit: 100, windowMs: 60_000 }); // generous — only daily can trip
    overrideRuleForTest('catalog:edit:daily', { limit: 2, windowMs: 86_400_000 });
    const results = [];
    for (let i = 0; i < 4; i++) {
      results.push(await editGame(a.token, game.id, { field: 'publisher', newValue: `Pub ${i}` }));
    }
    const limited = results.filter((r) => r.status === 429);
    expect(limited.length).toBeGreaterThan(0);
    expect(limited[0]?.body.error.code).toBe('RATE_LIMITED');
  });
});

describe('A2 (MOD-01): the CARD report gains `incorrect_info` — details REQUIRED', () => {
  it('a card report with reason incorrect_info + details → 201 (feeds the same wrongness signal)', async () => {
    const a = await registerUser(); // reporting has NO age gate — only editing does
    const res = await request(app)
      .post('/api/reports')
      .set(authed(a.token))
      .send({
        targetType: 'card',
        targetId: randomUUID(),
        reason: 'incorrect_info',
        details: 'The card shows the wrong release year.',
      });
    expect(res.status).toBe(201);
    expect(typeof res.body.reportId).toBe('string');
  });

  it('a card incorrect_info report WITHOUT details → 422 (details required, like the game reason)', async () => {
    const a = await registerUser();
    const res = await request(app)
      .post('/api/reports')
      .set(authed(a.token))
      .send({ targetType: 'card', targetId: randomUUID(), reason: 'incorrect_info' });
    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('the game incorrect_info reason is untouched (still valid, details still required)', async () => {
    const a = await registerUser();
    const ok = await request(app)
      .post('/api/reports')
      .set(authed(a.token))
      .send({
        targetType: 'game',
        targetId: randomUUID(),
        reason: 'incorrect_info',
        details: 'Title is misspelled: should be “Elden Ring”.',
      });
    expect(ok.status).toBe(201);
    const missing = await request(app)
      .post('/api/reports')
      .set(authed(a.token))
      .send({ targetType: 'game', targetId: randomUUID(), reason: 'incorrect_info' });
    expect(missing.status).toBe(422);
  });
});
