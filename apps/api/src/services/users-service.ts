import { z } from 'zod';
import type {
  CompareResponse,
  ContributionsCardsPage,
  ContributionsGamesPage,
  ContributionsResponse,
  ContributorCard,
  ContributorGame,
  FriendCollectionCard,
  FriendCollectionItem,
  FriendCollectionResponse,
  FriendProfile,
  GenreView,
  PublicProfile,
} from '@ingame/shared';
import * as profileRepo from '../repositories/profile-repo';
import * as relationshipRepo from '../repositories/relationship-repo';
import * as friendReadRepo from '../repositories/friend-read-repo';
import * as suspensionRepo from '../repositories/suspension-repo';
import * as cardRepo from '../repositories/card-repo';
import * as catalogRepo from '../repositories/catalog-repo';
import * as collectionRepo from '../repositories/collection-repo';
import * as adoptionRepo from '../repositories/adoption-repo';
import * as profileService from './profile-service';
import { toPublicShape, toFriendShape } from '../serializers/user-shape';
import { ForbiddenError, NotFoundError, NotFriendsError } from '../errors/AppError';
import { deriveEquippedLabels } from '../render/equipped-labels';
import {
  buildCompare,
  type CompareCohortMember,
  type CompareGameInput,
  type CompareVisibility,
} from './compare';
import type { FriendCollectionEntryRow } from '../repositories/friend-read-repo';
import type { CardDesignRow } from '../db/schema';
import type { EquippedReadout } from '@ingame/shared';
import type { TrendingDesignRow } from '../repositories/card-repo';

const uuidSchema = z.string().uuid();
const CONTRIBUTOR_TOP_N = 10;
const VIEW_ALL_PAGE = 24; // CAT-07 VIEW-ALL cursor page size

// A cross-user read target that resolves to the generic "unavailable" collapse for a blocked (either
// direction) / suspended / deleted / unknown / malformed-id target — the ONE indistinguishable 404
// (MOD-09 / SOC-09 / AUTH-07 non-disclosure), shared by every P2 friend-view read. Returns the parsed
// target id when the target is a real, visible account (a non-FRIEND is still visible here — the
// friend gate is applied per-endpoint after this).
async function resolveVisibleTarget(actorId: string, rawTargetId: string): Promise<string> {
  const parsed = uuidSchema.safeParse(rawTargetId);
  if (!parsed.success) throw new NotFoundError('User not found.'); // malformed → same as unknown
  const targetId = parsed.data;
  const target = await profileRepo.getOwnProfile(targetId);
  if (!target || target.deletedAt) throw new NotFoundError('User not found.'); // unknown / AUTH-07
  if (await relationshipRepo.isBlockedBetween(actorId, targetId)) {
    throw new NotFoundError('User not found.'); // SOC-09 (either direction)
  }
  if (await suspensionRepo.getActiveSuspension(targetId)) {
    throw new NotFoundError('User not found.'); // MOD-09
  }
  return targetId;
}

async function isFriendOf(actorId: string, targetId: string): Promise<boolean> {
  if (actorId === targetId) return true; // self is always "full"
  return (await relationshipRepo.getRelationship(actorId, targetId)) === 'friend';
}

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

  // SYS-01-FRIEND-READ gate (decision 0076 §0.1): the friend/full shape is served ONLY when the
  // friendScoped predicate (an ACCEPTED friendship) binds actor↔target — enforced at the DB, not by a
  // service `if`. Self is always full. Strip the predicate (in friend-read-repo) → a non-friend leaks
  // the full shape and the G-D field-diff / lint tests both go RED.
  const friendRow = isSelf ? target : await friendReadRepo.friendScopedProfile(actorId, targetId);
  if (friendRow) {
    const [gamertags, friendsCount] = await Promise.all([
      profileService.listGamertags(targetId),
      relationshipRepo.countFriends(targetId),
    ]);
    return toFriendShape(friendRow, { relationship, mutualFriendsCount, friendsCount, gamertags });
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
  // The GAMES ADDED rows carry a representative published-card thumb (parvati board gap, P2 additive).
  const thumbs = await gameThumbMap(targetId);
  const topGames = addedGames
    .map((g): ContributorGame => {
      const row: ContributorGame = { gameId: g.id, title: g.name, collectionsCount: collectionsCounts.get(g.id) ?? 0 };
      const thumb = thumbs.get(g.id);
      if (thumb) row.card = thumb;
      return row;
    })
    .sort((a, b) => b.collectionsCount - a.collectionsCount || a.gameId.localeCompare(b.gameId))
    .slice(0, CONTRIBUTOR_TOP_N);

  return {
    ...base,
    // `bio` is FRIEND/FULL only (absent on the limited shape above) — the parvati board gap, P2 additive.
    user: { ...base.user, bio: target.bio },
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

// ── P2 — GET /users/:id/collection (COL-10/11 · SOC-11) ──────────────────────────────────────────────

const releaseYearOf = (releaseDate: string | null): number | null => {
  if (!releaseDate) return null;
  const year = Number(releaseDate.slice(0, 4));
  return Number.isFinite(year) ? year : null;
};

function genresByGameId(rows: Array<{ gameId: string; id: string; name: string }>): Map<string, GenreView[]> {
  const map = new Map<string, GenreView[]>();
  for (const g of rows) {
    const list = map.get(g.gameId) ?? [];
    list.push({ id: g.id, name: g.name });
    map.set(g.gameId, list);
  }
  return map;
}

const equippedOrUndefined = (labels: Record<string, string> | null | undefined): EquippedReadout | undefined =>
  labels && Object.keys(labels).length > 0 ? (labels as EquippedReadout) : undefined;

/** The FLATTENED friend-view card rider (CARD-07/22) from a friend-collection row — never composition. */
function friendCardFromRow(row: FriendCollectionEntryRow): FriendCollectionCard {
  if (!row.cardId) {
    // The default face — no custom design to attribute or read (the CARD-18 stub shape, flattened).
    return { id: 'default', imageUrl: null, thumbUrl: null, isCustom: false, isPremium: false };
  }
  const card: FriendCollectionCard = {
    id: row.cardId,
    imageUrl: row.cardImageUrl,
    thumbUrl: row.cardThumbUrl,
    isCustom: true,
    isPremium: row.cardIsPremium ?? false,
    name: row.cardName ?? undefined,
    equipped: equippedOrUndefined(row.cardEquippedLabels),
  };
  if (row.designerId && row.designerUsername) {
    card.designer = { userId: row.designerId, username: row.designerUsername };
  }
  return card;
}

function toFriendItem(row: FriendCollectionEntryRow, genres: GenreView[], nowPlayingGameId: string | null): FriendCollectionItem {
  return {
    entryId: row.entry.id,
    gameId: row.game.id,
    title: row.game.name,
    developer: row.game.studio,
    publisher: row.game.publisher,
    releaseYear: releaseYearOf(row.game.releaseDate),
    genres,
    hours: row.entry.hours,
    status: row.entry.status as FriendCollectionItem['status'],
    ownedSince: row.entry.ownedSince,
    nowPlaying: row.game.id === nowPlayingGameId,
    card: friendCardFromRow(row),
    // NO notes/rating/platforms/percentComplete/addedAt — the F06 allowlist is the shape itself.
  };
}

/**
 * GET /users/:id/collection (COL-10/11) — the friend-view shelf. Non-disclosure collapse FIRST (blocked/
 * suspended/deleted/unknown → the generic 404), THEN the friend gate: a NON-friend also gets the generic
 * 404 (the collection is friend-only, COL-10 — indistinguishable from unavailable, MOD-09). Self reads
 * its own shelf here too (the friendScoped read returns nothing for self, so self short-circuits to the
 * owner read? — no: self should use /me/collection; a self GET /users/:id/collection returns their OWN
 * shelf via the friend serializer for symmetry). The single-entry SOC-11 detail is ONE item of this read
 * (no dedicated path in the contract — composed client-side).
 */
export async function getFriendCollection(actorId: string, rawTargetId: string): Promise<FriendCollectionResponse> {
  const targetId = await resolveVisibleTarget(actorId, rawTargetId);
  if (!(await isFriendOf(actorId, targetId))) throw new NotFoundError('User not found.'); // COL-10 friend-only collapse

  const rows =
    actorId === targetId
      ? await ownCollectionAsFriendRows(actorId)
      : await friendReadRepo.listFriendCollection(actorId, targetId);
  const target = await profileRepo.getOwnProfile(targetId);
  const genreRows = await catalogRepo.genresForGames(rows.map((r) => r.game.id));
  const genres = genresByGameId(genreRows);
  const items = rows.map((r) => toFriendItem(r, genres.get(r.game.id) ?? [], target?.nowPlayingGameId ?? null));
  return { items, nextCursor: null, total: items.length, collectionTotal: items.length };
}

/** Self-view of one's OWN shelf through the friend serializer (a self GET /users/:id/collection + the
 *  compare "your" side). The equipped card is resolved like /me/collection: OWN designs first (labels
 *  derived LIVE — I own the composition, so a private card still gets a correct readout), then ADOPTED
 *  designs (flattened columns + the DENORMALIZED labels + the original designer). */
async function ownCollectionAsFriendRows(actorId: string): Promise<FriendCollectionEntryRow[]> {
  const entries = await collectionRepo.listEntriesWithGames(actorId);
  const equippedIds = entries.map((e) => e.entry.activeCardDesignId).filter((id): id is string => id !== null);
  const owned = await cardRepo.ownedDesignsByIds(actorId, equippedIds);
  const adopted = await adoptionRepo.adoptedDesignsByIds(actorId, equippedIds.filter((id) => !owned.has(id)));
  const me = await profileRepo.getOwnProfile(actorId);
  return entries.map((e) => {
    const id = e.entry.activeCardDesignId;
    const ownDesign = id ? owned.get(id) : undefined;
    if (ownDesign) return ownDesignRow(e.entry, e.game, ownDesign, actorId, me?.username ?? '');
    const adoptedDesign = id ? adopted.get(id) : undefined;
    if (adoptedDesign) return adoptedDesignRow(e.entry, e.game, adoptedDesign);
    return blankCardRow(e.entry, e.game);
  });
}

/** An OWN equipped design → the FriendCollectionEntryRow contract (labels derived LIVE from composition). */
function ownDesignRow(
  entry: FriendCollectionEntryRow['entry'],
  game: FriendCollectionEntryRow['game'],
  design: CardDesignRow,
  designerId: string,
  designerUsername: string,
): FriendCollectionEntryRow {
  return {
    entry,
    game,
    cardId: design.id,
    cardName: design.name,
    cardImageUrl: design.imageUrl,
    cardThumbUrl: design.thumbUrl,
    cardIsPremium: design.isPremium,
    cardEquippedLabels: deriveEquippedLabels(design.composition),
    designerId,
    designerUsername,
  };
}

/** An ADOPTED equipped design → the FriendCollectionEntryRow contract (DENORMALIZED labels + the original
 *  designer; flattened columns only — never the foreign composition, OQ-122). */
function adoptedDesignRow(
  entry: FriendCollectionEntryRow['entry'],
  game: FriendCollectionEntryRow['game'],
  adopted: { id: string; name: string; imageUrl: string | null; thumbUrl: string | null; isPremium: boolean; equippedLabels: Record<string, string>; designerId: string; designerUsername: string },
): FriendCollectionEntryRow {
  return {
    entry,
    game,
    cardId: adopted.id,
    cardName: adopted.name,
    cardImageUrl: adopted.imageUrl,
    cardThumbUrl: adopted.thumbUrl,
    cardIsPremium: adopted.isPremium,
    cardEquippedLabels: adopted.equippedLabels,
    designerId: adopted.designerId,
    designerUsername: adopted.designerUsername,
  };
}

/** A default-face (no equipped design) row. */
function blankCardRow(
  entry: FriendCollectionEntryRow['entry'],
  game: FriendCollectionEntryRow['game'],
): FriendCollectionEntryRow {
  return {
    entry,
    game,
    cardId: null,
    cardName: null,
    cardImageUrl: null,
    cardThumbUrl: null,
    cardIsPremium: null,
    cardEquippedLabels: null,
    designerId: null,
    designerUsername: null,
  };
}

// ── P2 — GET /me/compare/:friendId (SOC-03) ──────────────────────────────────────────────────────────

/**
 * At M6 the data model carries NO per-facet hide toggle (privacy is friends|public only — OQ-117
 * deferred), so a friend exposes BOTH axes to a friend. This is the ONE seam a future per-facet privacy
 * setting wires into; the omission branches are fully built + unit-tested (compare.test.ts). Flagged as
 * the P2 privacy-model gap.
 */
function resolveCompareVisibility(): CompareVisibility {
  return { hoursVisible: true, collectionVisible: true };
}

interface FriendCardEntry {
  gameId: string;
  title: string;
  hours: number;
  card: FriendCollectionCard;
}

const toFriendCardEntry = (r: FriendCollectionEntryRow): FriendCardEntry => ({
  gameId: r.game.id,
  title: r.game.name,
  hours: r.entry.hours,
  card: friendCardFromRow(r),
});

/**
 * GET /me/compare/:friendId (SOC-03). Non-disclosure collapse FIRST (blocked/suspended/deleted/unknown
 * → the generic 404, indistinguishable, MOD-09) — so a block never reveals itself. THEN the friend gate:
 * a KNOWN, visible NON-friend (incl. self) → 409 NOT_FRIENDS (comparing is a friend-only action). The
 * shared-set is the collection INTERSECTION; the leaderboard is the actor's friend cohort + the actor
 * (isMe), ranked by hours. PROF-03 omission is applied by buildCompare.
 */
export async function getCompare(actorId: string, rawFriendId: string): Promise<CompareResponse> {
  const friendId = await resolveVisibleTarget(actorId, rawFriendId);
  if (actorId === friendId || (await relationshipRepo.getRelationship(actorId, friendId)) !== 'friend') {
    throw new NotFriendsError(); // 409 — a KNOWN non-friend (the block/unknown case already collapsed to 404)
  }

  const [me, friend] = await Promise.all([
    profileRepo.getOwnProfile(actorId),
    profileRepo.getOwnProfile(friendId),
  ]);
  const myRows = await ownCollectionAsFriendRows(actorId);
  const theirRows = await friendReadRepo.listFriendCollection(actorId, friendId);
  const mine = myRows.map(toFriendCardEntry);
  const theirs = theirRows.map(toFriendCardEntry);
  const theirByGame = new Map(theirs.map((t) => [t.gameId, t]));

  const games: CompareGameInput[] = mine
    .filter((m) => theirByGame.has(m.gameId))
    .map((m) => {
      const t = theirByGame.get(m.gameId)!;
      return { gameId: m.gameId, title: m.title, yourCard: m.card, theirCard: t.card, yourHours: m.hours, theirHours: t.hours };
    })
    .sort((a, b) => b.yourHours + b.theirHours - (a.yourHours + a.theirHours) || a.gameId.localeCompare(b.gameId));

  const yourHours = mine.reduce((s, m) => s + m.hours, 0);
  const theirHours = theirs.reduce((s, t) => s + t.hours, 0);

  // The friend cohort (accepted friends) + the actor's OWN row (isMe), ranked by hours desc.
  const cohortRows = await friendReadRepo.friendCohortTotals(actorId);
  const cohort: CompareCohortMember[] = [
    { userId: actorId, username: me?.username ?? '', avatarUrl: me?.avatarUrl ?? null, hours: yourHours, games: mine.length, isMe: true },
    ...cohortRows.map((r) => ({ userId: r.userId, username: r.username, avatarUrl: r.avatarUrl, hours: r.hours, games: r.games, isMe: false })),
  ].sort((a, b) => b.hours - a.hours || a.username.localeCompare(b.username));

  return buildCompare(
    {
      friend: { userId: friendId, username: friend?.username ?? '', avatarUrl: friend?.avatarUrl ?? null },
      yourHours,
      yourGames: mine.length,
      theirHours,
      theirGames: theirs.length,
      games,
      cohort,
    },
    resolveCompareVisibility(),
  );
}

// ── P2 — the CAT-07 VIEW-ALL cursor sub-routes (friend-only, PROF-03) ────────────────────────────────

/** Decode an opaque offset cursor (a plain non-negative integer string); a bad cursor reads as 0. */
function decodeCursor(cursor: string | undefined): number {
  if (!cursor) return 0;
  const n = Number(cursor);
  return Number.isInteger(n) && n >= 0 ? n : 0;
}

/** Resolve the VIEW-ALL target: the non-disclosure collapse (404), then the friend-only gate (403). The
 *  VIEW-ALL detail is FRIEND-ONLY (a non-friend sees the limited base contributions shape, not this). */
async function resolveContributionTarget(actorId: string, rawTargetId: string): Promise<string> {
  const targetId = await resolveVisibleTarget(actorId, rawTargetId);
  if (!(await isFriendOf(actorId, targetId))) {
    throw new ForbiddenError('This list is only visible to friends.'); // PROF-03 — friend-only VIEW-ALL
  }
  return targetId;
}

/** A game-id → the target's most-adopted published card thumb (flattened; never composition). The
 *  contributor board's GAMES ADDED rows draw it (parvati gap, P2 additive) — absent when none exists. */
async function gameThumbMap(targetId: string): Promise<Map<string, { imageUrl: string | null; thumbUrl: string | null }>> {
  const published = await cardRepo.listPublishedByOwner(targetId);
  const counts = await cardRepo.adoptionCountsByCard(published.map((r) => r.id));
  const byGame = new Map<string, { imageUrl: string | null; thumbUrl: string | null; adoptions: number }>();
  for (const r of published) {
    const adoptions = counts.get(r.id) ?? 0;
    const cur = byGame.get(r.gameId);
    if (!cur || adoptions > cur.adoptions) {
      byGame.set(r.gameId, { imageUrl: r.imageUrl, thumbUrl: r.thumbUrl, adoptions });
    }
  }
  return new Map([...byGame].map(([g, v]) => [g, { imageUrl: v.imageUrl, thumbUrl: v.thumbUrl }]));
}

/** GET /users/:id/contributions/cards?cursor= (CAT-07 VIEW ALL cards) — friend-only, cursor-paginated. */
export async function getContributionsCards(actorId: string, rawTargetId: string, cursor?: string): Promise<ContributionsCardsPage> {
  const targetId = await resolveContributionTarget(actorId, rawTargetId);
  const published = await cardRepo.listPublishedByOwner(targetId);
  const cardCounts = await cardRepo.adoptionCountsByCard(published.map((r) => r.id));
  const ranked = published
    .map((r) => ({ row: r, adoptionCount: cardCounts.get(r.id) ?? 0 }))
    .sort((a, b) => b.adoptionCount - a.adoptionCount || a.row.id.localeCompare(b.row.id));
  const offset = decodeCursor(cursor);
  const page = ranked.slice(offset, offset + VIEW_ALL_PAGE);
  const nextCursor = offset + VIEW_ALL_PAGE < ranked.length ? String(offset + VIEW_ALL_PAGE) : null;
  return { items: page.map(({ row, adoptionCount }) => toContributorCard(row, adoptionCount)), nextCursor };
}

/** GET /users/:id/contributions/games?cursor= (CAT-07 VIEW ALL games) — friend-only, cursor-paginated. */
export async function getContributionsGames(actorId: string, rawTargetId: string, cursor?: string): Promise<ContributionsGamesPage> {
  const targetId = await resolveContributionTarget(actorId, rawTargetId);
  const addedGames = await catalogRepo.listGamesAddedBy(targetId);
  const collectionsCounts = await collectionRepo.collectionsCountByGame(addedGames.map((g) => g.id));
  const thumbs = await gameThumbMap(targetId);
  const ranked = addedGames
    .map((g): ContributorGame => {
      const row: ContributorGame = { gameId: g.id, title: g.name, collectionsCount: collectionsCounts.get(g.id) ?? 0 };
      const thumb = thumbs.get(g.id);
      if (thumb) row.card = thumb;
      return row;
    })
    .sort((a, b) => b.collectionsCount - a.collectionsCount || a.gameId.localeCompare(b.gameId));
  const offset = decodeCursor(cursor);
  const page = ranked.slice(offset, offset + VIEW_ALL_PAGE);
  const nextCursor = offset + VIEW_ALL_PAGE < ranked.length ? String(offset + VIEW_ALL_PAGE) : null;
  return { items: page, nextCursor };
}
