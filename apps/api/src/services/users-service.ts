import { z } from 'zod';
import type {
  ContributionsResponse,
  ContributorCard,
  FriendProfile,
  PublicProfile,
} from '@ingame/shared';
import * as profileRepo from '../repositories/profile-repo';
import * as relationshipRepo from '../repositories/relationship-repo';
import * as suspensionRepo from '../repositories/suspension-repo';
import * as cardRepo from '../repositories/card-repo';
import * as catalogRepo from '../repositories/catalog-repo';
import * as collectionRepo from '../repositories/collection-repo';
import * as profileService from './profile-service';
import { toPublicShape, toFriendShape } from '../serializers/user-shape';
import { NotFoundError } from '../errors/AppError';
import type { TrendingDesignRow } from '../repositories/card-repo';

const uuidSchema = z.string().uuid();
const CONTRIBUTOR_TOP_N = 10;

// GET /users/:id — the FIRST target-id, cross-principal route (G-D). This is where the REAL cross-user
// 4xx / privacy-SHAPE authz test finally becomes writable (SYS-07 was PROVISIONAL until this landed,
// 0052 §4).
//
// NON-DISCLOSURE COLLAPSE (api-contract line 62): a blocked (EITHER direction) / suspended / deleted /
// unknown / malformed-id target ALL resolve to the SAME generic NotFoundError an unknown id returns —
// never revealing which state, nor who blocked whom (MOD-09 / SOC-09 / AUTH-07).
//
// SHAPE (PROF-03): friend (or self) → the full shape; everyone else → the limited shape.
// ASSUMPTION(OQ-117): the 'friends' vs 'public' privacy nuance — whether a `public` profile exposes
// MORE than the limited shape to a non-friend — is not enumerated in the contract's two shapes and is
// deferred; M2 gates on friendship (the conservative reading) and stores/returns `privacy` on the
// friend shape. Reversible, non-STOP.
export async function getUserProfile(
  actorId: string,
  rawTargetId: string,
): Promise<PublicProfile | FriendProfile> {
  const parsed = uuidSchema.safeParse(rawTargetId);
  if (!parsed.success) throw new NotFoundError('User not found.'); // malformed id → same as unknown
  const targetId = parsed.data;

  const target = await profileRepo.getOwnProfile(targetId); // scope-to-owner read of the target row
  if (!target || target.deletedAt) throw new NotFoundError('User not found.'); // unknown / AUTH-07
  if (await relationshipRepo.isBlockedBetween(actorId, targetId)) {
    throw new NotFoundError('User not found.'); // SOC-09 (either direction)
  }
  if (await suspensionRepo.getActiveSuspension(targetId)) {
    throw new NotFoundError('User not found.'); // MOD-09
  }

  const isSelf = actorId === targetId;
  const relationship = isSelf
    ? 'friend'
    : await relationshipRepo.getRelationship(actorId, targetId);
  const mutualFriendsCount = isSelf
    ? 0
    : await relationshipRepo.countMutualFriends(actorId, targetId);

  if (relationship === 'friend') {
    const [gamertags, friendsCount] = await Promise.all([
      profileService.listGamertags(targetId),
      relationshipRepo.countFriends(targetId),
    ]);
    return toFriendShape(target, { relationship, mutualFriendsCount, friendsCount, gamertags });
  }
  return toPublicShape(target, { relationship, mutualFriendsCount });
}

/**
 * GET /users/:id/contributions (CAT-07) — the contributor profile. The SAME non-disclosure collapse as
 * getUserProfile (blocked-either-direction / suspended / deleted / unknown / malformed → the generic
 * NotFound, MOD-09 / SOC-09 / AUTH-07). The honest `stats` block goes LIVE with M5 — `cardsDesigned`
 * (published) and `totalAdoptions` stop honest-zeroing the moment publishes + adoptions exist. Two
 * privacy shapes (PROF-03): friend/self carries the card/game set-pieces; non-friend gets stats +
 * `standing` only. CAT-10 percentile `standing` is threshold-gated (PROF-07) and NULL below the cohort
 * floor — M5 ships it null (the cohort ranking rides M7). VIEW-ALL sub-lists stay contract-only.
 */
export async function getContributions(
  actorId: string,
  rawTargetId: string,
): Promise<ContributionsResponse> {
  const parsed = uuidSchema.safeParse(rawTargetId);
  if (!parsed.success) throw new NotFoundError('User not found.');
  const targetId = parsed.data;

  const target = await profileRepo.getOwnProfile(targetId);
  if (!target || target.deletedAt) throw new NotFoundError('User not found.');
  if (await relationshipRepo.isBlockedBetween(actorId, targetId)) {
    throw new NotFoundError('User not found.'); // SOC-09 (either direction)
  }
  if (await suspensionRepo.getActiveSuspension(targetId)) {
    throw new NotFoundError('User not found.'); // MOD-09
  }

  // ── The honest aggregate stats (always present, both shapes) ──────────────────────────────────────
  const addedGames = await catalogRepo.listGamesAddedBy(targetId);
  const gameIds = addedGames.map((g) => g.id);
  const collectionsCounts = await collectionRepo.collectionsCountByGame(gameIds);
  const totalReached = [...collectionsCounts.values()].reduce((sum, n) => sum + n, 0);
  const [cardsDesigned, totalAdoptions] = await Promise.all([
    cardRepo.countPublishedByOwner(targetId),
    cardRepo.totalAdoptionsForOwner(targetId),
  ]);

  const base = {
    user: {
      id: target.id,
      username: target.username,
      avatarUrl: target.avatarUrl,
      memberSince: target.createdAt.toISOString(),
    },
    stats: { gamesAdded: addedGames.length, cardsDesigned, totalAdoptions, totalReached },
    standing: null,
  } satisfies ContributionsResponse;

  const isSelf = actorId === targetId;
  const isFriend = isSelf || (await relationshipRepo.getRelationship(actorId, targetId)) === 'friend';
  if (!isFriend) return base; // the limited/non-friend shape (PROF-03) — stats + standing only

  // ── Friend/self set-pieces (signatureCard · topCards · topGames) ──────────────────────────────────
  const published = await cardRepo.listPublishedByOwner(targetId);
  const cardCounts = await cardRepo.adoptionCountsByCard(published.map((r) => r.id));
  const rankedCards = published
    .map((r) => ({ row: r, adoptionCount: cardCounts.get(r.id) ?? 0 }))
    .sort((a, b) => b.adoptionCount - a.adoptionCount || a.row.id.localeCompare(b.row.id))
    .slice(0, CONTRIBUTOR_TOP_N)
    .map(({ row, adoptionCount }) => toContributorCard(row, adoptionCount));
  const topGames = addedGames
    .map((g) => ({ gameId: g.id, title: g.name, collectionsCount: collectionsCounts.get(g.id) ?? 0 }))
    .sort((a, b) => b.collectionsCount - a.collectionsCount || a.gameId.localeCompare(b.gameId))
    .slice(0, CONTRIBUTOR_TOP_N);

  return {
    ...base,
    signatureCard: rankedCards[0] ?? null, // the most-adopted published card (CARD-05)
    topCards: rankedCards,
    topGames,
  };
}

function toContributorCard(row: TrendingDesignRow, adoptionCount: number): ContributorCard {
  return {
    cardId: row.id,
    gameId: row.gameId,
    gameTitle: row.gameTitle,
    adoptionCount,
    card: {
      id: row.id,
      name: row.name,
      imageUrl: row.imageUrl,
      thumbUrl: row.thumbUrl,
      isPremium: row.isPremium,
    },
  };
}
