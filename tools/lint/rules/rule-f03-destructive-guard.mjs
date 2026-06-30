import { isTestFile, stripComments } from '../util/files.mjs';

// F03 self-guard [LINT] — a destructive DB runner must call the fail-closed guard. Any non-test
// source that performs a destructive operation (TRUNCATE / DROP / drizzle push/reset) must call
// `assertDisposableDb(...)` so it cannot run against a non-disposable DB (decision 0051/F03). This is
// the lint companion to the runtime guard + its unit test.

const DESTRUCTIVE_RE = /\b(TRUNCATE|DROP\s+(TABLE|SCHEMA|DATABASE)|drizzle-kit\s+push|drizzle-kit\s+drop)\b/i;
const GUARD_RE = /\bassertDisposableDb\s*\(/;

export default {
  id: 'rule-f03-destructive-guard',
  title: 'F03 — destructive DB runners must call assertDisposableDb (fail-closed)',
  conventions: 'decision 0051/F03',
  severity: 'error',
  /** @param {{ files: import('../util/files.mjs').SourceFile[] }} ctx */
  check(ctx) {
    const violations = [];
    for (const file of ctx.files) {
      if (isTestFile(file.path)) continue;
      // The guard's own definition + the schema (which may contain "DROP" in comments) are exempt.
      if (/destructive-guard\.[mc]?ts$/.test(file.path)) continue;
      // Scan code with comments stripped so a comment mentioning assertDisposableDb() can't fake the guard.
      const code = stripComments(file.text);
      if (DESTRUCTIVE_RE.test(code) && !GUARD_RE.test(code)) {
        const line = code.split('\n').findIndex((l) => DESTRUCTIVE_RE.test(l)) + 1;
        violations.push({
          file: file.path,
          line: line || 1,
          message:
            'destructive DB operation with no assertDisposableDb() guard — it could run against a ' +
            'non-disposable DB. Call the F03 fail-closed guard FIRST.',
        });
      }
    }
    return violations;
  },
};
