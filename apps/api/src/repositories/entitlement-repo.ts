import { eq, inArray } from 'drizzle-orm';
import { getDb, type Executor } from '../db/client';
import { asActor, ownedBy } from '../db/scoped';
import { userEntitlements, type UserEntitlementRow } from '../db/schema';

// Entitlement repository — `user_entitlements` is USER-OWNED (owner key = user_id; NOT on the F32
// manifest — rule-2 fails closed). M5 P4 substrate (decision 0072/0073). Grants are ACTOR-STAMPED
// inserts (rule-2: a brand-new actor-owned row is not an IDOR vector) — the unique (user, cosmeticId)
// pair backs idempotent acquire; `onConflictDoNothing` returns the row ONLY when THIS call created it.
// The ECON-11 operator path passes the TARGET user's id explicitly (the same "actorId param is really
// the row owner" shape ledger-service's `applyDelta`/`adjustPixels` already use) — an operator grant/
// clawback writes to the target's entitlements, not the calling operator's.

export interface EntitlementInsert {
  cosmeticId: string;
  source: 'purchase' | 'earned' | 'operator_grant';
}

/** Actor-stamped bare insert (idempotent via onConflictDoNothing — defense-in-depth; the acquire
 *  service already serializes under the wallet lock, so a real conflict here should not occur). */
export async function insertEntitlement(
  exec: Executor,
  userId: string,
  fields: EntitlementInsert,
): Promise<UserEntitlementRow | null> {
  const actor = asActor(userId);
  const rows = await exec
    .insert(userEntitlements)
    .values({ userId: actor.actorId, cosmeticId: fields.cosmeticId, source: fields.source })
    .onConflictDoNothing({ target: [userEntitlements.userId, userEntitlements.cosmeticId] })
    .returning();
  return rows[0] ?? null;
}

/** The subset of `cosmeticIds` the user already owns (actor-scoped — SYS-01). */
export async function findOwnedCosmeticIds(
  exec: Executor,
  userId: string,
  cosmeticIds: string[],
): Promise<Set<string>> {
  if (cosmeticIds.length === 0) return new Set();
  const actor = asActor(userId);
  const rows = await exec
    .select({ cosmeticId: userEntitlements.cosmeticId })
    .from(userEntitlements)
    .where(ownedBy(actor, userEntitlements.userId, inArray(userEntitlements.cosmeticId, cosmeticIds)));
  return new Set(rows.map((r) => r.cosmeticId));
}

/** All of the caller's entitlements, newest-first (GET /me/entitlements, COSM-03). */
export async function listMyEntitlements(
  actorId: string,
  exec: Executor = getDb(),
): Promise<UserEntitlementRow[]> {
  const actor = asActor(actorId);
  return exec
    .select()
    .from(userEntitlements)
    .where(ownedBy(actor, userEntitlements.userId))
    .orderBy(userEntitlements.createdAt);
}

/** ECON-11 clawback — delete the target's entitlement row. Returns whether a row existed. */
export async function deleteEntitlement(
  exec: Executor,
  userId: string,
  cosmeticId: string,
): Promise<boolean> {
  const actor = asActor(userId);
  const rows = await exec
    .delete(userEntitlements)
    .where(ownedBy(actor, userEntitlements.userId, eq(userEntitlements.cosmeticId, cosmeticId)))
    .returning();
  return rows.length > 0;
}
