import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, resolve } from 'node:path';
import { getDb, closeDb } from './client';

const MIGRATIONS_DIR = resolve(dirname(fileURLToPath(import.meta.url)), '../../drizzle');

// Roll migrations forward. Non-destructive (creates/alters), so it is NOT behind the F03 guard —
// it runs against any environment (prod included, owner-gated for destructive changes).
export async function runMigrations(): Promise<void> {
  await migrate(getDb(), { migrationsFolder: MIGRATIONS_DIR });
}

function isDirectRun(): boolean {
  const entry = process.argv[1];
  if (!entry) return false;
  try {
    return pathToFileURL(entry).href === import.meta.url;
  } catch {
    return false;
  }
}

if (isDirectRun()) {
  runMigrations()
    .then(() => closeDb())
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('migration failed:', error);
      process.exit(1);
    });
}
