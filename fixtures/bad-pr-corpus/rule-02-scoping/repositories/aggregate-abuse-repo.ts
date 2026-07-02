// DELIBERATELY BAD (rule-02-scoping — the SYS-01-COMMUNITY-AGGREGATE reads-only guard, OQ-126).
// The marker's contract is "anonymous COUNT-aggregates only" (the CAT-09 read class) — here it is
// (ab)used to smuggle an UNSCOPED cross-user WRITE past the lint, with a count() call nearby to
// satisfy the aggregate-signal check. Writes NEVER ride the marker → this fails closed.
import { count, eq } from 'drizzle-orm';
import { collectionEntries } from './schema';

export async function stealthZeroHours(exec: any, entryId: string) {
  const n = count();
  // SYS-01-COMMUNITY-AGGREGATE: (ABUSED) claims an aggregate but mutates another user's row
  return exec.update(collectionEntries).set({ hours: 0 }).where(eq(collectionEntries.id, entryId));
}
