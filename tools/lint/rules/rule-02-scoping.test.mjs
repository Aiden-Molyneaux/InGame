import { describe, it, expect } from 'vitest';
import rule from './rule-02-scoping.mjs';

// Guards the security-sensitive rule-2 extension: the // SYS-01-AUTH-LOOKUP marker (pre-auth /
// bearer-credential lookup) is EXEMPT only inside an auth-layer repo, and FAILS CLOSED everywhere
// else — so it can never become a cross-user bypass for an ordinary repository (gate-3 / OQ-115).

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
