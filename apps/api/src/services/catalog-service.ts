import type {
  CatalogItem,
  CreateGameRequest,
  DedupSuggestion,
  FriendsWhoOwnResponse,
  GenreView,
} from '@ingame/shared';
import { normalizeTitle, rankDedupCandidates, type DedupHit } from '@ingame/shared';
import { mutation } from '../db/mutation';
import type { Executor } from '../db/client';
import { isUniqueViolation } from '../db/pg-errors';
import * as catalogRepo from '../repositories/catalog-repo';
import * as collectionRepo from '../repositories/collection-repo';
import * as profileRepo from '../repositories/profile-repo';
import * as friendReadRepo from '../repositories/friend-read-repo';
import * as relationshipRepo from '../repositories/relationship-repo';
import { DuplicateSuspectedError, NotFoundError, ValidationError } from '../errors/AppError';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
import { screenText } from '../moderation/screen';
import type { GameRow } from '../db/schema';
import type { LiveGameSlim } from '../repositories/catalog-repo';

// Catalog service (CAT-01..05/09). Reads are global-catalog reads assembled into the 0.47
// search-result item shape; the ONE write (createGame) is the CAT-03 dedup-guarded @mutation.
// The matcher runs in-service over a slim projection of live rows (D5 hand-rolled trigram — fine at
// v2 community scale; the pg_trgm-indexed upgrade is the known path if the catalog outgrows it).

const SEARCH_LIMIT = 20; // capped, no paging (0.47 — search-as-you-type, like the rails)
const POPULAR_LIMIT = 12; // CAT-09/decision 0019 — capped ~12, no paging
// Search RECALL is deliberately looser than the create WARN (D5's 0.5): finding "Elden Ring" from
// "eldn rig" is the point of CAT-01+CAT-03 riding search; a candidate list over-including is
// harmless, a create over-refusing is not. A G-K-listed lever like the warn threshold.
const SEARCH_CANDIDATE_THRESHOLD = 0.3;

export async function listGenres(): Promise<{ items: GenreView[] }> {
  const rows = await catalogRepo.listGenres();
  return { items: rows.map((g) => ({ id: g.id, name: g.name })) };
}

function toSuggestion(hit: DedupHit<LiveGameSlim>): DedupSuggestion {
  return {
    id: hit.id,
    name: hit.name,
    studio: hit.studio,
    releaseDate: hit.releaseDate,
    similarity: hit.similarity,
    exact: hit.exact,
  };
}

/** Assemble GameRows into the 0.47 item shape (genres · CAT-09 counts · own-it ✓ · CAT-05 credit). */
async function assembleItems(
  actorId: string,
  rows: GameRow[],
  exec?: Executor,
): Promise<CatalogItem[]> {
  const ids = rows.map((g) => g.id);
  // Sequential on purpose: `exec` may be an open TRANSACTION (one pg client — parallel queries on
  // it are deprecated); four cheap indexed reads.
  const genreRows = await catalogRepo.genresForGames(ids, exec);
  const collections = await collectionRepo.collectionsCountByGame(ids, exec);
  const friendsHave = await collectionRepo.friendsHaveCountByGame(actorId, ids, exec);
  const owned = await collectionRepo.ownedGameIdSet(actorId, ids, exec);

  const genresByGame = new Map<string, GenreView[]>();
  for (const g of genreRows) {
    const list = genresByGame.get(g.gameId) ?? [];
    list.push({ id: g.id, name: g.name });
    genresByGame.set(g.gameId, list);
  }

  // CAT-05 contributor credit — usernames via the scoped by-id read (the F06 philosophy: the row
  // fetch rides the scoped helper; what is EXPOSED is this allowlisted { userId, username } only).
  const contributorIds = [...new Set(rows.map((g) => g.createdBy))];
  const contributors = new Map<string, string>();
  for (const id of contributorIds) {
    const row = exec
      ? await profileRepo.getOwnProfile(id, exec)
      : await profileRepo.getOwnProfile(id);
    contributors.set(id, row?.username ?? 'unknown');
  }

  return rows.map((g) => ({
    id: g.id,
    name: g.name,
    studio: g.studio,
    publisher: g.publisher,
    releaseDate: g.releaseDate,
    genres: genresByGame.get(g.id) ?? [],
    collectionsCount: collections.get(g.id) ?? 0,
    friendsHaveCount: friendsHave.get(g.id) ?? 0,
    inCollection: owned.has(g.id),
    contributor: { userId: g.createdBy, username: contributors.get(g.createdBy) ?? 'unknown' },
  }));
}

function escapeLike(fragment: string): string {
  return fragment.replace(/[\\%_]/g, '\\$&');
}

/** CAT-01 — substring matches ∪ CAT-03 near-candidates (a typo still finds the game), capped. */
export async function search(actorId: string, q: string): Promise<{ items: CatalogItem[] }> {
  const normalized = normalizeTitle(q);
  if (normalized.length === 0) return { items: [] };

  const [substringRows, pool] = await Promise.all([
    catalogRepo.searchLiveByNormalized(escapeLike(normalized), SEARCH_LIMIT),
    catalogRepo.listLiveGamesSlim(),
  ]);
  const candidates = rankDedupCandidates(q, pool, { threshold: SEARCH_CANDIDATE_THRESHOLD });

  const orderedIds: string[] = [];
  for (const row of substringRows) orderedIds.push(row.id);
  for (const hit of candidates) if (!orderedIds.includes(hit.id)) orderedIds.push(hit.id);
  const ids = orderedIds.slice(0, SEARCH_LIMIT);

  const rows = await catalogRepo.gamesByIds(ids);
  const byId = new Map(rows.map((r) => [r.id, r]));
  const ordered = ids.map((id) => byId.get(id)).filter((r): r is GameRow => Boolean(r));
  return { items: await assembleItems(actorId, ordered) };
}

/** CAT-09 — the POPULAR FIRST ADDS rail: most-collected first, capped ~12 (decision 0019). */
export async function popular(actorId: string): Promise<{ items: CatalogItem[] }> {
  const pool = await catalogRepo.listLiveGamesSlim();
  const counts = await collectionRepo.collectionsCountByGame(pool.map((g) => g.id));
  const topIds = pool
    .map((g) => ({ id: g.id, name: g.name, n: counts.get(g.id) ?? 0 }))
    .sort((a, b) => b.n - a.n || a.name.localeCompare(b.name))
    .slice(0, POPULAR_LIMIT)
    .map((g) => g.id);
  const rows = await catalogRepo.gamesByIds(topIds);
  const byId = new Map(rows.map((r) => [r.id, r]));
  const ordered = topIds.map((id) => byId.get(id)).filter((r): r is GameRow => Boolean(r));
  return { items: await assembleItems(actorId, ordered) };
}

/**
 * CAT-09c — GET /catalog/games/:id/friends-who-own: the VIEWER's accepted friends who own the game +
 * their hours (PROF-03-gated). Rooted at the actor's friend set (friendReadRepo.friendsWhoOwnGame uses
 * the SYS-01-FRIEND-READ friendScoped gate), so a blocked friend is absent by construction (a block
 * severs the friendship — SOC-09). An unknown game → 404 (it isn't in the catalog). `count` is the named
 * list length (at M6 every visible friend who owns it is named — the count-only fallback is the PROF-03
 * seam for a future per-facet hours-privacy setting). SEAM: the contract draws this on GET /catalog/
 * games/:id (the aggregate game-detail endpoint, not yet built) — served here as a focused route.
 */
export async function friendsWhoOwn(actorId: string, gameId: string): Promise<FriendsWhoOwnResponse> {
  if (!UUID_RE.test(gameId)) throw new NotFoundError('Game not found.');
  const [game] = await catalogRepo.gamesByIds([gameId]);
  if (!game) throw new NotFoundError('Game not found.');
  const rows = await friendReadRepo.friendsWhoOwnGame(actorId, gameId);
  // SOC-09 defense-in-depth — a block hides the person even if a stray accepted-friendship row survived
  // (in prod a block severs the bond, so friendScoped already excludes them; this is the belt-and-braces
  // the SOC-09 sweep asks for — blocked-either-direction is filtered regardless of the friendship state).
  const blocked = await relationshipRepo.listBlockedIds(actorId, rows.map((r) => r.userId));
  const visible = blocked.size === 0 ? rows : rows.filter((r) => !blocked.has(r.userId));
  const friendsWhoOwn = visible.map((r) => ({
    userId: r.userId,
    username: r.username,
    avatarUrl: r.avatarUrl,
    hours: r.hours, // PROF-03: exposed to a friend at M6 (the per-facet hide toggle is a future seam)
  }));
  return { friendsWhoOwn, count: friendsWhoOwn.length };
}

function screenedField(path: string, value: string | undefined): void {
  if (value !== undefined && !screenText(value)) {
    throw new ValidationError('That text isn’t allowed.', 'screened', [
      { path, message: 'That text isn’t allowed.' },
    ]);
  }
}

/**
 * @mutation — POST /catalog/games (CAT-02/03/04/05). Genres validated against the controlled list;
 * name/studio/publisher screened (MOD-07); the CAT-03 dedup warn refuses with candidates unless
 * overridden (exact-normalized never overridable — decision 0058). The DB's partial unique index on
 * normalized_name is the F36 race decider; a losing INSERT surfaces as DUPLICATE_SUSPECTED too.
 */
const createGameMutation = mutation(
  {
    name: 'catalog.createGame',
    specIds: ['CAT-02', 'CAT-03', 'CAT-04', 'CAT-05', 'MOD-07', 'SYS-01', 'SYS-02'],
  },
  async (ctx, actorId, input: CreateGameRequest): Promise<CatalogItem> => {
    screenedField('name', input.name);
    screenedField('studio', input.studio);
    screenedField('publisher', input.publisher);

    const genreIds = [...new Set(input.genreIds)];
    const known = await catalogRepo.genresByIds(genreIds, ctx.tx);
    if (known.length !== genreIds.length) {
      throw new ValidationError('Unknown genre.', 'unknown_genre', [
        { path: 'genreIds', message: 'Contains a genre that is not on the controlled list.' },
      ]);
    }

    const pool = await catalogRepo.listLiveGamesSlim(ctx.tx);
    const hits = rankDedupCandidates(input.name, pool);
    const blocked = hits.length > 0 && (!input.dedupOverride || hits.some((h) => h.exact));
    if (blocked) throw new DuplicateSuspectedError(hits.map(toSuggestion));

    const game = await catalogRepo.insertGame(
      {
        name: input.name,
        normalizedName: normalizeTitle(input.name),
        studio: input.studio ?? null,
        publisher: input.publisher ?? null,
        releaseDate: input.releaseDate ?? null,
        createdBy: actorId,
      },
      ctx.tx,
    );
    await catalogRepo.insertGameGenres(game.id, genreIds, ctx.tx);

    await ctx.emit({
      eventType: 'catalog.game_created',
      entityRef: { type: 'game', id: game.id },
      payload: {}, // ids ride the envelope; no free text in the event spine (F18)
    });

    const [item] = await assembleItems(actorId, [game], ctx.tx);
    return item!;
  },
);

export async function createGame(actorId: string, input: CreateGameRequest): Promise<CatalogItem> {
  try {
    return await createGameMutation(actorId, input);
  } catch (e) {
    // The F36 race loser: the partial unique index refused the same normalized title. The failed tx
    // is already rolled back — re-rank on a FRESH read so the client gets the winner as a suggestion.
    if (isUniqueViolation(e)) {
      const pool = await catalogRepo.listLiveGamesSlim();
      throw new DuplicateSuspectedError(rankDedupCandidates(input.name, pool).map(toSuggestion));
    }
    throw e;
  }
}
