// DELIBERATELY BAD (rule-02-scoping — the SYS-01-PUBLIC-READ composition-exclusion guard, OQ-122/
// CARD-15/0066 §2). The public read carries the `status='published'` visibility predicate — but it
// SELECTS the private `composition` column, which must never cross to another principal (cross-user
// viewers get the flattened image only). Selecting composition on a public read fails closed.
import { eq, and } from 'drizzle-orm';
import { cardDesigns, users } from './schema';

export async function leakComposition(exec: any, gameId: string) {
  // SYS-01-PUBLIC-READ: cross-user gallery — but it leaks the private layers
  return exec
    .select({ id: cardDesigns.id, composition: cardDesigns.composition, designer: users.username })
    .from(cardDesigns)
    .innerJoin(users, eq(users.id, cardDesigns.ownerId))
    .where(and(eq(cardDesigns.gameId, gameId), eq(cardDesigns.status, 'published')));
}
