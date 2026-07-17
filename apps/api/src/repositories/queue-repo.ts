import { count, eq, max } from 'drizzle-orm';
import { getDb, type Executor } from '../db/client';
import { asActor, ownedBy } from '../db/scoped';
import { games, queueItems, type GameRow, type QueueItemRow } from '../db/schema';

// Queue repository (WTP-01/02, M6 P5). `queue_items` is USER-OWNED (owner key = `user_id`; NOT on the
// F32 manifest — rule-2 fails closed). Mirrors collection-repo's CRUD shape exactly (the manual-order
// `position` handling is the same append/reorder pattern, deliberately no DB-level uniqueness on it —
// see the schema.ts comment).

export interface QueueEntryWithGame {
  entry: QueueItemRow;
  game: GameRow;
}

/** GET /me/queue — the actor's queue in manual order, each entry with its catalog row. */
export async function listItemsWithGames(
  actorId: string,
  exec: Executor = getDb(),
): Promise<QueueEntryWithGame[]> {
  const actor = asActor(actorId);
  return exec
    .select({ entry: queueItems, game: games })
    .from(queueItems)
    .innerJoin(games, eq(games.id, queueItems.gameId))
    .where(ownedBy(actor, queueItems.userId))
    .orderBy(queueItems.position);
}

/** The cap-50 check (WTP-01/§0.7) — call under the per-actor advisory lock (F36). */
export async function countForUser(actorId: string, exec: Executor = getDb()): Promise<number> {
  const actor = asActor(actorId);
  const rows = await exec
    .select({ n: count() })
    .from(queueItems)
    .where(ownedBy(actor, queueItems.userId));
  return Number(rows[0]?.n ?? 0);
}

export async function findOwnedItemByGame(
  actorId: string,
  gameId: string,
  exec: Executor = getDb(),
): Promise<QueueItemRow | null> {
  const actor = asActor(actorId);
  const rows = await exec
    .select()
    .from(queueItems)
    .where(ownedBy(actor, queueItems.userId, eq(queueItems.gameId, gameId)))
    .limit(1);
  return rows[0] ?? null;
}

/** The next append position for the actor's queue (manual order starts as insertion order). */
export async function nextPosition(actorId: string, exec: Executor = getDb()): Promise<number> {
  const actor = asActor(actorId);
  const rows = await exec
    .select({ maxPos: max(queueItems.position) })
    .from(queueItems)
    .where(ownedBy(actor, queueItems.userId));
  const current = rows[0]?.maxPos;
  return current === null || current === undefined ? 0 : current + 1;
}

export interface QueueItemInsert {
  gameId: string;
  source: string;
  fromRecId: string | null;
  position: number;
}

export async function insertItem(
  actorId: string,
  fields: QueueItemInsert,
  exec: Executor = getDb(),
): Promise<QueueItemRow> {
  const actor = asActor(actorId);
  const rows = await exec
    .insert(queueItems)
    .values({ userId: actor.actorId, ...fields })
    .returning();
  return rows[0]!;
}

export async function deleteOwnedItem(
  actorId: string,
  itemId: string,
  exec: Executor = getDb(),
): Promise<boolean> {
  const actor = asActor(actorId);
  const rows = await exec
    .delete(queueItems)
    .where(ownedBy(actor, queueItems.userId, eq(queueItems.id, itemId)))
    .returning({ id: queueItems.id });
  return rows.length > 0;
}

export async function listOwnedItemIds(actorId: string, exec: Executor = getDb()): Promise<string[]> {
  const actor = asActor(actorId);
  const rows = await exec
    .select({ id: queueItems.id })
    .from(queueItems)
    .where(ownedBy(actor, queueItems.userId));
  return rows.map((r) => r.id);
}

/** WTP-01 — rewrite the manual order (the ids are pre-validated as a full permutation; mirrors
 *  collection-repo's setPositions exactly, incl. no DB-level uniqueness on `position`). */
export async function setPositions(
  actorId: string,
  orderedItemIds: string[],
  exec: Executor = getDb(),
): Promise<void> {
  const actor = asActor(actorId);
  for (let i = 0; i < orderedItemIds.length; i++) {
    await exec
      .update(queueItems)
      .set({ position: i })
      .where(ownedBy(actor, queueItems.userId, eq(queueItems.id, orderedItemIds[i]!)));
  }
}
