// InGame ESLint flat config. General code-quality lint (the six-check spine, step 1).
// The InGame-specific [LINT] CONVENTIONS rules (layering, SYS-01 scoping, zod, authz, events,
// spec-IDs, deps) are enforced by the custom mechanisms in tools/lint/ (run via `npm run lint:custom`)
// so they are testable against the fixtures/bad-pr-corpus (decision 0051/F22). ESLint stays general.
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import globals from 'globals';
import prettier from 'eslint-config-prettier';

export default tseslint.config(
  {
    // Deliberately-bad code (the F22 corpus), generated output, and the Expo client (its own
    // toolchain in M2) are out of the general lint pass.
    ignores: [
      '**/node_modules/**',
      '**/.claude/**',
      '**/dist/**',
      '**/.expo/**',
      '**/coverage/**',
      '**/drizzle/**',
      'fixtures/**',
      'apps/mobile/**',
      'scripts/health-check.mjs',
      '**/*.config.{js,ts,mjs,cjs}',
    ],
  },
  js.configs.recommended,
  {
    files: ['**/*.{ts,tsx}'],
    extends: [...tseslint.configs.recommended],
    languageOptions: {
      globals: { ...globals.node },
    },
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/consistent-type-imports': 'warn',
    },
  },
  {
    files: ['tools/**/*.mjs'],
    languageOptions: {
      globals: { ...globals.node },
    },
  },
  {
    // Repo scripts run under Node (e.g. the standing dev-stack supervisor, decision 0060).
    // health-check.mjs is separately ignored above.
    files: ['scripts/**/*.mjs'],
    languageOptions: {
      globals: { ...globals.node },
    },
  },
  {
    // The admin console (apps/admin — the decision-0081 external SPA) is BROWSER code, unlike every
    // other tree this config covers. Unlike apps/mobile it is NOT ignored: it has no separate
    // toolchain, so the root pass is its only general lint. Vitest globals ride along because the
    // console's tests run with `globals: true` (its vite.config.ts).
    files: ['apps/admin/**/*.{ts,tsx}'],
    languageOptions: {
      globals: { ...globals.browser, ...globals.vitest },
    },
  },
  prettier,
);
