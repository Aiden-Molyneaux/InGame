import { randomUUID, randomInt } from 'node:crypto';
import type {
  AppleRequest,
  AuthSession,
  LoginRequest,
  PasswordResetConfirm,
  PasswordResetRequest,
  PasswordResetVerify,
  PasswordResetVerifyResult,
  RefreshResult,
  RegisterRequest,
  UsernameAvailability,
  VerifyEmailConfirm,
} from '@ingame/shared';
import { usernameSchema } from '@ingame/shared';
import { withTransaction } from '../db/tx';
import type { Tx } from '../db/client';
import { emitOnCommit } from '../events/emitOnCommit';
import * as authRepo from '../repositories/auth-repo';
import * as refreshRepo from '../repositories/refresh-token-repo';
import * as authTokenRepo from '../repositories/auth-token-repo';
import * as suspensionRepo from '../repositories/suspension-repo';
import * as profileRepo from '../repositories/profile-repo';
import { isUniqueViolation } from '../db/pg-errors';
import { argon2Hasher } from '../auth/password';
import { checkPasswordBreached } from '../auth/breach-check';
import { signAccessToken, generateOpaqueToken, hashOpaqueToken, hashResetCode } from '../auth/tokens';
import { getAppleVerifier } from '../auth/apple-verifier';
import * as emailService from './email/email-service';
import { captureException } from '../observability/sentry';
import { AuthFailedError, AccountSuspendedError, ValidationError } from '../errors/AppError';
import { loadEnv } from '../config/env';
import { track } from '../observability/funnel';
import { isUsernameAllowed } from '../moderation/screen';
import { assembleSelfShape } from './profile-service';
import type { UserRow, UserSuspensionRow } from '../db/schema';

// AUTH-01/02/03/04/05/08/09/11 — the auth stack. Anti-enumeration (AUTH-11 / decision 0043): login,
// password-reset-request, and verify-request return NEUTRAL responses that never disclose whether an
// account exists (register + username-available stay disclosing-but-throttled per the contract).
// Issuance flows use `withTransaction` (they are pre-actor / by-credential, not the `@mutation` seam),
// with the transactional-outbox event emitted in-tx and the funnel event fired POST-commit.

function refreshExpiry(): Date {
  return new Date(Date.now() + loadEnv().refreshTokenTtlSeconds * 1000);
}

/** Issue a fresh session: a short-lived access JWT + a new opaque refresh token (a new family). */
async function issueSession(user: UserRow, tx: Tx, familyId: string = randomUUID()): Promise<AuthSession> {
  const accessToken = await signAccessToken(user.id);
  const refresh = generateOpaqueToken();
  await refreshRepo.insertToken(
    { userId: user.id, familyId, tokenHash: refresh.tokenHash, expiresAt: refreshExpiry() },
    tx,
  );
  // OQ-121 / decision 0056 — ONE self-shape serializer: the session `user` IS the GET /me self-shape
  // (gamertags inlined at issuance; issuance-vs-/me drift is a bug class, not a shape variant).
  return { user: await assembleSelfShape(user, tx), accessToken, refreshToken: refresh.token };
}

function suspended(s: UserSuspensionRow): AccountSuspendedError {
  return new AccountSuspendedError(s.reason, s.endsAt ? s.endsAt.toISOString() : null);
}

/**
 * AUTH-01 (decision 0076 §0.9) — the HIBP k-anonymity breach check, shared by register + the
 * password-reset confirm (the two paths that set a password on record). Runs BEFORE the slow argon2
 * hash (fail fast on a known-breached password) and BEFORE any transaction opens (a network call must
 * never hold a tx). FAIL-OPEN by construction (checkPasswordBreached never throws — a skipped check
 * resolves `breached: false`), so this never blocks register/reset on a provider outage. A genuine hit
 * surfaces the SAME field-targeted 422 shape the sibling register rejections use (email_taken /
 * username_taken) — a named `reason` + a `path: 'password'` detail (api-contract B1).
 */
async function assertPasswordNotBreached(password: string): Promise<void> {
  const result = await checkPasswordBreached(password);
  if (result.breached) {
    throw new ValidationError(
      'That password has appeared in a known data breach — please choose a different one.',
      'password_breached',
      [{ path: 'password', message: 'That password has appeared in a known data breach.' }],
    );
  }
}

// ── AUTH-01 register ────────────────────────────────────────────────────────────────────────────
export async function register(input: RegisterRequest): Promise<AuthSession> {
  const email = input.email.toLowerCase();
  if (!isUsernameAllowed(input.username)) {
    throw new ValidationError('That username isn’t allowed.', 'username_screened', [
      { path: 'username', message: 'That username isn’t allowed.' },
    ]);
  }
  // AUTH-01 (decision 0076 §0.9) — the HIBP breach check, before the slow hash + before any tx.
  await assertPasswordNotBreached(input.password);
  // Hash BEFORE opening the transaction (argon2 is deliberately slow — never hold a tx during it).
  const passwordHash = await argon2Hasher.hash(input.password);

  const outcome = await withTransaction(async (tx) => {
    if (await authRepo.findByEmail(email, tx)) {
      // The acknowledged existence-disclosure point (AUTH-11/AUTH-01, F-05/0055) — field-targeted (B1).
      throw new ValidationError('That email is already registered.', 'email_taken', [
        { path: 'email', message: 'That email is already registered.' },
      ]);
    }
    if (await authRepo.findByUsername(input.username, tx)) {
      throw new ValidationError('That username is taken.', 'username_taken', [
        { path: 'username', message: 'That username is taken.' },
      ]);
    }
    const user = await authRepo.insertUser({ email, username: input.username, passwordHash }, tx);
    const verify = generateOpaqueToken();
    await authTokenRepo.insertToken(
      {
        userId: user.id,
        purpose: 'email_verify',
        tokenHash: verify.tokenHash,
        expiresAt: new Date(Date.now() + loadEnv().emailVerifyTtlSeconds * 1000),
      },
      tx,
    );
    await emitOnCommit(tx, {
      eventType: 'auth.registered',
      actorId: user.id,
      entityRef: { type: 'user', id: user.id },
      payload: { method: 'password' },
    });
    const session = await issueSession(user, tx);
    return { session, user, verifyToken: verify.token };
  }).catch(async (e): Promise<never> => {
    // Lost the concurrent-insert race after the in-tx pre-check passed (the DB unique index caught it) —
    // map the raw 23505 to the same field-targeted 422 the pre-check would have thrown, not a 500.
    if (isUniqueViolation(e)) {
      if (await authRepo.findByEmail(email)) {
        throw new ValidationError('That email is already registered.', 'email_taken', [
          { path: 'email', message: 'That email is already registered.' },
        ]);
      }
      throw new ValidationError('That username is taken.', 'username_taken', [
        { path: 'username', message: 'That username is taken.' },
      ]);
    }
    throw e;
  });

  // Post-commit side-effects (never rolled back): send the AUTH-08 verification email + funnel event.
  // The send is CAUGHT (AUTH-12): registration must never fail because email is down.
  try {
    await emailService.sendVerification(outcome.user.email, outcome.verifyToken);
  } catch (err) {
    captureException(err);
  }
  track({ name: 'signup', userId: outcome.user.id, props: { method: 'password' } });
  return outcome.session;
}

// AUTH-11 timing parity: the not-found / deleted / Apple-only (no-password) login branch must cost the
// same wall-clock as a real account with a WRONG password — otherwise argon2's deliberate slowness is a
// side-channel distinguishing "account exists" from "not found" (the status/body are already neutral;
// only timing wasn't). We verify the presented password against a fixed DUMMY hash so BOTH paths run
// one argon2 verify. The dummy hash is computed ONCE, lazily, with the pinned params (auth/password.ts)
// so its verify cost matches a real one; it is a hash of a throwaway constant, never a credential.
let dummyPasswordHashPromise: Promise<string> | undefined;
function dummyPasswordHash(): Promise<string> {
  if (!dummyPasswordHashPromise) {
    dummyPasswordHashPromise = argon2Hasher.hash('ingame-login-timing-equalizer-not-a-credential');
  }
  return dummyPasswordHashPromise;
}

// ── AUTH-02 login ─────────────────────────────────────────────────────────────────────────────────
export async function login(input: LoginRequest): Promise<AuthSession> {
  const email = input.email.toLowerCase();
  const user = await authRepo.findByEmail(email);
  // NEUTRAL + TIMING-EQUAL (AUTH-11): unknown / deleted / Apple-only (no password) still runs one
  // argon2 verify (against the dummy hash) before the SAME AUTH_FAILED, so "exists" and "not found"
  // cost the same wall-clock. A real account with a wrong password runs the verify just below.
  if (!user || user.deletedAt || !user.passwordHash) {
    await argon2Hasher.verify(await dummyPasswordHash(), input.password);
    throw new AuthFailedError();
  }
  if (!(await argon2Hasher.verify(user.passwordHash, input.password))) throw new AuthFailedError();

  const suspension = await suspensionRepo.getActiveSuspension(user.id);
  if (suspension) throw suspended(suspension);

  const session = await withTransaction((tx) => issueSession(user, tx));
  track({ name: 'login', userId: user.id });
  return session;
}

// ── AUTH-02 refresh (rotation + F15 reuse-detection) ─────────────────────────────────────────────
type RefreshOutcome =
  | { kind: 'auth' }
  | { kind: 'suspended'; suspension: UserSuspensionRow }
  | { kind: 'ok'; result: RefreshResult };

export async function refresh(input: { refreshToken: string }): Promise<RefreshResult> {
  const tokenHash = hashOpaqueToken(input.refreshToken);

  const outcome: RefreshOutcome = await withTransaction(async (tx) => {
    const row = await refreshRepo.findByHash(tokenHash, tx);
    if (!row) return { kind: 'auth' };

    // F15 REUSE-DETECTION: a token that was already rotated OR revoked is being replayed → revoke the
    // WHOLE descendant family (forces re-auth) and reject.
    if (row.rotatedAt || row.revokedAt) {
      await refreshRepo.revokeFamily(row.familyId, row.userId, tx);
      return { kind: 'auth' };
    }
    if (row.expiresAt.getTime() <= Date.now()) return { kind: 'auth' };

    const user = await profileRepo.getOwnProfile(row.userId, tx);
    if (!user || user.deletedAt) return { kind: 'auth' };

    const suspension = await suspensionRepo.getActiveSuspension(row.userId, tx);
    if (suspension) {
      // Suspension invalidates sessions (MOD-09) — revoke the family so the client is fully logged out.
      await refreshRepo.revokeFamily(row.familyId, row.userId, tx);
      return { kind: 'suspended', suspension };
    }

    // Rotate: mint a NEW token in the SAME family; mark the presented one rotated → replaced-by.
    const accessToken = await signAccessToken(row.userId);
    const next = generateOpaqueToken();
    const newRow = await refreshRepo.insertToken(
      { userId: row.userId, familyId: row.familyId, tokenHash: next.tokenHash, expiresAt: refreshExpiry() },
      tx,
    );
    await refreshRepo.markRotated(row.id, row.userId, newRow.id, tx);
    return { kind: 'ok', result: { accessToken, refreshToken: next.token } };
  });

  if (outcome.kind === 'suspended') throw suspended(outcome.suspension);
  if (outcome.kind === 'auth') throw new AuthFailedError();
  return outcome.result;
}

// ── AUTH-05 logout (idempotent, neutral) ─────────────────────────────────────────────────────────
export async function logout(input: { refreshToken: string }): Promise<void> {
  const tokenHash = hashOpaqueToken(input.refreshToken);
  await withTransaction(async (tx) => {
    const row = await refreshRepo.findByHash(tokenHash, tx);
    if (row && !row.revokedAt) await refreshRepo.revokeToken(row.id, row.userId, tx);
    // Unknown / already-revoked token still resolves to { ok: true } (AUTH-05).
  });
}

// ── AUTH-04 password reset (auth-epic P-B — the 6-digit code exchange) ──────────────────────────
// request mints an emailed 6-digit CODE (hashed at rest, ~30 min, one live code at a time, ≤5 wrong
// guesses) → verify exchanges a matching code for the EXISTING short-lived opaque reset proof
// (~15 min) → confirm (byte-for-byte the M2 path: single-use · HIBP · revoke-all-sessions).

/** G-K async default (owner-nod #6) — wrong guesses allowed on one code before the row is dead. */
const RESET_CODE_MAX_ATTEMPTS = 5;

export async function requestPasswordReset(input: PasswordResetRequest): Promise<void> {
  const email = input.email.toLowerCase();
  const user = await authRepo.findByEmail(email);
  if (user && !user.deletedAt) {
    // NEVER Math.random for a credential; zero-padded to exactly six digits.
    let code = randomInt(0, 1_000_000).toString().padStart(6, '0');
    // The salted hash can still collide with the SAME user's historical rows (tiny odds, unique
    // index on token_hash) — re-mint a fresh code rather than surfacing a 500.
    for (let attempt = 0; ; attempt++) {
      try {
        await withTransaction(async (tx) => {
          // One live code at a time — a re-request consumes any outstanding code rows first.
          await authTokenRepo.consumeAllForUser(user.id, 'password_reset_code', tx);
          await authTokenRepo.insertToken(
            {
              userId: user.id,
              purpose: 'password_reset_code',
              tokenHash: hashResetCode(user.id, code),
              expiresAt: new Date(Date.now() + loadEnv().passwordResetTtlSeconds * 1000),
            },
            tx,
          );
        });
        break;
      } catch (e) {
        if (!isUniqueViolation(e) || attempt >= 2) throw e;
        code = randomInt(0, 1_000_000).toString().padStart(6, '0');
      }
    }
    // AUTH-11/12 — a provider send-failure is CAUGHT + Sentry'd and the response stays neutral:
    // throwing only on the account-exists branch would turn provider errors into an enumeration oracle.
    try {
      await emailService.sendPasswordResetCode(user.email, code);
    } catch (err) {
      captureException(err);
    }
  }
  // ALWAYS neutral — the response never reveals whether the account exists (AUTH-04/11).
}

type ResetVerifyOutcome = { kind: 'invalid' } | { kind: 'ok'; resetToken: string };

/**
 * POST /auth/password-reset/verify — exchange a live matching code for the reset proof. EVERY failure
 * mode (unknown email · no live row · wrong code · expired · attempts exhausted) surfaces the SAME
 * `VALIDATION_ERROR reason:"invalid_code"` — enumeration-neutral by construction (AUTH-11). NOTE the
 * outcome shape: the wrong-guess counter must COMMIT, so nothing throws inside the transaction.
 */
export async function verifyPasswordReset(input: PasswordResetVerify): Promise<PasswordResetVerifyResult> {
  const email = input.email.toLowerCase();
  const invalidCode = () =>
    new ValidationError('That code is invalid or has expired.', 'invalid_code');

  const user = await authRepo.findByEmail(email);
  if (!user || user.deletedAt) throw invalidCode();

  const outcome: ResetVerifyOutcome = await withTransaction(async (tx) => {
    const row = await authTokenRepo.findNewestLive(user.id, 'password_reset_code', tx);
    if (!row || row.expiresAt.getTime() <= Date.now()) return { kind: 'invalid' };

    if (row.tokenHash !== hashResetCode(user.id, input.code)) {
      // A wrong guess is COUNTED (committed); at the cap the row is consumed — dead even to the
      // correct code afterwards (the re-request loop is the way back in).
      if (row.attempts + 1 >= RESET_CODE_MAX_ATTEMPTS) {
        await authTokenRepo.markConsumed(row.id, user.id, tx);
      } else {
        await authTokenRepo.setAttempts(row.id, user.id, row.attempts + 1, tx);
      }
      return { kind: 'invalid' };
    }

    // Match → the code is consumed (single-use) and the EXISTING proof-token machinery takes over.
    await authTokenRepo.markConsumed(row.id, user.id, tx);
    const proof = generateOpaqueToken();
    await authTokenRepo.insertToken(
      {
        userId: user.id,
        purpose: 'password_reset',
        tokenHash: proof.tokenHash,
        expiresAt: new Date(Date.now() + loadEnv().passwordResetProofTtlSeconds * 1000),
      },
      tx,
    );
    return { kind: 'ok', resetToken: proof.token };
  });

  if (outcome.kind === 'invalid') throw invalidCode();
  return { resetToken: outcome.resetToken };
}

export async function confirmPasswordReset(input: PasswordResetConfirm): Promise<void> {
  const tokenHash = hashOpaqueToken(input.token);
  // AUTH-01 (decision 0076 §0.9) — same breach check as register (a reset IS setting a new password;
  // api-contract has no separate "change password" endpoint at M6, so this IS the "password change" path).
  await assertPasswordNotBreached(input.password);
  const passwordHash = await argon2Hasher.hash(input.password); // before the tx
  await withTransaction(async (tx) => {
    const row = await authTokenRepo.findByHash(tokenHash, tx);
    if (
      !row ||
      row.purpose !== 'password_reset' ||
      row.consumedAt ||
      row.expiresAt.getTime() <= Date.now()
    ) {
      throw new ValidationError('That reset link is invalid or has expired.', 'invalid_token');
    }
    await authRepo.setPasswordHash(row.userId, passwordHash, tx);
    await authTokenRepo.markConsumed(row.id, row.userId, tx);
    // Security: a password reset invalidates all existing sessions.
    await refreshRepo.revokeAllForUser(row.userId, tx);
  });
}

// ── AUTH-08 email verification (soft) ────────────────────────────────────────────────────────────
export async function requestEmailVerification(userId: string): Promise<void> {
  const user = await profileRepo.getOwnProfile(userId);
  if (!user || user.deletedAt) throw new AuthFailedError();
  if (user.emailVerifiedAt) return; // already verified — no-op
  const verify = generateOpaqueToken();
  await withTransaction((tx) =>
    authTokenRepo.insertToken(
      {
        userId,
        purpose: 'email_verify',
        tokenHash: verify.tokenHash,
        expiresAt: new Date(Date.now() + loadEnv().emailVerifyTtlSeconds * 1000),
      },
      tx,
    ),
  );
  try {
    await emailService.sendVerification(user.email, verify.token); // caught — the resend is best-effort (AUTH-12)
  } catch (err) {
    captureException(err);
  }
}

export async function confirmEmailVerification(input: VerifyEmailConfirm): Promise<void> {
  const tokenHash = hashOpaqueToken(input.token);
  await withTransaction(async (tx) => {
    const row = await authTokenRepo.findByHash(tokenHash, tx);
    if (
      !row ||
      row.purpose !== 'email_verify' ||
      row.consumedAt ||
      row.expiresAt.getTime() <= Date.now()
    ) {
      throw new ValidationError('That verification link is invalid or has expired.', 'invalid_token');
    }
    await authRepo.markEmailVerified(row.userId, tx);
    await authTokenRepo.markConsumed(row.id, row.userId, tx);
  });
}

// ── AUTH-11 username availability (advisory) ──────────────────────────────────────────────────────
export async function checkUsernameAvailable(candidate: string): Promise<UsernameAvailability> {
  const parsed = usernameSchema.safeParse(candidate);
  if (!parsed.success) return { available: false, reason: 'invalid' };
  const username = parsed.data;
  if (!isUsernameAllowed(username)) return { available: false, reason: 'screened' };
  if (await authRepo.findByUsername(username)) return { available: false, reason: 'taken' };
  return { available: true };
}

// ── AUTH-03/09 Sign-in-with-Apple (STUB verifier; downstream machinery fully built) ───────────────
type AppleOutcome =
  | { kind: 'suspended'; suspension: UserSuspensionRow }
  | { kind: 'ok'; session: AuthSession; userId: string; isNew: boolean };

export async function appleSignIn(input: AppleRequest): Promise<AuthSession> {
  try {
    return await appleSignInAttempt(input);
  } catch (e) {
    // Lost the concurrent first-sign-in race for this Apple subject — the winner's identity now exists,
    // so a single retry resolves to that account (branch 1) instead of surfacing a raw 500.
    if (isUniqueViolation(e)) return await appleSignInAttempt(input);
    throw e;
  }
}

async function appleSignInAttempt(input: AppleRequest): Promise<AuthSession> {
  // The verifier behind the APPLE_VERIFIER seam (auth-epic P-D): the RealAppleVerifier (remote JWKS +
  // nonce binding) in production, the stub in dev/test. Everything below is the unchanged, tested
  // downstream machinery (find-or-create on apple_sub · AUTH-09 link · usernamePending).
  const identity = await getAppleVerifier().verify(input.identityToken, input.nonce);

  const outcome: AppleOutcome = await withTransaction(async (tx) => {
    // (1) A known Apple identity → that account.
    const existing = await authRepo.findIdentity('apple', identity.subject, tx);
    if (existing) {
      const user = await profileRepo.getOwnProfile(existing.userId, tx);
      if (!user || user.deletedAt) throw new AuthFailedError();
      const susp = await suspensionRepo.getActiveSuspension(user.id, tx);
      if (susp) return { kind: 'suspended', suspension: susp };
      return { kind: 'ok', session: await issueSession(user, tx), userId: user.id, isNew: false };
    }

    // (2) AUTH-09 link-by-verified-email: an existing account with the Apple-verified email gains the
    //     Apple identity (one user, two login methods) rather than a duplicate.
    if (identity.email && identity.emailVerified) {
      const byEmail = await authRepo.findByEmail(identity.email.toLowerCase(), tx);
      if (byEmail && !byEmail.deletedAt) {
        await authRepo.insertIdentity(
          { userId: byEmail.id, provider: 'apple', subject: identity.subject },
          tx,
        );
        await emitOnCommit(tx, {
          eventType: 'auth.identity_linked',
          actorId: byEmail.id,
          entityRef: { type: 'user', id: byEmail.id },
          payload: { provider: 'apple' },
        });
        const susp = await suspensionRepo.getActiveSuspension(byEmail.id, tx);
        if (susp) return { kind: 'suspended', suspension: susp };
        return { kind: 'ok', session: await issueSession(byEmail, tx), userId: byEmail.id, isNew: false };
      }
    }

    // (3) A new account — usernamePending=true (AUTH-09: a unique username is chosen, via PATCH /me,
    //     before entry). Private-relay emails accepted. The placeholder username is provisional.
    const email = (
      identity.email ?? `apple_${identity.subject}@privaterelay.appleid.com`
    ).toLowerCase();
    const user = await authRepo.insertUser(
      {
        email,
        username: `newuser_${randomUUID().slice(0, 8)}`,
        usernamePending: true,
        emailVerifiedAt: identity.emailVerified ? new Date() : null,
      },
      tx,
    );
    await authRepo.insertIdentity(
      { userId: user.id, provider: 'apple', subject: identity.subject },
      tx,
    );
    await emitOnCommit(tx, {
      eventType: 'auth.registered',
      actorId: user.id,
      entityRef: { type: 'user', id: user.id },
      payload: { method: 'apple' },
    });
    return { kind: 'ok', session: await issueSession(user, tx), userId: user.id, isNew: true };
  });

  if (outcome.kind === 'suspended') throw suspended(outcome.suspension);
  track({
    name: outcome.isNew ? 'signup' : 'login',
    userId: outcome.userId,
    props: { method: 'apple' },
  });
  return outcome.session;
}
