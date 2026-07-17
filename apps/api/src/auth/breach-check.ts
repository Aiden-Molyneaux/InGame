import { createHash } from 'node:crypto';
import { loadEnv } from '../config/env';
import { track } from '../observability/funnel';
import { logger } from '../observability/logger';

// AUTH-01 (decision 0076 §0.9) — the HaveIBeenPwned "Pwned Passwords" RANGE API, k-ANONYMITY mode: the
// password is SHA-1 hashed locally, only the 5-character hex PREFIX is sent to the provider, and the
// match is decided locally against the returned SUFFIX list — the plaintext password (and even its
// full hash) never leaves this process. Plain `fetch` (Node 20 global) — NO new runtime dependency.
//
// FAIL-OPEN (availability beats the check, per 0076 §0.9): a timeout, network error, or non-2xx
// response never blocks register/reset — it resolves `{ breached: false, skipped: true }` and fires a
// `breachCheckSkipped` funnel event (the telemetry the ruling asks for) + a warn log line. SYS-04
// kill-switch: `BREACH_CHECK_ENABLED=false` (config/env.ts) skips the network call entirely, the same
// skipped shape — a manual off-ramp if the provider becomes unreachable / starts rate-limiting us.

const HIBP_RANGE_URL = 'https://api.pwnedpasswords.com/range/';
const TIMEOUT_MS = 2_000;

export interface BreachCheckResult {
  /** true when the password's hash suffix was found in the HIBP range response. */
  breached: boolean;
  /** true when the check did NOT run to completion (kill-switch off, timeout, network/HTTP error). */
  skipped: boolean;
}

function sha1UpperHex(password: string): string {
  return createHash('sha1').update(password, 'utf8').digest('hex').toUpperCase();
}

function skipped(reason: string): BreachCheckResult {
  // The 0076 §0.9 telemetry signal — a stable event name a dashboard/alert can key off, plus a
  // human-readable warn log line for local/dev visibility.
  track({ name: 'breachCheckSkipped', props: { reason } });
  logger.warn({ reason }, 'breachCheckSkipped');
  return { breached: false, skipped: true };
}

/**
 * Check a candidate password against the HIBP range API. `fetchImpl` is injectable (unit tests mock
 * it — the real HIBP endpoint is NEVER called in tests). Call sites: AUTH-01 register + the
 * password-reset confirm (the one place a password changes on an existing account, api-contract has
 * no separate "change password" endpoint at M6).
 */
export async function checkPasswordBreached(
  password: string,
  fetchImpl: typeof fetch = fetch,
): Promise<BreachCheckResult> {
  if (!loadEnv().breachCheckEnabled) {
    return skipped('kill_switch_off');
  }

  const hash = sha1UpperHex(password);
  const prefix = hash.slice(0, 5);
  const suffix = hash.slice(5);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetchImpl(`${HIBP_RANGE_URL}${prefix}`, {
      signal: controller.signal,
      headers: { 'Add-Padding': 'true' }, // HIBP's response-size-padding mitigation; harmless if ignored
    });
    if (!res.ok) {
      return skipped(`http_${res.status}`);
    }
    const body = await res.text();
    const breached = body.split('\n').some((line) => {
      const [lineSuffix] = line.trim().split(':');
      return lineSuffix === suffix;
    });
    return { breached, skipped: false };
  } catch (e) {
    const reason = e instanceof Error && e.name === 'AbortError' ? 'timeout' : 'network_error';
    return skipped(reason);
  } finally {
    clearTimeout(timer);
  }
}
