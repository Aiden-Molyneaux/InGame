import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import { randomUUID, createHash } from 'node:crypto';
import type { KeyLike } from 'jose';
import { PostgreSqlContainer, type StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import type { Express } from 'express';

// AUTH-* email/password auth — the integration heart (supertest + a REAL Postgres). This is the
// gate-3 (auth + SYS-01 seam) + G-G (auth fidelity: rotation rejects the old token · reset single-use ·
// neutral anti-enumeration · limiter 429 under burst) evidence, and the F15 reuse-detection DoD test.
// Tags: AUTH-01/02/04/05/08/11, SYS-05, SYS-07, MOD-09.

let container: StartedPostgreSqlContainer;
let app: Express;

const PW = 'Sup3rSecret!';
let counter = 0;

function post(path: string, body?: unknown) {
  return request(app)
    .post(`/api${path}`)
    .send(body ?? {});
}
function get(path: string) {
  return request(app).get(`/api${path}`);
}

async function registerUser(over: Partial<{ email: string; username: string; password: string }> = {}) {
  counter += 1;
  const email = over.email ?? `u${counter}_${randomUUID().slice(0, 6)}@example.com`;
  const username = over.username ?? `user${counter}${randomUUID().slice(0, 4)}`;
  const password = over.password ?? PW;
  const res = await post('/auth/register', { email, username, password, acceptedTerms: true });
  return { email, username, password, res };
}

async function seedSuspension(subjectId: string, reason = 'abuse', endsAt: Date | null = null) {
  const { getDb } = await import('../../src/db/client');
  const { userSuspensions } = await import('../../src/db/schema');
  await getDb().insert(userSuspensions).values({ subjectId, reason, endsAt });
}

beforeAll(async () => {
  container = await new PostgreSqlContainer('postgres:16-alpine').start();
  process.env.DATABASE_URL = container.getConnectionUri();
  process.env.DISPOSABLE_DB = '1';
  process.env.JWT_SIGNING_SECRET = 'test-signing-secret-at-least-16-chars-long';
  process.env.DEV_CORS_ORIGINS = 'http://localhost:8081'; // OQ-120 — the mounted-in-app check below

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
  const { clearOutbox, resetEmailProvider } = await import('../../src/services/email');
  clearOutbox();
  resetEmailProvider(); // any per-test injected provider (setEmailProvider) is dropped
  const { resetAppleVerifier } = await import('../../src/auth/apple-verifier');
  resetAppleVerifier(); // back to the env-selected stub (P-D describes inject the real verifier)

});

describe('AUTH-01 register', () => {
  it('registers a new account → 201 { user, accessToken, refreshToken }', async () => {
    const { res, username } = await registerUser();
    expect(res.status).toBe(201);
    expect(res.body.user.username).toBe(username);
    expect(res.body.user.emailVerified).toBe(false); // AUTH-08 soft — sent, not yet verified
    expect(typeof res.body.accessToken).toBe('string');
    expect(typeof res.body.refreshToken).toBe('string');
    expect('password' in res.body.user).toBe(false); // F06 allowlist — no secret leaks
    expect('passwordHash' in res.body.user).toBe(false);
  });

  it('authz:register — actorB cannot register with actorA’s already-taken email → 422', async () => {
    const actorA = await registerUser();
    const attack = await post('/auth/register', {
      email: actorA.email, // actorB tries actorA's email
      username: `other${randomUUID().slice(0, 4)}`,
      password: PW,
      acceptedTerms: true,
    });
    expect(attack.status).toBe(422);
    expect(attack.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('rejects a screened (reserved) username → 422', async () => {
    const res = await post('/auth/register', {
      email: `s_${randomUUID().slice(0, 6)}@example.com`,
      username: 'admin', // MOD-07 reserved
      password: PW,
      acceptedTerms: true,
    });
    expect(res.status).toBe(422);
  });

  it('rejects a weak (<8) password → 422 (zod boundary)', async () => {
    const res = await post('/auth/register', {
      email: `w_${randomUUID().slice(0, 6)}@example.com`,
      username: `weak${randomUUID().slice(0, 4)}`,
      password: 'short',
      acceptedTerms: true,
    });
    expect(res.status).toBe(422);
  });

  it('rejects missing terms acceptance → 422 (AUTH-10)', async () => {
    const res = await post('/auth/register', {
      email: `t_${randomUUID().slice(0, 6)}@example.com`,
      username: `terms${randomUUID().slice(0, 4)}`,
      password: PW,
      acceptedTerms: false,
    });
    expect(res.status).toBe(422);
  });

  it('usernames are case-INSENSITIVE unique with display case PRESERVED (OQ-124)', async () => {
    const mixed = `Aiden_${randomUUID().slice(0, 4)}`;
    const first = await post('/auth/register', {
      email: `ci1_${randomUUID().slice(0, 6)}@example.com`,
      username: mixed,
      password: PW,
      acceptedTerms: true,
    });
    expect(first.status).toBe(201);
    expect(first.body.user.username).toBe(mixed); // display casing preserved verbatim

    const collision = await post('/auth/register', {
      email: `ci2_${randomUUID().slice(0, 6)}@example.com`, // distinct email — the clash is the username
      username: mixed.toLowerCase(), // same handle, different case → must be taken
      password: PW,
      acceptedTerms: true,
    });
    expect(collision.status).toBe(422);
    expect(collision.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('concurrent same-username registers → exactly one 201, the rest 422 (never a 500 race)', async () => {
    const uname = `Race_${randomUUID().slice(0, 4)}`;
    const attempts = Array.from({ length: 6 }, (_, i) =>
      post('/auth/register', {
        email: `race${i}_${randomUUID().slice(0, 6)}@example.com`,
        username: uname, // same handle → the DB unique index decides the race
        password: PW,
        acceptedTerms: true,
      }),
    );
    const results = await Promise.all(attempts);
    expect(results.filter((r) => r.status === 201)).toHaveLength(1);
    expect(results.filter((r) => r.status === 500)).toHaveLength(0); // the race loser is a friendly 422
    for (const r of results.filter((r) => r.status !== 201)) expect(r.status).toBe(422);
  });
});

describe('AUTH-02 login + AUTH-11 anti-enumeration', () => {
  it('logs in with correct credentials → 200 session', async () => {
    const { email, password } = await registerUser();
    const res = await post('/auth/login', { email, password });
    expect(res.status).toBe(200);
    expect(typeof res.body.accessToken).toBe('string');
  });

  it('authz:login — actorB with actorA’s email + WRONG password → neutral 401 AUTH_FAILED', async () => {
    const actorA = await registerUser();
    const res = await post('/auth/login', { email: actorA.email, password: 'WrongPassword1!' });
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('AUTH_FAILED');
  });

  it('AUTH-11: an UNKNOWN account returns the SAME neutral 401 (no existence disclosure)', async () => {
    const actorA = await registerUser();
    const wrong = await post('/auth/login', { email: actorA.email, password: 'WrongPassword1!' });
    const unknown = await post('/auth/login', {
      email: `nobody_${randomUUID().slice(0, 6)}@example.com`,
      password: 'WrongPassword1!',
    });
    expect(unknown.status).toBe(wrong.status);
    expect(unknown.body).toEqual(wrong.body); // byte-for-byte identical — indistinguishable
  });

  it('MOD-09: a suspended account → 403 ACCOUNT_SUSPENDED + { reason, until }', async () => {
    const { res, email, password } = await registerUser();
    const until = new Date(Date.now() + 86_400_000);
    await seedSuspension(res.body.user.id, 'tos_violation', until);
    const login = await post('/auth/login', { email, password });
    expect(login.status).toBe(403);
    expect(login.body.error.code).toBe('ACCOUNT_SUSPENDED');
    expect(login.body.error.reason).toBe('tos_violation');
    expect(login.body.error.until).toBe(until.toISOString());
  });
});

describe('AUTH-02 refresh rotation + F15 reuse-detection', () => {
  it('authz:refresh — rotation returns a NEW pair; the OLD token is then rejected 401 (actorB reuse)', async () => {
    const { res } = await registerUser();
    const r0 = res.body.refreshToken as string;
    const rotated = await post('/auth/refresh', { refreshToken: r0 });
    expect(rotated.status).toBe(200);
    expect(rotated.body.refreshToken).not.toBe(r0);
    expect(typeof rotated.body.accessToken).toBe('string');

    // actorB replaying the now-rotated r0 (a stolen/stale token) is refused.
    const reuse = await post('/auth/refresh', { refreshToken: r0 });
    expect(reuse.status).toBe(401);
  });

  it('F15: reuse of a rotated token REVOKES THE ENTIRE FAMILY — the current descendant also dies', async () => {
    const { res } = await registerUser();
    const r0 = res.body.refreshToken as string;
    const r1 = (await post('/auth/refresh', { refreshToken: r0 })).body.refreshToken as string;

    // Replay the compromised, already-rotated r0 → reuse-detection fires.
    const replay = await post('/auth/refresh', { refreshToken: r0 });
    expect(replay.status).toBe(401);

    // The legitimate current token r1 is now ALSO dead (whole family revoked → forced re-auth).
    const afterRevoke = await post('/auth/refresh', { refreshToken: r1 });
    expect(afterRevoke.status).toBe(401);
  });
});

describe('AUTH-05 logout', () => {
  it('logout invalidates the refresh token (a subsequent refresh → 401)', async () => {
    const { res } = await registerUser();
    const refreshToken = res.body.refreshToken as string;
    await post('/auth/logout', { refreshToken }).expect(200);
    const after = await post('/auth/refresh', { refreshToken });
    expect(after.status).toBe(401);
  });

  it('authz:logout — actorB bursting logout past the SYS-05 limit → 429', async () => {
    const { overrideRuleForTest } = await import('../../src/config/rate-limits');
    overrideRuleForTest('auth:logout', { limit: 2, windowMs: 60_000 });
    const results = [];
    for (let i = 0; i < 3; i++) results.push(await post('/auth/logout', { refreshToken: 'x' }));
    expect(results.some((r) => r.status === 429 && r.body.error.code === 'RATE_LIMITED')).toBe(true);
  });
});

describe('AUTH-04 password reset', () => {
  it('authz:reset_request — actorB bursting reset-request past the SYS-05 resend cap → 429', async () => {
    const { overrideRuleForTest } = await import('../../src/config/rate-limits');
    overrideRuleForTest('auth:reset-request', { limit: 2, windowMs: 60_000 });
    const results = [];
    for (let i = 0; i < 3; i++)
      results.push(await post('/auth/password-reset/request', { email: 'a@example.com' }));
    expect(results.some((r) => r.status === 429)).toBe(true);
  });

  it('request is NEUTRAL (200) whether or not the account exists (AUTH-11)', async () => {
    const { email } = await registerUser();
    const known = await post('/auth/password-reset/request', { email });
    const unknown = await post('/auth/password-reset/request', {
      email: `nobody_${randomUUID().slice(0, 6)}@example.com`,
    });
    expect(known.status).toBe(200);
    expect(unknown.status).toBe(200);
    expect(unknown.body).toEqual(known.body);
  });

  // ── the P-B 6-digit code exchange (AUTH-04 amendment) ──────────────────────────────────────────

  /** The emailed 6-digit code for an address (from the stub outbox). */
  async function sentCode(email: string): Promise<string> {
    const { lastEmail } = await import('../../src/services/email');
    const code = lastEmail('password_reset', email)?.token;
    expect(code).toMatch(/^\d{6}$/);
    return code as string;
  }

  /** Exchange email+code for the reset proof (the happy path helper). */
  async function verifiedResetToken(email: string): Promise<string> {
    const res = await post('/auth/password-reset/verify', { email, code: await sentCode(email) });
    expect(res.status).toBe(200);
    expect(typeof res.body.resetToken).toBe('string');
    return res.body.resetToken as string;
  }

  /** A wrong-but-well-formed code differing from the live one. */
  function wrongCode(right: string): string {
    return right === '000000' ? '000001' : '000000';
  }

  /** Age rows of a purpose past expiry, directly in the DB. */
  async function expireRows(purpose: string): Promise<void> {
    const { getDb } = await import('../../src/db/client');
    const { authTokens } = await import('../../src/db/schema');
    const { eq } = await import('drizzle-orm');
    await getDb()
      .update(authTokens)
      .set({ expiresAt: new Date(Date.now() - 1000) })
      .where(eq(authTokens.purpose, purpose));
  }

  it('full lifecycle: request → verify (code→proof) → confirm → login with the NEW password', async () => {
    const { email, password } = await registerUser();
    await post('/auth/password-reset/request', { email }).expect(200);
    const resetToken = await verifiedResetToken(email);

    const newPw = 'BrandNewPass9!';
    await post('/auth/password-reset/confirm', { token: resetToken, password: newPw }).expect(200);

    // old password no longer works; new one does.
    expect((await post('/auth/login', { email, password })).status).toBe(401);
    expect((await post('/auth/login', { email, password: newPw })).status).toBe(200);
  });

  it('confirm still revokes EVERY session (the pre-reset refresh token 401s afterwards)', async () => {
    const { email, res } = await registerUser();
    const preResetRefresh = res.body.refreshToken as string;
    await post('/auth/password-reset/request', { email });
    const resetToken = await verifiedResetToken(email);
    await post('/auth/password-reset/confirm', { token: resetToken, password: 'BrandNewPass9!' }).expect(200);

    expect((await post('/auth/refresh', { refreshToken: preResetRefresh })).status).toBe(401);
  });

  it('a wrong code ×5 kills the row — the CORRECT code then fails with the SAME invalid_code', async () => {
    const { email } = await registerUser();
    await post('/auth/password-reset/request', { email });
    const code = await sentCode(email);

    for (let i = 0; i < 5; i++) {
      const miss = await post('/auth/password-reset/verify', { email, code: wrongCode(code) });
      expect(miss.status).toBe(422);
      expect(miss.body.error.reason).toBe('invalid_code');
    }
    // Attempts exhausted → the row is consumed; even the right code is now the same neutral miss.
    const exhausted = await post('/auth/password-reset/verify', { email, code });
    expect(exhausted.status).toBe(422);
    expect(exhausted.body.error.reason).toBe('invalid_code');
  });

  it('CONCURRENT wrong guesses cannot bypass the ≤5 cap — the code is consumed, not absorbed (murr MED-1)', async () => {
    // The limiter is lifted high so the ATTEMPTS CAP (not the SYS-05 IP throttle) is what's under test:
    // the concurrency-safety of the cap itself. Before the FOR-UPDATE fix, N parallel verifies all read
    // attempts=0 and each bumped to 1 — the code absorbed ~N guesses. It must die at 5 regardless of race.
    const { overrideRuleForTest } = await import('../../src/config/rate-limits');
    overrideRuleForTest('auth:reset-verify', { limit: 100, windowMs: 60_000 });

    const { email } = await registerUser();
    await post('/auth/password-reset/request', { email });
    const code = await sentCode(email);

    // Fire 10 wrong guesses ALL AT ONCE — the race the plain SELECT lost.
    const misses = await Promise.all(
      Array.from({ length: 10 }, () =>
        post('/auth/password-reset/verify', { email, code: wrongCode(code) }),
      ),
    );
    // Every guess is the same neutral invalid_code (none 500s on the lock contention).
    for (const m of misses) {
      expect(m.status).toBe(422);
      expect(m.body.error.reason).toBe('invalid_code');
    }
    // The definitive assertion: the row is CONSUMED at the cap, so even the CORRECT code is now dead.
    // Under the bug (no serialization) the cap never engaged and the correct code would still 200.
    const withCorrect = await post('/auth/password-reset/verify', { email, code });
    expect(withCorrect.status).toBe(422);
    expect(withCorrect.body.error.reason).toBe('invalid_code');
  });

  it('wrong guesses BELOW the cap do not kill the code (the correct code still verifies)', async () => {
    const { email } = await registerUser();
    await post('/auth/password-reset/request', { email });
    const code = await sentCode(email);
    for (let i = 0; i < 4; i++) {
      await post('/auth/password-reset/verify', { email, code: wrongCode(code) }).expect(422);
    }
    await post('/auth/password-reset/verify', { email, code }).expect(200);
  });

  it('an EXPIRED code → the same neutral invalid_code', async () => {
    const { email } = await registerUser();
    await post('/auth/password-reset/request', { email });
    const code = await sentCode(email);
    await expireRows('password_reset_code');
    const res = await post('/auth/password-reset/verify', { email, code });
    expect(res.status).toBe(422);
    expect(res.body.error.reason).toBe('invalid_code');
  });

  it('a re-request KILLS the prior code (one live code at a time); the new code works', async () => {
    const { email } = await registerUser();
    await post('/auth/password-reset/request', { email });
    const first = await sentCode(email);
    await post('/auth/password-reset/request', { email });
    const second = await sentCode(email);

    if (first !== second) {
      // (When the two random codes collide — 1e-6 — the first IS the second and stays live.)
      const stale = await post('/auth/password-reset/verify', { email, code: first });
      expect(stale.status).toBe(422);
      expect(stale.body.error.reason).toBe('invalid_code');
    }
    await post('/auth/password-reset/verify', { email, code: second }).expect(200);
  });

  it('verify is SINGLE-USE — the same code cannot be exchanged twice', async () => {
    const { email } = await registerUser();
    await post('/auth/password-reset/request', { email });
    const code = await sentCode(email);
    await post('/auth/password-reset/verify', { email, code }).expect(200);
    const again = await post('/auth/password-reset/verify', { email, code });
    expect(again.status).toBe(422);
    expect(again.body.error.reason).toBe('invalid_code');
  });

  it('an EXPIRED proof token → confirm 422 invalid_token (bounce to re-request)', async () => {
    const { email } = await registerUser();
    await post('/auth/password-reset/request', { email });
    const resetToken = await verifiedResetToken(email);
    await expireRows('password_reset');
    const res = await post('/auth/password-reset/confirm', { token: resetToken, password: 'BrandNewPass9!' });
    expect(res.status).toBe(422);
    expect(res.body.error.reason).toBe('invalid_token');
  });

  it('AUTH-11 neutrality: an UNKNOWN email verifies to the BYTE-SAME invalid_code as a real-account miss', async () => {
    const { email } = await registerUser();
    await post('/auth/password-reset/request', { email });
    const code = await sentCode(email);

    const realMiss = await post('/auth/password-reset/verify', { email, code: wrongCode(code) });
    const unknown = await post('/auth/password-reset/verify', {
      email: `nobody_${randomUUID().slice(0, 6)}@example.com`,
      code: '123456',
    });
    expect(realMiss.status).toBe(422);
    expect(unknown.status).toBe(realMiss.status);
    expect(unknown.body).toEqual(realMiss.body); // indistinguishable — no existence disclosure
  });

  it('authz:reset_verify — actorB bursting verify past the SYS-05 cap → 429 (the online-guess guard)', async () => {
    const { overrideRuleForTest } = await import('../../src/config/rate-limits');
    overrideRuleForTest('auth:reset-verify', { limit: 2, windowMs: 60_000 });
    const results = [];
    for (let i = 0; i < 3; i++)
      results.push(await post('/auth/password-reset/verify', { email: 'a@example.com', code: '123456' }));
    expect(results.some((r) => r.status === 429 && r.body.error.code === 'RATE_LIMITED')).toBe(true);
  });

  it('confirm bursting past the SYS-05 cap → 429 (all three buckets hold)', async () => {
    const { overrideRuleForTest } = await import('../../src/config/rate-limits');
    overrideRuleForTest('auth:reset-confirm', { limit: 2, windowMs: 60_000 });
    const results = [];
    for (let i = 0; i < 3; i++)
      results.push(await post('/auth/password-reset/confirm', { token: 'x', password: 'Whatever9!' }));
    expect(results.some((r) => r.status === 429)).toBe(true);
  });

  it('authz:reset_confirm — actorB REUSING a consumed reset proof → 422 invalid_token (single-use)', async () => {
    const { email } = await registerUser();
    await post('/auth/password-reset/request', { email });
    const resetToken = await verifiedResetToken(email);
    await post('/auth/password-reset/confirm', { token: resetToken, password: 'FirstNewPass9!' }).expect(200);

    const reuse = await post('/auth/password-reset/confirm', { token: resetToken, password: 'SecondTry9!' });
    expect(reuse.status).toBe(422);
    expect(reuse.body.error.reason).toBe('invalid_token');
  });
});

describe('AUTH-12 email substrate (auth-epic P-A)', () => {
  it('reset-request stays NEUTRAL 200 when the provider send THROWS (no enumeration oracle)', async () => {
    const { email } = await registerUser();
    const { setEmailProvider } = await import('../../src/services/email');
    setEmailProvider({
      async send() {
        throw new Error('provider down');
      },
    });
    // The account-exists branch is the only one that actually sends — a throw there must NOT change
    // the response, or provider outages become an account-existence oracle (AUTH-11).
    const known = await post('/auth/password-reset/request', { email });
    const unknown = await post('/auth/password-reset/request', {
      email: `nobody_${randomUUID().slice(0, 6)}@example.com`,
    });
    expect(known.status).toBe(200);
    expect(unknown.status).toBe(200);
    expect(known.body).toEqual(unknown.body);
  });

  it('registration still succeeds when the provider is down (the verification send never blocks it)', async () => {
    const { setEmailProvider } = await import('../../src/services/email');
    setEmailProvider({
      async send() {
        throw new Error('provider down');
      },
    });
    const { res } = await registerUser();
    expect(res.status).toBe(201);
  });
});

describe('AUTH-08 email verification', () => {
  it('authz:verify_confirm — a bogus verify token → 422 invalid_token (actorB)', async () => {
    const res = await post('/auth/verify-email/confirm', { token: 'not-a-real-token' });
    expect(res.status).toBe(422);
    expect(res.body.error.reason).toBe('invalid_token');
  });

  it('confirm marks the email verified (GET /me reflects it)', async () => {
    const { email, res } = await registerUser();
    const accessToken = res.body.accessToken as string;
    const { lastEmail } = await import('../../src/services/email');
    const token = lastEmail('email_verify', email)?.token as string;
    expect(token).toBeTruthy();
    await post('/auth/verify-email/confirm', { token }).expect(200);

    const me = await get('/me').set({ Authorization: `Bearer ${accessToken}` });
    expect(me.body.emailVerified).toBe(true);
  });

  it('authz:verify_request — an UNAUTHENTICATED resend is refused 401 (actorB)', async () => {
    const res = await post('/auth/verify-email/request', {});
    expect(res.status).toBe(401);
  });
});

describe('AUTH-03/09 Sign-in-with-Apple (stub verifier)', () => {
  it('authz:apple — a bogus identity token is refused 401 (actorB)', async () => {
    const res = await post('/auth/apple', { identityToken: 'not-a-real-apple-token', nonce: 'n' });
    expect(res.status).toBe(401);
  });

  it('a FIRST Apple sign-in creates an account with usernamePending=true + a session (AUTH-09)', async () => {
    const { makeMockAppleToken } = await import('../../src/auth/apple-verifier');
    const sub = `apple-sub-${randomUUID()}`;
    const token = makeMockAppleToken({
      sub,
      email: `apple_${randomUUID().slice(0, 6)}@privaterelay.appleid.com`,
      emailVerified: true,
    });
    const res = await post('/auth/apple', { identityToken: token, nonce: 'nonce123' });
    expect(res.status).toBe(200);
    expect(res.body.user.usernamePending).toBe(true);
    expect(typeof res.body.accessToken).toBe('string');

    // Repeating with the SAME Apple subject resolves the SAME account (no duplicate).
    const again = await post('/auth/apple', { identityToken: token, nonce: 'nonce123' });
    expect(again.body.user.id).toBe(res.body.user.id);
  });

  it('AUTH-09: an Apple sign-in whose verified email matches an existing account LINKS (no duplicate)', async () => {
    const { email } = await registerUser(); // existing email/password account A
    const loginA = await post('/auth/login', { email, password: PW });
    const accountAId = loginA.body.user.id as string;

    const { makeMockAppleToken } = await import('../../src/auth/apple-verifier');
    const token = makeMockAppleToken({ sub: `apple-sub-${randomUUID()}`, email, emailVerified: true });
    const res = await post('/auth/apple', { identityToken: token, nonce: 'n' });
    expect(res.status).toBe(200);
    expect(res.body.user.id).toBe(accountAId); // linked to the existing account
    expect(res.body.user.usernamePending).toBe(false); // existing account keeps its username
  });
});

describe('AUTH-03/09 SIWA — the REAL verifier against a fixture JWKS (auth-epic P-D)', () => {
  // A local RSA key pair stands in for Apple's JWKS (the RealAppleVerifier keyResolver seam) — the
  // tests sign REAL RS256 identity tokens; no network in CI. The downstream machinery is byte-the-same
  // path the stub suite above exercises.
  const BUNDLE_ID = 'com.aidenmolyneaux.ingame';
  const APPLE_ISS = 'https://appleid.apple.com';
  let privateKey: KeyLike;
  let fixtureJwk: Record<string, unknown>;

  function sha256hex(s: string): string {
    return createHash('sha256').update(s).digest('hex');
  }

  beforeAll(async () => {
    const { generateKeyPair, exportJWK } = await import('jose');
    const pair = await generateKeyPair('RS256', { extractable: true });
    privateKey = pair.privateKey;
    fixtureJwk = { ...(await exportJWK(pair.publicKey)), kid: 'fixture-key', alg: 'RS256' };
  });

  /** Install the RealAppleVerifier wired to the fixture JWKS. */
  async function useRealVerifier(): Promise<void> {
    const { setAppleVerifier, RealAppleVerifier } = await import('../../src/auth/apple-verifier');
    const { createLocalJWKSet } = await import('jose');
    setAppleVerifier(
      new RealAppleVerifier({
        keyResolver: createLocalJWKSet({ keys: [fixtureJwk] as never }),
      }),
    );
  }

  /** Sign a real RS256 "Apple" identity token against the fixture key. */
  async function mintToken(over: {
    sub?: string;
    email?: string;
    emailVerified?: boolean | string;
    rawNonce?: string;
    nonceClaim?: string;
    aud?: string;
    iss?: string;
    expired?: boolean;
  } = {}): Promise<string> {
    const { SignJWT } = await import('jose');
    const now = Math.floor(Date.now() / 1000);
    const claims: Record<string, unknown> = {
      email: over.email,
      email_verified: over.emailVerified ?? true,
      nonce: over.nonceClaim ?? sha256hex(over.rawNonce ?? 'raw-nonce'),
    };
    return new SignJWT(claims)
      .setProtectedHeader({ alg: 'RS256', kid: 'fixture-key' })
      .setSubject(over.sub ?? `apple-sub-${randomUUID()}`)
      .setIssuer(over.iss ?? APPLE_ISS)
      .setAudience(over.aud ?? BUNDLE_ID)
      .setIssuedAt(over.expired ? now - 7200 : now)
      .setExpirationTime(over.expired ? now - 3600 : now + 300)
      .sign(privateKey);
  }

  it('a VALID signed token → 200 session; new user arrives usernamePending (the downstream is unchanged)', async () => {
    await useRealVerifier();
    const email = `real_${randomUUID().slice(0, 6)}@privaterelay.appleid.com`;
    const token = await mintToken({ email, rawNonce: 'raw-nonce' });
    const res = await post('/auth/apple', { identityToken: token, nonce: 'raw-nonce' });
    expect(res.status).toBe(200);
    expect(res.body.user.usernamePending).toBe(true);
    expect(typeof res.body.accessToken).toBe('string');
  });

  it('email_verified as the STRING "true" normalizes → AUTH-09 links to the matching account', async () => {
    await useRealVerifier();
    const { email } = await registerUser(); // existing email/password account
    const token = await mintToken({ email, emailVerified: 'true', rawNonce: 'n1' });
    const res = await post('/auth/apple', { identityToken: token, nonce: 'n1' });
    expect(res.status).toBe(200);
    expect(res.body.user.usernamePending).toBe(false); // linked, not a fresh account
  });

  it('a WRONG audience (another app id) → neutral 401 AUTH_FAILED', async () => {
    await useRealVerifier();
    const token = await mintToken({ aud: 'com.somebody.else' });
    const res = await post('/auth/apple', { identityToken: token, nonce: 'raw-nonce' });
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('AUTH_FAILED');
  });

  it('a WRONG issuer → neutral 401', async () => {
    await useRealVerifier();
    const token = await mintToken({ iss: 'https://evil.example.com' });
    const res = await post('/auth/apple', { identityToken: token, nonce: 'raw-nonce' });
    expect(res.status).toBe(401);
  });

  it('an EXPIRED token → neutral 401', async () => {
    await useRealVerifier();
    const token = await mintToken({ expired: true });
    const res = await post('/auth/apple', { identityToken: token, nonce: 'raw-nonce' });
    expect(res.status).toBe(401);
  });

  it('a NONCE MISMATCH (token bound to a different raw nonce) → neutral 401', async () => {
    await useRealVerifier();
    const token = await mintToken({ rawNonce: 'the-other-nonce' });
    const res = await post('/auth/apple', { identityToken: token, nonce: 'raw-nonce' });
    expect(res.status).toBe(401);
  });

  it('ALG CONFUSION: an HS256-signed forgery is rejected → neutral 401 (RS256 pinned)', async () => {
    await useRealVerifier();
    const { SignJWT } = await import('jose');
    const now = Math.floor(Date.now() / 1000);
    const forged = await new SignJWT({ nonce: sha256hex('raw-nonce') })
      .setProtectedHeader({ alg: 'HS256', kid: 'fixture-key' })
      .setSubject('apple-sub-forged')
      .setIssuer(APPLE_ISS)
      .setAudience(BUNDLE_ID)
      .setIssuedAt(now)
      .setExpirationTime(now + 300)
      .sign(new TextEncoder().encode('a-symmetric-secret-32-bytes-long!'));
    const res = await post('/auth/apple', { identityToken: forged, nonce: 'raw-nonce' });
    expect(res.status).toBe(401);
  });

  it('authz:apple — a GARBAGE token → neutral 401 AUTH_FAILED (actorB, real verifier)', async () => {
    await useRealVerifier();
    const res = await post('/auth/apple', { identityToken: 'not-a-jwt-at-all', nonce: 'raw-nonce' });
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('AUTH_FAILED');
  });

  it('a JWKS FETCH failure → 500 SERVER_ERROR, NOT 401 (infrastructure down is not "bad credentials")', async () => {
    const { setAppleVerifier, RealAppleVerifier } = await import('../../src/auth/apple-verifier');
    setAppleVerifier(
      new RealAppleVerifier({
        keyResolver: () => {
          throw new TypeError('fetch failed'); // what a network-dead remote JWKS surfaces as
        },
      }),
    );
    const token = await mintToken({});
    const res = await post('/auth/apple', { identityToken: token, nonce: 'raw-nonce' });
    expect(res.status).toBe(500);
    expect(res.body.error.code).toBe('SERVER_ERROR');
  });

  it('the SAME Apple subject through the real verifier resolves the SAME account (find-or-create intact)', async () => {
    await useRealVerifier();
    const sub = `apple-sub-${randomUUID()}`;
    const first = await post('/auth/apple', {
      identityToken: await mintToken({ sub, rawNonce: 'n-a' }),
      nonce: 'n-a',
    });
    const again = await post('/auth/apple', {
      identityToken: await mintToken({ sub, rawNonce: 'n-b' }),
      nonce: 'n-b',
    });
    expect(first.status).toBe(200);
    expect(again.status).toBe(200);
    expect(again.body.user.id).toBe(first.body.user.id);
  });
});

describe('AUTH-11 username availability', () => {
  it('reports taken / available / screened / invalid', async () => {
    const { username } = await registerUser();
    expect((await get(`/auth/username-available?u=${username}`)).body).toEqual({
      available: false,
      reason: 'taken',
    });
    expect((await get('/auth/username-available?u=admin')).body).toEqual({
      available: false,
      reason: 'screened',
    });
    expect((await get('/auth/username-available?u=AB')).body.available).toBe(false); // too short → invalid
    const free = await get(`/auth/username-available?u=free${randomUUID().slice(0, 5)}`);
    expect(free.body.available).toBe(true);
  });
});

describe('G-G / SYS-05: the auth rate-limiter returns 429 under burst', () => {
  it('login burst past the limit → 429 RATE_LIMITED', async () => {
    const { overrideRuleForTest } = await import('../../src/config/rate-limits');
    overrideRuleForTest('auth:login', { limit: 3, windowMs: 60_000 });
    const results = [];
    for (let i = 0; i < 4; i++)
      results.push(await post('/auth/login', { email: 'x@example.com', password: 'whatever1!' }));
    const limited = results.filter((r) => r.status === 429);
    expect(limited.length).toBeGreaterThan(0);
    expect(limited[0]?.body.error.code).toBe('RATE_LIMITED');
  });
});

describe('OQ-121 / decision 0056: the session user IS the GET /me self-shape (ONE serializer)', () => {
  it('register response user deep-equals GET /me at issuance', async () => {
    const { res } = await registerUser();
    expect(res.status).toBe(201);
    const me = await request(app)
      .get('/api/me')
      .set('Authorization', `Bearer ${res.body.accessToken}`);
    expect(me.status).toBe(200);
    expect(res.body.user).toEqual(me.body);
  });

  it('login user INLINES the real gamertag rows and deep-equals GET /me (the drift Parvati caught)', async () => {
    const { email, password, res } = await registerUser();
    const tag = await request(app)
      .post('/api/me/gamertags')
      .set('Authorization', `Bearer ${res.body.accessToken}`)
      .send({ platform: 'pc', handle: 'shape_check' });
    expect(tag.status).toBe(201);

    const login = await post('/auth/login', { email, password });
    expect(login.status).toBe(200);
    expect(login.body.user.gamertags).toHaveLength(1);
    expect(login.body.user.gamertags[0]).toMatchObject({ platform: 'pc', handle: 'shape_check' });

    const me = await request(app)
      .get('/api/me')
      .set('Authorization', `Bearer ${login.body.accessToken}`);
    expect(login.body.user).toEqual(me.body);
  });
});

describe('OQ-120: the dev CORS allowlist is mounted (Expo-web dev loop)', () => {
  it('reflects an allowlisted localhost origin on a real route + answers preflight 204', async () => {
    const preflight = await request(app)
      .options('/api/auth/login')
      .set('Origin', 'http://localhost:8081');
    expect(preflight.status).toBe(204);
    expect(preflight.headers['access-control-allow-origin']).toBe('http://localhost:8081');

    const res = await post('/auth/login', { email: 'x@example.com', password: 'whatever1!' }).set(
      'Origin',
      'http://localhost:8081',
    );
    expect(res.headers['access-control-allow-origin']).toBe('http://localhost:8081');
  });

  it('sends no CORS headers for a non-allowlisted origin', async () => {
    const res = await post('/auth/login', { email: 'x@example.com', password: 'whatever1!' }).set(
      'Origin',
      'http://localhost:9999',
    );
    expect(res.headers['access-control-allow-origin']).toBeUndefined();
  });
});
