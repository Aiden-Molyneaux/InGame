import { describe, it, expect, afterEach } from 'vitest';
import { loadEnv } from '../config/env';
import {
  getAppleVerifier,
  setAppleVerifier,
  resetAppleVerifier,
  stubAppleVerifier,
  RealAppleVerifier,
} from './apple-verifier';

// AUTH-03/09 (auth-epic P-D) — the APPLE_VERIFIER selection seam: the fail-closed production floor
// (verbatim the IAP_PROVIDER/EMAIL_PROVIDER F03 pattern — the stub accepts forgeable mock.* tokens,
// so a production process running it is total account takeover) + the build-site defense-in-depth.
// The RealAppleVerifier's TOKEN behavior (fixture JWKS, nonce binding, alg confusion, claim
// normalization) is integration-tested end-to-end in test/integration/auth-slice.test.ts.

const BASE = { DATABASE_URL: 'postgres://x', JWT_SIGNING_SECRET: 's'.repeat(24) };
const PROD_REST = { IAP_PROVIDER: 'revenuecat', EMAIL_PROVIDER: 'resend' }; // the sibling floors

describe('loadEnv — the APPLE verifier production floor (AUTH-03 fail-closed)', () => {
  it("nodeEnv=production + APPLE_VERIFIER='stub' → loadEnv throws the refusal", () => {
    expect(() =>
      loadEnv({ ...BASE, ...PROD_REST, NODE_ENV: 'production', APPLE_VERIFIER: 'stub' }),
    ).toThrow(/APPLE_VERIFIER='stub' is refused in production/);
  });

  it('nodeEnv=production + APPLE_VERIFIER unset → loadEnv throws (explicit value required)', () => {
    expect(() => loadEnv({ ...BASE, ...PROD_REST, NODE_ENV: 'production' })).toThrow(
      /APPLE_VERIFIER is required in production/,
    );
  });

  it("nodeEnv=production + 'apple' passes; the bundle-id default is the M1-P App ID", () => {
    const env = loadEnv({ ...BASE, ...PROD_REST, NODE_ENV: 'production', APPLE_VERIFIER: 'apple' });
    expect(env.appleVerifier).toBe('apple');
    expect(env.appleBundleId).toBe('com.aidenmolyneaux.ingame');
  });

  it("outside production, unset defaults to 'stub' (dev/test posture)", () => {
    expect(loadEnv({ ...BASE, NODE_ENV: 'development' }).appleVerifier).toBe('stub');
    expect(loadEnv({ ...BASE, NODE_ENV: 'test' }).appleVerifier).toBe('stub');
  });
});

describe('getAppleVerifier — selection + defense-in-depth at the build site', () => {
  const saved = { NODE_ENV: process.env.NODE_ENV, APPLE_VERIFIER: process.env.APPLE_VERIFIER };

  afterEach(() => {
    if (saved.NODE_ENV === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = saved.NODE_ENV;
    if (saved.APPLE_VERIFIER === undefined) delete process.env.APPLE_VERIFIER;
    else process.env.APPLE_VERIFIER = saved.APPLE_VERIFIER;
    delete process.env.IAP_PROVIDER;
    delete process.env.EMAIL_PROVIDER;
    resetAppleVerifier();
  });

  it('outside production the stub builds by default', () => {
    process.env.NODE_ENV = 'test';
    delete process.env.APPLE_VERIFIER;
    resetAppleVerifier();
    expect(getAppleVerifier()).toBe(stubAppleVerifier);
  });

  it('nodeEnv=production + stub → getAppleVerifier throws (loadEnv fires first; the seam stays closed)', () => {
    process.env.NODE_ENV = 'production';
    process.env.APPLE_VERIFIER = 'stub';
    process.env.IAP_PROVIDER = 'revenuecat';
    process.env.EMAIL_PROVIDER = 'resend';
    resetAppleVerifier();
    expect(() => getAppleVerifier()).toThrow(/refused in production/);
  });

  it("APPLE_VERIFIER='apple' builds the RealAppleVerifier", () => {
    process.env.NODE_ENV = 'test';
    process.env.APPLE_VERIFIER = 'apple';
    resetAppleVerifier();
    expect(getAppleVerifier()).toBeInstanceOf(RealAppleVerifier);
  });

  it('an unknown verifier value throws (no silent fallback)', () => {
    process.env.NODE_ENV = 'test';
    process.env.APPLE_VERIFIER = 'google';
    resetAppleVerifier();
    expect(() => getAppleVerifier()).toThrow(/not a known verifier/);
  });

  it('setAppleVerifier injects (the downstream stub suites keep the stub through the seam)', () => {
    setAppleVerifier(stubAppleVerifier);
    expect(getAppleVerifier()).toBe(stubAppleVerifier);
  });
});
