import { z } from 'zod';
import { cosmeticTierSchema, cosmeticTypeSchema, ledgerReasonSchema } from '../common';

// RESPONSE/VIEW schemas for the M5 economy substrate (P1 — api-contract 0.56/0.57; ECON-02/07).
// Personal-only surface — a wallet + its ledger are the caller's own (never cross-user), so these are
// OWNER shapes (no F06 serializer divergence). The ledger row's user-facing `type` IS the pinned
// `currency_ledger.reason` (decision 0073); the operator's audit reason (ECON-11) is NOT exposed here
// — an `admin_adjustment` shows to the user as a plain credit/debit (api-contract 0.31).

/** The reward a Newcomer-Ladder claim lands (decision 0074) — the escalating PX + the free earned-only
 *  cosmetic when its roster slot is filled (`cosmeticId` absent until the roster pass). */
export const ladderRewardSchema = z
  .object({
    pixels: z.number().int().nonnegative(),
    cosmeticId: z.string().optional(),
  })
  .strict();
export type LadderReward = z.infer<typeof ladderRewardSchema>;

/**
 * GET /me/wallet — `{ balance, dailyBonus: { available, amount, nextResetAt, ladderStep?, ladderReward? } }`
 * (ECON-02/07, decision 0074). The Store's claim bar reads this. `available` = the caller has not claimed
 * today (UTC-day, either phase); `amount` = the STANDING per-claim grant (+1 PX default, SYS-04);
 * `nextResetAt` = the next UTC-midnight ISO. While the Newcomer Ladder is in progress, `ladderStep` (the
 * NEXT step, 1..7) and `ladderReward` (its PX + any filled cosmetic) are present so the client renders
 * the escalation; both are ABSENT once the ladder completes (the standing +1/day view is unchanged).
 */
export const walletResponseSchema = z
  .object({
    balance: z.number().int(), // may be negative post-refund (ECON-09 floor)
    dailyBonus: z
      .object({
        available: z.boolean(),
        amount: z.number().int().nonnegative(),
        nextResetAt: z.string(), // ISO-8601 UTC (next UTC-day boundary)
        ladderStep: z.number().int().min(1).max(7).optional(), // the NEXT ladder step; absent post-ladder
        ladderReward: ladderRewardSchema.optional(),
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
    // F-4 ledger honesty — the server-enriched specific phrase for this row (the board's "ADOPTED
    // 'DESTINY' BY RIKO" / "EMBERS · EFFECT" / "PIXEL PACK · 30" standard), resolved at READ time from
    // refType/refId (batched, no N+1). ABSENT when the reason has no specific detail to add (the generic
    // label stands) or the referenced row was deleted (a degrade, never a 500). Purely presentational —
    // the client shows `detail` when present, else the reason's generic label.
    detail: z.string().optional(),
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
 * POST /me/daily-bonus — `{ granted, pixels, cosmeticId?, balance, nextResetAt }` (ECON-02, decision
 * 0074). `granted:false` when today's bonus was already claimed (idempotent, unclaimed days lapse — no
 * banking); `pixels` = the PX this claim landed (a Newcomer-Ladder step's escalating amount for claims
 * 1–7, else the standing +1; 0 on the not-granted no-op); `cosmeticId` = the free earned-only cosmetic
 * when the landed ladder step's slot is filled (absent otherwise); `balance` = the wallet balance after.
 */
export const dailyBonusResponseSchema = z
  .object({
    granted: z.boolean(),
    pixels: z.number().int().nonnegative(),
    cosmeticId: z.string().optional(),
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
 * One library item (GET /cosmetics, decision 0075; also the GET /store featured element, M5 F-6). `tier`
 * is absent for a free item (never priced, always `owned:true`); `price` is 0 for a free item, the tier's
 * PX otherwise. `owned` is caller-scoped (the caller's own `user_entitlements` — never another
 * principal's). Defined here (above `storeResponseSchema`) so the store's `premiumCosmetics` can reuse it.
 */
export const cosmeticListItemSchema = z
  .object({
    id: z.string(),
    type: cosmeticTypeSchema,
    name: z.string(),
    tier: cosmeticTierSchema.optional(),
    price: z.number().int().nonnegative(),
    owned: z.boolean(),
  })
  .strict();
export type CosmeticListItem = z.infer<typeof cosmeticListItemSchema>;

/**
 * GET /store — `{ packs, premiumCosmetics, drops }` (ECON-01/07/08/10). `packs` is the real-money
 * currency ladder (decision 0072). `premiumCosmetics` (M5 F-6) is the FEATURED storefront set — the board
 * P1 "NEW THIS WEEK" grid — as `cosmeticListItem`s (COSM-03 PX-priced, caller-scoped `owned`). `drops`
 * (ECON-08 seasonal) stays an HONEST EMPTY — the drawer renders, the content is authored at P10.
 */
export const storeResponseSchema = z
  .object({
    packs: z.array(storePackSchema),
    premiumCosmetics: z.array(cosmeticListItemSchema),
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

// ── M5 P10 roster tiering (COSM-01 — decision 0075; api-contract GET /cosmetics) ───────────────────────
// `cosmeticListItemSchema` is defined above (it is shared with GET /store's `premiumCosmetics`, M5 F-6).

/** GET /cosmetics — `{ items }` (COSM-01, decision 0075). The full free+premium library, optionally
 *  filtered to one type; feeds the Store aisle listings + the editors' asset pickers. */
export const cosmeticsResponseSchema = z
  .object({
    items: z.array(cosmeticListItemSchema),
  })
  .strict();
export type CosmeticsResponse = z.infer<typeof cosmeticsResponseSchema>;
