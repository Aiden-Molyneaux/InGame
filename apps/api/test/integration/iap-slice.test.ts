import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import { randomUUID } from 'node:crypto';
import { and, count, eq } from 'drizzle-orm';
import { PostgreSqlContainer, type StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import type { Express } from 'express';
import { STARTING_GRANT, REFUND_FLOOR } from '../../src/config/economy';
import { getDb } from '../../src/db/client';
import * as ledger from '../../src/services/economy/ledger-service';
import { currencyLedger, iapReceipts, storeProducts } from '../../src/db/schema';
import {
  MockRevenueCat,
  encodeMockReceipt,
  encodeMockSubscriber,
  setIapProvider,
  resetIapProvider,
  type ValidatedReceipt,
} from '../../src/services/iap';

// ECON-06/09/10 — the M5 P2 IAP seam at the HTTP boundary on REAL Postgres, built entirely against the
// deterministic MockRevenueCat (testing-strategy §5; the real RC swap-in is P2b). wallets +
// currency_ledger + iap_receipts are USER-OWNED; store_products is GLOBAL. Every grant/reversal funnels
// through the P1 ledger (sum(delta) == balance holds). The concurrency assertions (F36) fire parallel
// validates against real PG row locks + the UNIQUE receiptId. The webhook's signature IS its auth.
// Tags: ECON-06/09/10, SYS-01/07, F36.

let container: StartedPostgreSqlContainer;
let app: Express;

const PW = 'Sup3rSecret!';
const WEBHOOK_SECRET = 'test-rc-webhook-secret';
let counter = 0;

// The decision-0072 pack ladder (the P10 seed's content; inlined here so this slice owns its fixtures).
const PACKS = [
  { productId: 'px_pack_starter', pixels: 12, oneTime: true },
  { productId: 'px_pack_010', pixels: 10, oneTime: false },
  { productId: 'px_pack_030', pixels: 30, oneTime: false },
  { productId: 'px_pack_065', pixels: 65, oneTime: false },
  { productId: 'px_pack_140', pixels: 140, oneTime: false },
] as const;

function authed(token: string) {
  return { Authorization: `Bearer ${token}` };
}

async function registerUser() {
  counter += 1;
  const email = `iap${counter}_${randomUUID().slice(0, 6)}@example.com`;
  const username = `iapuser${counter}${randomUUID().slice(0, 4)}`;
  const res = await request(app)
    .post('/api/auth/register')
    .send({ email, username, password: PW, acceptedTerms: true });
  if (res.status !== 201) throw new Error(`registerUser failed: ${res.status}`);
  return { id: res.body.user.id as string, token: res.body.accessToken as string };
}

/** A deterministic mock receipt token for a product (a fresh unique receiptId each call by default). */
function receiptFor(
  productId: string,
  opts: { receiptId?: string; platform?: 'ios' | 'android' } = {},
): { token: string; receipt: ValidatedReceipt } {
  const receipt: ValidatedReceipt = {
    receiptId: opts.receiptId ?? `txn_${randomUUID()}`,
    productId,
    platform: opts.platform ?? 'ios',
  };
  return { token: encodeMockReceipt(receipt), receipt };
}

async function ledgerCount(userId: string, reason?: string) {
  const where = reason
    ? and(eq(currencyLedger.userId, userId), eq(currencyLedger.reason, reason))
    : eq(currencyLedger.userId, userId);
  const rows = await getDb().select({ n: count() }).from(currencyLedger).where(where);
  return Number(rows[0]!.n);
}

async function receiptCount(userId: string) {
  const rows = await getDb()
    .select({ n: count() })
    .from(iapReceipts)
    .where(eq(iapReceipts.userId, userId));
  return Number(rows[0]!.n);
}

async function seedProducts() {
  for (const p of PACKS) {
    await getDb()
      .insert(storeProducts)
      .values({ productId: p.productId, pixels: p.pixels, oneTime: p.oneTime, active: true })
      .onConflictDoNothing({ target: storeProducts.productId });
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
  await seedProducts();
}, 120_000);

afterAll(async () => {
  resetIapProvider();
  const { closeDb } = await import('../../src/db/client');
  await closeDb();
  if (container) await container.stop();
});

beforeEach(async () => {
  const { resetDb } = await import('../../src/db/reset');
  await resetDb(); // truncates users CASCADE (wallets/ledger/receipts) — store_products (GLOBAL) survives
  await seedProducts(); // idempotent re-seed guard (belt-and-braces; reset does not touch GLOBAL tables)
  const { resetRateLimitStore } = await import('../../src/http/rateLimit');
  resetRateLimitStore();
  const { clearRuleOverrides } = await import('../../src/config/rate-limits');
  clearRuleOverrides();
  // A mock with a KNOWN webhook secret — the swap-in seam exercised deterministically.
  setIapProvider(new MockRevenueCat({ webhookAuthSecret: WEBHOOK_SECRET }));
});

// ── SYS-07 authz (the actor-B / bad-signature 4xx tests the route inventory demands) ────────────────────
describe('SYS-07 authz:iap_validate / authz:iap_webhook — actor-B & bad-signature 4xx (SYS-01)', () => {
  it('POST /iap/validate + GET /store reject an unauthenticated actor-B → 401', async () => {
    const { token } = receiptFor('px_pack_010');
    const anonValidate = await request(app)
      .post('/api/iap/validate')
      .send({ platform: 'ios', receipt: token });
    expect(anonValidate.status).toBe(401); // authz:iap_validate — no principal
    const anonStore = await request(app).get('/api/store');
    expect(anonStore.status).toBe(401);
  });

  it('POST /iap/webhook with a bad signature → 401 and ZERO state change (authz:iap_webhook)', async () => {
    const a = await registerUser();
    const { token, receipt } = receiptFor('px_pack_030');
    await request(app).post('/api/iap/validate').set(authed(a.token)).send({ platform: 'ios', receipt: token });
    const before = await ledger.reconcile(a.id);

    const bad = await request(app)
      .post('/api/iap/webhook')
      .set('Authorization', 'wrong-secret')
      .send({ event: { type: 'REFUND', app_user_id: a.id, transaction_id: receipt.receiptId } });
    expect(bad.status).toBe(401);

    // A missing Authorization header is likewise rejected — the signature is the only auth.
    const missing = await request(app)
      .post('/api/iap/webhook')
      .send({ event: { type: 'REFUND', app_user_id: a.id, transaction_id: receipt.receiptId } });
    expect(missing.status).toBe(401);

    const after = await ledger.reconcile(a.id);
    expect(after.balance).toBe(before.balance); // no reversal happened
    expect(after.ok).toBe(true);
  });
});

// ── ECON-06: validate grants once; a replay never double-grants ─────────────────────────────────────────
describe('ECON-06: a valid receipt grants once; the SAME receipt replayed never double-grants', () => {
  it('first validate grants +10 (px_pack_010); the sequential replay is an idempotent no-op', async () => {
    const a = await registerUser();
    const { token } = receiptFor('px_pack_010');

    const first = await request(app)
      .post('/api/iap/validate')
      .set(authed(a.token))
      .send({ platform: 'ios', receipt: token });
    expect(first.status).toBe(200);
    expect(first.body.granted).toBe(true);
    expect(first.body.pixels).toBe(10);
    expect(first.body.balance).toBe(STARTING_GRANT + 10); // 15

    const replay = await request(app)
      .post('/api/iap/validate')
      .set(authed(a.token))
      .send({ platform: 'ios', receipt: token });
    expect(replay.status).toBe(200);
    expect(replay.body.granted).toBe(false);
    expect(replay.body.balance).toBe(STARTING_GRANT + 10); // unchanged

    expect(await ledgerCount(a.id, 'pack_purchase')).toBe(1); // exactly one grant
    expect(await receiptCount(a.id)).toBe(1); // exactly one receipt row
    const rec = await ledger.reconcile(a.id);
    expect(rec.balance).toBe(STARTING_GRANT + 10);
    expect(rec.ok).toBe(true);
  });

  it('the SAME receipt validated 2× in PARALLEL grants exactly once (UNIQUE receiptId + wallet lock, F36)', async () => {
    const a = await registerUser();
    const { token } = receiptFor('px_pack_030');
    const [r1, r2] = await Promise.all([
      request(app).post('/api/iap/validate').set(authed(a.token)).send({ platform: 'ios', receipt: token }),
      request(app).post('/api/iap/validate').set(authed(a.token)).send({ platform: 'ios', receipt: token }),
    ]);
    expect(r1.status).toBe(200);
    expect(r2.status).toBe(200);
    const granted = [r1.body.granted, r2.body.granted];
    expect(granted.filter(Boolean)).toHaveLength(1); // exactly one true

    expect(await ledgerCount(a.id, 'pack_purchase')).toBe(1);
    expect(await receiptCount(a.id)).toBe(1);
    const rec = await ledger.reconcile(a.id);
    expect(rec.balance).toBe(STARTING_GRANT + 30); // 35 — one grant only
    expect(rec.ok).toBe(true);
  });
});

// ── ECON-06 restore: consumables are never re-granted ───────────────────────────────────────────────────
describe('ECON-06 restore (rcUserId): re-sync grants nothing for recorded receipts', () => {
  it('restore over an already-recorded receipt returns success WITHOUT re-granting', async () => {
    const a = await registerUser();
    const { token, receipt } = receiptFor('px_pack_065');
    const buy = await request(app)
      .post('/api/iap/validate')
      .set(authed(a.token))
      .send({ platform: 'ios', receipt: token });
    expect(buy.body.balance).toBe(STARTING_GRANT + 65); // 70

    // The subscriber token carries the SAME (recorded) receipt — restore re-validates + re-syncs.
    const rcUserId = encodeMockSubscriber([receipt]);
    const restore = await request(app)
      .post('/api/iap/validate')
      .set(authed(a.token))
      .send({ platform: 'ios', rcUserId });
    expect(restore.status).toBe(200);
    expect(restore.body.granted).toBe(false); // consumables are account state, never re-granted
    expect(restore.body.balance).toBe(STARTING_GRANT + 65); // unchanged

    expect(await ledgerCount(a.id, 'pack_purchase')).toBe(1); // still one grant
    expect(await receiptCount(a.id)).toBe(1);
  });

  it('restore with an unparseable subscriber id → 422 (invalid_subscriber)', async () => {
    const a = await registerUser();
    const res = await request(app)
      .post('/api/iap/validate')
      .set(authed(a.token))
      .send({ platform: 'ios', rcUserId: 'not-a-mock-subscriber' });
    expect(res.status).toBe(422);
  });
});

// ── ECON-10: the once-per-account Starter Pack ──────────────────────────────────────────────────────────
describe('ECON-10: a second Starter Pack (different receipt) → 409 STARTER_PACK_CONSUMED', () => {
  it('the first starter grants +12; a DIFFERENT receipt for it is refused; a SAME-receipt replay is a no-op', async () => {
    const a = await registerUser();
    const first = receiptFor('px_pack_starter');
    const buy = await request(app)
      .post('/api/iap/validate')
      .set(authed(a.token))
      .send({ platform: 'ios', receipt: first.token });
    expect(buy.body.granted).toBe(true);
    expect(buy.body.balance).toBe(STARTING_GRANT + 12); // 17

    // A DIFFERENT receipt for the one-time product → 409 (already consumed).
    const second = receiptFor('px_pack_starter');
    const refused = await request(app)
      .post('/api/iap/validate')
      .set(authed(a.token))
      .send({ platform: 'ios', receipt: second.token });
    expect(refused.status).toBe(409);
    expect(refused.body.error.code).toBe('STARTER_PACK_CONSUMED');

    // The SAME first receipt replayed is still an idempotent SUCCESS (not a 409) — ECON-06 precedence.
    const replay = await request(app)
      .post('/api/iap/validate')
      .set(authed(a.token))
      .send({ platform: 'ios', receipt: first.token });
    expect(replay.status).toBe(200);
    expect(replay.body.granted).toBe(false);

    expect(await receiptCount(a.id)).toBe(1); // only the first starter recorded
    expect(await ledgerCount(a.id, 'pack_purchase')).toBe(1);
    const rec = await ledger.reconcile(a.id);
    expect(rec.balance).toBe(STARTING_GRANT + 12);
    expect(rec.ok).toBe(true);
  });
});

// ── ECON-09: refund reversal (webhook) ──────────────────────────────────────────────────────────────────
describe('ECON-09: a refund webhook reverses EXACTLY pixelsGranted; the balance may land below the floor', () => {
  it('reverses the full grant even past −25 (let-it-land-fully); a replayed refund reverses once', async () => {
    const a = await registerUser();
    const { token, receipt } = receiptFor('px_pack_030');

    // Buy 30 (balance 35), then spend it down to 0 via a real ledger op (a spent-down wallet).
    await request(app).post('/api/iap/validate').set(authed(a.token)).send({ platform: 'ios', receipt: token });
    await getDb().transaction((tx) =>
      ledger.debit(tx, a.id, { amount: STARTING_GRANT + 30, reason: 'acquire' }),
    );
    expect((await ledger.reconcile(a.id)).balance).toBe(0);

    // The refund reverses the full 30 → −30, landing BELOW the −25 floor (the flagged choice: land fully).
    const refund = await request(app)
      .post('/api/iap/webhook')
      .set('Authorization', WEBHOOK_SECRET)
      .send({ event: { type: 'REFUND', app_user_id: a.id, transaction_id: receipt.receiptId } });
    expect(refund.status).toBe(200);
    expect(refund.body.reversed).toBe(true);
    expect(refund.body.balance).toBe(-30);
    expect(refund.body.balance).toBeLessThan(REFUND_FLOOR); // documents the "land fully past −25" choice

    expect(await ledgerCount(a.id, 'refund_reversal')).toBe(1);
    let rec = await ledger.reconcile(a.id);
    expect(rec.balance).toBe(-30);
    expect(rec.ok).toBe(true);

    // Replay the SAME refund webhook → reverses ONCE (idempotent per receipt).
    const replay = await request(app)
      .post('/api/iap/webhook')
      .set('Authorization', WEBHOOK_SECRET)
      .send({ event: { type: 'REFUND', app_user_id: a.id, transaction_id: receipt.receiptId } });
    expect(replay.status).toBe(200);
    expect(replay.body.reversed).toBe(false);
    expect(await ledgerCount(a.id, 'refund_reversal')).toBe(1); // still one reversal

    // The wallet recovers from a future earn (ECON-09) — no cosmetic clawback happened either.
    const { token: t2 } = receiptFor('px_pack_010');
    const earn = await request(app)
      .post('/api/iap/validate')
      .set(authed(a.token))
      .send({ platform: 'ios', receipt: t2 });
    expect(earn.body.balance).toBe(-20); // −30 + 10, recovering
    rec = await ledger.reconcile(a.id);
    expect(rec.ok).toBe(true);
  });

  it('a refund for an unknown/unrecorded receipt is an acknowledged no-op (200, reversed:false)', async () => {
    const a = await registerUser();
    const res = await request(app)
      .post('/api/iap/webhook')
      .set('Authorization', WEBHOOK_SECRET)
      .send({ event: { type: 'REFUND', app_user_id: a.id, transaction_id: 'txn_never_seen' } });
    expect(res.status).toBe(200);
    expect(res.body.reversed).toBe(false);
    expect(await ledgerCount(a.id, 'refund_reversal')).toBe(0);
  });
});

// ── GET /store: the pack ladder + per-caller purchased/oneTime flags ───────────────────────────────────
describe('GET /store: purchased/oneTime flags are correct per caller (ECON-10)', () => {
  it('lists the five packs; a bought pack + the consumed starter read purchased:true for that caller only', async () => {
    const a = await registerUser();
    const b = await registerUser();

    // A buys the starter (one-time) + px_pack_030.
    await request(app)
      .post('/api/iap/validate')
      .set(authed(a.token))
      .send({ platform: 'ios', receipt: receiptFor('px_pack_starter').token });
    await request(app)
      .post('/api/iap/validate')
      .set(authed(a.token))
      .send({ platform: 'ios', receipt: receiptFor('px_pack_030').token });

    const storeA = await request(app).get('/api/store').set(authed(a.token));
    expect(storeA.status).toBe(200);
    expect(storeA.body.packs).toHaveLength(5);
    expect(storeA.body.premiumCosmetics).toEqual([]); // honest empty (P4/P10)
    expect(storeA.body.drops).toEqual([]);
    type Pack = { productId: string; oneTime: boolean; purchased: boolean };
    const pack = (packs: Pack[], id: string): Pack => {
      const found = packs.find((p) => p.productId === id);
      if (!found) throw new Error(`pack ${id} missing from /store`);
      return found;
    };
    expect(pack(storeA.body.packs, 'px_pack_starter').oneTime).toBe(true);
    expect(pack(storeA.body.packs, 'px_pack_starter').purchased).toBe(true); // consumed starter marked (ECON-10)
    expect(pack(storeA.body.packs, 'px_pack_030').purchased).toBe(true);
    expect(pack(storeA.body.packs, 'px_pack_010').purchased).toBe(false);
    expect(pack(storeA.body.packs, 'px_pack_010').oneTime).toBe(false);

    // B (a different caller) sees the SAME catalog with everything un-purchased (own-scoped flags).
    const storeB = await request(app).get('/api/store').set(authed(b.token));
    expect(pack(storeB.body.packs, 'px_pack_starter').purchased).toBe(false);
    expect(pack(storeB.body.packs, 'px_pack_030').purchased).toBe(false);
  });
});
