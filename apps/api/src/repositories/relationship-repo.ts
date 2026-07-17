import { and, eq, inArray, or } from 'drizzle-orm';
import type { Relationship } from '@ingame/shared';
import { getDb, type Executor } from '../db/client';
import { asActor, ownedBy } from '../db/scoped';
import { friendRequests, friendships, userBlocks, type FriendshipRow } from '../db/schema';

// Read-only relationship / block substrate for the GET /users/:id privacy engine (SOC-01/09; PROF-03).
// M2 builds these READS + seed helpers ONLY — the friend request/accept + block/unblock ENDPOINTS are
// SOC/M6. Every read is scoped to the ACTOR via `asActor` (the query is bounded to rows involving the
// actor); the F06 serializer + the SYS-07 shape test are the exposure guards (not the row read itself).

/**
 * SOC-01/08 relationship between the actor and a target (none / outgoing / incoming / friend). The
 * ACCEPTED bond lives in `friendships`; the PENDING direction lives in `friend_requests` (the M6 split —
 * friendships is accepted-only, friend_requests owns the request lifecycle). Each read calls asActor so
 * the SYS-01 scope signal binds to its own `.from` (rule-02).
 */
export async function getRelationship(
  actorId: string,
  targetId: string,
  exec: Executor = getDb(),
): Promise<Relationship> {
  if (await acceptedBondExists(actorId, targetId, exec)) return 'friend';
  return (await pendingDirection(actorId, targetId, exec)) ?? 'none';
}

/** True iff an ACCEPTED friendship binds the actor↔target (either stored direction). */
async function acceptedBondExists(
  actorId: string,
  targetId: string,
  exec: Executor,
): Promise<boolean> {
  const actor = asActor(actorId);
  const rows = await exec
    .select({ id: friendships.id })
    .from(friendships)
    .where(
      and(
        eq(friendships.status, 'accepted'),
        or(
          and(eq(friendships.requesterId, actor.actorId), eq(friendships.addresseeId, targetId)),
          and(eq(friendships.requesterId, targetId), eq(friendships.addresseeId, actor.actorId)),
        ),
      ),
    )
    .limit(1);
  return rows.length > 0;
}

/** The PENDING request direction between actor↔target, or null when none is pending. */
async function pendingDirection(
  actorId: string,
  targetId: string,
  exec: Executor,
): Promise<'outgoing' | 'incoming' | null> {
  const actor = asActor(actorId);
  const rows = await exec
    .select({ fromUserId: friendRequests.fromUserId })
    .from(friendRequests)
    .where(
      and(
        eq(friendRequests.status, 'pending'),
        or(
          and(eq(friendRequests.fromUserId, actor.actorId), eq(friendRequests.toUserId, targetId)),
          and(eq(friendRequests.fromUserId, targetId), eq(friendRequests.toUserId, actor.actorId)),
        ),
      ),
    )
    .limit(1);
  const row = rows[0];
  if (!row) return null;
  return row.fromUserId === actor.actorId ? 'outgoing' : 'incoming';
}

/** SOC-01 — form the ACCEPTED bond (on request-accept). Bare actor-stamped insert (rule-02 exempt). */
export async function insertFriendship(
  requesterId: string,
  addresseeId: string,
  exec: Executor = getDb(),
): Promise<FriendshipRow> {
  const rows = await exec
    .insert(friendships)
    .values({ requesterId, addresseeId, status: 'accepted' })
    .returning();
  return rows[0]!;
}

/**
 * SOC-09 — on BLOCK, sever the ACCEPTED friendship between the pair, either direction. Scoped to the
 * actor (the blocker) as one party. Idempotent (no bond ⇒ no-op).
 */
export async function deleteFriendshipBetween(
  actorId: string,
  otherId: string,
  exec: Executor = getDb(),
): Promise<void> {
  const actor = asActor(actorId);
  await exec
    .delete(friendships)
    .where(
      and(
        or(
          and(eq(friendships.requesterId, actor.actorId), eq(friendships.addresseeId, otherId)),
          and(eq(friendships.requesterId, otherId), eq(friendships.addresseeId, actor.actorId)),
        ),
      ),
    );
}

/** SOC-09 — a block in EITHER direction (drives the GET /users/:id "unavailable" collapse). */
export async function isBlockedBetween(
  actorId: string,
  targetId: string,
  exec: Executor = getDb(),
): Promise<boolean> {
  const actor = asActor(actorId);
  const rows = await exec
    .select()
    .from(userBlocks)
    .where(
      or(
        and(eq(userBlocks.blockerId, actor.actorId), eq(userBlocks.blockedId, targetId)),
        and(eq(userBlocks.blockerId, targetId), eq(userBlocks.blockedId, actor.actorId)),
      ),
    )
    .limit(1);
  return rows.length > 0;
}

/**
 * SOC-09 §0.6 — the set of user ids blocked in EITHER direction with the actor (for gallery/trending
 * block-filtering). When `candidateIds` is given, the read is bounded to those (the common gallery
 * case — only the designers on the page matter); omitted → every either-direction block for the actor.
 * Actor-scoped via `asActor` (the query is bounded to rows involving the actor).
 */
export async function listBlockedIds(
  actorId: string,
  candidateIds?: string[],
  exec: Executor = getDb(),
): Promise<Set<string>> {
  if (candidateIds && candidateIds.length === 0) return new Set();
  const actor = asActor(actorId);
  const bounded = candidateIds
    ? and(
        or(
          and(eq(userBlocks.blockerId, actor.actorId), inArray(userBlocks.blockedId, candidateIds)),
          and(eq(userBlocks.blockedId, actor.actorId), inArray(userBlocks.blockerId, candidateIds)),
        ),
      )
    : or(eq(userBlocks.blockerId, actor.actorId), eq(userBlocks.blockedId, actor.actorId));
  const rows = await exec.select().from(userBlocks).where(bounded);
  const out = new Set<string>();
  for (const r of rows) {
    // The OTHER party (never the actor) is the blocked/blocking counterpart to filter out.
    out.add(r.blockerId === actor.actorId ? r.blockedId : r.blockerId);
  }
  return out;
}

// ── SOC-09 block/unblock writes (M5 F-2 — the endpoints the M2 substrate deferred) ──────────────────

/**
 * SOC-09 — the actor BLOCKS a target. Actor-stamped bare insert (`blockerId` = the actor, SYS-01, never
 * body-supplied); `onConflictDoNothing` on the (blocker, blocked) unique pair makes a repeat block an
 * idempotent no-op. Returns true iff a NEW row landed (false = already blocked). An unknown `blockedId`
 * trips the FK — the service maps it to a 404.
 */
export async function insertBlock(
  actorId: string,
  blockedId: string,
  exec: Executor = getDb(),
): Promise<boolean> {
  const actor = asActor(actorId);
  const rows = await exec
    .insert(userBlocks)
    .values({ blockerId: actor.actorId, blockedId })
    .onConflictDoNothing({ target: [userBlocks.blockerId, userBlocks.blockedId] })
    .returning({ id: userBlocks.id });
  return rows.length > 0;
}

/** SOC-09 — the actor UNBLOCKS a target. Scoped to the actor's OWN block row (SYS-01); idempotent
 *  (removing a non-existent block is a no-op). Returns true iff a row was removed. */
export async function deleteBlock(
  actorId: string,
  blockedId: string,
  exec: Executor = getDb(),
): Promise<boolean> {
  const actor = asActor(actorId);
  const rows = await exec
    .delete(userBlocks)
    .where(ownedBy(actor, userBlocks.blockerId, eq(userBlocks.blockedId, blockedId)))
    .returning({ id: userBlocks.id });
  return rows.length > 0;
}

async function friendIdsOf(userId: string, exec: Executor): Promise<string[]> {
  const actor = asActor(userId);
  const rows = await exec
    .select()
    .from(friendships)
    .where(
      and(
        eq(friendships.status, 'accepted'),
        or(eq(friendships.requesterId, actor.actorId), eq(friendships.addresseeId, actor.actorId)),
      ),
    );
  return rows.map((r) => (r.requesterId === userId ? r.addresseeId : r.requesterId));
}

/** The honest accepted-friends count (friend-shape only). */
export async function countFriends(userId: string, exec: Executor = getDb()): Promise<number> {
  return (await friendIdsOf(userId, exec)).length;
}

/** Friends the actor + target have in common (shown on both the limited + friend shapes). */
export async function countMutualFriends(
  actorId: string,
  targetId: string,
  exec: Executor = getDb(),
): Promise<number> {
  const [a, b] = await Promise.all([friendIdsOf(actorId, exec), friendIdsOf(targetId, exec)]);
  const bSet = new Set(b);
  return a.filter((id) => bSet.has(id)).length;
}
