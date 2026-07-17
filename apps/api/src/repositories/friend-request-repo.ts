import { and, eq, or } from 'drizzle-orm';
import { getDb, type Executor } from '../db/client';
import { asActor } from '../db/scoped';
import { friendRequests, type FriendRequestRow } from '../db/schema';

// SOC-08 friend-REQUEST lifecycle reads/writes (M6 §1 spike / P1). `friend_requests` is USER-OWNED
// (both parties); every read is scoped to the ACTOR (the actor is `from` OR `to`) via asActor. The
// accepted BOND lands in `friendships` (relationship-repo.insertFriendship) — this table owns only the
// request states (pending | accepted | declined | cancelled). Happy-path only: no cooldown enforcement,
// no partial-unique-on-pending F36 guard, no mutual-pending auto-accept — all P1.

/** A NEW pending request (actor-stamped: `fromUserId` = the actor, SYS-01 — never body-supplied). Bare
 *  insert (you cannot IDOR a brand-new actor-stamped row — rule-02 exempts it). */
export async function insertRequest(
  actorId: string,
  toUserId: string,
  exec: Executor = getDb(),
): Promise<FriendRequestRow> {
  const actor = asActor(actorId);
  const rows = await exec
    .insert(friendRequests)
    .values({ fromUserId: actor.actorId, toUserId, status: 'pending' })
    .returning();
  return rows[0]!;
}

/** SOC-08 — the live PENDING request between the actor and `otherId`, either direction (drives the
 *  REQUEST_PENDING refusal + getRelationship's outgoing/incoming). Actor-scoped via asActor. */
export async function findPendingBetween(
  actorId: string,
  otherId: string,
  exec: Executor = getDb(),
): Promise<FriendRequestRow | null> {
  const actor = asActor(actorId);
  const rows = await exec
    .select()
    .from(friendRequests)
    .where(
      and(
        eq(friendRequests.status, 'pending'),
        or(
          and(eq(friendRequests.fromUserId, actor.actorId), eq(friendRequests.toUserId, otherId)),
          and(eq(friendRequests.fromUserId, otherId), eq(friendRequests.toUserId, actor.actorId)),
        ),
      ),
    )
    .limit(1);
  return rows[0] ?? null;
}

/**
 * SOC-08 / SYS-07 — the pending request `requestId` that the ACTOR is entitled to ACCEPT: it must be
 * addressed TO the actor (`toUserId` = actor) and still pending. Scoped to the actor as the addressee —
 * a non-addressee (actor-B) gets no row, so they cannot accept another user's request (the collapse
 * returns a generic NotFound at the service). Returns null when unknown / not-yours / not-pending.
 */
export async function findAcceptableRequest(
  actorId: string,
  requestId: string,
  exec: Executor = getDb(),
): Promise<FriendRequestRow | null> {
  const actor = asActor(actorId);
  const rows = await exec
    .select()
    .from(friendRequests)
    .where(
      and(
        eq(friendRequests.id, requestId),
        eq(friendRequests.toUserId, actor.actorId),
        eq(friendRequests.status, 'pending'),
      ),
    )
    .limit(1);
  return rows[0] ?? null;
}

/** SOC-08 — transition a request to `accepted` (scoped to the addressee — the actor). */
export async function markAccepted(
  actorId: string,
  requestId: string,
  exec: Executor = getDb(),
): Promise<void> {
  const actor = asActor(actorId);
  await exec
    .update(friendRequests)
    .set({ status: 'accepted', updatedAt: new Date() })
    .where(and(eq(friendRequests.id, requestId), eq(friendRequests.toUserId, actor.actorId)));
}

/**
 * SOC-09 — on BLOCK, cancel any PENDING request between the pair, either direction (severance). Scoped
 * to the actor (the blocker) as one party. Idempotent (no pending rows ⇒ no-op).
 */
export async function cancelPendingBetween(
  actorId: string,
  otherId: string,
  exec: Executor = getDb(),
): Promise<void> {
  const actor = asActor(actorId);
  await exec
    .update(friendRequests)
    .set({ status: 'cancelled', updatedAt: new Date() })
    .where(
      and(
        eq(friendRequests.status, 'pending'),
        or(
          and(eq(friendRequests.fromUserId, actor.actorId), eq(friendRequests.toUserId, otherId)),
          and(eq(friendRequests.fromUserId, otherId), eq(friendRequests.toUserId, actor.actorId)),
        ),
      ),
    );
}
