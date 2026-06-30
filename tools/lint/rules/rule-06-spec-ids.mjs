import { isTestFile } from '../util/files.mjs';
import { buildIdRegistry, SPEC_ID_PREFIXES } from '../../spec/build-id-registry.mjs';

// CONVENTIONS rule 6 [LINT] — every risk-domain test is spec-ID-tagged, and the tag is REAL.
//  (a) an untagged test in an enumerated risk-domain dir fails CI;
//  (b) a well-formed-but-UNREGISTERED id (a typo'd/invented id) fails CI — validated against the
//      registry generated from the specs (decision 0051/F35). Grep a stable id → spec + test + code.

const RISK_DOMAIN_RE = /(^|\/)(integration|authz|economy|auth)(\/|$)/;
const TAGGED_ID_RE = new RegExp(`\\b(?:${SPEC_ID_PREFIXES.join('|')})-\\d{1,3}\\b`, 'g');

export default {
  id: 'rule-06-spec-ids',
  title: 'spec-ID tags — risk-domain tests carry a registered stable spec ID',
  conventions: 'CONVENTIONS rule 6',
  severity: 'error',
  /** @param {{ files: import('../util/files.mjs').SourceFile[], root?: string }} ctx */
  check(ctx) {
    const registry = new Set(buildIdRegistry(ctx.root ?? process.cwd()));
    const violations = [];

    for (const file of ctx.files) {
      if (!isTestFile(file.path) || !RISK_DOMAIN_RE.test(file.path)) continue;

      const tags = [...file.text.matchAll(TAGGED_ID_RE)].map((m) => m[0]);
      if (tags.length === 0) {
        violations.push({
          file: file.path,
          line: 1,
          message:
            'risk-domain test carries no stable spec-ID tag — tag the describe with its ID ' +
            "(e.g. describe('SYS-07: …')) so grep links spec ↔ test ↔ code (CONVENTIONS rule 6).",
        });
        continue;
      }
      for (const tag of tags) {
        if (!registry.has(tag)) {
          violations.push({
            file: file.path,
            line: 1,
            message: `spec-ID "${tag}" is not in the generated id-registry (unknown/typo'd id — grep-traceability would silently lie).`,
          });
        }
      }
    }
    return violations;
  },
};
