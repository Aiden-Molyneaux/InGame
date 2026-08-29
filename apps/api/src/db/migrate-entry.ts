// The deploy pre-run entry (bundled to dist/server/migrate.js) — UNCONDITIONAL by design.
// migrate.ts's isDirectRun() guard proved environment-sensitive under the bundled runner: Railway's
// preDeployCommand executes with a cwd where pathToFileURL(argv[1]) !== import.meta.url, so the
// guarded entry exited 0 having applied ZERO migrations — the app then booted against an empty
// schema with a green health check (observed on the first G-C deploy, 2026-08-29; exactly the
// silent-no-op the deploy-config murr audit predicted). An entry that exists only to be executed
// deliberately needs no am-I-the-entry conditional. Never import this module from server code:
// importing it RUNS the migrations (see the build-prod.mjs isDirectRun-under-bundle trap note).
import { runMigrations } from './migrate';
import { closeDb } from './client';

runMigrations()
  .then(() => closeDb())
  .then(() => {
    console.log('migrations applied');
    process.exit(0);
  })
  .catch((error) => {
    console.error('migration failed:', error);
    process.exit(1);
  });
