import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import { randomUUID } from 'node:crypto';
import { and, count, eq } from 'drizzle-orm';
import { PostgreSqlContainer, type StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import type { Express } from 'express';
import { COMPOSITION_SCHEMA_VERSION } from '@ingame/shared';
import { getDb } from '../../src/db/client';
import { STARTING_GRANT } from '../../src/config/economy';
import {
  registerCosmeticForTest,
  clearCosmeticRegistryForTest,
} from '../../src/config/cosmetics';
import * as cosmeticService from '../../src/services/cosmetics/cosmetic-service';
import * as ledger from '../../src/services/economy/ledger-service';
import { currencyLedger, userEntitlements, wallets, adminAuditLog } from '../../src/db/schema';

// M5 P4 — acquire + entitlements at the HTTP boundary + the exec-based core on REAL Postgres (decision
// 0072/0073; supertest + Testcontainers). `user_entitlements` is USER-OWNED: acquire locks the actor's
// WALLET first (P1's single serialization point), so the standing F36 patterns (one-of-many-wins) fall
// out of the same row lock the economy substrate already uses. The cosmetics registry is a
// process-global config (`config/cosmetics.ts`) — EVERY test registers/clears its OWN fixture ids
// (never real roster ids — the per-item re-tag isn't ruled yet, decision 0073 §0.2).
// Tags: COSM-03, CARD-06, CARD-13, ECON-01/07/11, SYS-01/07, F36.

let container: StartedPostgreSqlContainer;
let app: Express;

const PW = 'Sup3rSecret!';
let counter = 0;

function authed(token: string) {
  return { Authorization: `Bearer ${token}` };
}

async function registerUser() {
  counter += 1;
  const email = `acq${counter}_${randomUUID().slice(0, 6)}@example.com`;
  const username = `acquser${counter}${randomUUID().slice(0, 4)}`;
  const res = await request(app)
    .post('/api/auth/register')
    .send({ email, username, password: PW, acceptedTerms: true });
  if (res.status !== 201) throw new Error(`registerUser failed: ${res.status}`);
  return { id: res.body.user.id as string, token: res.body.accessToken as string };
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

/** A composition with a text element carrying `fontId` — the one id-bearing field CARD-06 checks. */
function compositionWithFont(fontId?: string) {
  return {
    schemaVersion: COMPOSITION_SCHEMA_VERSION,
    base: { gradient: ['#241a4d', '#0e0b1e'] },
    elements: [
      {
        type: 'text',
        x: 0.5,
        y: 0.5,
        fill: '#f3ecd9',
        text: 'TITLE',
        size: 0.06,
        ...(fontId ? { fontId } : {}),
      },
    ],
  };
}

async function countRows(
  table: 'wallets' | 'currencyLedger' | 'entitlements',
  userId: string,
  extra?: { reason?: string; cosmeticId?: string },
) {
  if (table === 'wallets') {
    const rows = await getDb().select({ n: count() }).from(wallets).where(eq(wallets.userId, userId));
    return Number(rows[0]!.n);
  }
  if (table === 'currencyLedger') {
    const where = extra?.reason
      ? and(eq(currencyLedger.userId, userId), eq(currencyLedger.reason, extra.reason))
      : eq(currencyLedger.userId, userId);
    const rows = await getDb().select({ n: count() }).from(currencyLedger).where(where);
    return Number(rows[0]!.n);
  }
  const where = extra?.cosmeticId
    ? and(eq(userEntitlements.userId, userId), eq(userEntitlements.cosmeticId, extra.cosmeticId))
    : eq(userEntitlements.userId, userId);
  const rows = await getDb().select({ n: count() }).from(userEntitlements).where(where);
  return Number(rows[0]!.n);
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
  clearCosmeticRegistryForTest();
});

describe('SYS-07 authz — actor-B / anon 4xx on the acquire endpoints (SYS-01)', () => {
  it('authz:cosmetic_acquire — an unauthenticated actor → 401; a smuggled body field → 422', async () => {
    const a = await registerUser();
    registerCosmeticForTest('fix-authz', 'accent');
    const anon = await request(app).post('/api/cosmetics/fix-authz/acquire').send({});
    expect(anon.status).toBe(401);
    // actor-B here: acquire never references another principal's resource (only the caller's own
    // wallet/entitlements), so the standing 4xx surface is the unauthenticated case + the closed body.
    const smuggled = await request(app)
      .post('/api/cosmetics/fix-authz/acquire')
      .set(authed(a.token))
      .send({ amount: 999 });
    expect(smuggled.status).toBe(422);
  });

  it('authz:cosmetic_acquire_batch — an unauthenticated actor → 401; an empty cosmeticIds array → 422', async () => {
    const a = await registerUser();
    const anon = await request(app).post('/api/cosmetics/acquire-batch').send({ cosmeticIds: ['x'] });
    expect(anon.status).toBe(401);
    const empty = await request(app)
      .post('/api/cosmetics/acquire-batch')
      .set(authed(a.token))
      .send({ cosmeticIds: [] });
    expect(empty.status).toBe(422);
  });

  it('GET /me/entitlements rejects an unauthenticated actor → 401', async () => {
    const res = await request(app).get('/api/me/entitlements');
    expect(res.status).toBe(401);
  });
});

describe('COSM-03: POST /cosmetics/:id/acquire — unknown cosmetic → 404', () => {
  it('an unregistered cosmetic id 404s', async () => {
    const a = await registerUser();
    const res = await request(app)
      .post('/api/cosmetics/totally-unregistered/acquire')
      .set(authed(a.token));
    expect(res.status).toBe(404);
  });
});

describe('COSM-03: a registered-FREE cosmetic acquires without a charge (the free-item semantic)', () => {
  it('paid:0, balance unaffected, no wallet row, no entitlement row', async () => {
    const a = await registerUser();
    registerCosmeticForTest('fix-free', null);
    const res = await request(app).post('/api/cosmetics/fix-free/acquire').set(authed(a.token));
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ cosmeticId: 'fix-free', paid: 0, balance: STARTING_GRANT });
    expect(await countRows('wallets', a.id)).toBe(0); // stayed a pure read — never materialized
    expect(await countRows('entitlements', a.id)).toBe(0);
  });
});

describe('COSM-03: POST /cosmetics/:id/acquire — idempotent (premium)', () => {
  it('the first call charges the tier price; the second is a no-op (no re-charge, no duplicate row)', async () => {
    const a = await registerUser();
    registerCosmeticForTest('fix-standard', 'standard'); // 3 PX
    const first = await request(app).post('/api/cosmetics/fix-standard/acquire').set(authed(a.token));
    expect(first.status).toBe(200);
    expect(first.body).toEqual({ cosmeticId: 'fix-standard', paid: 3, balance: STARTING_GRANT - 3 });

    const second = await request(app).post('/api/cosmetics/fix-standard/acquire').set(authed(a.token));
    expect(second.status).toBe(200);
    expect(second.body).toEqual({ cosmeticId: 'fix-standard', paid: 0, balance: STARTING_GRANT - 3 });

    expect(await countRows('entitlements', a.id, { cosmeticId: 'fix-standard' })).toBe(1);
    expect(await countRows('currencyLedger', a.id, { reason: 'acquire' })).toBe(1);
    const rec = await ledger.reconcile(a.id);
    expect(rec.ok).toBe(true);
  });
});

describe('CARD-13/COSM-03: POST /cosmetics/acquire-batch — atomicity', () => {
  it('one unaffordable item in the set → 409 with the TOTAL shortBy, ZERO rows written', async () => {
    const a = await registerUser();
    registerCosmeticForTest('fix-ultimate-1', 'ultimate'); // 10
    registerCosmeticForTest('fix-ultimate-2', 'ultimate'); // 10 → total 20, balance 10, shortBy 10
    const res = await request(app)
      .post('/api/cosmetics/acquire-batch')
      .set(authed(a.token))
      .send({ cosmeticIds: ['fix-ultimate-1', 'fix-ultimate-2'] });
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('INSUFFICIENT_BALANCE');
    expect(res.body.error.shortBy).toBe(10); // 20 − 10
    // The whole transaction rolled back — even the wallet's own first-touch materialize never landed.
    expect(await countRows('wallets', a.id)).toBe(0);
    expect(await countRows('currencyLedger', a.id)).toBe(0);
    expect(await countRows('entitlements', a.id)).toBe(0);
  });

  it('already-owned ids are silent no-ops: only the missing id is charged, one ledger row each', async () => {
    const a = await registerUser();
    registerCosmeticForTest('fix-owned', 'accent'); // 1
    registerCosmeticForTest('fix-missing', 'trim'); // 2
    const pre = await request(app).post('/api/cosmetics/fix-owned/acquire').set(authed(a.token));
    expect(pre.status).toBe(200);
    expect(pre.body.paid).toBe(1);

    const batch = await request(app)
      .post('/api/cosmetics/acquire-batch')
      .set(authed(a.token))
      .send({ cosmeticIds: ['fix-owned', 'fix-missing'] });
    expect(batch.status).toBe(200);
    expect(batch.body.granted).toEqual([{ cosmeticId: 'fix-missing', paid: 2 }]); // fix-owned skipped
    expect(batch.body.totalPaid).toBe(2);
    expect(batch.body.balance).toBe(STARTING_GRANT - 1 - 2); // 7

    expect(await countRows('entitlements', a.id)).toBe(2); // fix-owned + fix-missing, no duplicate
    expect(await countRows('currencyLedger', a.id, { reason: 'acquire' })).toBe(2); // one per charge
    const rec = await ledger.reconcile(a.id);
    expect(rec.ok).toBe(true);
  });
});

describe('F36: concurrent acquire — the wallet lock is the serialization point', () => {
  it('two parallel single-item acquires of the SAME item → exactly one charge, one entitlement row', async () => {
    const a = await registerUser();
    registerCosmeticForTest('fix-race', 'trim'); // 2
    const [r1, r2] = await Promise.all([
      request(app).post('/api/cosmetics/fix-race/acquire').set(authed(a.token)),
      request(app).post('/api/cosmetics/fix-race/acquire').set(authed(a.token)),
    ]);
    expect([r1.status, r2.status]).toEqual([200, 200]); // both succeed HTTP-wise — one charges, one no-ops
    const paidValues = [r1.body.paid, r2.body.paid].sort((x, y) => x - y);
    expect(paidValues).toEqual([0, 2]); // exactly one charged
    expect(await countRows('entitlements', a.id, { cosmeticId: 'fix-race' })).toBe(1);
    expect(await countRows('currencyLedger', a.id, { reason: 'acquire' })).toBe(1);
    const rec = await ledger.reconcile(a.id);
    expect(rec.balance).toBe(STARTING_GRANT - 2);
    expect(rec.ok).toBe(true);
  });

  it('two parallel batches sharing an item, against a balance that covers only one → exactly one succeeds', async () => {
    const a = await registerUser();
    registerCosmeticForTest('fix-shared', 'trim'); // 2
    registerCosmeticForTest('fix-extra-1', 'big'); // 6
    registerCosmeticForTest('fix-extra-2', 'big'); // 6
    // Each batch totals 8 (shared 2 + its own big 6); balance 10 covers exactly one batch, not both (the
    // loser's 6-PX extra exceeds the 2 PX left) — and whichever loses must re-check ownership of the
    // SHARED item under its own fresh lock.
    const [r1, r2] = await Promise.all([
      request(app)
        .post('/api/cosmetics/acquire-batch')
        .set(authed(a.token))
        .send({ cosmeticIds: ['fix-shared', 'fix-extra-1'] }),
      request(app)
        .post('/api/cosmetics/acquire-batch')
        .set(authed(a.token))
        .send({ cosmeticIds: ['fix-shared', 'fix-extra-2'] }),
    ]);
    const statuses = [r1.status, r2.status].sort();
    expect(statuses).toEqual([200, 409]); // exactly one succeeds
    const winner = r1.status === 200 ? r1 : r2;
    expect(winner.body.totalPaid).toBe(8); // shared 2 + its big 6
    // The shared item lands exactly once regardless of which batch won it.
    expect(await countRows('entitlements', a.id, { cosmeticId: 'fix-shared' })).toBe(1);
    const rec = await ledger.reconcile(a.id);
    expect(rec.ok).toBe(true);
  });
});

describe('CARD-06: premium derivation flips against a fixture-registered premium cosmetic', () => {
  it('a composition referencing a registered premium fontId → isPremium true; a free/unregistered fontId → false', async () => {
    const a = await registerUser();
    const game = await seedGame(a.token, 'CARD-06 RPG');
    registerCosmeticForTest('fix-premium-font', 'showpiece');

    const premium = await request(app)
      .post('/api/cards')
      .set(authed(a.token))
      .send({ gameId: game.id, composition: compositionWithFont('fix-premium-font') });
    expect(premium.status).toBe(201);
    expect(premium.body.isPremium).toBe(true);

    const free = await request(app)
      .post('/api/cards')
      .set(authed(a.token))
      .send({ gameId: game.id, composition: compositionWithFont() }); // no fontId at all
    expect(free.status).toBe(201);
    expect(free.body.isPremium).toBe(false);
  });
});

describe('CARD-06: premium derivation flips against a REAL roster premium id (decision 0075/P10)', () => {
  // Since M5 P7, `collectCosmeticRefs` reads the CLOSED attributes too (frame kind+color / effect kind /
  // finish kind / nameplate shape) — so a real premium FRAME/EFFECT/FINISH/NAMEPLATE flips isPremium,
  // not just a premium FONT id. `bitter` (SLAB font, 3 PX) remains the fontId path; `frost` (effect,
  // 8 PX) and `thin-gold` (frame, kind+color, 3 PX) exercise the new closed-attribute paths.
  it("a composition referencing the real 'bitter' (SLAB) premium font → isPremium true, no fixture needed", async () => {
    const a = await registerUser();
    const game = await seedGame(a.token, 'CARD-06 real-roster RPG');

    const premium = await request(app)
      .post('/api/cards')
      .set(authed(a.token))
      .send({ gameId: game.id, composition: compositionWithFont('bitter') });
    expect(premium.status).toBe(201);
    expect(premium.body.isPremium).toBe(true);

    const free = await request(app)
      .post('/api/cards')
      .set(authed(a.token))
      .send({ gameId: game.id, composition: compositionWithFont('clean-sans') }); // real FREE font (CHAKRA)
    expect(free.status).toBe(201);
    expect(free.body.isPremium).toBe(false);
  });

  it("a premium closed attribute — FROST effect / THIN-GOLD frame — flips isPremium true (P7 derivation)", async () => {
    const a = await registerUser();
    const game = await seedGame(a.token, 'CARD-06 closed-attr RPG');

    const frost = await request(app)
      .post('/api/cards')
      .set(authed(a.token))
      .send({
        gameId: game.id,
        composition: { ...compositionWithFont(), effect: { kind: 'frost', intensity: 0.5 } },
      });
    expect(frost.status).toBe(201);
    expect(frost.body.isPremium).toBe(true);

    const goldFrame = await request(app)
      .post('/api/cards')
      .set(authed(a.token))
      .send({
        gameId: game.id,
        composition: { ...compositionWithFont(), frame: { kind: 'thin-line', color: '#e8c14a', width: 0.045 } },
      });
    expect(goldFrame.status).toBe(201);
    expect(goldFrame.body.isPremium).toBe(true);

    const plainFrame = await request(app)
      .post('/api/cards')
      .set(authed(a.token))
      .send({
        gameId: game.id,
        composition: { ...compositionWithFont(), frame: { kind: 'thin-line', color: '#c9c5e6', width: 0.045 } },
      });
    expect(plainFrame.status).toBe(201);
    expect(plainFrame.body.isPremium).toBe(false);
  });
});

describe('ECON-11: grantEntitlement/clawbackEntitlement write the entitlement + the MOD-10 audit row atomically', () => {
  it('a grant lands an entitlement + an audit row; a clawback removes it + audits again (service-op, no route)', async () => {
    const target = await registerUser();
    const operator = await registerUser();
    registerCosmeticForTest('fix-grant', 'big');

    const granted = await cosmeticService.grantEntitlement(
      operator.id,
      target.id,
      'fix-grant',
      'goodwill cosmetic',
    );
    expect(granted.granted).toBe(true);
    expect(await countRows('entitlements', target.id, { cosmeticId: 'fix-grant' })).toBe(1);
    let audit = await getDb()
      .select()
      .from(adminAuditLog)
      .where(
        and(eq(adminAuditLog.actorId, operator.id), eq(adminAuditLog.action, 'cosmetic.grant_entitlement')),
      );
    expect(audit).toHaveLength(1);
    expect(audit[0]!.targetId).toBe(target.id);
    expect(audit[0]!.reason).toBe('goodwill cosmetic');

    const clawed = await cosmeticService.clawbackEntitlement(
      operator.id,
      target.id,
      'fix-grant',
      'bug correction',
    );
    expect(clawed.removed).toBe(true);
    expect(await countRows('entitlements', target.id, { cosmeticId: 'fix-grant' })).toBe(0);
    audit = await getDb()
      .select()
      .from(adminAuditLog)
      .where(
        and(
          eq(adminAuditLog.actorId, operator.id),
          eq(adminAuditLog.action, 'cosmetic.clawback_entitlement'),
        ),
      );
    expect(audit).toHaveLength(1);
    // ECON-09's exception: the ledger is untouched (no PX moved) — only the entitlement is clawed back.
    expect(await countRows('currencyLedger', target.id)).toBe(0);
  });
});

describe('COSM-03: GET /me/entitlements reads the real table', () => {
  it('lists exactly the caller\'s own owned premium cosmetics, never another user\'s', async () => {
    const a = await registerUser();
    const b = await registerUser();
    registerCosmeticForTest('fix-mine', 'accent');
    registerCosmeticForTest('fix-theirs', 'accent');
    await request(app).post('/api/cosmetics/fix-mine/acquire').set(authed(a.token));
    await request(app).post('/api/cosmetics/fix-theirs/acquire').set(authed(b.token));

    const mine = await request(app).get('/api/me/entitlements').set(authed(a.token));
    expect(mine.status).toBe(200);
    expect(mine.body.items).toHaveLength(1);
    expect(mine.body.items[0]).toMatchObject({ cosmeticId: 'fix-mine', source: 'purchase' });
  });
});

// ── M5 P10 (decision 0075) — GET /cosmetics, the COSM-01 library listing ───────────────────────────
describe('COSM-01: GET /cosmetics — the full free+premium library, decision 0075', () => {
  it('requires auth (own-only owned flags)', async () => {
    const res = await request(app).get('/api/cosmetics');
    expect(res.status).toBe(401);
  });

  it('lists 29 premium items total (14@3 + 6@6 + 6@8 + the 3 W-5 ULTIMATE @10) alongside the free baseline, unfiltered', async () => {
    const a = await registerUser();
    const res = await request(app).get('/api/cosmetics').set(authed(a.token));
    expect(res.status).toBe(200);
    const premium = res.body.items.filter((i: { tier?: string }) => i.tier);
    expect(premium).toHaveLength(29); // 26 (decision 0075) + the 3 COSM-05 ULTIMATE SKUs (decision 0080)
    const byPrice = (price: number) => premium.filter((i: { price: number }) => i.price === price).length;
    expect(byPrice(3)).toBe(14);
    expect(byPrice(6)).toBe(6);
    expect(byPrice(8)).toBe(6);
    expect(byPrice(10)).toBe(3); // marquee-ultimate · brass-ultimate · pacifico-ultimate (COSM-05)
    const free = res.body.items.filter((i: { tier?: string }) => !i.tier);
    expect(free.length).toBeGreaterThan(0);
    for (const item of free) expect(item.price).toBe(0);
  });

  it('the two 0075 removals never appear in the listing', async () => {
    const a = await registerUser();
    const res = await request(app).get('/api/cosmetics').set(authed(a.token));
    const ids = res.body.items.map((i: { id: string }) => i.id);
    expect(ids).not.toContain('bracket-corners');
    expect(ids).not.toContain('subtle-gloss');
  });

  it('?type=frame filters to the frame category only', async () => {
    const a = await registerUser();
    const res = await request(app).get('/api/cosmetics?type=frame').set(authed(a.token));
    expect(res.status).toBe(200);
    expect(res.body.items.length).toBeGreaterThan(0);
    for (const item of res.body.items) expect(item.type).toBe('frame');
  });

  it('a bad type filter → 422 (zod)', async () => {
    const a = await registerUser();
    const res = await request(app).get('/api/cosmetics?type=not-a-real-type').set(authed(a.token));
    expect(res.status).toBe(422);
  });

  it("`owned` reflects the caller's own entitlements — free items always owned, premium items only once acquired", async () => {
    const a = await registerUser();
    const before = await request(app).get('/api/cosmetics').set(authed(a.token));
    const chromeBefore = before.body.items.find((i: { id: string }) => i.id === 'chrome');
    expect(chromeBefore.owned).toBe(false);
    const cleanBefore = before.body.items.find((i: { id: string }) => i.id === 'clean'); // free frame
    expect(cleanBefore.owned).toBe(true);

    await request(app).post('/api/cosmetics/chrome/acquire').set(authed(a.token));

    const after = await request(app).get('/api/cosmetics').set(authed(a.token));
    const chromeAfter = after.body.items.find((i: { id: string }) => i.id === 'chrome');
    expect(chromeAfter.owned).toBe(true);
    expect(chromeAfter.price).toBe(3);
  });

  it("never leaks another caller's ownership — B's acquire does not flip A's `owned`", async () => {
    const a = await registerUser();
    const b = await registerUser();
    await request(app).post('/api/cosmetics/marquee/acquire').set(authed(b.token));

    const asA = await request(app).get('/api/cosmetics').set(authed(a.token));
    const marqueeForA = asA.body.items.find((i: { id: string }) => i.id === 'marquee');
    expect(marqueeForA.owned).toBe(false);
  });
});
