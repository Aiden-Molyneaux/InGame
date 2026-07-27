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
  'card.unpublished', // CARD-20 — a published card delisted (status → private; adopters keep their grants).
  'card.adopted', // CARD-04 — a DIFFERENT user adopted a published card (component acquire + design grant).
  // M5 P2 IAP seam (decision 0072/0073: receipt validation + refund reversal). Append at the END.
  'iap.validated', // ECON-06 — a receipt validated → currency granted (pack_purchase), idempotent on receiptId.
  'iap.refunded', // ECON-09 — a platform refund reversed granted currency (refund_reversal), idempotent per receipt.
  // M5 P4 acquire + entitlements (decision 0072/0073: user_entitlements + the acquire endpoints). Append at the END.
  'cosmetic.acquired', // COSM-03/ECON-01 — POST /cosmetics/:id/acquire; payload notes whether it charged.
  'cosmetic.batch_acquired', // CARD-13 — POST /cosmetics/acquire-batch; payload = the granted id set + totalPaid.
  'cosmetic.entitlement_granted', // ECON-11 — an operator grant (service-op, no route); also writes the MOD-10 audit row.
  'cosmetic.entitlement_clawed_back', // ECON-11 — an operator clawback (service-op, no route); also writes the MOD-10 audit row.
  // M5 F-2 social block/unblock (decision 0073 §0.6: user_blocks writes). Append at the END.
  'social.user_blocked', // SOC-09 — POST /me/blocks; the blocked designer's cards leave the caller's community views.
  'social.user_unblocked', // SOC-09 — DELETE /me/blocks/:userId; the block lifted (idempotent).
  // M5 F-2b un-adopt (CARD-14/20 — the adopted-side DELETE; migration 0012). Append at the END.
  'card.adoption_revoked', // CARD-14 — the adopter removed their copy (soft-revoke; all-time count unchanged).
  // M6 §1 friend-fabric spike (decision 0076 §0.1 — friend_requests + friendships). Append at the END.
  'friend.request_created', // SOC-08 — POST /friends/requests (a pending request opened).
  'friend.added', // SOC-01 — a request accepted → the accepted friendship formed. Payload carries BOTH
  // party ids ({ requesterId, addresseeId, requestId }) so an actor-scoped consumer (P4 feed · P6
  // achievements) can credit BOTH parties off the single accept event — neither side "adds" in isolation.
  // M6 P1 SOC-08 lifecycle (decision 0076 §0.7 — decline/cancel/unfriend). Append at the END.
  'friend.request_declined', // SOC-08 — POST /friends/requests/:id/decline (silent; stamps the SYS-04 cooldown).
  'friend.request_cancelled', // SOC-08 — DELETE /friends/requests/:id (the requester withdrew an outgoing request).
  'friend.removed', // SOC-08 — DELETE /me/friends/:userId (unfriend; silent to the target, decision 0010).
  // M6 P3 find + invite (decision 0076 §0.6 — invite_tokens; the AUTH-LOOKUP bearer read class). Append at the END.
  'invite.created', // SOC-10 — POST /me/invites minted a share/QR invite token (create-new-invalidates-oldest may revoke an older one). Payload = { inviteId } only (never the token/hash — a bearer credential stays out of the event spine, F18).
  // M6 P4 recommendations (decision 0076 §0.7 — the recommendations table; SOC-05). Append at the END.
  'recommendation.sent', // SOC-05 — POST /recommendations: a friend recommended a game (lands in the recipient's rec inbox, NOT auto-queued). Payload = { toUserId, gameId } (ids only — the note is UNSCREENED user text, kept out of the event spine, F18/MOD-07).
  'recommendation.dismissed', // SOC-05 — DELETE /me/recommendations/:recId: the recipient soft-dismissed an inbox rec. Payload = {} (a private inbox touch; ids only via entityRef).
  // M6 P5 What-to-Play queue + Top-10 substrate (decision 0076 §0.7 — queue_items/lists/list_items). Append at the END.
  'queue.item_added', // WTP-01/02 — POST /me/queue: a game entered the Up Next queue. Payload = { gameId, source }.
  'queue.item_removed', // WTP-01 — DELETE /me/queue/:id. Payload = { gameId }.
  'queue.reordered', // WTP-01 — PATCH /me/queue/reorder (manual order rewrite). Payload = { count }.
  'list.item_added', // SOC-04 — POST /me/lists/:id/items: a game joined the Top-10. Payload = { kind, gameId }.
  'list.item_removed', // SOC-04 — DELETE /me/lists/:id/items/:gameId. Payload = { kind, gameId }.
  'list.reranked', // SOC-04/COL-07 — PATCH /me/lists/:id (the ARRANGE re-rank). Payload = { kind, count }.
  // M6 P6 achievements engine (decision 0076 §0.4 / 0077 — ACH-01/02/04/06). Append at the END.
  'achievement.unlocked', // ACH-02/06 — a definition's criterion was met for a user (idempotent, once per user).
  // Actor = the CREDITED user (so the P4 feed renders "X unlocked …"); entityRef.id = the achievementId;
  // payload = { key, tier, label } (label = the def name — the feed renders WITHOUT a definitions join,
  // F18 — the label is a public achievement name, never a private field). Emitted by the engine's own
  // unlock tx (NOT the @mutation seam), so it never re-enters the post-commit evaluator (no recursion —
  // and no definition keys off achievement.unlocked anyway).
  // M6 P7 report capture (decision 0076 §0.5 — the `reports` table; MOD-01). Append at the END.
  'report.filed', // MOD-01 — POST /reports. Payload = { reportId, targetType } ONLY (never the reason,
  // targetId, or details text — the moderation queue (M7) reads those off the row itself; the event
  // spine stays minimal/PII-light, F18).
  // M6 W-6 wiki game-edits (CAT-13/14 — the `game_edits` table; game-edit-wiki-draft §1.1). Append at the END.
  'catalog.game_edited', // CAT-13/14 — POST /catalog/games/:id/edits applied a live edit, OR a revert wrote
  // its reversal row (a revert IS an edit — the history stays append-only). Payload = { field } (+
  // { revertedEditId } on a reversal) — the field name is the pinned enum, ids only; the old/new VALUES
  // stay off the event spine (user text never rides it, F18/MOD-07 — read them off the row).
  // M6 P7 admin console v1 (decision 0081 — the `/admin/*` router's privileged WRITES; MOD-08/10,
  // SYS-04). Each of these ALSO writes a MOD-10 `admin_audit_log` row in the same transaction (the
  // audit row is the oversight record; the event is the spine's copy). Append at the END.
  'admin.spotlight_updated', // SYS-04/ECON-01 — PUT /admin/spotlight replaced the curated Spotlight list.
  // Payload = { count } only: WHICH ids were curated is an editorial decision the audit row + the
  // settings row already hold; the event spine stays minimal (F18).
  'admin.card_taken_down', // MOD-08 — POST /admin/cards/:id/takedown hid a card (adopters fall back per
  // CARD-18). Payload = { cardId } — the REASON is moderator-facing text and stays off the spine (F18).
  'admin.card_restored', // MOD-08/MOD-02 — POST /admin/cards/:id/restore lifted a takedown. Payload = { cardId }.
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
