import { loadEnv } from '../../config/env';
import type { IapProvider } from './IapProvider';
import { MockRevenueCat } from './MockRevenueCat';

// The IAP provider singleton (M5 P2 · decision 0073). One provider per process, chosen by `IAP_PROVIDER`
// (default 'mock'). The real RevenueCatProvider swaps in at P2b behind the same interface — call sites
// (the IAP service) depend only on `IapProvider`. Overridable in tests via `setIapProvider`.

let provider: IapProvider | null = null;

export function getIapProvider(): IapProvider {
  if (!provider) {
    const env = loadEnv();
    if (env.iapProvider === 'mock') {
      provider = new MockRevenueCat({ webhookAuthSecret: env.revenueCatWebhookAuth });
    } else {
      // P2b: `new RevenueCatProvider({ apiKey: env.revenueCatSecretApiKey, webhookAuthSecret: … })`
      // lands here — the ONLY line the real swap-in touches.
      throw new Error(
        `IAP_PROVIDER='${env.iapProvider}' is not wired until P2b — only 'mock' exists in P2.`,
      );
    }
  }
  return provider;
}

/** Test/seam hook — inject an alternate provider (e.g. a mock with a known webhook secret). */
export function setIapProvider(next: IapProvider): void {
  provider = next;
}

/** Test hook — drop the singleton so the next `getIapProvider()` rebuilds from env. */
export function resetIapProvider(): void {
  provider = null;
}

export type { IapProvider, ValidatedReceipt } from './IapProvider';
export { MockRevenueCat, encodeMockReceipt, encodeMockSubscriber } from './MockRevenueCat';
