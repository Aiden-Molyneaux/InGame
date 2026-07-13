import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import { randomUUID } from 'node:crypto';
import { and, count, eq } from 'drizzle-orm';
import { PostgreSqlContainer, type StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import type { Express } from 'express';
import {
  STARTING_GRANT,
  DAILY_BONUS,
  NEWCOMER_LADDER_STEPS,
  NEWCOMER_LADDER_LENGTH,
  setLadderCosmeticForTest,
  resetLadderCosmeticsForTest,
} from '../../src/config/economy';
import { getDb } from '../../src/db/client';
import * as ledger from '../../src/services/economy/ledger-service';
import { currencyLedger, userEntitlements } from '../../src/db/schema';

// ECON-02 / decision 0074 — the NEWCOMER LADDER on the daily-claim seam, on REAL Postgres (supertest +
// Testcontainers). The first 7 lifetime claims escalate (+2/+2/+3/+3/+4/+5/+6) as `milestone` rows
// tagged `refType='newcomer_ladder'` (+ a free earned-only cosmetic when the roster slot is filled);
// claim 8+ falls back to the standing +1 `daily_claim`. The ladder NEVER lapses (a missed day just
// delays the next step) — but the same-UTC-day one-claim ceiling still holds across BOTH phases. Prior
// "days" are simulated by seeding real past-day claims (distinct `periodKey`s) via `ledger.credit`, the
// established pattern (economy-slice's prior-day test) — the service reads `new Date()` for "today".
// Tags: ECON-02/07, COSM-03, SYS-01, F36, decision 0074.

let container: StartedPostgreSqlContainer;
let app: Express;

let counter = 0;
const PW = 'Sup3rSecret!';

function authed(token: string) {
  return { Authorization: `Bearer ${token}` };
}

async function registerUser() {
  counter += 1;
  const email = `ladder${counter}_${randomUUID().slice(0, 6)}@example.com`;
  const username = `ladderuser${counter}${randomUUID().slice(0, 4)}`;
  const res = await request(app)
    .post('/api/auth/register')
    .send({ email, username, password: PW, acceptedTerms: true });
  if (res.status !== 201) throw new Error(`registerUser failed: ${res.status}`);
  return { id: res.body.user.id as string, token: res.body.accessToken as string };
}

/** Count a user's ledger rows (optionally by reason) — tests are exempt from the scoping lint. */
async function ledgerCount(userId: string, reason?: string) {
  const where = reason
    ? and(eq(currencyLedger.userId, userId), eq(currencyLedger.reason, reason))
    : eq(currencyLedger.userId, userId);
  const rows = await getDb().select({ n: count() }).from(currencyLedger).where(where);
  return Number(rows[0]!.n);
}

/** Count a user's entitlement rows (optionally by cosmeticId). */
async function entitlementCount(userId: string, cosmeticId?: string) {
  const where = cosmeticId
    ? and(eq(userEntitlements.userId, userId), eq(userEntitlements.cosmeticId, cosmeticId))
    : eq(userEntitlements.userId, userId);
  const rows = await getDb().select({ n: count() }).from(userEntitlements).where(where);
  return Number(rows[0]!.n);
}

/**
 * Seed `n` completed ladder steps for a user, each on a DISTINCT past UTC-day (so none blocks "today"),
 * as real past-day claims (balance tracked via `ledger.credit`). Leaves the lifetime ladder count at `n`.
 */
async function seedPriorLadderSteps(userId: string, n: number) {
  for (let k = 0; k < n; k++) {
    await getDb().transaction((tx) =>
      ledger.credit(tx, userId, {
        amount: NEWCOMER_LADDER_STEPS[k]!,
        reason: 'milestone',
        refType: 'newcomer_ladder',
        refId: String(k + 1),
        periodKey: `2020-01-${String(k + 1).padStart(2, '0')}`, // distinct past days, never "today"
      }),
    );
  }
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
  resetLadderCosmeticsForTest();
});

describe('ECON-02 (decision 0074): the 7 ladder steps grant in sequence across distinct UTC days', () => {
  it.each(NEWCOMER_LADDER_STEPS.map((px, i) => [i, i + 1, px] as const))(
    'with %i prior claims, today lands step %i at +%i PX (a milestone/newcomer_ladder row)',
    async (priorClaims, expectedStep, expectedPx) => {
      const a = await registerUser();
      await seedPriorLadderSteps(a.id, priorClaims);

      const res = await request(app).post('/api/me/daily-bonus').set(authed(a.token));
      expect(res.status).toBe(200);
      expect(res.body.granted).toBe(true);
      expect(res.body.pixels).toBe(expectedPx);
      // decision 0075 (P10): D1-D6 carry a REAL earned-only cosmetic; only D7 (step 7) is reserved empty.
      const REAL_LADDER_IDS = ['linen', 'stencil', 'chrome', 'brass', 'mint', 'halftone', undefined];
      expect(res.body.cosmeticId).toBe(REAL_LADDER_IDS[expectedStep - 1]);
      // balance = grant + all prior steps + this step; the ledger reconciles at every rung.
      const priorSum = NEWCOMER_LADDER_STEPS.slice(0, priorClaims).reduce((s, x) => s + x, 0);
      expect(res.body.balance).toBe(STARTING_GRANT + priorSum + expectedPx);
      expect(await ledgerCount(a.id, 'milestone')).toBe(priorClaims + 1);
      expect(await ledgerCount(a.id, 'daily_claim')).toBe(0);
      const rec = await ledger.reconcile(a.id);
      expect(rec.ok).toBe(true);
      // The wallet's next-step tease reflects the advance (or clears once the ladder just completed).
      const wallet = await request(app).get('/api/me/wallet').set(authed(a.token));
      if (expectedStep < NEWCOMER_LADDER_LENGTH) {
        expect(wallet.body.dailyBonus.ladderStep).toBe(expectedStep + 1);
      } else {
        expect(wallet.body.dailyBonus.ladderStep).toBeUndefined(); // ladder complete after step 7
      }
    },
  );

  it('a multi-day GAP does not reset the ladder — the next claim is the next step (non-consecutive)', async () => {
    const a = await registerUser();
    // Two steps done long ago (Jan 1 + Jan 2), then a big gap; today must be step 3, not a reset.
    await seedPriorLadderSteps(a.id, 2);
    const res = await request(app).post('/api/me/daily-bonus').set(authed(a.token));
    expect(res.body.granted).toBe(true);
    expect(res.body.pixels).toBe(NEWCOMER_LADDER_STEPS[2]); // step 3 (+3), the ladder waited
    expect(await ledgerCount(a.id, 'milestone')).toBe(3);
  });
});

describe('ECON-02 (decision 0074): same-UTC-day one-claim ceiling holds mid-ladder', () => {
  it('a second claim the SAME day is an idempotent no-op (pixels 0, one step this day)', async () => {
    const a = await registerUser();
    await seedPriorLadderSteps(a.id, 3); // pending step = 4

    const first = await request(app).post('/api/me/daily-bonus').set(authed(a.token));
    expect(first.body.granted).toBe(true);
    expect(first.body.pixels).toBe(NEWCOMER_LADDER_STEPS[3]); // step 4 (+3)

    const second = await request(app).post('/api/me/daily-bonus').set(authed(a.token));
    expect(second.body.granted).toBe(false);
    expect(second.body.pixels).toBe(0);
    expect(second.body.balance).toBe(first.body.balance); // unchanged

    expect(await ledgerCount(a.id, 'milestone')).toBe(4); // 3 seeded + exactly one today
    const rec = await ledger.reconcile(a.id);
    expect(rec.ok).toBe(true);
  });
});

describe('F36 (decision 0074): two parallel claims on a ladder day → exactly one step granted', () => {
  it('parallel POSTs → one grants a single step, reconcile holds', async () => {
    const a = await registerUser();
    await seedPriorLadderSteps(a.id, 2); // pending step = 3

    const [r1, r2] = await Promise.all([
      request(app).post('/api/me/daily-bonus').set(authed(a.token)),
      request(app).post('/api/me/daily-bonus').set(authed(a.token)),
    ]);
    const granted = [r1.body.granted, r2.body.granted];
    expect(granted.filter(Boolean)).toHaveLength(1); // exactly one step lands
    expect(await ledgerCount(a.id, 'milestone')).toBe(3); // 2 seeded + exactly one today (no double-advance)
    const rec = await ledger.reconcile(a.id);
    expect(rec.balance).toBe(
      STARTING_GRANT + NEWCOMER_LADDER_STEPS[0] + NEWCOMER_LADDER_STEPS[1] + NEWCOMER_LADDER_STEPS[2],
    );
    expect(rec.ok).toBe(true);
  });
});

describe('COSM-03 (decision 0074): the earned-only cosmetic slot', () => {
  it('an EMPTY slot no-ops gracefully — the PX lands, no entitlement is written', async () => {
    setLadderCosmeticForTest(0, null); // simulate an unfilled slot (D1-D6 carry a REAL id since 0075/P10 — D7 is the genuinely-empty one)
    const a = await registerUser();
    const res = await request(app).post('/api/me/daily-bonus').set(authed(a.token));
    expect(res.body.granted).toBe(true);
    expect(res.body.cosmeticId).toBeUndefined();
    expect(await entitlementCount(a.id)).toBe(0);
  });

  it('a FILLED slot grants the earned entitlement exactly once (idempotent under a same-day replay)', async () => {
    setLadderCosmeticForTest(0, 'newcomer-fixture-1'); // fill step-1's slot
    const a = await registerUser();

    // The wallet tease carries the cosmetic id when the slot is filled.
    const pre = await request(app).get('/api/me/wallet').set(authed(a.token));
    expect(pre.body.dailyBonus.ladderReward).toEqual({
      pixels: NEWCOMER_LADDER_STEPS[0],
      cosmeticId: 'newcomer-fixture-1',
    });

    const claim = await request(app).post('/api/me/daily-bonus').set(authed(a.token));
    expect(claim.body.granted).toBe(true);
    expect(claim.body.cosmeticId).toBe('newcomer-fixture-1');
    expect(claim.body.pixels).toBe(NEWCOMER_LADDER_STEPS[0]);

    // Exactly one earned entitlement; a same-day replay grants nothing further.
    await request(app).post('/api/me/daily-bonus').set(authed(a.token));
    expect(await entitlementCount(a.id, 'newcomer-fixture-1')).toBe(1);
    const rows = await getDb()
      .select()
      .from(userEntitlements)
      .where(eq(userEntitlements.userId, a.id));
    expect(rows[0]!.source).toBe('earned'); // ACH-04 prestige lane, never purchasable
  });
});

describe('ECON-02 (decision 0074): claim 8+ falls back to the standing +1 lapsing daily', () => {
  it('after the 7-step ladder, the next claim is a +1 daily_claim and the ladder tease is gone', async () => {
    const a = await registerUser();
    await seedPriorLadderSteps(a.id, NEWCOMER_LADDER_LENGTH); // full ladder done (7 steps)

    // The wallet no longer teases a ladder step (the veteran view).
    const walletPre = await request(app).get('/api/me/wallet').set(authed(a.token));
    expect(walletPre.body.dailyBonus.ladderStep).toBeUndefined();
    expect(walletPre.body.dailyBonus.ladderReward).toBeUndefined();
    expect(walletPre.body.dailyBonus.amount).toBe(DAILY_BONUS); // the standing +1

    const res = await request(app).post('/api/me/daily-bonus').set(authed(a.token));
    expect(res.body.granted).toBe(true);
    expect(res.body.pixels).toBe(DAILY_BONUS); // +1, the standing daily
    expect(await ledgerCount(a.id, 'daily_claim')).toBe(1); // the first STANDING claim
    expect(await ledgerCount(a.id, 'milestone')).toBe(NEWCOMER_LADDER_LENGTH); // ladder unchanged
    const rec = await ledger.reconcile(a.id);
    expect(rec.ok).toBe(true);
  });
});

describe('ECON-07 (decision 0074): the ledger reconciles across the full 7-day ladder walk', () => {
  it('seeding steps 1–6 then claiming step 7 lands the full 25-PX ladder over the 10-PX grant', async () => {
    const a = await registerUser();
    await seedPriorLadderSteps(a.id, NEWCOMER_LADDER_LENGTH - 1); // steps 1–6 on distinct past days

    const res = await request(app).post('/api/me/daily-bonus').set(authed(a.token));
    expect(res.body.granted).toBe(true);
    expect(res.body.pixels).toBe(NEWCOMER_LADDER_STEPS[NEWCOMER_LADDER_LENGTH - 1]); // step 7 (+6)

    const ladderTotal = NEWCOMER_LADDER_STEPS.reduce((s, x) => s + x, 0); // 25
    const rec = await ledger.reconcile(a.id);
    expect(rec.balance).toBe(STARTING_GRANT + ladderTotal); // 10 + 25 = 35
    expect(rec.ok).toBe(true);
    expect(await ledgerCount(a.id, 'milestone')).toBe(NEWCOMER_LADDER_LENGTH); // exactly 7 ladder rows
  });
});
