import { z } from 'zod';
import { cosmeticTypeSchema } from '../common';

// REQUEST/INPUT schemas for the M5 economy substrate (P1 — decision 0072/0073; api-contract 0.57).
// wallets + currency_ledger are USER-OWNED: the actor is the authenticated principal ONLY. The
// daily-bonus body is CLOSED (`.strict()`) — the claim is server-derived (period + amount), never
// client-supplied, so a smuggled field is refused (mirrors the DEV-05 SAVE CURRENT posture).

/**
 * POST /me/daily-bonus — claim the Store daily bonus (ECON-02, decision 0074). No body: the grant is
 * fully server-derived (a Newcomer-Ladder step for the first 7 claims, else the standing +1), idempotent
 * per UTC-day (a second claim same day is a no-op, `granted:false`).
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

// ── M5 P2 IAP seam (ECON-06/09/10 — decision 0072/0073; api-contract 0.57) ────────────────────────────
// The IAP platform vocabulary (distinct from PROF-02's gamertag `platformSchema`): the two app stores
// receipts originate from. Store-products/receipts are the RevenueCat-mediated purchase surface.
export const iapPlatformSchema = z.enum(['ios', 'android']);
export type IapPlatform = z.infer<typeof iapPlatformSchema>;

/**
 * POST /iap/validate — validate an IAP purchase OR restore purchases (ECON-06, decision 0073 §0.3).
 * CLOSED (`.strict()`): exactly ONE of `receipt` (a purchase proof to validate + grant) or `rcUserId`
 * (the restore path — re-validate the subscriber + re-sync entitlements; consumables never re-granted).
 * The actor is the authenticated principal — never a body field (SYS-01). `platform` scopes the store.
 */
export const iapValidateRequestSchema = z
  .object({
    platform: iapPlatformSchema,
    receipt: z.string().min(1).optional(),
    rcUserId: z.string().min(1).optional(),
  })
  .strict()
  .refine((d) => (d.receipt === undefined) !== (d.rcUserId === undefined), {
    message: 'Provide exactly one of receipt or rcUserId.',
  });
export type IapValidateRequest = z.infer<typeof iapValidateRequestSchema>;

/**
 * POST /iap/webhook — the RevenueCat server-notification body (decision 0073). Server-to-server,
 * signature-verified (the signature IS the auth — no principal). LENIENT (`.passthrough()`): RC sends
 * many event fields; we read only what a refund reversal needs. `app_user_id` is our internal user id
 * (the client sets the RC App User ID at login — wired at P2b); `transaction_id` maps to our stored
 * `iap_receipts.receiptId`; `type` is the RC event type (we act on `REFUND` / `CANCELLATION`). P2b maps
 * the real RC field taxonomy here; the shape stays additive.
 */
export const iapWebhookEventSchema = z
  .object({
    event: z
      .object({
        type: z.string(),
        app_user_id: z.string().optional(),
        transaction_id: z.string().optional(),
        product_id: z.string().optional(),
        id: z.string().optional(),
      })
      .passthrough(),
  })
  .passthrough();
export type IapWebhookEvent = z.infer<typeof iapWebhookEventSchema>;

// ── M5 P4 acquire + entitlements (COSM-03/ECON-01 — decision 0072/0073; api-contract 0.57) ─────────────

/**
 * POST /cosmetics/:id/acquire — no body: the target cosmetic id rides the path (COSM-03). Idempotent
 * (an already-owned/free item is a success no-op) — mirrors the daily-bonus empty-closed-body posture.
 */
export const acquireRequestSchema = z.object({}).strict();
export type AcquireRequest = z.infer<typeof acquireRequestSchema>;

/**
 * POST /cosmetics/acquire-batch — `{ cosmeticIds }` (CARD-13's ReconcileSheet ACQUIRE ALL). Capped
 * defensively (a client cannot request an unbounded spend batch in one call); de-duplication + the
 * already-owned no-op happen server-side (ECON-03/07).
 */
export const acquireBatchRequestSchema = z
  .object({
    cosmeticIds: z.array(z.string().min(1).max(64)).min(1).max(50),
  })
  .strict();
export type AcquireBatchRequest = z.infer<typeof acquireBatchRequestSchema>;

// ── M5 P10 roster tiering (COSM-01 — decision 0075) ─────────────────────────────────────────────────

/**
 * GET /cosmetics?type= — the library listing, optionally filtered to one COSM-01 type (decision 0075).
 * Non-strict (stray params are stripped, mirroring the ledger query's posture).
 */
export const cosmeticsQuerySchema = z.object({
  type: cosmeticTypeSchema.optional(),
});
export type CosmeticsQuery = z.infer<typeof cosmeticsQuerySchema>;
