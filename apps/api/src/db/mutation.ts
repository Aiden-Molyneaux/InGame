import { getDb, type Tx } from './client';
import { emitOnCommit } from '../events/emitOnCommit';
import { insertAuditRow } from '../repositories/audit-repo';
import { runPostCommitHooks, type EmittedEvent } from '../events/post-commit';
import type { DomainEventType } from '@ingame/shared';

// F43 — the `@mutation` seam. ONE recognized seam that the authz-test, outbox-emit, and MOD-10
// audit-row checks all key off, so a state-changing method — even a non-CRUD-named one like
// `claimDailyBonus` / `adoptCard` — cannot escape all three. A mutation runs in ONE transaction, so
// the emitted outbox event row (and any privileged audit row) commit atomically with the write
// (decision 0051/F01/F43; F16).

export interface EmitArgs<TType extends DomainEventType = DomainEventType> {
  /** Typed against the registry — emitting an UNREGISTERED type is a COMPILE error. */
  eventType: TType;
  entityRef: { type: string; id: string };
  payload?: Record<string, unknown>;
  eventVersion?: number;
}

/** MOD-10 audit args (F16). A PRIVILEGED mutation calls `ctx.audit(...)`; ordinary mutations don't. */
export interface AuditArgs {
  action: string;
  target: { type: string; id: string };
  reason?: string;
}

export interface MutationContext {
  tx: Tx;
  emit: <TType extends DomainEventType>(args: EmitArgs<TType>) => Promise<void>;
  /** F16/MOD-10 — write an append-only audit row IN this mutation's tx (privileged writes only). */
  audit: (args: AuditArgs) => Promise<void>;
}

export interface MutationMeta {
  /** A stable name for the mutation (traceability / audit keying). */
  name: string;
  /** Spec IDs this mutation serves (rule-6 traceability). */
  specIds: string[];
}

/**
 * Wrap a service mutation. The returned function takes `(actorId, ...args)` and runs `body` inside a
 * transaction with a `ctx.emit` + `ctx.audit` bound to that tx + actor. Every mutation MUST call
 * `ctx.emit` at least once (CONVENTIONS rule 5) — the rule-5 lint checks for it (teeth deferred to
 * M7; checklist now). A privileged mutation additionally calls `ctx.audit` (MOD-10).
 */
export function mutation<Args extends unknown[], R>(
  meta: MutationMeta,
  body: (ctx: MutationContext, actorId: string, ...args: Args) => Promise<R>,
): (actorId: string, ...args: Args) => Promise<R> {
  void meta; // retained for traceability + audit keying
  return async (actorId: string, ...args: Args) => {
    const db = getDb();
    // Events emitted DURING this mutation's tx are captured so the ACH-02 post-commit evaluator can run
    // against them AFTER the tx commits (in-process, not a polling drain — see events/post-commit.ts).
    const emitted: EmittedEvent[] = [];
    const result = await db.transaction(async (tx) => {
      const ctx: MutationContext = {
        tx,
        emit: async (args2) => {
          await emitOnCommit(tx, { ...args2, actorId });
          emitted.push({
            eventType: args2.eventType,
            actorId,
            entityId: args2.entityRef.id,
            payload: args2.payload ?? {},
            occurredAt: new Date(),
          });
        },
        audit: (a) =>
          insertAuditRow(tx, {
            actorId,
            action: a.action,
            targetType: a.target.type,
            targetId: a.target.id,
            reason: a.reason ?? null,
          }),
      };
      return body(ctx, actorId, ...args);
    });
    // POST-COMMIT: the tx has durably committed; evaluate achievements off the emitted events. This is
    // best-effort (failures are logged, never rethrown) so it can never fail the committed mutation.
    await runPostCommitHooks(emitted);
    return result;
  };
}
