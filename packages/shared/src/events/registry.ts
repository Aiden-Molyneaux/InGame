// Typed, append-only domain-event registry (CONVENTIONS rule 5; decision 0051/F01/F24).
//
// Every mutation emits a domain-event row INSIDE its own transaction (the transactional outbox, see
// apps/api emitOnCommit). This registry is the type-level guard: emitting an UNREGISTERED event type
// is a TypeScript COMPILE ERROR, not a runtime check a presence-grep could fake.
//
// OUT of M1: the relay / consumer / delivery infrastructure (deferred to M7) and the rule-5
// FAIL-the-PR lint teeth (checklist-only until a consumer exists). Build the write-side seam now.

/**
 * The append-only list of domain-event types. NEVER renumber or remove an entry — add new ones at
 * the end (the same append-only discipline as the error-code enum + composition asset IDs).
 */
export const DOMAIN_EVENT_TYPES = [
  // F29 golden-path slice — the worked exemplar every future mutation clones.
  'profile.bio_updated',
] as const;

export type DomainEventType = (typeof DOMAIN_EVENT_TYPES)[number];

/**
 * The frozen event envelope (decision 0051/F24): IDs + the changed field-set + the actor, NOT whole
 * rows (payload minimization — keeps PII out of the event spine, F18). `eventVersion` is stamped
 * day-one; bodies evolve additively.
 */
export interface DomainEventEnvelope<TType extends DomainEventType = DomainEventType> {
  eventType: TType;
  eventVersion: number;
  occurredAt: string; // ISO-8601 UTC
  actorId: string;
  entityRef: { type: string; id: string };
  payload: Record<string, unknown>;
}

export function isDomainEventType(value: string): value is DomainEventType {
  return (DOMAIN_EVENT_TYPES as readonly string[]).includes(value);
}
