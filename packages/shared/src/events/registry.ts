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
  // F29 golden-path slice (M1). Superseded in M2 by `profile.updated` (the widened PATCH /me), but
  // RETAINED — this list is append-only (never remove/renumber an entry).
  'profile.bio_updated',
  // M2 — auth + profile + gamertag + avatar mutations. Append new types at the END.
  'auth.registered', // AUTH-01/09 — a new account (email/password or first Apple sign-in). Funnel signup.
  'auth.identity_linked', // AUTH-09 — an Apple identity linked to an existing account by verified email.
  'profile.updated', // PATCH /me — the changed field-set (username/bio/privacy/favourites).
  'gamertag.added', // PROF-02
  'gamertag.updated', // PROF-02
  'gamertag.removed', // PROF-02
  'avatar.draft_saved', // PROF-08 (shape-stub — the flatten pipeline is M4)
  'avatar.published', // PROF-08 (shape-stub)
  // M3 — catalog + collection. Append new types at the END.
  'catalog.game_created', // CAT-02/05 — a new canonical entry (contributor credited).
  'collection.entry_added', // COL-01
  'collection.entry_updated', // COL-02/03 — the changed field-set (status/hours/…).
  'collection.entry_removed', // COL-01
  'collection.reordered', // COL-07 manual order (the reorder write).
  'collection.now_playing_set', // WTP-03 — the single pin set/cleared.
  // M4 — the card substrate (decision 0066: card_designs + style_presets + COL-06 equip). Append at the END.
  'card.draft_created', // CARD-14 — POST /cards (the CARD-24a draft document row).
  'card.updated', // CARD-14/24a — the autosave PATCH; payload = the changed field-set.
  'card.saved_private', // CARD-04 — draft → private (validate + hash; flatten rides M5 publish, 0066).
  'card.deleted', // CARD-14 — a draft/private design deleted (the 0040 confirm path).
  'style_preset.created', // CARD-24b
  'style_preset.updated', // CARD-24b — rename / re-snapshot.
  'style_preset.deleted', // CARD-24b
  'collection.card_equipped', // COL-06 — activeCardDesignId set/cleared (the equip write).
  // M4 §3.5 Device editor (decision 0030: device_configs + device_looks). Append at the END.
  'device.updated', // DEV-01/02/03/04 — PATCH /me/device; payload = the changed facet-set (shell/theme/stickers).
  'device.look_saved', // DEV-05 — SAVE CURRENT snapshotted the live combo into a new look.
  'device.look_deleted', // DEV-05 — a saved look removed.
  // M5 economy substrate (P1 — decision 0072/0073: wallets + currency_ledger). Append at the END.
  'wallet.daily_claimed', // ECON-02 — the +1-PX Store daily bonus claimed (idempotent per UTC-day).
  'wallet.adjusted', // ECON-11 — an out-of-band operator credit/debit (also writes a MOD-10 audit row).
  // M5 §1 publish-thread (decision 0073: publish → gallery → adopt). Append at the END.
  'card.published', // CARD-15 — draft/private → published (flatten to storage; imageUrl/thumbUrl set).
  'card.adopted', // CARD-04 — a DIFFERENT user adopted a published card (the free-path grant, §1 spike).
  // M5 P2 IAP seam (decision 0072/0073: receipt validation + refund reversal). Append at the END.
  'iap.validated', // ECON-06 — a receipt validated → currency granted (pack_purchase), idempotent on receiptId.
  'iap.refunded', // ECON-09 — a platform refund reversed granted currency (refund_reversal), idempotent per receipt.
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
