import { and, desc, eq, inArray, isNull, type SQL } from 'drizzle-orm';
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
 * M6 P5 — the queue-add fromRecId thread (WTP-02). Resolves ONE recommendation row scoped to the
 * ACTOR AS RECIPIENT (`to_user_id` = actor via `ownedBy`) — a `fromRecId` naming someone else's rec
 * (not addressed to this actor) resolves to `null`, same as an unknown id (no cross-inbox oracle).
 * Deliberately NOT gated on `dismissed_at IS NULL` — the rec may already be dismissed by the time the
 * add lands (dismiss and queue-add are independent lifecycles, P5 design); the row is still valid
 * attribution. The queue-add does NOT touch `dismissed_at` (the rec is never auto-dismissed here).
 */
export async function findRecipientRec(
  actorId: string,
  recId: string,
  exec: Executor = getDb(),
): Promise<RecommendationRow | null> {
  const actor = asActor(actorId);
  const rows = await exec
    .select()
    .from(recommendations)
    .where(ownedBy(actor, recommendations.toUserId, eq(recommendations.id, recId)))
    .limit(1);
  return rows[0] ?? null;
}

/** One rec's attribution (WTP-02 `recommendedBy`/`note` thread) + the sender's soft-delete state
 *  (AUTH-07 — the queue-service degrades a deleted sender to the anonymized author shape). */
export interface RecAttribution {
  gameId: string;
  note: string | null;
  fromUserId: string;
  fromUsername: string;
  fromDeletedAt: Date | null;
}

/** Bulk-hydrate GET /me/queue's `recommendedBy`/`note` for a set of `fromRecId`s — SCOPED to the
 *  actor AS RECIPIENT (`to_user_id` = actor via `ownedBy`, SYS-01), the same scope `findRecipientRec`
 *  used at add-time; a `recId` outside that scope simply doesn't hydrate (absent from the returned
 *  map), never a cross-inbox read. */
export async function recommenderInfoByRecIds(
  actorId: string,
  recIds: string[],
  exec: Executor = getDb(),
): Promise<Map<string, RecAttribution>> {
  if (recIds.length === 0) return new Map();
  const actor = asActor(actorId);
  const rows = await exec
    .select({
      id: recommendations.id,
      gameId: recommendations.gameId,
      note: recommendations.note,
      fromUserId: recommendations.fromUserId,
      fromUsername: users.username,
      fromDeletedAt: users.deletedAt,
    })
    .from(recommendations)
    .innerJoin(users, eq(users.id, recommendations.fromUserId))
    .where(ownedBy(actor, recommendations.toUserId, inArray(recommendations.id, recIds)));
  return new Map(rows.map((r) => [r.id, r]));
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
