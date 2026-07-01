import { isRepositoryLayer, isTestFile, toSnake, stripComments } from '../util/files.mjs';
import { loadGlobalTables } from '../util/manifest.mjs';

// CONVENTIONS rule 2 [LINT] — every read/modify of user-owned data goes through the SYS-01 scoped
// helper. The allowlist IS the F32 global-table manifest (decision 0051/F32): a table NOT on it is
// user-owned and FAILS CLOSED. A `// SYS-01-EXEMPT` annotation is valid ONLY against a listed global
// table (else CI fails). The lint targets the cross-user vectors — select/update/delete on an
// existing row by id — not inserts (you cannot IDOR a brand-new actor-stamped row). The lint proves
// the helper was CALLED; actor-id correctness is proven by the SYS-07 4xx tests.

const ACCESS_RE = /\.(from|update|delete)\(\s*([A-Za-z_$][\w$]*)/g;
const SCOPE_SIGNAL_RE = /\b(ownedBy|asActor|scoped|scopedQuery)\s*\(/;
const EXEMPT_RE = /\/\/\s*SYS-01-EXEMPT(?::\s*([A-Za-z_][\w]*))?/;
// SYS-01-AUTH-LOOKUP: the ONE legitimate non-actor-scoped user read — a PRE-AUTHENTICATION or
// bearer-credential lookup (by email / username / token-hash) that ESTABLISHES the actor or validates
// a bearer credential (login, register-uniqueness, refresh, reset/verify-confirm, apple-linking,
// username-available). It is CONFINED to the auth-layer repos (path `/auth/` or a `(auth|token)…-repo`
// file) so it can never grant a cross-user bypass to an ordinary repo — a misuse-fixture proves that.
// Greppable + auditable at the gate-3 auth+SYS-01 seam review (OQ-115).
const AUTH_LOOKUP_RE = /\/\/\s*SYS-01-AUTH-LOOKUP\b/;
const WINDOW = 12;

const isAuthLookupFile = (path) =>
  /(^|\/)auth\//.test(path) || /(auth|token)[\w-]*-repo\.[mc]?tsx?$/.test(path);

export default {
  id: 'rule-02-scoping',
  title: 'SYS-01 scoping — user-owned access must use the scoped helper (fail-closed allowlist)',
  conventions: 'CONVENTIONS rule 2',
  severity: 'error',
  /** @param {{ files: import('../util/files.mjs').SourceFile[], root?: string }} ctx */
  check(ctx) {
    const globals = new Set(loadGlobalTables(ctx.root ?? process.cwd()));
    const isGlobal = (ident) => globals.has(ident) || globals.has(toSnake(ident));
    const violations = [];

    for (const file of ctx.files) {
      if (!isRepositoryLayer(file.path) || isTestFile(file.path)) continue;
      const origLines = file.text.split('\n');
      // Scan CODE (comments stripped) for the access + scope-signal so a comment that merely mentions
      // asActor()/ownedBy() can't fake a scope. The `// SYS-01-EXEMPT` annotation IS a comment, so it
      // is read from the original text.
      const code = stripComments(file.text);
      const codeLines = code.split('\n');

      // (a) EXEMPT cross-check: an exemption naming a non-global table is illegitimate.
      origLines.forEach((line, i) => {
        const exempt = EXEMPT_RE.exec(line);
        if (exempt && exempt[1] && !isGlobal(exempt[1])) {
          violations.push({
            file: file.path,
            line: i + 1,
            message: `// SYS-01-EXEMPT names "${exempt[1]}" which is not on the F32 global-table manifest — an exemption is only valid against a listed global table.`,
          });
        }
      });

      // (b) each user-owned select/update/delete must have a scope signal nearby.
      for (const match of code.matchAll(ACCESS_RE)) {
        const table = match[2];
        if (isGlobal(table)) continue;
        const idx = match.index ?? 0;
        const lineNo = code.slice(0, idx).split('\n').length;
        const from = Math.max(0, lineNo - 1 - WINDOW);
        const to = Math.min(codeLines.length, lineNo + WINDOW);
        const hasScope = SCOPE_SIGNAL_RE.test(codeLines.slice(from, to).join('\n'));
        const hasExempt =
          /SYS-01-EXEMPT/.test(origLines.slice(from, to).join('\n')) && isGlobal(table);
        // A pre-auth / bearer-credential lookup, valid ONLY in an auth-layer repo (fails closed
        // everywhere else — the marker grants no bypass to an ordinary repo).
        const hasAuthLookup =
          isAuthLookupFile(file.path) && AUTH_LOOKUP_RE.test(origLines.slice(from, to).join('\n'));
        if (!hasScope && !hasExempt && !hasAuthLookup) {
          violations.push({
            file: file.path,
            line: lineNo,
            message: `user-owned table "${table}" read/modified without the SYS-01 scoped helper (fails closed — not on the F32 global manifest). Use asActor()/ownedBy().`,
          });
        }
      }
    }
    return violations;
  },
};
