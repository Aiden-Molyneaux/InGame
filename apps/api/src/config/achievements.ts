import type {
  AchievementCriterion,
  AchievementKind,
  AchievementReward,
  AchievementTier,
} from '@ingame/shared';
import * as achievementRepo from '../repositories/achievement-repo';

// P6c — the ACH starter content (decision 0077: 12 milestones + 6 eggs). A SYS-04-style CONFIG (mirrors
// config/economy.ts + config/cosmetics.ts): the definitions are DATA, landed into `achievement_definitions`
// by the idempotent `seedAchievementDefinitions` (called from db:seed-dev + a future prod seed), NOT by
// migration (content ≠ schema). A new egg = an edit here + a re-seed (ACH-01 — no app release; the
// beta egg-recommendation loop, 0077 ruling 4). PX values are exactly as sheeted (0077 ruling 1);
// prestige keys ONLY off non-self-inflatable signals (§5.15) — others' adoptions/contributions/reach.
//
// NB on the friend-added signal: the sheet writes `social.friend_added`; the REGISTERED event is
// `friend.added` — the participant_count kind is bound to it and credits BOTH parties (the registry
// dual-credit payload).

export interface StarterDefinition {
  key: string;
  name: string;
  description: string;
  criterion: AchievementCriterion;
  tier: AchievementTier;
  kind: AchievementKind;
  reward: AchievementReward;
  /** SYS-04 kill/tune flag; defaults true. B7 defaults inactive until its entity-target is configured. */
  active?: boolean;
}

// The B7 entity-target when the owner hasn't picked a game (0077 §2: the PRODUCTION target is picked at
// beta deploy against the live community catalog). A sentinel that matches no real game → the egg is
// seeded INACTIVE until a target is supplied (dev-seed points it at a seed game; prod at the P16 sitting).
const B7_UNSET_TARGET = '00000000-0000-0000-0000-000000000000';

/**
 * The 18 starter definitions. `b7TargetGameId` fills the B7 STRAWBERRY HUNTER entity-target (ACH-07
 * demonstration egg); when omitted, B7 is seeded INACTIVE with the sentinel target (dormant until the
 * owner configures it — the one §0.4 blank, 0077 §2).
 */
export function buildStarterAchievements(b7TargetGameId?: string): StarterDefinition[] {
  const badge = { badge: true } as const;
  return [
    // ── Milestones (visible, progress-showing · ACH-03) ──────────────────────────────────────────────
    {
      key: 'a1_first_print',
      name: 'First Print',
      description: 'Publish your first card.',
      criterion: { kind: 'event_count', events: ['card.published'], threshold: 1, unit: 'cards' },
      tier: 'standard',
      kind: 'milestone',
      reward: { ...badge, pixels: 2 },
    },
    {
      key: 'a2_press_operator',
      name: 'Press Operator',
      description: 'Publish 5 cards.',
      criterion: { kind: 'event_count', events: ['card.published'], threshold: 5, unit: 'cards' },
      tier: 'standard',
      kind: 'milestone',
      reward: { ...badge, pixels: 3 },
    },
    {
      key: 'a3_shelf_starter',
      name: 'Shelf Starter',
      description: 'Add 5 games to your collection.',
      criterion: { kind: 'event_count', events: ['collection.entry_added'], threshold: 5, unit: 'games' },
      tier: 'standard',
      kind: 'milestone',
      reward: { ...badge, pixels: 2 },
    },
    {
      key: 'a5_player_two',
      name: 'Player Two',
      description: 'Make your first friend.',
      criterion: { kind: 'participant_count', event: 'friend.added', threshold: 1, unit: 'friends' },
      tier: 'standard',
      kind: 'milestone',
      reward: { ...badge, pixels: 2 },
    },
    {
      key: 'a6_full_lobby',
      name: 'Full Lobby',
      description: 'Reach 5 friends.',
      criterion: { kind: 'participant_count', event: 'friend.added', threshold: 5, unit: 'friends' },
      tier: 'standard',
      kind: 'milestone',
      reward: { ...badge, pixels: 3 },
    },
    {
      key: 'a7_good_taste',
      name: 'Good Taste',
      description: 'Adopt your first card.',
      criterion: { kind: 'event_count', events: ['card.adopted'], threshold: 1, unit: 'cards' },
      tier: 'standard',
      kind: 'milestone',
      reward: { ...badge, pixels: 1 },
    },
    {
      key: 'a9_contributor',
      name: 'Contributor',
      description: 'Add a game to the catalog.',
      criterion: { kind: 'event_count', events: ['catalog.game_created'], threshold: 1, unit: 'games' },
      tier: 'standard',
      kind: 'milestone',
      reward: { ...badge, pixels: 2 },
    },
    {
      key: 'a10_ladder_graduate',
      name: 'Ladder Graduate',
      description: 'Claim the daily bonus 7 times.',
      // Badge-only — the Newcomer Ladder already pays PX (avoids double-paying, 0077 sheet A10).
      criterion: { kind: 'event_count', events: ['wallet.daily_claimed'], threshold: 7, unit: 'claims' },
      tier: 'standard',
      kind: 'milestone',
      reward: { ...badge },
    },
    {
      key: 'a12_beaten_path',
      name: 'Beaten Path',
      description: 'Mark 10 games as beaten.',
      // Self-reported (§5.15) → badge-only, never PX/prestige. DISTINCT entries (not raw events) so a
      // mark→unmark→re-mark cycle can't farm it.
      criterion: {
        kind: 'event_count_distinct',
        events: ['collection.entry_updated'],
        distinctBy: 'entity',
        threshold: 10,
        unit: 'games',
        where: { payloadEquals: { status: 'beaten' } },
      },
      tier: 'standard',
      kind: 'milestone',
      reward: { ...badge },
    },
    {
      key: 'a13_first_adoption',
      name: 'First Adoption',
      description: 'Someone adopts one of your cards.',
      // PRESTIGE — keys off OTHERS' adoptions of YOUR designs (can't self-inflate; card.adopted is a
      // DIFFERENT user by definition). ECON-05's milestone half lands here.
      criterion: { kind: 'received_count', event: 'card.adopted', creditVia: 'card_designer', threshold: 1, unit: 'adoptions' },
      tier: 'prestige',
      kind: 'milestone',
      reward: { ...badge, pixels: 5 },
    },
    {
      key: 'a14_house_style',
      name: 'House Style',
      description: 'Your designs are adopted 10 times.',
      // PRESTIGE — the flex. Cosmetic slot ships EMPTY (0077 ruling 3 — the exclusive art arrives with the
      // 0075 pre-launch content pass; the slot is wired, the grant no-ops until then).
      criterion: { kind: 'received_count', event: 'card.adopted', creditVia: 'card_designer', threshold: 10, unit: 'adoptions' },
      tier: 'prestige',
      kind: 'milestone',
      reward: { ...badge, pixels: 10 },
    },
    {
      key: 'a15_cornerstone',
      name: 'Cornerstone',
      description: 'A game you added reaches 10 collections.',
      // PRESTIGE — contributor reach (OTHERS' adds of your contributed game); can't self-inflate.
      criterion: {
        kind: 'aggregate_reach',
        event: 'collection.entry_added',
        creditVia: 'game_creator',
        countVia: 'game_collections',
        threshold: 10,
        unit: 'collections',
      },
      tier: 'prestige',
      kind: 'milestone',
      reward: { ...badge, pixels: 5 },
    },
    // ── Easter eggs (hidden `???` until unlocked · secret tier, magenta · ACH-03/09) ─────────────────
    {
      key: 'b1_neat_freak',
      name: 'Neat Freak',
      description: 'Reorder your collection 10 times.',
      criterion: { kind: 'event_count', events: ['collection.reordered'], threshold: 10, unit: 'reorders' },
      tier: 'secret',
      kind: 'secret',
      reward: { ...badge, pixels: 2 },
    },
    {
      key: 'b3_renaissance',
      name: 'Renaissance',
      description: 'Design cards across 5 different games.',
      // DISTINCT designed GAMES resolved from the card (a private save carries no gameId — the card→game
      // join is authoritative).
      criterion: {
        kind: 'event_count_distinct',
        events: ['card.saved_private', 'card.published'],
        distinctBy: 'card_game',
        threshold: 5,
        unit: 'games',
      },
      tier: 'secret',
      kind: 'secret',
      reward: { ...badge, pixels: 3 },
    },
    {
      key: 'b4_patron_of_the_arts',
      name: 'Patron of the Arts',
      description: 'Adopt cards from 5 different designers.',
      criterion: {
        kind: 'event_count_distinct',
        events: ['card.adopted'],
        distinctBy: 'card_designer',
        threshold: 5,
        unit: 'designers',
      },
      tier: 'secret',
      kind: 'secret',
      reward: { ...badge, pixels: 3 },
    },
    {
      key: 'b6_night_shift',
      name: 'Night Shift',
      description: 'Claim the daily bonus in the small hours.',
      // The 03:00–05:00 UTC window (F44 server-hour = UTC): hours 3 and 4 (03:00:00–04:59:59). Tunable.
      criterion: { kind: 'event_match', event: 'wallet.daily_claimed', where: { occurredAtHourIn: [3, 4] } },
      tier: 'secret',
      kind: 'secret',
      reward: { ...badge, pixels: 1 },
    },
    {
      key: 'b7_strawberry_hunter',
      name: 'Strawberry Hunter',
      description: 'Add a certain game to your collection.',
      // The ACH-07 entity-target DEMO egg. Target = a config gameId (0077 §2 — dev-seed points it at a
      // seed game; the PRODUCTION target is owner-picked at the P16 sitting). Seeded INACTIVE until set.
      criterion: {
        kind: 'event_match',
        event: 'collection.entry_added',
        where: { payloadEquals: { gameId: b7TargetGameId ?? B7_UNSET_TARGET } },
      },
      tier: 'secret',
      kind: 'secret',
      reward: { ...badge, pixels: 2 },
      active: b7TargetGameId !== undefined,
    },
    {
      key: 'b8_the_regifter',
      name: 'The Regifter',
      description: 'A friend adds a game you recommended.',
      // Two-actor: credits the RECOMMENDER when the recipient later adds the recommended game.
      criterion: { kind: 'dual_actor', event: 'collection.entry_added', link: 'recommendation', creditVia: 'recommender' },
      tier: 'secret',
      kind: 'secret',
      reward: { ...badge, pixels: 3 },
    },
  ];
}

/**
 * Idempotent seed of the starter definitions into `achievement_definitions` (upsert on `key` — a re-run
 * re-applies any tuned name/criterion/reward, SYS-04). Emits NO domain events → seeding NEVER fires an
 * unlock (a test asserts it). `b7TargetGameId` configures the ACH-07 egg (see buildStarterAchievements).
 */
export async function seedAchievementDefinitions(b7TargetGameId?: string): Promise<number> {
  const defs = buildStarterAchievements(b7TargetGameId);
  for (const def of defs) {
    await achievementRepo.upsertDefinition({
      key: def.key,
      name: def.name,
      description: def.description,
      criterion: def.criterion as unknown as Record<string, unknown>,
      tier: def.tier,
      kind: def.kind,
      reward: def.reward as unknown as Record<string, unknown>,
      active: def.active ?? true,
    });
  }
  return defs.length;
}
