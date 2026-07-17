import { and, desc, eq, isNull, type SQL } from 'drizzle-orm';
import { getDb, type Executor } from '../db/client';
import { asActor, ownedBy } from '../db/scoped';
import {
  recommendations,
  users,
  type RecommendationRow,
} from '../db/schema';

// SOC-05 recommendations repository (M6 P4). `recommendations` is USER-OWNED (both parties). The inbox
// read is scoped to the RECIPIENT (`to_user_id` = actor via ownedBy); the sender's public summary
// (username) is joined in-window under that scope (the same pattern as relationship-repo's blocked-list:
// the join is bounded to the recommenders of the ACTOR'S OWN inbox rows). Dismiss is scoped to the
// recipient's own row. The insert is an actor-stamped bare insert (rule-02 exempt).

/**
 * SOC-05 — insert a recommendation (sender = actor). Actor-stamped bare insert (`from_user_id` = the
 * actor, SYS-01, never body-supplied). `onConflictDoNothing` on the PARTIAL live-unique index
 * (from,to,game WHERE not dismissed) makes a duplicate LIVE rec an idempotent no-op — a re-recommend of a
 * game already sitting live in the recipient's inbox does NOT stack (P4 design #1). Returns the new row,
 * or `null` when a live duplicate already existed (the idempotent no-op — the sender already fed it once).
 * A dismissed prior row is NOT in the partial index, so a re-recommend after dismiss inserts a fresh row.
 */
export async function insertRecommendation(
  actorId: string,
  toUserId: string,
  gameId: string,
  note: string | null,
  exec: Executor = getDb(),
): Promise<RecommendationRow | null> {
  const actor = asActor(actorId);
  const rows = await exec
    .insert(recommendations)
    .values({ fromUserId: actor.actorId, toUserId, gameId, note })
    .onConflictDoNothing({
      target: [recommendations.fromUserId, recommendations.toUserId, recommendations.gameId],
      where: isNull(recommendations.dismissedAt),
    })
    .returning();
  return rows[0] ?? null;
}

/** One inbox row + the sender's public summary (the SOC-05 rec-inbox read allowlist). */
export interface RecommendationInboxRow {
  recId: string;
  gameId: string;
  note: string | null;
  createdAt: Date;
  fromUserId: string;
  fromUsername: string;
}

/**
 * GET /me/recommendations (SOC-05) — the actor's LIVE (non-dismissed) inbox, newest first. Scoped to the
 * recipient (`to_user_id` = actor via ownedBy); the `users` join hydrates the SENDER's public summary
 * in-window under that scope (bounded to the actor's own inbox rows). A dismissed row is excluded
 * (`dismissed_at IS NULL`). The block-either-direction exclusion is applied by the SERVICE (it holds the
 * actor's blocked-id set) — a block severs the friendship but the historical rec row persists, so the
 * inbox read filters blocked senders in the service, not here.
 */
export async function listInbox(
  actorId: string,
  exec: Executor = getDb(),
): Promise<RecommendationInboxRow[]> {
  const actor = asActor(actorId);
  const rows = await exec
    .select({
      recId: recommendations.id,
      gameId: recommendations.gameId,
      note: recommendations.note,
      createdAt: recommendations.createdAt,
      fromUserId: recommendations.fromUserId,
      fromUsername: users.username,
    })
    .from(recommendations)
    .innerJoin(users, eq(users.id, recommendations.fromUserId))
    .where(
      ownedBy(
        actor,
        recommendations.toUserId,
        and(isNull(recommendations.dismissedAt), isNull(users.deletedAt)) as SQL,
      ),
    )
    .orderBy(desc(recommendations.createdAt));
  return rows;
}

/**
 * DELETE /me/recommendations/:recId (SOC-05) — SOFT-dismiss one inbox row. Scoped to the recipient's OWN
 * row (`to_user_id` = actor via ownedBy) AND still-live (`dismissed_at IS NULL`, so a re-dismiss is a
 * no-op). Returns true iff a row was dismissed. A rec that isn't the actor's (or is already dismissed)
 * yields false → the controller 404s (no cross-inbox oracle).
 */
export async function dismiss(
  actorId: string,
  recId: string,
  exec: Executor = getDb(),
): Promise<boolean> {
  const actor = asActor(actorId);
  const rows = await exec
    .update(recommendations)
    .set({ dismissedAt: new Date() })
    .where(
      ownedBy(
        actor,
        recommendations.toUserId,
        and(eq(recommendations.id, recId), isNull(recommendations.dismissedAt)) as SQL,
      ),
    )
    .returning({ id: recommendations.id });
  return rows.length > 0;
}
