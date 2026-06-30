import { describe, it, expect } from 'vitest';
import {
  assertDisposableDb,
  isDisposableDb,
  DestructiveGuardError,
} from './destructive-guard';

// F03 — the guard must FAIL CLOSED (allowlist, not denylist). G-C later verifies it FIRES against a
// prod-shaped URL; these unit tests prove the firing now.
describe('F03: fail-closed destructive-DB guard', () => {
  it('FIRES (throws) on a prod-shaped URL with no sentinel', () => {
    const env = { DATABASE_URL: 'postgres://user:pw@db.prod.example.com:5432/ingame' };
    expect(isDisposableDb(env)).toBe(false);
    expect(() => assertDisposableDb(env)).toThrow(DestructiveGuardError);
  });

  it('FIRES even when a real DATABASE_URL is injected (the CI-secret-injection path)', () => {
    // A CI secret pointing the Testcontainers job at prod must NOT be treated as disposable.
    const env = { DATABASE_URL: 'postgres://ci:secret@prod-primary/ingame_production' };
    expect(() => assertDisposableDb(env)).toThrow(DestructiveGuardError);
  });

  it('allows an explicit DISPOSABLE_DB=1 sentinel', () => {
    const env = { DATABASE_URL: 'postgres://x/whatever', DISPOSABLE_DB: '1' };
    expect(isDisposableDb(env)).toBe(true);
    expect(() => assertDisposableDb(env)).not.toThrow();
  });

  it('allows local_/staging_/test_ DB-name prefixes', () => {
    for (const name of ['local_ingame', 'staging_ingame', 'test_ingame', 'ingame_test']) {
      expect(isDisposableDb({ DATABASE_URL: `postgres://x/${name}` })).toBe(true);
    }
  });

  it('refuses a bare prod-style name', () => {
    expect(isDisposableDb({ DATABASE_URL: 'postgres://x/ingame' })).toBe(false);
    expect(isDisposableDb({ DATABASE_URL: 'postgres://x/production' })).toBe(false);
  });
});
