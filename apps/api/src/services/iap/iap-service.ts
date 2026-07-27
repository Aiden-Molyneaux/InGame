import {
  iapWebhookEventSchema,
  type IapValidateRequest,
  type IapValidateResponse,
  type StoreResponse,
} from '@ingame/shared';
import { mutation } from '../../db/mutation';
import * as iapRepo from '../../repositories/iap-repo';
import * as storeRepo from '../../repositories/store-repo';
import * as economyRepo from '../../repositories/economy-repo';
import * as entitlementRepo from '../../repositories/entitlement-repo';
import { resolveSpotlightCatalog } from '../admin/spotlight-service';
import { toCosmeticListItem } from '../cosmetics/cosmetic-service';
import * as ledger from '../economy/ledger-service';
import { getIapProvider } from './index';
import type { IapProvider } from './IapProvider';
import { REFUND_FLOOR } from '../../config/economy';
import { AuthFailedError, StarterPackConsumedError, ValidationError } from '../../errors/AppError';

// The IAP seam service (M5 P2 · ECON-06/09/10 · decision 0072/0073). Every currency change funnels
// through the P1 ledger primitives INSIDE one mutation transaction (never a raw wallet write). The
// provider (mock now, RevenueCat at P2b) is the ONLY store-facing dependency. Three surfaces:
//   validatePurchase  — validate a receipt → grant (idempotent on receiptId; ECON-10 once-per-account)
//                        · restore (rcUserId) → re-sync, consumables never re-granted (decision 0073 §0.3)
//   handleWebhook     — signature-verified refund reversal (ECON-09; idempotent per receipt)
//   getStore          — the pack ladder + per-caller purchased flags (ECON-10)

// ── POST /iap/validate ────────────────────────────────────────────────────────────────────────────────

export async function validatePurchase(
  actorId: string,
  input: IapValidateRequest,
): Promise<IapValidateResponse> {
  const provider = getIapProvider();
  // The restore path (decision 0073 §0.3) — re-validate the subscriber, re-sync entitlements.
  if (input.rcUserId !== undefined) {
    return restorePurchases(actorId, provider, input.platform, input.rcUserId);
  }
  // The purchase path — validate the proof, resolve the product, then grant atomically.
  const validated = await provider.validateReceipt({
    platform: input.platform,
    receipt: input.receipt!,
  });
  if (!validated) {
    throw new ValidationError('This receipt could not be validated.', 'invalid_receipt');
  }
  const product = await storeRepo.findActiveProduct(validated.productId);
  if (!product) {
    // A valid receipt for a SKU we do not sell (or a retired one) — well-formed but unfulfillable.
    throw new ValidationError('Unknown product for this receipt.', 'unknown_product');
  }
  return grantForReceipt(actorId, {
    platform: input.platform,
    receiptId: validated.receiptId,
    productId: product.productId,
    pixels: product.pixels,
    oneTime: product.oneTime,
    raw: { receipt: input.receipt, validated },
  });
}

interface GrantArgs {
  platform: string;
  receiptId: string;
  productId: string;
  pixels: number;
  oneTime: boolean;
  raw: Record<string, unknown>;
}

/**
 * @mutation — grant a validated receipt (ECON-06/10). The wallet FOR UPDATE lock is taken FIRST so the
 * idempotency check + the ECON-10 once-check + the credit are one serialized critical section (F36):
 *   1. this exact receipt already recorded → idempotent no-op success (never re-grant)
 *   2. a one-time product the caller already owns (a DIFFERENT receipt) → STARTER_PACK_CONSUMED (409)
 *   3. record the receipt (UNIQUE receiptId = the cross-user/parallel arbiter) + credit `pack_purchase`
 * A lost UNIQUE race (another principal recorded this receiptId first) grants nothing (ECON-06).
 */
const grantForReceipt = mutation(
  { name: 'iap.grant', specIds: ['ECON-06', 'ECON-07', 'ECON-10', 'SYS-01', 'SYS-02'] },
  async (ctx, actorId, args: GrantArgs): Promise<IapValidateResponse> => {
    const wallet = await economyRepo.ensureWalletForUpdate(ctx.tx, actorId);

    const existing = await iapRepo.findOwnReceipt(ctx.tx, actorId, args.receiptId);
    if (existing) {
      await ctx.emit({
        eventType: 'iap.validated',
        entityRef: { type: 'iap_receipt', id: existing.id },
        payload: { granted: false, reason: 'replay' },
      });
      return { granted: false, balance: wallet.balance };
    }

    if (args.oneTime && (await iapRepo.hasOwnReceiptForProduct(ctx.tx, actorId, args.productId))) {
      throw new StarterPackConsumedError();
    }

    const inserted = await iapRepo.insertReceiptIfNew(ctx.tx, actorId, {
      platform: args.platform,
      receiptId: args.receiptId,
      productId: args.productId,
      pixelsGranted: args.pixels,
      raw: args.raw,
    });
    if (!inserted) {
      // Lost the global UNIQUE race — the receiptId is now owned (by a concurrent grant, or a
      // cross-user hijack attempt). Grant nothing; the winner's grant stands (ECON-06).
      await ctx.emit({
        eventType: 'iap.validated',
        entityRef: { type: 'wallet', id: wallet.id },
        payload: { granted: false, reason: 'conflict' },
      });
      return { granted: false, balance: wallet.balance };
    }

    const { balance } = await ledger.credit(ctx.tx, actorId, {
      amount: args.pixels,
      reason: 'pack_purchase',
      refType: 'iap_receipt',
      refId: args.receiptId,
    });
    await ctx.emit({
      eventType: 'iap.validated',
      entityRef: { type: 'iap_receipt', id: inserted.id },
      payload: { granted: true, productId: args.productId, pixels: args.pixels },
    });
    return { granted: true, pixels: args.pixels, balance };
  },
);

/**
 * Restore purchases (ECON-06 · decision 0073 §0.3). Re-validate the subscriber + re-sync entitlements.
 * v2's store catalog is ENTIRELY consumable PX packs, and **consumables are never re-granted by
 * restore** (the balance is account state, not receipt state — decision 0017). So restore grants
 * nothing and returns the current balance; recorded receipts are a no-op. When v2.x adds non-consumable
 * entitlements, the returned list feeds a per-item entitlement re-sync here (a P4-shaped extension).
 */
async function restorePurchases(
  actorId: string,
  provider: IapProvider,
  platform: IapValidateRequest['platform'],
  rcUserId: string,
): Promise<IapValidateResponse> {
  const restored = await provider.restore({ platform, rcUserId });
  if (restored === null) {
    throw new ValidationError('Could not restore purchases for this account.', 'invalid_subscriber');
  }
  // Nothing to re-grant (consumable-only catalog). Report the account's current effective balance.
  const wallet = await ledger.getWallet(actorId);
  return { granted: false, balance: wallet.balance };
}

// ── POST /iap/webhook (server-to-server; the signature IS the auth) ─────────────────────────────────────

export interface WebhookResult {
  reversed: boolean;
  balance?: number;
}

/**
 * Handle a RevenueCat server notification (ECON-06/09). The signature is verified FIRST over the raw
 * bytes — a bad/absent signature → 401 with ZERO state change. Then the event is parsed; only a refund
 * / cancellation triggers a reversal (no cosmetic clawback — ECON-09). Every other event type, an
 * unknown receipt, and an already-reversed receipt are acknowledged as no-ops (200) so RC stops
 * retrying. The refund is idempotent per receipt (a replayed webhook reverses exactly once).
 */
export async function handleWebhook(
  rawBody: Buffer,
  authHeader: string | undefined,
): Promise<WebhookResult> {
  const provider = getIapProvider();
  if (!provider.verifyWebhookSignature(rawBody, authHeader)) {
    // The signature is the webhook's ONLY auth — reject before touching any state.
    throw new AuthFailedError('Webhook signature verification failed.');
  }

  let body: unknown;
  try {
    body = JSON.parse(rawBody.toString('utf8') || '{}');
  } catch {
    return { reversed: false }; // authenticated but malformed → ack, no-op
  }
  const parsed = iapWebhookEventSchema.safeParse(body);
  if (!parsed.success) return { reversed: false };

  const event = parsed.data.event;
  const isReversal = event.type === 'REFUND' || event.type === 'CANCELLATION';
  if (!isReversal || !event.app_user_id || !event.transaction_id) {
    return { reversed: false }; // not a reversal we act on → ack
  }
  return reverseRefund(event.app_user_id, event.transaction_id);
}

/**
 * @mutation — reverse a refunded receipt's grant (ECON-09). The wallet FOR UPDATE lock serializes the
 * idempotency probe + the debit (a replayed refund reverses once, F36). The reversal is RECORDED as its
 * `refund_reversal` ledger row (refType `iap_receipt`, refId = receiptId) — the ledger IS the reversal
 * record, so no new column/migration is needed; the same probe makes a replay a no-op.
 *
 * ECON-09 boundary choice — the reversal debits EXACTLY `pixelsGranted`, UNFLOORED: it always lands
 * fully even below the −25 SYS-04 floor (decision 0072). A platform refund is not a user spend; refusing
 * it (the floored path) would leave a refunded user holding un-reversed Pixels — a value leak. The floor
 * is retained as the recovery anchor; `belowFloor` is surfaced on the event for observability.
 */
const reverseRefund = mutation(
  { name: 'iap.reverseRefund', specIds: ['ECON-09', 'ECON-07', 'SYS-01'] },
  async (ctx, userId, receiptId: string): Promise<WebhookResult> => {
    // Probe the receipt BEFORE locking — an unknown/unrecorded receipt is a pure no-op (no wallet is
    // materialized, no starting grant is written for a refund we can't act on).
    const receipt = await iapRepo.findOwnReceipt(ctx.tx, userId, receiptId);
    if (!receipt) {
      await ctx.emit({
        eventType: 'iap.refunded',
        entityRef: { type: 'user', id: userId },
        payload: { reversed: false, reason: 'unknown_receipt' },
      });
      return { reversed: false };
    }

    // A real receipt to reverse — lock the wallet to serialize the idempotency check + the debit (F36).
    const wallet = await economyRepo.ensureWalletForUpdate(ctx.tx, userId);

    const already = await economyRepo.findLedgerByRef(
      userId,
      'refund_reversal',
      'iap_receipt',
      receiptId,
      ctx.tx,
    );
    if (already) {
      await ctx.emit({
        eventType: 'iap.refunded',
        entityRef: { type: 'iap_receipt', id: receipt.id },
        payload: { reversed: false, reason: 'already_reversed' },
      });
      return { reversed: false, balance: wallet.balance };
    }

    const { balance } = await ledger.debit(ctx.tx, userId, {
      amount: receipt.pixelsGranted,
      reason: 'refund_reversal',
      refType: 'iap_receipt',
      refId: receiptId,
      // Unfloored (−∞): let it land fully (ECON-09 — reverse EXACTLY pixelsGranted; see the note above).
      // `debit`'s default is SPEND_FLOOR (0), which would REFUSE a negative landing — wrong for a refund.
      floor: Number.NEGATIVE_INFINITY,
    });
    await ctx.emit({
      eventType: 'iap.refunded',
      entityRef: { type: 'iap_receipt', id: receipt.id },
      payload: { reversed: true, pixels: receipt.pixelsGranted, belowFloor: balance < REFUND_FLOOR },
    });
    return { reversed: true, balance };
  },
);

// ── GET /store ──────────────────────────────────────────────────────────────────────────────────────────

/**
 * The Store front (ECON-01/07/08/10). The real-money pack ladder with per-caller `purchased` flags (the
 * consumed one-time Starter is marked purchased, ECON-10). `premiumCosmetics` = the M6 SPOTLIGHT set (the
 * owner-curatable storefront lead, formerly the "NEW THIS WEEK" grid) — the SYS-04 seed's premium ids as
 * `CosmeticListItem`s with caller-scoped `owned` flags (computed from `user_entitlements`, consistent with
 * GET /cosmetics; a batched read, never per-item). `drops` stays an honest empty (ECON-08 seasonal content
 * is P10).
 */
export async function getStore(actorId: string): Promise<StoreResponse> {
  const products = await storeRepo.listActiveProducts();
  const purchased = await iapRepo.listOwnPurchasedProductIds(actorId);
  // M6 P7 (decision 0081) — the Spotlight now resolves DB-first (server_settings['spotlight_ids'] →
  // the SPOTLIGHT_IDS config seed → the newest-N fallback), so the owner curates it live from the
  // admin console instead of by redeploying config. Identical output until an admin writes.
  const spotlight = await resolveSpotlightCatalog();
  const owned = await entitlementRepo.findOwnedCosmeticIds(
    actorId,
    spotlight.map((e) => e.id),
  );
  return {
    packs: products.map((p) => ({
      productId: p.productId,
      pixels: p.pixels,
      oneTime: p.oneTime,
      purchased: purchased.has(p.productId),
    })),
    // the ONE cosmeticListItem mapper (cosmetic-service) — /store and /cosmetics can never drift;
    // COSM-05 `colorCustomizable` rides automatically the day an ultimate SKU is spotlighted (0.77).
    premiumCosmetics: spotlight.map((e) => toCosmeticListItem(e, owned)),
    drops: [], // TODO(P10/ECON-08): seasonal drops — the drawer renders, authoring is later
  };
}
