import type { ErrorRequestHandler } from 'express';
import { ZodError } from 'zod';
import {
  GENERIC_SERVER_ERROR_MESSAGE,
  type ApiErrorBody,
  type ErrorCode,
} from '@ingame/shared';
import { AppError } from '../errors/AppError';

function send(res: Parameters<ErrorRequestHandler>[2], status: number, code: ErrorCode, message: string): void {
  const body: ApiErrorBody = { error: { code, message } };
  res.status(status).json(body);
}

// The single error seam → the api-contract envelope `{ error: { code, message } }`.
//  - zod failure                → 422 VALIDATION_ERROR (decision 0043/F08; NOT 400)
//  - AppError                   → its httpStatus + code (SERVER_ERROR forced to a GENERIC message)
//  - anything else              → 500 SERVER_ERROR, generic body, internals to the logs (Sentry M2)
export const errorMiddleware: ErrorRequestHandler = (err, req, res, _next) => {
  if (err instanceof ZodError) {
    send(res, 422, 'VALIDATION_ERROR', 'Validation failed.');
    return;
  }

  if (err instanceof AppError) {
    const message = err.code === 'SERVER_ERROR' ? GENERIC_SERVER_ERROR_MESSAGE : err.message;
    send(res, err.httpStatus, err.code, message);
    return;
  }

  // Unknown/unexpected: never leak the exception text or stack. Internals are logged keyed by the
  // request-ID (the Sentry sink lands in M2); the client gets only the fixed safe string.
  console.error(`[req:${req.id ?? 'unknown'}] unhandled error:`, err);
  send(res, 500, 'SERVER_ERROR', GENERIC_SERVER_ERROR_MESSAGE);
};
