import { describe, it, expect } from 'vitest';
import { join } from 'node:path';
import { scanBundle } from './bundle-grep.mjs';

const cwd = process.cwd();

// F04 — the bundle-grep mechanism, self-tested against planted-leak + clean fixtures (the same
// self-guarding pattern as the bad-pr-corpus). CI runs the real grep against the exported web bundle.
describe('F04: client-bundle secret grep', () => {
  it('flags a server-only secret name AND a mis-prefixed EXPO_PUBLIC secret', () => {
    const violations = scanBundle(join(cwd, 'fixtures', 'bad-pr-corpus', 'bundle-leak'));
    expect(violations.length).toBeGreaterThanOrEqual(2);
  });

  it('passes a clean bundle (intentional-public keys are allow-listed by name)', () => {
    const violations = scanBundle(join(cwd, 'fixtures', 'bad-pr-corpus', 'bundle-clean'));
    expect(violations).toEqual([]);
  });
});
