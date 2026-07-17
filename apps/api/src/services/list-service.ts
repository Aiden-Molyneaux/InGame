import {
  TOP_TEN_MAX,
  type AddListItemRequest,
  type ListItemView,
  type ListsResponse,
  type ListView,
  type RerankListRequest,
} from '@ingame/shared';
import { mutation } from '../db/mutation';
import type { Executor } from '../db/client';
import { acquireActorLock } from '../db/locks';
import * as listRepo from '../repositories/list-repo';
import * as catalogRepo from '../repositories/catalog-repo';
import * as collectionRepo from '../repositories/collection-repo';
import { equippedCardsByGameId } from './collection-service';
import { toCardRider } from './card-service';
import { ListFullError, NotFoundError, ValidationError } from '../errors/AppError';

// SOC-04 Top-10 lists service (M6 P5). `lists`/`list_items` are USER-OWNED — every write is
// actor-scoped (SYS-01). v2 ships exactly ONE kind (`'top10'`); general lists stay parked (§10).
//
// THE WIRE `id` (a P5 design call, flagged): the api-contract draws GET/POST/PATCH/DELETE against
// `/me/lists` (+ `/:id/items`) but enumerates no create-a-list endpoint — the list is meant to
// "auto-create lazily on first write." Since v2 has exactly one list per user (kind=top10), the wire
// `id` a client addresses is the STABLE KIND STRING `'top10'`, not an internal DB uuid the client would
// otherwise have no way to learn before the list exists. `assertTopTenId` below is the route guard
// that makes this concrete; anything else 404s (general lists aren't built).

const TOP_TEN_KIND = 'top10';

function assertTopTenId(id: string): void {
  if (id !== TOP_TEN_KIND) throw new NotFoundError('List not found.');
}

async function toItemView(actorId: string, gameId: string, rank: number, exec?: Executor): Promise<ListItemView> {
  const cards = exec
    ? await equippedCardsByGameId(actorId, [gameId], exec)
    : await equippedCardsByGameId(actorId, [gameId]);
  return { gameId, rank, card: cards.get(gameId) ?? toCardRider(null) };
}

/** GET /me/lists — v2 always returns the one top10 list (empty items when never written, no
 *  eagerly-created row: a GET never writes, mirrors device_configs' free-defaults-on-read posture). */
export async function listLists(actorId: string): Promise<ListsResponse> {
  const list = await listRepo.findListByUser(actorId, TOP_TEN_KIND);
  if (!list) return [{ id: TOP_TEN_KIND, kind: 'top10', items: [] }];
  const rows = await listRepo.listItemsForList(actorId, list.id);
  if (rows.length === 0) return [{ id: TOP_TEN_KIND, kind: 'top10', items: [] }];
  const cards = await equippedCardsByGameId(actorId, rows.map((r) => r.game.id));
  const view: ListView = {
    id: TOP_TEN_KIND,
    kind: 'top10',
    items: rows.map((r) => ({ gameId: r.game.id, rank: r.item.rank, card: cards.get(r.game.id) ?? toCardRider(null) })),
  };
  return [view];
}

/**
 * @mutation — POST /me/lists/:id/items (SOC-04/COL-13). Membership is drawn from the actor's OWN
 * collection (product-spec COL-13: "+ ADD → CardPicker sheet (search your collection …)"; the
 * api-contract row is silent on this constraint — a P5 design call, flagged for the api-contract
 * owner). Cap-10 → 409 LIST_FULL. A duplicate-add is an IDEMPOTENT no-op returning the existing
 * membership (mirrors the queue's posture, P5 design) — not an error; re-adding what's already #4
 * shouldn't need special handling client-side.
 */
export const addListItem = mutation(
  { name: 'lists.addItem', specIds: ['SOC-04', 'SYS-01', 'SYS-02'] },
  async (ctx, actorId, id: string, input: AddListItemRequest): Promise<ListItemView> => {
    assertTopTenId(id);
    const [game] = await catalogRepo.gamesByIds([input.gameId], ctx.tx);
    if (!game) {
      throw new ValidationError('That game is not in the catalog.', 'unknown_game', [
        { path: 'gameId', message: 'That game is not in the catalog.' },
      ]);
    }
    if (!(await collectionRepo.findOwnedEntryByGame(actorId, input.gameId, ctx.tx))) {
      throw new ValidationError('Add it to your collection before your Top-10.', 'not_in_collection', [
        { path: 'gameId', message: 'Add it to your collection before your Top-10.' },
      ]);
    }

    await acquireActorLock(ctx.tx, 'list:top10', actorId); // F36 — serialize the cap-10 check-then-insert
    const list = await listRepo.getOrCreateList(actorId, TOP_TEN_KIND, ctx.tx); // lazy-create on write

    const existing = await listRepo.findItemByGame(actorId, list.id, input.gameId, ctx.tx);
    if (existing) {
      return toItemView(actorId, game.id, existing.rank, ctx.tx); // idempotent no-op — no emit
    }
    if ((await listRepo.countItems(actorId, list.id, ctx.tx)) >= TOP_TEN_MAX) {
      throw new ListFullError('Your Top-10 is full.');
    }
    const rank = await listRepo.nextRank(actorId, list.id, ctx.tx);
    const row = await listRepo.insertItem(actorId, list.id, input.gameId, rank, ctx.tx);
    await ctx.emit({
      eventType: 'list.item_added',
      entityRef: { type: 'list', id: list.id },
      payload: { kind: TOP_TEN_KIND, gameId: game.id },
    });
    return toItemView(actorId, game.id, row.rank, ctx.tx);
  },
);

/** @mutation — DELETE /me/lists/:id/items/:gameId (SOC-04). */
export const removeListItem = mutation(
  { name: 'lists.removeItem', specIds: ['SOC-04', 'SYS-01'] },
  async (ctx, actorId, id: string, gameId: string): Promise<void> => {
    assertTopTenId(id);
    const list = await listRepo.findListByUser(actorId, TOP_TEN_KIND, ctx.tx);
    if (!list) throw new NotFoundError('Not in your Top-10.');
    const removed = await listRepo.deleteItem(actorId, list.id, gameId, ctx.tx);
    if (!removed) throw new NotFoundError('Not in your Top-10.');
    await ctx.emit({
      eventType: 'list.item_removed',
      entityRef: { type: 'list', id: list.id },
      payload: { kind: TOP_TEN_KIND, gameId },
    });
  },
);

/**
 * @mutation — PATCH /me/lists/:id (SOC-04/COL-07/13): the Top-10 ARRANGE re-rank — a FULL
 * permutation of the actor's current Top-10 membership. F36 — a per-actor advisory lock serializes
 * concurrent re-ranks: `setRanks` issues N sequential row UPDATEs in the CALLER-CHOSEN order, so two
 * concurrent re-ranks with DIFFERENT target orderings can lock the same rows in opposite sequences —
 * a Postgres DEADLOCK (uncaught, surfaces as a raw 500) rather than a clean "last-commit-wins"
 * convergence. The lock makes concurrent re-ranks fully serial instead (see the F36 test).
 */
export const rerankList = mutation(
  { name: 'lists.rerank', specIds: ['SOC-04', 'COL-07', 'SYS-01', 'SYS-02'] },
  async (ctx, actorId, id: string, input: RerankListRequest): Promise<void> => {
    assertTopTenId(id);
    await acquireActorLock(ctx.tx, 'list:top10:rerank', actorId);
    const list = await listRepo.findListByUser(actorId, TOP_TEN_KIND, ctx.tx);
    if (!list) throw new NotFoundError('Not in your Top-10.'); // nothing exists yet to re-rank
    const ownedIds = await listRepo.listItemGameIds(actorId, list.id, ctx.tx);
    const provided = new Set(input.orderedGameIds);
    const isPermutation =
      provided.size === input.orderedGameIds.length &&
      provided.size === ownedIds.length &&
      ownedIds.every((gid) => provided.has(gid));
    if (!isPermutation) {
      throw new ValidationError('The order must include exactly your Top-10.', 'not_a_permutation', [
        { path: 'orderedGameIds', message: 'Must be a full permutation of your Top-10 members.' },
      ]);
    }
    await listRepo.setRanks(actorId, list.id, input.orderedGameIds, ctx.tx);
    await ctx.emit({
      eventType: 'list.reranked',
      entityRef: { type: 'list', id: list.id },
      payload: { kind: TOP_TEN_KIND, count: input.orderedGameIds.length },
    });
  },
);
