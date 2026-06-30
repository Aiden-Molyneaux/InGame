export interface DestructiveGuardEnv {
  DATABASE_URL?: string;
  DISPOSABLE_DB?: string;
}

export class DestructiveGuardError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DestructiveGuardError';
  }
}

// F03 — destructive DB runners FAIL CLOSED on the absence of a DISPOSABLE_DB sentinel. This is an
// ALLOWLIST, not a denylist: an op is refused unless the target is positively marked disposable, so
// a CI secret injecting a real DATABASE_URL into the Testcontainers job cannot point truncate/reset
// at prod from inside CI. Prod creds structurally LACK the sentinel (no DISPOSABLE_DB flag, no
// local_/staging_/test_ DB-name prefix). (G-C later verifies the guard FIRES.)
export function isDisposableDb(env: DestructiveGuardEnv = process.env): boolean {
  const flag = (env.DISPOSABLE_DB ?? '').toLowerCase();
  if (flag === '1' || flag === 'true') return true;

  const url = env.DATABASE_URL ?? '';
  // last path segment, sans query string → the database name
  const dbName = (url.split('/').pop() ?? '').split('?')[0] ?? '';
  return /^(local|staging|test)_/.test(dbName) || /(^|_)test(_|$)/.test(dbName);
}

/** Throws unless the target DB is positively marked disposable. Call FIRST in every destructive runner. */
export function assertDisposableDb(env: DestructiveGuardEnv = process.env): void {
  if (!isDisposableDb(env)) {
    throw new DestructiveGuardError(
      'F03: refusing a destructive DB operation — no DISPOSABLE_DB sentinel (allowlist, not ' +
        'denylist). Set DISPOSABLE_DB=1 (or use a local_/staging_/test_ DB name) ONLY on a ' +
        'disposable database. Production creds structurally lack this marker.',
    );
  }
}
