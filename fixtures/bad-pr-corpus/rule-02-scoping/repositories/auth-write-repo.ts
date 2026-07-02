// DELIBERATELY BAD (rule-02-scoping — the AUTH-LOOKUP reads-only guard). This IS an auth-layer repo
// (`isAuthLookupFile` → true), so the `// SYS-01-AUTH-LOOKUP` marker is in a *valid location*. The
// marker's contract is "pre-auth LOOKUPS only" (reads) — but here it is (ab)used to smuggle an
// UNSCOPED cross-user WRITE past the lint: `.update(users)` keyed on a caller-supplied id with NO
// asActor()/ownedBy() scope. The reads-only tightening makes this FAIL CLOSED — the marker exempts a
// `.from` select, never a `.update`/`.delete`. `users` is user-owned (not on the F32 global manifest).
import { eq } from 'drizzle-orm';
import { users } from './schema';

export async function stealthUpdateUser(exec: any, userId: string, email: string) {
  // SYS-01-AUTH-LOOKUP: (ABUSED) claims a pre-auth lookup, but this is an unscoped cross-user update.
  return exec.update(users).set({ email }).where(eq(users.id, userId));
}
