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

// ── SOC-10 invite-token mechanics (decision 0076 §0.6 — SYS-04-tunable, G-K posture) ────────────────

/**
 * SOC-10 invite TTL (decision 0076 §0.6). A minted invite token is valid for 7 days; a resolve after
 * this expiry returns INVITE_EXPIRED. Server-configurable WITHOUT an app release (SYS-04).
 */
export const INVITE_TTL_DAYS = 7;

/**
 * SOC-10 active-invite cap (decision 0076 §0.6). At most 5 ACTIVE (unrevoked, unexpired) invite tokens
 * per user; minting a 6th REVOKES the oldest active one (create-new-invalidates-oldest). Owner-tunable.
 */
export const INVITE_MAX_ACTIVE = 5;

let inviteTtlDays = INVITE_TTL_DAYS;
let inviteMaxActive = INVITE_MAX_ACTIVE;

/** The TTL expiry stamp for an invite minted `now` (SYS-04 window applied). */
export function inviteExpiresAt(now: Date = new Date()): Date {
  return new Date(now.getTime() + inviteTtlDays * 24 * 60 * 60 * 1000);
}

/** The current active-invite cap (read at mint time so a test override takes effect). */
export function inviteMaxActiveCount(): number {
  return inviteMaxActive;
}

/** Test-only: shrink the invite TTL so an expiry-boundary test can assert cheaply. */
export function setInviteTtlDaysForTest(days: number): void {
  inviteTtlDays = days;
}

/** Test-only: shrink the active cap so a cap-rotation test needn't mint the full launch-seed count. */
export function setInviteMaxActiveForTest(count: number): void {
  inviteMaxActive = count;
}

/** Test-only: restore the SYS-04 launch-seed invite mechanics between test cases. */
export function resetInviteConfigForTest(): void {
  inviteTtlDays = INVITE_TTL_DAYS;
  inviteMaxActive = INVITE_MAX_ACTIVE;
}

// ── SOC-05 recommendation-note length + SOC-06 feed aggregation window (M6 P4 — SYS-04-tunable) ──────

/**
 * SOC-05 recommendation-note max length (M6 P4). SYS-02 pins per-field maxlengths (username 3–20 · bio
 * ≤140 · collection notes ≤500 · report/feedback ≤1000); a rec note has NO enumerated number in the
 * contract, so it takes the ≤500 "short personal note" tier (matching collection notes — a rec note is a
 * one-line "you should play this!", not a letter). Server-configurable WITHOUT an app release (SYS-04).
 * The note is UNSCREENED at M6 (MOD-07 text-screening rides M7 — accepted for the trusted beta, recorded).
 */
export const RECOMMENDATION_NOTE_MAX = 500;

/**
 * SOC-06 feed aggregation window (M6 P4, decision #4). Friend activity is aggregated by actor+type into
 * FIXED wall-clock UTC buckets of this width — one feed item per (actor, type, window). Fixed (not
 * sliding) buckets make each item's identity `(actor, type, windowStart)` IMMUTABLE, which is what makes
 * the keyset cursor stable under concurrent inserts (a new event only bumps an existing bucket's
 * `aggregateCount`; it never moves the item's sort key). 6h is low-noise without collapsing a whole day's
 * distinct sessions. Server-configurable (SYS-04).
 */
export const FEED_WINDOW_MS = 6 * 60 * 60 * 1000;

let feedWindowMs = FEED_WINDOW_MS;

/** The active feed aggregation-window width (read at build time so a test override takes effect). */
export function feedWindowMsValue(): number {
  return feedWindowMs;
}

/** Test-only: shrink/lengthen the feed window so an aggregation-boundary test can assert cheaply. */
export function setFeedWindowMsForTest(ms: number): void {
  feedWindowMs = ms;
}

/** Test-only: restore the SYS-04 launch-seed feed window between test cases. */
export function resetFeedWindowForTest(): void {
  feedWindowMs = FEED_WINDOW_MS;
}
