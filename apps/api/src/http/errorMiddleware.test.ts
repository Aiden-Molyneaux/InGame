import { describe, it, expect, vi } from 'vitest';
import { z } from 'zod';
import {
  GENERIC_SERVER_ERROR_MESSAGE,
  NEUTRAL_AUTH_FAILED_MESSAGE,
  type ApiErrorBody,
} from '@ingame/shared';
import { errorMiddleware } from './errorMiddleware';
import {
  AuthFailedError,
  ForbiddenError,
  NotFoundError,
  ServerError,
  ValidationError,
} from '../errors/AppError';

interface MockRes {
  statusCode: number;
  body: ApiErrorBody | undefined;
  status: (c: number) => MockRes;
  json: (b: unknown) => MockRes;
}

function mockRes(): MockRes {
  const res = {
    statusCode: 0,
    body: undefined as ApiErrorBody | undefined,
  } as MockRes;
  res.status = (c: number) => {
    res.statusCode = c;
    return res;
  };
  res.json = (b: unknown) => {
    res.body = b as ApiErrorBody;
    return res;
  };
  return res;
}

const req = { id: 'test-req' } as never;
const next = vi.fn();

describe('SYS-02/F08: AppError → 422 error middleware → fixed envelope', () => {
  it('maps a zod failure to 422 VALIDATION_ERROR (decision 0043 — NOT 400)', () => {
    const zerr = z.object({ bio: z.string() }).safeParse({ bio: 123 });
    expect(zerr.success).toBe(false);
    const res = mockRes();
    errorMiddleware(zerr.success ? null : zerr.error, req, res as never, next);
    expect(res.statusCode).toBe(422);
    expect(res.body?.error.code).toBe('VALIDATION_ERROR');
  });

  it('maps ValidationError → 422', () => {
    const res = mockRes();
    errorMiddleware(new ValidationError('bad'), req, res as never, next);
    expect(res.statusCode).toBe(422);
    expect(res.body?.error.code).toBe('VALIDATION_ERROR');
  });

  it('maps NotFoundError → 404 NOT_FOUND', () => {
    const res = mockRes();
    errorMiddleware(new NotFoundError(), req, res as never, next);
    expect(res.statusCode).toBe(404);
    expect(res.body?.error.code).toBe('NOT_FOUND');
  });

  it('maps ForbiddenError → 403 FORBIDDEN', () => {
    const res = mockRes();
    errorMiddleware(new ForbiddenError(), req, res as never, next);
    expect(res.statusCode).toBe(403);
    expect(res.body?.error.code).toBe('FORBIDDEN');
  });

  it('keeps auth failures NEUTRAL (no account-existence disclosure, AUTH-11)', () => {
    const res = mockRes();
    errorMiddleware(new AuthFailedError(), req, res as never, next);
    expect(res.statusCode).toBe(401);
    expect(res.body?.error.code).toBe('AUTH_FAILED');
    expect(res.body?.error.message).toBe(NEUTRAL_AUTH_FAILED_MESSAGE);
  });

  it('gives SERVER_ERROR a GENERIC body — never the thrown text', () => {
    const res = mockRes();
    errorMiddleware(new ServerError('secret db dsn leaked here'), req, res as never, next);
    expect(res.statusCode).toBe(500);
    expect(res.body?.error.code).toBe('SERVER_ERROR');
    expect(res.body?.error.message).toBe(GENERIC_SERVER_ERROR_MESSAGE);
    expect(res.body?.error.message).not.toContain('secret');
  });

  it('maps an unknown thrown value → 500 generic (never leaks internals)', () => {
    const res = mockRes();
    // suppress the intentional console.error
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    errorMiddleware(new Error('ECONNREFUSED 10.0.0.5:5432'), req, res as never, next);
    spy.mockRestore();
    expect(res.statusCode).toBe(500);
    expect(res.body?.error.code).toBe('SERVER_ERROR');
    expect(res.body?.error.message).toBe(GENERIC_SERVER_ERROR_MESSAGE);
  });

  it('emits EXACTLY the { error: { code, message } } envelope', () => {
    const res = mockRes();
    errorMiddleware(new NotFoundError(), req, res as never, next);
    expect(Object.keys(res.body ?? {})).toEqual(['error']);
    expect(Object.keys(res.body?.error ?? {}).sort()).toEqual(['code', 'message']);
  });
});
