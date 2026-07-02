import { eq, and, type SQL } from 'drizzle-orm';
import type { AnyPgColumn } from 'drizzle-orm/pg-core';

// SYS-01 — the scoped-query helper at the repository layer. The actor id is NON-OPTIONAL: every
// read/modify of user-owned data passes through here (CONVENTIONS rules 2 & 4). The lint proves the
// helper was CALLED; the SYS-07 4xx tests prove the right actor-id was passed. This is the fix for
// the prototype's original cross-user vulnerability.

export interface Actor {
  readonly actorId: string;
}

/**
 * Construct an Actor. The id is a NON-OPTIONAL `string` so a caller cannot pass a possibly-undefined
 * id (compile-time enforcement); the runtime guard stays as belt-and-braces — it still catches an
 * empty string and any `any`-typed value that slips past the type checker.
 */
export function asActor(actorId: string): Actor {
  if (!actorId) {
    throw new Error('SYS-01: actorId is required and non-optional for user-owned data access.');
  }
  return { actorId };
}

/**
 * Build the ownership predicate binding a user-owned table to the actor. `ownerColumn` is the
 * table's owner FK (its own `id` for `users`, a `user_id` for child tables). An optional `extra`
 * predicate is AND-ed in (e.g. a specific entry id) — but the owner scope is ALWAYS applied.
 */
export function ownedBy(actor: Actor, ownerColumn: AnyPgColumn, extra?: SQL): SQL {
  const base = eq(ownerColumn, actor.actorId);
  return extra ? (and(base, extra) as SQL) : base;
}
