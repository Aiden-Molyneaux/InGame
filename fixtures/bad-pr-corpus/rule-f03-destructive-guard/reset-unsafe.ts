// DELIBERATELY BAD (rule-f03-destructive-guard). A destructive runner that TRUNCATEs without first
// calling the F03 fail-closed guard — it could wipe a production database (a stray DATABASE_URL is
// unrecoverable). The lint requires assertDisposableDb() before any destructive op.
import { sql } from 'drizzle-orm';

export async function nukeEverything(db: any) {
  // ❌ no assertDisposableDb() — runs against whatever DATABASE_URL points at
  await db.execute(sql`TRUNCATE TABLE users, wallets, currency_ledger RESTART IDENTITY CASCADE`);
}
