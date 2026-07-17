import { defineWorkspace } from 'vitest/config';

// Two projects so the CI six-check spine can run them as distinct steps (testing-strategy §7):
//   - `unit`        : fast, pure logic + the lint-corpus meta-test (F22). No Docker.
//   - `integration` : the heart — supertest + Express + Testcontainers (real Postgres) + Drizzle
//                     migrations. Must start a real PG container and FAIL on zero (decision 0051/F36).
export default defineWorkspace([
  {
    test: {
      name: 'unit',
      globals: true,
      environment: 'node',
      include: [
        'packages/shared/src/**/*.test.ts',
        'apps/api/src/**/*.test.ts',
        'tools/**/*.test.ts',
        'tools/**/*.test.mjs',
      ],
      // AUTH-01 (decision 0076 §0.9) — the breach-check kill-switch, OFF here: breach-check.test.ts
      // exercises checkPasswordBreached directly (with an injected fetchImpl per case) and flips this
      // per-test where it needs to; nothing else in `unit` touches the network either way.
      env: { BREACH_CHECK_ENABLED: 'false' },
    },
  },
  {
    test: {
      name: 'integration',
      globals: true,
      environment: 'node',
      include: ['apps/api/test/integration/**/*.test.ts'],
      testTimeout: 120_000,
      hookTimeout: 120_000,
      // One shared PG container across the integration files; the race/concurrency assertions fire
      // N parallel requests WITHIN a test, so file-level parallelism is unnecessary.
      fileParallelism: false,
      // AUTH-01 (decision 0076 §0.9) — the SYS-04 kill-switch, OFF for the whole integration suite:
      // every existing test's registerUser()/reset-confirm call would otherwise fire a REAL network
      // request to the HIBP range API on every run (slow, flaky offline, and the packet brief is
      // explicit that the real endpoint is never hit in tests). The breach-check module itself is unit
      // -tested in isolation (apps/api/src/auth/breach-check.test.ts) with an injected fetchImpl —
      // this flag only keeps the REST of the suite from depending on live network access.
      env: { BREACH_CHECK_ENABLED: 'false' },
    },
  },
]);
