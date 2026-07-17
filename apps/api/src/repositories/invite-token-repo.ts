import { and, asc, eq, gt, isNull } from 'drizzle-orm';
import { getDb, type Executor } from '../db/client';
import { asActor, ownedBy } from '../db/scoped';
import { inviteTokens, type InviteTokenRow } from '../db/schema';
import { ServerError } from '../errors/AppError';

// SOC-10 invite-token store (M6 P3; decision 0076 §0.6). `invite_tokens` is USER-OWNED. Only token
// HASHES are stored — the token IS a BEARER credential (an unguessable server-random secret), treated
// exactly like the refresh-token / auth-token precedent. The resolve is a lookup-BY-HASH with NO actor
// (a fresh install may present the token) → it is a bearer-credential read on the SYS-01-AUTH-LOOKUP
// read class (decision 0073 §0.1 pre-naming). This file's NAME (`*-token-repo`) places it inside the
// rule-02 `isAuthLookupFile` surface, so the marker is admitted here (and ONLY for a `.from` SELECT —
// the WRITES below still fail closed unless actor-scoped, which they are). Every mint/revoke is
// actor-scoped by the resolved `user_id` via the SYS-01 helper (asActor / ownedBy).

/** SOC-10 — mint a new invite row (actor-stamped: `userId` is the minter, SYS-01 — never body-supplied).
 *  Bare insert (you cannot IDOR a brand-new actor-stamped row — rule-02 exempts it). */
export async function insertInviteToken(
  values: { userId: string; tokenHash: string; expiresAt: Date },
  exec: Executor = getDb(),
): Promise<InviteTokenRow> {
  const [row] = await exec.insert(inviteTokens).values(values).returning();
  if (!row) throw new ServerError('invite-token insert returned no row.');
  return row;
}

/**
 * SOC-10 — resolve an invite by its token HASH (GET /invites/:token). This is the BEARER-credential
 * lookup: there is NO actor (the resolver may be unauthenticated / a fresh install), the token itself is
 * the credential. It returns the raw row (live/expired/revoked) — the SERVICE applies the TTL + revoked +
 * non-disclosure rules so `null` (never-existed) and a revoked/expired row all collapse the same way.
 */
export async function findByHash(
  tokenHash: string,
  exec: Executor = getDb(),
): Promise<InviteTokenRow | null> {
  // SYS-01-AUTH-LOOKUP: bearer-credential lookup by token-hash (the invite token IS the credential).
  const rows = await exec
    .select()
    .from(inviteTokens)
    .where(eq(inviteTokens.tokenHash, tokenHash))
    .limit(1);
  return rows[0] ?? null;
}

/**
 * SOC-10 — the actor's ACTIVE invite tokens (unrevoked, unexpired at `now`), OLDEST first. Actor-scoped
 * via `ownedBy` (SYS-01 — only the minter's own rows). Drives the cap-5 create-new-invalidates-oldest
 * rotation (the service revokes the surplus oldest). Read inside the mint transaction under a per-actor
 * advisory lock, so the count it returns is stable against a concurrent mint.
 */
export async function listActiveOldestFirst(
  actorId: string,
  now: Date,
  exec: Executor = getDb(),
): Promise<InviteTokenRow[]> {
  const actor = asActor(actorId);
  return exec
    .select()
    .from(inviteTokens)
    .where(ownedBy(actor, inviteTokens.userId, and(isNull(inviteTokens.revokedAt), gt(inviteTokens.expiresAt, now))))
    .orderBy(asc(inviteTokens.createdAt), asc(inviteTokens.id));
}

/**
 * SOC-10 — revoke a single invite (create-new-invalidates-oldest, and the M8 explicit-revoke seam).
 * Actor-scoped via `ownedBy` (SYS-01 — the actor can only revoke their OWN token) AND idempotent (only a
 * still-live row is stamped, so a double-revoke is a no-op). Returns whether a row was stamped.
 */
export async function revokeById(
  actorId: string,
  inviteId: string,
  now: Date,
  exec: Executor = getDb(),
): Promise<boolean> {
  const actor = asActor(actorId);
  const rows = await exec
    .update(inviteTokens)
    .set({ revokedAt: now })
    .where(ownedBy(actor, inviteTokens.userId, and(eq(inviteTokens.id, inviteId), isNull(inviteTokens.revokedAt))))
    .returning({ id: inviteTokens.id });
  return rows.length > 0;
}
