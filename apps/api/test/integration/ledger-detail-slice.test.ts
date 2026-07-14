import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import { randomUUID } from 'node:crypto';
import { existsSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { PostgreSqlContainer, type StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import type { Express } from 'express';
import { COMPOSITION_SCHEMA_VERSION } from '@ingame/shared';
import { getDb } from '../../src/db/client';
import * as economyRepo from '../../src/repositories/economy-repo';
import * as iapRepo from '../../src/repositories/iap-repo';

// F-4 LEDGER HONESTY — GET /me/wallet/ledger enriches each row with a `detail` phrase resolved at read
// time from refType/refId (the board's "ADOPTED 'DESTINY' BY RIKO" / "CHROME · FRAME" / "PIXEL PACK · 30"
// / "DAY 1 BONUS" standard), batched (no N+1). A missing/deleted ref degrades to NO detail (the client
// falls back to the generic label) and NEVER 500s. Real Postgres + supertest.
// Tags: ECON-07, COSM-03, SYS-01.

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
  const email = `ld_${counter}_${randomUUID().slice(0, 6)}@example.com`;
  const username = `lduser${counter}${randomUUID().slice(0, 4)}`;
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
  return res.body as { id: string };
}

function comp(seed = 0) {
  const elements = Array.from({ length: 3 }, (_v, i) => ({
    type: 'rect' as const,
    x: 0.5,
    y: 0.1 + (i + seed * 0.01) * 0.07,
    w: 0.4,
    h: 0.05,
    fill: '#e8c14a',
  }));
  return { schemaVersion: COMPOSITION_SCHEMA_VERSION, base: { gradient: ['#241a4d', '#0e0b1e'] }, elements };
}

async function publishCard(token: string, gameId: string, name: string) {
  const draft = await request(app).post('/api/cards').set(authed(token)).send({ gameId, composition: comp(counter), name });
  if (draft.status !== 201) throw new Error(`createDraft failed: ${draft.status} ${JSON.stringify(draft.body)}`);
  const pub = await request(app).post(`/api/cards/${draft.body.id}/publish`).set(authed(token));
  if (pub.status !== 200) throw new Error(`publish failed: ${pub.status} ${JSON.stringify(pub.body)}`);
  return draft.body.id as string;
}

/** Insert a synthetic ledger row for a user (reasons the current write paths don't emit, e.g. adoption). */
function seedLedgerRow(userId: string, entry: Parameters<typeof economyRepo.insertLedgerRow>[2]) {
  return getDb().transaction((tx) => economyRepo.insertLedgerRow(tx, userId, entry));
}

async function getLedger(token: string) {
  const res = await request(app).get('/api/me/wallet/ledger').set(authed(token));
  expect(res.status).toBe(200);
  return res.body.items as Array<{
    type: string;
    refId: string | null;
    detail?: string;
  }>;
}

beforeAll(async () => {
  container = await new PostgreSqlContainer('postgres:16-alpine').start();
  process.env.DATABASE_URL = container.getConnectionUri();
  process.env.DISPOSABLE_DB = '1';
  process.env.JWT_SIGNING_SECRET = 'test-signing-secret-at-least-16-chars-long';
  mediaDir = mkdtempSync(join(tmpdir(), 'ingame-ld-media-'));
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

describe('F-4: acquire → the cosmetic name + type ("CHROME · FRAME")', () => {
  it('a real acquire enriches its ledger row from the catalog', async () => {
    const a = await registerUser();
    const buy = await request(app).post('/api/cosmetics/chrome/acquire').set(authed(a.token));
    expect(buy.status).toBe(200); // CHROME is a `standard` (3 PX) premium frame; a fresh user has 10 PX
    const items = await getLedger(a.token);
    const acquireRow = items.find((r) => r.type === 'acquire');
    expect(acquireRow?.detail).toBe('CHROME · FRAME');
  });
});

describe('F-4: milestone (newcomer_ladder) → "DAY N BONUS"', () => {
  it('a real daily-bonus claim (ladder step 1) enriches as DAY 1 BONUS', async () => {
    const a = await registerUser();
    const claim = await request(app).post('/api/me/daily-bonus').set(authed(a.token));
    expect(claim.body.granted).toBe(true);
    const items = await getLedger(a.token);
    const step = items.find((r) => r.type === 'milestone');
    expect(step?.detail).toBe('DAY 1 BONUS');
  });
});

describe('F-4: adoption → "ADOPTED \'«name»\' BY «designer»" (card + designer join)', () => {
  it('joins card_designs + users, flattened-safe (name + username)', async () => {
    const designer = await registerUser();
    const game = await seedGame(designer.token, `LD Game ${counter}`);
    const cardId = await publishCard(designer.token, game.id, 'Destiny');
    const adopter = await registerUser();
    // The current adopt path writes `acquire` rows, not an `adoption` marker — seed the marker directly
    // to exercise the enrichment join (refType='card_design', refId=cardId).
    await seedLedgerRow(adopter.id, { delta: -1, reason: 'adoption', refType: 'card_design', refId: cardId });
    const items = await getLedger(adopter.token);
    const row = items.find((r) => r.type === 'adoption');
    expect(row?.detail).toBe(`ADOPTED "DESTINY" BY ${designer.username.toUpperCase()}`);
  });
});

describe('F-4: pack_purchase + refund_reversal → the receipt pixel amount', () => {
  it('a pack row reads "PIXEL PACK · 30"; a reversal reads "REFUND REVERSAL · PACK 30"', async () => {
    const a = await registerUser();
    const receiptId = `rcpt_${randomUUID()}`;
    await getDb().transaction((tx) =>
      iapRepo.insertReceiptIfNew(tx, a.id, {
        platform: 'ios',
        receiptId,
        productId: 'px_pack_030',
        pixelsGranted: 30,
        raw: {},
      }),
    );
    await seedLedgerRow(a.id, { delta: 30, reason: 'pack_purchase', refType: 'iap_receipt', refId: receiptId });
    await seedLedgerRow(a.id, { delta: -30, reason: 'refund_reversal', refType: 'iap_receipt', refId: receiptId });
    const items = await getLedger(a.token);
    expect(items.find((r) => r.type === 'pack_purchase')?.detail).toBe('PIXEL PACK · 30');
    expect(items.find((r) => r.type === 'refund_reversal')?.detail).toBe('REFUND REVERSAL · PACK 30');
  });
});

describe('F-4: plain reasons carry NO detail (the generic label stands)', () => {
  it('starting_grant + daily_claim + admin_adjustment have no detail', async () => {
    const a = await registerUser();
    // materialize the wallet + starting_grant, then seed the plain reasons.
    await seedLedgerRow(a.id, { delta: 1, reason: 'daily_claim', periodKey: '2020-01-01' });
    await seedLedgerRow(a.id, { delta: 5, reason: 'admin_adjustment' });
    await request(app).post('/api/me/daily-bonus').set(authed(a.token)); // also materializes starting_grant
    const items = await getLedger(a.token);
    for (const reason of ['starting_grant', 'daily_claim', 'admin_adjustment']) {
      const row = items.find((r) => r.type === reason);
      expect(row).toBeTruthy();
      expect(row?.detail).toBeUndefined();
    }
  });
});

describe('F-4: a DELETED / MISSING ref degrades to no detail — never a 500', () => {
  it('acquire of an unknown id, adoption of a missing card, a missing receipt → 200, no detail', async () => {
    const a = await registerUser();
    await seedLedgerRow(a.id, { delta: -3, reason: 'acquire', refType: 'cosmetic', refId: 'no-such-cosmetic' });
    await seedLedgerRow(a.id, { delta: -1, reason: 'adoption', refType: 'card_design', refId: randomUUID() });
    await seedLedgerRow(a.id, { delta: 30, reason: 'pack_purchase', refType: 'iap_receipt', refId: 'gone' });
    const res = await request(app).get('/api/me/wallet/ledger').set(authed(a.token));
    expect(res.status).toBe(200); // the whole page still serves
    for (const type of ['acquire', 'adoption', 'pack_purchase']) {
      const row = (res.body.items as Array<{ type: string; detail?: string }>).find((r) => r.type === type);
      expect(row?.detail).toBeUndefined(); // degraded — the client shows the generic label
    }
  });
});

it('keeps the media dir tidy (sanity — the test harness booted storage)', () => {
  expect(existsSync(mediaDir)).toBe(true);
});
