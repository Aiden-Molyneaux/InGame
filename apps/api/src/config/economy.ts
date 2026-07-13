// SYS-04 economy tuning values (decision 0072/0073 launch seeds) — server-configurable WITHOUT an app
// release and WITHOUT a schema change (the SYS-04 rule; the floor/grant/bonus live here, not in the
// DB). The card/adopt/pack PRICES are content (P10 store_products seed + the roster re-tag); THESE are
// the substrate anchors P1 needs. All owner-tunable (gate G-K posture, safe-default-until-approved).

/** ECON-02 — every new account starts with 10 PX (raised from 5 — the decision-0074 front-loaded-
 *  generosity ruling), materialized as a `starting_grant` ledger row on first wallet touch. */
export const STARTING_GRANT = 10;

/** ECON-02 — the STANDING Store daily bonus (+1 PX/day; idempotent per UTC-day; unclaimed days lapse).
 *  Kicks in from claim 8 onward — the first 7 claims are Newcomer-Ladder steps (below). */
export const DAILY_BONUS = 1;

// ── The Newcomer Ladder (ECON-02, decision 0074 — the generosity amendment, SYS-04 seed) ──────────────
// A user's FIRST 7 claims (lifetime count, need NOT be consecutive — the ladder waits, it never lapses)
// grant escalating PX + a free earned-only cosmetic per step (the owner-picked 7-item newcomer set,
// COSM-03 `source:'earned'`). The cosmetic slots are EMPTY until the roster pass fills them; an empty
// slot no-ops gracefully (only the PX lands). From claim 8 the standing +1/day (lapses) takes over.

/** The launch-seed PX per ladder step (steps 1..7, 0-indexed here). Total across the ladder = 25 PX. */
export const NEWCOMER_LADDER_STEPS = [2, 2, 3, 3, 4, 5, 6] as const;

/** The number of ladder steps (7) — a claim count ≥ this means the ladder is complete (standing daily). */
export const NEWCOMER_LADDER_LENGTH = NEWCOMER_LADDER_STEPS.length;

// The parallel cosmetic-id slot array (one per step) — EMPTY (all null) until the roster pass picks the
// newcomer set. Held mutable + behind a getter so it's SYS-04-tunable and test-fillable (mirroring the
// cosmetic registry's `registerCosmeticForTest` hook) WITHOUT a schema change. A null slot no-ops.
const ladderCosmetics: (string | null)[] = [null, null, null, null, null, null, null];

/** The cosmetic id granted at ladder step `index` (0-based), or null when the slot is unfilled. */
export function newcomerLadderCosmetic(index: number): string | null {
  return ladderCosmetics[index] ?? null;
}

/** Test-only: fill a ladder cosmetic slot (never a real roster id until the roster pass rules it). */
export function setLadderCosmeticForTest(index: number, id: string | null): void {
  ladderCosmetics[index] = id;
}

/** Test-only: clear all ladder cosmetic slots between test cases. */
export function resetLadderCosmeticsForTest(): void {
  ladderCosmetics.fill(null);
}

/** The reward the user's NEXT claim will land, given how many ladder claims they've ALREADY made
 *  (0..6 → steps 1..7). Returns null once the ladder is complete (count ≥ 7 → the standing daily). */
export interface LadderReward {
  step: number; // 1..7 — the step this claim lands
  pixels: number;
  cosmeticId: string | null; // null until the roster pass fills the slot
}
export function ladderRewardForCount(claimCount: number): LadderReward | null {
  if (claimCount >= NEWCOMER_LADDER_LENGTH) return null;
  return {
    step: claimCount + 1,
    pixels: NEWCOMER_LADDER_STEPS[claimCount]!,
    cosmeticId: newcomerLadderCosmetic(claimCount),
  };
}

/** A user SPEND may not drive the balance below zero (you cannot spend Pixels you do not hold). */
export const SPEND_FLOOR = 0;

/**
 * ECON-09 — an IAP refund reversal MAY drive the balance negative, floored here (−25 PX seed,
 * decision 0072); the wallet recovers from future earns. Consumed by P2's refund path, not P1's
 * user-spend paths. Kept beside the spend floor so the two floors are one legible surface.
 */
export const REFUND_FLOOR = -25;
