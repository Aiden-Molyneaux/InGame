import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { pathToFileURL } from 'node:url';

// A durability net for the STANDING dev DB — the owner's real designed cards live only in the
// `ingame-dev-db` docker volume (local_ingame is `local_`-named, so it is DISPOSABLE per
// destructive-guard → db:reset can truncate it). This pg_dumps it to the home dir, OUTSIDE the repo
// and the docker volume, so a reset / volume-drop / disk fault is recoverable. The permanent fix is
// the managed Postgres in the beta-exit lane (P15 / G-C) — this is the "for now" safety.
const CONTAINER = 'ingame-dev-db';
const DB = 'local_ingame';
const BACKUP_DIR = path.join(os.homedir(), 'ingame-db-backups');
const KEEP = 20; // prune to the newest N

/**
 * Dump the standing dev DB to a timestamped file. Returns the path, or `null` (a safe no-op) when the
 * dev container isn't running — so reset.ts can call this unconditionally even under Testcontainers/CI,
 * which run a DIFFERENT, genuinely-disposable Postgres (no ingame-dev-db container → skipped).
 */
export function backupDevDb(): string | null {
  // Only ever back up the real dev DB. A set-but-non-local_ingame DATABASE_URL means Testcontainers/CI
  // (their resetDb() runs per test) → skip so we never pg_dump on the hot test path. An UNSET url =
  // the standalone db:backup default intent → proceed (the docker-ps check below still gates it).
  const url = process.env.DATABASE_URL ?? '';
  if (url && !url.includes('local_ingame')) return null;
  try {
    const running = execFileSync('docker', ['ps', '--filter', `name=^${CONTAINER}$`, '--format', '{{.Names}}'], {
      encoding: 'utf8',
    }).trim();
    if (running !== CONTAINER) return null; // not the dev DB (Testcontainers/CI) → nothing to protect
  } catch {
    return null; // docker unavailable → skip
  }

  fs.mkdirSync(BACKUP_DIR, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const out = path.join(BACKUP_DIR, `${DB}_${stamp}.sql`);
  const dump = execFileSync('docker', ['exec', CONTAINER, 'pg_dump', '-U', 'ingame', '-d', DB], {
    maxBuffer: 512 * 1024 * 1024,
  });
  fs.writeFileSync(out, dump);

  // prune to the newest KEEP so this never fills the disk
  const files = fs
    .readdirSync(BACKUP_DIR)
    .filter((f) => f.startsWith(`${DB}_`) && f.endsWith('.sql'))
    .sort();
  for (const f of files.slice(0, Math.max(0, files.length - KEEP))) fs.unlinkSync(path.join(BACKUP_DIR, f));

  console.log(`✅ db:backup → ${out} (${(dump.length / 1024).toFixed(0)} KB · restore: docker exec -i ${CONTAINER} psql -U ingame -d ${DB} < "${out}")`);
  return out;
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
  const out = backupDevDb();
  if (!out) {
    console.error(`db:backup: the dev container ${CONTAINER} is not running — start it (node scripts/dev-stack.mjs up) then retry.`);
    process.exit(1);
  }
  process.exit(0);
}
