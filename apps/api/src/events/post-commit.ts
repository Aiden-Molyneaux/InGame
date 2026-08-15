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

// P4 (perf-round2 S3) — the evaluation leaves the request lifecycle. The @mutation seam used to
// AWAIT runPostCommitHooks before returning, so every mutating 200 paid the full achievements pass
// (predicate counters refetch the actor's whole event history — a serial DB tax that GROWS with
// history). Detaching preserves the accepted failure semantics — failures were ALREADY
// swallow-and-log (runPostCommitHooks catches; nothing here can fail the committed mutation) and
// the trigger was ALREADY at-most-once — but WIDENS the drop window honestly: the old await was
// also the THROTTLE, so detached passes now QUEUE without backpressure under bursts (mutations can
// outpace evaluation), and a process exit (SIGTERM/crash) drops EVERY queued pass — potentially
// seconds of evaluations, not one tick. The count family still self-heals via the 0078
// reconcile-on-read either way; a drain-on-shutdown belongs with the G-C signal handler when that
// lands (and a queue cap with the S4 worker-ization — see perf-round2 next-wave).
const pendingHooks = new Set<Promise<void>>();

/** Fire-and-forget the post-commit pass on the next event-loop tick (the mutation's caller returns
 *  immediately). Tracked in `pendingHooks` so tests can flush deterministically. */
export function schedulePostCommitHooks(events: EmittedEvent[]): void {
  if (!hook || events.length === 0) return;
  const task = new Promise<void>((resolve) => {
    setImmediate(() => {
      // runPostCommitHooks never rejects (it swallows), but settle-on-either keeps the set honest.
      runPostCommitHooks(events).then(resolve, resolve);
    });
  });
  pendingHooks.add(task);
  void task.then(() => pendingHooks.delete(task));
}

/**
 * ONE-SHOT awaiter over the passes pending RIGHT NOW — a SNAPSHOT of the current set, so passes
 * scheduled AFTER this call never block it (it cannot livelock under continuous traffic, unlike
 * the looping test seam below). The W-A8 read-your-writes bridge: a mutation's 200 races the
 * client's on-action MeAchievements refetch (~2-5ms RTT) against the detached pass (~5-30ms), and
 * the hook-ONLY unlock classes (event_match / window_count / dual_actor — deliberately never
 * reconciled at read, decision 0078 boundary) would otherwise miss their celebration until some
 * later unrelated refetch. GET /me/achievements awaits this before serving: the caller's just-fired
 * pass was scheduled BEFORE its mutation responded, so it is always in the snapshot. Awaits ALL
 * currently-pending passes (any actor's) — acceptable at beta scale, bounded by the snapshot.
 * WARNING (murr, re-verify pass): a future HOOK that itself calls getMyAchievements (or this
 * flush) would await its own containing pass and deadlock the read — unreachable today (hooks
 * never touch the service read); keep it that way when wiring a second hook.
 */
export function flushPendingPostCommitHooks(): Promise<void> {
  return Promise.all([...pendingHooks]).then(() => undefined);
}

/**
 * TEST SEAM — await every scheduled post-commit pass (LOOPS until the set drains, in case a hook's
 * own mutations schedule more — never use on the request path; the snapshot awaiter above is the
 * production bridge). Integration tests that assert on post-commit EFFECTS (unlock rows,
 * achievement.unlocked outbox rows) flush here instead of sleeping.
 */
export async function waitForPostCommitHooks(): Promise<void> {
  while (pendingHooks.size > 0) {
    await Promise.all([...pendingHooks]);
  }
}
