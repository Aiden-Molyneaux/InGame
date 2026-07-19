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
  // AUTH-04 (auth-epic P-B; SYS-05/G-K async, owner-nod #6) — the 6-digit-code exchange. Guess math:
  // 10^6 code space ÷ 5 attempts-per-code ÷ 10 IP-tries/min ÷ 30-min TTL ⇒ online guessing is dead.
  'auth:reset-verify': { limit: 10, windowMs: 60_000 },
  'auth:reset-confirm': { limit: 10, windowMs: 60_000 },
  'auth:verify-request': { limit: 5, windowMs: 60_000 },
  'auth:verify-confirm': { limit: 10, windowMs: 60_000 },
  'auth:username-available': { limit: 30, windowMs: 60_000 },
  'auth:apple': { limit: 20, windowMs: 60_000 },
  // M3 — SYS-05, owner-approved G-K values (CAT-02/03, OQ-094). Catalog-create is two-tier: a
  // per-minute burst cap AND a per-day cap — both mounted as stacked middlewares (both must pass).
  'catalog:create': { limit: 10, windowMs: 60_000 },
  'catalog:create:daily': { limit: 200, windowMs: 24 * 60 * 60_000 },
  // M6 W-6 wiki game-edits (CAT-13 · game-edit-wiki-draft §2.2, owner-approved; SYS-05/G-K async).
  // Stacked pair per the `catalog:create` precedent (both mounted, both must pass): ten a minute
  // covers a genuine fix-up burst across several games; fifty a day is far beyond honest use and
  // starves a vandalism loop to a trickle the CAT-14 history can absorb and revert.
  'catalog:edit': { limit: 10, windowMs: 60_000 },
  'catalog:edit:daily': { limit: 50, windowMs: 24 * 60 * 60_000 },
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
  // M5 P3 publish (decision 0073 §0.7 — CARD-19). Stacked pair per the `catalog:create` precedent: a
  // per-10-min burst cap AND a per-day cap (both mounted as middlewares — both must pass). Publishing
  // is a deliberate, infrequent act; a flatten runs server-side, so the burst cap is deliberately tight.
  'cards:publish': { limit: 3, windowMs: 10 * 60_000 },
  'cards:publish:daily': { limit: 10, windowMs: 24 * 60 * 60_000 },
  // M5 P3 adopt (decision 0073 §0.7 — closes OQ-097's uncapped-bulk-adopt hole). Stacked pair: a
  // per-minute burst cap AND a per-day cap. 30/min covers a browse-and-collect burst; 200/day is ample.
  'cards:adopt': { limit: 30, windowMs: 60_000 },
  'cards:adopt:daily': { limit: 200, windowMs: 24 * 60 * 60_000 },
  // M5 P2 IAP receipt validation (decision 0073 §0.7 — `iap:validate` 10/min; SYS-05/G-K async). A real
  // purchase/restore is infrequent; 10/min covers a restore-all burst. The webhook is server-to-server
  // (signature-gated, not IP-keyed) and is NOT rate-limited here.
  'iap:validate': { limit: 10, windowMs: 60_000 },
  // M6 P1 friend requests (decision 0076 §0.7 — SOC-08). Stacked pair per the `cards:publish`
  // precedent: a per-HOUR cap AND a per-day cap (both mounted as middlewares — both must pass). Sending
  // requests is a deliberate, social act; the cooldown handles re-request spam, these cap fan-out abuse.
  'friends:request': { limit: 10, windowMs: 60 * 60_000 },
  'friends:request:daily': { limit: 30, windowMs: 24 * 60 * 60_000 },
  // M6 P3 find + invite (decision 0076 §0.6/§0.7 — SOC-07/10; SYS-05/G-K async, all tunable).
  // Minting an invite is a deliberate, infrequent share act — 5/day (the §0.7 seed). Keyed by
  // (bucket, actor-IP) like every other bucket.
  'invites:create': { limit: 5, windowMs: 24 * 60 * 60_000 },
  // People-search — 30/min (the §0.7 seed). A generous editing/typing budget; the only way past it is
  // a scripted enumeration client (which exact-match already starves — no prefix crawl).
  'users:search': { limit: 30, windowMs: 60_000 },
  // M6 P4 recommendations (decision 0076 §0.7 — SOC-05; SYS-05/G-K async, tunable). Recommending a game
  // to a friend is a deliberate social act — 20/day (the §0.7 seed). Keyed by (bucket, actor-IP) like
  // every other bucket. GET /me/recommendations + GET /me/feed are self-scoped reads (not bucketed here).
  'recommendations:create': { limit: 20, windowMs: 24 * 60 * 60_000 },
  // Invite RESOLVE (SYS-05 — NOT in the §0.7 seed; builder's pick, flagged for G-K). The resolve is an
  // UNAUTHENTICATED, IP-keyed bearer read (a fresh install may hit it), so it needs its own IP throttle
  // against token-guessing/enumeration. 30/min per IP mirrors the search budget: ample for a human
  // scanning a QR (one hit) or tapping a link (one hit), tight against a brute-force scanner. The token
  // is 256-bit random so guessing is infeasible regardless; this caps the attempt RATE as defence-in-depth.
  'invites:resolve': { limit: 30, windowMs: 60_000 },
  // M6 P5 WTP queue + Top-10 writes (SYS-05 — NOT in the §0.7 seed table; builder's pick, flagged for
  // G-K, same posture as `invites:resolve` above). Mirrors the `collection:write` precedent exactly
  // (60/min — ample for a real drag-reorder/add burst; the only way past it is a scripted client).
  'queue:write': { limit: 60, windowMs: 60_000 },
  'lists:write': { limit: 60, windowMs: 60_000 },
  // M6 P7 report capture (decision 0076 §0.7 — MOD-01). The reporter-cap half of OQ-093 (dedupe stays
  // M7). 10/day is ample for a real user filing several genuine reports; a scripted flooder is the
  // only way past it.
  'reports:create': { limit: 10, windowMs: 24 * 60 * 60_000 },
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
