import { getDb, type Executor } from '../db/client';
import { users, type UserRow } from '../db/schema';
import { asActor, ownedBy } from '../db/scoped';

// Profile repository — every read/modify of the user-owned `users` table goes through the SYS-01
// scoped helper (`asActor` + `ownedBy`). The owner key for `users` is its own `id`. This is the only
// layer permitted to issue raw DB queries (CONVENTIONS rule 1).

export async function getOwnProfile(
  actorId: string,
  exec: Executor = getDb(),
): Promise<UserRow | null> {
  const actor = asActor(actorId);
  const rows = await exec.select().from(users).where(ownedBy(actor, users.id)).limit(1);
  return rows[0] ?? null;
}

/** The fields PATCH /me may set (PROF-01/03/06; AUTH-09 completion). Only provided keys are written. */
export interface ProfileUpdate {
  username?: string;
  bio?: string;
  favouriteGameId?: string | null;
  favouriteGenreIds?: string[];
  privacy?: string;
  usernamePending?: boolean;
  usernameChangedAt?: Date;
  /** WTP-03 — the single Now-Playing pin (PUT /me/now-playing). */
  nowPlayingGameId?: string | null;
}

export async function updateOwnProfile(
  actorId: string,
  fields: ProfileUpdate,
  exec: Executor = getDb(),
): Promise<UserRow | null> {
  const actor = asActor(actorId);
  const rows = await exec.update(users).set(fields).where(ownedBy(actor, users.id)).returning();
  return rows[0] ?? null;
}
