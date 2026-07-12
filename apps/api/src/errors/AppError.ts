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

/** SERVER_ERROR carries a GENERIC body downstream — the middleware never serializes this message. */
export class ServerError extends AppError {
  readonly code = 'SERVER_ERROR';
  readonly httpStatus = 500;
  constructor(message = 'Internal server error.') {
    super(message);
  }
}
