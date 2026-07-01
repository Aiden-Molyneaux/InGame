import { getDb, type Tx } from './client';

// A transaction helper at the DB/repository layer (CONVENTIONS rule 1 — only db/ + repositories/ may
// touch the driver). Auth issuance flows (register / login / refresh) span several user-owned tables
// and must be ATOMIC, but they run PRE-actor (register) or by-credential (login/refresh) so they do
// not fit the `@mutation(actorId, …)` seam. Services call `withTransaction` and thread the returned
// `tx` into the scoped repos (and `emitOnCommit(tx, …)` for the funnel event) so everything commits
// together. `@mutation` stays the seam for AUTHENTICATED user-owned mutations (authz/emit/audit).
export async function withTransaction<T>(fn: (tx: Tx) => Promise<T>): Promise<T> {
  return getDb().transaction(fn);
}
