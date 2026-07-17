// DELIBERATELY BAD (rule-02-scoping — the SYS-01-FRIEND-READ predicate guard, decision 0076 §0.1).
// The FRIEND-READ marker is READS-ONLY (mirrors PUBLIC-READ): it exempts a `.from` SELECT, never a
// `.update`/`.delete`. Here it is (ab)used to smuggle an UNSCOPED cross-user WRITE — mutating another
// user's row — even though a friendScoped predicate sits nearby. A marked write fails closed.
import { eq, and } from 'drizzle-orm';
import { users } from './schema';

export function friendScoped(actorId: string, targetCol: any, extra: any) {
  const bond = eq(users.id, actorId);
  return extra ? and(bond, extra) : bond;
}

export async function abuse(exec: any, actorId: string, targetId: string, bio: string) {
  // SYS-01-FRIEND-READ: (ABUSED) claims a friend read but mutates another user's row
  return exec.update(users).set({ bio }).where(friendScoped(actorId, users.id, eq(users.id, targetId)));
}
