// The API's PRODUCTION artifact build (G-C / Railway). Run by `npm -w @ingame/api run build`
// after `tsc -b`; cwd-independent, so the repo-root `npm run build` can call it directly too.
//
// ── Why a bundler and not just `tsc -b` ─────────────────────────────────────────────────────
// The repo is authored under `moduleResolution: "Bundler"` (tsconfig.base.json), so every
// relative import in `src/**` is EXTENSIONLESS (`import { createApp } from './app'`). tsc never
// rewrites specifiers and the package is ESM (`"type": "module"`), so plain
// `node dist/src/index.js` dies on the FIRST import with ERR_MODULE_NOT_FOUND — verified, and
// Node's old `--experimental-specifier-resolution=node` escape hatch was removed in Node 20.
// `@ingame/shared` is the same shape one level up: its package `exports` map points at
// `./src/index.ts`, which Node cannot load at all. Both are resolved the way "Bundler"
// resolution assumes they will be — by bundling. Rewriting 640+ specifiers across 157 source
// files, or shipping a custom ESM resolve hook into production, are the alternatives; this is
// the smaller and more standard of the three.
//
// ── What stays external ─────────────────────────────────────────────────────────────────────
// Everything in the API's `dependencies` (minus the workspace package). node_modules is
// installed on the host, and two of those deps MUST be resolved by Node at runtime rather than
// inlined: `@shopify/react-native-skia` (its canvaskit wasm + the `lib/commonjs/**` subpaths
// `src/render/flatten.ts` reaches through `createRequire`) and `@expo-google-fonts/*` (the P1-a
// font registry reads the TTFs off disk via `require.resolve(pkg + '/package.json')`). Both walk
// up to the hoisted root node_modules from wherever the bundle sits, so they survive the move
// into dist/ unchanged.
//
// ── Why the output sits at dist/server/ ─────────────────────────────────────────────────────
// The depth is load-bearing. Two modules resolve paths relative to `import.meta.url`:
// `src/db/migrate.ts` (`../../drizzle`) and `src/storage/LocalDiskStorage.ts` (`../../.media`),
// both two levels under `apps/api`. Emitting the entrypoints two levels under `apps/api` as well
// keeps those resolving to `apps/api/drizzle` and `apps/api/.media` — the SAME directories they
// resolve to under tsx. (`dist/src/index.js` would have shifted them by one and pointed the
// media root at `apps/api/dist/.media`.)

import { build } from 'esbuild';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const require = createRequire(import.meta.url);
const apiRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const pkg = require('../package.json');

// Every runtime dependency stays external — `dep` and `dep/*` (esbuild matches the subpath form
// separately). The workspace package is the one exception: it is bundled in, because Node cannot
// load what its `exports` map points at.
const external = Object.keys(pkg.dependencies ?? {})
  .filter((name) => name !== '@ingame/shared')
  .flatMap((name) => [name, `${name}/*`]);

await build({
  entryPoints: {
    // The server. `node apps/api/dist/server/index.js` (package.json `start:prod`).
    index: resolve(apiRoot, 'src/index.ts'),
    // The drizzle migration runner, so the deploy's pre-deploy hook needs no tsx either.
    // The UNCONDITIONAL entry — not migrate.ts, whose isDirectRun() guard silently no-ops under
    // runner cwd/argv variance (the first Railway deploy proved it; see migrate-entry.ts).
    migrate: resolve(apiRoot, 'src/db/migrate-entry.ts'),
  },
  outdir: resolve(apiRoot, 'dist/server'),
  bundle: true,
  platform: 'node',
  format: 'esm',
  // Matches .nvmrc (20.19.6) — the version CI and the host both run.
  target: 'node20',
  sourcemap: true,
  external,
  logLevel: 'info',
});
