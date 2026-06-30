// DELIBERATELY BAD (rule-01-layering). A controller issuing a raw DB query — the data-access layer
// has leaked out of repositories/. CONVENTIONS rule 1 fails this in CI.
import { getDb } from '../../../apps/api/src/db/client';
import { users } from '../../../apps/api/src/db/schema';

export async function getProfileBadly(actorId: string) {
  // ❌ raw Drizzle query outside the repository layer
  return getDb().select().from(users);
}
