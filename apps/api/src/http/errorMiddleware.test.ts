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

// B1 (api-contract 0.32/0.46) — VALIDATION_ERROR carries SANITIZED field-targeted details:
// `details: [{ path, message }]` built from the zod issue METADATA (paths + our own messages),
// never from the submitted values (SYS-02 — no raw-input echo).
describe('B1/SYS-02: VALIDATION_ERROR field-targeted details, sanitized', () => {
  const schema = z
    .object({
      email: z.string().email(),
      password: z.string().min(8),
      privacy: z.enum(['friends', 'public']),
    })
    .strict();

  it('maps zod issues to per-field details without echoing the submitted values', () => {
    const parsed = schema.safeParse({
      email: 'EVIL-not-an-email',
      password: 'shrt',
      privacy: 'EVIL_ENUM_INPUT',
    });
    expect(parsed.success).toBe(false);
    const res = mockRes();
    errorMiddleware(parsed.success ? null : parsed.error, req, res as never, next);

    expect(res.statusCode).toBe(422);
    const details = res.body?.error.details ?? [];
    const byPath = Object.fromEntries(details.map((d) => [d.path, d.message]));
    expect(byPath['email']).toBeTruthy();
    expect(byPath['password']).toContain('at least 8');
    expect(byPath['privacy']).toBeTruthy();
    // SYS-02 — the submitted values never round-trip:
    const flat = JSON.stringify(details);
    expect(flat).not.toContain('EVIL');
    expect(flat).not.toContain('shrt');
  });

  it('reports a missing required field as Required.', () => {
    const parsed = schema.safeParse({ email: 'a@b.co', privacy: 'friends' });
    const res = mockRes();
    errorMiddleware(parsed.success ? null : parsed.error, req, res as never, next);
    const details = res.body?.error.details ?? [];
    expect(details).toContainEqual({ path: 'password', message: 'Required.' });
  });

  it('reports an unknown key (strict schema) without an unsafe path echo', () => {
    const parsed = schema.safeParse({
      email: 'a@b.co',
      password: 'longenough',
      privacy: 'friends',
      ['<script>alert(1)</script>']: true,
    });
    const res = mockRes();
    errorMiddleware(parsed.success ? null : parsed.error, req, res as never, next);
    const details = res.body?.error.details ?? [];
    expect(details.some((d) => d.message === 'Unknown field.')).toBe(true);
    expect(JSON.stringify(details)).not.toContain('<script>');
  });

  it('passes through the details a service-thrown ValidationError carries', () => {
    const res = mockRes();
    errorMiddleware(
      new ValidationError('That username is taken.', 'username_taken', [
        { path: 'username', message: 'That username is taken.' },
      ]),
      req,
      res as never,
      next,
    );
    expect(res.statusCode).toBe(422);
    expect(res.body?.error.reason).toBe('username_taken');
    expect(res.body?.error.details).toEqual([
      { path: 'username', message: 'That username is taken.' },
    ]);
  });

  it('keeps the envelope minimal when a ValidationError has no details', () => {
    const res = mockRes();
    errorMiddleware(new ValidationError('bad'), req, res as never, next);
    expect(Object.keys(res.body?.error ?? {}).sort()).toEqual(['code', 'message']);
  });
});
