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
    },
  },
]);
