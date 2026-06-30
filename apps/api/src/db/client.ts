import { drizzle, type NodePgDatabase } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import * as schema from './schema';
import { loadEnv } from '../config/env';

// Lazy singletons so tests can set DATABASE_URL (e.g. the Testcontainers DSN) BEFORE the first query.
let pool: pg.Pool | undefined;
let database: NodePgDatabase<typeof schema> | undefined;

export function getPool(): pg.Pool {
  if (!pool) {
    pool = new pg.Pool({ connectionString: loadEnv().databaseUrl });
  }
  return pool;
}

export function getDb(): NodePgDatabase<typeof schema> {
  if (!database) {
    database = drizzle(getPool(), { schema });
  }
  return database;
}

export async function closeDb(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = undefined;
    database = undefined;
  }
}

export type Db = NodePgDatabase<typeof schema>;
/** The transaction handle drizzle passes to `db.transaction(cb)`. */
export type Tx = Parameters<Parameters<Db['transaction']>[0]>[0];
/** Either the root db or an open transaction — repositories accept either so a mutation can scope
 *  its writes to one tx (the emitOnCommit outbox row commits atomically with the write). */
export type Executor = Db | Tx;
