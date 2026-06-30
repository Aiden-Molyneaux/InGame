import type { Executor } from '../db/client';
import { domainEvents, type DomainEventInsert } from '../db/schema';

// The outbox write lives in the repository layer (CONVENTIONS rule 1 — no raw DB access outside
// repositories). It is an append-only INSERT stamped with the actor by the emit seam, so it is not a
// cross-user read/modify vector (the rule-2 scope-lint targets select/update/delete, not inserts).
export async function insertDomainEvent(exec: Executor, row: DomainEventInsert): Promise<void> {
  await exec.insert(domainEvents).values(row);
}
