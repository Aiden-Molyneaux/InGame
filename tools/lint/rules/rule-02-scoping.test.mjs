import { describe, it, expect } from 'vitest';
import { join } from 'node:path';
import rule from './rule-02-scoping.mjs';
import { collectFiles } from '../util/files.mjs';

// Guards the security-sensitive rule-2 extension: the // SYS-01-AUTH-LOOKUP marker (pre-auth /
// bearer-credential lookup) is EXEMPT only inside an auth-layer repo, and FAILS CLOSED everywhere
// else — so it can never become a cross-user bypass for an ordinary repository (gate-3 / OQ-115).
// It is ALSO reads-only: it exempts a `.from` select, never a `.update`/`.delete` (M2 lead-audit).

function run(files) {
  return rule.check({ files, root: process.cwd() });
}
function file(path, text) {
  return { path, abs: path, text };
}

const lookupBody = (marker) => `
import { eq } from 'drizzle-orm';
export async function find(email, exec) {
  ${marker}
  const rows = await exec.select().from(users).where(eq(users.email, email)).limit(1);
  return rows[0] ?? null;
}
`;

describe('rule-02 SYS-01-AUTH-LOOKUP marker (auth-layer-confined)', () => {
  it('EXEMPTS a marked pre-auth lookup inside an auth-layer repo', () => {
    const v = run([
      file('apps/api/src/repositories/auth-repo.ts', lookupBody('// SYS-01-AUTH-LOOKUP: by email')),
    ]);
    expect(v).toHaveLength(0);
  });

  it('does NOT exempt the same marked read in a NON-auth repo (fails closed)', () => {
    const v = run([
      file('apps/api/src/repositories/wallet-repo.ts', lookupBody('// SYS-01-AUTH-LOOKUP: by email')),
    ]);
    expect(v.length).toBeGreaterThan(0);
  });

  it('still flags an UNMARKED user read inside an auth-layer repo', () => {
    const v = run([file('apps/api/src/repositories/auth-repo.ts', lookupBody(''))]);
    expect(v.length).toBeGreaterThan(0);
  });
});

describe('rule-02 SYS-01-AUTH-LOOKUP marker is READS-ONLY (a marked write fails closed)', () => {
  const authRepo = (text) => file('apps/api/src/repositories/auth-repo.ts', text);

  it('FAILS CLOSED on a marked .update inside an auth-layer repo (marker exempts reads only)', () => {
    const v = run([
      authRepo(`
import { eq } from 'drizzle-orm';
export async function rename(id, email, exec) {
  // SYS-01-AUTH-LOOKUP: (abused) claims a pre-auth lookup, but this is an unscoped write
  return exec.update(users).set({ email }).where(eq(users.id, id));
}
`),
    ]);
    expect(v.length).toBeGreaterThan(0);
  });

  it('FAILS CLOSED on a marked .delete inside an auth-layer repo', () => {
    const v = run([
      authRepo(`
import { eq } from 'drizzle-orm';
export async function remove(id, exec) {
  // SYS-01-AUTH-LOOKUP: (abused) claims a pre-auth lookup, but this is an unscoped delete
  return exec.delete(users).where(eq(users.id, id));
}
`),
    ]);
    expect(v.length).toBeGreaterThan(0);
  });

  it('rejects the on-disk bad-pr-corpus marked-write fixture (auth-write-repo.ts)', () => {
    const dir = join(process.cwd(), 'fixtures', 'bad-pr-corpus', 'rule-02-scoping');
    const offending = collectFiles([dir], { exts: ['.ts'], cwd: process.cwd() }).filter((f) =>
      f.path.endsWith('auth-write-repo.ts'),
    );
    expect(offending).toHaveLength(1);
    expect(run(offending).length).toBeGreaterThan(0);
  });
});
