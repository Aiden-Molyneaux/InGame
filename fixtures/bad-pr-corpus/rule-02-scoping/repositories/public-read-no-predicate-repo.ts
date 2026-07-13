// DELIBERATELY BAD (rule-02-scoping — the SYS-01-PUBLIC-READ predicate guard, OQ-122/decision 0073).
// The marker's contract is "reads carrying an explicit `status='published'` visibility predicate" —
// here it is (ab)used to smuggle an UNSCOPED cross-user read of EVERY card_design (drafts + private
// included) past the lint, with NO visibility predicate. A predicate-less public read fails closed.
import { cardDesigns } from './schema';

export async function leakEveryCard(exec: any) {
  // SYS-01-PUBLIC-READ: (ABUSED) claims a public read but carries no visibility predicate
  return exec.select({ id: cardDesigns.id, name: cardDesigns.name }).from(cardDesigns);
}
