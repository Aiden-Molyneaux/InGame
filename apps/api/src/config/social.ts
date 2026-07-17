// SYS-04 social tuning values (decision 0076 §0.7 launch seeds) — server-configurable WITHOUT an app
// release and WITHOUT a schema change (the SYS-04 rule; mirrors config/economy.ts). Owner-tunable
// (gate G-K posture, safe-default-until-approved).

/**
 * SOC-08 re-request cooldown (decision 0076 §0.7). A friend request that the addressee DECLINES (or the
 * requester CANCELS) stamps a cooldown on that request row; a NEW request to the same person inside the
 * window is refused with `REQUEST_COOLDOWN { cooldownUntil }`. Default 7 days. The decline is silent, so
 * the cooldown is the only backpressure against re-request spam after a soft no.
 */
export const REQUEST_COOLDOWN_DAYS = 7;

let requestCooldownDays = REQUEST_COOLDOWN_DAYS;

/** The cooldown expiry stamp for a decline/cancel happening `now` (SYS-04 window applied). */
export function requestCooldownUntil(now: Date = new Date()): Date {
  return new Date(now.getTime() + requestCooldownDays * 24 * 60 * 60 * 1000);
}

/** Test-only: shrink/lengthen the cooldown window so a test can assert enforcement + expiry cheaply. */
export function setRequestCooldownDaysForTest(days: number): void {
  requestCooldownDays = days;
}

/** Test-only: restore the SYS-04 launch-seed cooldown between test cases. */
export function resetRequestCooldownForTest(): void {
  requestCooldownDays = REQUEST_COOLDOWN_DAYS;
}
