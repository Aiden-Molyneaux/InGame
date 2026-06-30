# InGame — Testing Strategy

> How we test InGame. Owned by Claude Code (engineering). Referenced from
> [`product-spec.md`](product-spec.md) §7 and IDs `SYS-06`/`SYS-07`. Behavior being tested is
> identified by the spec's stable feature IDs.

**Version:** 0.2 · **Last updated:** 2026-06-30 · **Owner:** Claude Code

---

## 1. Principles (read these first)

1. **Every test must earn its place.** The litmus: *if this test failed, would it reveal a bug a
   real user (often the Curator) would care about?* If not, we don't write it. We are explicitly
   **not** chasing a coverage percentage or writing a test per getter.
2. **Risk-based, not uniform.** Rigor concentrates on a short list of expensive-to-break domains
   (§3). Low-risk and cosmetic code gets light or manual treatment.
3. **Fast feedback is a feature.** A slow suite kills momentum and gets ignored. We budget for speed
   (parallelism, container reuse, transaction rollback per test) and treat a slow suite as a bug.
4. **Don't over-test ahead of the product.** We do **not** lock down exploratory UI with hundreds of
   tests before the shape is validated through the design phase and real use. The risky *core*
   (economy, authorization, auth) is tested early; UI firms up first, then gets targeted tests.
5. **Test behavior and invariants, not implementation details.** Tests should survive a refactor
   that preserves behavior. Prefer asserting outcomes and state over internal call counts.
6. **Delete tests that stop earning their keep.** The suite is curated, not append-only.

> Origin of principle 1 & 4: a prior project accumulated ~300 trivial tests before any UI existed,
> with a slow suite, and was abandoned. We design against that directly.

## 2. Shape & tooling — the "testing trophy"

A wide base of fast tests, a thin cap of slow ones. Integration is the center of gravity because it
gives the most confidence per unit of effort for this stack.

| Layer | What it covers | Tooling | Volume |
|---|---|---|---|
| **Static** | Types, lint, runtime input validation | TypeScript (strict), ESLint, **zod** (validators also serve as a living request/response contract) | Always on |
| **Unit** | Pure logic: is-premium derivation, adoption-cost math, dedup/normalization, milestone math, selectors, Redux/RTK slices | **Vitest** (backend), **Jest / jest-expo** (client) | Many, fast |
| **Integration** ⭐ | The API at the HTTP boundary against a **real Postgres** | **supertest** + Express app + **Testcontainers** (throwaway PG, Docker) + Drizzle migrations | The heart |
| **Component** | RN screens/forms behave (e.g. card switcher COL-06, validation states) | **React Native Testing Library** (behavior, not pixels) | Targeted |
| **E2E** | Critical full journeys on emulator/device | **Maestro** (YAML flows, iOS + Android) | Thin (§5) |

**Why real-DB integration is central:** ownership-scoping (`SYS-01`), SQL/Drizzle correctness,
transactions, and the currency ledger only prove out against a real database. Mocking the DB would
have *hidden* the prototype's cross-user vulnerability; an integration test catches it.

## 3. Where rigor goes (the risk shortlist)

These get test-first, thorough treatment. Tests are tagged with the ID, e.g.
`describe('ECON-03: premium adoption costs 1 currency', …)`.

- **Economy** (`ECON-03/06/07`): premium adoption debits exactly 1; non-premium debits 0;
  insufficient balance is rejected; **the ledger always reconciles to the wallet balance**; daily
  bonus is idempotent per period; a **replayed IAP receipt never double-grants**; a concurrency test
  guards against double-spend.
- **Authorization** (`SYS-01`, enforced by `SYS-07`): for **every mutating endpoint**, a standing
  test that user A cannot read or modify user B's resource. This is a per-endpoint checklist item.
- **Auth** (`AUTH-*`): refresh-token rotation, expiry, and reuse detection.
- **Catalog dedup** (`CAT-03`): near-duplicate titles are caught; exact normalization is correct.

## 4. TDD posture

- **Test-first for the risk shortlist (§3).** We use the `superpowers:test-driven-development`
  discipline there: write the failing test from the spec ID, then implement.
- **Test-after, targeted, for UI and exploratory areas.** Component tests are added once a screen's
  behavior settles — not before. This keeps design iteration fast (principle 4).

## 5. End-to-end (Maestro, kept thin)

A small set of high-value journeys only — slow and flake-prone tests are a liability, so we cap them:

1. Onboard → add a game to collection.
2. Design a card → publish; adopt another user's card (free + premium paths).
3. Add a friend → compare hours.
4. Purchase flow (currency / premium pack).

**IAP:** real StoreKit/Play sandbox e2e is finicky, so purchase *correctness* is proven by
integration tests (mock the RevenueCat webhook / receipt validation, assert idempotent grants), with
a **manual sandbox pass** for the real purchase UX before release.

## 6. Force-multipliers

- **Shared data factories** (`makeUser`, `makeGame`, `makeCardDesign`, …) used by **both**
  integration tests and the local **dev seed/mock layer** (the dev-tooling gate). Build once, serve
  both — this also keeps Chrome/iPhone manual testing well-stocked with realistic data.
- **ID-tagged tests** give spec↔test↔code traceability: grep an ID, find everything related.

## 7. CI (GitHub Actions)

Pipeline on every push/PR, fail-fast, ordered cheapest-first:
```
typecheck + lint  →  unit  →  integration (Testcontainers PG)  →  gitleaks (secret-scan)  →  SCA (npm audit)  →  build compiles
```
> **v0.2 reconcile (decision 0051):** the required-green spine is the **six checks above** (this doc previously listed only three — `CONVENTIONS.md` + decision 0046 own the CI-gate truth). The integration job must **start a real PG container** (fail on zero containers) and the economy/authz risk domains carry **concurrent** race tests (F36). §2's "single zod contract" is now a **request/response split** (the response shape is owned by the F06 privacy serializer); §3's standing authz test widens from "every *mutating* endpoint" to **"any endpoint returning another principal's data"** (F06).
- **E2E** runs nightly / on-demand (not per-PR) to keep PR feedback fast.
- **Speed budget:** integration tests share a single PG container and isolate via
  per-test transaction rollback; suite is parallelized/sharded. If PR feedback creeps past a few
  minutes, that's a bug to fix.
- **Coverage:** tracked for insight; a **hard gate only on the §3 high-risk modules**, not a blanket
  global percentage (per principle 1).

## 8. Anti-patterns we explicitly avoid

- Hundreds of trivial tests written before the UI/product shape is validated.
- Testing implementation details (internal calls, private state) that break on harmless refactors.
- Snapshot tests as a default — they tend to be rubber-stamped, not read.
- Redundant tests asserting the same behavior at multiple layers.
- A slow suite tolerated as "just how it is."

## 9. What we set up now vs. later

- **Now (Phase 1 / Foundation, `SYS-06`):** the harness (Vitest, supertest, Testcontainers, RNTL,
  Jest config) and the GitHub Actions pipeline — so feature #1 lands green and tested.
- **As features land:** test-first for §3 domains; targeted component tests as screens settle.
- **Before release:** the Maestro journeys (§5) and the manual IAP sandbox pass.

---

## Changelog
| Date | Version | Change |
|---|---|---|
| 2026-06-07 | 0.1 | Initial strategy. Risk-based trophy; Vitest/Jest/RNTL/supertest/Testcontainers/Maestro; meaningful-tests-first principles. |
