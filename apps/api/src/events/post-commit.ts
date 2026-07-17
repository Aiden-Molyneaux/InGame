import type { DomainEventType } from '@ingame/shared';
import { logger } from '../observability/logger';

// The post-commit hook seam (M6 P6 — the ACH-02 in-process evaluator's wiring). The transactional
// outbox (`domain_events`) has NO relay/consumer daemon (M1 deferred it, decision 0051/F24). Rather
// than build a polling drain, the achievements engine evaluates SYNCHRONOUSLY IN-PROCESS right after
// an emitting mutation's transaction COMMITS — the `@mutation` seam (db/mutation.ts) is the single
// chokepoint where every user-owned mutation's events funnel through `ctx.emit`, so wiring here catches
// them all with one touch.
//
// SEMANTICS (documented per the P6 brief): the evaluation trigger is AT-MOST-ONCE — a process crash
// between the mutation's commit and this hook drops the evaluation. This is RECOVERABLE for the COUNT
// criteria (event_count / *_distinct / window / participant / received / aggregate): they recompute
// from `domain_events` history on the NEXT event of the type, so a missed evaluation self-heals (the
// counter is stateless — count-from-genesis). The one-shot MATCH / DUAL criteria (event_match,
// dual_actor) are evaluated on their trigger event; a dropped one only re-fires if a later same-type
// event re-triggers evaluation (the accepted at-most-once gap for eggs — a beta-scale, single-process
// posture). Registration is decoupled (a setter, not an import) so db/mutation.ts never imports the
// engine → the ledger-service → back into db/mutation.ts (the cycle a direct import would form).

/** A committed domain event captured at `ctx.emit` time, handed to the post-commit evaluator. */
export interface EmittedEvent {
  eventType: DomainEventType;
  actorId: string;
  entityId: string;
  payload: Record<string, unknown>;
  occurredAt: Date;
}

export type PostCommitHook = (events: EmittedEvent[]) => Promise<void>;

let hook: PostCommitHook | null = null;

/** Register the post-commit evaluator (the app bootstrap / test app-factory calls this once). */
export function registerPostCommitHook(fn: PostCommitHook | null): void {
  hook = fn;
}

/**
 * Run the registered hook AFTER a mutation's transaction has committed. Failures are SWALLOWED (logged,
 * never rethrown) so a bug in achievement evaluation can never 500 the underlying mutation that already
 * succeeded — the missed evaluation self-heals on the next event for the count criteria (see the module
 * banner). A no-op when nothing is registered (the engine unwired) or no events were emitted.
 */
export async function runPostCommitHooks(events: EmittedEvent[]): Promise<void> {
  if (!hook || events.length === 0) return;
  try {
    await hook(events);
  } catch (err) {
    logger.error({ err, eventCount: events.length }, 'post-commit hook failed (evaluation dropped; self-heals on the next event)');
  }
}
