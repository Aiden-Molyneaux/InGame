import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { checkPasswordBreached } from './breach-check';

// AUTH-01 (decision 0076 §0.9) — unit tests for the HIBP k-anonymity breach check. `fetchImpl` is
// injected in EVERY case here — the real HIBP endpoint is NEVER called in tests (per the packet
// brief). SHA-1('correcthorsebatterystaple')… no — we use the plain, famously-breached fixture
// 'password': SHA-1 = 5BAA61E4C9B93F3F0682250B6CF8331B7EE68FD8. Used only as a stable test fixture,
// never a real credential.

const PASSWORD = 'password';
const HASH = '5BAA61E4C9B93F3F0682250B6CF8331B7EE68FD8';
const PREFIX = HASH.slice(0, 5);
const SUFFIX = HASH.slice(5);

function textResponse(status: number, body: string): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    text: async () => body,
  } as unknown as Response;
}

describe('AUTH-01: checkPasswordBreached', () => {
  const ORIGINAL = process.env.BREACH_CHECK_ENABLED;
  // The `unit` project runs with BREACH_CHECK_ENABLED=false by default (vitest.workspace.ts — so the
  // REST of the suite never depends on network access); this suite is THE place that exercises the
  // check with it actually on, so every case here explicitly enables it except the one that tests the
  // kill-switch itself.
  beforeEach(() => {
    process.env.BREACH_CHECK_ENABLED = 'true';
  });
  afterEach(() => {
    if (ORIGINAL === undefined) delete process.env.BREACH_CHECK_ENABLED;
    else process.env.BREACH_CHECK_ENABLED = ORIGINAL;
  });

  it('k-anonymity: sends ONLY the 5-char PREFIX as the last URL segment — never the full hash/suffix/password', async () => {
    let calledUrl = '';
    const fetchImpl = (async (url: string) => {
      calledUrl = String(url);
      return textResponse(200, '');
    }) as unknown as typeof fetch;
    await checkPasswordBreached(PASSWORD, fetchImpl);
    // The URL's final path segment IS the prefix, exactly (not merely "contains" it — `toContain`
    // alone would pass even if the full hash/password were smuggled in elsewhere in the URL).
    const lastSegment = calledUrl.split('/').pop();
    expect(lastSegment).toBe(PREFIX);
    expect(calledUrl).not.toContain(SUFFIX);
    expect(calledUrl).not.toContain(HASH);
  });

  it('a KNOWN-breached password (suffix present in the range response) → breached: true', async () => {
    const fetchImpl = (async () =>
      textResponse(200, `${SUFFIX}:37\r\nAAAA0000000000000000000000000000000:1`)) as unknown as typeof fetch;
    const result = await checkPasswordBreached(PASSWORD, fetchImpl);
    expect(result).toEqual({ breached: true, skipped: false });
  });

  it('a CLEAN password (suffix absent from the range response) → breached: false, skipped: false', async () => {
    const fetchImpl = (async () =>
      textResponse(
        200,
        `AAAA0000000000000000000000000000000:1\r\nBBBB1111111111111111111111111111111:2`,
      )) as unknown as typeof fetch;
    const result = await checkPasswordBreached(PASSWORD, fetchImpl);
    expect(result).toEqual({ breached: false, skipped: false });
  });

  it('a non-2xx provider response FAILS OPEN → skipped: true, never blocks', async () => {
    const fetchImpl = (async () => textResponse(500, '')) as unknown as typeof fetch;
    const result = await checkPasswordBreached(PASSWORD, fetchImpl);
    expect(result).toEqual({ breached: false, skipped: true });
  });

  it('a timeout (AbortError) FAILS OPEN → skipped: true, never blocks', async () => {
    const fetchImpl = (async () => {
      const err = new Error('The operation was aborted.');
      err.name = 'AbortError';
      throw err;
    }) as unknown as typeof fetch;
    const result = await checkPasswordBreached(PASSWORD, fetchImpl);
    expect(result).toEqual({ breached: false, skipped: true });
  });

  it('a plain network error FAILS OPEN → skipped: true, never blocks', async () => {
    const fetchImpl = (async () => {
      throw new Error('getaddrinfo ENOTFOUND api.pwnedpasswords.com');
    }) as unknown as typeof fetch;
    const result = await checkPasswordBreached(PASSWORD, fetchImpl);
    expect(result).toEqual({ breached: false, skipped: true });
  });

  it('SYS-04 kill-switch (BREACH_CHECK_ENABLED=false) → skipped WITHOUT calling fetch at all', async () => {
    process.env.BREACH_CHECK_ENABLED = 'false';
    let called = false;
    const fetchImpl = (async () => {
      called = true;
      return textResponse(200, '');
    }) as unknown as typeof fetch;
    const result = await checkPasswordBreached(PASSWORD, fetchImpl);
    expect(result).toEqual({ breached: false, skipped: true });
    expect(called).toBe(false);
  });
});
