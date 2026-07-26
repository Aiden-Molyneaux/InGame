import { and, asc, count, desc, eq, isNull, or, sum, getTableColumns, type SQL } from 'drizzle-orm';
import type { AnyPgColumn } from 'drizzle-orm/pg-core';
import { getDb, type Executor } from '../db/client';
import {
  cardDesigns,
  collectionEntries,
  friendships,
  games,
  users,
  type CollectionEntryRow,
  type GameRow,
  type UserRow,
} from '../db/schema';

// ── decision 0076 §0.1 — the FOURTH SYS-01 read class: SYS-01-FRIEND-READ ────────────────────────────
// A cross-user read of FRIEND-ONLY data is legitimate ONLY when an ACCEPTED friendship binds the actor
// to the target. `friendScoped` HARD-REQUIRES that predicate — exactly as `publishedOnly` hard-requires
// `status = 'published'` for the PUBLIC-READ class (decision 0073 §0.1). The rule-02 lint admits the
// `// SYS-01-FRIEND-READ` marker only when the predicate (`friendScoped(` or an `'accepted'` status
// literal) is textually present IN THE MARKED STATEMENT (statement-scoped — the M5 neighbour-launder
// fix). There is deliberately NO asActor() call in this file: the friendship predicate IS the scope, so
// STRIPPING it leaks the full shape to a non-friend — the G-D demonstration (both the lint AND the
// runtime authz test go RED). The payload is allowlisted downstream by toFriendShape (F06), never here.

/**
 * The friendship predicate — an ACCEPTED friendship binding `actorId` to the `targetCol` column, in
 * EITHER stored direction (requester↔addressee). AND-ed with an optional `extra` clause. This is the
 * single mechanism the FRIEND-READ read class turns on (P1 formalizes reuse across the P2 read fabric).
 */
export function friendScoped(actorId: string, targetCol: AnyPgColumn, extra?: SQL): SQL {
  const bond = and(
    eq(friendships.status, 'accepted'),
    or(
      and(eq(friendships.requesterId, actorId), eq(friendships.addresseeId, targetCol)),
      and(eq(friendships.addresseeId, actorId), eq(friendships.requesterId, targetCol)),
    ),
  ) as SQL;
  return extra ? (and(bond, extra) as SQL) : bond;
}

/**
 * The friend/full profile row for `targetId` — returned ONLY when `actorId` and `targetId` are ACCEPTED
 * friends (else null → the service falls back to the limited shape). The friendScoped INNER JOIN is the
 * gate: no accepted friendship row ⇒ no result. (`getTableColumns(users)` returns the flat UserRow the
 * serializer needs — never a nested joined shape.)
 */
export async function friendScopedProfile(
  actorId: string,
  targetId: string,
  exec: Executor = getDb(),
): Promise<UserRow | null> {
  // SYS-01-FRIEND-READ — the friend/full profile: served ONLY when friendScoped's accepted-friendship
  // predicate binds actor↔target. Reads-only; the payload is allowlisted by toFriendShape (F06).
  const rows = await exec
    .select(getTableColumns(users))
    .from(users)
    .innerJoin(friendships, friendScoped(actorId, users.id))
    .where(eq(users.id, targetId))
    .limit(1);
  return rows[0] ?? null;
}

/** A friend summary (public allowlist) for GET /me/friends. */
export interface FriendSummary {
  userId: string;
  username: string;
  avatarUrl: string | null;
  /** PROF-08 (W-4) — the roster row's forged monogram; null ⇒ the default. Public-safe cosmetic. */
  avatarConfig: UserRow['avatarConfig'];
}

/**
 * GET /me/friends (SOC-01) — the actor's ACCEPTED-friends roster (public summaries). SYS-01-FRIEND-READ:
 * every joined `users` row is bound to the actor by an ACCEPTED friendship (the `friendScoped` predicate
 * is present in THIS marked statement — strip it and the read leaks the whole user table). The friend is
 * whichever side of the bond is NOT the actor. Deleted friends are excluded (OQ-145 collapse). The
 * payload is the public allowlist (id/username/avatar) — no friend-private field crosses here.
 */
export async function listFriendSummaries(
  actorId: string,
  exec: Executor = getDb(),
): Promise<FriendSummary[]> {
  // SYS-01-FRIEND-READ — the accepted-friendship predicate (friendScoped) IS the scope; the friend is
  // the far side of the bond. Public allowlist only (username/avatar).
  const rows = await exec
    .select({ userId: users.id, username: users.username, avatarUrl: users.avatarUrl, avatarConfig: users.avatarConfig })
    .from(users)
    .innerJoin(friendships, friendScoped(actorId, users.id))
    .where(isNull(users.deletedAt))
    .orderBy(asc(users.username));
  return rows;
}

// ── P2 — the friend-view collection read (COL-10/11 · SOC-11) ────────────────────────────────────────

/**
 * One friend-view collection row — the target's entry + game + the equipped card's FLATTENED columns
 * (never `composition` — OQ-122/CARD-15). `cardId` is null when the entry wears the default face. The
 * equipped design's `equippedLabels` is the DENORMALIZED CARD-22 readout (OQ-146). `designerId`/
 * `designerUsername` attribute the card (CARD-01) — the design's OWNER, whether the target owns it or
 * adopted it (either way the flattened artifact + labels are the public cross-user surface).
 */
export interface FriendCollectionEntryRow {
  entry: CollectionEntryRow;
  game: GameRow;
  cardId: string | null;
  cardName: string | null;
  cardImageUrl: string | null;
  cardThumbUrl: string | null;
  cardIsPremium: boolean | null;
  cardEquippedLabels: Record<string, string> | null;
  designerId: string | null;
  designerUsername: string | null;
}

/**
 * GET /users/:id/collection (COL-10/11) — the target's shelf, served ONLY to an ACCEPTED friend. The
 * friendScoped INNER JOIN is the gate: no accepted friendship binding `actorId` to the entry's owner ⇒
 * NO rows (a non-friend gets an empty read, which the service turns into the generic unavailable). The
 * `where` pins the owner to `targetId`. The equipped card is LEFT-joined for its FLATTENED columns +
 * `equippedLabels` ONLY — never `composition` (the friend gets the flattened image + CARD-22 labels).
 * Manual shelf order (COL-07). The owner-only fields (notes/rating/platforms/percentComplete/addedAt)
 * are NOT selected — they physically cannot leak (the F06 allowlist is the column list itself).
 */
// The friend-view collection column set — the F06 allowlist as a column list. FLATTENED card columns +
// the CARD-22 `equippedLabels` snapshot ONLY (never `composition`); the owner-only fields
// (notes/rating/percentComplete/addedAt/platforms) are simply not here — they physically cannot leak.
const FRIEND_ENTRY_COLUMNS = {
  entry: collectionEntries,
  game: games,
  cardId: cardDesigns.id,
  cardName: cardDesigns.name,
  cardImageUrl: cardDesigns.imageUrl,
  cardThumbUrl: cardDesigns.thumbUrl,
  cardIsPremium: cardDesigns.isPremium,
  cardEquippedLabels: cardDesigns.equippedLabels,
  designerId: cardDesigns.ownerId,
  designerUsername: users.username,
} as const;

export async function listFriendCollection(
  actorId: string,
  targetId: string,
  exec: Executor = getDb(),
): Promise<FriendCollectionEntryRow[]> {
  // SYS-01-FRIEND-READ — friendScoped's accepted-friendship predicate binds actor↔owner (the gate);
  // FRIEND_ENTRY_COLUMNS is the flattened friend-visible allowlist (never composition). Strip
  // friendScoped → the owner's whole shelf leaks to a non-friend and the G-D field-diff/lint tests go RED.
  const rows = await exec
    .select(FRIEND_ENTRY_COLUMNS)
    .from(collectionEntries)
    .innerJoin(friendships, friendScoped(actorId, collectionEntries.userId))
    .innerJoin(games, eq(games.id, collectionEntries.gameId))
    .leftJoin(cardDesigns, eq(cardDesigns.id, collectionEntries.activeCardDesignId))
    .leftJoin(users, eq(users.id, cardDesigns.ownerId))
    .where(eq(collectionEntries.userId, targetId))
    .orderBy(asc(collectionEntries.position));
  return rows;
}

// ── P2 — the CAT-09c friends-who-own named list (Game page) ──────────────────────────────────────────

/** One named friend who owns a game (CAT-09c). `hours` is PROF-03-gated (present only when exposed). */
export interface FriendWhoOwns {
  userId: string;
  username: string;
  avatarUrl: string | null;
  /** PROF-08 (W-4) — the named row's forged monogram; null ⇒ the default. Public-safe cosmetic. */
  avatarConfig: UserRow['avatarConfig'];
  hours: number;
}

/**
 * CAT-09c — the ACTOR's accepted friends who own `gameId`, with their hours (the Game-page named list).
 * Rooted at the actor's friend set (friendScoped binds actor↔the entry owner), so a block — which
 * severs the friendship both directions (SOC-09) — removes that person from the list by construction
 * (no accepted bond ⇒ not joined). Newest-hours-first for a stable, useful order.
 */
export async function friendsWhoOwnGame(
  actorId: string,
  gameId: string,
  exec: Executor = getDb(),
): Promise<FriendWhoOwns[]> {
  // SYS-01-FRIEND-READ — friendScoped binds actor↔the entry's owner (an accepted friend); the named
  // friend rows are the friend-visible allowlist (username/avatar/hours). Strip friendScoped → every
  // owner of the game leaks, not just the actor's friends.
  const rows = await exec
    .select({
      userId: users.id,
      username: users.username,
      avatarUrl: users.avatarUrl,
      avatarConfig: users.avatarConfig,
      hours: collectionEntries.hours,
    })
    .from(collectionEntries)
    .innerJoin(friendships, friendScoped(actorId, collectionEntries.userId))
    .innerJoin(users, eq(users.id, collectionEntries.userId))
    .where(and(eq(collectionEntries.gameId, gameId), isNull(users.deletedAt)))
    .orderBy(desc(collectionEntries.hours), asc(users.username));
  return rows;
}

// ── P2 — the SOC-03 compare friend-cohort leaderboard totals ─────────────────────────────────────────

/** One friend-cohort member's totals (SOC-03 leaderboard) — hours summed + games counted over their shelf. */
export interface FriendCohortTotals {
  userId: string;
  username: string;
  avatarUrl: string | null;
  /** PROF-08 (W-4) — the compare leaderboard row's forged monogram; null ⇒ the default. */
  avatarConfig: UserRow['avatarConfig'];
  hours: number;
  games: number;
}

/**
 * SOC-03 — the actor's ACCEPTED-friend cohort with each friend's total hours + games count (the compare
 * leaderboard rows; the service adds the actor's OWN row + ranks). A friend with an empty shelf still
 * appears (LEFT JOIN → 0/0). Blocked users are absent by construction (a block severs the friendship,
 * so friendScoped finds no accepted bond — SOC-09). Deleted friends excluded (OQ-145 collapse).
 */
// ── P7 — the CAT-12 "FRIENDS ARE PLAYING" candidate pool (Add Game rail) ─────────────────────────────

/**
 * CAT-12 (M6 P7, decision 0036/0076 §0.8) — per-game counts of how many of the ACTOR's accepted
 * friends own each game, over the actor's WHOLE friend cohort (unlike collectionRepo.
 * friendsHaveCountByGame, which is scoped to a caller-given `gameIds` set — SYS-01-COMMUNITY-AGGREGATE
 * — this is the FRIEND-READ class: it reads a friend's owned-games rows directly rather than an
 * aggregate over an already-known set). Only `{ gameId, count }` crosses this boundary (never a
 * friend's identity) — but the underlying join is still a cross-user ROW read gated by an accepted
 * friendship (0076 §0.1), so it belongs here, not the aggregate helper. The service (catalog-service.
 * friendsActive) excludes the actor's own games, ranks by count desc, and caps ~12.
 */
export async function friendsActiveGameCounts(
  actorId: string,
  exec: Executor = getDb(),
): Promise<Map<string, number>> {
  // SYS-01-FRIEND-READ — friendScoped binds actor↔each collection_entries owner (an accepted friend);
  // only { gameId, count } crosses (never the friend's identity/row). Strip friendScoped → every
  // user's owned-games list leaks, not just the actor's friends'.
  const rows = await exec
    .select({ gameId: collectionEntries.gameId, n: count() })
    .from(collectionEntries)
    .innerJoin(friendships, friendScoped(actorId, collectionEntries.userId))
    .groupBy(collectionEntries.gameId);
  return new Map(rows.map((r) => [r.gameId, Number(r.n)]));
}

export async function friendCohortTotals(
  actorId: string,
  exec: Executor = getDb(),
): Promise<FriendCohortTotals[]> {
  // SYS-01-FRIEND-READ — friendScoped binds actor↔each cohort member (an accepted friend); the summed
  // hours + game count are the friend-visible allowlist. Strip friendScoped → every user's totals leak.
  const rows = await exec
    .select({
      userId: users.id,
      username: users.username,
      avatarUrl: users.avatarUrl,
      avatarConfig: users.avatarConfig,
      hours: sum(collectionEntries.hours),
      games: count(collectionEntries.id),
    })
    .from(users)
    .innerJoin(friendships, friendScoped(actorId, users.id))
    .leftJoin(collectionEntries, eq(collectionEntries.userId, users.id))
    .where(isNull(users.deletedAt))
    .groupBy(users.id, users.username, users.avatarUrl, users.avatarConfig);
  return rows.map((r) => ({
    userId: r.userId,
    username: r.username,
    avatarUrl: r.avatarUrl,
    avatarConfig: r.avatarConfig,
    hours: Number(r.hours ?? 0),
    games: Number(r.games ?? 0),
  }));
}
