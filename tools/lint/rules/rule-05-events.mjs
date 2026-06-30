import { isTestFile, matchBalanced, stripComments } from '../util/files.mjs';

// CONVENTIONS rule 5 [LINT] — every mutation emits a domain event. A `@mutation`-wrapped service
// method (the F43 seam: `mutation({...}, async (ctx) => …)`) must call `ctx.emit(...)` / emitOnCommit
// so the transactional outbox row is written in the mutation's own tx.
//
// SEVERITY = warn: the FAIL-the-PR teeth are DEFERRED to M7 (checklist-only until a consumer exists;
// pull to M3 if discipline slips — decision 0051/F01). The DETECTION ships now (and is self-tested by
// the F22 corpus); only the CI-blocking teeth are withheld, so the DoD "event emitted" line and this
// rule stay consistent.

const MUTATION_CALL_RE = /\bmutation\s*\(\s*\{/g;
const EMIT_RE = /\b(?:ctx\.emit|\.emit|emitOnCommit)\s*\(/;

export default {
  id: 'rule-05-events',
  title: 'events — every @mutation emits a domain event (seam; teeth deferred to M7)',
  conventions: 'CONVENTIONS rule 5',
  severity: 'warn',
  /** @param {{ files: import('../util/files.mjs').SourceFile[] }} ctx */
  check(ctx) {
    const violations = [];
    for (const file of ctx.files) {
      if (isTestFile(file.path)) continue;
      // Scan code with comments stripped so a comment mentioning ctx.emit() can't fake an emission.
      const code = stripComments(file.text);
      let m;
      const re = new RegExp(MUTATION_CALL_RE.source, 'g');
      while ((m = re.exec(code))) {
        const parenStart = code.indexOf('(', m.index);
        if (parenStart < 0) continue;
        const block = matchBalanced(code, parenStart, '(', ')');
        if (!EMIT_RE.test(block)) {
          const line = code.slice(0, m.index).split('\n').length;
          violations.push({
            file: file.path,
            line,
            message:
              '@mutation seam with no domain-event emission — call ctx.emit(...) so the outbox row ' +
              'is written in the mutation tx (CONVENTIONS rule 5; ACH-08).',
          });
        }
      }
    }
    return violations;
  },
};
