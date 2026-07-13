// SYS-04 economy tuning values (decision 0072/0073 launch seeds) — server-configurable WITHOUT an app
// release and WITHOUT a schema change (the SYS-04 rule; the floor/grant/bonus live here, not in the
// DB). The card/adopt/pack PRICES are content (P10 store_products seed + the roster re-tag); THESE are
// the substrate anchors P1 needs. All owner-tunable (gate G-K posture, safe-default-until-approved).

/** ECON-02 — every new account starts with 5 PX, materialized as a `starting_grant` ledger row. */
export const STARTING_GRANT = 5;

/** ECON-02 — the Store daily bonus (+1 PX/day; idempotent per UTC-day; unclaimed days lapse). */
export const DAILY_BONUS = 1;

/** A user SPEND may not drive the balance below zero (you cannot spend Pixels you do not hold). */
export const SPEND_FLOOR = 0;

/**
 * ECON-09 — an IAP refund reversal MAY drive the balance negative, floored here (−25 PX seed,
 * decision 0072); the wallet recovers from future earns. Consumed by P2's refund path, not P1's
 * user-spend paths. Kept beside the spend floor so the two floors are one legible surface.
 */
export const REFUND_FLOOR = -25;
