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
  // CAT-13/14 (M6 W-6) — the wiki edit history on the GLOBAL catalog. Community data every user
  // reads (the lastEdit attribution + the revertible ledger); writes ride the CAT-13 service gates
  // (age-gate · MOD-07 · rate buckets), not actor scoping — the editor_id column is attribution,
  // not an owner key (an edit row is readable/revertible by non-editors per CAT-14).
  'game_edits',
  // Cosmetics library (definitions, not per-user entitlements)
  'cosmetic_items',
  'cosmetic_packs',
  // Store catalog (product definitions, not per-user receipts/wallets)
  'store_products',
  // Achievement DEFINITIONS (M6 P6 — the SYS-04-seeded starter content, decision 0077). GLOBAL
  // content every user reads the same (like games/cosmetics); the PER-USER progress lives in the
  // user-owned `user_achievements` (owner key = user_id → fails closed, scoped by asActor).
  'achievement_definitions',
] as const;

export type GlobalTable = (typeof GLOBAL_TABLES)[number];

export function isGlobalTable(name: string): name is GlobalTable {
  return (GLOBAL_TABLES as readonly string[]).includes(name);
}
