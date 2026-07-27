import { eq } from 'drizzle-orm';
import { users } from '../db/schema';

// DELIBERATELY BAD (F22 corpus) — the SYS-01-ADMIN-OP marker used OUTSIDE `repositories/admin-repo.ts`.
// The marker's entire safety argument is CONFINEMENT: it admits predicate-less cross-user access (and
// even a write) because it lives in one short, reviewable file that only tier-gated admin routes can
// reach. Honouring it anywhere else would turn it into a general-purpose SYS-01 bypass — so the lint
// must FAIL CLOSED here, exactly as it does for a misplaced SYS-01-AUTH-LOOKUP.
export async function everyonesEmail(exec: any, targetId: string) {
  // SYS-01-ADMIN-OP: (abused) claims the admin door from an ordinary repository
  const rows = await exec.select().from(users).where(eq(users.id, targetId));
  return rows[0] ?? null;
}
