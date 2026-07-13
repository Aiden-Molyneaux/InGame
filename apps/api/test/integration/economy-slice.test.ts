import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import { randomUUID } from 'node:crypto';
import { and, count, eq } from 'drizzle-orm';
import { PostgreSqlContainer, type StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import type { Express } from 'express';
import { STARTING_GRANT, DAILY_BONUS, SPEND_FLOOR } from '../../src/config/economy';
import { getDb } from '../../src/db/client';
import * as ledger from '../../src/services/economy/ledger-service';
import * as economyRepo from '../../src/repositories/economy-repo';
import { InsufficientBalanceError } from '../../src/errors/AppError';
import { adminAuditLog, currencyLedger, wallets } from '../../src/db/schema';

// ECON-01/02/07/11 — the M5 P1 economy substrate at the HTTP boundary + the ledger primitives on REAL
// Postgres (decision 0072/0073; supertest + Testcontainers). wallets + currency_ledger are USER-OWNED:
// the wallet row is the single serialization point (SELECT … FOR UPDATE), the ledger is append-only,
// and `sum(ledger.delta) == wallet.balance` is the standing reconcile invariant. The concurrency
// assertions (F36, the G-I core) fire N parallel operations WITHIN a test against real PG row locks.
// These modules are import-side-effect-free (db/client reads env lazily at first query), so they load
// eagerly; only the env-sensitive app/migrate/reset stay late (after the container DSN is set).
// Tags: ECON-02/03/07/11, SYS-01/07, F36.

let container: StartedPostgreSqlContainer;
let app: Express;

const PW = 'Sup3rSecret!';
let counter = 0;

function authed(token: string) {
  return { Authorization: `Bearer ${token}` };
}

async function registerUser() {
  counter += 1;
  const email = `econ${counter}_${randomUUID().slice(0, 6)}@example.com`;
  const username = `econuser${counter}${randomUUID().slice(0, 4)}`;
  const res = await request(app)
    .post('/api/auth/register')
    .send({ email, username, password: PW, acceptedTerms: true });
  if (res.status !== 201) throw new Error(`registerUser failed: ${res.status}`);
  return { id: res.body.user.id as string, token: res.body.accessToken as string };
}

/** Count rows on a user-owned table for a user (direct DB — tests are exempt from the scoping lint). */
async function countRows(table: 'wallets' | 'currencyLedger', userId: string, reason?: string) {
  if (table === 'currencyLedger') {
    const where = reason
      ? and(eq(currencyLedger.userId, userId), eq(currencyLedger.reason, reason))
      : eq(currencyLedger.userId, userId);
    const rows = await getDb().select({ n: count() }).from(currencyLedger).where(where);
    return Number(rows[0]!.n);
  }
  const rows = await getDb()
    .select({ n: count() })
    .from(wallets)
    .where(eq(wallets.userId, userId));
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
});

describe('SYS-07 authz:daily_bonus — actor-B / anon 4xx on the daily-bonus mutation (SYS-01)', () => {
  it('an unauthenticated actor → 401; a smuggled body field → 422 (.strict())', async () => {
    const a = await registerUser();
    const anon = await request(app).post('/api/me/daily-bonus').send({});
    expect(anon.status).toBe(401);
    // actor-B claiming with a smuggled field: the claim is server-derived, the body is closed → 422.
    const smuggled = await request(app)
      .post('/api/me/daily-bonus')
      .set(authed(a.token))
      .send({ amount: 999 });
    expect(smuggled.status).toBe(422);
  });

  it('GET /me/wallet + /me/wallet/ledger reject an unauthenticated actor → 401', async () => {
    const wallet = await request(app).get('/api/me/wallet');
    expect(wallet.status).toBe(401);
    const led = await request(app).get('/api/me/wallet/ledger');
    expect(led.status).toBe(401);
  });
});

describe('ECON-02: GET /me/wallet reports the 5-PX starting balance WITHOUT materializing a row', () => {
  it('a fresh user reads balance 5 + an available daily bonus; no wallet/ledger row is written', async () => {
    const a = await registerUser();
    const res = await request(app).get('/api/me/wallet').set(authed(a.token));
    expect(res.status).toBe(200);
    expect(res.body.balance).toBe(STARTING_GRANT); // 5
    expect(res.body.dailyBonus.available).toBe(true);
    expect(res.body.dailyBonus.amount).toBe(DAILY_BONUS); // 1
    expect(typeof res.body.dailyBonus.nextResetAt).toBe('string');
    // The pure read persisted nothing (the grant materializes on the first economic MUTATION).
    expect(await countRows('wallets', a.id)).toBe(0);
    expect(await countRows('currencyLedger', a.id)).toBe(0);
  });
});

describe('ECON-02: the starting grant is exactly-once under the concurrent first-touch race (F36)', () => {
  it('two parallel first-touches → one wallet, one starting_grant row, balance 5', async () => {
    const a = await registerUser();
    // Two parallel transactions both materialize-and-lock the wallet for the first time (real PG).
    await Promise.all([
      getDb().transaction((tx) => economyRepo.ensureWalletForUpdate(tx, a.id)),
      getDb().transaction((tx) => economyRepo.ensureWalletForUpdate(tx, a.id)),
    ]);
    expect(await countRows('wallets', a.id)).toBe(1);
    expect(await countRows('currencyLedger', a.id, 'starting_grant')).toBe(1);
    const rec = await ledger.reconcile(a.id);
    expect(rec.balance).toBe(STARTING_GRANT); // 5
    expect(rec.ok).toBe(true);
  });
});

describe('ECON-02: daily bonus — idempotent per UTC-day, unclaimed days lapse (no banking)', () => {
  it('POST grants +1 the first time, is a no-op the second time SAME day', async () => {
    const a = await registerUser();
    const first = await request(app).post('/api/me/daily-bonus').set(authed(a.token));
    expect(first.status).toBe(200);
    expect(first.body.granted).toBe(true);
    expect(first.body.balance).toBe(STARTING_GRANT + DAILY_BONUS); // 6 (grant + one claim, no banking)

    const second = await request(app).post('/api/me/daily-bonus').set(authed(a.token));
    expect(second.status).toBe(200);
    expect(second.body.granted).toBe(false);
    expect(second.body.balance).toBe(STARTING_GRANT + DAILY_BONUS); // unchanged

    expect(await countRows('currencyLedger', a.id, 'daily_claim')).toBe(1); // exactly one claim
  });

  it('two parallel claims same day → exactly one grants (wallet-lock + period-unique backstop)', async () => {
    const a = await registerUser();
    const [r1, r2] = await Promise.all([
      request(app).post('/api/me/daily-bonus').set(authed(a.token)),
      request(app).post('/api/me/daily-bonus').set(authed(a.token)),
    ]);
    const granted = [r1.body.granted, r2.body.granted];
    expect(granted.filter(Boolean)).toHaveLength(1); // exactly one true
    expect(await countRows('currencyLedger', a.id, 'daily_claim')).toBe(1);
    const rec = await ledger.reconcile(a.id);
    expect(rec.balance).toBe(STARTING_GRANT + DAILY_BONUS);
    expect(rec.ok).toBe(true);
  });

  it("a prior day's claim does NOT block today (per-UTC-day scoping; lapse = no make-up)", async () => {
    const a = await registerUser();
    // Seed a claim for YESTERDAY's period key directly; materialize the wallet first.
    await getDb().transaction((tx) => economyRepo.ensureWalletForUpdate(tx, a.id));
    const yesterday = new Date(Date.now() - 24 * 60 * 60_000).toISOString().slice(0, 10);
    await getDb().transaction((tx) =>
      economyRepo.insertLedgerRow(tx, a.id, {
        delta: DAILY_BONUS,
        reason: 'daily_claim',
        periodKey: yesterday,
      }),
    );
    // Today's claim is still available (yesterday's does not carry — it lapsed) and grants exactly +1.
    const res = await request(app).post('/api/me/daily-bonus').set(authed(a.token));
    expect(res.body.granted).toBe(true);
    expect(await countRows('currencyLedger', a.id, 'daily_claim')).toBe(2); // yesterday + today
  });
});

describe('ECON-01/07: INSUFFICIENT_BALANCE — a debit below the spend floor carries the correct {shortBy}', () => {
  it('a spend of 5 against a balance of 3 refuses with shortBy 2 (409)', async () => {
    const a = await registerUser();
    // Materialize + trim the balance to 3 (grant 5, then a debit of 2).
    await getDb().transaction((tx) => ledger.debit(tx, a.id, { amount: 2, reason: 'acquire' }));
    let thrown: unknown;
    try {
      await getDb().transaction((tx) => ledger.debit(tx, a.id, { amount: 5, reason: 'acquire' }));
    } catch (e) {
      thrown = e;
    }
    expect(thrown).toBeInstanceOf(InsufficientBalanceError);
    expect((thrown as InstanceType<typeof InsufficientBalanceError>).shortBy).toBe(2); // 5 − (3 − 0)
    expect((thrown as InstanceType<typeof InsufficientBalanceError>).httpStatus).toBe(409);
    // The failed debit rolled back — balance stays 3, reconcile holds.
    const rec = await ledger.reconcile(a.id);
    expect(rec.balance).toBe(STARTING_GRANT - 2); // 3
    expect(rec.ok).toBe(true);
    expect(SPEND_FLOOR).toBe(0); // documents the floor the shortBy is computed against
  });
});

describe('F36 (G-I core): N parallel debits against a one-spend balance — exactly one succeeds', () => {
  it('5 parallel debits of 5 on a fresh wallet (balance 5) → 1 success, 4 INSUFFICIENT_BALANCE, reconcile holds', async () => {
    const a = await registerUser();
    const results = await Promise.allSettled(
      Array.from({ length: 5 }, () =>
        getDb().transaction((tx) => ledger.debit(tx, a.id, { amount: 5, reason: 'acquire' })),
      ),
    );
    const ok = results.filter((r) => r.status === 'fulfilled');
    const rejected = results.filter((r) => r.status === 'rejected');
    expect(ok).toHaveLength(1); // real PG SELECT … FOR UPDATE serialized the winner
    expect(rejected).toHaveLength(4);
    for (const r of rejected as PromiseRejectedResult[]) {
      expect(r.reason).toBeInstanceOf(InsufficientBalanceError);
    }
    // One starting_grant (+5) + exactly one acquire (−5) → balance 0, ledger reconciles.
    expect(await countRows('currencyLedger', a.id, 'starting_grant')).toBe(1);
    expect(await countRows('currencyLedger', a.id, 'acquire')).toBe(1);
    const rec = await ledger.reconcile(a.id);
    expect(rec.balance).toBe(0);
    expect(rec.ok).toBe(true);
  });
});

describe('ECON-07: the ledger reconciles after an arbitrary op sequence (credits, debits, adjustments)', () => {
  it('sum(ledger.delta) == wallet.balance across a mixed sequence', async () => {
    const a = await registerUser();
    const op = await registerUser(); // the operator for the ECON-11 adjustment
    // Deterministic mixed sequence — each op is its own transaction (as P2/P3/P4 would drive them).
    await getDb().transaction((tx) => ledger.credit(tx, a.id, { amount: 10, reason: 'pack_purchase' }));
    await getDb().transaction((tx) => ledger.debit(tx, a.id, { amount: 3, reason: 'acquire' }));
    await getDb().transaction((tx) => ledger.credit(tx, a.id, { amount: 2, reason: 'milestone' }));
    await getDb().transaction((tx) => ledger.debit(tx, a.id, { amount: 4, reason: 'adoption' }));
    await ledger.adjustPixels(op.id, a.id, 5, 'goodwill'); // +5 admin_adjustment
    await ledger.adjustPixels(op.id, a.id, -2, 'correction'); // −2 admin_adjustment
    // Expected: 5 (grant) + 10 − 3 + 2 − 4 + 5 − 2 = 13.
    const rec = await ledger.reconcile(a.id);
    expect(rec.balance).toBe(13);
    expect(rec.ledgerSum).toBe(13);
    expect(rec.ok).toBe(true);
  });
});

describe('ECON-11: adjustPixels writes the ledger row + the MOD-10 audit row atomically (service-op, no route)', () => {
  it('a +7 operator credit lands on the target wallet as one admin_adjustment + one audit row', async () => {
    const target = await registerUser();
    const operator = await registerUser();
    const { balance } = await ledger.adjustPixels(operator.id, target.id, 7, 'goodwill credit');
    expect(balance).toBe(STARTING_GRANT + 7); // 12 (grant materialized in the same op)

    expect(await countRows('currencyLedger', target.id, 'admin_adjustment')).toBe(1);
    // The MOD-10 audit row: operator = actor, target = user, reason carried.
    const audit = await getDb()
      .select()
      .from(adminAuditLog)
      .where(and(eq(adminAuditLog.actorId, operator.id), eq(adminAuditLog.targetId, target.id)));
    expect(audit).toHaveLength(1);
    expect(audit[0]!.action).toBe('economy.adjust_pixels');
    expect(audit[0]!.reason).toBe('goodwill credit');
    // ECON-11 is the ECON-09 clawback exception — a debit may drive the balance negative (unfloored).
    const clawback = await ledger.adjustPixels(operator.id, target.id, -20, 'bug correction');
    expect(clawback.balance).toBe(STARTING_GRANT + 7 - 20); // −8, below zero, allowed
  });
});

describe('ECON-07: GET /me/wallet + /me/wallet/ledger — the user-facing balance + history', () => {
  it('after a claim, GET /me/wallet shows balance 6 + bonus unavailable; the ledger lists newest-first', async () => {
    const a = await registerUser();
    await request(app).post('/api/me/daily-bonus').set(authed(a.token));

    const wallet = await request(app).get('/api/me/wallet').set(authed(a.token));
    expect(wallet.body.balance).toBe(STARTING_GRANT + DAILY_BONUS); // 6
    expect(wallet.body.dailyBonus.available).toBe(false);

    const led = await request(app).get('/api/me/wallet/ledger').set(authed(a.token));
    expect(led.status).toBe(200);
    expect(led.body.items).toHaveLength(2); // starting_grant + daily_claim
    expect(led.body.items[0].type).toBe('daily_claim'); // newest first
    expect(led.body.items[1].type).toBe('starting_grant');
    expect(led.body.nextCursor).toBeNull();
  });

  it('the ledger paginates: limit=2 returns a nextCursor; the next page continues + ends null', async () => {
    const a = await registerUser();
    // Materialize (grant) + 4 credits → 5 ledger rows total.
    for (let i = 0; i < 4; i++) {
      await getDb().transaction((tx) =>
        ledger.credit(tx, a.id, { amount: 1, reason: 'milestone' }),
      );
    }
    const p1 = await request(app).get('/api/me/wallet/ledger?limit=2').set(authed(a.token));
    expect(p1.body.items).toHaveLength(2);
    expect(p1.body.nextCursor).toBe('2');
    const p2 = await request(app)
      .get(`/api/me/wallet/ledger?limit=2&cursor=${p1.body.nextCursor}`)
      .set(authed(a.token));
    expect(p2.body.items).toHaveLength(2);
    expect(p2.body.nextCursor).toBe('4');
    const p3 = await request(app)
      .get(`/api/me/wallet/ledger?limit=2&cursor=${p2.body.nextCursor}`)
      .set(authed(a.token));
    expect(p3.body.items).toHaveLength(1); // the 5th row
    expect(p3.body.nextCursor).toBeNull();
  });
});
