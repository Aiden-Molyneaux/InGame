import { timingSafeEqual } from 'node:crypto';
import type { IapPlatform } from '@ingame/shared';
import type {
  IapProvider,
  RestoreInput,
  ValidateReceiptInput,
  ValidatedReceipt,
} from './IapProvider';

// The deterministic mock IAP provider (M5 P2 · testing-strategy §5). Receipts + subscriber ids are
// STRUCTURED TOKENS the mock parses back to their payload — no network, no store SDK, fully
// reproducible for tests + the dev seed. A forged/garbage token fails validation (→ null); a wrong
// webhook secret is rejected. P2b's RevenueCatProvider replaces this behind the same interface.
//
// Token grammar (base64url-encoded JSON so productIds/receiptIds can hold any characters):
//   receipt    = "mockrcpt.v1." + base64url(JSON { receiptId, productId, platform })
//   subscriber = "mocksub.v1."  + base64url(JSON ValidatedReceipt[])   (the restore payload)

const RECEIPT_PREFIX = 'mockrcpt.v1.';
const SUBSCRIBER_PREFIX = 'mocksub.v1.';

function encodePayload(prefix: string, payload: unknown): string {
  return prefix + Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
}

function decodePayload<T>(prefix: string, token: string): T | null {
  if (!token.startsWith(prefix)) return null;
  try {
    const json = Buffer.from(token.slice(prefix.length), 'base64url').toString('utf8');
    return JSON.parse(json) as T;
  } catch {
    return null;
  }
}

function isReceiptShape(v: unknown): v is ValidatedReceipt {
  if (typeof v !== 'object' || v === null) return false;
  const r = v as Record<string, unknown>;
  return (
    typeof r.receiptId === 'string' &&
    r.receiptId.length > 0 &&
    typeof r.productId === 'string' &&
    r.productId.length > 0 &&
    (r.platform === 'ios' || r.platform === 'android')
  );
}

/** Build a mock purchase receipt token (tests + dev-seed). */
export function encodeMockReceipt(receipt: ValidatedReceipt): string {
  return encodePayload(RECEIPT_PREFIX, receipt);
}

/** Build a mock subscriber (restore) token carrying the receipts the restore should return. */
export function encodeMockSubscriber(receipts: ValidatedReceipt[]): string {
  return encodePayload(SUBSCRIBER_PREFIX, receipts);
}

export interface MockRevenueCatOptions {
  /** The webhook Authorization shared secret this mock accepts (env `REVENUECAT_WEBHOOK_AUTH`). */
  webhookAuthSecret: string;
}

export class MockRevenueCat implements IapProvider {
  constructor(private readonly opts: MockRevenueCatOptions) {}

  async validateReceipt(input: ValidateReceiptInput): Promise<ValidatedReceipt | null> {
    const decoded = decodePayload<unknown>(RECEIPT_PREFIX, input.receipt);
    if (!isReceiptShape(decoded)) return null;
    // The claimed platform must match the receipt's own platform (a cross-platform replay is invalid).
    if (decoded.platform !== input.platform) return null;
    return { receiptId: decoded.receiptId, productId: decoded.productId, platform: decoded.platform };
  }

  async restore(input: RestoreInput): Promise<ValidatedReceipt[] | null> {
    const decoded = decodePayload<unknown>(SUBSCRIBER_PREFIX, input.rcUserId);
    if (decoded === null || !Array.isArray(decoded)) return null; // an unparseable subscriber id is invalid
    // Return only well-formed receipts matching the restoring platform (RC scopes restore per store).
    const platform: IapPlatform = input.platform;
    return decoded.filter(isReceiptShape).filter((r) => r.platform === platform);
  }

  verifyWebhookSignature(_rawBody: Buffer, headerValue: string | undefined): boolean {
    // RevenueCat authenticates its webhook with a STATIC Authorization header (a shared secret), not an
    // HMAC over the body — so the mock (and the real provider) compare the header constant-time. An
    // unset secret fail-closes (rejects every call). P2b's HMAC provider would use `_rawBody`.
    const secret = this.opts.webhookAuthSecret;
    if (!secret || typeof headerValue !== 'string' || headerValue.length === 0) return false;
    const a = Buffer.from(headerValue, 'utf8');
    const b = Buffer.from(secret, 'utf8');
    if (a.length !== b.length) return false; // timingSafeEqual requires equal lengths
    return timingSafeEqual(a, b);
  }
}
