import { and, eq, ilike, inArray, isNull } from 'drizzle-orm';
import { getDb, type Executor } from '../db/client';
import {
  games,
  gameGenres,
  genres,
  type GameRow,
  type GenreRow,
  type NewGameRow,
} from '../db/schema';

// Catalog repository — `games` / `genres` / `game_genres` are GLOBAL tables (the F32 manifest):
// community data every user reads; no actor scoping applies (rule-2 allowlists them). The only
// write path is the CAT-03 dedup-guarded create service.

export async function listGenres(exec: Executor = getDb()): Promise<GenreRow[]> {
  return exec.select().from(genres).orderBy(genres.name);
}

export async function genresByIds(ids: string[], exec: Executor = getDb()): Promise<GenreRow[]> {
  if (ids.length === 0) return [];
  return exec.select().from(genres).where(inArray(genres.id, ids));
}

/** The slim LIVE-catalog projection the CAT-03 matcher scans (plus the suggestion-row fields). */
export interface LiveGameSlim {
  id: string;
  name: string;
  normalizedName: string;
  studio: string | null;
  releaseDate: string | null;
}

export async function listLiveGamesSlim(exec: Executor = getDb()): Promise<LiveGameSlim[]> {
  return exec
    .select({
      id: games.id,
      name: games.name,
      normalizedName: games.normalizedName,
      studio: games.studio,
      releaseDate: games.releaseDate,
    })
    .from(games)
    .where(isNull(games.deletedAt));
}

/** CAT-01 — normalized-substring title match over LIVE rows (the fragment arrives LIKE-escaped). */
export async function searchLiveByNormalized(
  escapedFragment: string,
  limit: number,
  exec: Executor = getDb(),
): Promise<GameRow[]> {
  return exec
    .select()
    .from(games)
    .where(and(isNull(games.deletedAt), ilike(games.normalizedName, `%${escapedFragment}%`)))
    .orderBy(games.normalizedName)
    .limit(limit);
}

export async function gamesByIds(ids: string[], exec: Executor = getDb()): Promise<GameRow[]> {
  if (ids.length === 0) return [];
  return exec
    .select()
    .from(games)
    .where(and(inArray(games.id, ids), isNull(games.deletedAt)));
}

export async function insertGame(row: NewGameRow, exec: Executor = getDb()): Promise<GameRow> {
  const rows = await exec.insert(games).values(row).returning();
  return rows[0]!;
}

export async function insertGameGenres(
  gameId: string,
  genreIds: string[],
  exec: Executor = getDb(),
): Promise<void> {
  if (genreIds.length === 0) return;
  await exec.insert(gameGenres).values(genreIds.map((genreId) => ({ gameId, genreId })));
}

/** Genres per game for item assembly (a global×global join). */
/** CAT-05/07 — a contributor's LIVE added games (createdBy = target, not soft-deleted). GLOBAL table. */
export async function listGamesAddedBy(
  contributorId: string,
  exec: Executor = getDb(),
): Promise<Array<{ id: string; name: string }>> {
  return exec
    .select({ id: games.id, name: games.name })
    .from(games)
    .where(and(eq(games.createdBy, contributorId), isNull(games.deletedAt)));
}

export async function genresForGames(
  gameIds: string[],
  exec: Executor = getDb(),
): Promise<Array<{ gameId: string; id: string; name: string }>> {
  if (gameIds.length === 0) return [];
  return exec
    .select({ gameId: gameGenres.gameId, id: genres.id, name: genres.name })
    .from(gameGenres)
    .innerJoin(genres, eq(genres.id, gameGenres.genreId))
    .where(inArray(gameGenres.gameId, gameIds));
}
