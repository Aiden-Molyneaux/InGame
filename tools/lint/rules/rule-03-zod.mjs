import { isTestFile, stripComments } from '../util/files.mjs';

// CONVENTIONS rule 3 [LINT] — every input is zod-validated from packages/shared. An un-validated
// request body fails CI; the validation schema must come from @ingame/shared (the executable
// api-contract), never hand-rolled. The server-side parse is the security boundary (F23/F44). The
// field-for-field FIDELITY check is a separate snapshot (tools/spec/contract-fidelity.test.mjs).

const RAW_BODY_RE = /\breq\.body\b/;
const VALIDATE_RE = /\b(?:validateBody\s*\(|\.parse\s*\(|\.safeParse\s*\()/;
// The sanctioned validation chokepoint (the generic middleware) legitimately reads req.body.
const VALIDATION_MIDDLEWARE_RE = /(^|\/)http\/validate\.[mc]?ts$/;
const VALIDATE_CALL_RE = /\bvalidateBody\s*\(\s*([A-Za-z_$][\w$]*)/g;
const IMPORTED_FROM_SHARED = (code, ident) =>
  new RegExp(`import\\s*\\{[^}]*\\b${ident}\\b[^}]*\\}\\s*from\\s*['"]@ingame/shared['"]`).test(code);

export default {
  id: 'rule-03-zod',
  title: 'zod validation — raw req.body must be validated via a @ingame/shared schema',
  conventions: 'CONVENTIONS rule 3',
  severity: 'error',
  /** @param {{ files: import('../util/files.mjs').SourceFile[] }} ctx */
  check(ctx) {
    const violations = [];
    for (const file of ctx.files) {
      if (isTestFile(file.path)) continue;
      const code = stripComments(file.text);

      // (a) raw req.body must be validated (unless this is the generic validation middleware).
      if (RAW_BODY_RE.test(code) && !VALIDATION_MIDDLEWARE_RE.test(file.path)) {
        if (!VALIDATE_RE.test(code)) {
          const line = code.split('\n').findIndex((l) => RAW_BODY_RE.test(l)) + 1;
          violations.push({
            file: file.path,
            line: line || 1,
            message:
              'raw req.body used without zod validation — validate the body through a shared ' +
              'request schema (CONVENTIONS rule 3; the server parse is the security boundary).',
          });
        }
      }

      // (b) in route files, every validateBody(...) must receive a schema imported from @ingame/shared.
      if (/\bdefineRoute\s*\(/.test(code)) {
        for (const m of code.matchAll(VALIDATE_CALL_RE)) {
          const ident = m[1];
          if (!IMPORTED_FROM_SHARED(code, ident)) {
            violations.push({
              file: file.path,
              line: code.slice(0, m.index ?? 0).split('\n').length,
              message: `validateBody(${ident}) uses a schema not imported from @ingame/shared — the shared schema IS the api-contract (CONVENTIONS rule 3).`,
            });
          }
        }
      }
    }
    return violations;
  },
};
