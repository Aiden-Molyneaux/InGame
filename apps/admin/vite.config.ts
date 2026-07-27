import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';

// The admin console's build + test config (M6 P7 — decision 0081).
//
// PORT 5173 is deliberate and pinned: `apps/api/.env.dev` already admits `http://localhost:5173` in
// the OQ-120 dev CORS allowlist, so the console talks to the shared dev API (:4000) with no extra
// server config. `strictPort` makes a port collision LOUD rather than silently landing on 5174 and
// then failing CORS with a confusing browser error.
//
// The `@ingame/shared` alias points at the package SOURCE (the apps/mobile precedent). The console
// imports TYPES ONLY from it (`import type …`), so nothing from the shared package — zod included —
// reaches the bundle; the alias exists so a stray value import fails at build rather than at runtime.
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@ingame/shared': fileURLToPath(new URL('../../packages/shared/src/index.ts', import.meta.url)),
    },
  },
  server: { port: 5173, strictPort: true },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./test/setup.ts'],
    include: ['test/**/*.test.ts', 'test/**/*.test.tsx'],
  },
});
