import { and, desc, eq } from 'drizzle-orm';
import { getDb, type Executor } from '../db/client';
import {
  gameEdits,
  gameGenres,
  games,
  type GameEditRow,
  type NewGameEditRow,
} from '../db/schema';

// CAT-13/14 (M6 W-6) — the `game_edits` wiki history + the apply-side writes on `games`/`game_genres`.
// ALL GLOBAL tables (the F32 manifest): community catalog data, no actor scoping — the CAT-13 service
// gates (age-gate · MOD-07 · rate buckets · revert rights) are the write guards. The history is
// APPEND-ONLY by construction: this repo exposes NO delete and the ONLY update is the revert stamp
// (`markReverted`, conditional on `status = 'live'` so a concurrent double-revert loses cleanly).

export async function insertGameEdit(
  row: NewGameEditRow,
  exec: Executor = getDb(),
): Promise<GameEditRow> {
  const rows = await exec.insert(gameEdits).values(row).returning();
  return rows[0]!;
}

export async function getEditById(
  editId: string,
  exec: Executor = getDb(),
): Promise<GameEditRow | null> {
  const rows = await exec.select().from(gameEdits).where(eq(gameEdits.id, editId)).limit(1);
  return rows[0] ?? null;
}

/** CAT-14 — the latest history row (a reversal row is itself an edit, so it naturally wins). */
export async function latestEditForGame(
  gameId: string,
  exec: Executor = getDb(),
): Promise<GameEditRow | null> {
  const rows = await exec
    .select()
    .from(gameEdits)
    .where(eq(gameEdits.gameId, gameId))
    .orderBy(desc(gameEdits.editedAt), desc(gameEdits.id))
    .limit(1);
  return rows[0] ?? null;
}

/**
 * CAT-14 — stamp the target row reverted, CONDITIONAL on it still being live: the returning row is
 * the F36 race decider (two concurrent reverts → exactly one wins; the loser sees no row and maps to
 * the `already_reverted` refusal). The only mutation the history ever takes.
 */
export async function markReverted(
  editId: string,
  revertedBy: string,
  exec: Executor = getDb(),
): Promise<GameEditRow | null> {
  const rows = await exec
    .update(gameEdits)
    .set({ status: 'reverted', revertedBy, revertedAt: new Date() })
    .where(and(eq(gameEdits.id, editId), eq(gameEdits.status, 'live')))
    .returning();
  return rows[0] ?? null;
}

/** CAT-13 — apply a text/date edit to the canonical row (the same-tx wiki-live write). */
export async function updateGameFields(
  gameId: string,
  fields: Partial<{ studio: string | null; publisher: string | null; releaseDate: string | null }>,
  exec: Executor = getDb(),
): Promise<void> {
  await exec.update(games).set(fields).where(eq(games.id, gameId));
}

/** The game's CURRENT genre-id set (unsorted — callers sort for the canonical history value). */
export async function genreIdsForGame(
  gameId: string,
  exec: Executor = getDb(),
): Promise<string[]> {
  const rows = await exec
    .select({ genreId: gameGenres.genreId })
    .from(gameGenres)
    .where(eq(gameGenres.gameId, gameId));
  return rows.map((r) => r.genreId);
}

/** CAT-13 — the genres full-replace (delete + insert in the caller's tx; min-1 is service-enforced). */
export async function replaceGameGenres(
  gameId: string,
  genreIds: string[],
  exec: Executor = getDb(),
): Promise<void> {
  await exec.delete(gameGenres).where(eq(gameGenres.gameId, gameId));
  if (genreIds.length === 0) return;
  await exec.insert(gameGenres).values(genreIds.map((genreId) => ({ gameId, genreId })));
}
