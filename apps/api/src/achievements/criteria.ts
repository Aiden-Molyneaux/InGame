import type { AchievementCriterion } from '@ingame/shared';
import type { EmittedEvent } from '../events/post-commit';
import * as achievementRepo from '../repositories/achievement-repo';
import * as cardRepo from '../repositories/card-repo';
import * as catalogRepo from '../repositories/catalog-repo';
import * as collectionRepo from '../repositories/collection-repo';
import * as relationshipRepo from '../repositories/relationship-repo';
import * as recommendationRepo from '../repositories/recommendation-repo';

// The data-driven criterion evaluator (M6 P6, ACH-02/07). Given a definition's `criterion` and a
// triggering event, it answers: which USERS does this event unlock the definition for? Two families:
//   - COUNT kinds — recompute the credited user's total from `domain_events` HISTORY (count-from-genesis,
//     self-healing) + compare to the threshold. A read-time `computeProgress` shares the SAME counters so
//     the GET /me/achievements progress bar and the unlock decision never diverge.
//   - ONE-SHOT kinds (event_match, dual_actor) — evaluated against the trigger event itself; no bar.
// The CREDITED user is resolved from the event (actor, both friend parties, the card's designer, the
// game's creator, or the recommender) — the §5.15 non-self-inflatable prestige rule is encoded by WHICH
// signal a prestige def keys off (others' adoptions/contributions/friendships), not by the engine.

/** The event types a criterion listens to (the engine pre-filters defs by the emitted event's type). */
export function triggerEventsOf(criterion: AchievementCriterion): string[] {
  switch (criterion.kind) {
    case 'event_count':
    case 'event_count_distinct':
      return criterion.events;
    case 'event_match':
    case 'window_count':
      return [criterion.event];
    case 'participant_count':
    case 'received_count':
    case 'aggregate_reach':
    case 'dual_actor':
      return [criterion.event];
  }
}

/** The progress target for a COUNT criterion (the threshold); null for the one-shot kinds (no bar). */
export function targetOf(criterion: AchievementCriterion): number | null {
  switch (criterion.kind) {
    case 'event_count':
    case 'event_count_distinct':
    case 'window_count':
    case 'participant_count':
    case 'received_count':
    case 'aggregate_reach':
      return criterion.threshold;
    case 'event_match':
    case 'dual_actor':
      return null;
  }
}

/** The progress unit for a COUNT criterion (presentation); undefined for the one-shot kinds. */
export function unitOf(criterion: AchievementCriterion): string | undefined {
  switch (criterion.kind) {
    case 'event_count':
    case 'event_count_distinct':
    case 'window_count':
    case 'participant_count':
    case 'received_count':
    case 'aggregate_reach':
      return criterion.unit;
    case 'event_match':
    case 'dual_actor':
      return undefined;
  }
}

const utcDayKey = (d: Date): string => d.toISOString().slice(0, 10);

/**
 * A COUNT criterion's CURRENT progress for `userId` — the same counter the unlock decision uses (shared
 * by the GET /me/achievements in-progress bars). `dayKey` scopes a window_count to a specific UTC day
 * (the trigger event's day at unlock time; today's day at read time). Returns 0 for the one-shot kinds
 * (they have no progress and are never in the in-progress list).
 */
export async function computeProgress(
  userId: string,
  criterion: AchievementCriterion,
  dayKey: string = utcDayKey(new Date()),
): Promise<number> {
  switch (criterion.kind) {
    case 'event_count':
      return achievementRepo.countActorEvents(userId, criterion.events, criterion.where);
    case 'event_count_distinct':
      if (criterion.distinctBy === 'entity') {
        return achievementRepo.countActorDistinctEntities(userId, criterion.events, criterion.where);
      }
      return achievementRepo.countActorDistinctCardField(
        userId,
        criterion.events,
        criterion.distinctBy === 'card_game' ? 'game_id' : 'owner_id',
      );
    case 'window_count':
      return achievementRepo.countActorEventsInUtcDay(userId, criterion.event, dayKey, criterion.where);
    case 'participant_count':
      return relationshipRepo.countFriends(userId);
    case 'received_count':
      // Adoptions across the DESIGNER's published cards (CARD-05 clout; ECON-05's milestone half).
      return cardRepo.totalAdoptionsForOwner(userId);
    case 'aggregate_reach': {
      // The MAX collections-count across the user's contributed games (A15 — any one game reaching the
      // threshold unlocks; can't self-inflate — it counts OTHERS' adds).
      const games = await catalogRepo.listGamesAddedBy(userId);
      if (games.length === 0) return 0;
      const counts = await collectionRepo.collectionsCountByGame(games.map((g) => g.id));
      return Math.max(0, ...games.map((g) => counts.get(g.id) ?? 0));
    }
    case 'event_match':
    case 'dual_actor':
      return 0;
  }
}

/** The users this event CREDITS toward the count kinds (before the threshold check). */
async function creditedUsers(event: EmittedEvent, criterion: AchievementCriterion): Promise<string[]> {
  switch (criterion.kind) {
    case 'event_count':
    case 'event_count_distinct':
    case 'window_count':
      return [event.actorId];
    case 'participant_count': {
      // friend.added carries BOTH party ids (the registry dual-credit payload) — credit each.
      const requesterId = event.payload.requesterId;
      const addresseeId = event.payload.addresseeId;
      return [requesterId, addresseeId].filter((x): x is string => typeof x === 'string');
    }
    case 'received_count': {
      // card.adopted → the adopted card's DESIGNER (published-card owner). entityId = the cardId.
      const card = await cardRepo.findPublishedDesignById(event.entityId);
      return card ? [card.designerId] : [];
    }
    case 'aggregate_reach': {
      // entry_added → the added game's CREATOR (games.createdBy). payload carries the gameId.
      const gameId = event.payload.gameId;
      if (typeof gameId !== 'string') return [];
      const games = await catalogRepo.gamesByIds([gameId]);
      return games[0] ? [games[0].createdBy] : [];
    }
    case 'event_match':
    case 'dual_actor':
      return [];
  }
}

/** One user this event unlocks the definition for, with the progress snapshot (null for one-shots). */
export interface UnlockCandidate {
  userId: string;
  snapshot: { current: number; target: number } | null;
}

/**
 * Evaluate a definition's criterion against ONE triggering event → the set of users it unlocks (having
 * MET the criterion). The engine then applies the idempotent unlock (once-per-user) + reward for each.
 * The caller guarantees the event type is one of `triggerEventsOf(criterion)`.
 */
export async function evaluateEvent(
  event: EmittedEvent,
  criterion: AchievementCriterion,
): Promise<UnlockCandidate[]> {
  switch (criterion.kind) {
    case 'event_match': {
      // A one-shot: the trigger event itself must match the payload/time predicate.
      const matched = achievementRepo.matchesPredicate(event.payload, event.occurredAt, criterion.where);
      return matched ? [{ userId: event.actorId, snapshot: null }] : [];
    }
    case 'dual_actor': {
      // B8 — the added game, when it was recommended TO the adder, credits each recommender (one-shot).
      const gameId = event.payload.gameId;
      if (typeof gameId !== 'string') return [];
      const recommenders = await recommendationRepo.recommendersOfGameToRecipient(event.actorId, gameId);
      return recommenders.map((userId) => ({ userId, snapshot: null }));
    }
    default: {
      // A COUNT kind: resolve the credited users, recompute each one's progress, unlock those at/over target.
      const target = targetOf(criterion) ?? Number.POSITIVE_INFINITY;
      const users = await creditedUsers(event, criterion);
      const dayKey = utcDayKey(event.occurredAt);
      const out: UnlockCandidate[] = [];
      for (const userId of users) {
        const current = await computeProgress(userId, criterion, dayKey);
        if (current >= target) out.push({ userId, snapshot: { current, target } });
      }
      return out;
    }
  }
}
