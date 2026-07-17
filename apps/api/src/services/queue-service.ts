import {
  type AddQueueItemRequest,
  type QueueItem,
  type QueueResponse,
  type ReorderQueueRequest,
} from '@ingame/shared';
import { mutation } from '../db/mutation';
import type { Executor } from '../db/client';
import { acquireActorLock } from '../db/locks';
import * as queueRepo from '../repositories/queue-repo';
import * as catalogRepo from '../repositories/catalog-repo';
import * as collectionRepo from '../repositories/collection-repo';
import * as recommendationRepo from '../repositories/recommendation-repo';
import { equippedCardsByGameId } from './collection-service';
import { authorShapeFor } from '../serializers/user-shape';
import { ListFullError, NotFoundError, ValidationError } from '../errors/AppError';
import type { GameRow } from '../db/schema';
import type { QueueEntryWithGame } from '../repositories/queue-repo';

// WTP-01/02 "Up Next" queue service (M6 P5). `queue_items` is USER-OWNED — every path is actor-scoped
// (SYS-01), mirroring collection-service's shape (queue is COL-07's sibling: manual order, self-only
// reads, never cross-principal — a queue never crosses to another user).

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** WTP-01/§0.7 (decision 0076) — the queue cap. SYS-04-tunable in spirit (a constant here, like the
 *  sibling STYLE_PRESETS_MAX/LOOK_CAP — no config seam exists yet for this one number; flagged if a
 *  future SYS-04 pass wants it externalized alongside config/social.ts). */
const QUEUE_MAX = 50;

async function liveGameOr422(gameId: string, exec: Executor): Promise<GameRow> {
  const [game] = await catalogRepo.gamesByIds([gameId], exec);
  if (!game) {
    throw new ValidationError('That game is not in the catalog.', 'unknown_game', [
      { path: 'gameId', message: 'That game is not in the catalog.' },
    ]);
  }
  return game;
}

/**
 * Assemble the wire QueueItem for a set of rows in ONE bulk pass: the `owned` flag (against the
 * actor's own collection), the `card` rider (CARD-07/18, via the shared collection-service resolver),
 * and — for `source = 'friend_rec'` rows — the `recommendedBy`/`note` thread from the originating
 * `recommendations` row (AUTH-07: a deleted recommender degrades to the anonymized author shape, the
 * item itself stays in the queue).
 */
async function assembleQueueItems(
  actorId: string,
  rows: QueueEntryWithGame[],
  exec?: Executor,
): Promise<QueueItem[]> {
  if (rows.length === 0) return [];
  const gameIds = rows.map((r) => r.game.id);
  const [ownedSet, cards] = await Promise.all([
    exec ? collectionRepo.ownedGameIdSet(actorId, gameIds, exec) : collectionRepo.ownedGameIdSet(actorId, gameIds),
    exec ? equippedCardsByGameId(actorId, gameIds, exec) : equippedCardsByGameId(actorId, gameIds),
  ]);
  const recIds = rows.map((r) => r.entry.fromRecId).filter((id): id is string => id !== null);
  const recInfo = exec
    ? await recommendationRepo.recommenderInfoByRecIds(actorId, recIds, exec)
    : await recommendationRepo.recommenderInfoByRecIds(actorId, recIds);

  return rows.map((r): QueueItem => {
    const item: QueueItem = {
      itemId: r.entry.id,
      gameId: r.game.id,
      title: r.game.name,
      card: cards.get(r.game.id) ?? { id: 'default', imageUrl: null, thumbUrl: null, isCustom: false, isPremium: false },
      owned: ownedSet.has(r.game.id),
      source: r.entry.source as QueueItem['source'],
    };
    if (r.entry.source === 'friend_rec' && r.entry.fromRecId) {
      const info = recInfo.get(r.entry.fromRecId);
      if (info) {
        const author = authorShapeFor({ id: info.fromUserId, username: info.fromUsername, deletedAt: info.fromDeletedAt });
        item.recommendedBy = { userId: author.userId, username: author.username };
        item.note = info.note ?? undefined;
      }
    }
    return item;
  });
}

/** GET /me/queue — the actor's whole queue in manual order (WTP-01). */
export async function listQueue(actorId: string): Promise<QueueResponse> {
  const rows = await queueRepo.listItemsWithGames(actorId);
  return { items: await assembleQueueItems(actorId, rows) };
}

/**
 * @mutation — POST /me/queue (WTP-01/02). DUPLICATE-ADD posture (a P5 design call — the contract's
 * error registry does not enumerate an ALREADY_QUEUED code, and minting an unruled one is out of scope
 * for this packet): re-adding a game already on the queue is an IDEMPOTENT 200-equivalent success
 * returning the EXISTING item, not a 409/422 — mirrors how a wishlist/wishlist-adjacent surface should
 * feel (adding twice is a no-op, not an error the user has to parse). FLAGGED for the api-contract
 * owner: this diverges from the sibling ALREADY_ADOPTED/ALREADY_FRIENDS 409 family on purpose (those
 * guard a one-shot resource acquisition; a queue slot is cheap and re-orderable, so silent success
 * reads better). The unique(userId, gameId) index is ALSO the F36 backstop (a race between the
 * pre-check and the insert still converges to one row — see the catch below).
 */
const addQueueItemMutation = mutation(
  { name: 'queue.addItem', specIds: ['WTP-01', 'WTP-02', 'SYS-01', 'SYS-02'] },
  async (ctx, actorId, input: AddQueueItemRequest): Promise<QueueItem> => {
    const game = await liveGameOr422(input.gameId, ctx.tx);

    let fromRecId: string | null = null;
    if (input.source === 'friend_rec') {
      // zod already requires fromRecId for this source (request schema refine); defensive re-check.
      if (!input.fromRecId) {
        throw new ValidationError('A friend-rec add needs its recommendation.', 'missing_from_rec_id', [
          { path: 'fromRecId', message: 'Required when source is "friend_rec".' },
        ]);
      }
      const rec = await recommendationRepo.findRecipientRec(actorId, input.fromRecId, ctx.tx);
      if (!rec || rec.gameId !== input.gameId) {
        // A foreign/unknown/mismatched-game fromRecId — no cross-inbox oracle (same posture as the
        // recommendation-repo dismiss's generic 404, translated to this endpoint's 422 shape-refusal).
        throw new ValidationError('That recommendation is not valid for this game.', 'unknown_recommendation', [
          { path: 'fromRecId', message: 'That recommendation is not valid for this game.' },
        ]);
      }
      fromRecId = rec.id; // the rec is NOT dismissed by this add (independent lifecycles, P5 design)
    }

    // F36 — the lock MUST be acquired BEFORE the duplicate-item / cap checks (not after): otherwise two
    // concurrent adds of the SAME new gameId could both see "no existing row," both queue behind the
    // lock, and the SECOND would still attempt an INSERT after the first committed — hitting the
    // unique(userId, gameId) index as an uncaught constraint violation instead of resolving idempotently.
    await acquireActorLock(ctx.tx, 'queue', actorId);

    const existing = await queueRepo.findOwnedItemByGame(actorId, input.gameId, ctx.tx);
    if (existing) {
      const [item] = await assembleQueueItems(actorId, [{ entry: existing, game }], ctx.tx);
      return item!; // idempotent no-op — no emit (the happy-path add already fed one, rule-5 posture)
    }
    if ((await queueRepo.countForUser(actorId, ctx.tx)) >= QUEUE_MAX) {
      throw new ListFullError('Your Up Next queue is full.');
    }
    const position = await queueRepo.nextPosition(actorId, ctx.tx);
    const row = await queueRepo.insertItem(
      actorId,
      { gameId: input.gameId, source: input.source, fromRecId, position },
      ctx.tx,
    );
    await ctx.emit({
      eventType: 'queue.item_added',
      entityRef: { type: 'queue_item', id: row.id },
      payload: { gameId: game.id, source: input.source },
    });
    const [item] = await assembleQueueItems(actorId, [{ entry: row, game }], ctx.tx);
    return item!;
  },
);

export async function addItem(actorId: string, input: AddQueueItemRequest): Promise<QueueItem> {
  return addQueueItemMutation(actorId, input);
}

/** @mutation — DELETE /me/queue/:id (WTP-01). */
export const removeItem = mutation(
  { name: 'queue.removeItem', specIds: ['WTP-01', 'SYS-01'] },
  async (ctx, actorId, itemId: string): Promise<void> => {
    if (!UUID_RE.test(itemId)) throw new NotFoundError('Queue item not found.');
    const removed = await queueRepo.deleteOwnedItem(actorId, itemId, ctx.tx);
    if (!removed) throw new NotFoundError('Queue item not found.');
    await ctx.emit({
      eventType: 'queue.item_removed',
      entityRef: { type: 'queue_item', id: itemId },
      payload: {},
    });
  },
);

/**
 * @mutation — PATCH /me/queue/reorder (WTP-01): a FULL permutation of the actor's queue. F36 — a
 * per-actor advisory lock serializes concurrent reorders. This is NOT merely a cap-style
 * check-then-insert guard: `setPositions` issues N sequential row UPDATEs in the CALLER-CHOSEN
 * order, so two concurrent reorders with DIFFERENT target orderings can acquire the same rows'
 * locks in opposite sequences (A: item1→item2→item3, B: item3→item2→item1) — a classic Postgres
 * DEADLOCK (A holds item1+item2 waiting on item3; B holds item3 waiting on item2), which Postgres
 * resolves by aborting one transaction with an UNCAUGHT `deadlock_detected` (a raw 500). The lock
 * makes concurrent reorders fully serial (one whole ordering wins, never an interleave) — discovered
 * writing this packet's F36 test; the sibling `collection-service.reorder` (COL-07) has the SAME
 * latent structural gap, unfixed here (out of this packet's scope — flagged for a follow-up).
 */
export const reorder = mutation(
  { name: 'queue.reorder', specIds: ['WTP-01', 'SYS-01', 'SYS-02'] },
  async (ctx, actorId, input: ReorderQueueRequest): Promise<void> => {
    await acquireActorLock(ctx.tx, 'queue:reorder', actorId);
    const ownedIds = await queueRepo.listOwnedItemIds(actorId, ctx.tx);
    const provided = new Set(input.orderedItemIds);
    const isPermutation =
      provided.size === input.orderedItemIds.length &&
      provided.size === ownedIds.length &&
      ownedIds.every((id) => provided.has(id));
    if (!isPermutation) {
      throw new ValidationError('The order must include exactly your queue.', 'not_a_permutation', [
        { path: 'orderedItemIds', message: 'Must be a full permutation of your queue items.' },
      ]);
    }
    await queueRepo.setPositions(actorId, input.orderedItemIds, ctx.tx);
    await ctx.emit({
      eventType: 'queue.reordered',
      entityRef: { type: 'user', id: actorId },
      payload: { count: input.orderedItemIds.length },
    });
  },
);
