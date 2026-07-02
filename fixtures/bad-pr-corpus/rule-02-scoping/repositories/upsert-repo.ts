// DELIBERATELY BAD (rule-02-scoping — the OQ-118 upsert hole). A bare `.insert(...)` is exempt (you
// cannot IDOR a brand-new actor-stamped row) — but chaining `.onConflictDoUpdate(...)` turns it into
// an UPDATE of an EXISTING row (an upsert), exactly the cross-user write the old 3-verb denylist
// never saw. No asActor()/ownedBy() scope → the OQ-118 allowlist rule fails this closed.
import { gamertags } from './schema';

export async function upsertAnyGamertag(exec: any, userId: string, handle: string) {
  // ❌ an unscoped upsert — mutates an existing row on conflict, bypassing the old .update() detection
  return exec
    .insert(gamertags)
    .values({ userId, handle })
    .onConflictDoUpdate({ target: gamertags.userId, set: { handle } });
}
