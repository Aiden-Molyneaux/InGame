import { eq } from 'drizzle-orm';
import { getDb, type Executor } from '../db/client';
import { asActor, ownedBy } from '../db/scoped';
import { authTokens, type AuthTokenRow } from '../db/schema';
import { ServerError } from '../errors/AppError';

// Single-use, time-boxed tokens for password reset (AUTH-04) + email verification (AUTH-08). Only the
// token HASH is stored. The lookup-by-hash is a bearer-credential read (pre-actor) → SYS-01-AUTH-LOOKUP;
// consume is scoped to the resolved owner (SYS-01).

export type AuthTokenPurpose = 'password_reset' | 'email_verify';

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
