import type { DedupSuggestion, ErrorCode, ValidationDetail } from '@ingame/shared';
import { NEUTRAL_AUTH_FAILED_MESSAGE } from '@ingame/shared';

// The one AppError hierarchy → Express error middleware → api-contract error codes (CONVENTIONS
// error model). Each subclass carries its stable `code` (the fixed envelope set) + its HTTP status.

export abstract class AppError extends Error {
  abstract readonly code: ErrorCode;
  abstract readonly httpStatus: number;

  constructor(message: string) {
    super(message);
    this.name = new.target.name;
  }
}

/** zod / hand-thrown validation failures map here → HTTP 422 (decision 0043, NOT 400). */
export class ValidationError extends AppError {
  readonly code = 'VALIDATION_ERROR';
  readonly httpStatus = 422;
  /** An optional machine-readable reason, e.g. `invalid_token` for AUTH-04 reset/verify (api-contract). */
  readonly reason?: string;
  /** B1 (api-contract 0.32/0.46) — optional sanitized field-targeted detail (SYS-02: never raw input). */
  readonly details?: ValidationDetail[];
  constructor(message: string, reason?: string, details?: ValidationDetail[]) {
    super(message);
    this.reason = reason;
    this.details = details;
  }
}

export class NotFoundError extends AppError {
  readonly code = 'NOT_FOUND';
  readonly httpStatus = 404;
  constructor(message = 'Not found.') {
    super(message);
  }
}

/**
 * Auth failures stay NEUTRAL — wrong password, unknown account, and unverified account all surface
 * the same AUTH_FAILED with the same message (no account-existence disclosure; AUTH-11, F08).
 */
export class AuthFailedError extends AppError {
  readonly code = 'AUTH_FAILED';
  readonly httpStatus = 401;
  constructor(message = NEUTRAL_AUTH_FAILED_MESSAGE) {
    super(message);
  }
}

export class ForbiddenError extends AppError {
  readonly code = 'FORBIDDEN';
  readonly httpStatus = 403;
  constructor(message = 'Forbidden.') {
    super(message);
  }
}

export class RateLimitedError extends AppError {
  readonly code = 'RATE_LIMITED';
  readonly httpStatus = 429;
  constructor(message = 'Too many requests.') {
    super(message);
  }
}

/** MOD-09 — a suspended account carries the reason + optional end date (api-contract login/refresh). */
export class AccountSuspendedError extends AppError {
  readonly code = 'ACCOUNT_SUSPENDED';
  readonly httpStatus = 403;
  readonly reason: string;
  readonly until: string | null;
  constructor(reason: string, until: string | null, message = 'This account is suspended.') {
    super(message);
    this.reason = reason;
    this.until = until;
  }
}

/**
 * CAT-03 — a suspected duplicate canonical entry (409, api-contract 0.47) carrying the best-first
 * candidate list the client's InlineBanner renders ("did you mean …?").
 */
export class DuplicateSuspectedError extends AppError {
  readonly code = 'DUPLICATE_SUSPECTED';
  readonly httpStatus = 409;
  readonly suggestions: DedupSuggestion[];
  constructor(
    suggestions: DedupSuggestion[],
    message = 'A very similar game is already in the catalog.',
  ) {
    super(message);
    this.suggestions = suggestions;
  }
}

/**
 * COL-06/CARD-14 (decision 0040/0066) — DELETE /cards/:id refused: the design is equipped. Switch
 * the entry to another card (or the default) first; belt-and-braces behind ON DELETE SET NULL.
 */
export class CardEquippedError extends AppError {
  readonly code = 'CARD_EQUIPPED';
  readonly httpStatus = 409;
  constructor(message = 'That design is equipped — switch cards first.') {
    super(message);
  }
}

/**
 * CARD-20 (decision 0040/0072) — DELETE /cards/:id refused: the published design HAS ADOPTERS (their
 * grants persist forever; delisting is `unpublish`, never delete). 409 — the CONFLICT family, aligned
 * with the sibling CARD_EQUIPPED above (the LOOK_CAP-correction precedent, api-contract 0.55: a
 * business-rule refusal on resource STATE is a 409 named code; 422 stays zod/shape-validation only).
 */
export class HasAdoptersError extends AppError {
  readonly code = 'HAS_ADOPTERS';
  readonly httpStatus = 409;
  constructor(message = 'This card has adopters — unpublish it instead.') {
    super(message);
  }
}

/** CARD-24 (SYS-04, owner-set cap 30) — POST /me/style-presets refused: the preset shelf is full. */
export class PresetLimitError extends AppError {
  readonly code = 'PRESET_LIMIT';
  readonly httpStatus = 409;
  constructor(message = 'Preset limit reached — delete one to save another.') {
    super(message);
  }
}

/**
 * DEV-05 (SYS-04, owner-set cap ~12) — POST /me/device/looks refused: the saved-looks shelf is full.
 * 409 — the CONFLICT family, aligned with the sibling cap PRESET_LIMIT above (api-contract :119):
 * the request is well-formed; the resource state (a full shelf) refuses it. (Fable P1 review — the
 * 422 in the original build directive was the reviewer's own mis-spec, corrected at review.)
 */
export class LookCapError extends AppError {
  readonly code = 'LOOK_CAP_REACHED';
  readonly httpStatus = 409;
  constructor(message = 'Saved-looks limit reached — delete one to save another.') {
    super(message);
  }
}

/**
 * ECON-01/03/07 (decision 0072/0073) — a spend refused because it would drive the balance below the
 * floor. 409 (the CONFLICT family, aligned with the sibling economy refusals); carries `{ shortBy }`
 * = the additional PX the caller needs, so the client can drive the in-context Top-Up bridge. Mirrors
 * DuplicateSuspectedError's extra-field pattern. Credits never raise this (only debits are floored).
 */
export class InsufficientBalanceError extends AppError {
  readonly code = 'INSUFFICIENT_BALANCE';
  readonly httpStatus = 409;
  readonly shortBy: number;
  constructor(shortBy: number, message = 'Not enough Pixels for this.') {
    super(message);
    this.shortBy = shortBy;
  }
}

/**
 * CARD-04 (OQ-101, decision 0073 §0.4) — POST /cards/:id/adopt refused: the caller already adopted
 * this card. 409 (the CONFLICT family, aligned with the sibling economy refusals); the client treats
 * it as an idempotent no-op (adopt is online-only; the unique (adopter, card) row is the backstop).
 */
export class AlreadyAdoptedError extends AppError {
  readonly code = 'ALREADY_ADOPTED';
  readonly httpStatus = 409;
  constructor(message = 'You already adopted this card.') {
    super(message);
  }
}

/**
 * CARD-04/20 (decision 0073 §0.4) — adopt/share refused against a card that is not published. 409 (the
 * CONFLICT family): the request is well-formed but the target's state (draft/private, or delisted)
 * forbids it. Same shape as an unknown published id (no draft/private existence oracle to a stranger).
 */
export class NotPublishedError extends AppError {
  readonly code = 'NOT_PUBLISHED';
  readonly httpStatus = 409;
  constructor(message = 'That card is not available to adopt.') {
    super(message);
  }
}

/**
 * CARD-19 (decision 0073 §0.7) — POST /cards/:id/publish refused: the composition is below the
 * min-complexity floor (≥ 3 elements OR ≥ 2 distinct element types). 409 (the CONFLICT family): the
 * request is well-formed but the card's state (too simple to publish) forbids it. Drafts/private are
 * exempt — the gate fires only at publish.
 */
export class MinComplexityError extends AppError {
  readonly code = 'MIN_COMPLEXITY';
  readonly httpStatus = 409;
  constructor(message = 'Add a little more before publishing this card.') {
    super(message);
  }
}

/**
 * CARD-19 (decision 0073 §0.7) — POST /cards/:id/publish refused: a global composition-hash match with
 * ANOTHER published card. 409 (the CONFLICT family). Carries NOTHING beyond the code — no card id,
 * name, or designer leaks (the anti-plagiarism gate must not become a lookup oracle for who published
 * what).
 */
export class DuplicateCompositionError extends AppError {
  readonly code = 'DUPLICATE_COMPOSITION';
  readonly httpStatus = 409;
  constructor(message = 'A matching card is already published.') {
    super(message);
  }
}

/**
 * CARD-13 (decision 0072/0073) — POST /cards/:id/publish OR /cards/:id/save-private refused: the
 * composition references premium-tier components the OWNER does not own. 409 (the CONFLICT family);
 * carries `{ unowned: [{ cosmeticId, price }], total }` so the client drives the ReconcileSheet
 * (ACQUIRE ALL). Dormant while the roster is all-free (fixture-tested). Mirrors
 * InsufficientBalanceError's extra-field pattern.
 */
export class PremiumUnreconciledError extends AppError {
  readonly code = 'PREMIUM_UNRECONCILED';
  readonly httpStatus = 409;
  readonly unowned: Array<{ cosmeticId: string; price: number }>;
  readonly total: number;
  constructor(
    unowned: Array<{ cosmeticId: string; price: number }>,
    message = 'This card uses premium components you don’t own yet.',
  ) {
    super(message);
    this.unowned = unowned;
    this.total = unowned.reduce((sum, u) => sum + u.price, 0);
  }
}

/**
 * ECON-10 (decision 0072/0073 §0.4) — POST /iap/validate refused: the once-per-account Starter Pack is
 * already owned (a DIFFERENT receipt for the one-time product). 409 (the CONFLICT family, aligned with
 * the sibling economy refusals): the receipt is valid but the account state (already consumed) forbids a
 * second grant. A REPLAY of the SAME receipt is an idempotent no-op success (ECON-06), NOT this refusal.
 */
export class StarterPackConsumedError extends AppError {
  readonly code = 'STARTER_PACK_CONSUMED';
  readonly httpStatus = 409;
  constructor(message = 'The Starter Pack can only be purchased once per account.') {
    super(message);
  }
}

/** SERVER_ERROR carries a GENERIC body downstream — the middleware never serializes this message. */
export class ServerError extends AppError {
  readonly code = 'SERVER_ERROR';
  readonly httpStatus = 500;
  constructor(message = 'Internal server error.') {
    super(message);
  }
}
