import { sql } from 'drizzle-orm';
import { pathToFileURL } from 'node:url';
import { assertDisposableDb } from './destructive-guard';
import { getDb, closeDb } from './client';

// A DESTRUCTIVE runner (truncates all data) — the exact class F03 guards. `assertDisposableDb` is
// called FIRST: it fails closed unless the target DB is positively marked disposable, so this can
// never wipe a production database (the agent is the threat model — a stray DATABASE_URL).
export async function resetDb(): Promise<void> {
  assertDisposableDb();
  const db = getDb();
  await db.execute(sql`TRUNCATE TABLE domain_events, users RESTART IDENTITY CASCADE`);
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
  resetDb()
    .then(() => closeDb())
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('reset failed:', error);
      process.exit(1);
    });
}
