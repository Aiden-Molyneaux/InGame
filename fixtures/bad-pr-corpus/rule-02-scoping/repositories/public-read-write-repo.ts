// DELIBERATELY BAD (rule-02-scoping — the SYS-01-PUBLIC-READ reads-only guard, OQ-122).
// The marker is READS-ONLY: it exempts a `.from`/join SELECT, never a write. Here it is (ab)used to
// smuggle an UNSCOPED cross-user UPDATE past the lint — a published predicate is present, but the verb
// is a write. A marked write fails closed (mirrors the AUTH-LOOKUP / COMMUNITY-AGGREGATE reads-only law).
import { eq, and } from 'drizzle-orm';
import { cardDesigns } from './schema';

export async function republishAnyone(exec: any, id: string) {
  // SYS-01-PUBLIC-READ: (ABUSED) claims a public read but mutates another owner's row
  return exec
    .update(cardDesigns)
    .set({ status: 'published' })
    .where(and(eq(cardDesigns.id, id), eq(cardDesigns.status, 'published')));
}
