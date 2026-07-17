import type { IapPlatform } from '@ingame/shared';

// The DEV-MOCK IAP receipt encoder (M5 P6 — the P2b seam). Mirrors the server's
// `MockRevenueCat.encodeMockReceipt` (apps/api/src/services/iap/MockRevenueCat.ts): a structured token
// the mock provider parses back to its payload — no store SDK, fully reproducible. The token grammar is
// `mockrcpt.v1.` + base64url(JSON { receiptId, productId, platform }); the server decodes it, matches
// the claimed platform, resolves the product, and grants.
//
// ⚠ THIS IS A __DEV__-ONLY BRIDGE. In production the receipt comes from the native StoreKit/Play sheet
// via RevenueCat (P2b) — see the single flagged call-site in app/store.tsx. `encodeMockReceipt` must
// NEVER run in a shipped build; `mintMockReceipt` throws if `__DEV__` is false so a stray call fails
// loudly rather than sending a forgeable token to the server.

const RECEIPT_PREFIX = 'mockrcpt.v1.';

// base64url of a UTF-8 string, self-contained (Hermes has no reliable global btoa). The payload is small
// ASCII JSON, but UTF-8 bytes are handled correctly so any productId encodes.
const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

function utf8Bytes(s: string): number[] {
  const out: number[] = [];
  for (let i = 0; i < s.length; i++) {
    let c = s.charCodeAt(i);
    if (c < 0x80) {
      out.push(c);
    } else if (c < 0x800) {
      out.push(0xc0 | (c >> 6), 0x80 | (c & 0x3f));
    } else if (c >= 0xd800 && c <= 0xdbff) {
      // surrogate pair → one code point
      const lo = s.charCodeAt(++i);
      c = 0x10000 + ((c & 0x3ff) << 10) + (lo & 0x3ff);
      out.push(0xf0 | (c >> 18), 0x80 | ((c >> 12) & 0x3f), 0x80 | ((c >> 6) & 0x3f), 0x80 | (c & 0x3f));
    } else {
      out.push(0xe0 | (c >> 12), 0x80 | ((c >> 6) & 0x3f), 0x80 | (c & 0x3f));
    }
  }
  return out;
}

function base64url(input: string): string {
  const bytes = utf8Bytes(input);
  let out = '';
  for (let i = 0; i < bytes.length; i += 3) {
    const b0 = bytes[i]!;
    const b1 = i + 1 < bytes.length ? bytes[i + 1]! : 0;
    const b2 = i + 2 < bytes.length ? bytes[i + 2]! : 0;
    out += B64[b0 >> 2];
    out += B64[((b0 & 0x03) << 4) | (b1 >> 4)];
    out += i + 1 < bytes.length ? B64[((b1 & 0x0f) << 2) | (b2 >> 6)] : '';
    out += i + 2 < bytes.length ? B64[b2 & 0x3f] : '';
  }
  return out.replace(/\+/g, '-').replace(/\//g, '_'); // base64url; padding already omitted
}

/**
 * Mint a DEV-MOCK purchase receipt token for a `productId`. The `receiptId` is unique per call so each
 * mock purchase is a distinct, non-replayable grant (a repeated buy of the same pack lands again — the
 * consumable posture). Throws in a non-`__DEV__` build (this must never ship a live token).
 */
export function mintMockReceipt(productId: string, platform: IapPlatform = 'ios'): string {
  if (!__DEV__) {
    throw new Error('mintMockReceipt is a __DEV__-only bridge; the real receipt comes from StoreKit (P2b).');
  }
  const receiptId = `mock-${productId}-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
  const payload = JSON.stringify({ receiptId, productId, platform });
  return RECEIPT_PREFIX + base64url(payload);
}
