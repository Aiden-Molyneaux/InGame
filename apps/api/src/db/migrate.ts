import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { getDb } from './client';

const MIGRATIONS_DIR = resolve(dirname(fileURLToPath(import.meta.url)), '../../drizzle');

// Roll migrations forward. Non-destructive (creates/alters), so it is NOT behind the F03 guard —
// it runs against any environment (prod included, owner-gated for destructive changes).
// PURE LIBRARY — no direct-run block. The old isDirectRun() guard here double-fired when this
// module was inlined into the bundled migrate entry (two concurrent migrators raced CREATE
// SCHEMA — caught in the 2026-08-29 G-C smoke) and silently no-op'd under Railway's runner cwd.
// The ONE executable entry is migrate-entry.ts (dev: `npm run db:migrate` → tsx migrate-entry.ts;
// prod: the bundled dist/server/migrate.js).
export async function runMigrations(): Promise<void> {
  await migrate(getDb(), { migrationsFolder: MIGRATIONS_DIR });
}
