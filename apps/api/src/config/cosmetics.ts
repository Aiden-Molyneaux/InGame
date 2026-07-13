// COSM-03/ECON-01 cosmetic pricing config (M5 P4 — decision 0072/0073). SYS-04-tunable, config-not-
// schema, mirroring `config/economy.ts` (the floor/grant anchors) and `config/rate-limits.ts` (the
// override/clear test-escape-hatch pattern). Two concerns live here:
//
//  1. THE 7-TIER LADDER (decision 0072 ruling 2) — tier name → PX price. Fixed, product-ruled.
//  2. THE COSMETIC REGISTRY — cosmeticId → tier (or `null` for a REGISTERED FREE/basic item). This is
//     the per-item roster re-tag (0072/0073 §0.2 residue) — a **focused P10 pass, NOT ruled yet**. The
//     registry is INTENTIONALLY EMPTY in real data (the roster stays all-basic/free per decision 0073
//     §0.2 until that pass lands) — every real cosmeticId reads as UNKNOWN (404) until P10 seeds it.
//     Tests register FIXTURE cosmetics via `registerCosmeticForTest` (never real roster ids — that
//     would invent the untaken ruling). P10's natural home for this is the `cosmetic_items` GLOBAL
//     table already reserved on the F32 manifest (packages/shared) — this in-memory registry is the
//     provisional mechanism P4 was scoped to build; swapping it for a DB-backed catalog is a same-
//     shaped follow-up (the function signatures below are the seam), not a P4 concern.

export const COSMETIC_TIERS = [
  'accent',
  'trim',
  'standard',
  'deluxe',
  'big',
  'showpiece',
  'ultimate',
] as const;
export type CosmeticTier = (typeof COSMETIC_TIERS)[number];

/** The decision-0072 launch ladder (PX). Base rate 5 PX/$ — see product-spec ECON-01. */
export const TIER_PRICES: Record<CosmeticTier, number> = {
  accent: 1,
  trim: 2,
  standard: 3,
  deluxe: 4,
  big: 6,
  showpiece: 8,
  ultimate: 10,
};

/** The PX price for a tier; a registered-free item (`null`/`undefined` tier) costs 0. */
export function priceForTier(tier: CosmeticTier | null | undefined): number {
  return tier ? TIER_PRICES[tier] : 0;
}

// ── The registry (empty in real data — see the file banner) ────────────────────────────────────────────
const REGISTRY = new Map<string, CosmeticTier | null>();

/**
 * Look up a cosmetic's tier. Returns `undefined` when the id is NOT REGISTERED AT ALL (the
 * `NotFoundError` case every acquire path 404s on) — distinct from a registered-but-FREE item, which
 * returns `null` (a known, always-owned, zero-price item; COSM-03 gates only premium items, so a free
 * id never needs an entitlement row).
 */
export function lookupCosmeticTier(cosmeticId: string): CosmeticTier | null | undefined {
  return REGISTRY.has(cosmeticId) ? REGISTRY.get(cosmeticId)! : undefined;
}

/** Test-only: register a fixture cosmetic (never a real roster id — see the file banner). */
export function registerCosmeticForTest(cosmeticId: string, tier: CosmeticTier | null): void {
  REGISTRY.set(cosmeticId, tier);
}

/** Test-only: clear all fixture registrations between test cases. */
export function clearCosmeticRegistryForTest(): void {
  REGISTRY.clear();
}

// ── CARD-06 derivation support ──────────────────────────────────────────────────────────────────────
// A composition's CLOSED attributes stay `kind`/`color`-keyed in the schema (render/composition.ts:
// "they reference cosmetic ids once the Styler + COSM roster formalize them") — frame/effect/finish/
// nameplate-SHAPE carry no cosmeticId today, so they are NOT coverable here without either a
// composition-schema change or a kind+color→id resolver (out of P4's scope; flagged in the P4 receipt).
// The two fields that DO carry a real id already are `fontId` (text elements + the nameplate) and
// `iconId` (icon elements) — CARD-06 checks those against the SAME registry acquire prices against, so
// a fixture id used in a test composition is also a valid acquire target (one id space, no synthetic
// namespacing).

interface ComposedRefShape {
  elements?: Array<Record<string, unknown>>;
  nameplate?: Record<string, unknown>;
}

/** The cosmeticIds a composition references, from its id-bearing fields only (see the banner above). */
export function collectCosmeticRefs(composition: unknown): string[] {
  const c = (composition ?? {}) as ComposedRefShape;
  const refs: string[] = [];
  for (const el of c.elements ?? []) {
    if (!el || typeof el !== 'object') continue;
    if (el.type === 'icon' && typeof el.iconId === 'string') refs.push(el.iconId);
    if (el.type === 'text' && typeof el.fontId === 'string') refs.push(el.fontId);
  }
  if (c.nameplate && typeof c.nameplate.fontId === 'string') refs.push(c.nameplate.fontId);
  return refs;
}

/** CARD-06 — true iff the composition references any REGISTERED PREMIUM cosmetic id. */
export function isPremiumComposition(composition: unknown): boolean {
  return collectCosmeticRefs(composition).some((id) => {
    const tier = lookupCosmeticTier(id);
    return tier !== undefined && tier !== null;
  });
}
