import { and, asc, desc, eq, gt, ilike, inArray, isNull, lte } from 'drizzle-orm';
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

/**
 * CAT-08 (M6 P7) — LIVE-catalog rows with a `releaseDate` STRICTLY after `today` (a game releasing
 * today has already released — not "upcoming"). Ordered soonest-first, the caller caps (~12, the
 * `/catalog/popular` limit posture — the actual sibling in code; see catalog-service.upcoming). `today`
 * is a caller-supplied `YYYY-MM-DD` string so the boundary is a stable UTC date, not the DB server's
 * local clock/tz.
 */
export async function upcomingLive(
  today: string,
  limit: number,
  exec: Executor = getDb(),
): Promise<GameRow[]> {
  return exec
    .select()
    .from(games)
    .where(and(isNull(games.deletedAt), gt(games.releaseDate, today)))
    .orderBy(asc(games.releaseDate))
    .limit(limit);
}

/**
 * CAT-11 (M6 W-C7) — LIVE-catalog rows with a `releaseDate` at-or-before `today` (a game releasing
 * TODAY has already released — it belongs here, the exact complement of `upcomingLive`'s strict-after
 * boundary). Ordered most-recently-released FIRST (`releaseDate` desc), the caller caps (~12, the
 * `/catalog/popular` limit posture). A null `releaseDate` never satisfies `lte`, so undated games are
 * excluded by construction (same as `upcomingLive`). `today` is a caller-supplied `YYYY-MM-DD` string so
 * the boundary is a stable UTC date, not the DB server's local clock/tz.
 */
export async function newReleasesLive(
  today: string,
  limit: number,
  exec: Executor = getDb(),
): Promise<GameRow[]> {
  return exec
    .select()
    .from(games)
    .where(and(isNull(games.deletedAt), lte(games.releaseDate, today)))
    .orderBy(desc(games.releaseDate))
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
