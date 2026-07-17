// DELIBERATELY BAD (rule-02-scoping — the SYS-01-FRIEND-READ predicate guard, decision 0076 §0.1).
// The marker's contract is "cross-user reads carrying an explicit ACCEPTED-FRIENDSHIP predicate"
// (`friendScoped(...)` or an `'accepted'` status literal). Here it is (ab)used to smuggle an UNSCOPED
// cross-user read of ANY user's friend-only profile row past the lint, with NO friendship predicate —
// so a non-friend leaks the full shape (the G-D leak). A predicate-less friend read fails closed.
import { eq } from 'drizzle-orm';
import { users } from './schema';

export async function leakAnyProfile(exec: any, targetId: string) {
  // SYS-01-FRIEND-READ: (ABUSED) claims a friend read but carries no accepted-friendship predicate
  return exec.select({ id: users.id, bio: users.bio }).from(users).where(eq(users.id, targetId));
}
