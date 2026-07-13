import { z } from 'zod';
import { ledgerReasonSchema } from '../common';

// RESPONSE/VIEW schemas for the M5 economy substrate (P1 — api-contract 0.56/0.57; ECON-02/07).
// Personal-only surface — a wallet + its ledger are the caller's own (never cross-user), so these are
// OWNER shapes (no F06 serializer divergence). The ledger row's user-facing `type` IS the pinned
// `currency_ledger.reason` (decision 0073); the operator's audit reason (ECON-11) is NOT exposed here
// — an `admin_adjustment` shows to the user as a plain credit/debit (api-contract 0.31).

/**
 * GET /me/wallet — `{ balance, dailyBonus: { available, amount, nextResetAt } }` (ECON-02/07). The
 * Store's claim bar reads this. `available` = the caller has not claimed today's bonus (UTC-day);
 * `amount` = the per-claim grant (+1 PX default, SYS-04); `nextResetAt` = the next UTC-midnight ISO.
 */
export const walletResponseSchema = z
  .object({
    balance: z.number().int(), // may be negative post-refund (ECON-09 floor)
    dailyBonus: z
      .object({
        available: z.boolean(),
        amount: z.number().int().nonnegative(),
        nextResetAt: z.string(), // ISO-8601 UTC (next UTC-day boundary)
      })
      .strict(),
  })
  .strict();
export type WalletResponse = z.infer<typeof walletResponseSchema>;

/** One ledger entry (ECON-07) — the plain earn/spend history row. `type` = the pinned reason enum. */
export const ledgerEntrySchema = z
  .object({
    id: z.string().uuid(),
    type: ledgerReasonSchema, // the user-facing transaction type (== currency_ledger.reason)
    delta: z.number().int(), // +earn / −spend
    refType: z.string().nullable(), // context tag (e.g. 'card' | 'cosmetic' | 'iap_receipt'), P2/P3
    refId: z.string().nullable(),
    createdAt: z.string(), // ISO-8601 UTC
  })
  .strict();
export type LedgerEntry = z.infer<typeof ledgerEntrySchema>;

/**
 * GET /me/wallet/ledger — a page of transactions, newest-first (ECON-07). `nextCursor` is the opaque
 * token for the next page (null on the last page), mirroring the collection list's `{ items, nextCursor }`.
 */
export const ledgerResponseSchema = z
  .object({
    items: z.array(ledgerEntrySchema),
    nextCursor: z.string().nullable(),
  })
  .strict();
export type LedgerResponse = z.infer<typeof ledgerResponseSchema>;

/**
 * POST /me/daily-bonus — `{ granted, balance, nextResetAt }` (ECON-02). `granted:false` when today's
 * bonus was already claimed (idempotent, unclaimed days lapse — no banking); `balance` is the wallet
 * balance after the claim (or the current balance when not granted).
 */
export const dailyBonusResponseSchema = z
  .object({
    granted: z.boolean(),
    balance: z.number().int(),
    nextResetAt: z.string(), // ISO-8601 UTC
  })
  .strict();
export type DailyBonusResponse = z.infer<typeof dailyBonusResponseSchema>;

// ── M5 P2 IAP seam responses (ECON-06/09/10 — decision 0072/0073; api-contract 0.57) ──────────────────

/**
 * POST /iap/validate — `{ granted, pixels?, balance }` (ECON-06). `granted:true` on a first-time
 * receipt grant (`pixels` = the pack's PX credited); `granted:false` on an idempotent replay, a
 * cross-user receipt-id conflict, or a restore (consumables are never re-granted — `pixels` omitted).
 * `balance` is the wallet balance after the call. A refused second Starter Pack is `STARTER_PACK_CONSUMED`
 * (409, not this shape); an unvalidatable receipt is `VALIDATION_ERROR` (422).
 */
export const iapValidateResponseSchema = z
  .object({
    granted: z.boolean(),
    pixels: z.number().int().nonnegative().optional(),
    balance: z.number().int(), // may be negative post-refund (ECON-09)
  })
  .strict();
export type IapValidateResponse = z.infer<typeof iapValidateResponseSchema>;

/**
 * One Store currency pack (ECON-10). `oneTime` = the once-per-account Starter Pack; `purchased` = the
 * caller already owns a receipt for it (the consumed Starter is marked purchased per ECON-10). Priced in
 * real money by the store (App Store / Play), so no currency price rides the wire — only the PX value.
 */
export const storePackSchema = z
  .object({
    productId: z.string(),
    pixels: z.number().int().nonnegative(),
    oneTime: z.boolean(),
    purchased: z.boolean(),
  })
  .strict();
export type StorePack = z.infer<typeof storePackSchema>;

/**
 * GET /store — `{ packs, premiumCosmetics, drops }` (ECON-01/07/08/10). `packs` is the real-money
 * currency ladder (decision 0072). `premiumCosmetics` (COSM-03 PX-priced store items) and `drops`
 * (ECON-08 seasonal) are HONEST EMPTIES at P2 — the surfaces render, the content is authored later
 * (premium cosmetics → P4 acquire + P10 roster re-tag; drops → P10/ECON-08). No cosmetic data is
 * invented here; the arrays gain typed items when those packets land.
 */
export const storeResponseSchema = z
  .object({
    packs: z.array(storePackSchema),
    premiumCosmetics: z.array(z.unknown()), // TODO(P4/P10): COSM-03 premium store items — empty until authored
    drops: z.array(z.unknown()), // TODO(P10/ECON-08): seasonal drops — the drawer renders, authoring is later
  })
  .strict();
export type StoreResponse = z.infer<typeof storeResponseSchema>;

// ── M5 P4 acquire + entitlements (COSM-03/ECON-01 — decision 0072/0073; api-contract 0.57) ─────────────

/** The entitlement source vocabulary (0072/0073) — purchase (Store/acquire) · earned (ACH-04, M7) ·
 *  operator_grant (ECON-11 service-op). */
export const entitlementSourceSchema = z.enum(['purchase', 'earned', 'operator_grant']);
export type EntitlementSource = z.infer<typeof entitlementSourceSchema>;

/** One owned cosmetic (GET /me/entitlements, COSM-03) — the caller's own, account-wide. */
export const entitlementSchema = z
  .object({
    cosmeticId: z.string(),
    source: entitlementSourceSchema,
    createdAt: z.string(), // ISO-8601 UTC
  })
  .strict();
export type Entitlement = z.infer<typeof entitlementSchema>;

/** GET /me/entitlements — `{ items }` (COSM-03). What the caller owns, account-wide. */
export const entitlementsResponseSchema = z
  .object({
    items: z.array(entitlementSchema),
  })
  .strict();
export type EntitlementsResponse = z.infer<typeof entitlementsResponseSchema>;

/**
 * POST /cosmetics/:id/acquire — `{ cosmeticId, paid, balance }` (COSM-03/ECON-01). `paid` is 0 on the
 * idempotent no-op (already-owned or free/basic) and the tier price on a fresh charge; `balance` is the
 * caller's wallet balance after the call (unchanged on a no-op). Errors: `INSUFFICIENT_BALANCE
 * {shortBy}` (409) · `NOT_FOUND` (404, an unregistered cosmetic id).
 */
export const acquireResponseSchema = z
  .object({
    cosmeticId: z.string(),
    paid: z.number().int().nonnegative(),
    balance: z.number().int(),
  })
  .strict();
export type AcquireResponse = z.infer<typeof acquireResponseSchema>;

/** One item granted by an acquire-batch call (CARD-13 ReconcileSheet). */
export const acquireGrantSchema = z
  .object({
    cosmeticId: z.string(),
    paid: z.number().int().nonnegative(),
  })
  .strict();
export type AcquireGrant = z.infer<typeof acquireGrantSchema>;

/**
 * POST /cosmetics/acquire-batch — `{ granted, totalPaid, balance }` (CARD-13's ACQUIRE ALL). `granted`
 * lists only the items that were newly charged this call (already-owned/free ids are silent no-ops, NOT
 * listed here); mirrors `POST /cards/:id/adopt`'s response shape (decision 0072). Errors:
 * `INSUFFICIENT_BALANCE {shortBy}` against the TOTAL (409, nothing written) · `NOT_FOUND` (404, any
 * unregistered cosmetic id — the whole batch refuses before any write).
 */
export const acquireBatchResponseSchema = z
  .object({
    granted: z.array(acquireGrantSchema),
    totalPaid: z.number().int().nonnegative(),
    balance: z.number().int(),
  })
  .strict();
export type AcquireBatchResponse = z.infer<typeof acquireBatchResponseSchema>;
