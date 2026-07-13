import type { IapPlatform } from '@ingame/shared';

// The IAP provider seam (M5 P2 · decision 0072/0073 · testing-strategy §5). The API never talks to a
// store SDK directly — it depends only on this interface, so the deterministic MockRevenueCat (P2) and
// the real RevenueCatProvider (P2b, when §6 provisioning completes) are interchangeable and the swap
// touches nothing else. The provider is chosen by config/env (`IAP_PROVIDER`, default 'mock').

/** A normalized, validated purchase — the store-agnostic shape the IAP service grants against. */
export interface ValidatedReceipt {
  /** The store's stable transaction id — our `iap_receipts.receiptId` (UNIQUE; the ECON-06 idempotency key). */
  receiptId: string;
  /** The purchased SKU — matched against `store_products.productId` (active). */
  productId: string;
  platform: IapPlatform;
}

/** Validate a single purchase proof. */
export interface ValidateReceiptInput {
  platform: IapPlatform;
  /** The opaque purchase proof from the client (a store receipt / RC entitlement token). */
  receipt: string;
}

/** Restore purchases for a subscriber (ECON-06 / decision 0073 §0.3 — re-validate + re-sync). */
export interface RestoreInput {
  platform: IapPlatform;
  /** The RevenueCat App User ID (our internal user id at P2b). */
  rcUserId: string;
}

export interface IapProvider {
  /**
   * Validate one purchase proof. Returns the normalized receipt, or `null` if the proof is invalid /
   * forged / unparseable (the caller maps `null` → VALIDATION_ERROR 422).
   */
  validateReceipt(input: ValidateReceiptInput): Promise<ValidatedReceipt | null>;

  /**
   * Re-validate a subscriber and return the entitlements/transactions to re-sync (ECON-06). For a
   * consumable-only catalog (v2's PX packs) this is the set of the subscriber's non-consumable
   * entitlements — empty today, since **consumables are never re-granted by restore** (the balance is
   * account state, not receipt state — decision 0017). Returns `null` if the subscriber id is invalid.
   */
  restore(input: RestoreInput): Promise<ValidatedReceipt[] | null>;

  /**
   * Verify a webhook is genuinely from the store (the signature IS the webhook's auth — no principal).
   * `rawBody` is the exact request bytes (for an HMAC-over-body provider); `headerValue` is the
   * incoming `Authorization` header. RevenueCat authenticates with a STATIC shared-secret header, so
   * the mock (and real RC) compare `headerValue` constant-time against the configured secret; `rawBody`
   * is passed for a future HMAC provider. Returns `false` on any mismatch (→ 401, no state change).
   */
  verifyWebhookSignature(rawBody: Buffer, headerValue: string | undefined): boolean;
}
