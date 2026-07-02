// DELIBERATELY BAD (rule-02-scoping — the OQ-118 join hole). The FROM table (`games`) is on the F32
// global manifest, but the JOIN drags the user-owned `collection_entries` into the read with no
// SYS-01 scope — a cross-user leak the from-only detection missed. (Under the corpus root the
// manifest is absent so `games` ALSO fails closed; the precise join-specific assertion lives in
// tools/lint/rules/rule-02-scoping.test.mjs, which runs against the real manifest.)
import { eq } from 'drizzle-orm';
import { games, collectionEntries } from './schema';

export async function leakEntriesViaJoin(exec: any, gameId: string) {
  // ❌ an unscoped user-owned JOIN — every user's collection rows for this game
  return exec
    .select()
    .from(games)
    .leftJoin(collectionEntries, eq(collectionEntries.gameId, games.id))
    .where(eq(games.id, gameId));
}
