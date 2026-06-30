import { getDb, type Tx } from './client';
import { emitOnCommit } from '../events/emitOnCommit';
import type { DomainEventType } from '@ingame/shared';

// F43 — the `@mutation` seam. ONE recognized seam that the authz-test, outbox-emit, and (future
// MOD-10 audit-row) checks all key off, so a state-changing method — even a non-CRUD-named one like
// `claimDailyBonus` / `adoptCard` — cannot escape all three. A mutation runs in ONE transaction, so
// the emitted outbox event row commits atomically with the write (decision 0051/F01/F43).

export interface EmitArgs<TType extends DomainEventType = DomainEventType> {
  /** Typed against the registry — emitting an UNREGISTERED type is a COMPILE error. */
  eventType: TType;
  entityRef: { type: string; id: string };
  payload?: Record<string, unknown>;
  eventVersion?: number;
}

export interface MutationContext {
  tx: Tx;
  emit: <TType extends DomainEventType>(args: EmitArgs<TType>) => Promise<void>;
}

export interface MutationMeta {
  /** A stable name for the mutation (traceability / future audit keying). */
  name: string;
  /** Spec IDs this mutation serves (rule-6 traceability). */
  specIds: string[];
}

/**
 * Wrap a service mutation. The returned function takes `(actorId, ...args)` and runs `body` inside a
 * transaction with a `ctx.emit` bound to that tx + actor. Every mutation MUST call `ctx.emit` at
 * least once (CONVENTIONS rule 5) — the rule-5 lint checks for it (teeth deferred to M7; checklist now).
 */
export function mutation<Args extends unknown[], R>(
  meta: MutationMeta,
  body: (ctx: MutationContext, actorId: string, ...args: Args) => Promise<R>,
): (actorId: string, ...args: Args) => Promise<R> {
  void meta; // retained for traceability + future audit-row keying (MOD-10, M2)
  return async (actorId: string, ...args: Args) => {
    const db = getDb();
    return db.transaction(async (tx) => {
      const ctx: MutationContext = {
        tx,
        emit: (args2) => emitOnCommit(tx, { ...args2, actorId }),
      };
      return body(ctx, actorId, ...args);
    });
  };
}
