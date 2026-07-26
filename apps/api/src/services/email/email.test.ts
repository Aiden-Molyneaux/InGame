import { describe, it, expect, afterEach, vi } from 'vitest';
import { loadEnv } from '../../config/env';
import {
  getEmailProvider,
  resetEmailProvider,
  setEmailProvider,
  clearOutbox,
  lastEmail,
  StubEmailProvider,
} from './index';
import { ResendProvider } from './ResendProvider';
import { sendVerification, sendPasswordResetCode, passwordResetCodeTemplate } from './email-service';

// AUTH-12 (auth-epic P-A) — the transactional-email substrate: the fail-closed production floor on
// EMAIL_PROVIDER (verbatim the IAP_PROVIDER / F03 pattern), the Resend adapter's HTTP shape, and the
// AUTH-08 allowlist (email_verify stays stub/log-only under EVERY provider until its redemption
// surface ships). Tags: AUTH-04/08/11/12, SYS-03, F03.

const BASE = { DATABASE_URL: 'postgres://x', JWT_SIGNING_SECRET: 's'.repeat(24) };

describe('loadEnv — the EMAIL provider production floor (AUTH-12 fail-closed)', () => {
  it("nodeEnv=production + EMAIL_PROVIDER='stub' → loadEnv throws the refusal", () => {
    expect(() =>
      loadEnv({ ...BASE, NODE_ENV: 'production', IAP_PROVIDER: 'revenuecat', EMAIL_PROVIDER: 'stub' }),
    ).toThrow(/EMAIL_PROVIDER='stub' is refused in production/);
  });

  it('nodeEnv=production + EMAIL_PROVIDER unset → loadEnv throws (explicit value required)', () => {
    expect(() => loadEnv({ ...BASE, NODE_ENV: 'production', IAP_PROVIDER: 'revenuecat' })).toThrow(
      /EMAIL_PROVIDER is required in production/,
    );
  });

  it('nodeEnv=production + a real provider value passes loadEnv', () => {
    const env = loadEnv({
      ...BASE,
      NODE_ENV: 'production',
      IAP_PROVIDER: 'revenuecat',
      EMAIL_PROVIDER: 'resend',
      RESEND_API_KEY: 're_test_123',
      APPLE_VERIFIER: 'apple', // the P-D floor rides along (same F03 pattern)
    });
    expect(env.emailProvider).toBe('resend');
    expect(env.resendApiKey).toBe('re_test_123');
  });

  it("outside production, unset defaults to 'stub' (dev/test posture) + EMAIL_FROM has its placeholder", () => {
    const env = loadEnv({ ...BASE, NODE_ENV: 'development' });
    expect(env.emailProvider).toBe('stub');
    expect(env.emailFrom).toBe('InGame <no-reply@mail.ingamehq.com>');
  });
});

describe('getEmailProvider — selection + defense-in-depth at the build site', () => {
  const saved = { NODE_ENV: process.env.NODE_ENV, EMAIL_PROVIDER: process.env.EMAIL_PROVIDER };

  afterEach(() => {
    if (saved.NODE_ENV === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = saved.NODE_ENV;
    if (saved.EMAIL_PROVIDER === undefined) delete process.env.EMAIL_PROVIDER;
    else process.env.EMAIL_PROVIDER = saved.EMAIL_PROVIDER;
    delete process.env.RESEND_API_KEY;
    delete process.env.IAP_PROVIDER;
    resetEmailProvider();
  });

  it('outside production the stub builds by default', () => {
    process.env.NODE_ENV = 'test';
    delete process.env.EMAIL_PROVIDER;
    resetEmailProvider();
    expect(getEmailProvider()).toBeInstanceOf(StubEmailProvider);
  });

  it('nodeEnv=production + stub → getEmailProvider throws (loadEnv fires first; the seam stays closed)', () => {
    process.env.NODE_ENV = 'production';
    process.env.EMAIL_PROVIDER = 'stub';
    process.env.IAP_PROVIDER = 'revenuecat';
    resetEmailProvider();
    expect(() => getEmailProvider()).toThrow(/refused in production/);
  });

  it("EMAIL_PROVIDER='resend' builds the Resend adapter (API key present)", () => {
    process.env.NODE_ENV = 'test';
    process.env.EMAIL_PROVIDER = 'resend';
    process.env.RESEND_API_KEY = 're_test_123';
    resetEmailProvider();
    expect(getEmailProvider()).toBeInstanceOf(ResendProvider);
  });

  it("EMAIL_PROVIDER='resend' with NO key throws loudly at build time (never a silent per-send failure)", () => {
    process.env.NODE_ENV = 'test';
    process.env.EMAIL_PROVIDER = 'resend';
    delete process.env.RESEND_API_KEY;
    resetEmailProvider();
    expect(() => getEmailProvider()).toThrow(/RESEND_API_KEY/);
  });

  it('an unknown provider value throws (no silent fallback)', () => {
    process.env.NODE_ENV = 'test';
    process.env.EMAIL_PROVIDER = 'sendgrid';
    resetEmailProvider();
    expect(() => getEmailProvider()).toThrow(/not a known provider/);
  });
});

describe('ResendProvider — the plain-fetch HTTP shape (no SDK)', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('POSTs api.resend.com/emails with bearer auth + {from,to,subject,text}', async () => {
    const fetchMock = vi.fn(async () => new Response('{}', { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);
    const provider = new ResendProvider({ apiKey: 're_key', from: 'InGame <no-reply@mail.ingamehq.com>' });
    await provider.send({ to: 'a@example.com', subject: 'Hello', text: 'body', html: '<p>body</p>' });

    expect(fetchMock).toHaveBeenCalledOnce();
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('https://api.resend.com/emails');
    expect(init.method).toBe('POST');
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer re_key');
    expect(JSON.parse(init.body as string)).toEqual({
      from: 'InGame <no-reply@mail.ingamehq.com>',
      to: ['a@example.com'],
      subject: 'Hello',
      text: 'body',
      html: '<p>body</p>',
    });
  });

  it('a non-2xx response throws (call sites decide the posture) without echoing the vendor body', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('{"message":"a@example.com is invalid"}', { status: 422, statusText: 'Unprocessable' })),
    );
    const provider = new ResendProvider({ apiKey: 're_key', from: 'x' });
    await expect(provider.send({ to: 'a@example.com', subject: 's', text: 't' })).rejects.toThrow(
      /HTTP 422/,
    );
    await expect(
      provider.send({ to: 'a@example.com', subject: 's', text: 't' }),
    ).rejects.not.toThrow(/a@example\.com/);
  });
});

describe('email-service — kind routing (the AUTH-08 allowlist) + the reset-code template', () => {
  afterEach(() => {
    resetEmailProvider();
    clearOutbox();
  });

  it("email_verify NEVER reaches the provider (allowlist: no real send yet, even under a 'real' provider)", async () => {
    const send = vi.fn(async () => {});
    setEmailProvider({ send }); // stands in for the real Resend adapter (a NON-stub provider)
    await sendVerification('v@example.com', 'tok_123');
    expect(send).not.toHaveBeenCalled(); // the AUTH-08 allowlist — no redemption surface yet
    // MED-2: off-stub (a prod/real-provider process) the outbox is NOT recorded — no plaintext token
    // retained in the module-level array (mirrors the password_reset off-stub assertion below).
    expect(lastEmail('email_verify', 'v@example.com')).toBeUndefined();
  });

  it('email_verify IS recorded on the stub/dev lane (the standing test hook the auth suite relies on)', async () => {
    setEmailProvider(new StubEmailProvider());
    await sendVerification('v@example.com', 'tok_123');
    expect(lastEmail('email_verify', 'v@example.com')?.token).toBe('tok_123');
  });

  it('password_reset_code DOES reach the provider, and the outbox is NOT recorded off-stub (no plaintext retention)', async () => {
    const send = vi.fn(async () => {});
    setEmailProvider({ send });
    await sendPasswordResetCode('r@example.com', '123456');
    expect(send).toHaveBeenCalledOnce();
    expect(lastEmail('password_reset', 'r@example.com')).toBeUndefined();
  });

  it('the reset-code template: code in subject+body, TTL stated, "didn\'t ask" line, plain-text first + html', () => {
    const msg = passwordResetCodeTemplate('r@example.com', '042117');
    expect(msg.subject).toContain('042117');
    expect(msg.text).toContain('042117');
    expect(msg.text).toMatch(/\d+ minutes/);
    expect(msg.text).toMatch(/Didn't ask/i);
    expect(msg.html).toContain('042117');
  });
});
