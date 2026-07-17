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

/**
 * SOC-07 — the SEARCH-surface relationship enum (api-contract 0.23/0.44/0.69). It is the base
 * `relationshipSchema` PLUS two search-surface-only extras (F-13): `cooldown` (the SOC-08 re-request
 * window is still open with this person — the PersonRow carries a `cooldownUntil` and disables ADD)
 * and `blocked` (present ONLY for the shared PersonRow component's completeness — a blocked user is
 * mutually INVISIBLE in results, so this value never actually surfaces from `/users/search`, OQ-072).
 * The canonical spelling stays `friend` (matching `relationshipSchema` + `/users/:id`).
 */
export const searchRelationshipSchema = z.enum([
  'none',
  'outgoing',
  'incoming',
  'friend',
  'blocked',
  'cooldown',
]);
export type SearchRelationship = z.infer<typeof searchRelationshipSchema>;

/** PROF-02 controlled platform list for gamertags. */
export const platformSchema = z.enum(['pc', 'playstation', 'xbox', 'nintendo']);
export type Platform = z.infer<typeof platformSchema>;

/**
 * ECON-07 — the `currency_ledger.reason` enum, PINNED by decision 0073 (M5-entry §0.4). The ledger
 * row's `reason` is ALSO the user-facing `type` on the wire (a plain earn/spend history). Append-only,
 * like the error-code + event-type enums.
 *  - `starting_grant`   ECON-02 — the 10-PX new-account grant (materialized on first wallet touch).
 *  - `daily_claim`      ECON-02 — the STANDING +1-PX Store daily bonus (idempotent per UTC-day, lapses;
 *                       claim 8+ once the Newcomer Ladder is complete).
 *  - `pack_purchase`    ECON-10 — currency bought via IAP (P2).
 *  - `adoption`         ECON-03 — the free design grant's ledger marker (0-delta / context row, P3).
 *  - `acquire`          ECON-01/COSM-03 — a premium component bought/adopted (a spend, P3/P4).
 *  - `milestone`        ECON-05/ACH-04 — an achievement currency reward (M7) AND the Newcomer-Ladder
 *                       step grant (`refType='newcomer_ladder'`, decision 0074 — the first 7 claims).
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
 * COSM-03/ECON-01 — the 7-tier cosmetic-pricing ladder (decision 0072 ruling 2), mirrored from
 * `apps/api/src/config/cosmetics.ts` (the server owns the tier→PX mapping; this is the wire vocabulary
 * only). A registered-free item carries no tier (`null` on the wire, never one of these strings).
 */
export const COSMETIC_TIERS = [
  'accent',
  'trim',
  'standard',
  'deluxe',
  'big',
  'showpiece',
  'ultimate',
] as const;
export const cosmeticTierSchema = z.enum(COSMETIC_TIERS);
export type CosmeticTier = z.infer<typeof cosmeticTierSchema>;

/** COSM-01 — the cosmetic type taxonomy (decision 0017/0018, api-contract GET /cosmetics). */
export const cosmeticTypeSchema = z.enum([
  'shell_sticker_pack',
  'effect',
  'finish',
  'frame',
  'nameplate',
  'font',
  'device_shell',
  'screen_theme',
]);
export type CosmeticType = z.infer<typeof cosmeticTypeSchema>;

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
