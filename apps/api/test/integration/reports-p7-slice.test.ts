import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import { randomUUID } from 'node:crypto';
import { eq } from 'drizzle-orm';
import { PostgreSqlContainer, type StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import type { Express } from 'express';

// M6 P7 — MOD-01 report capture (decision 0076 §0.5) at the HTTP boundary (supertest + REAL Postgres).
// CAPTURE-ONLY: no hide, no queue read (M7 owns those) — this file covers the reason/details validity
// matrix per target type, the `reports:create` 10/day bucket, SELF_TARGET on a user self-report, the
// deliberate NO-existence-check posture (an unknown/invisible target is ACCEPTED exactly like a real
// one — never an oracle), duplicate reports accepted idempotently (i.e. NOT deduped), SYS-07, and the
// `report.filed` event payload (reportId + targetType ONLY — never the reason/targetId/details text).
// Tags: MOD-01, SYS-01, SYS-02, SYS-05, SYS-07.

let container: StartedPostgreSqlContainer;
let app: Express;

const PW = 'Sup3rSecret!';
let counter = 0;

function authed(token: string) {
  return { Authorization: `Bearer ${token}` };
}

async function registerUser() {
  counter += 1;
  const email = `rpt${counter}_${randomUUID().slice(0, 6)}@example.com`;
  const username = `rptuser${counter}${randomUUID().slice(0, 4)}`;
  const res = await request(app)
    .post('/api/auth/register')
    .send({ email, username, password: PW, acceptedTerms: true });
  if (res.status !== 201) throw new Error(`registerUser failed: ${res.status} ${JSON.stringify(res.body)}`);
  return { id: res.body.user.id as string, username, token: res.body.accessToken as string };
}

function postReport(token: string, body: Record<string, unknown>) {
  return request(app).post('/api/reports').set(authed(token)).send(body);
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

describe('MOD-01: POST /reports — the reason/details validity matrix', () => {
  const VALID: Array<{ targetType: string; reason: string; needsDetails: boolean }> = [
    { targetType: 'card', reason: 'offensive', needsDetails: false },
    { targetType: 'card', reason: 'wrong_game', needsDetails: false },
    { targetType: 'card', reason: 'spam', needsDetails: false },
    { targetType: 'game', reason: 'duplicate', needsDetails: false },
    { targetType: 'game', reason: 'incorrect_info', needsDetails: true },
    { targetType: 'user', reason: 'abusive_profile', needsDetails: false },
    { targetType: 'user', reason: 'impersonation', needsDetails: true },
    { targetType: 'user', reason: 'spam', needsDetails: false },
  ];

  for (const { targetType, reason, needsDetails } of VALID) {
    it(`${targetType}/${reason} → 201${needsDetails ? ' (details supplied)' : ''}`, async () => {
      const a = await registerUser();
      const res = await postReport(a.token, {
        targetType,
        targetId: randomUUID(),
        reason,
        ...(needsDetails ? { details: 'It really is not the right game.' } : {}),
      });
      expect(res.status).toBe(201);
      expect(res.body.ok).toBe(true);
      expect(typeof res.body.reportId).toBe('string');
    });
  }

  it('game/incorrect_info WITHOUT details → 422 (details required)', async () => {
    const a = await registerUser();
    const res = await postReport(a.token, {
      targetType: 'game',
      targetId: randomUUID(),
      reason: 'incorrect_info',
    });
    expect(res.status).toBe(422);
  });

  it('user/impersonation WITHOUT details → 422 (details required)', async () => {
    const a = await registerUser();
    const res = await postReport(a.token, {
      targetType: 'user',
      targetId: randomUUID(),
      reason: 'impersonation',
    });
    expect(res.status).toBe(422);
  });

  it('a reason not valid for its target → 422 (e.g. "duplicate" on a card, "offensive" on a user)', async () => {
    const a = await registerUser();
    const onCard = await postReport(a.token, { targetType: 'card', targetId: randomUUID(), reason: 'duplicate' });
    expect(onCard.status).toBe(422);
    const onUser = await postReport(a.token, { targetType: 'user', targetId: randomUUID(), reason: 'offensive' });
    expect(onUser.status).toBe(422);
  });

  it('authz:report_create — an unauthenticated actorB POST /reports → 401', async () => {
    const res = await request(app)
      .post('/api/reports')
      .send({ targetType: 'card', targetId: randomUUID(), reason: 'offensive' });
    expect(res.status).toBe(401);
  });
});

describe('MOD-01: capture-only posture — never an existence oracle', () => {
  it('a report against an UNKNOWN/nonexistent target is ACCEPTED exactly like a real one → 201', async () => {
    const a = await registerUser();
    const res = await postReport(a.token, {
      targetType: 'card',
      targetId: randomUUID(), // never created — no such card exists
      reason: 'offensive',
    });
    expect(res.status).toBe(201);
  });

  it('DUPLICATE reports against the SAME target are each accepted (capture-only, no dedup at M6)', async () => {
    const a = await registerUser();
    const targetId = randomUUID();
    const first = await postReport(a.token, { targetType: 'card', targetId, reason: 'spam' });
    const second = await postReport(a.token, { targetType: 'card', targetId, reason: 'spam' });
    expect(first.status).toBe(201);
    expect(second.status).toBe(201);
    expect(second.body.reportId).not.toBe(first.body.reportId); // two distinct rows, not a no-op
  });
});

describe('MOD-01: SELF_TARGET — a user cannot report themselves', () => {
  it('user report with targetId === the reporter → 409 SELF_TARGET', async () => {
    const a = await registerUser();
    const res = await postReport(a.token, { targetType: 'user', targetId: a.id, reason: 'spam' });
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('SELF_TARGET');
  });

  it('a CARD/GAME report carrying the actor’s own id as targetId is NOT self-target (only user reports are)', async () => {
    const a = await registerUser();
    const res = await postReport(a.token, { targetType: 'card', targetId: a.id, reason: 'offensive' });
    expect(res.status).toBe(201);
  });
});

describe('SYS-05: reports:create — the 10/day rate bucket', () => {
  it('a burst past the daily cap → 429 RATE_LIMITED', async () => {
    const a = await registerUser();
    const { overrideRuleForTest } = await import('../../src/config/rate-limits');
    overrideRuleForTest('reports:create', { limit: 2, windowMs: 24 * 60 * 60_000 });
    const results = [];
    for (let i = 0; i < 3; i++) {
      results.push(await postReport(a.token, { targetType: 'card', targetId: randomUUID(), reason: 'spam' }));
    }
    const limited = results.filter((r) => r.status === 429);
    expect(limited.length).toBeGreaterThan(0);
    expect(limited[0]?.body.error.code).toBe('RATE_LIMITED');
  });
});

describe('rule-5/F18: report.filed emits { reportId, targetType } ONLY — never reason/targetId/details', () => {
  it('the domain-event payload never carries the details text or the target id', async () => {
    const a = await registerUser();
    const targetId = randomUUID(); // a different user id than the reporter (avoid SELF_TARGET)
    const res = await postReport(a.token, {
      targetType: 'user',
      targetId,
      reason: 'impersonation',
      details: 'a very specific and identifying secret detail string',
    });
    expect(res.status).toBe(201);

    const { getDb } = await import('../../src/db/client');
    const { domainEvents } = await import('../../src/db/schema');
    const evs = await getDb().select().from(domainEvents).where(eq(domainEvents.eventType, 'report.filed'));
    expect(evs).toHaveLength(1);
    expect(evs[0]!.payload).toEqual({ reportId: res.body.reportId, targetType: 'user' });
    expect(JSON.stringify(evs[0]!.payload)).not.toContain('identifying secret detail');
    expect(JSON.stringify(evs[0]!.payload)).not.toContain(targetId);
  });
});
