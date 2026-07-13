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
