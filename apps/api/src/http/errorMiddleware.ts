import type { ErrorRequestHandler } from 'express';
import { ZodError } from 'zod';
import {
  GENERIC_SERVER_ERROR_MESSAGE,
  type ApiErrorBody,
  type ErrorCode,
} from '@ingame/shared';
import { AppError } from '../errors/AppError';
import { captureException } from '../observability/sentry';

function send(
  res: Parameters<ErrorRequestHandler>[2],
  status: number,
  code: ErrorCode,
  message: string,
  extra: { reason?: string; until?: string | null } = {},
): void {
  const body: ApiErrorBody = { error: { code, message } };
  if (typeof extra.reason === 'string') body.error.reason = extra.reason;
  if (extra.until !== undefined) body.error.until = extra.until;
  res.status(status).json(body);
}

/** Optional envelope extras carried by some AppErrors (VALIDATION_ERROR reason, ACCOUNT_SUSPENDED). */
function extrasOf(err: AppError): { reason?: string; until?: string | null } {
  const e = err as { reason?: string; until?: string | null };
  const out: { reason?: string; until?: string | null } = {};
  if (typeof e.reason === 'string') out.reason = e.reason;
  if (e.until !== undefined) out.until = e.until;
  return out;
}

// The single error seam → the api-contract envelope `{ error: { code, message } }`.
//  - zod failure                → 422 VALIDATION_ERROR (decision 0043/F08; NOT 400)
//  - AppError                   → its httpStatus + code (SERVER_ERROR forced to a GENERIC message)
//  - anything else              → 500 SERVER_ERROR, generic body, internals to Sentry by request-ID
export const errorMiddleware: ErrorRequestHandler = (err, req, res, _next) => {
  if (err instanceof ZodError) {
    send(res, 422, 'VALIDATION_ERROR', 'Validation failed.');
    return;
  }

  if (err instanceof AppError) {
    if (err.code === 'SERVER_ERROR') {
      // A deliberate 500 — report its internals to Sentry keyed by the request-ID (F18), never wire.
      captureException(err, { requestId: req.id });
      send(res, 500, 'SERVER_ERROR', GENERIC_SERVER_ERROR_MESSAGE);
      return;
    }
    send(res, err.httpStatus, err.code, err.message, extrasOf(err));
    return;
  }

  // Unknown/unexpected: never leak the exception text or stack. Internals go to Sentry keyed by the
  // request-ID (F18); the client gets only the fixed safe string.
  captureException(err, { requestId: req.id });
  send(res, 500, 'SERVER_ERROR', GENERIC_SERVER_ERROR_MESSAGE);
};
