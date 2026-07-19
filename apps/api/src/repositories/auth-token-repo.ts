import { eq, and, isNull, desc } from 'drizzle-orm';
import { getDb, type Executor } from '../db/client';
import { asActor, ownedBy } from '../db/scoped';
import { authTokens, type AuthTokenRow } from '../db/schema';
import { ServerError } from '../errors/AppError';

// Single-use, time-boxed tokens for password reset (AUTH-04) + email verification (AUTH-08). Only the
// token HASH is stored. The lookup-by-hash is a bearer-credential read (pre-actor) → SYS-01-AUTH-LOOKUP;
// consume + the P-B code-row reads/writes are scoped to the resolved owner (SYS-01).

export type AuthTokenPurpose = 'password_reset' | 'password_reset_code' | 'email_verify';

export interface NewAuthToken {
  userId: string;
  purpose: AuthTokenPurpose;
  tokenHash: string;
  expiresAt: Date;
}

export async function insertToken(
  values: NewAuthToken,
  exec: Executor = getDb(),
): Promise<AuthTokenRow> {
  const [row] = await exec.insert(authTokens).values(values).returning();
  if (!row) throw new ServerError('auth-token insert returned no row.');
  return row;
}

export async function findByHash(
  tokenHash: string,
  exec: Executor = getDb(),
): Promise<AuthTokenRow | null> {
  // SYS-01-AUTH-LOOKUP: bearer-credential lookup by token-hash (reset / verify link token).
  const rows = await exec.select().from(authTokens).where(eq(authTokens.tokenHash, tokenHash)).limit(1);
  return rows[0] ?? null;
}

/** AUTH-04 (P-B) — the user's newest LIVE (unconsumed) row of a purpose. Scoped (SYS-01): the owner
 * is resolved from the presented email BEFORE this read; expiry is judged by the caller. */
export async function findNewestLive(
  userId: string,
  purpose: AuthTokenPurpose,
  exec: Executor = getDb(),
): Promise<AuthTokenRow | null> {
  const actor = asActor(userId);
  const rows = await exec
    .select()
    .from(authTokens)
    .where(ownedBy(actor, authTokens.userId, and(eq(authTokens.purpose, purpose), isNull(authTokens.consumedAt))))
    .orderBy(desc(authTokens.createdAt))
    .limit(1);
  return rows[0] ?? null;
}

/** AUTH-04 (P-B) — consume EVERY live row of a purpose (one live reset code at a time: a re-request
 * kills the prior code first). Scoped to the owner (SYS-01). */
export async function consumeAllForUser(
  userId: string,
  purpose: AuthTokenPurpose,
  exec: Executor = getDb(),
): Promise<void> {
  const actor = asActor(userId);
  await exec
    .update(authTokens)
    .set({ consumedAt: new Date() })
    .where(ownedBy(actor, authTokens.userId, and(eq(authTokens.purpose, purpose), isNull(authTokens.consumedAt))));
}

/** AUTH-04 (P-B) — record a wrong guess against a code row (the caller consumes the row at the cap).
 * The VALUE is computed by the caller from the row it just read in the SAME transaction (the SYS-01
 * scoping lint fails closed on raw sql`` in repositories, OQ-118 — so no in-place `attempts + 1`);
 * a racing undercount is bounded by the `auth:reset-verify` limiter and the cap-then-consume
 * semantics. Scoped to the owner (SYS-01). */
export async function setAttempts(
  tokenId: string,
  userId: string,
  attempts: number,
  exec: Executor = getDb(),
): Promise<void> {
  const actor = asActor(userId);
  await exec
    .update(authTokens)
    .set({ attempts })
    .where(ownedBy(actor, authTokens.userId, eq(authTokens.id, tokenId)));
}

/** Consume a token (single-use). Scoped to the token owner (SYS-01). */
export async function markConsumed(
  tokenId: string,
  userId: string,
  exec: Executor = getDb(),
): Promise<void> {
  const actor = asActor(userId);
  await exec
    .update(authTokens)
    .set({ consumedAt: new Date() })
    .where(ownedBy(actor, authTokens.userId, eq(authTokens.id, tokenId)));
}
