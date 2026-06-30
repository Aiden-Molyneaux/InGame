import { isTestFile, matchBalanced } from '../util/files.mjs';

// CONVENTIONS rule 4 [LINT] — the route↔authz-test inventory-diff (F30). Every `mutates:true` route
// (and every `crossPrincipal:true` read returning another principal's data, F06) must have a paired
// standing SYS-07 test. Coverage counts ONLY when a test hits the real route as ACTOR-B and asserts a
// 4xx (403/404) — a name-match satisfied by `expect(200)` does NOT count. The route inventory is
// DATA (parsed from the defineRoute literals), not an AST/verb guess.

function parseRoute(block) {
  const get = (re) => (re.exec(block) ?? [])[1];
  return {
    method: get(/method:\s*'([a-z]+)'/),
    path: get(/path:\s*'([^']*)'/),
    mutates: /mutates:\s*true/.test(block),
    crossPrincipal: /crossPrincipal:\s*true/.test(block),
    authzTest: get(/authzTest:\s*'([^']*)'/),
  };
}

function extractRoutes(text) {
  const routes = [];
  const re = /defineRoute\s*\(\s*\{/g;
  let m;
  while ((m = re.exec(text))) {
    const braceStart = text.indexOf('{', m.index);
    if (braceStart < 0) continue;
    routes.push(parseRoute(matchBalanced(text, braceStart, '{', '}')));
  }
  return routes;
}

const FOURXX_NEAR_ASSERT =
  /(?:expect|toBe|toEqual|status)[^\n]{0,40}\b4\d\d\b|\b4\d\d\b[^\n]{0,40}(?:expect|toBe|toEqual)/;
const ACTOR_B = /actor[_-]?b/i;

export default {
  id: 'rule-04-authz',
  title: 'authz inventory-diff — every mutating/cross-principal route has a 4xx actor-B authz test',
  conventions: 'CONVENTIONS rule 4',
  severity: 'error',
  /** @param {{ files: import('../util/files.mjs').SourceFile[] }} ctx */
  check(ctx) {
    const violations = [];
    const testFiles = ctx.files.filter((f) => isTestFile(f.path));

    const coveredByActorB4xx = (token) =>
      testFiles.some(
        (f) => f.text.includes(token) && FOURXX_NEAR_ASSERT.test(f.text) && ACTOR_B.test(f.text),
      );

    for (const file of ctx.files) {
      if (!/defineRoute\s*\(/.test(file.text) || isTestFile(file.path)) continue;
      for (const route of extractRoutes(file.text)) {
        const needsAuthz = route.mutates || route.crossPrincipal;
        if (!needsAuthz) continue;

        if (!route.authzTest) {
          violations.push({
            file: file.path,
            line: 1,
            message: `route ${route.method?.toUpperCase()} ${route.path} mutates/returns-other-principal but declares no authzTest id (SYS-07).`,
          });
          continue;
        }
        if (!coveredByActorB4xx(route.authzTest)) {
          violations.push({
            file: file.path,
            line: 1,
            message: `route ${route.method?.toUpperCase()} ${route.path}: no paired authz test "${route.authzTest}" that hits the route as actor-B and asserts 4xx (a name-match with expect(200) does not count).`,
          });
        }
      }
    }
    return violations;
  },
};
