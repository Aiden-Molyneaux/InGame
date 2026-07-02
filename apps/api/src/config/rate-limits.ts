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
