// Mobile-local ESLint flat config — the Expo client's own toolchain (out of the root `eslint .`
// pass, which ignores `apps/mobile/**`). Its ONE job today: run the React Hooks rules on ALL the
// client code — the expo-router route files under `app/**` AND the shared components/render/theme
// under `src/**`, which the root config never covered. This is the guard that would have caught the
// F-16 logout crash (a hook-after-early-return in app/device.tsx — commit 00d75f0): the same crash
// class is just as fatal in src/ components, so both trees are linted. `rules-of-hooks` is an ERROR
// and must stay clean.
//
// Deliberately narrow: only the two React-Hooks rules. It does NOT pull in the general
// tseslint/no-unused-vars pass (that stays the server's concern) — see CONVENTIONS.md. The
// @typescript-eslint plugin is registered ONLY so the inline `eslint-disable ... @typescript-eslint/*`
// comments already living in src/ (e.g. no-explicit-any suppressions) resolve to a known rule
// instead of erroring "rule not found"; NONE of its rules are enabled here.
import reactHooks from 'eslint-plugin-react-hooks';
import tsParser from '@typescript-eslint/parser';
import tsPlugin from '@typescript-eslint/eslint-plugin';

export default [
  {
    ignores: ['node_modules/**', '.expo/**', 'dist/**'],
  },
  {
    // This is a surgical hooks-only pass, so it deliberately does NOT run the `@typescript-eslint/*`
    // rules that some src/ files carry `eslint-disable` directives for. Because those rules are
    // registered-but-off here, ESLint 9 would otherwise flag every such directive as an "unused
    // disable directive" (reportUnusedDisableDirectives defaults to 'warn' in flat config). This
    // config is not the authority on whether a tseslint disable is warranted — the server lint and
    // editor tooling are — so it must not nag about them. Turned off; the honest, real signal here
    // is the react-hooks findings below.
    linterOptions: {
      reportUnusedDisableDirectives: 'off',
    },
    files: ['app/**/*.{ts,tsx}', 'src/**/*.{ts,tsx}'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaFeatures: { jsx: true },
      },
    },
    plugins: { 'react-hooks': reactHooks, '@typescript-eslint': tsPlugin },
    rules: {
      // The F-16 crash class: every Hook must run unconditionally, before any early return.
      'react-hooks/rules-of-hooks': 'error',
      // Stale-closure / missing-dependency guard. WARN for now (fixing every case at once is a
      // separate sweep); rules-of-hooks is the hard gate.
      'react-hooks/exhaustive-deps': 'warn',
    },
  },
];
