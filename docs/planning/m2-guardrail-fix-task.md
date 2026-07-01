# M2 Guardrail-Hardening + Cleanup Fix-Task (paste into OpenCode)

> **Small lint/cleanup pass, not a build.** An independent foundation review + a 20-agent verification
> confirmed a set of **guardrail coverage gaps** — the theme: the custom lint spine verifies code that *opts
> into* the seams (`defineRoute`, `@mutation`, the scoped helper) but almost nothing verifies the
> *opting-in*. Close these on the **`m2` branch (PR #5)** and keep the six-check spine green. You are in
> **OpenCode**: PR-for-everything, `node scripts/health-check.mjs` (not `/health`), no skills. **Commit/push
> only when the owner asks.** Full evidence (each finding independently verified): `docs/planning/foundation-review-findings.md` (F-01..F-20); rationale: `docs/decisions/0055-foundation-review-formalization-batch1.md`.
>
> **For every new/changed lint rule, add a bad-PR corpus fixture that FAILS the rule** (the F22 corpus
> meta-test must reject it), mirroring `fixtures/bad-pr-corpus/**`. A guard with no failing fixture isn't proven.

## Priority 1 — seam-ADOPTION guards (F-01, the biggest gap)
The authz-test / outbox / MOD-10-audit invariants all key off *voluntary* markers; code that simply doesn't
adopt the seam escapes all three. Add two additive lints:
- **(a) Route-registration guard:** any `app.<verb>(` / `router.<verb>(` outside the one sanctioned bootstrap
  file fails CI ("register via `defineRoute`"). Today a plain-Express route has no inventory entry → no
  SYS-07 authz-test requirement (rule-04) and dodges rule-03.
- **(b) Mutation-seam guard:** a repository write-method call (`.insert(`/`.update(`/`.delete(` on a repo
  import) inside `services/` **not lexically inside a `mutation(` block** fails CI (windowed heuristic like
  rule-02). Today such a write escapes rule-05 (outbox emit) **and** the transactional MOD-10 audit row.
  (rule-01 forces writes into repos but does not force the repo call into `mutation()`.)
- *(Stronger, optional/M3: make repo write-methods require a `MutationCtx` param only `mutation()` can
  construct — type-level enforcement. Note it; build only if cheap.)*

## Priority 2 — rule-02 scope-lint coverage (F-02 = OQ-118)
`ACCESS_RE` matches only `.from`/`.update`/`.delete(table)` — a 3-verb denylist. Extend it (fail-closed) to:
- **(a)** Drizzle relational reads — `db.query.<ident>.` (map ident→table via `toSnake`);
- **(b)** raw SQL in a repository — any `execute(` / `sql\`` requires a scope-signal in the window or fails
  ("raw SQL needs the scoped helper or a listed-global EXEMPT");
- **(c)** `.insert(` — an actor-stamp heuristic, or encode "inserts are safe" as a standing SYS-07
  insert-with-foreign-owner test obligation.
- **Fix the dead `SYS-01-EXEMPT` branch** (unreachable — global tables `continue` before it's consulted).
- Corpus fixtures for each new shape.

## Priority 3 — input + authz-credit coverage
- **F-03 (rule-03-zod):** also inspect `req.query` / `req.params` (add a `validateQuery(...)` chokepoint);
  make the presence check **per-occurrence** (like rule-02), not per-file; run the "imported from
  `@ingame/shared` / never hand-rolled" check on **every** validate call-site regardless of `defineRoute`.
  (M3's collection/search surface is query-param-shaped.)
- **F-04 (rule-04-authz):** scope the three coverage predicates (token · 4xx-near-assert · `actorB`) to a
  **single test block** (`matchBalanced` within the enclosing `it(...)`), not the whole file; add a backstop:
  `method !== 'get' && !mutates` fails CI unless the route carries an explicit `readonly: true`-style justification.

## Priority 4 — supply-chain + harness hygiene
- **F-08 (rule-08):** add the promised **lockfile-diff surfacer** — a CI step diffing `package-lock.json` vs
  the merge-base, posting added/changed `name@version` for the G-M glance (optionally fail on integrity-only
  changes). *(Alternatively drop the surfacer claim from `CONVENTIONS.md:74` — but it was promised; building
  it is the intent. Owner G-M call.)*
- **F-19:** add `apps/mobile/app` to `SOURCE_ROOTS` in `tools/lint/run.mjs` (the app's screens live there,
  scanned by nothing today); add `dedup` (or the real M3 dir) to `rule-06`'s `RISK_DOMAIN_RE` at M3 entry;
  teach `health-check.mjs` the code phase is live (M1 exited, decision 0052) so the dashboard stops saying
  "dormant"; register `CAT-09c`/`ECON-05a`-style sub-IDs properly or ban suffixed pseudo-IDs (the current
  `\b`-terminated regex makes them invisible — neither counted nor flagged).

## Priority 5 — M2 shape cleanups (small, same review)
- **F-16 code drop:** remove `privacy: privacySchema` from `friendProfileSchema`
  (`packages/shared/src/schemas/response/profile.ts`) — api-contract 0.43 says neither `/users/:id` shape
  exposes the target's own `privacy`. Update any test that asserted it.
- **OQ-121:** login/register session serializer returns `user.gamertags: []` while `GET /me` inlines the real
  rows — pin one: join gamertags in the issuance serializer (match the self-shape, 0.42/OQ-116) **or** omit
  the field from session responses.

## Report back
(1) what changed (files + which finding #); (2) each new lint's corpus fixture + confirmation the F22
meta-test rejects it; (3) a link to a **green six-check CI run** on the `m2` head.
