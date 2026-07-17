// DELIBERATELY BAD (rule-02-scoping — the SYS-01-PUBLIC-READ predicate guard, OQ-122/decision 0073).
// The P3 REGRESSION: this marked gallery read has had its `publishedOnly(...)` visibility predicate
// STRIPPED — `.where(eq(cardDesigns.gameId, gameId))` carries no `status='published'` filter, so it
// leaks every card_design (drafts + private). It must fail closed. The trap the old ±16-line window
// fell into: the `publishedOnly` helper is DEFINED just above AND a SIBLING marked read
// (findPublishedDesignById) calls `publishedOnly(...)` just below — a neighbouring predicate that must
// NOT launder this predicate-less statement. The predicate now binds to the marked statement itself.
import { eq, and } from 'drizzle-orm';
import { cardDesigns, users } from './schema';

// The visibility-predicate helper — its DEFINITION mentions 'published' and is `publishedOnly(`, but it
// belongs to a different statement and must not count as this read's predicate.
export function publishedOnly(extra: any) {
  const pub = eq(cardDesigns.status, 'published');
  return extra ? and(pub, extra) : pub;
}

export async function listPublishedDesignsForGame(exec: any, gameId: string) {
  // SYS-01-PUBLIC-READ — cross-user gallery: published cards only, flattened image urls, never composition.
  return exec
    .select({ id: cardDesigns.id, name: cardDesigns.name, designer: users.username })
    .from(cardDesigns)
    .innerJoin(users, eq(users.id, cardDesigns.ownerId))
    .where(eq(cardDesigns.gameId, gameId));
}

export async function findPublishedDesignById(exec: any, cardId: string) {
  // SYS-01-PUBLIC-READ — cross-user adopt lookup: published cards only, never the private composition.
  const rows = await exec
    .select({ id: cardDesigns.id, name: cardDesigns.name, designer: users.username })
    .from(cardDesigns)
    .innerJoin(users, eq(users.id, cardDesigns.ownerId))
    .where(publishedOnly(eq(cardDesigns.id, cardId)))
    .limit(1);
  return rows[0] ?? null;
}
