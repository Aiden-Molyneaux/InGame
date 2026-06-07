# 0002 — Testing strategy

- **Date:** 2026-06-07
- **Status:** accepted
- **Related IDs:** SYS-06, SYS-07 (and the risk shortlist: ECON-03/06/07, SYS-01, AUTH-*, CAT-03)

## Context
Greenfield project; we want "every feature ships with meaningful tests" to be true from the first
commit. The app has high-risk domains (currency ledger, ownership-scoping, IAP grants). The product
owner was previously burned by a project with ~300 trivial tests and a slow suite, written before
any UI existed, which he abandoned — so test *value* and suite *speed* are explicit constraints.

## Decision
Adopt a **risk-based "testing trophy"** with a **meaningful-tests-first** philosophy, detailed in
[`../spec/testing-strategy.md`](../spec/testing-strategy.md). Key points:

- **Layers/tooling:** TypeScript+ESLint+zod (static) · **Vitest** (backend unit) · **Jest/jest-expo
  + React Native Testing Library** (client) · **supertest + Testcontainers Postgres** (integration —
  the heart) · **Maestro** (thin e2e).
- **Rigor concentrates** on economy, authorization, auth, and dedup; cosmetic/exploratory code gets
  light or manual treatment.
- **TDD posture:** test-first (via `superpowers:test-driven-development`) for the high-risk domains;
  targeted test-after for UI once screens settle. *(Product owner chose this over "TDD everywhere".)*
- **`SYS-07`:** every mutating endpoint carries a standing authorization test (cross-user denial),
  enforcing `SYS-01`.
- **CI:** GitHub Actions, cheapest-first, fail-fast; e2e nightly/on-demand; hard coverage gate only
  on high-risk modules; suite speed treated as a feature.
- **`SYS-06`:** the harness + CI are built in **Phase 1 (Foundation)**, before feature code.
- Shared **data factories** serve both integration tests and the local dev seed/mock layer.

## Rationale / alternatives
- **TDD everywhere** rejected — too heavy on exploratory UI and risks the trivial-test bloat the
  owner experienced.
- **Test-after throughout** rejected — the economy/authz bugs are exactly what test-after misses.
- **Detox** considered for e2e; **Maestro** chosen for simplicity and lower maintenance.
- **Mocked DB** for integration rejected — would hide the very SQL/authorization bugs we most fear.
