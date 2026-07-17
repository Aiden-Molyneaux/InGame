import { and, count, eq, max } from 'drizzle-orm';
import { getDb, type Executor } from '../db/client';
import { asActor, ownedBy } from '../db/scoped';
import { games, listItems, lists, type GameRow, type ListItemRow, type ListRow } from '../db/schema';

// List repository (SOC-04, M6 P5). `lists`/`list_items` are USER-OWNED — every function takes the
// OWNER's userId EXPLICITLY (never assumed to be "the session actor") and scopes through
// asActor()/ownedBy() (SYS-01), same as every other user-owned repo in this codebase. CALLERS: a
// self-view passes the actor's own id; a friend-view (`/users/:id`) passes the FRIENDSHIP-GATED
// target id — the friendship check already ran in users-service BEFORE reaching here, exactly like
// `profileRepo.getOwnProfile(targetId)` is used post-gate for the self-owned `users` table. This repo
// has no knowledge of "who is asking," only "whose rows these are" — it re-validates ownership at the
// DB on every call regardless (belt-and-braces, not merely trusting the caller).

/** Find the (user, kind) list row — v2 has exactly one kind (`'top10'`). */
export async function findListByUser(
  userId: string,
  kind: string,
  exec: Executor = getDb(),
): Promise<ListRow | null> {
  const owner = asActor(userId);
  const rows = await exec
    .select()
    .from(lists)
    .where(ownedBy(owner, lists.userId, eq(lists.kind, kind)))
    .limit(1);
  return rows[0] ?? null;
}

/**
 * Get-or-create the (user, kind) list row (the "auto-create lazily on first write" posture). F36-safe:
 * `onConflictDoNothing` on the `unique(userId, kind)` index means a concurrent first-write from two
 * requests converges to exactly one row — the loser re-selects the winner's row. A brand-new
 * actor-owned insert is rule-2-exempt (mirrors collection-repo's `insertEntry` — not an IDOR vector).
 */
export async function getOrCreateList(userId: string, kind: string, exec: Executor): Promise<ListRow> {
  const existing = await findListByUser(userId, kind, exec);
  if (existing) return existing;
  const inserted = await exec
    .insert(lists)
    .values({ userId, kind })
    .onConflictDoNothing({ target: [lists.userId, lists.kind] })
    .returning();
  if (inserted[0]) return inserted[0];
  const winner = await findListByUser(userId, kind, exec); // a concurrent create won the race (F36)
  if (!winner) throw new Error('list get-or-create: no row after insert conflict — unreachable');
  return winner;
}

export interface ListEntryWithGame {
  item: ListItemRow;
  game: GameRow;
}

/** The list's members in rank order, each with its catalog row. `listId` is re-validated as owned by
 *  `userId` in the same predicate (not merely trusted from a prior `findListByUser` call). */
export async function listItemsForList(
  userId: string,
  listId: string,
  exec: Executor = getDb(),
): Promise<ListEntryWithGame[]> {
  const owner = asActor(userId);
  return exec
    .select({ item: listItems, game: games })
    .from(listItems)
    .innerJoin(games, eq(games.id, listItems.gameId))
    .where(ownedBy(owner, listItems.userId, eq(listItems.listId, listId)))
    .orderBy(listItems.rank);
}

export async function countItems(userId: string, listId: string, exec: Executor = getDb()): Promise<number> {
  const owner = asActor(userId);
  const rows = await exec
    .select({ n: count() })
    .from(listItems)
    .where(ownedBy(owner, listItems.userId, eq(listItems.listId, listId)));
  return Number(rows[0]?.n ?? 0);
}

export async function findItemByGame(
  userId: string,
  listId: string,
  gameId: string,
  exec: Executor = getDb(),
): Promise<ListItemRow | null> {
  const owner = asActor(userId);
  const rows = await exec
    .select()
    .from(listItems)
    .where(ownedBy(owner, listItems.userId, and(eq(listItems.listId, listId), eq(listItems.gameId, gameId))))
    .limit(1);
  return rows[0] ?? null;
}

/** The next append rank for the list (1-indexed — COL-13's "#1 emphasized"). */
export async function nextRank(userId: string, listId: string, exec: Executor = getDb()): Promise<number> {
  const owner = asActor(userId);
  const rows = await exec
    .select({ maxRank: max(listItems.rank) })
    .from(listItems)
    .where(ownedBy(owner, listItems.userId, eq(listItems.listId, listId)));
  const current = rows[0]?.maxRank;
  return current === null || current === undefined ? 1 : current + 1;
}

export async function insertItem(
  userId: string,
  listId: string,
  gameId: string,
  rank: number,
  exec: Executor,
): Promise<ListItemRow> {
  const rows = await exec.insert(listItems).values({ listId, userId, gameId, rank }).returning();
  return rows[0]!;
}

export async function deleteItem(userId: string, listId: string, gameId: string, exec: Executor): Promise<boolean> {
  const owner = asActor(userId);
  const rows = await exec
    .delete(listItems)
    .where(ownedBy(owner, listItems.userId, and(eq(listItems.listId, listId), eq(listItems.gameId, gameId))))
    .returning({ gameId: listItems.gameId });
  return rows.length > 0;
}

export async function listItemGameIds(userId: string, listId: string, exec: Executor = getDb()): Promise<string[]> {
  const owner = asActor(userId);
  const rows = await exec
    .select({ gameId: listItems.gameId })
    .from(listItems)
    .where(ownedBy(owner, listItems.userId, eq(listItems.listId, listId)));
  return rows.map((r) => r.gameId);
}

/** SOC-04/COL-13 — rewrite the ranks 1..N (the ids are pre-validated as a full permutation). NO
 *  DB-level uniqueness on `rank` (mirrors collection-repo's setPositions) — Postgres row-level
 *  locking inside the caller's transaction makes two concurrent re-ranks converge to one whole
 *  ordering (last-commit-wins), never a duplicate-rank mix (F36; see list-service.test coverage). */
export async function setRanks(
  userId: string,
  listId: string,
  orderedGameIds: string[],
  exec: Executor,
): Promise<void> {
  const owner = asActor(userId);
  for (let i = 0; i < orderedGameIds.length; i++) {
    await exec
      .update(listItems)
      .set({ rank: i + 1 })
      .where(ownedBy(owner, listItems.userId, and(eq(listItems.listId, listId), eq(listItems.gameId, orderedGameIds[i]!))));
  }
}
