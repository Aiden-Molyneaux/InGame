import { and, desc, eq, inArray, isNull } from 'drizzle-orm';
import { getDb, type Executor } from '../db/client';
import { friendScoped } from './friend-read-repo';
import { domainEvents, friendships, users } from '../db/schema';

// SOC-06 feed source read (M6 P4). The aggregated friend-activity feed is computed at request time from
// the ACH-08 `domain_events` outbox — a USER-OWNED table (NOT on the F32 manifest → rule-02 fails closed).
// The legitimate cross-user read is the FRIEND activity feed: the actor may see the ACTIVITY of their
// ACCEPTED friends. So the read rides the SYS-01-FRIEND-READ class — `friendScoped(actorId,
// domainEvents.actorId)` HARD-REQUIRES the accepted-friendship predicate binding the actor to the event's
// actor. Strip it → every user's events leak (the G-D demonstration; the lint + a field-diff/absence test
// both go RED). Block bidirectionality is FREE by construction: a block severs the friendship (SOC-09), so
// a blocked user has no accepted bond → their events never join. Deleted friends are excluded (isNull
// deletedAt), mirroring listFriendSummaries. The payload is a public activity summary (PROF-03) — the
// serializer (feed-service) allowlists it; no hours/notes/ratings ever cross.

/** One raw friend-activity event row (+ the friend-actor's public summary). */
export interface FriendEventRow {
  id: string;
  eventType: string;
  occurredAt: Date;
  actorId: string;
  actorUsername: string;
  actorAvatarUrl: string | null;
  entityId: string;
  payload: Record<string, unknown>;
}

/**
 * The actor's ACCEPTED friends' events of the given types, newest-first, bounded by `scanCap`. The
 * friendScoped INNER JOIN is the gate (no accepted friendship binding actor↔the event's actor ⇒ no rows).
 * `scanCap` bounds the in-memory aggregation compute (the beta-scale posture — read-time compute, NO
 * materialized feed table at M6; the cohort is ≤20 users so the scan is tiny — see feed-service).
 */
export async function listFriendEvents(
  actorId: string,
  eventTypes: string[],
  scanCap: number,
  exec: Executor = getDb(),
): Promise<FriendEventRow[]> {
  if (eventTypes.length === 0) return [];
  // SYS-01-FRIEND-READ — friendScoped binds actor↔the event's actor (an accepted friend); the joined
  // rows are the friend-visible activity allowlist (public identity + the event's own payload). Strip
  // friendScoped → every user's events leak and the G-D absence/lint tests go RED.
  const rows = await exec
    .select({
      id: domainEvents.id,
      eventType: domainEvents.eventType,
      occurredAt: domainEvents.occurredAt,
      actorId: domainEvents.actorId,
      actorUsername: users.username,
      actorAvatarUrl: users.avatarUrl,
      entityId: domainEvents.entityId,
      payload: domainEvents.payload,
    })
    .from(domainEvents)
    .innerJoin(friendships, friendScoped(actorId, domainEvents.actorId))
    .innerJoin(users, eq(users.id, domainEvents.actorId))
    .where(and(inArray(domainEvents.eventType, eventTypes), isNull(users.deletedAt)))
    .orderBy(desc(domainEvents.occurredAt))
    .limit(scanCap);
  return rows.map((r) => ({ ...r, payload: (r.payload ?? {}) as Record<string, unknown> }));
}
