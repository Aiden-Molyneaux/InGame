import { isRepositoryLayer, isTestFile, stripComments } from '../util/files.mjs';

// CONVENTIONS rule 1 [LINT] — layered architecture. A raw DB query (Drizzle `db.*` / SQL exec) OUTSIDE
// the repository layer fails CI. Controllers/services/serializers must go through repositories; only
// `repositories/` and `db/` (the data-access infra) may issue raw queries.

const RAW_DB_PATTERNS = [
  /\bgetDb\s*\(/,
  /\bdrizzle\s*\(/,
  /\b(?:db|tx|exec|trx|database)\.(?:select|insert|update|delete|execute|transaction)\s*\(/,
];

export default {
  id: 'rule-01-layering',
  title: 'Layering — no raw DB access outside the repository layer',
  conventions: 'CONVENTIONS rule 1',
  severity: 'error',
  /** @param {{ files: import('../util/files.mjs').SourceFile[] }} ctx */
  check(ctx) {
    const violations = [];
    for (const file of ctx.files) {
      if (isRepositoryLayer(file.path) || isTestFile(file.path)) continue;
      const lines = stripComments(file.text).split('\n');
      lines.forEach((code, i) => {
        for (const pattern of RAW_DB_PATTERNS) {
          if (pattern.test(code)) {
            violations.push({
              file: file.path,
              line: i + 1,
              message:
                'raw DB access outside the repository layer — move this query into a repositories/ ' +
                'module (CONVENTIONS rule 1).',
            });
            break;
          }
        }
      });
    }
    return violations;
  },
};
