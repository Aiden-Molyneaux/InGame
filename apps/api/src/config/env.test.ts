import { describe, it, expect, afterEach } from 'vitest';
import { loadEnv } from './env';
import { getIapProvider, resetIapProvider } from '../services/iap';

// M5 F-3 (§4 economy-audit HIGH) — the fail-closed production floor on the IAP provider. The
// MockRevenueCat accepts any hand-built `mockrcpt.v1.*` token, so a production process running it is
// a forgeable free-Pixel faucet: production must REFUSE 'mock' AND refuse an UNSET provider (unset
// must fail loudly, never silently mean mock). Outside production, unset still defaults to 'mock'
// (the standing dev/test posture). Tags: ECON-06, SYS-03, F03 (the assertDisposableDb pattern).

const BASE = { DATABASE_URL: 'postgres://x', JWT_SIGNING_SECRET: 's'.repeat(24) };

describe('loadEnv — the IAP provider production floor (ECON-06 fail-closed)', () => {
  it("nodeEnv=production + IAP_PROVIDER='mock' → loadEnv throws the refusal", () => {
    expect(() => loadEnv({ ...BASE, NODE_ENV: 'production', IAP_PROVIDER: 'mock' })).toThrow(
      /IAP_PROVIDER='mock' is refused in production/,
    );
  });

  it('nodeEnv=production + IAP_PROVIDER unset → loadEnv throws (explicit value required)', () => {
    expect(() => loadEnv({ ...BASE, NODE_ENV: 'production' })).toThrow(
      /IAP_PROVIDER is required in production/,
    );
  });

  it("nodeEnv=production + a real provider value passes loadEnv (wired at P2b)", () => {
    const env = loadEnv({ ...BASE, NODE_ENV: 'production', IAP_PROVIDER: 'revenuecat' });
    expect(env.iapProvider).toBe('revenuecat');
  });

  it("outside production, unset defaults to 'mock' and 'mock' is accepted (dev/test posture)", () => {
    expect(loadEnv({ ...BASE, NODE_ENV: 'development' }).iapProvider).toBe('mock');
    expect(loadEnv({ ...BASE, NODE_ENV: 'test', IAP_PROVIDER: 'mock' }).iapProvider).toBe('mock');
    expect(loadEnv({ ...BASE }).iapProvider).toBe('mock'); // NODE_ENV unset ⇒ development
  });
});

describe('getIapProvider — defense-in-depth (the build site refuses the mock under production too)', () => {
  const saved = { NODE_ENV: process.env.NODE_ENV, IAP_PROVIDER: process.env.IAP_PROVIDER };

  afterEach(() => {
    if (saved.NODE_ENV === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = saved.NODE_ENV;
    if (saved.IAP_PROVIDER === undefined) delete process.env.IAP_PROVIDER;
    else process.env.IAP_PROVIDER = saved.IAP_PROVIDER;
    resetIapProvider();
  });

  it('nodeEnv=production + mock → getIapProvider throws (loadEnv fires first; the seam stays closed)', () => {
    process.env.NODE_ENV = 'production';
    process.env.IAP_PROVIDER = 'mock';
    resetIapProvider();
    expect(() => getIapProvider()).toThrow(/refused in production/);
  });

  it('outside production the mock builds normally', () => {
    process.env.NODE_ENV = 'test';
    process.env.IAP_PROVIDER = 'mock';
    resetIapProvider();
    expect(getIapProvider()).toBeDefined();
  });
});
