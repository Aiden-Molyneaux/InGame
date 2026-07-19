import { and, desc, eq, gt, or } from 'drizzle-orm';
import { getDb, type Executor } from '../db/client';
import { asActor } from '../db/scoped';
import { friendRequests, users, type FriendRequestRow, type UserRow } from '../db/schema';

// SOC-08 friend-REQUEST lifecycle reads/writes (M6 P1). `friend_requests` is USER-OWNED (both parties);
// every read is scoped to the ACTOR (the actor is `from` OR `to`) via asActor. The accepted BOND lands
// in `friendships` (relationship-repo.insertFriendship) — this table owns only the request states
// (pending | accepted | declined | cancelled). The status TRANSITIONS are ATOMIC conditional updates
// (`... WHERE status = 'pending' RETURNING`) so a concurrent accept/decline/cancel of the same request
// resolves to ONE terminal state under the row lock — never an orphan bond (the F36 fix the spike lacked).

/** A person summary (public allowlist) — the join shape for the request-list reads. */
export interface RequestPersonRow {
  requestId: string;
  userId: string;
  username: string;
  avatarUrl: string | null;
  /** PROF-08 (W-4) — the request row's forged monogram; null ⇒ the default. Public-safe cosmetic. */
  avatarConfig: UserRow['avatarConfig'];
  createdAt: Date;
}

/** A NEW pending request (actor-stamped: `fromUserId` = the actor, SYS-01 — never body-supplied). Bare
 *  insert (you cannot IDOR a brand-new actor-stamped row — rule-02 exempts it). The partial-unique
 *  pending-pair index (schema) is the F36 backstop — a concurrent duplicate raises unique_violation. */
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
 *  REQUEST_PENDING refusal, the mutual-pending auto-accept decision, and getRelationship). Actor-scoped. */
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
 * SOC-08 (decision 0076 §0.7) — the SYS-04 re-request cooldown expiry blocking the actor from
 * re-requesting `targetId`, or null when clear. Scoped to the actor's OWN prior request (`from` = actor)
 * that was DECLINED or CANCELLED with a still-future `cooldownUntil` (SOC-08 verbatim: re-requesting
 * after a decline/cancel is cooldown-limited — the UX question of a softer cancel window is OQ-147).
 * Actor-scoped; the other party is never throttled by the actor's stamp.
 */
export async function cooldownUntilFor(
  actorId: string,
  targetId: string,
  now: Date,
  exec: Executor = getDb(),
): Promise<Date | null> {
  const actor = asActor(actorId);
  const rows = await exec
    .select({ cooldownUntil: friendRequests.cooldownUntil })
    .from(friendRequests)
    .where(
      and(
        eq(friendRequests.fromUserId, actor.actorId),
        eq(friendRequests.toUserId, targetId),
        gt(friendRequests.cooldownUntil, now),
      ),
    )
    .orderBy(desc(friendRequests.cooldownUntil))
    .limit(1);
  return rows[0]?.cooldownUntil ?? null;
}

/**
 * SOC-08 / SYS-07 — the pending request `requestId` the ACTOR is entitled to ACCEPT (addressed TO the
 * actor, still pending), or null. A READ-ONLY pre-look the accept path uses to learn the pair BEFORE
 * taking the canonical-pair advisory lock (§4 audit HIGH — the lock key needs both ids); the atomic
 * `acceptPendingReturning` below re-verifies pending-ness under the lock, so this read racing a
 * concurrent block/cancel is safe (the loser's conditional update returns 0 rows).
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

/**
 * SOC-08 / SYS-07 — ATOMICALLY accept the request `requestId` IFF it is addressed TO the actor and still
 * pending. The `WHERE status = 'pending'` predicate + RETURNING makes the transition win-once under a
 * concurrent decline/cancel: exactly one of them flips the row; the losers get 0 rows back. Returns the
 * row (so the caller forms the bond) or null (unknown / not-yours / already-terminal → the collapse).
 */
export async function acceptPendingReturning(
  actorId: string,
  requestId: string,
  exec: Executor = getDb(),
): Promise<FriendRequestRow | null> {
  const actor = asActor(actorId);
  const rows = await exec
    .update(friendRequests)
    .set({ status: 'accepted', updatedAt: new Date() })
    .where(
      and(
        eq(friendRequests.id, requestId),
        eq(friendRequests.toUserId, actor.actorId),
        eq(friendRequests.status, 'pending'),
      ),
    )
    .returning();
  return rows[0] ?? null;
}

/**
 * SOC-08 — ATOMICALLY DECLINE the request `requestId` IFF addressed TO the actor and pending; stamps the
 * SYS-04 `cooldownUntil` so a re-request inside the window is refused. Silent (no notification). Returns
 * the row or null (unknown / not-yours / already-terminal → the collapse).
 */
export async function declinePendingReturning(
  actorId: string,
  requestId: string,
  cooldownUntil: Date,
  exec: Executor = getDb(),
): Promise<FriendRequestRow | null> {
  const actor = asActor(actorId);
  const rows = await exec
    .update(friendRequests)
    .set({ status: 'declined', cooldownUntil, updatedAt: new Date() })
    .where(
      and(
        eq(friendRequests.id, requestId),
        eq(friendRequests.toUserId, actor.actorId),
        eq(friendRequests.status, 'pending'),
      ),
    )
    .returning();
  return rows[0] ?? null;
}

/**
 * SOC-08 — ATOMICALLY CANCEL the OUTGOING request `requestId` IFF sent FROM the actor and pending.
 * COOLDOWN-EXEMPT (OQ-147, owner-ruled 2026-07-17 → decision 0078): a voluntary cancel does NOT stamp
 * the SYS-04 re-request cooldown — only a DECLINE cools down. An accidental cancel must not lock the
 * sender out for 7 days; re-request spam is still throttled by the friends:request rate bucket (10/hr).
 * (This reverts the P1 conformance stamp; the SOC-08 spec text moves from "decline/cancel" to
 * "decline only" — orchestrator-owned edit.) Returns the row or null (unknown / not-yours /
 * already-terminal → the collapse).
 */
export async function cancelOutgoingReturning(
  actorId: string,
  requestId: string,
  exec: Executor = getDb(),
): Promise<FriendRequestRow | null> {
  const actor = asActor(actorId);
  const rows = await exec
    .update(friendRequests)
    .set({ status: 'cancelled', updatedAt: new Date() })
    .where(
      and(
        eq(friendRequests.id, requestId),
        eq(friendRequests.fromUserId, actor.actorId),
        eq(friendRequests.status, 'pending'),
      ),
    )
    .returning();
  return rows[0] ?? null;
}

/**
 * SOC-09 — on BLOCK, cancel any PENDING request between the pair, either direction (severance). Scoped
 * to the actor (the blocker) as one party. Idempotent (no pending rows ⇒ no-op). No cooldown stamp.
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

/**
 * SOC-08 — the actor's INCOMING pending requests (they may accept/decline), each with the SENDER's
 * public summary. Actor-scoped (`toUserId` = actor); the `users` join is hydrated in-window under that
 * scope. Excludes deleted senders (OQ-145 posture — a deleted account collapses).
 */
export async function listIncomingPending(
  actorId: string,
  exec: Executor = getDb(),
): Promise<RequestPersonRow[]> {
  const actor = asActor(actorId);
  const rows = await exec
    .select({
      requestId: friendRequests.id,
      userId: users.id,
      username: users.username,
      avatarUrl: users.avatarUrl,
      avatarConfig: users.avatarConfig,
      createdAt: friendRequests.createdAt,
      deletedAt: users.deletedAt,
    })
    .from(friendRequests)
    .innerJoin(users, eq(users.id, friendRequests.fromUserId))
    .where(and(eq(friendRequests.toUserId, actor.actorId), eq(friendRequests.status, 'pending')))
    .orderBy(desc(friendRequests.createdAt));
  return rows.filter((r) => !r.deletedAt).map(stripDeleted);
}

/**
 * SOC-08 — the actor's OUTGOING pending requests (they may cancel), each with the ADDRESSEE's summary.
 * Actor-scoped (`fromUserId` = actor). Excludes deleted addressees.
 */
export async function listOutgoingPending(
  actorId: string,
  exec: Executor = getDb(),
): Promise<RequestPersonRow[]> {
  const actor = asActor(actorId);
  const rows = await exec
    .select({
      requestId: friendRequests.id,
      userId: users.id,
      username: users.username,
      avatarUrl: users.avatarUrl,
      avatarConfig: users.avatarConfig,
      createdAt: friendRequests.createdAt,
      deletedAt: users.deletedAt,
    })
    .from(friendRequests)
    .innerJoin(users, eq(users.id, friendRequests.toUserId))
    .where(and(eq(friendRequests.fromUserId, actor.actorId), eq(friendRequests.status, 'pending')))
    .orderBy(desc(friendRequests.createdAt));
  return rows.filter((r) => !r.deletedAt).map(stripDeleted);
}

function stripDeleted(r: RequestPersonRow & { deletedAt: Date | null }): RequestPersonRow {
  const { deletedAt: _deletedAt, ...rest } = r;
  return rest;
}
