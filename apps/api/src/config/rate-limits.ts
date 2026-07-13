// SYS-05 rate-limit rules (F17). Server-configurable WITHOUT an app release (SYS-04); the owner signs
// off on the numbers before they take effect (gate G-K, async / safe-default-until-approved). These
// are conservative defaults. The reset-request / verify-request buckets double as the AUTH-11
// resend caps; the username-available bucket is the AUTH-11 advisory throttle (the one existence
// signal, deliberately rate-limited).

export interface RateLimitRule {
  limit: number;
  windowMs: number;
}

const DEFAULTS: Record<string, RateLimitRule> = {
  'auth:register': { limit: 10, windowMs: 60_000 },
  'auth:login': { limit: 10, windowMs: 60_000 },
  'auth:refresh': { limit: 30, windowMs: 60_000 },
  'auth:logout': { limit: 30, windowMs: 60_000 },
  'auth:reset-request': { limit: 5, windowMs: 60_000 },
  'auth:reset-confirm': { limit: 10, windowMs: 60_000 },
  'auth:verify-request': { limit: 5, windowMs: 60_000 },
  'auth:verify-confirm': { limit: 10, windowMs: 60_000 },
  'auth:username-available': { limit: 30, windowMs: 60_000 },
  'auth:apple': { limit: 20, windowMs: 60_000 },
  // M3 — SYS-05, owner-approved G-K values (CAT-02/03, OQ-094). Catalog-create is two-tier: a
  // per-minute burst cap AND a per-day cap — both mounted as stacked middlewares (both must pass).
  'catalog:create': { limit: 10, windowMs: 60_000 },
  'catalog:create:daily': { limit: 200, windowMs: 24 * 60 * 60_000 },
  // Collection writes (add · status/hours · reorder · delete · now-playing) share one cap (OQ-094) —
  // 60/min is ample for any real editing burst; the only way past it is a scripted/abusive client.
  'collection:write': { limit: 60, windowMs: 60_000 },
  // M4 card-substrate writes (decision 0066). The autosave PATCH is debounced client-side (~1-2s),
  // so 120/min covers the hottest legitimate editing session; presets share the collection posture.
  'cards:write': { limit: 120, windowMs: 60_000 },
  // M4 §3.5 Device-editor writes (decision 0030). The PATCH is debounced client-side per the ARCH-3
  // one-write-pipeline (~1-2s), so 120/min covers the hottest live-edit session; SAVE CURRENT/delete
  // share the bucket. Mirrors the cards:write posture.
  'device:write': { limit: 120, windowMs: 60_000 },
  // M5 economy spend paths (decision 0073 §0.7 — the P3/P4 adopt/acquire spend buckets; SYS-05/G-K
  // async). 30/min is ample for real editing/adopt bursts; the daily-bonus claim rides the fallback.
  'wallet:spend': { limit: 30, windowMs: 60_000 },
};

const overrides = new Map<string, RateLimitRule>();

export function getRule(bucket: string): RateLimitRule {
  return overrides.get(bucket) ?? DEFAULTS[bucket] ?? { limit: 60, windowMs: 60_000 };
}

/** Test-only: force a bucket to a tiny limit so a burst deterministically trips 429 (G-G). */
export function overrideRuleForTest(bucket: string, rule: RateLimitRule): void {
  overrides.set(bucket, rule);
}

export function clearRuleOverrides(): void {
  overrides.clear();
}
