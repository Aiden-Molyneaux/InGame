// Mobile-local ESLint flat config — the Expo client's own toolchain (out of the root `eslint .`
// pass, which ignores `apps/mobile/**`). Its ONE job today: run the React Hooks rules on the
// expo-router route files under `app/**`, which the root config never covered. This is the guard
// that would have caught the F-16 logout crash (a hook-after-early-return in app/device.tsx —
// commit 00d75f0): `rules-of-hooks` is an ERROR and must stay clean.
//
// Deliberately narrow: only the two React-Hooks rules, only on route files. It does NOT pull in the
// general tseslint/no-unused-vars pass (that stays the server's concern) — see CONVENTIONS.md.
import reactHooks from 'eslint-plugin-react-hooks';
import tsParser from '@typescript-eslint/parser';

export default [
  {
    ignores: ['node_modules/**', '.expo/**', 'dist/**'],
  },
  {
    files: ['app/**/*.{ts,tsx}'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaFeatures: { jsx: true },
      },
    },
    plugins: { 'react-hooks': reactHooks },
    rules: {
      // The F-16 crash class: every Hook must run unconditionally, before any early return.
      'react-hooks/rules-of-hooks': 'error',
      // Stale-closure / missing-dependency guard. WARN for now (fixing every case at once is a
      // separate sweep); rules-of-hooks is the hard gate.
      'react-hooks/exhaustive-deps': 'warn',
    },
  },
];
