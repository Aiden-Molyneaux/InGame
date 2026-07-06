import {
  type AddCollectionEntryRequest,
  type CollectionItem,
  type CollectionResponse,
  type GenreView,
  type NowPlayingRequest,
  type ReorderCollectionRequest,
  type UpdateCollectionEntryRequest,
} from '@ingame/shared';
import { mutation } from '../db/mutation';
import type { Executor } from '../db/client';
import { isUniqueViolation } from '../db/pg-errors';
import * as collectionRepo from '../repositories/collection-repo';
import * as catalogRepo from '../repositories/catalog-repo';
import * as profileRepo from '../repositories/profile-repo';
import * as cardRepo from '../repositories/card-repo';
import { toCardRider } from './card-service';
import { NotFoundError, ValidationError } from '../errors/AppError';
import type { CardDesignRow, CollectionEntryRow, GameRow } from '../db/schema';

// A malformed :entryId path param would otherwise reach Postgres as an invalid uuid cast (22P02 → 500);
// treat it as the same 404 an unknown id gets (mirrors users-service's target-id guard).
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Collection service (COL-01..07, WTP-03). collection_entries is USER-OWNED — every path here is
// actor-scoped (SYS-01); actor-B reaching for actor-A's entry gets the SAME 404 an unknown id gets
// (no existence oracle). M3 posture (decision 0058/D2/D4): the list is unpaginated with honest
// totals; the drawer's sort/filter/search executes client-side.

// The `card` rider resolves per CARD-18 (decision 0066 §5): the EQUIPPED design → else the shared
// default-face stub. An equipped design carries `name` + `composition` — OWNER-ONLY (0066 §2; this
// serializer feeds /me only. A cross-user serializer must NEVER emit `composition` — CARD-15).

function releaseYearOf(releaseDate: string | null): number | null {
  if (!releaseDate) return null;
  const year = Number(releaseDate.slice(0, 4));
  return Number.isFinite(year) ? year : null;
}

function toItem(
  entry: CollectionEntryRow,
  game: GameRow,
  genres: GenreView[],
  nowPlayingGameId: string | null,
  design: CardDesignRow | null = null,
): CollectionItem {
  return {
    entryId: entry.id,
    gameId: game.id,
    title: game.name,
    developer: game.studio,
    publisher: game.publisher,
    releaseYear: releaseYearOf(game.releaseDate),
    genres,
    hours: entry.hours,
    percentComplete: entry.percentComplete,
    status: entry.status as CollectionItem['status'],
    ownedSince: entry.ownedSince,
    addedAt: entry.createdAt.toISOString(), // OQ-128 — immutable add timestamp for the RECENT sort
    nowPlaying: game.id === nowPlayingGameId,
    card: toCardRider(design),
    rating: entry.rating, // OQ-134 (api 0.53) — owner-only readback
    notes: entry.notes,
  };
}

async function genresByGameId(gameIds: string[], exec?: Executor): Promise<Map<string, GenreView[]>> {
  const rows = await catalogRepo.genresForGames(gameIds, exec);
  const map = new Map<string, GenreView[]>();
  for (const g of rows) {
    const list = map.get(g.gameId) ?? [];
    list.push({ id: g.id, name: g.name });
    map.set(g.gameId, list);
  }
  return map;
}

async function assembleItem(
  actorId: string,
  entry: CollectionEntryRow,
  game: GameRow,
  exec?: Executor,
): Promise<CollectionItem> {
  // Sequential on purpose — `exec` may be an open transaction (one pg client).
  const genres = await genresByGameId([game.id], exec);
  const user = exec
    ? await profileRepo.getOwnProfile(actorId, exec)
    : await profileRepo.getOwnProfile(actorId);
  const design = entry.activeCardDesignId
    ? exec
      ? await cardRepo.findOwnedDesign(actorId, entry.activeCardDesignId, exec)
      : await cardRepo.findOwnedDesign(actorId, entry.activeCardDesignId)
    : null;
  return toItem(entry, game, genres.get(game.id) ?? [], user?.nowPlayingGameId ?? null, design);
}

/** GET /me/collection — the whole shelf in manual order; honest totals (the C4 class). */
export async function listCollection(actorId: string): Promise<CollectionResponse> {
  const rows = await collectionRepo.listEntriesWithGames(actorId);
  const user = await profileRepo.getOwnProfile(actorId);
  const genres = await genresByGameId(rows.map((r) => r.game.id));
  // Bulk-resolve the equipped designs (COL-06/CARD-18) — own rows only, one query.
  const equippedIds = rows
    .map((r) => r.entry.activeCardDesignId)
    .filter((id): id is string => id !== null);
  const designs = await cardRepo.ownedDesignsByIds(actorId, equippedIds);
  const items = rows.map((r) =>
    toItem(
      r.entry,
      r.game,
      genres.get(r.game.id) ?? [],
      user?.nowPlayingGameId ?? null,
      r.entry.activeCardDesignId ? (designs.get(r.entry.activeCardDesignId) ?? null) : null,
    ),
  );
  return { items, nextCursor: null, total: items.length, collectionTotal: items.length };
}

async function liveGameOr422(gameId: string, exec: Executor): Promise<GameRow> {
  const [game] = await catalogRepo.gamesByIds([gameId], exec);
  if (!game) {
    throw new ValidationError('That game is not in the catalog.', 'unknown_game', [
      { path: 'gameId', message: 'That game is not in the catalog.' },
    ]);
  }
  return game;
}

function alreadyInCollection(): ValidationError {
  return new ValidationError('Already in your collection.', 'already_in_collection', [
    { path: 'gameId', message: 'Already in your collection.' },
  ]);
}

/** @mutation — POST /me/collection (COL-01). Appends at the end of the manual order. */
const addEntryMutation = mutation(
  { name: 'collection.addEntry', specIds: ['COL-01', 'COL-07', 'SYS-01', 'SYS-02'] },
  async (ctx, actorId, input: AddCollectionEntryRequest): Promise<CollectionItem> => {
    const game = await liveGameOr422(input.gameId, ctx.tx);
    if (await collectionRepo.findOwnedEntryByGame(actorId, input.gameId, ctx.tx)) {
      throw alreadyInCollection();
    }
    const position = await collectionRepo.nextPosition(actorId, ctx.tx);
    const ownedSince = new Date().toISOString().slice(0, 10); // COL-03 — defaults to the add date
    const entry = await collectionRepo.insertEntry(
      actorId,
      { gameId: input.gameId, ownedSince, position },
      ctx.tx,
    );
    await ctx.emit({
      eventType: 'collection.entry_added',
      entityRef: { type: 'collection_entry', id: entry.id },
      payload: { gameId: game.id },
    });
    return assembleItem(actorId, entry, game, ctx.tx);
  },
);

export async function addEntry(
  actorId: string,
  input: AddCollectionEntryRequest,
): Promise<CollectionItem> {
  try {
    return await addEntryMutation(actorId, input);
  } catch (e) {
    // The F36 double-add race loser — the unique (user, game) pair index refused the second row.
    if (isUniqueViolation(e)) throw alreadyInCollection();
    throw e;
  }
}

/** @mutation — PATCH /me/collection/:entryId (COL-02/03/05 + the COL-06 equip, api 0.53/0066). */
export const updateEntry = mutation(
  {
    name: 'collection.updateEntry',
    specIds: ['COL-02', 'COL-03', 'COL-05', 'COL-06', 'SYS-01', 'SYS-02'],
  },
  async (
    ctx,
    actorId,
    entryId: string,
    input: UpdateCollectionEntryRequest,
  ): Promise<CollectionItem> => {
    if (!UUID_RE.test(entryId)) throw new NotFoundError('Collection entry not found.');
    const current = await collectionRepo.findOwnedEntry(actorId, entryId, ctx.tx);
    if (!current) throw new NotFoundError('Collection entry not found.'); // same 404 as unknown id

    const fields: collectionRepo.EntryUpdate = {};
    const changed: string[] = [];
    for (const key of ['status', 'hours', 'percentComplete', 'ownedSince', 'rating', 'notes'] as const) {
      if (input[key] !== undefined) {
        (fields as Record<string, unknown>)[key] = input[key];
        changed.push(key);
      }
    }

    // COL-06 equip (decision 0066 §5): the caller's OWN design, for THIS game, private|published —
    // a failed validation must NOT equip (422, a body-field error, not a 404).
    if (input.activeCardDesignId !== undefined) {
      if (input.activeCardDesignId !== null) {
        const design = await cardRepo.findOwnedDesign(actorId, input.activeCardDesignId, ctx.tx);
        if (!design) {
          throw new ValidationError('That card design does not exist.', 'unknown_design', [
            { path: 'activeCardDesignId', message: 'Pick one of your own designs.' },
          ]);
        }
        if (design.gameId !== current.gameId) {
          throw new ValidationError('That design is for a different game.', 'design_wrong_game', [
            { path: 'activeCardDesignId', message: 'Pick a design made for this game.' },
          ]);
        }
        if (design.status === 'draft') {
          // Drafts are resume-editing handles, not equippable faces (0066 §5).
          throw new ValidationError('Drafts cannot be equipped.', 'design_not_equippable', [
            { path: 'activeCardDesignId', message: 'Finish the draft first (KEEP or SAVE PRIVATE).' },
          ]);
        }
      }
      fields.activeCardDesignId = input.activeCardDesignId;
      changed.push('activeCardDesignId');
    }

    // An empty PATCH body is a no-op that would slip past a mutation without emitting (rule-5) — reject it.
    if (changed.length === 0) {
      throw new ValidationError('Provide at least one field to update.', 'empty_update');
    }
    const entry = (await collectionRepo.updateOwnedEntry(actorId, entryId, fields, ctx.tx)) ?? current;
    await ctx.emit({
      eventType: 'collection.entry_updated',
      entityRef: { type: 'collection_entry', id: entryId },
      payload: { fields: changed }, // the changed field-set, never the values (F18)
    });
    if (changed.includes('activeCardDesignId')) {
      await ctx.emit({
        eventType: 'collection.card_equipped',
        entityRef: { type: 'collection_entry', id: entryId },
        payload: { designId: input.activeCardDesignId ?? null },
      });
    }
    const game = await liveGameOr422(entry.gameId, ctx.tx);
    return assembleItem(actorId, entry, game, ctx.tx);
  },
);

/** @mutation — DELETE /me/collection/:entryId (COL-01). */
export const removeEntry = mutation(
  { name: 'collection.removeEntry', specIds: ['COL-01', 'SYS-01'] },
  async (ctx, actorId, entryId: string): Promise<void> => {
    if (!UUID_RE.test(entryId)) throw new NotFoundError('Collection entry not found.');
    const removed = await collectionRepo.deleteOwnedEntry(actorId, entryId, ctx.tx);
    if (!removed) throw new NotFoundError('Collection entry not found.');
    await ctx.emit({
      eventType: 'collection.entry_removed',
      entityRef: { type: 'collection_entry', id: entryId },
      payload: {},
    });
  },
);

/** @mutation — PATCH /me/collection/reorder (COL-07): a FULL permutation of the actor's shelf. */
export const reorder = mutation(
  { name: 'collection.reorder', specIds: ['COL-07', 'SYS-01', 'SYS-02'] },
  async (ctx, actorId, input: ReorderCollectionRequest): Promise<void> => {
    const ownedIds = await collectionRepo.listOwnedEntryIds(actorId, ctx.tx);
    const provided = new Set(input.orderedEntryIds);
    const isPermutation =
      provided.size === input.orderedEntryIds.length &&
      provided.size === ownedIds.length &&
      ownedIds.every((id) => provided.has(id));
    if (!isPermutation) {
      throw new ValidationError(
        'The order must include exactly your collection.',
        'not_a_permutation',
        [{ path: 'orderedEntryIds', message: 'Must be a full permutation of your entries.' }],
      );
    }
    await collectionRepo.setPositions(actorId, input.orderedEntryIds, ctx.tx);
    await ctx.emit({
      eventType: 'collection.reordered',
      entityRef: { type: 'user', id: actorId },
      payload: { count: input.orderedEntryIds.length },
    });
  },
);

/** @mutation — PUT /me/now-playing (WTP-03): the single pin, set/cleared. */
export const setNowPlaying = mutation(
  { name: 'collection.setNowPlaying', specIds: ['WTP-03', 'SYS-01', 'SYS-02'] },
  async (ctx, actorId, input: NowPlayingRequest): Promise<void> => {
    if (input.gameId !== null) {
      await liveGameOr422(input.gameId, ctx.tx);
      // WTP-03 — the pin must be a game ON the actor's shelf, not just any live catalog game.
      if (!(await collectionRepo.findOwnedEntryByGame(actorId, input.gameId, ctx.tx))) {
        throw new ValidationError('That game is not in your collection.', 'not_in_collection', [
          { path: 'gameId', message: 'Pick a game from your collection.' },
        ]);
      }
    }
    const updated = await profileRepo.updateOwnProfile(
      actorId,
      { nowPlayingGameId: input.gameId },
      ctx.tx,
    );
    if (!updated) throw new NotFoundError('Profile not found.');
    await ctx.emit({
      eventType: 'collection.now_playing_set',
      entityRef: { type: 'user', id: actorId },
      payload: { gameId: input.gameId },
    });
  },
);
