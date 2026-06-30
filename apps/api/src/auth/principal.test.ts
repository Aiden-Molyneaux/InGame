import { describe, it, expect, vi } from 'vitest';
import { resolvePrincipal } from './principal';
import { AuthFailedError } from '../errors/AppError';

function reqWith(authHeader?: string) {
  return {
    header: (name: string) =>
      name.toLowerCase() === 'authorization' ? authHeader : undefined,
  } as never as { principal?: { userId: string }; header: (n: string) => string | undefined };
}

// The STUBBED/SEEDED principal — NOT real SIWA. SYS-01: the actor is derived from the principal, the
// body never carries an actor id.
describe('SYS-01: stubbed principal resolution', () => {
  it('derives the actor id from a Bearer header', () => {
    const req = reqWith('Bearer 11111111-1111-4111-8111-111111111111');
    const next = vi.fn();
    resolvePrincipal(req as never, {} as never, next);
    expect(next).toHaveBeenCalledWith();
    expect(req.principal?.userId).toBe('11111111-1111-4111-8111-111111111111');
  });

  it('refuses an absent/blank principal with a neutral AUTH_FAILED', () => {
    const next = vi.fn();
    resolvePrincipal(reqWith(undefined) as never, {} as never, next);
    expect(next.mock.calls[0]?.[0]).toBeInstanceOf(AuthFailedError);
  });

  it('refuses a malformed authorization header', () => {
    const next = vi.fn();
    resolvePrincipal(reqWith('Basic abc') as never, {} as never, next);
    expect(next.mock.calls[0]?.[0]).toBeInstanceOf(AuthFailedError);
  });
});
