import { and, count, eq, inArray, max, ne, or } from 'drizzle-orm';
import { getDb, type Executor } from '../db/client';
import { asActor, ownedBy } from '../db/scoped';
import {
  collectionEntries,
  friendships,
  games,
  type CollectionEntryRow,
  type GameRow,
} from '../db/schema';

// Collection repository — `collection_entries` is USER-OWNED (not on the F32 manifest; rule-2
// fails closed). Row reads/writes ride `asActor`/`ownedBy`; the two CAT-09 helpers below are the
// sanctioned exceptions (an anonymous aggregate + a friend-visibility count). The COL-01..07 CRUD
// functions live here too (the M3 collection slice).

/** CAT-09a — anonymous collections-count per game (honest at any size; never row data). */
export async function collectionsCountByGame(
  gameIds: string[],
  exec: Executor = getDb(),
): Promise<Map<string, number>> {
  if (gameIds.length === 0) return new Map();
  // SYS-01-COMMUNITY-AGGREGATE: CAT-09a — a spec-sanctioned anonymous cross-user COUNT per game
  // (OQ-126; reads-only + aggregate-only, gate-3-auditable).
  const rows = await exec
    .select({ gameId: collectionEntries.gameId, n: count() })
    .from(collectionEntries)
    .where(inArray(collectionEntries.gameId, gameIds))
    .groupBy(collectionEntries.gameId);
  return new Map(rows.map((r) => [r.gameId, Number(r.n)]));
}

/**
 * CAT-07 REACHED (walk2 N1 fix + N1b owner ruling) — the DEDUPED reach: the count of DISTINCT collection
 * owners across ALL of a contributor's games, EXCLUDING the contributor themselves. A user who owns
 * SEVERAL of the contributor's games counts ONCE (the prior code SUMMED per-game
 * `collectionsCountByGame`, so a multi-game owner inflated the total once per game — the "29 REACHED"
 * bug). CAT-10 (owner ruling, walk2 N1b): REACHED = distinct OTHERS reached — the contributor's OWN
 * ownership does NOT count (the stat measures impact on OTHER users' collections). A single query:
 * `count()` over a DISTINCT-owner subquery filtered to owners !== the contributor.
 */
export async function distinctUsersReachedByGames(
  gameIds: string[],
  contributorId: string,
  exec: Executor = getDb(),
): Promise<number> {
  if (gameIds.length === 0) return 0;
  // SYS-01-COMMUNITY-AGGREGATE: CAT-07/CAT-09 — an anonymous cross-user COUNT of DISTINCT owners over
  // the contributor's games (OQ-126; reads-only + aggregate-only — the distinct-owner subquery is
  // counted, never a per-identity row read). The inner .from(collectionEntries) is the cross-user read;
  // the outer count() over the distinct subquery is the aggregate the marker requires. The `ne(userId,
  // contributorId)` excludes the contributor's own ownership (N1b — "distinct OTHERS reached").
  const distinctOwners = exec
    .selectDistinct({ userId: collectionEntries.userId })
    .from(collectionEntries)
    .where(and(inArray(collectionEntries.gameId, gameIds), ne(collectionEntries.userId, contributorId)))
    .as('distinct_owners');
  const rows = await exec.select({ n: count() }).from(distinctOwners);
  return Number(rows[0]?.n ?? 0);
}

/**
 * CAT-09b — how many of the ACTOR's accepted friends own each game. The friend set derives from the
 * actor (PROF-03 friend visibility; blocks sever friendships, SOC-09 needs no special-casing).
 */
export async function friendsHaveCountByGame(
  actorId: string,
  gameIds: string[],
  exec: Executor = getDb(),
): Promise<Map<string, number>> {
  if (gameIds.length === 0) return new Map();
  const actor = asActor(actorId);
  const friendRows = await exec
    .select()
    .from(friendships)
    .where(
      and(
        eq(friendships.status, 'accepted'),
        or(eq(friendships.requesterId, actor.actorId), eq(friendships.addresseeId, actor.actorId)),
      ),
    );
  const friendIds = friendRows.map((r) =>
    r.requesterId === actor.actorId ? r.addresseeId : r.requesterId,
  );
  if (friendIds.length === 0) return new Map();
  // SYS-01-COMMUNITY-AGGREGATE: CAT-09b — a COUNT over the actor-derived accepted-friend set only
  // (friend visibility, PROF-03; blocks sever friendships so SOC-09 needs no special-casing; OQ-126).
  const rows = await exec
    .select({ gameId: collectionEntries.gameId, n: count() })
    .from(collectionEntries)
    .where(
      and(inArray(collectionEntries.userId, friendIds), inArray(collectionEntries.gameId, gameIds)),
    )
    .groupBy(collectionEntries.gameId);
  return new Map(rows.map((r) => [r.gameId, Number(r.n)]));
}

/** The subset of `gameIds` already on the ACTOR's shelf (the add-flow own-it ✓). */
export async function ownedGameIdSet(
  actorId: string,
  gameIds: string[],
  exec: Executor = getDb(),
): Promise<Set<string>> {
  if (gameIds.length === 0) return new Set();
  const actor = asActor(actorId);
  const rows = await exec
    .select({ gameId: collectionEntries.gameId })
    .from(collectionEntries)
    .where(ownedBy(actor, collectionEntries.userId, inArray(collectionEntries.gameId, gameIds)));
  return new Set(rows.map((r) => r.gameId));
}

// ── COL-01..07 CRUD (every call actor-scoped — the G-D surface) ──────────────────────────────────

export interface EntryWithGame {
  entry: CollectionEntryRow;
  game: GameRow;
}

/** The actor's raw entry rows (stat derivation, PROF-04). */
export async function listOwnedEntries(
  actorId: string,
  exec: Executor = getDb(),
): Promise<CollectionEntryRow[]> {
  const actor = asActor(actorId);
  return exec
    .select()
    .from(collectionEntries)
    .where(ownedBy(actor, collectionEntries.userId))
    .orderBy(collectionEntries.position);
}

/** The actor's shelf in manual order (COL-07 position), each entry with its catalog row. */
export async function listEntriesWithGames(
  actorId: string,
  exec: Executor = getDb(),
): Promise<EntryWithGame[]> {
  const actor = asActor(actorId);
  return exec
    .select({ entry: collectionEntries, game: games })
    .from(collectionEntries)
    .innerJoin(games, eq(games.id, collectionEntries.gameId))
    .where(ownedBy(actor, collectionEntries.userId))
    .orderBy(collectionEntries.position);
}

export async function findOwnedEntry(
  actorId: string,
  entryId: string,
  exec: Executor = getDb(),
): Promise<CollectionEntryRow | null> {
  const actor = asActor(actorId);
  const rows = await exec
    .select()
    .from(collectionEntries)
    .where(ownedBy(actor, collectionEntries.userId, eq(collectionEntries.id, entryId)))
    .limit(1);
  return rows[0] ?? null;
}

export async function findOwnedEntryByGame(
  actorId: string,
  gameId: string,
  exec: Executor = getDb(),
): Promise<CollectionEntryRow | null> {
  const actor = asActor(actorId);
  const rows = await exec
    .select()
    .from(collectionEntries)
    .where(ownedBy(actor, collectionEntries.userId, eq(collectionEntries.gameId, gameId)))
    .limit(1);
  return rows[0] ?? null;
}

/** The next append position for the actor's shelf (manual order starts as insertion order). */
export async function nextPosition(actorId: string, exec: Executor = getDb()): Promise<number> {
  const actor = asActor(actorId);
  const rows = await exec
    .select({ maxPos: max(collectionEntries.position) })
    .from(collectionEntries)
    .where(ownedBy(actor, collectionEntries.userId));
  const current = rows[0]?.maxPos;
  return current === null || current === undefined ? 0 : current + 1;
}

export async function insertEntry(
  actorId: string,
  fields: { gameId: string; ownedSince: string; position: number },
  exec: Executor = getDb(),
): Promise<CollectionEntryRow> {
  const actor = asActor(actorId);
  const rows = await exec
    .insert(collectionEntries)
    .values({ userId: actor.actorId, ...fields })
    .returning();
  return rows[0]!;
}

/** The COL-02/03/06 fields PATCH may set. Only provided keys are written. */
export interface EntryUpdate {
  status?: string;
  hours?: number;
  percentComplete?: number | null;
  ownedSince?: string;
  rating?: number | null;
  notes?: string | null;
  activeCardDesignId?: string | null; // COL-06 equip (api 0.53 / decision 0066)
}

export async function updateOwnedEntry(
  actorId: string,
  entryId: string,
  fields: EntryUpdate,
  exec: Executor = getDb(),
): Promise<CollectionEntryRow | null> {
  const actor = asActor(actorId);
  const rows = await exec
    .update(collectionEntries)
    .set(fields)
    .where(ownedBy(actor, collectionEntries.userId, eq(collectionEntries.id, entryId)))
    .returning();
  return rows[0] ?? null;
}

export async function deleteOwnedEntry(
  actorId: string,
  entryId: string,
  exec: Executor = getDb(),
): Promise<boolean> {
  const actor = asActor(actorId);
  const rows = await exec
    .delete(collectionEntries)
    .where(ownedBy(actor, collectionEntries.userId, eq(collectionEntries.id, entryId)))
    .returning({ id: collectionEntries.id });
  return rows.length > 0;
}

export async function listOwnedEntryIds(
  actorId: string,
  exec: Executor = getDb(),
): Promise<string[]> {
  const actor = asActor(actorId);
  const rows = await exec
    .select({ id: collectionEntries.id })
    .from(collectionEntries)
    .where(ownedBy(actor, collectionEntries.userId));
  return rows.map((r) => r.id);
}

/** COL-07 — rewrite the manual order (the ids are pre-validated as a full permutation). */
export async function setPositions(
  actorId: string,
  orderedEntryIds: string[],
  exec: Executor = getDb(),
): Promise<void> {
  const actor = asActor(actorId);
  for (let i = 0; i < orderedEntryIds.length; i++) {
    await exec
      .update(collectionEntries)
      .set({ position: i })
      .where(ownedBy(actor, collectionEntries.userId, eq(collectionEntries.id, orderedEntryIds[i]!)));
  }
}
