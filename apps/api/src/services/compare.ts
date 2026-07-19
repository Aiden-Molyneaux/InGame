import type {
  AvatarConfig,
  CompareGame,
  CompareLeader,
  CompareLeaderboardRow,
  CompareResponse,
  CompareTotals,
  FriendCollectionCard,
} from '@ingame/shared';

// SOC-03 — the PURE compare-face-off builder (the omission engine). The service gathers the raw
// collection data (both shelves + the friend-cohort ranking); THIS function computes the leaders and
// applies the PROF-03 omission EXACTLY as drawn (api-contract 0.25). Kept pure + total so the four
// privacy postures are unit-tested directly (no DB) — the F06 field-diff surface for compare.

/** The face-off leader between two values (used by both totals and per-game). */
export function leaderOf(yours: number, theirs: number): CompareLeader {
  if (yours > theirs) return 'you';
  if (yours < theirs) return 'them';
  return 'tie';
}

/** What the friend exposes to the actor (PROF-03). At M6 both are always true for a friend (no per-facet
 *  toggle in the data model — OQ-117); this is the seam a future per-facet privacy setting wires into. */
export interface CompareVisibility {
  hoursVisible: boolean;
  collectionVisible: boolean;
}

/** One shared-set game before omission — both cards + both hours. */
export interface CompareGameInput {
  gameId: string;
  title: string;
  yourCard: FriendCollectionCard;
  theirCard: FriendCollectionCard;
  yourHours: number;
  theirHours: number;
}

/** One friend-cohort member before ranking — pre-sorted by the caller; `rank`/`isMe` applied here. */
export interface CompareCohortMember {
  userId: string;
  username: string;
  avatarUrl: string | null;
  /** PROF-08 (W-4) — the leaderboard row's forged monogram; null ⇒ the default. */
  avatarConfig: AvatarConfig | null;
  hours: number;
  games: number;
  isMe: boolean;
}

export interface CompareInput {
  friend: { userId: string; username: string; avatarUrl: string | null; avatarConfig: AvatarConfig | null };
  yourHours: number;
  yourGames: number;
  theirHours: number;
  theirGames: number;
  games: CompareGameInput[];
  /** The friend cohort ALREADY RANKED (hours desc, then a stable tiebreak) — rank is the array index+1. */
  cohort: CompareCohortMember[];
}

/**
 * Assemble the compare payload, applying the PROF-03 omission (api-contract 0.25):
 *  • hoursVisible=false      → every `theirHours` (games + totals) + `totals.leader` + `leaderboard` OMITTED
 *                              (the games axis still compares: cards + your own hours survive).
 *  • collectionVisible=false → `games` (the shared set) + `totals.theirGames` OMITTED (your totals survive).
 * `yourHours`/`yourGames` are ALWAYS present (your own data). Keys are OMITTED (absent), never nulled —
 * an omitted axis must not appear as a zero.
 */
export function buildCompare(input: CompareInput, vis: CompareVisibility): CompareResponse {
  const totals: CompareTotals = { yourHours: input.yourHours, yourGames: input.yourGames };
  if (vis.hoursVisible) {
    totals.theirHours = input.theirHours;
    totals.leader = leaderOf(input.yourHours, input.theirHours);
  }
  if (vis.collectionVisible) {
    totals.theirGames = input.theirGames;
  }

  const res: CompareResponse = { friend: input.friend, totals };

  // The shared-set matchups — omitted entirely when the friend hides their collection.
  if (vis.collectionVisible) {
    res.games = input.games.map((g): CompareGame => {
      const game: CompareGame = {
        gameId: g.gameId,
        title: g.title,
        yourCard: g.yourCard,
        theirCard: g.theirCard,
        yourHours: g.yourHours,
        // The per-game hours leader collapses to a tie when hours are hidden (theirHours omitted).
        leader: vis.hoursVisible ? leaderOf(g.yourHours, g.theirHours) : 'tie',
      };
      if (vis.hoursVisible) game.theirHours = g.theirHours;
      return game;
    });
  }

  // The friend-cohort leaderboard — omitted when the friend hides hours (it is a hours ranking).
  if (vis.hoursVisible) {
    res.leaderboard = input.cohort.map(
      (m, i): CompareLeaderboardRow => ({
        rank: i + 1,
        user: { userId: m.userId, username: m.username, avatarUrl: m.avatarUrl, avatarConfig: m.avatarConfig },
        hours: m.hours,
        games: m.games,
        isMe: m.isMe,
      }),
    );
  }

  return res;
}
