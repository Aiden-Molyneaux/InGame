import { describe, it, expect } from 'vitest';
import { join } from 'node:path';
import { collectFiles } from './util/files.mjs';
import { rules } from './rules.mjs';

// F22 — the self-guarding lint spine. Asserts each [LINT] mechanism REJECTS its deliberately-bad
// fixture (so a silently-defanged lint is caught), AND that the real scaffold source is clean (so the
// scaffold itself obeys every rule). This is G-B(c)'s standing evidence + the new-agent worked example.

const cwd = process.cwd();
const CORPUS = join(cwd, 'fixtures', 'bad-pr-corpus');
const SOURCE_ROOTS = ['apps/api/src', 'apps/api/test', 'packages/shared/src'];
const FIXTURE_EXTS = ['.ts', '.tsx', '.mjs', '.js', 'package.json'];

describe('F22: every [LINT] rejects its bad-pr-corpus fixture', () => {
  for (const rule of rules) {
    it(`${rule.id} flags fixtures/bad-pr-corpus/${rule.id}`, () => {
      const dir = join(CORPUS, rule.id);
      const files = collectFiles([dir], { exts: FIXTURE_EXTS, cwd });
      expect(files.length, `no fixture present for ${rule.id}`).toBeGreaterThan(0);
      const violations = rule.check({ files, root: dir }) ?? [];
      expect(violations.length, `${rule.id} failed to reject its fixture`).toBeGreaterThan(0);
    });
  }
});

describe('F22: the lint spine is clean on the real scaffold source', () => {
  const files = collectFiles(
    SOURCE_ROOTS.map((r) => join(cwd, r)),
    { cwd },
  );
  const ctx = { files, root: cwd };
  for (const rule of rules) {
    it(`${rule.id} reports no violations on real source`, () => {
      expect(rule.check(ctx) ?? []).toEqual([]);
    });
  }
});
