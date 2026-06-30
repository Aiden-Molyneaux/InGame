import { join } from 'node:path';
import { collectFiles } from './util/files.mjs';
import { rules } from './rules.mjs';

// CI entry for the custom CONVENTIONS [LINT] spine (`npm run lint:custom`). Runs every rule over the
// real source and exits non-zero if any ERROR-severity rule has violations. WARN-severity rules
// (rule-5 events — teeth deferred to M7) print but do not fail the build. The same rules are asserted
// against the fixtures/bad-pr-corpus by the F22 meta-test, so the spine is self-guarding against rot.

const SOURCE_ROOTS = [
  'apps/api/src',
  'apps/api/test',
  'apps/mobile/src',
  'packages/shared/src',
];

function main() {
  const cwd = process.cwd();
  const files = collectFiles(
    SOURCE_ROOTS.map((r) => join(cwd, r)),
    { cwd },
  );
  const ctx = { files, root: cwd };

  let errorCount = 0;
  let warnCount = 0;

  for (const rule of rules) {
    const violations = rule.check(ctx) ?? [];
    if (violations.length === 0) {
      console.log(`  ✓ ${rule.id} — ${rule.title}`);
      continue;
    }
    const isError = rule.severity === 'error';
    const badge = isError ? '✗ ERROR' : '⚠ WARN ';
    console.log(`  ${badge} ${rule.id} (${rule.conventions}) — ${violations.length} violation(s):`);
    for (const v of violations) {
      console.log(`      ${v.file}:${v.line} — ${v.message}`);
    }
    if (isError) errorCount += violations.length;
    else warnCount += violations.length;
  }

  console.log(
    `\ncustom lint: ${errorCount} error(s), ${warnCount} warning(s) ` +
      `(rule-5 teeth deferred to M7 — checklist only).`,
  );
  process.exit(errorCount > 0 ? 1 : 0);
}

main();
