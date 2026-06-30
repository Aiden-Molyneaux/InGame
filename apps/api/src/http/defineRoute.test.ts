import { describe, it, expect, beforeEach } from 'vitest';
import {
  defineRoute,
  getRouteRegistry,
  clearRouteRegistry,
} from './defineRoute';

const noop = (() => {}) as never;

// F30 — defineRoute makes the route inventory DATA + forces an authzTest on mutating/cross-principal
// routes (the under-specified substrate the rule-4 lint was failing on).
describe('F30: defineRoute substrate', () => {
  beforeEach(() => clearRouteRegistry());

  it('refuses a mutating route with no authzTest (SYS-07 obligation)', () => {
    expect(() =>
      defineRoute({ method: 'post', path: '/things', mutates: true, specIds: ['X-1'], handler: noop }),
    ).toThrow(/authzTest/);
  });

  it('refuses a cross-principal read with no authzTest (F06 obligation)', () => {
    expect(() =>
      defineRoute({
        method: 'get',
        path: '/users/:id',
        mutates: false,
        crossPrincipal: true,
        specIds: ['PROF-03'],
        handler: noop,
      }),
    ).toThrow(/authzTest/);
  });

  it('registers a valid route as queryable inventory data', () => {
    defineRoute({
      method: 'patch',
      path: '/me',
      mutates: true,
      authzTest: 'authz:patch_me',
      specIds: ['SYS-07'],
      handler: noop,
    });
    const reg = getRouteRegistry();
    expect(reg).toHaveLength(1);
    expect(reg[0]?.authzTest).toBe('authz:patch_me');
  });

  it('allows a pure self read with no authzTest', () => {
    expect(() =>
      defineRoute({ method: 'get', path: '/me', mutates: false, specIds: ['PROF-01'], handler: noop }),
    ).not.toThrow();
  });
});
