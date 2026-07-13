import { z } from 'zod';

// Shared enum tokens used by BOTH request and response schemas. Kept in one place so the request
// (input) and response (view) halves agree on the vocabulary without one importing the other.

/**
 * PROF-03 privacy state. Pinned in api-contract 0.41 (OQ-112, RESOLVED 2026-06-30):
 * 'friends' (the default, friends-only) | 'public' (limited public profile).
 */
export const privacySchema = z.enum(['friends', 'public']);
export type Privacy = z.infer<typeof privacySchema>;

/** SYS-08 role. `adminTier` is exposed on the self-view only (PROF-09); 1..4 nested. */
export const roleSchema = z.enum(['user', 'admin']);
export type Role = z.infer<typeof roleSchema>;

export const adminTierSchema = z.number().int().min(1).max(4);

/** SOC-01/08 relationship — drives ADD FRIEND / FRIEND-tag chrome on other-principal views. */
export const relationshipSchema = z.enum(['none', 'outgoing', 'incoming', 'friend']);
export type Relationship = z.infer<typeof relationshipSchema>;

/** PROF-02 controlled platform list for gamertags. */
export const platformSchema = z.enum(['pc', 'playstation', 'xbox', 'nintendo']);
export type Platform = z.infer<typeof platformSchema>;

/**
 * ECON-07 — the `currency_ledger.reason` enum, PINNED by decision 0073 (M5-entry §0.4). The ledger
 * row's `reason` is ALSO the user-facing `type` on the wire (a plain earn/spend history). Append-only,
 * like the error-code + event-type enums.
 *  - `starting_grant`   ECON-02 — the 5-PX new-account grant (materialized on first wallet touch).
 *  - `daily_claim`      ECON-02 — the +1-PX Store daily bonus (idempotent per UTC-day, lapses).
 *  - `pack_purchase`    ECON-10 — currency bought via IAP (P2).
 *  - `adoption`         ECON-03 — the free design grant's ledger marker (0-delta / context row, P3).
 *  - `acquire`          ECON-01/COSM-03 — a premium component bought/adopted (a spend, P3/P4).
 *  - `milestone`        ECON-05/ACH-04 — an achievement currency reward (M7).
 *  - `refund_reversal`  ECON-09 — an IAP refund reversing granted currency, floored (P2).
 *  - `admin_adjustment` ECON-11 — an out-of-band operator credit/debit (service-layer only).
 */
export const LEDGER_REASONS = [
  'starting_grant',
  'daily_claim',
  'pack_purchase',
  'adoption',
  'acquire',
  'milestone',
  'refund_reversal',
  'admin_adjustment',
] as const;
export const ledgerReasonSchema = z.enum(LEDGER_REASONS);
export type LedgerReason = z.infer<typeof ledgerReasonSchema>;

/**
 * COL-02 — the six per-game statuses. Wire spelling pinned api-contract 0.47
 * (`completed` = the display name "Completed 100%"; display casing is the client's).
 */
export const collectionStatusSchema = z.enum([
  'backlog',
  'playing',
  'beaten',
  'completed',
  'dropped',
  'wishlist',
]);
export type CollectionStatus = z.infer<typeof collectionStatusSchema>;
