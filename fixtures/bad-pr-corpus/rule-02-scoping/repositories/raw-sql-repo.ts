// DELIBERATELY BAD (rule-02-scoping — the OQ-118 raw-SQL hole). A raw `exec.execute(sql`…`)` can
// UPDATE/DELETE any user's row and is unclassifiable by a regex scoping lint — so inside the
// repository layer (`repositories/` + `*-repo` files) it FAILS CLOSED unconditionally: use the query
// builder. (db/ infra like the F03-guarded reset.ts is rule-f03's surface, not a repository.)
import { sql } from 'drizzle-orm';

export async function rawRenameAnyUser(exec: any, userId: string, email: string) {
  // ❌ a raw SQL write keyed on a caller-supplied id — invisible to the old 3-verb denylist
  return exec.execute(sql`UPDATE users SET email = ${email} WHERE id = ${userId}`);
}
