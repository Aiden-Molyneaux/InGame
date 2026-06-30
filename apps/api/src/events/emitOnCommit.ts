import { isDomainEventType, type DomainEventType } from '@ingame/shared';
import type { Executor } from '../db/client';
import { insertDomainEvent } from '../repositories/event-repo';

// emitOnCommit — the write-side of the domain-event seam (ACH-08; decision 0051/F01/F24). It writes
// one outbox row INSIDE the caller's transaction. OUT of M1: the relay/consumer/delivery that drains
// the outbox (deferred to M7). Build the write-side seam now; do not wire enforcement teeth.

export interface EmitInput<TType extends DomainEventType = DomainEventType> {
  eventType: TType;
  actorId: string;
  entityRef: { type: string; id: string };
  payload?: Record<string, unknown>;
  eventVersion?: number;
}

export async function emitOnCommit(tx: Executor, input: EmitInput): Promise<void> {
  // The type system already forbids an unregistered type at compile time; this is belt-and-braces
  // for any dynamically-typed caller.
  if (!isDomainEventType(input.eventType)) {
    throw new Error(`emitOnCommit: unregistered domain event type "${input.eventType}".`);
  }
  await insertDomainEvent(tx, {
    eventType: input.eventType,
    eventVersion: input.eventVersion ?? 1,
    occurredAt: new Date(),
    actorId: input.actorId,
    entityType: input.entityRef.type,
    entityId: input.entityRef.id,
    payload: input.payload ?? {},
  });
}
