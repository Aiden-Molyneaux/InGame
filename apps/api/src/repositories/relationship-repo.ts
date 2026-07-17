import { and, eq, inArray, or } from 'drizzle-orm';
import type { Relationship } from '@ingame/shared';
import { getDb, type Executor } from '../db/client';
import { asActor, ownedBy } from '../db/scoped';
import { friendships, userBlocks } from '../db/schema';

// Read-only relationship / block substrate for the GET /users/:id privacy engine (SOC-01/09; PROF-03).
// M2 builds these READS + seed helpers ONLY — the friend request/accept + block/unblock ENDPOINTS are
// SOC/M6. Every read is scoped to the ACTOR via `asActor` (the query is bounded to rows involving the
// actor); the F06 serializer + the SYS-07 shape test are the exposure guards (not the row read itself).

/** SOC-01/08 relationship between the actor and a target (none / outgoing / incoming / friend). */
export async function getRelationship(
  actorId: string,
  targetId: string,
  exec: Executor = getDb(),
): Promise<Relationship> {
  const actor = asActor(actorId);
  const rows = await exec
    .select()
    .from(friendships)
    .where(
      or(
        and(eq(friendships.requesterId, actor.actorId), eq(friendships.addresseeId, targetId)),
        and(eq(friendships.requesterId, targetId), eq(friendships.addresseeId, actor.actorId)),
      ),
    )
    .limit(1);
  const row = rows[0];
  if (!row) return 'none';
  if (row.status === 'accepted') return 'friend';
  return row.requesterId === actor.actorId ? 'outgoing' : 'incoming';
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
