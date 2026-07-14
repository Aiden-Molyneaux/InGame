// The fixed error-code set + envelope shape (api-contract.md "Conventions"; CONVENTIONS error model).
//
// The envelope is EXACTLY `{ error: { code, message } }`. Codes are a closed, append-only set — after
// the first shipped build (M2) this enum is additive-only (decision 0051/F08; F09's snapshot test will
// enforce additive-only diffs).

export const ERROR_CODES = [
  'AUTH_FAILED',
  'NOT_FOUND',
  'VALIDATION_ERROR',
  'FORBIDDEN',
  'RATE_LIMITED',
  'SERVER_ERROR',
  'ACCOUNT_SUSPENDED',
  // The CAT-03 dedup warn (409) — appended 0.47 via the F-17 additive path (its first live use).
  'DUPLICATE_SUSPECTED',
  // M4 card substrate (decision 0066 / api-contract 0.51+0.53) — the F-17 additive path.
  'CARD_EQUIPPED', // 409 — DELETE /cards/:id refused: the design is equipped (switch first, COL-06/0040)
  'PRESET_LIMIT', // 409 — POST /me/style-presets refused: the cap-30 is full (CARD-24, SYS-04)
  // M4 §3.5 Device editor (decision 0030 / api-contract §Device) — the F-17 additive path.
  'LOOK_CAP_REACHED', // 422 — POST /me/device/looks refused: the ~12 saved-looks cap is full (DEV-05, SYS-04)
  // M5 economy (decision 0072/0073 / api-contract 0.57) — the F-17 additive path (codes land as their
  // endpoint builds). INSUFFICIENT_BALANCE builds with P1's ledger substrate (the spend floor); the
  // rest of the M5 refusal family (ALREADY_ADOPTED · NOT_PUBLISHED · MIN_COMPLEXITY ·
  // DUPLICATE_COMPOSITION · STARTER_PACK_CONSUMED) append as P2/P3 build them.
  'INSUFFICIENT_BALANCE', // 409 — a spend refused below the floor; carries { shortBy } (ECON-01/03/07)
  // M5 §1 publish-thread spike (decision 0073 §0.4) — the adopt-path refusals land as the adopt
  // endpoint builds (F-17 additive path). The rest of the family (MIN_COMPLEXITY ·
  // DUPLICATE_COMPOSITION · STARTER_PACK_CONSUMED) append as P2/P3 build their gates.
  'ALREADY_ADOPTED', // 409 — POST /cards/:id/adopt refused: the caller already adopted this card (OQ-101)
  'NOT_PUBLISHED', // 409 — adopt/share against a card that is not published (CARD-04/20)
  // M5 P3 publish gates (decision 0073 §0.4/0.7 / api-contract 0.58) — CARD-19 + CARD-13, the F-17
  // additive path (each code lands as its gate builds on the publish/save-private endpoints).
  'MIN_COMPLEXITY', // 409 — POST /cards/:id/publish refused: below the CARD-19 min-complexity floor
  'DUPLICATE_COMPOSITION', // 409 — publish refused: a global composition-hash match (CARD-19; carries nothing — no card leak)
  'PREMIUM_UNRECONCILED', // 409 — publish/save-private refused: unowned premium components; carries { unowned, total } (CARD-13)
  'HAS_ADOPTERS', // 409 — DELETE /cards/:id refused: the published design has adopters (unpublish instead, CARD-20)
  // M5 P2 IAP seam (decision 0072/0073 §0.4 / api-contract 0.57) — the F-17 additive path (the code
  // lands as its endpoint builds). A second one-time Starter Pack purchase is refused per account (ECON-10).
  'STARTER_PACK_CONSUMED', // 409 — POST /iap/validate refused: the once-per-account Starter Pack is already owned
  // M5 F-3 (§4 economy-audit LOW — the publish TOCTOU guard) — the F-17 additive path.
  'COMPOSITION_CHANGED', // 409 — publish refused: the composition changed mid-publish (a concurrent autosave drifted it from the flattened snapshot); RETRYABLE — publish again
] as const;

export type ErrorCode = (typeof ERROR_CODES)[number];

/**
 * B1 (api-contract 0.46) — one field-targeted `VALIDATION_ERROR` detail. SANITIZED by construction:
 * `path` is the schema field path and `message` is authored server-side from the zod issue METADATA —
 * the submitted values never round-trip (SYS-02).
 */
export interface ValidationDetail {
  path: string;
  message: string;
}

/**
 * One CAT-03 dedup candidate on a `DUPLICATE_SUSPECTED` 409 (api-contract 0.47) — the client's
 * InlineBanner "did you mean …?" rows. `exact` = an exact-normalized match (never overridable).
 */
export interface DedupSuggestion {
  id: string;
  name: string;
  studio: string | null;
  releaseDate: string | null;
  similarity: number;
  exact: boolean;
}

/** The wire shape of every error response (api-contract Conventions). */
export interface ApiErrorBody {
  error: {
    code: ErrorCode;
    message: string;
    /**
     * Optional machine-readable reason. Present on `VALIDATION_ERROR` `invalid_token` for AUTH-04
     * reset/verify, and on `ACCOUNT_SUSPENDED` (MOD-09). Absent otherwise.
     */
    reason?: string;
    /** `ACCOUNT_SUSPENDED` only (MOD-09) — the suspension end (ISO-8601 UTC) or null (indefinite). */
    until?: string | null;
    /** `VALIDATION_ERROR` only (B1, api-contract 0.32/0.46) — sanitized per-field detail. */
    details?: ValidationDetail[];
    /** `DUPLICATE_SUSPECTED` only (CAT-03, api-contract 0.47) — best-first dedup candidates. */
    suggestions?: DedupSuggestion[];
    /** `INSUFFICIENT_BALANCE` only (ECON-01/03, api-contract 0.57) — PX still needed for the spend. */
    shortBy?: number;
    /**
     * `PREMIUM_UNRECONCILED` only (CARD-13, api-contract 0.58) — the unowned premium components the
     * owner must acquire before publish/save-private, best-first, plus their summed PX `total`. Drives
     * the client's ReconcileSheet (the ACQUIRE ALL bridge). Dormant while the roster is all-free.
     */
    unowned?: Array<{ cosmeticId: string; price: number }>;
    total?: number;
  };
}

/**
 * SERVER_ERROR (500) carries a generic body — a fixed safe string, never the exception text/stack.
 * Internals go to Sentry keyed by the request-ID (decision 0051/F08, SYS-10).
 */
export const GENERIC_SERVER_ERROR_MESSAGE = 'Something went wrong. Please try again later.';

/**
 * Auth failures stay neutral — a wrong password, an unknown account, and an unverified account all
 * return the SAME AUTH_FAILED, so there is no account-existence disclosure (AUTH-11, decision 0051/F08).
 */
export const NEUTRAL_AUTH_FAILED_MESSAGE = 'Authentication failed.';

export function isErrorCode(value: string): value is ErrorCode {
  return (ERROR_CODES as readonly string[]).includes(value);
}
