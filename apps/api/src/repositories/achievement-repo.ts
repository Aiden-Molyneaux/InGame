import { count, countDistinct, desc, eq, inArray } from 'drizzle-orm';
import { getDb, type Executor } from '../db/client';
import { asActor, ownedBy } from '../db/scoped';
import {
  achievementDefinitions,
  cardDesigns,
  domainEvents,
  userAchievements,
  type AchievementDefinitionRow,
  type UserAchievementRow,
} from '../db/schema';
import type { EventPredicate } from '@ingame/shared';

// Achievement repository (M6 P6). Two tables:
//   - `achievement_definitions` — GLOBAL content (on the F32 manifest) → lint-free reads.
//   - `user_achievements` — USER-OWNED (owner key = user_id) → every read/insert is actor-scoped.
// Plus the ENGINE's counting reads over `domain_events` (the ACH-08 spine). Those count a CREDITED
// user's progress; where the credited user IS the event actor the read is actor-scoped via `ownedBy`;
// the join-based distinct counts (card_game / card_designer) scope `domain_events` by the actor and
// ride the same window's scope-signal (the loose rule-02 window check — actor-id correctness is on the
// engine + the SYS-07/F36 tests). No new SYS-01 read class is introduced (0076 §0.1 was the M6 class).

// ── achievement_definitions (GLOBAL) ────────────────────────────────────────────────────────────────
/** All ACTIVE definitions (the engine + the GET /achievements read consume this). */
export async function listActiveDefinitions(
  exec: Executor = getDb(),
): Promise<AchievementDefinitionRow[]> {
  return exec
    .select()
    .from(achievementDefinitions)
    .where(eq(achievementDefinitions.active, true))
    .orderBy(achievementDefinitions.createdAt);
}

/** Idempotent content upsert (the P6c seed / the beta egg-recommendation loop — a new egg is a seed
 *  edit, ACH-01). Keyed on the unique `key`; re-running with the same content is a no-op, and a tweak
 *  (name/criterion/reward/tier/active) is re-applied (SYS-04-tunable). */
export async function upsertDefinition(
  def: {
    key: string;
    name: string;
    description: string;
    criterion: Record<string, unknown>;
    tier: string;
    kind: string;
    reward: Record<string, unknown>;
    active?: boolean;
  },
  exec: Executor = getDb(),
): Promise<void> {
  await exec
    .insert(achievementDefinitions)
    .values({
      key: def.key,
      name: def.name,
      description: def.description,
      criterion: def.criterion,
      tier: def.tier,
      kind: def.kind,
      reward: def.reward,
      active: def.active ?? true,
    })
    .onConflictDoUpdate({
      target: achievementDefinitions.key,
      set: {
        name: def.name,
        description: def.description,
        criterion: def.criterion,
        tier: def.tier,
        kind: def.kind,
        reward: def.reward,
        active: def.active ?? true,
      },
    });
}

// ── user_achievements (USER-OWNED — actor-scoped) ─────────────────────────────────────────────────────
/** The set of achievementIds the user has already unlocked (the mask/earned/unmask reads + the engine's
 *  already-unlocked short-circuit). Actor-scoped (SYS-01). */
export async function unlockedAchievementIds(
  userId: string,
  exec: Executor = getDb(),
): Promise<Set<string>> {
  const actor = asActor(userId);
  const rows = await exec
    .select({ achievementId: userAchievements.achievementId })
    .from(userAchievements)
    .where(ownedBy(actor, userAchievements.userId));
  return new Set(rows.map((r) => r.achievementId));
}

/** The user's unlock rows (achievementId + unlockedAt + snapshot), newest-first (GET /me · /users/:id).
 *  Actor-scoped — the caller resolves the friend-gate BEFORE reading a TARGET's rows (users-service
 *  precedent: gate in the service, then read scoped-to-target). */
export async function listUnlocks(
  userId: string,
  exec: Executor = getDb(),
): Promise<UserAchievementRow[]> {
  const actor = asActor(userId);
  return exec
    .select()
    .from(userAchievements)
    .where(ownedBy(actor, userAchievements.userId))
    .orderBy(desc(userAchievements.unlockedAt));
}

/** The count of the user's unlocks whose definition id is in `achievementIds` (the honest headline
 *  `summary.earned` count for the non-friend showcase — no rows, just the number). Actor-scoped. */
export async function countUnlocksAmong(
  userId: string,
  achievementIds: string[],
  exec: Executor = getDb(),
): Promise<number> {
  if (achievementIds.length === 0) return 0;
  const actor = asActor(userId);
  const rows = await exec
    .select({ n: count() })
    .from(userAchievements)
    .where(ownedBy(actor, userAchievements.userId, inArray(userAchievements.achievementId, achievementIds)));
  return Number(rows[0]?.n ?? 0);
}

/**
 * The ACH-02 idempotent unlock insert: actor-stamped bare insert with `ON CONFLICT DO NOTHING` on the
 * unique (user, achievement) pair. Returns the row ONLY when THIS call created it (empty on conflict) —
 * so the caller grants the reward in the SAME tx ONLY on a real unlock (F36: parallel crosses → one row,
 * one reward). A bare insert is rule-02-exempt (a brand-new actor-owned row is not an IDOR vector).
 */
export async function insertUnlock(
  exec: Executor,
  userId: string,
  achievementId: string,
  progressSnapshot: Record<string, unknown> | null,
): Promise<UserAchievementRow | null> {
  const actor = asActor(userId);
  const rows = await exec
    .insert(userAchievements)
    .values({ userId: actor.actorId, achievementId, progressSnapshot })
    .onConflictDoNothing({
      target: [userAchievements.userId, userAchievements.achievementId],
    })
    .returning();
  return rows[0] ?? null;
}

// ── domain_events counting (the ENGINE's self-healing counters) ──────────────────────────────────────
// NB: the rule-02 lint bans raw `sql``` in repository files (unclassifiable → fails closed), and drizzle
// has no query-builder operator for a jsonb `payload->>'field'` match or a UTC-hour/day extract. So the
// PREDICATE / HOUR / DAY filters run in JS after an actor-scoped fetch (a `count()`/`countDistinct()`
// covers the no-predicate defs, which is most of them). Bounded by one user's own event history — the
// beta-scale posture (a SQL-side predicate is a future optimization gated on lifting the repo raw-SQL
// ban; not needed at cohort ≤20).

/** Does a fetched event row satisfy the EventPredicate? (payload string-equality + UTC-hour). */
export function matchesPredicate(
  payload: Record<string, unknown>,
  occurredAt: Date,
  where: EventPredicate | undefined,
): boolean {
  if (!where) return true;
  for (const [k, v] of Object.entries(where.payloadEquals ?? {})) {
    if (payload[k] === undefined || payload[k] === null || String(payload[k]) !== v) return false;
  }
  if (where.occurredAtHourIn && where.occurredAtHourIn.length > 0) {
    if (!where.occurredAtHourIn.includes(occurredAt.getUTCHours())) return false;
  }
  return true;
}

interface RawEventRow {
  entityId: string;
  payload: Record<string, unknown>;
  occurredAt: Date;
}

/** The actor's own events of `events[]` (entityId + payload + occurredAt), for JS-side count/filter.
 *  Actor-scoped (SYS-01) — the credited user IS the event actor for the count kinds that use this. */
async function actorEventRows(
  userId: string,
  events: string[],
  exec: Executor,
): Promise<RawEventRow[]> {
  const actor = asActor(userId);
  const rows = await exec
    .select({
      entityId: domainEvents.entityId,
      payload: domainEvents.payload,
      occurredAt: domainEvents.occurredAt,
    })
    .from(domainEvents)
    .where(ownedBy(actor, domainEvents.actorId, inArray(domainEvents.eventType, events)));
  return rows.map((r) => ({ ...r, payload: (r.payload ?? {}) as Record<string, unknown> }));
}

/** Count the actor's events of `events[]` matching `where` (event_count / window filtering in JS). */
export async function countActorEvents(
  userId: string,
  events: string[],
  where: EventPredicate | undefined,
  exec: Executor = getDb(),
): Promise<number> {
  if (!where) {
    const actor = asActor(userId);
    const rows = await exec
      .select({ n: count() })
      .from(domainEvents)
      .where(ownedBy(actor, domainEvents.actorId, inArray(domainEvents.eventType, events)));
    return Number(rows[0]?.n ?? 0);
  }
  const rows = await actorEventRows(userId, events, exec);
  return rows.filter((r) => matchesPredicate(r.payload, r.occurredAt, where)).length;
}

/** Count DISTINCT `entity_id` over the actor's events of `events[]` matching `where`. Actor-scoped. */
export async function countActorDistinctEntities(
  userId: string,
  events: string[],
  where: EventPredicate | undefined,
  exec: Executor = getDb(),
): Promise<number> {
  if (!where) {
    const actor = asActor(userId);
    const rows = await exec
      .select({ n: countDistinct(domainEvents.entityId) })
      .from(domainEvents)
      .where(ownedBy(actor, domainEvents.actorId, inArray(domainEvents.eventType, events)));
    return Number(rows[0]?.n ?? 0);
  }
  const rows = await actorEventRows(userId, events, exec);
  const distinct = new Set(
    rows.filter((r) => matchesPredicate(r.payload, r.occurredAt, where)).map((r) => r.entityId),
  );
  return distinct.size;
}

/** Count DISTINCT card_designs.`field` (game_id / owner_id) over the actor's card events, joining
 *  `card_designs` on the event's card entity_id. The domain_events read is actor-scoped (`ownedBy`);
 *  the card_designs join rides that in-window scope signal (rule-02 loose window — the actor-id
 *  correctness is on the engine + the F36/SYS-07 tests). Used by B3 (distinct designed GAMES — the
 *  private-save event carries no gameId, so the join is authoritative) + B4 (distinct DESIGNERS
 *  adopted-from — the adopted card's owner is the designer). */
export async function countActorDistinctCardField(
  userId: string,
  events: string[],
  field: 'game_id' | 'owner_id',
  exec: Executor = getDb(),
): Promise<number> {
  const actor = asActor(userId);
  const col = field === 'game_id' ? cardDesigns.gameId : cardDesigns.ownerId;
  const rows = await exec
    .select({ n: countDistinct(col) })
    .from(domainEvents)
    .innerJoin(cardDesigns, eq(cardDesigns.id, domainEvents.entityId))
    .where(ownedBy(actor, domainEvents.actorId, inArray(domainEvents.eventType, events)));
  return Number(rows[0]?.n ?? 0);
}

/** Count the actor's events of `event` matching `where` within the given UTC-day (window_count kind). */
export async function countActorEventsInUtcDay(
  userId: string,
  event: string,
  utcDayKey: string,
  where: EventPredicate | undefined,
  exec: Executor = getDb(),
): Promise<number> {
  const rows = await actorEventRows(userId, [event], exec);
  return rows.filter(
    (r) =>
      r.occurredAt.toISOString().slice(0, 10) === utcDayKey && matchesPredicate(r.payload, r.occurredAt, where),
  ).length;
}
