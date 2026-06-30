// F32 — the global-table manifest (decision 0051/F32). This list IS the allowlist the rule-2
// SYS-01 scope-lint (tools/lint) reads. Any table NOT on this list is treated as USER-OWNED and
// therefore FAILS CLOSED: a repository touching it must go through the SYS-01 scoped-query helper,
// and a `// SYS-01-EXEMPT` annotation is valid ONLY against a table listed here (else CI fails).
//
// The rule: every user-owned table carries a non-null owner/actor FK the scoped helper requires;
// global tables are this enumerated exempt list (catalog · cosmetics · achievements · genres). The
// lint proves the helper was CALLED; the actor-id correctness is proven by the SYS-07 4xx tests.

export const GLOBAL_TABLES = [
  // Catalog (community-owned, not user-scoped)
  'games',
  'genres',
  'game_genres',
  // Cosmetics library (definitions, not per-user entitlements)
  'cosmetic_items',
  'cosmetic_packs',
  // Store catalog (product definitions, not per-user receipts/wallets)
  'store_products',
  // Achievement definitions (not per-user progress)
  'achievements',
] as const;

export type GlobalTable = (typeof GLOBAL_TABLES)[number];

export function isGlobalTable(name: string): name is GlobalTable {
  return (GLOBAL_TABLES as readonly string[]).includes(name);
}
