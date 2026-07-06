import { sql } from 'drizzle-orm';
import type { Executor } from './client';

// Advisory-lock infra (F36 concurrency). Infra SQL lives in db/ (not a repository — the SYS-01
// scoping lint can't classify raw SQL and fails closed there, OQ-118). pg advisory XACT locks
// release automatically at commit/rollback; keys are namespaced strings hashed server-side.

/**
 * Serialize a per-actor critical section inside the caller's TRANSACTION — e.g. the style-preset
 * cap-30 check-then-insert (CARD-24/SYS-04), where two parallel creates at cap-1 must not both pass
 * the count check.
 */
export async function acquireActorLock(
  exec: Executor,
  namespace: string,
  actorId: string,
): Promise<void> {
  await exec.execute(
    sql`select pg_advisory_xact_lock(hashtextextended(${namespace + ':' + actorId}, 0))`,
  );
}
