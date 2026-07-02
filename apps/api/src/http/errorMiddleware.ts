import type { ErrorRequestHandler } from 'express';
import { ZodError } from 'zod';
import {
  GENERIC_SERVER_ERROR_MESSAGE,
  type ApiErrorBody,
  type DedupSuggestion,
  type ErrorCode,
  type ValidationDetail,
} from '@ingame/shared';
import { AppError } from '../errors/AppError';
import { sanitizedValidationDetails } from './validation-details';
import { captureException } from '../observability/sentry';

interface EnvelopeExtras {
  reason?: string;
  until?: string | null;
  details?: ValidationDetail[];
  suggestions?: DedupSuggestion[];
}

function send(
  res: Parameters<ErrorRequestHandler>[2],
  status: number,
  code: ErrorCode,
  message: string,
  extra: EnvelopeExtras = {},
): void {
  const body: ApiErrorBody = { error: { code, message } };
  if (typeof extra.reason === 'string') body.error.reason = extra.reason;
  if (extra.until !== undefined) body.error.until = extra.until;
  if (extra.details && extra.details.length > 0) body.error.details = extra.details;
  if (extra.suggestions) body.error.suggestions = extra.suggestions;
  res.status(status).json(body);
}

/** Optional envelope extras carried by some AppErrors (VALIDATION_ERROR reason/details, ACCOUNT_SUSPENDED, DUPLICATE_SUSPECTED). */
function extrasOf(err: AppError): EnvelopeExtras {
  const e = err as {
    reason?: string;
    until?: string | null;
    details?: ValidationDetail[];
    suggestions?: DedupSuggestion[];
  };
  const out: EnvelopeExtras = {};
  if (typeof e.reason === 'string') out.reason = e.reason;
  if (e.until !== undefined) out.until = e.until;
  if (Array.isArray(e.details)) out.details = e.details;
  if (Array.isArray(e.suggestions)) out.suggestions = e.suggestions;
  return out;
}

// The single error seam → the api-contract envelope `{ error: { code, message } }`.
//  - zod failure                → 422 VALIDATION_ERROR (decision 0043/F08; NOT 400)
//  - AppError                   → its httpStatus + code (SERVER_ERROR forced to a GENERIC message)
//  - anything else              → 500 SERVER_ERROR, generic body, internals to Sentry by request-ID
export const errorMiddleware: ErrorRequestHandler = (err, req, res, _next) => {
  if (err instanceof ZodError) {
    // B1 — field-targeted detail (api-contract 0.32/0.46), sanitized from issue METADATA (SYS-02).
    send(res, 422, 'VALIDATION_ERROR', 'Validation failed.', {
      details: sanitizedValidationDetails(err),
    });
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
