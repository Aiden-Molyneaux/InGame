import { and, eq, or, getTableColumns, type SQL } from 'drizzle-orm';
import type { AnyPgColumn } from 'drizzle-orm/pg-core';
import { getDb, type Executor } from '../db/client';
import { friendships, users, type UserRow } from '../db/schema';

// ── decision 0076 §0.1 — the FOURTH SYS-01 read class: SYS-01-FRIEND-READ ────────────────────────────
// A cross-user read of FRIEND-ONLY data is legitimate ONLY when an ACCEPTED friendship binds the actor
// to the target. `friendScoped` HARD-REQUIRES that predicate — exactly as `publishedOnly` hard-requires
// `status = 'published'` for the PUBLIC-READ class (decision 0073 §0.1). The rule-02 lint admits the
// `// SYS-01-FRIEND-READ` marker only when the predicate (`friendScoped(` or an `'accepted'` status
// literal) is textually present IN THE MARKED STATEMENT (statement-scoped — the M5 neighbour-launder
// fix). There is deliberately NO asActor() call in this file: the friendship predicate IS the scope, so
// STRIPPING it leaks the full shape to a non-friend — the G-D demonstration (both the lint AND the
// runtime authz test go RED). The payload is allowlisted downstream by toFriendShape (F06), never here.

/**
 * The friendship predicate — an ACCEPTED friendship binding `actorId` to the `targetCol` column, in
 * EITHER stored direction (requester↔addressee). AND-ed with an optional `extra` clause. This is the
 * single mechanism the FRIEND-READ read class turns on (P1 formalizes reuse across the P2 read fabric).
 */
export function friendScoped(actorId: string, targetCol: AnyPgColumn, extra?: SQL): SQL {
  const bond = and(
    eq(friendships.status, 'accepted'),
    or(
      and(eq(friendships.requesterId, actorId), eq(friendships.addresseeId, targetCol)),
      and(eq(friendships.addresseeId, actorId), eq(friendships.requesterId, targetCol)),
    ),
  ) as SQL;
  return extra ? (and(bond, extra) as SQL) : bond;
}

/**
 * The friend/full profile row for `targetId` — returned ONLY when `actorId` and `targetId` are ACCEPTED
 * friends (else null → the service falls back to the limited shape). The friendScoped INNER JOIN is the
 * gate: no accepted friendship row ⇒ no result. (`getTableColumns(users)` returns the flat UserRow the
 * serializer needs — never a nested joined shape.)
 */
export async function friendScopedProfile(
  actorId: string,
  targetId: string,
  exec: Executor = getDb(),
): Promise<UserRow | null> {
  // SYS-01-FRIEND-READ — the friend/full profile: served ONLY when friendScoped's accepted-friendship
  // predicate binds actor↔target. Reads-only; the payload is allowlisted by toFriendShape (F06).
  const rows = await exec
    .select(getTableColumns(users))
    .from(users)
    .innerJoin(friendships, friendScoped(actorId, users.id))
    .where(eq(users.id, targetId))
    .limit(1);
  return rows[0] ?? null;
}
