import { and, eq, isNull, like } from 'drizzle-orm';
import { getDb, type Executor } from '../db/client';
import { asActor, ownedBy } from '../db/scoped';
import {
  users,
  authIdentities,
  type UserRow,
  type NewUserRow,
  type AuthIdentityRow,
} from '../db/schema';
import { ServerError } from '../errors/AppError';

// AUTH-* repository. The LOOKUPS here are pre-authentication / bearer-credential reads (there is no
// actor yet — this is the step that ESTABLISHES one), marked // SYS-01-AUTH-LOOKUP and confined to
// this auth-layer repo (rule-2). Every WRITE is actor-scoped by the resolved userId via the SYS-01
// helper (asActor / ownedBy) — the marker is used for lookups only.

export async function findByEmail(email: string, exec: Executor = getDb()): Promise<UserRow | null> {
  // SYS-01-AUTH-LOOKUP: login / register-uniqueness / reset-request lookup by email (pre-auth).
  const rows = await exec.select().from(users).where(eq(users.email, email)).limit(1);
  return rows[0] ?? null;
}

export async function findByUsername(
  username: string,
  exec: Executor = getDb(),
): Promise<UserRow | null> {
  // SYS-01-AUTH-LOOKUP: username-availability / register-uniqueness lookup (pre-auth). Case-INSENSITIVE
  // (OQ-124) — matches on the generated case-fold column (users_username_normalized_idx); the stored
  // row keeps its display casing, so 'Aiden' and 'aiden' resolve to the same account. Usernames are
  // ASCII [A-Za-z0-9_], so .toLowerCase() equals the DB's lower().
  const rows = await exec
    .select()
    .from(users)
    .where(eq(users.usernameNormalized, username.toLowerCase()))
    .limit(1);
  return rows[0] ?? null;
}

/**
 * SOC-07 (C1 / OQ-147-era owner walk ruling) — FUZZY people-directory search: case-insensitive
 * PREFIX + interior-SUBSTRING match (LIKE `%q%`) so "Kyra" finds "KyraInGame". Matches on the generated
 * case-fold column (`usernameNormalized` = lower(username)); the query is lowercased so a plain LIKE is
 * case-insensitive. LIKE metacharacters in the query are escaped so a literal `_` in a handle is not a
 * wildcard (`%`/`\` cannot appear — usernames are [A-Za-z0-9_], but they are escaped for safety). Deleted
 * rows are excluded; the result is capped (no paging). Ordered prefix-hits-first, then alphabetical (the
 * DB orders alphabetically; the JS stable partition lifts prefix matches without a raw-SQL `position()`,
 * which the SYS-01 repo lint bans). Returns AT MOST `limit` public rows; the SERVICE applies the AUTH-11 /
 * SOC-09 visibility filter (self / block / suspended) and serializes the public PersonRow allowlist.
 *
 * READ-CLASS (SYS-01): // SYS-01-AUTH-LOOKUP. This EXTENDS the exact-search precedent — the exact people
 * search already reused this auth-layer username read (findByUsername, the AUTH-LOOKUP class). The lint
 * already covers any `.from` SELECT in this auth-repo under the marker, so NO guard-surface/lint change is
 * introduced. It DOES stretch the marker's documented "pre-auth single-credential lookup" intent to an
 * authenticated multi-row directory read — FLAGGED for owner review (a future `SYS-01-DIRECTORY-READ` /
 * public-presence read-class may be preferred). No scope is silently widened: the payload is the same
 * public allowlist the exact search returned; the marker only exempts the actor-scope check, never the
 * service-side visibility filter.
 */
export async function searchByUsername(
  query: string,
  limit: number,
  exec: Executor = getDb(),
): Promise<UserRow[]> {
  const normalized = query.toLowerCase();
  // Escape LIKE metacharacters (\ % _) so they match literally (default Postgres escape char is \).
  const escaped = normalized.replace(/[\\%_]/g, '\\$&');
  // SYS-01-AUTH-LOOKUP: people-directory presence read (SOC-07) — reads only, auth-layer confined.
  const rows = await exec
    .select()
    .from(users)
    .where(and(like(users.usernameNormalized, `%${escaped}%`), isNull(users.deletedAt)))
    .orderBy(users.usernameNormalized)
    .limit(limit);
  // Prefix matches ("kyra" → "kyrainggame") rank above interior-substring matches; the DB already
  // ordered alphabetically, and Array.sort is stable, so alphabetical order holds within each group.
  return rows.sort((a, b) => {
    const ap = (a.usernameNormalized ?? '').startsWith(normalized) ? 0 : 1;
    const bp = (b.usernameNormalized ?? '').startsWith(normalized) ? 0 : 1;
    return ap - bp;
  });
}

export async function insertUser(values: NewUserRow, exec: Executor = getDb()): Promise<UserRow> {
  // INSERT of a brand-new actor-stamped row — rule-2 targets cross-user reads/modifies, not inserts.
  const [row] = await exec.insert(users).values(values).returning();
  if (!row) throw new ServerError('user insert returned no row.');
  return row;
}

export async function setPasswordHash(
  userId: string,
  passwordHash: string,
  exec: Executor = getDb(),
): Promise<void> {
  // The user resolved from a verified reset token — scope the write to their OWN row (SYS-01).
  const actor = asActor(userId);
  await exec.update(users).set({ passwordHash }).where(ownedBy(actor, users.id));
}

export async function markEmailVerified(userId: string, exec: Executor = getDb()): Promise<void> {
  const actor = asActor(userId);
  await exec.update(users).set({ emailVerifiedAt: new Date() }).where(ownedBy(actor, users.id));
}

export async function findIdentity(
  provider: string,
  subject: string,
  exec: Executor = getDb(),
): Promise<AuthIdentityRow | null> {
  // SYS-01-AUTH-LOOKUP: Apple identity lookup by (provider, subject) — pre-auth (AUTH-09).
  const rows = await exec
    .select()
    .from(authIdentities)
    .where(eq(authIdentities.subject, subject))
    .limit(1);
  const row = rows[0];
  return row && row.provider === provider ? row : null;
}

export async function insertIdentity(
  values: { userId: string; provider: string; subject: string },
  exec: Executor = getDb(),
): Promise<void> {
  await exec.insert(authIdentities).values(values); // insert — rule-2 ignores
}
