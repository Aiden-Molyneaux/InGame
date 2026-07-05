import { and, eq, or } from 'drizzle-orm';
import type { Relationship } from '@ingame/shared';
import { getDb, type Executor } from '../db/client';
import { asActor } from '../db/scoped';
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
