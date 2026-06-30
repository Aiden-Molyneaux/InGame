import type { ErrorCode } from '@ingame/shared';
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

export class AccountSuspendedError extends AppError {
  readonly code = 'ACCOUNT_SUSPENDED';
  readonly httpStatus = 403;
  constructor(message = 'Account suspended.') {
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
