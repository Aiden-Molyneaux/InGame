import { z } from 'zod';

// REQUEST/INPUT schemas for the M5 economy substrate (P1 — decision 0072/0073; api-contract 0.57).
// wallets + currency_ledger are USER-OWNED: the actor is the authenticated principal ONLY. The
// daily-bonus body is CLOSED (`.strict()`) — the claim is server-derived (period + amount), never
// client-supplied, so a smuggled field is refused (mirrors the DEV-05 SAVE CURRENT posture).

/**
 * POST /me/daily-bonus — claim the Store daily bonus (ECON-02). No body: the +1-PX grant is
 * server-side, idempotent per UTC-day (a second claim same day is a no-op, `granted:false`).
 */
export const dailyBonusRequestSchema = z.object({}).strict();
export type DailyBonusRequest = z.infer<typeof dailyBonusRequestSchema>;

/** The ledger page size (GET /me/wallet/ledger) — clamped so a client cannot ask for the whole table. */
export const WALLET_LEDGER_PAGE_DEFAULT = 25;
export const WALLET_LEDGER_PAGE_MAX = 100;

/**
 * GET /me/wallet/ledger?cursor=&limit= (ECON-07) — paginated earn/spend history, newest-first.
 * Non-strict (stray params are stripped). `cursor` is the opaque next-page token from a prior page
 * (an offset token in the P1 impl); `limit` coerces from the query string and clamps to the page max.
 */
export const walletLedgerQuerySchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce
    .number()
    .int()
    .min(1)
    .max(WALLET_LEDGER_PAGE_MAX)
    .optional(),
});
export type WalletLedgerQuery = z.infer<typeof walletLedgerQuerySchema>;
