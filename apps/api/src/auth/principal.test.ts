import { describe, it, expect, vi, beforeAll } from 'vitest';
import { resolvePrincipal } from './principal';
import { signAccessToken } from './tokens';
import { AuthFailedError } from '../errors/AppError';

// SYS-01: the actor is derived from a VERIFIED access-token JWT (M2, real auth) — never from the body.
// An invalid / expired / malformed token yields a neutral AUTH_FAILED.

function reqWith(authHeader?: string) {
  return {
    header: (name: string) => (name.toLowerCase() === 'authorization' ? authHeader : undefined),
  } as never as { principal?: { userId: string }; header: (n: string) => string | undefined };
}

/** Drive the (async) middleware and resolve once `next` is called. */
function runPrincipal(req: unknown): Promise<unknown[]> {
  return new Promise((resolve) => {
    const next = vi.fn((...args: unknown[]) => resolve(args));
    resolvePrincipal(req as never, {} as never, next as never);
  });
}

describe('SYS-01: JWT principal resolution', () => {
  beforeAll(() => {
    process.env.JWT_SIGNING_SECRET = 'test-signing-secret-at-least-16-chars-long';
  });

  it('derives the actor id from a valid access-token JWT', async () => {
    const userId = '11111111-1111-4111-8111-111111111111';
    const token = await signAccessToken(userId);
    const req = reqWith(`Bearer ${token}`);
    const args = await runPrincipal(req);
    expect(args).toEqual([]); // next() with no error
    expect(req.principal?.userId).toBe(userId);
  });

  it('refuses an absent/blank principal with a neutral AUTH_FAILED', async () => {
    const args = await runPrincipal(reqWith(undefined));
    expect(args[0]).toBeInstanceOf(AuthFailedError);
  });

  it('refuses a malformed authorization header', async () => {
    const args = await runPrincipal(reqWith('Basic abc'));
    expect(args[0]).toBeInstanceOf(AuthFailedError);
  });

  it('refuses a bogus / unverifiable bearer token with a neutral AUTH_FAILED', async () => {
    const args = await runPrincipal(reqWith('Bearer not.a.jwt'));
    expect(args[0]).toBeInstanceOf(AuthFailedError);
  });
});
