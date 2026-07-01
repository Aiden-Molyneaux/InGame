import { eq, and, isNull } from 'drizzle-orm';
import { getDb, type Executor } from '../db/client';
import { asActor, ownedBy } from '../db/scoped';
import { refreshTokens, type RefreshTokenRow } from '../db/schema';
import { ServerError } from '../errors/AppError';

// The server-side refresh-token store (AUTH-02/05; F15 rotation + reuse-detection). Only token HASHES
// are stored. The lookup-by-hash is a bearer-credential read (the token IS the credential, pre-actor
// resolution) → // SYS-01-AUTH-LOOKUP. Every WRITE is actor-scoped by the resolved userId (SYS-01).

export interface NewRefreshToken {
  userId: string;
  familyId: string;
  tokenHash: string;
  expiresAt: Date;
}

export async function insertToken(
  values: NewRefreshToken,
  exec: Executor = getDb(),
): Promise<RefreshTokenRow> {
  const [row] = await exec.insert(refreshTokens).values(values).returning();
  if (!row) throw new ServerError('refresh-token insert returned no row.');
  return row;
}

export async function findByHash(
  tokenHash: string,
  exec: Executor = getDb(),
): Promise<RefreshTokenRow | null> {
  // SYS-01-AUTH-LOOKUP: bearer-credential lookup by token-hash (the refresh token IS the credential).
  const rows = await exec
    .select()
    .from(refreshTokens)
    .where(eq(refreshTokens.tokenHash, tokenHash))
    .limit(1);
  return rows[0] ?? null;
}

/** Mark a token consumed by rotation, pointing at its successor. Scoped to the token owner (SYS-01). */
export async function markRotated(
  tokenId: string,
  userId: string,
  replacedById: string,
  exec: Executor = getDb(),
): Promise<void> {
  const actor = asActor(userId);
  await exec
    .update(refreshTokens)
    .set({ rotatedAt: new Date(), replacedById })
    .where(ownedBy(actor, refreshTokens.userId, eq(refreshTokens.id, tokenId)));
}

/** Revoke a single token (logout). Scoped to the owner (SYS-01). */
export async function revokeToken(
  tokenId: string,
  userId: string,
  exec: Executor = getDb(),
): Promise<void> {
  const actor = asActor(userId);
  await exec
    .update(refreshTokens)
    .set({ revokedAt: new Date() })
    .where(ownedBy(actor, refreshTokens.userId, eq(refreshTokens.id, tokenId)));
}

/**
 * F15 REUSE-DETECTION: revoke the ENTIRE descendant token family (forces a full re-auth). Called when
 * an already-rotated/revoked token is replayed. Scoped to the owner (SYS-01); only live rows updated.
 */
export async function revokeFamily(
  familyId: string,
  userId: string,
  exec: Executor = getDb(),
): Promise<void> {
  const actor = asActor(userId);
  await exec
    .update(refreshTokens)
    .set({ revokedAt: new Date() })
    .where(ownedBy(actor, refreshTokens.userId, and(eq(refreshTokens.familyId, familyId), isNull(refreshTokens.revokedAt))));
}

/** Revoke ALL of a user's live refresh tokens (e.g. on password reset). Scoped to the owner (SYS-01). */
export async function revokeAllForUser(userId: string, exec: Executor = getDb()): Promise<void> {
  const actor = asActor(userId);
  await exec
    .update(refreshTokens)
    .set({ revokedAt: new Date() })
    .where(ownedBy(actor, refreshTokens.userId, isNull(refreshTokens.revokedAt)));
}
