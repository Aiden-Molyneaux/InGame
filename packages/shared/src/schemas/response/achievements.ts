import { z } from 'zod';

// RESPONSE/VIEW schemas + the data-driven CRITERION vocabulary for the ACH engine (M6 P6; api-contract
// §Achievements 0.36 — the three `/achievements*` payloads). Definitions are SYS-04-seeded content
// (decision 0077), NOT user input, so the criterion is a TS discriminated union the engine consumes
// (a loose zod passthrough only where a payload is serialized). Two visibility types (ACH-03): a
// `milestone` (visible, shows progress) and a `secret` easter-egg (hidden `???` until unlocked). The
// presentation `tier` (ACH-09) is a non-functional signal the client themes by.

// ── Tiers + kinds (ACH-03/09) ─────────────────────────────────────────────────────────────────────
export const ACHIEVEMENT_TIERS = ['prestige', 'standard', 'secret'] as const;
export type AchievementTier = (typeof ACHIEVEMENT_TIERS)[number];

export const ACHIEVEMENT_KINDS = ['milestone', 'secret'] as const;
export type AchievementKind = (typeof ACHIEVEMENT_KINDS)[number];

// ── The criterion vocabulary (ACH-01/02/07 — data-driven, jsonb) ────────────────────────────────────
/**
 * A predicate over a single domain event. `payloadEquals` matches string fields in the event payload
 * (e.g. `{ status: 'beaten' }`, `{ gameId: '<target>' }` — the ACH-07 entity-target mechanism);
 * `occurredAtHourIn` matches the UTC hour of `occurred_at` (the F44 server-hour = UTC, no per-user tz).
 * Evaluable BOTH in SQL (for the count kinds) and in JS (for the one-shot match on the trigger event).
 */
export interface EventPredicate {
  payloadEquals?: Record<string, string>;
  occurredAtHourIn?: number[];
}

/** What a distinct-count criterion counts DISTINCT values of. `entity` = the event's `entity_id`;
 *  `card_game`/`card_designer` resolve the value from `card_designs` (game_id / owner_id) joined on
 *  the event's card entity_id (the private-save event carries no gameId, so the join is authoritative). */
export type DistinctBy = 'entity' | 'card_game' | 'card_designer';

/**
 * The 8 criterion kinds P6 supports. A NEW DEFINITION using an existing kind is a pure seed edit (ACH-01
 * — no app release); a genuinely novel trigger SHAPE needs a new kind here (engine code). The count kinds
 * carry a `unit` (progress presentation) + `threshold` and self-heal by counting `domain_events` history
 * on the NEXT event (count-from-genesis); the match/dual kinds are one-shot on their trigger event.
 */
export type AchievementCriterion =
  // Count events of `events[]` by the ACTOR (optional payload predicate). Self-healing counter.
  | { kind: 'event_count'; events: string[]; threshold: number; unit: string; where?: EventPredicate }
  // Count DISTINCT `distinctBy` over `events[]` by the ACTOR. Self-healing counter.
  | {
      kind: 'event_count_distinct';
      events: string[];
      distinctBy: DistinctBy;
      threshold: number;
      unit: string;
      where?: EventPredicate;
    }
  // A one-shot: a single event of `event` whose payload/time matches `where` unlocks (no progress bar).
  | { kind: 'event_match'; event: string; where: EventPredicate }
  // Count events of `event` by the ACTOR within one UTC-day window (self-healing, day-scoped).
  | { kind: 'window_count'; event: string; window: 'utc_day'; threshold: number; unit: string; where?: EventPredicate }
  // friend.added credits BOTH parties (registry dual-credit payload); progress = the user's friendships.
  | { kind: 'participant_count'; event: 'friend.added'; threshold: number; unit: string }
  // card.adopted credits the DESIGNER (resolved from the card); progress = adoptions across their designs.
  | { kind: 'received_count'; event: 'card.adopted'; creditVia: 'card_designer'; threshold: number; unit: string }
  // entry_added credits the GAME'S CREATOR; progress = distinct collections holding that game (A15).
  | {
      kind: 'aggregate_reach';
      event: 'collection.entry_added';
      creditVia: 'game_creator';
      countVia: 'game_collections';
      threshold: number;
      unit: string;
    }
  // entry_added by X, when X was recommended that game, credits the RECOMMENDER (B8 two-actor, one-shot).
  | { kind: 'dual_actor'; event: 'collection.entry_added'; link: 'recommendation'; creditVia: 'recommender' };

/** A loose passthrough for serializing the criterion on the GET /achievements def view (it is exposed
 *  for the visible/milestone defs; masked secrets never carry it). Not a validation gate — content is
 *  trusted seed data, typed by `AchievementCriterion` at the engine + seed boundary. */
export const achievementCriterionSchema = z.record(z.unknown());

// ── Rewards (ACH-04) ────────────────────────────────────────────────────────────────────────────────
/** A badge always (default); optionally PX (via the `milestone` ledger reason) and/or an earn-only
 *  cosmetic entitlement (`source:'earned'`, never store-purchasable). A14's cosmetic slot ships EMPTY
 *  (the field simply absent — the engine no-ops a missing cosmetic gracefully). */
export interface AchievementReward {
  badge: true;
  pixels?: number;
  cosmetic?: { assetId: string; earnOnly: true };
}

// ── The definition view (GET /achievements; the …def spread on /me/achievements arrays) ──────────────
export interface AchievementDef {
  id: string;
  key: string;
  name: string;
  description: string;
  criterion: AchievementCriterion;
  tier: AchievementTier;
  kind: AchievementKind;
  reward: AchievementReward;
}

/** A `secret`-kind def the caller HASN'T unlocked → masked to the `???` mystery slot (OQ-005 pole A):
 *  id + the secret markers ONLY — no name/description/criterion/reward leaks. */
export interface MaskedSecretDef {
  id: string;
  kind: 'secret';
  tier: 'secret';
  locked: true;
}

export type AchievementDefView = AchievementDef | MaskedSecretDef;

// ── GET /me/achievements (ACH-02/03/05) ─────────────────────────────────────────────────────────────
export interface EarnedAchievement extends AchievementDef {
  unlockedAt: string; // ISO-8601 UTC
}
export interface AchievementProgress {
  current: number;
  target: number;
  unit: string;
}
export interface InProgressAchievement extends AchievementDef {
  progress: AchievementProgress;
}
export interface MeAchievementsResponse {
  summary: { earned: number; inProgress: number; secretsFound: number; secretsTotal: number };
  /** Earned MILESTONE (non-secret) defs, newest-unlock-first. */
  earned: EarnedAchievement[];
  /** In-progress MILESTONE defs (COUNT criteria only — match/dual criteria have no bar, omitted). */
  inProgress: InProgressAchievement[];
  /** Secrets: the unlocked ones REVEALED (full def + unlockedAt); still-locked ones only as a count. */
  secrets: { found: EarnedAchievement[]; lockedCount: number };
}

// ── GET /users/:id/achievements (ACH-05, earned-only, privacy-honored) ───────────────────────────────
/** A showcased earned MILESTONE (standard/prestige) achievement on a friend's profile — earned-only, NO
 *  in-progress, NO secret-existence leak. The contract draws `glyph`; we carry `key` (the client maps
 *  key→glyph) — flagged as contract drift. A SECRET-tier earned achievement is NOT shaped like this — it
 *  is masked (see `MaskedShowcaseAchievement`). */
export interface ShowcaseAchievement {
  id: string;
  key: string;
  name: string;
  tier: AchievementTier;
  unlockedAt: string;
}
/**
 * A friend's earned SECRET-tier achievement, MASKED on the showcase (OQ-148 widening, decision 0078 —
 * "you should not be able to figure out secret achievements by looking at friends' pages"). It COUNTS
 * toward `summary.earned` but never reveals WHICH egg it is: no name/description/tier-differentiator/glyph
 * — the SAME sealed `{ id, kind:'secret', tier:'secret', locked:true }` shape the GET /achievements
 * definitions-mask + the SOC-06 feed-mask use (`tier` is the constant 'secret', not a per-egg reveal).
 * `unlockedAt` is a non-identifying timestamp that keeps the `earned` list uniform/sortable.
 */
export interface MaskedShowcaseAchievement {
  id: string;
  kind: 'secret';
  tier: 'secret';
  locked: true;
  unlockedAt: string;
}
/** One row of a showcase `earned` list: a named milestone/prestige, or a MASKED secret (OQ-148). */
export type ShowcaseEntry = ShowcaseAchievement | MaskedShowcaseAchievement;
export type UserAchievementsResponse =
  | { summary: { earned: number }; earned: ShowcaseEntry[] } // friend / self — full earned list (secrets masked)
  | { summary: { earned: number }; locked: true }; // non-friend / hidden — honest headline count only
