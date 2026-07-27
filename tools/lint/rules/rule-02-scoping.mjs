import { isRepositoryLayer, isTestFile, toSnake, stripComments } from '../util/files.mjs';
import { loadGlobalTables } from '../util/manifest.mjs';

// CONVENTIONS rule 2 [LINT] — every read/modify of user-owned data goes through the SYS-01 scoped
// helper. The allowlist IS the F32 global-table manifest (decision 0051/F32): a table NOT on it is
// user-owned and FAILS CLOSED. A `// SYS-01-EXEMPT` annotation is valid ONLY against a listed global
// table (else CI fails). The lint proves the helper was CALLED; actor-id correctness is proven by
// the SYS-07 4xx tests.
//
// OQ-118 (M2 lead-audit): detection is an ALLOWLIST of recognized query verbs — not the old 3-verb
// denylist — so the named bypasses fail closed:
//   read-class  : .from(t) · .leftJoin/.rightJoin/.innerJoin/.fullJoin(t) · db.query.<t>.findFirst/findMany
//   write-class : .update(t) · .delete(t) · an .insert(t)/.into(t) chained into .onConflictDoUpdate
//                 (an upsert mutates an EXISTING row — the old hole)
//   bare insert : exempt (you cannot IDOR a brand-new actor-stamped row)
//   raw SQL     : `.execute(...)` / a sql`` template inside `repositories/` + `*-repo` files is
//                 unclassifiable by a regex lint → FAILS CLOSED unconditionally (use the query
//                 builder). db/ infra (the F03-guarded reset.ts, migrate.ts) is rule-f03's surface,
//                 not a repository, and keeps only the verb checks.

const TABLE_VERB_RE =
  /\.(from|update|delete|insert|into|leftJoin|rightJoin|innerJoin|fullJoin)\(\s*([A-Za-z_$][\w$]*)/g;
const RQB_RE = /\bquery\.([A-Za-z_$][\w$]*)\.(?:findFirst|findMany)\s*\(/g;
const RAW_RE = /\.execute\s*\(|\bsql\s*`/g;
const SCOPE_SIGNAL_RE = /\b(ownedBy|asActor|scoped|scopedQuery)\s*\(/;
const EXEMPT_RE = /\/\/\s*SYS-01-EXEMPT(?::\s*([A-Za-z_][\w]*))?/;
// SYS-01-AUTH-LOOKUP: the ONE legitimate non-actor-scoped user read — a PRE-AUTHENTICATION or
// bearer-credential lookup (by email / username / token-hash) that ESTABLISHES the actor or validates
// a bearer credential (login, register-uniqueness, refresh, reset/verify-confirm, apple-linking,
// username-available). The marker exempts a `.from` SELECT ONLY — its contract is "pre-auth
// LOOKUPS only", so a marked write (update/delete/upsert), join, or relational read still FAILS
// CLOSED. It is CONFINED to the auth-layer repos (path `/auth/` or a `(auth|token)…-repo` file) so it
// can never grant a cross-user bypass to an ordinary repo — misuse-fixtures prove both guards.
// Greppable + auditable at the gate-3 auth+SYS-01 seam review (OQ-115).
const AUTH_LOOKUP_RE = /\/\/\s*SYS-01-AUTH-LOOKUP\b/;
// SYS-01-COMMUNITY-AGGREGATE (OQ-126, the CAT-09 read class — interim pre-OQ-122): exempts a READ
// of a user-owned table ONLY when the window also contains an aggregate call (`count(`) — anonymous
// cross-user aggregates (collections-count per game), never row-level reads and NEVER writes. A
// misuse fixture proves both guards. Guard-surface marker → auditable at the gate-3 seam review.
const COMMUNITY_AGGREGATE_RE = /\/\/\s*SYS-01-COMMUNITY-AGGREGATE\b/;
const AGGREGATE_CALL_RE = /\bcount\s*\(/;
// SYS-01-PUBLIC-READ (OQ-122, decision 0073 §0.1 — the third read class): exempts a cross-user READ
// of a user-owned table ONLY when the window carries an explicit VISIBILITY PREDICATE (a `'published'`
// status literal, the M5 spike surface). Reads-only + predicate-required — a marked write/upsert or a
// predicate-less read still fails closed. The composition-exclusion guarantee is enforced at the
// serializer (explicit-column selects + toPublicShape), not this lint (P3 finishes the lint work —
// widen the predicate set / add a misuse fixture). Guard-surface marker → auditable at the seam review.
const PUBLIC_READ_RE = /\/\/\s*SYS-01-PUBLIC-READ\b/;
// The visibility predicate signal: a literal `'published'` status filter, OR a call to the
// `publishedOnly(...)` helper — whose whole contract is to INJECT that predicate (decision 0073 §0.1
// names the helper as the mechanism). Either present in-window means the read is visibility-scoped.
const PUBLISHED_PREDICATE_RE = /['"]published['"]|\bpublishedOnly\s*\(/;
// SYS-01-FRIEND-READ (OQ-146/decision 0076 §0.1 — the FOURTH read class): exempts a cross-user READ of a
// user-owned table ONLY when the marked statement carries an explicit ACCEPTED-FRIENDSHIP predicate (a
// literal `'accepted'` status filter, OR a call to `friendScoped(...)` — the helper whose whole contract
// is to INJECT that predicate, 0076 §0.1 names it as the mechanism). Reads-only + predicate-required — a
// marked write/upsert or a predicate-less marked read still fails closed. The predicate is read from the
// MARKED STATEMENT (markedStatementOf), NOT a loose line window, so a neighbouring query's `friendScoped(`
// can never launder a predicate-less marked read (the M5 neighbour-launder fix, mirrored). Guard-surface
// marker → auditable at the gate-3 seam review; the payload allowlist is the serializer's (toFriendShape).
const FRIEND_READ_RE = /\/\/\s*SYS-01-FRIEND-READ\b/;
const FRIEND_PREDICATE_RE = /['"]accepted['"]|\bfriendScoped\s*\(/;
// SYS-01-ADMIN-OP (M6 P7 / decision 0081 — the FIFTH access class, and the only one that admits a
// WRITE): the admin console reads ACROSS users (aggregate stats · the reports queue) and performs the
// one privileged cross-user write v1 ships (the MOD-08 card takedown). No row predicate can express
// "the caller is a tier-N admin", so unlike the other four doors this marker carries NO in-statement
// predicate — its guard is CONFINEMENT plus the layers above it:
//   • FILE-CONFINED to `repositories/admin-repo.ts` — the marker cannot grant a bypass anywhere else
//     (the same containment pattern as SYS-01-AUTH-LOOKUP; a misuse fixture proves it).
//   • Every route reaching that file is behind `requireAdminTier(n)` (auth/admin.ts) and is covered by
//     the STANDING admin-class authz sweep (plain user → 403, unauthenticated → 401).
//   • Every write through it also writes a MOD-10 `admin_audit_log` row in the same transaction.
// That trade is recorded in decision 0081 §"the fifth door" — it is a deliberate, auditable widening,
// not an oversight. Keep the file tiny: everything in admin-repo.ts is reviewable in one sitting.
const ADMIN_OP_RE = /\/\/\s*SYS-01-ADMIN-OP\b/;
const isAdminOpFile = (path) => /(^|\/)repositories\/admin-repo\.[mc]?tsx?$/.test(path);
// The composition-exclusion guarantee (OQ-122/CARD-15/0066 §2 — P3 finishes the lint work): a
// SYS-01-PUBLIC-READ read must NEVER select the private `composition` column (cross-user viewers get
// the flattened image only). The regex matches a `.composition` column ref but NOT `.compositionHash`
// (no word boundary before `Hash`), so the public dedup read (which selects the hash) is unaffected.
const COMPOSITION_SELECT_RE = /\.composition\b/;
const WINDOW = 12;
// A slightly wider window for the PUBLIC-READ MARKER only: an attributed select can push the
// `// SYS-01-PUBLIC-READ` comment several lines off the `.from(...)` verb (it may sit above a long
// column object). This widens ONLY where the marker is looked for — the visibility predicate and the
// composition-select are NOT read from this window (that was the P3 hole: the ±16-line window matched a
// `publishedOnly(` / `'published'` belonging to a NEIGHBOURING query, laundering a predicate-less marked
// read). Those two now bind to the marked statement itself — see markedStatementOf.
const PUBLIC_READ_WINDOW = 16;
/** How far ahead an insert chain is scanned for `.onConflictDoUpdate(` (bounded by the next `;`). */
const CHAIN_LOOKAHEAD = 2000;
/**
 * The marked query chain a verb belongs to — the code between the enclosing statement boundary
 * (the nearest preceding `;`/`{`) and the statement's terminating `;`. The PUBLIC-READ visibility
 * predicate + composition-select checks bind to THIS expression, not a loose line window, so a
 * `publishedOnly(` / `'published'` in a NEIGHBOURING statement can never launder a predicate-less
 * marked read (the P3 window hole). Comments are already stripped from `code`.
 * @param {string} code stripped-comment source · @param {number} idx the verb match's index.
 */
const markedStatementOf = (code, idx) => {
  const start = Math.max(code.lastIndexOf(';', idx), code.lastIndexOf('{', idx)) + 1;
  const semi = code.indexOf(';', idx);
  const end = semi === -1 ? Math.min(idx + CHAIN_LOOKAHEAD, code.length) : semi;
  return code.slice(start, end);
};

const isAuthLookupFile = (path) =>
  /(^|\/)auth\//.test(path) || /(auth|token)[\w-]*-repo\.[mc]?tsx?$/.test(path);
/** The strict repository surface (raw-SQL ban): `repositories/` dirs + `*-repo` files — NOT db/ infra. */
const isStrictRepoFile = (path) =>
  /(^|\/)repositories\//.test(path) || /-repo\.[mc]?tsx?$/.test(path);

const READ_VERBS = new Set(['from', 'leftJoin', 'rightJoin', 'innerJoin', 'fullJoin']);

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

      /** Shared window predicates around a match's line number. */
      const windowOf = (lineNo) => {
        const from = Math.max(0, lineNo - 1 - WINDOW);
        const to = Math.min(codeLines.length, lineNo + WINDOW);
        const codeWindow = codeLines.slice(from, to).join('\n');
        const origWindow = origLines.slice(from, to).join('\n');
        // The PUBLIC-READ MARKER is looked for in a slightly wider window (it can sit above a long
        // column object). The predicate + composition-select are NOT read here — they bind to the
        // marked statement (markedStatementOf), so a neighbour's `publishedOnly(` cannot launder.
        const pFrom = Math.max(0, lineNo - 1 - PUBLIC_READ_WINDOW);
        const pTo = Math.min(codeLines.length, lineNo + PUBLIC_READ_WINDOW);
        const pOrigWindow = origLines.slice(pFrom, pTo).join('\n');
        return {
          hasScope: SCOPE_SIGNAL_RE.test(codeWindow),
          hasExemptComment: /SYS-01-EXEMPT/.test(origWindow),
          hasAuthLookupComment: AUTH_LOOKUP_RE.test(origWindow),
          hasAggregateComment: COMMUNITY_AGGREGATE_RE.test(origWindow),
          hasAggregateCall: AGGREGATE_CALL_RE.test(codeWindow),
          hasPublicReadComment: PUBLIC_READ_RE.test(pOrigWindow),
          hasFriendReadComment: FRIEND_READ_RE.test(pOrigWindow),
          hasAdminOpComment: ADMIN_OP_RE.test(origWindow),
        };
      };

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

      // (b) every recognized table-taking verb on a user-owned table must carry a scope signal.
      for (const match of code.matchAll(TABLE_VERB_RE)) {
        const verb = match[1];
        const table = match[2];
        if (isGlobal(table)) continue;
        const idx = match.index ?? 0;

        // A bare insert is exempt — but an `.onConflictDoUpdate(` chain upgrades it to a WRITE of an
        // existing row (the OQ-118 upsert hole). Scan the chain to the statement's `;` (bounded).
        if (verb === 'insert' || verb === 'into') {
          const semi = code.indexOf(';', idx);
          const chainEnd = semi === -1 ? idx + CHAIN_LOOKAHEAD : Math.min(semi, idx + CHAIN_LOOKAHEAD);
          if (!/\.onConflictDoUpdate\s*\(/.test(code.slice(idx, chainEnd))) continue;
        }

        const lineNo = code.slice(0, idx).split('\n').length;
        const w = windowOf(lineNo);
        const hasExempt = w.hasExemptComment && isGlobal(table);
        // A pre-auth / bearer-credential lookup, valid ONLY in an auth-layer repo AND ONLY for a
        // `.from` SELECT — a marked write/upsert/join still fails closed (reads-only contract).
        const hasAuthLookup =
          verb === 'from' && isAuthLookupFile(file.path) && w.hasAuthLookupComment;
        // An anonymous cross-user AGGREGATE read (CAT-09/OQ-126): reads-only + count() required.
        const hasCommunityAggregate =
          READ_VERBS.has(verb) && w.hasAggregateComment && w.hasAggregateCall;
        // A cross-user PUBLIC read (OQ-122): reads-only + an explicit `'published'` visibility predicate.
        // The predicate + composition-select are read from the MARKED STATEMENT itself (not a loose line
        // window) so a neighbouring query's `publishedOnly(` / `'published'` can never launder a
        // predicate-less marked read (the P3 window hole). Only computed for a marked read verb.
        const marksPublicRead = READ_VERBS.has(verb) && w.hasPublicReadComment;
        // A cross-user FRIEND read (0076 §0.1): reads-only + an explicit accepted-friendship predicate,
        // bound to the MARKED STATEMENT (not a loose window) so a neighbour's friendScoped can't launder.
        const marksFriendRead = READ_VERBS.has(verb) && w.hasFriendReadComment;
        const statement = marksPublicRead || marksFriendRead ? markedStatementOf(code, idx) : '';
        const hasPublishedPredicate = marksPublicRead && PUBLISHED_PREDICATE_RE.test(statement);
        const selectsComposition = marksPublicRead && COMPOSITION_SELECT_RE.test(statement);
        const hasPublicRead = marksPublicRead && hasPublishedPredicate;
        const hasFriendRead = marksFriendRead && FRIEND_PREDICATE_RE.test(statement);
        // The ADMIN console's cross-user reads + the one MOD-08 write — file-confined to admin-repo.ts
        // (see the marker's contract above). Predicate-less by nature; the gate is requireAdminTier.
        const hasAdminOp = isAdminOpFile(file.path) && w.hasAdminOpComment;
        // The composition-exclusion guarantee: a PUBLIC read that selects `composition` is NEVER
        // exempt — the private layers must not cross to another principal (CARD-15 / 0066 §2). Flag it
        // explicitly (a clear message) and skip the generic check (one violation, not two).
        if (hasPublicRead && selectsComposition) {
          violations.push({
            file: file.path,
            line: lineNo,
            message: `// SYS-01-PUBLIC-READ selects "composition" — a cross-user public read must never expose the private composition (OQ-122/CARD-15). Select the flattened image columns only (toPublicShape allowlist).`,
          });
          continue;
        }
        if (
          !w.hasScope &&
          !hasExempt &&
          !hasAuthLookup &&
          !hasCommunityAggregate &&
          !hasPublicRead &&
          !hasFriendRead &&
          !hasAdminOp
        ) {
          const kind = READ_VERBS.has(verb) ? 'read' : verb === 'insert' || verb === 'into' ? 'upserted' : 'modified';
          violations.push({
            file: file.path,
            line: lineNo,
            message: `user-owned table "${table}" ${kind === 'read' ? 'read' : kind} via .${verb}() without the SYS-01 scoped helper (fails closed — not on the F32 global manifest). Use asActor()/ownedBy().`,
          });
        }
      }

      // (c) the relational query builder (`db.query.<table>.findFirst/findMany`) is a read with no
      // `.from(...)` — the OQ-118 RQB hole. Same fail-closed treatment; no AUTH-LOOKUP escape.
      for (const match of code.matchAll(RQB_RE)) {
        const table = match[1];
        if (isGlobal(table)) continue;
        const idx = match.index ?? 0;
        const lineNo = code.slice(0, idx).split('\n').length;
        if (!windowOf(lineNo).hasScope) {
          violations.push({
            file: file.path,
            line: lineNo,
            message: `user-owned table "${table}" read via the relational query builder (query.${table}.find…) without the SYS-01 scoped helper (fails closed). Use asActor()/ownedBy().`,
          });
        }
      }

      // (d) raw SQL in the strict repository surface is unclassifiable → fail closed UNCONDITIONALLY
      // (a nearby scope signal must not launder a raw statement — the OQ-118 raw-SQL hole).
      if (isStrictRepoFile(file.path)) {
        for (const match of code.matchAll(RAW_RE)) {
          const idx = match.index ?? 0;
          const lineNo = code.slice(0, idx).split('\n').length;
          violations.push({
            file: file.path,
            line: lineNo,
            message: `raw SQL (.execute() / sql\`\`) in a repository is unclassifiable by the SYS-01 scoping lint — fails closed (OQ-118). Use the query builder; infra SQL belongs in db/, guarded by rule-f03.`,
          });
        }
      }
    }
    return violations;
  },
};
