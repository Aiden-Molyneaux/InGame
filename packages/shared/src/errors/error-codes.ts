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
] as const;

export type ErrorCode = (typeof ERROR_CODES)[number];

/** The wire shape of every error response (api-contract Conventions). */
export interface ApiErrorBody {
  error: {
    code: ErrorCode;
    message: string;
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
