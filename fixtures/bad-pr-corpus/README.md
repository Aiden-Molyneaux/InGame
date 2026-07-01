# fixtures/bad-pr-corpus — the self-guarding lint spine (decision 0051/F22)

One **deliberately-bad** fixture per `[LINT]` rule. The meta-test
(`tools/lint/corpus.test.mjs`) asserts that **each lint REJECTS its fixture** (and that the real
scaffold source is clean). This is, simultaneously:

- the **F22 self-test** — proves the lint spine has teeth and hasn't silently rotted;
- **gate G-B(c)'s evidence** — a planted bad "PR" the CI refuses;
- the **new-agent worked example** — read a fixture to see exactly what each rule forbids.

> These files are intentionally NOT valid against the conventions. They are excluded from
> `tsconfig`, ESLint, the real `npm run lint:custom` pass, and the Vitest test globs — they are only
> ever loaded by the meta-test, which points each rule at its own folder.

| Folder | Violates | The planted bug |
|---|---|---|
| `rule-01-layering/` | CONVENTIONS rule 1 | raw `getDb().select()` in a controller (outside the repository layer) |
| `rule-02-scoping/` | CONVENTIONS rule 2 / F32 | (a) a repo reads another user's row with no SYS-01 scoped helper (the original sin); (b) a `// SYS-01-AUTH-LOOKUP`-marked **write** (`.update(users)`) in an auth-layer repo — the marker is reads-only, so a marked write fails closed |
| `rule-03-zod/` | CONVENTIONS rule 3 | a handler reads raw `req.body` with no shared-schema validation |
| `rule-04-authz/` | CONVENTIONS rule 4 / F30 | a `mutates:true` route whose `authzTest` has no paired actor-B 4xx test |
| `rule-05-events/` | CONVENTIONS rule 5 | a `@mutation` seam that emits no domain event (warn-severity; teeth deferred to M7) |
| `rule-06-spec-ids/` | CONVENTIONS rule 6 | a risk-domain test that is untagged + one tagged with an unregistered id |
| `rule-08-deps/` | CONVENTIONS rule 8 | a `package.json` dependency with no justification-ledger entry |
| `rule-f03-destructive-guard/` | decision 0051/F03 | a destructive `TRUNCATE` runner with no `assertDisposableDb()` guard |
